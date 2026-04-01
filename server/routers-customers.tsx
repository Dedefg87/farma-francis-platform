import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { customers } from '../drizzle/schema.js';
import { like, or } from 'drizzle-orm';

export const customersRouter = router({
  // Listar clientes com paginação e filtros opcionais
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { page, pageSize, search, status } = input;
      const offset = (page - 1) * pageSize;

      // Build where clause
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            like(customers.name, `%${search}%`),
            like(customers.phone, `%${search}%`),
            like(customers.email, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(customers.status, status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(customers)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Fetch data
      const results = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          status: customers.status,
          photoUrl: customers.photoUrl,
          source: customers.source,
          notes: customers.notes,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        customers: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Buscar clientes por nome, telefone ou email (mantido para compatibilidade)
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { query } = input;

      if (!query || query.length < 2) {
        return [];
      }

      const results = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        })
        .from(customers)
        .where(
          or(
            like(customers.name, `%${query}%`),
            like(customers.phone, `%${query}%`),
            like(customers.email, `%${query}%`)
          )
        )
        .limit(10);

      return results;
    }),
});
