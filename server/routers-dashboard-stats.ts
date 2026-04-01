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

      const { start, end } = getDateRangeFromPeriod(
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

      const { start, end } = getDateRangeFromPeriod(
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

      const { start, end } = getDateRangeFromPeriod(
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
      const period = input?.period || "mes";
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { start, end } = getDateRangeFromPeriod(
        period,
        input?.startDate,
        input?.endDate
      );

      const agentStats = await db
        .select({
          agentId: users.id,
          agentName: users.name,
          totalConversations: sql<number>`count(${conversations.id})`,
          avgHandlingTime: sql<number>`AVG(TIMESTAMPDIFF(MICROSECOND, ${conversations.openedAt}, ${conversations.closedAt}))`,
        })
        .from(users)
        .leftJoin(queueAgents, eq(users.id, queueAgents.agentId))
        .leftJoin(conversations, eq(queueAgents.queueId, conversations.queueId))
        .where(
          and(
            eq(users.role, "user"),
            gte(conversations.openedAt, start),
            lte(conversations.openedAt, end),
            isNotNull(conversations.id)
          )
        )
        .groupBy(users.id, users.name)
        .orderBy(sql`count(${conversations.id}) DESC`);

      return agentStats.map((stat) => ({
        agentId: stat.agentId,
        agentName: stat.agentName,
        totalConversations: stat.totalConversations || 0,
        avgHandlingTime: formatSecondsToHMS((stat.avgHandlingTime || 0) / 1000000),
      }));
    }),
});
