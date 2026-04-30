import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { db } from "./db";
import { customers, conversations, conversationMessages } from "./drizzle/schema";
import { eq, like, or, sql, desc } from "drizzle-orm";

export const customersRouter = router({
  // LISTAR TODOS OS CLIENTES (para CRM)
  // Busca clientes da tabela 'customers' ou 'conversations' (fallback)
  list: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        // 1. Tentar buscar da tabela customers
        let allCustomers = await db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
            status: customers.status,
            createdAt: customers.createdAt,
          })
          .from(customers);

        // 2. Se customers vazia, buscar de conversations (fallback)
        if (allCustomers.length === 0) {
          console.log('[customers.list] Tabela customers vazia, buscando de conversations...');
          const uniqueFromConv = await db
            .select({
              customerName: conversations.customerName,
              customerPhone: conversations.customerPhone,
            })
            .from(conversations)
            .groupBy(conversations.customerPhone)
            .having(sql`${conversations.customerPhone} IS NOT NULL`);

          // Mapear para formato de customer
          allCustomers = uniqueFromConv.map((c, idx) => ({
            id: c.customerPhone || `temp-${idx}`, // ID temporário baseado no telefone
            name: c.customerName || 'Cliente',
            phone: c.customerPhone || '',
            email: null,
            status: 'active',
            createdAt: new Date(),
          }));
        }

        // 3. Para cada cliente, buscar histórico de conversas
        const customersWithHistory = await Promise.all(
          allCustomers.map(async (c) => {
            const history = await db
              .select({
                id: conversations.id,
                status: conversations.status,
                createdAt: conversations.createdAt,
                messagesCount: sql`(SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = ${conversations.id})`,
              })
              .from(conversations)
              .where(eq(conversations.customerPhone, c.phone))
              .orderBy(desc(conversations.createdAt));

            return {
              id: String(c.id),
              name: c.name || 'Cliente',
              phone: c.phone || '',
              email: c.email || null,
              status: c.status || 'active',
              createdAt: c.createdAt?.toISOString(),
              interactionsCount: history.length,
              lastInteraction: history[0]?.createdAt?.toISOString() || null,
              history: history.map(h => ({
                id: String(h.id),
                status: h.status,
                date: h.createdAt?.toISOString(),
                messagesCount: h.messagesCount,
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

      try {
        // Normalizar query: remover caracteres não numéricos para busca de telefone
        const numericQuery = query.replace(/\D/g, '');

        // Construir condições de busca
        const conditions = [];

        // Busca por nome (parcial, case-insensitive)
        conditions.push(like(customers.name, `%${query}%`));

        // Busca por email (parcial)
        if (query.includes('@')) {
          conditions.push(like(customers.email, `%${query}%`));
        }

        // Busca por telefone: comparar apenas os dígitos
        // O número no banco pode ter formatos variados (+553186337081, 553186337081, 31986337081)
        // Então buscamos pelos últimos N dígitos da query
        if (numericQuery.length >= 8) {
          // Busca os últimos 8+ dígitos — cobre variações de formato
          const lastDigits = numericQuery.slice(-8);
          conditions.push(like(customers.phone, `%${lastDigits}%`));
        } else if (numericQuery.length > 0) {
          conditions.push(like(customers.phone, `%${numericQuery}%`));
        }

        const results = await db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          })
          .from(customers)
          .where(or(...conditions))
          .limit(10);

        return results.map((c) => ({
          id: String(c.id),
          name: c.name || 'Cliente',
          phone: c.phone || '',
          email: c.email || null,
        }));
      } catch (error) {
        console.error('[customers.search] Database error:', error);
        console.error('[customers.search] Error details:', (error as Error).message);
        throw new Error('Erro interno na busca de clientes');
      }
    }),

  // customers.findOrCreate — force rebuild v2
  // Busca cliente por telefone/email; se não existir, cria automaticamente
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

      // Tentar buscar cliente existente pelo telefone (matching flexível)
      if (phone) {
        const phoneDigits = phone.replace(/\D/g, '');

        if (phoneDigits.length >= 8) {
          const lastDigits = phoneDigits.slice(-8);
          const [existing] = await db
            .select()
            .from(customers)
            .where(like(customers.phone, `%${lastDigits}%`))
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

      // Tentar buscar por email
      if (email) {
        const [existing] = await db
          .select()
          .from(customers)
          .where(eq(customers.email, email))
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
});
// Build: Thu Apr 30 10:38:00 -03 2026
