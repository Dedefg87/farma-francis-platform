import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { leads, customers, users } from '../drizzle/schema';
import { like, eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';

export const leadsRouter = router({
  // Listar leads com paginação e filtros opcionais
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        stage: z.string().optional(),
        assignedTo: z.number().optional(),
        sortBy: z.enum(['createdAt', 'value', 'name']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { page, pageSize, search, stage, assignedTo, sortBy, sortOrder } = input;
      const offset = (page - 1) * pageSize;

      // Build where clause
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            like(leads.name, `%${search}%`),
            like(leads.email, `%${search}%`),
            like(leads.phone, `%${search}%`)
          )
        );
      }
      if (stage) {
        conditions.push(eq(leads.stage, stage as any));
      }
      if (assignedTo !== undefined) {
        conditions.push(eq(leads.assignedTo, assignedTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(leads)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Build order by
      let orderBy = desc(leads.createdAt);
      switch (sortBy) {
        case 'createdAt':
          orderBy = sortOrder === 'asc' ? sql`${leads.createdAt} ASC` : sql`${leads.createdAt} DESC`;
          break;
        case 'value':
          orderBy = sortOrder === 'asc' ? sql`${leads.value} ASC` : sql`${leads.value} DESC`;
          break;
        case 'name':
          orderBy = sortOrder === 'asc' ? sql`${leads.name} ASC` : sql`${leads.name} DESC`;
          break;
      }

      // Fetch data with joins
      const results = await db
        .select({
          id: leads.id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          source: leads.source,
          stage: leads.stage,
          value: leads.value,
          assignedTo: leads.assignedTo,
          followUpDate: leads.followUpDate,
          notes: leads.notes,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
          // Join with customer name if exists
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
          },
          // Join with assigned agent name if exists
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(leads)
        .leftJoin(customers, eq(leads.customerId, customers.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset);

      return {
        leads: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Obter um lead por ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select({
          id: leads.id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          source: leads.source,
          stage: leads.stage,
          value: leads.value,
          assignedTo: leads.assignedTo,
          followUpDate: leads.followUpDate,
          notes: leads.notes,
          createdBy: leads.createdBy,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
          },
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(leads)
        .leftJoin(customers, eq(leads.customerId, customers.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(eq(leads.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  // Criar lead
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email().optional().or(z.string().max(0)),
        phone: z.string().optional(),
        source: z.string().optional(),
        stage: z.enum(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
        value: z.number().optional(),
        assignedTo: z.number().optional(),
        followUpDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();

      // Build insert values, converting followUpDate if present
      const insertValues: any = {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        value: input.value ?? null,
        assignedTo: input.assignedTo ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };

      if (input.stage) insertValues.stage = input.stage;
      if (input.source) insertValues.source = input.source;
      if (input.followUpDate) insertValues.followUpDate = new Date(input.followUpDate);

      const newLead = await db
        .insert(leads)
        .values(insertValues)
        .$returningId();

      return { id: newLead[0].id };
    }),

  // Atualizar lead
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional().or(z.string().max(0)),
        phone: z.string().optional(),
        source: z.string().optional(),
        stage: z.enum(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
        value: z.number().optional(),
        assignedTo: z.number().optional(),
        followUpDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const update: any = {
        updatedAt: new Date(),
      };
      Object.keys(input).forEach(key => {
        if (key !== 'id' && input[key as keyof typeof input] !== undefined) {
          const value = input[key as keyof typeof input];
          // Convert undefined to null for optional fields, but keep enums as is
          if (key === 'stage' || key === 'source' || key === 'email' || key === 'phone' || key === 'value' || key === 'assignedTo' || key === 'followUpDate' || key === 'notes') {
            update[key] = value ?? null;
          } else {
            update[key] = value;
          }
        }
      });

      await db.update(leads).set(update).where(eq(leads.id, input.id));

      return { success: true };
    }),

  // Deletar lead
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.delete(leads).where(eq(leads.id, input.id));

      return { success: true };
    }),
});
