import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { customers } from "../drizzle/schema";
import { eq, like, sql } from "drizzle-orm";

export const customersRouter = {
  // GET /api/trpc/customers.search
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          phone: z.string(),
          email: z.string().nullable(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const { query } = input;
      // Buscar clientes por nome, telefone ou email
      const searchTerm = `%${query}%`;
      const results = await db
        .select()
        .from(customers)
        .where(
          sql`${customers.name} LIKE ${searchTerm}
              OR ${customers.phone} LIKE ${searchTerm}
              OR ${customers.email} LIKE ${searchTerm}`
        )
        .limit(50);

      return results.map((c) => ({
        id: String(c.id),
        name: c.name,
        phone: c.phone,
        email: c.email,
      }));
    }),

  // GET /api/trpc/customers.get
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string(),
        email: z.string().nullable(),
        tags: z.array(z.string()).nullable(),
      })
    )
    .query(async ({ input }) => {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.id));

      if (!customer) {
        throw new Error("Customer not found");
      }

      return {
        id: String(customer.id),
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        tags: customer.tags || [],
      };
    }),
};
