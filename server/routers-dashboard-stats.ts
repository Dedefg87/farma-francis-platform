// server/routers-dashboard-stats.ts

// Imports necessários
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  conversations,
  conversationMessages,
  users,
  queues,
  queueAgents,
} from "../drizzle/schema";
import { eq, and, sql, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

// IMPORT DA FUNÇÃO getDateRangeFromPeriod
import { getDateRangeFromPeriod } from "./utils/date-range";

// Utilitário para formatar segundos em HH:MM:SS
function formatSecondsToHMS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const dashboardStatsRouter = router({
  // getStats: Retorna estatísticas gerais
  getStats: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("mes"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate: start, endDate: end } = getDateRangeFromPeriod(
        period,
        input?.startDate,
        input?.endDate
      );

      console.log(`[getStats] Período: ${period}, Filtrando entre ${start.toISOString()} e ${end.toISOString()}`);

      const dateFilter = and(
        gte(conversations.openedAt, start),
        lte(conversations.openedAt, end)
      );

      const totalConversationsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(dateFilter);
      const totalConversations = totalConversationsResult[0]?.count || 0;

      const uniqueCustomersResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${conversations.customerPhone})`,
        })
        .from(conversations)
        .where(dateFilter);
      const uniqueCustomers = uniqueCustomersResult[0]?.count || 0;

      const messagesSentResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "agent"),
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end)
          )
        );
      const messagesSent = messagesSentResult[0]?.count || 0;

      const messagesReceivedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "customer"),
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end)
          )
        );
      const messagesReceived = messagesReceivedResult[0]?.count || 0;

      const totalAgentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "user"));
      const totalAgents = totalAgentsResult[0]?.count || 0;

      const avgPerAgent = totalAgents > 0 ? Math.round(totalConversations / totalAgents) : 0;

      let avgHandlingTime = "00:00:00";
      const avgTimeResult = await db
        .select({ avgMs: sql<number>`AVG(TIMESTAMPDIFF(MICROSECOND, ${conversations.openedAt}, ${conversations.closedAt}))` })
        .from(conversations)
        .where(
          and(
            dateFilter,
            isNotNull(conversations.closedAt)
          )
        );

      const avgMs = avgTimeResult[0]?.avgMs || 0;
      const avgSeconds = avgMs / 1000000;
      avgHandlingTime = formatSecondsToHMS(avgSeconds);

      return {
        totalConversations,
        uniqueCustomers,
        messagesSent,
        messagesReceived,
        avgPerAgent,
        avgHandlingTime,
      };
    }),

  getConversationsByChannel: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("mes"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate: start, endDate: end } = getDateRangeFromPeriod(
        period,
        input?.startDate,
        input?.endDate
      );

      const result = await db
        .select({
          channel: conversations.channel,
          count: sql<number>`count(*)`,
        })
        .from(conversations)
        .where(and(
          gte(conversations.openedAt, start),
          lte(conversations.openedAt, end)
        ))
        .groupBy(conversations.channel);

      return result;
    }),

  getConversationsByStatus: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("mes"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate: start, endDate: end } = getDateRangeFromPeriod(
        period,
        input?.startDate,
        input?.endDate
      );

      const result = await db
        .select({
          status: conversations.status,
          count: sql<number>`count(*)`,
        })
        .from(conversations)
        .where(and(
          gte(conversations.openedAt, start),
          lte(conversations.openedAt, end)
        ))
        .groupBy(conversations.status);

      return result;
    }),

  getAgentStats: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("mes"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rawPeriod = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate: start, endDate: end } = getDateRangeFromPeriod(
        rawPeriod,
        input?.startDate,
        input?.endDate
      );

      console.log(`[getAgentStats] Período: ${rawPeriod}, Range: ${start.toISOString()} a ${end.toISOString()}`);

      // Query completa: busca estatísticas de conversas e mensagens por agente
      const agentStats = await db
        .select({
          agentId: users.id,
          agentName: users.name,
          totalConversations: sql<number>`COUNT(DISTINCT ${conversations.id})`,
          conversationDays: sql<number>`COUNT(DISTINCT DATE(${conversations.openedAt}))`,
          avgHandlingTime: sql<number>`AVG(TIMESTAMPDIFF(MICROSECOND, ${conversations.openedAt}, ${conversations.closedAt}))`,
          messagesSent: sql<number>`COALESCE(SUM(${conversationMessages.senderType} = 'agent'), 0)`,
          messagesReceived: sql<number>`COALESCE(SUM(${conversationMessages.senderType} = 'customer'), 0)`,
        })
        .from(users)
        .leftJoin(conversations, and(
          eq(conversations.assignedTo, users.id),
          gte(conversations.openedAt, start),
          lte(conversations.openedAt, end)
        ))
        .leftJoin(conversationMessages, and(
          eq(conversationMessages.conversationId, conversations.id),
          gte(conversationMessages.createdAt, start),
          lte(conversationMessages.createdAt, end)
        ))
        .where(eq(users.role, "user"))
        .groupBy(users.id, users.name)
        .orderBy(sql`COUNT(DISTINCT ${conversations.id}) DESC`);

      console.log(`[getAgentStats] Resultado:`, JSON.stringify(agentStats));

      return agentStats.map((stat) => ({
        agentId: stat.agentId,
        agentName: stat.agentName,
        atendimentos: stat.totalConversations || 0,
        dias: stat.conversationDays || 0,
        mediaAtendimentosDia: stat.conversationDays > 0 ? Math.round((stat.totalConversations || 0) / stat.conversationDays * 10) / 10 : 0,
        msgEnviadas: Number(stat.messagesSent) || 0,
        msgRecebidas: Number(stat.messagesReceived) || 0,
        tma: stat.avgHandlingTime ? formatSecondsToHMS(Number(stat.avgHandlingTime) / 1000000) : '00:00:00',
      }));
    }),

  getContactsByHour: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rawPeriod = input?.period || "hoje";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let startDate: Date;
      let endDate: Date;

      // Se período é "all" ou "todas", não aplicar filtro de data (pegar tudo)
      if (rawPeriod === "all" || rawPeriod === "todas") {
        startDate = new Date(0); // epoch
        endDate = new Date();
      } else {
        const { startDate: s, endDate: e } = getDateRangeFromPeriod(
          rawPeriod,
          input?.startDate,
          input?.endDate
        );
        startDate = s;
        endDate = e;
      }

      console.log(`[getContactsByHour] Período: ${rawPeriod}, Range: ${startDate.toISOString()} a ${endDate.toISOString()}`);

      // Consulta: contar conversas únicas por hora (baseado em mensagens de clientes)
      const result = await db
        .select({
          hour: sql<number>`HOUR(${conversationMessages.createdAt})`,
          chats: sql<number>`COUNT(DISTINCT ${conversationMessages.conversationId})`,
        })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "customer"),
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate)
          )
        )
        .groupBy(sql`HOUR(${conversationMessages.createdAt})`)
        .orderBy(sql`HOUR(${conversationMessages.createdAt})`);

      console.log(`[getContactsByHour] Resultado bruto:`, JSON.stringify(result));

      // Transformar em array de 24 horas (0-23)
      const hoursArray = Array(24).fill(0).map((_, hour) => {
        const found = result.find(r => r.hour === hour);
        return found ? found.chats : 0;
      });

      return hoursArray;
    }),

  getConversationsByQueue: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rawPeriod = input?.period || "hoje";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate: start, endDate: end } = getDateRangeFromPeriod(
        rawPeriod,
        input?.startDate,
        input?.endDate
      );

      // Primeiro, buscar todas as filas
      const allQueues = await db.select({
        id: queues.id,
        name: queues.name,
        color: queues.color,
      }).from(queues);

      // Para cada fila, contar conversas no período
      const queueStats = await Promise.all(
        allQueues.map(async (queue) => {
          const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(conversations)
            .where(
              and(
                eq(conversations.queueId, queue.id),
                gte(conversations.openedAt, start),
                lte(conversations.openedAt, end)
              )
            );
          return {
            name: queue.name,
            value: Number(count),
            color: queue.color || "#3b82f6",
          };
        })
      );

      // Adicionar bucket "Sem fila"
      const [{ count: noQueueCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            isNull(conversations.queueId),
            gte(conversations.openedAt, start),
            lte(conversations.openedAt, end)
          )
        );

      queueStats.push({
        name: "Sem fila",
        value: Number(noQueueCount),
        color: "#6b7280",
      });

      // Filtrar valores zero se desejar (opcional)
      return queueStats.filter(qs => qs.value > 0);
    }),

  getVariations: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("mes"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rawPeriod = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Determinar ranges para período atual e anterior
      const { startDate: currentStart, endDate: currentEnd } = getDateRangeFromPeriod(
        rawPeriod,
        input?.startDate,
        input?.endDate
      );

      // Calcular período anterior de mesma duração
      const durationMs = currentEnd.getTime() - currentStart.getTime();
      const previousStart = new Date(currentStart.getTime() - durationMs);
      const previousEnd = new Date(currentStart.getTime() - 1); // 1ms antes do atual

      console.log(`[getVariations] Current: ${currentStart.toISOString()} a ${currentEnd.toISOString()}`);
      console.log(`[getVariations] Previous: ${previousStart.toISOString()} a ${previousEnd.toISOString()}`);

      // Helper para obter métricas de um período
      const getMetrics = async (start: Date, end: Date) => {
        const dateFilter = and(
          gte(conversations.openedAt, start),
          lte(conversations.openedAt, end)
        );

        const [convResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(dateFilter);
        const conversationsCount = convResult?.count || 0;

        const [custResult] = await db
          .select({ count: sql<number>`count(DISTINCT ${conversations.customerPhone})` })
          .from(conversations)
          .where(dateFilter);
        const uniqueCustomers = custResult?.count || 0;

        const [sentResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.senderType, "agent"),
              gte(conversationMessages.createdAt, start),
              lte(conversationMessages.createdAt, end)
            )
          );
        const messagesSent = sentResult?.count || 0;

        const [recvResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.senderType, "customer"),
              gte(conversationMessages.createdAt, start),
              lte(conversationMessages.createdAt, end)
            )
          );
        const messagesReceived = recvResult?.count || 0;

        return {
          conversations: conversationsCount,
          customers: uniqueCustomers,
          messagesSent,
          messagesReceived,
        };
      };

      const [current, previous] = await Promise.all([
        getMetrics(currentStart, currentEnd),
        getMetrics(previousStart, previousEnd),
      ]);

      // Calcular variações percentuais
      const calcVariation = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      return {
        conversations: {
          current: current.conversations,
          previous: previous.conversations,
          variation: calcVariation(current.conversations, previous.conversations),
        },
        customers: {
          current: current.customers,
          previous: previous.customers,
          variation: calcVariation(current.customers, previous.customers),
        },
        messagesSent: {
          current: current.messagesSent,
          previous: previous.messagesSent,
          variation: calcVariation(current.messagesSent, previous.messagesSent),
        },
        messagesReceived: {
          current: current.messagesReceived,
          previous: previous.messagesReceived,
          variation: calcVariation(current.messagesReceived, previous.messagesReceived),
        },
      };
    }),
});
