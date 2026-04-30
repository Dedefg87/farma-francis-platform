import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { db } from "./db";
import { customers, conversations } from "./drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";

export const customersRouter = router({
  // LISTAR TODOS OS CLIENTES (para CRM)
  // Busca diretamente de conversations (agrupando por telefone)
  // DEPLOY-TEST-54321
  list: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        console.log('[customers.list] DEPLOY-TEST-54321 - Nova versão executando!');
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Buscar clientes únicos da tabela conversations
        const uniqueCustomers = await db
          .select({
            customerName: conversations.customerName,
            customerPhone: conversations.customerPhone,
          })
          .from(conversations)
          .where(sql`customerPhone IS NOT NULL`)
          .groupBy(conversations.customerPhone);

        console.log(`[customers.list] Encontrados ${uniqueCustomers.length} clientes únicos em conversations`);

        // Para cada cliente, buscar histórico de conversas
        const customersWithHistory = await Promise.all(
          uniqueCustomers.map(async (c, idx) => {
            const history = await db
              .select({
                id: conversations.id,
                status: conversations.status,
                createdAt: conversations.createdAt,
              })
              .from(conversations)
              .where(eq(conversations.customerPhone, c.customerPhone!))
              .orderBy(desc(conversations.createdAt))
              .limit(10);

            return {
              id: String(idx + 1), // ID temporário baseado na ordem
              name: c.customerName || `Cliente ${c.customerPhone?.slice(-4) || '0000'}`,
              phone: c.customerPhone || '',
              email: null, // conversations não tem email
              status: 'active',
              createdAt: history[0]?.createdAt?.toISOString() || new Date().toISOString(),
              interactionsCount: history.length,
              lastInteraction: history[0]?.createdAt?.toISOString() || null,
              history: history.map(h => ({
                id: String(h.id),
                status: h.status,
                date: h.createdAt?.toISOString(),
              })),
            };
          })
        );

        return customersWithHistory;
      } catch (error) {
        console.error('[customers.list] Error:', error);
        return [];
      }
    }),

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
    .query(async ({ input }) => {
      const { query } = input;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Normalizar query: remover caracteres não numéricos para busca de telefone
      const numericQuery = query.replace(/\D/g, '');

      // Construir condições de busca
      const conditions = [];

      // Busca por nome (parcial, case-insensitive)
      conditions.push(sql`${customers.name} LIKE ${`%${query}%`}`);

      // Busca por telefone: comparar apenas os dígitos
      if (numericQuery.length >= 8) {
        const lastDigits = numericQuery.slice(-8);
        conditions.push(sql`${customers.phone} LIKE ${`%${lastDigits}%`}`);
      } else if (numericQuery.length > 0) {
        conditions.push(sql`${customers.phone} LIKE ${`%${numericQuery}%`}`);
      }

      const results = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        })
        .from(customers)
        .where(sql`${or(...conditions)}`)
        .limit(10);

      return results.map((c) => ({
        id: String(c.id),
        name: c.name || 'Cliente',
        phone: c.phone || '',
        email: c.email || null,
      }));
    }),

  // customers.findOrCreate — mantido para compatibilidade
  findOrCreate: protectedProcedure
    .input(
      z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        phone: z.string(),
        email: z.string().nullable(),
        created: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const { phone, email, name } = input;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Tentar buscar cliente existente pelo telefone
      if (phone) {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length >= 8) {
          const lastDigits = phoneDigits.slice(-8);
          const [existing] = await db
            .select()
            .from(customers)
            .where(sql`${customers.phone} LIKE ${`%${lastDigits}%`}`)
            .limit(1);

          if (existing) {
            return {
              id: String(existing.id),
              name: existing.name || '',
              phone: existing.phone || '',
              email: existing.email || null,
              created: false,
            };
          }
        }
      }

      // Não encontrado — criar novo cliente
      const result = await db
        .insert(customers)
        .values({
          name: name || 'Cliente',
          phone: phone || '',
          email: email || null,
        })
        .$returningId();

      return {
        id: String(result[0].id),
        name: name || 'Cliente',
        phone: phone || '',
        email: email || null,
        created: true,
      };
    }),
});
// Build: Thu Apr 30 16:05:00 -03 2026 - Versão final buscando de conversations
