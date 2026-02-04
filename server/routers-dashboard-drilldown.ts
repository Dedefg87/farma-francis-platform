import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { conversations, customers } from '../drizzle/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';

/**
 * Router para drill-down de dados do dashboard
 * Permite visualizar detalhes de métricas agregadas
 */

export const dashboardDrilldownRouter = router({
  /**
   * Buscar conversas de uma hora específica
   * Usado no drill-down do gráfico "Contatos por hora"
   */
  getConversationsByHour: protectedProcedure
    .input(
      z.object({
        hour: z.number().min(0).max(23), // Hora do dia (0-23)
        date: z.string().optional(), // Data no formato YYYY-MM-DD (padrão: hoje)
        status: z.enum(['all', 'chats', 'abandoned']).optional().default('all'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Calcular range de tempo para a hora específica
      const targetDate = input.date ? new Date(input.date) : new Date();
      targetDate.setHours(input.hour, 0, 0, 0);
      
      const startTime = new Date(targetDate);
      const endTime = new Date(targetDate);
      endTime.setHours(input.hour + 1, 0, 0, 0);

      // Construir filtro de status
      let statusFilter;
      if (input.status === 'chats') {
        statusFilter = sql`${conversations.status} IN ('assigned', 'closed')`;
      } else if (input.status === 'abandoned') {
        statusFilter = sql`${conversations.status} = 'abandoned'`;
      } else {
        statusFilter = sql`1=1`; // Todos
      }

      // Buscar conversas da hora específica
      const result = await db
        .select({
          id: conversations.id,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          channel: conversations.channel,
          status: conversations.status,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          assignedTo: conversations.assignedTo,
          queueId: conversations.queueId,
        })
        .from(conversations)
        .where(
          and(
            gte(conversations.openedAt, startTime),
            lte(conversations.openedAt, endTime),
            statusFilter
          )
        )
        .orderBy(conversations.openedAt);

      return {
        hour: input.hour,
        date: targetDate.toISOString().split('T')[0],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        total: result.length,
        conversations: result,
      };
    }),

  /**
   * Buscar conversas de um período específico
   * Usado para drill-down de métricas agregadas
   */
  getConversationsByPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(), // YYYY-MM-DD
        status: z.enum(['all', 'open', 'assigned', 'closed']).optional().default('all'),
        channel: z.enum(['all', 'whatsapp', 'instagram', 'telegram', 'email']).optional().default('all'),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const startTime = new Date(input.startDate);
      startTime.setHours(0, 0, 0, 0);
      
      const endTime = new Date(input.endDate);
      endTime.setHours(23, 59, 59, 999);

      // Construir filtros
      const filters = [
        gte(conversations.openedAt, startTime),
        lte(conversations.openedAt, endTime),
      ];

      if (input.status !== 'all') {
        filters.push(sql`${conversations.status} = ${sql.raw(`'${input.status}'`)}`);
      }

      if (input.channel !== 'all') {
        filters.push(sql`${conversations.channel} = ${sql.raw(`'${input.channel}'`)}`);
      }

      // Buscar conversas
      const result = await db
        .select({
          id: conversations.id,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          channel: conversations.channel,
          status: conversations.status,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          assignedTo: conversations.assignedTo,
          queueId: conversations.queueId,
        })
        .from(conversations)
        .where(and(...filters))
        .orderBy(conversations.openedAt)
        .limit(input.limit)
        .offset(input.offset);

      // Contar total (para paginação)
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(conversations)
        .where(and(...filters));

      return {
        startDate: input.startDate,
        endDate: input.endDate,
        total,
        showing: result.length,
        offset: input.offset,
        limit: input.limit,
        hasMore: input.offset + result.length < total,
        conversations: result,
      };
    }),
});
