import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  conversations,
  conversationMessages,
  users,
  queues,
  queueAgents,
} from "../drizzle/schema";
import { eq, and, sql, gte, count, lte } from "drizzle-orm";
import { z } from "zod";
import { getDateRangeFromPeriod } from "./utils/date-range";

export const dashboardStatsRouter = router({
  // Estatísticas gerais do dashboard
  getStats: protectedProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "hoje";
      const { start, end } = getDateRangeFromPeriod(period);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Total de atendimentos (conversas) no período
      const [totalConversations] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            gte(conversations.openedAt, start),
            lte(conversations.openedAt, end)
          )
        );

      // Clientes únicos no período
      const [uniqueCustomers] = await db
        .select({
          count: sql<number>`count(DISTINCT ${conversations.customerPhone})`,
        })
        .from(conversations)
        .where(
          and(
            gte(conversations.openedAt, start),
            lte(conversations.openedAt, end)
          )
        );

      // Mensagens enviadas (por agentes) no período
      const [messagesSent] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "agent"),
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end)
          )
        );

      // Mensagens recebidas (de clientes) no período
      const [messagesReceived] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "customer"),
            gte(conversationMessages.createdAt, start),
            lte(conversationMessages.createdAt, end)
          )
        );

      // Total de agentes ativos
      const [totalAgents] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "user")); // Agentes têm role 'user'

      // Média de atendimentos por agente
      const avgPerAgent =
        totalAgents.count > 0
          ? Math.round(totalConversations.count / totalAgents.count)
          : 0;

      // Tempo médio de atendimento (mock - será calculado depois)
      const avgHandlingTime = "00:14:32";

      return {
        totalConversations: totalConversations.count,
        uniqueCustomers: uniqueCustomers.count,
        messagesSent: messagesSent.count,
        messagesReceived: messagesReceived.count,
        avgPerAgent,
        avgHandlingTime,
      };
    }),

  // Contatos por hora
  getContactsByHour: protectedProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const period = input?.period || "hoje";
        let { start, end } = getDateRangeFromPeriod(period);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        console.log(
          "[getContactsByHour] Period:",
          period,
          "Start:",
          start,
          "End:",
          end
        );

        // Check total customer messages in database
        const countCheck = await db.execute(sql`
          SELECT COUNT(*) as total FROM conversation_messages WHERE sender_type = 'customer'
        `);
        console.log("[getContactsByHour] Total customer messages:", countCheck);

        // If no data for the period, try with last 30 days
        const checkResult = countCheck as any[];
        const hasData = checkResult[0]?.total > 0;

        if (!hasData) {
          // Use last 30 days as fallback
          start = new Date();
          start.setDate(start.getDate() - 30);
          console.log(
            "[getContactsByHour] No data found, using fallback start:",
            start
          );
        }

        // Contatos por hora = quantidade de conversas com ao menos 1 mensagem do cliente
        // naquele horario (dentro do periodo).
        const result = await db.execute(sql`
          SELECT 
            HOUR(created_at) as hour,
            COUNT(DISTINCT conversation_id) as chats
          FROM conversation_messages
          WHERE sender_type = 'customer'
            AND created_at >= ${start}
            AND created_at <= ${end}
          GROUP BY HOUR(created_at)
          ORDER BY HOUR(created_at)
        `);

        console.log(
          "[getContactsByHour] Result count:",
          (result as any[]).length
        );

        const hourlyData = result as any[];

        // Criar array com todas as 24 horas (00h-23h)
        const allHours = Array.from({ length: 24 }, (_, i) => {
          const hourStr = i.toString().padStart(2, "0");
          const existingData = hourlyData.find(
            (d: any) => Number(d.hour) === i
          );

          return {
            hour: `${hourStr}h`,
            chats: Number(existingData?.chats) || 0,
            calls: 0,
            abandoned: 0,
          };
        });

        return allHours;
      } catch (error) {
        console.error("[getContactsByHour] Error:", error);
        // Return empty 24-hour array on error
        return Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}h`,
          chats: 0,
          calls: 0,
          abandoned: 0,
        }));
      }
    }),

  // Estatísticas por agente
  getAgentStats: protectedProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "hoje";
      const { start, end } = getDateRangeFromPeriod(period);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar todos os agentes (role = 'user')
      const agents = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.role, "user"));

      // Para cada agente, calcular estatísticas
      const agentStats = await Promise.all(
        agents.map(async agent => {
          // Total de atendimentos
          const [totalConversations] = await db
            .select({ count: sql<number>`count(*)` })
            .from(conversations)
            .where(eq(conversations.assignedTo, agent.id));

          // Dias ativos (dias únicos com atendimentos)
          const [activeDays] = await db
            .select({
              count: sql<number>`count(DISTINCT DATE(${conversations.openedAt}))`,
            })
            .from(conversations)
            .where(eq(conversations.assignedTo, agent.id));

          // Mensagens enviadas pelo agente
          const [messagesSent] = await db
            .select({ count: sql<number>`count(*)` })
            .from(conversationMessages)
            .innerJoin(
              conversations,
              eq(conversationMessages.conversationId, conversations.id)
            )
            .where(
              and(
                eq(conversations.assignedTo, agent.id),
                eq(conversationMessages.senderType, "agent")
              )
            );

          // Mensagens recebidas nas conversas do agente
          const [messagesReceived] = await db
            .select({ count: sql<number>`count(*)` })
            .from(conversationMessages)
            .innerJoin(
              conversations,
              eq(conversationMessages.conversationId, conversations.id)
            )
            .where(
              and(
                eq(conversations.assignedTo, agent.id),
                eq(conversationMessages.senderType, "customer")
              )
            );

          // Média de atendimentos por dia
          const avgPerDay =
            activeDays.count > 0
              ? (totalConversations.count / activeDays.count).toFixed(1)
              : "0.0";

          // TMA (mock - calcular depois com timestamps reais)
          const tma = "00:00:00";

          return {
            nome: agent.name,
            atendimentos: totalConversations.count,
            dias: activeDays.count,
            mediaAtendPorDia: parseFloat(avgPerDay),
            msgEnviadas: messagesSent.count,
            msgRecebidas: messagesReceived.count,
            tma,
          };
        })
      );

      // Ordenar por número de atendimentos (decrescente)
      return agentStats.sort((a, b) => b.atendimentos - a.atendimentos);
    }),

  // Atendimentos por fila
  getConversationsByQueue: protectedProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "hoje";
      const { start, end } = getDateRangeFromPeriod(period);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar todas as filas
      const allQueues = await db
        .select({
          id: queues.id,
          name: queues.name,
          color: queues.color,
        })
        .from(queues);

      // Para cada fila, contar conversas no periodo
      const queueData = await Promise.all(
        allQueues.map(async queue => {
          const [result] = await db
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
            value: result?.count || 0,
            color: queue.color || "#3b82f6",
          };
        })
      );

      // Bucket: conversas sem fila
      const [noQueue] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            sql`${conversations.queueId} IS NULL`,
            gte(conversations.openedAt, start),
            lte(conversations.openedAt, end)
          )
        );

      const data = [
        ...queueData,
        {
          name: "Sem fila",
          value: noQueue?.count || 0,
          color: "#64748b",
        },
      ];

      // Retornar inclusive vazias para nao sumir o grafico
      return data;
    }),

  // Estatísticas de variação (comparação com período anterior)
  getVariations: protectedProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("hoje"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "hoje";
      const { start, end } = getDateRangeFromPeriod(period);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Período atual (últimos 7 dias)
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const last14Days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      // Conversas no período atual
      const [currentPeriod] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(gte(conversations.openedAt, last7Days));

      // Conversas no período anterior (7-14 dias atrás)
      const [previousPeriod] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            gte(conversations.openedAt, last14Days),
            sql`${conversations.openedAt} < ${last7Days}`
          )
        );

      // Calcular variação percentual
      const calculateVariation = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const conversationsVariation = calculateVariation(
        currentPeriod.count,
        previousPeriod.count
      );

      // Clientes únicos no período atual
      const [currentCustomers] = await db
        .select({
          count: sql<number>`count(DISTINCT ${conversations.customerPhone})`,
        })
        .from(conversations)
        .where(gte(conversations.openedAt, last7Days));

      // Clientes únicos no período anterior
      const [previousCustomers] = await db
        .select({
          count: sql<number>`count(DISTINCT ${conversations.customerPhone})`,
        })
        .from(conversations)
        .where(
          and(
            gte(conversations.openedAt, last14Days),
            sql`${conversations.openedAt} < ${last7Days}`
          )
        );

      const customersVariation = calculateVariation(
        currentCustomers.count,
        previousCustomers.count
      );

      // Mensagens enviadas
      const [currentMessagesSent] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "agent"),
            gte(conversationMessages.createdAt, last7Days)
          )
        );

      const [previousMessagesSent] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "agent"),
            gte(conversationMessages.createdAt, last14Days),
            sql`${conversationMessages.createdAt} < ${last7Days}`
          )
        );

      const messagesSentVariation = calculateVariation(
        currentMessagesSent.count,
        previousMessagesSent.count
      );

      // Mensagens recebidas
      const [currentMessagesReceived] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "customer"),
            gte(conversationMessages.createdAt, last7Days)
          )
        );

      const [previousMessagesReceived] = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.senderType, "customer"),
            gte(conversationMessages.createdAt, last14Days),
            sql`${conversationMessages.createdAt} < ${last7Days}`
          )
        );

      const messagesReceivedVariation = calculateVariation(
        currentMessagesReceived.count,
        previousMessagesReceived.count
      );

      return {
        conversations: conversationsVariation,
        customers: customersVariation,
        messagesSent: messagesSentVariation,
        messagesReceived: messagesReceivedVariation,
        avgPerAgent: 20, // Mock - calcular depois
      };
    }),
});
