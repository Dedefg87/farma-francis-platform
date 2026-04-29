import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { tickets, customers, users } from '../drizzle/schema';
import { like, eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';

export const ticketsRouter = router({
  // Listar tickets com paginação e filtros opcionais
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
        customerId: z.number().optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { page, pageSize, search, status, priority, assignedTo, customerId, sortBy, sortOrder } = input || {};
      const offset = ((page || 1) - 1) * (pageSize || 20);

      // Build where clause
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            like(tickets.subject, `%${search}%`),
            like(tickets.description, `%${search}%`),
            like(tickets.ticketNumber, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(tickets.status, status as any));
      }
      if (priority) {
        conditions.push(eq(tickets.priority, priority as any));
      }
      if (assignedTo !== undefined) {
        conditions.push(eq(tickets.assignedTo, assignedTo));
      }
      if (customerId !== undefined) {
        conditions.push(eq(tickets.customerId, customerId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Build order by
      let orderBy = desc(tickets.createdAt);
      switch (sortBy) {
        case 'createdAt':
          orderBy = sortOrder === 'asc' ? sql`${tickets.createdAt} ASC` : sql`${tickets.createdAt} DESC`;
          break;
        case 'updatedAt':
          orderBy = sortOrder === 'asc' ? sql`${tickets.updatedAt} ASC` : sql`${tickets.updatedAt} DESC`;
          break;
        case 'priority':
          orderBy = sortOrder === 'asc' ? sql`${tickets.priority} ASC` : sql`${tickets.priority} DESC`;
          break;
        case 'status':
          orderBy = sortOrder === 'asc' ? sql`${tickets.status} ASC` : sql`${tickets.status} DESC`;
          break;
      }

      // Fetch data with joins
      const results = await db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          customerId: tickets.customerId,
          subject: tickets.subject,
          description: tickets.description,
          status: tickets.status,
          priority: tickets.priority,
          category: tickets.category,
          channel: tickets.channel,
          assignedTo: tickets.assignedTo,
          slaDeadline: tickets.slaDeadline,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
          timeSpentMinutes: tickets.timeSpentMinutes,
          createdBy: tickets.createdBy,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          // Join with customer
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          },
          // Join with assigned agent
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(tickets)
        .leftJoin(customers, eq(tickets.customerId, customers.id))
        .leftJoin(users, eq(tickets.assignedTo, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize || 20)
        .offset(offset);

      return {
        data: results,
        pagination: {
          page: page || 1,
          pageSize: pageSize || 20,
          total,
          totalPages: Math.ceil(total / (pageSize || 20)),
        },
      };
    }),

  // Buscar ticket por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          customerId: tickets.customerId,
          subject: tickets.subject,
          description: tickets.description,
          status: tickets.status,
          priority: tickets.priority,
          category: tickets.category,
          channel: tickets.channel,
          assignedTo: tickets.assignedTo,
          slaDeadline: tickets.slaDeadline,
          resolvedAt: tickets.resolvedAt,
          closedAt: tickets.closedAt,
          timeSpentMinutes: tickets.timeSpentMinutes,
          createdBy: tickets.createdBy,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          },
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(tickets)
        .leftJoin(customers, eq(tickets.customerId, customers.id))
        .leftJoin(users, eq(tickets.assignedTo, users.id))
        .where(eq(tickets.id, input.id))
        .limit(1);

      if (!result || result.length === 0) {
        throw new Error('Ticket not found');
      }

      return result[0];
    }),

  // Criar novo ticket
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        subject: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        category: z.string().optional(),
        channel: z.string().optional(),
        assignedTo: z.number().optional(),
        slaDeadline: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Generate ticket number (format: TKT-YYYYMMDD-XXX)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const ticketNumber = `TKT-${dateStr}-${randomSuffix}`;

      const inserted = await db.insert(tickets).values({
        ticketNumber,
        customerId: input.customerId,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        category: input.category,
        channel: input.channel,
        assignedTo: input.assignedTo,
        slaDeadline: input.slaDeadline ? sql`${input.slaDeadline}` : undefined,
        createdBy: ctx.user?.id,
      }).$returningId();

      return { id: inserted.insertId, ticketNumber };
    }),

  // Atualizar ticket
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        customerId: z.number().optional(),
        subject: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        category: z.string().optional(),
        assignedTo: z.number().optional(),
        slaDeadline: z.date().optional(),
        timeSpentMinutes: z.number().optional(),
        resolvedAt: z.date().optional(),
        closedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id, ...updateData } = input;

      // Handle special fields
      const updateValues: any = { ...updateData };
      if (updateData.slaDeadline) {
        updateValues.slaDeadline = sql`${updateData.slaDeadline}`;
      }
      if (updateData.resolvedAt) {
        updateValues.resolvedAt = sql`${updateData.resolvedAt}`;
      }
      if (updateData.closedAt) {
        updateValues.closedAt = sql`${updateData.closedAt}`;
      }

      await db.update(tickets)
        .set({ ...updateValues, updatedAt: sql`NOW()` })
        .where(eq(tickets.id, id));

      return { success: true };
    }),

  // Deletar ticket
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.delete(tickets).where(eq(tickets.id, input.id));
      return { success: true };
    }),

  // Estatísticas de tickets (para dashboard)
  stats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Count by status
      const statusCounts = await db
        .select({
          status: tickets.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(tickets)
        .groupBy(tickets.status);

      // Count by priority
      const priorityCounts = await db
        .select({
          priority: tickets.priority,
          count: sql<number>`COUNT(*)`,
        })
        .from(tickets)
        .groupBy(tickets.priority);

      // Total counts
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .limit(1);
      const total = Number(totalResult[0].count) || 0;

      // Open tickets (open + in_progress)
      const openResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(sql`status IN ('open', 'in_progress')`)
        .limit(1);
      const open = Number(openResult[0].count) || 0;

      // In progress tickets
      const inProgressResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(eq(tickets.status, 'in_progress'))
        .limit(1);
      const inProgress = Number(inProgressResult[0].count) || 0;

      // Pending tickets
      const pendingResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(eq(tickets.status, 'pending'))
        .limit(1);
      const pending = Number(pendingResult[0].count) || 0;

      // Resolved tickets (resolved + closed)
      const resolvedResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(sql`status IN ('resolved', 'closed')`)
        .limit(1);
      const resolved = Number(resolvedResult[0].count) || 0;

      return {
        total,
        open,
        inProgress,
        pending,
        resolved,
        byStatus: statusCounts,
        byPriority: priorityCounts,
      };
    }),

    // Seed sample tickets (public for initial setup)
  seed: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

      // Clear existing tickets first
      await db.delete(tickets);
      
      const sampleTickets = [
        {
          ticketNumber: "TKT-000001",
          customerId: 1,
          subject: "Problema com login no sistema",
          description: "Cliente não consegue fazer login após trocar senha",
          status: "open",
          priority: "high",
          channel: "whatsapp",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000002",
          customerId: 1,
          subject: "Dúvida sobre medicamento Losartana",
          description: "Cliente quer saber efeitos colaterais da Losartana 50mg",
          status: "in_progress",
          priority: "medium",
          channel: "chat",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000003",
          customerId: 1,
          subject: "Entrega atrasada - Pedido #123",
          description: "Pedido de medicamentos controlados está há 3 dias sem atualização",
          status: "pending",
          priority: "urgent",
          channel: "phone",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000004",
          customerId: 1,
          subject: "Erro ao gerar relatório de vendas",
          description: "Sistema apresenta erro 500 ao tentar gerar relatório mensal",
          status: "open",
          priority: "high",
          channel: "email",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000005",
          customerId: 1,
          subject: "Solicitação de cancelamento de pedido",
          description: "Cliente solicitou cancelamento do pedido #456 antes da expedição",
          status: "resolved",
          priority: "medium",
          channel: "whatsapp",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000006",
          customerId: 1,
          subject: "Problema na integração com Pix",
          description: "Pagamentos Pix não estão sendo confirmados automaticamente",
          status: "in_progress",
          priority: "urgent",
          channel: "chat",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000007",
          customerId: 1,
          subject: "Dúvida sobre validade de receitas",
          description: "Cliente pergunta há quanto tempo uma receita de antibiótico é válida",
          status: "closed",
          priority: "low",
          channel: "phone",
          assignedTo: 1,
        },
        {
          ticketNumber: "TKT-000008",
          customerId: 1,
          subject: "Erro 404 ao acessar página de produtos",
          description: "Link enviado no WhatsApp leva para página não encontrada",
          status: "resolved",
          priority: "high",
          channel: "whatsapp",
          assignedTo: 1,
        },
      ];

      // Insert sample tickets one by one
      for (const ticket of sampleTickets) {
        await db.insert(tickets).values(ticket);
      }

      return {
        message: "Seed executado com sucesso (v2)",
        count: sampleTickets.length,
      };
    }),
});
