import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { customers } from '../drizzle/schema.js';
import { like, or } from 'drizzle-orm';

export const customersRouter = router({
  // Buscar clientes por nome, telefone ou email
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
