import { router, publicProcedure, publicProcedure, publicProcedure } from "./_core/trpc";
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
  getStats: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional().default("todas"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const period = input?.period || "todas";
      const { start, end } = getDateRangeFromPeriod(period);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log(`[getStats] Period: ${period} (ignoring date filters - using all-time data)`);

      // Total de atendimentos (conversas) - SEM FILTRO DE DATA
      const totalConversations = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations);

      // Clientes únicos - SEM FILTRO DE DATA
      const uniqueCustomers = await db
        .select({
          count: sql<number>`count(DISTINCT ${conversations.customerPhone})`,
        })
        .from(conversations);

      // Mensagens enviadas (por agentes) - SEM FILTRO DE DATA
      const messagesSent = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(eq(conversationMessages.senderType, "agent"));

      // Mensagens recebidas (de clientes) - SEM FILTRO DE DATA
      const messagesReceived = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationMessages)
        .where(eq(conversationMessages.senderType, "customer"));

      // Total de agentes ativos
      const totalAgents = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "user"));

      // Extrair valores
      const totalConvValue = totalConversations[0]?.count || 0;
      const uniqueCustValue = uniqueCustomers[0]?.count || 0;
      const msgSentValue = messagesSent[0]?.count || 0;
      const msgRecValue = messagesReceived[0]?.count || 0;
      const agentsValue = totalAgents[0]?.count || 0;

      console.log(`[getStats] Values:`, {
        totalConversations: totalConvValue,
        uniqueCustomers: uniqueCustValue,
        messagesSent: msgSentValue,
        messagesReceived: msgRecValue,
        totalAgents: agentsValue
      });

      // Média de atendimentos por agente
      const avgPerAgent = agentsValue > 0 ? Math.round(totalConvValue / agentsValue) : 0;

      // Tempo médio de atendimento (mock)
      const avgHandlingTime = "00:14:32";

      return {
        totalConversations: totalConvValue,
        uniqueCustomers: uniqueCustValue,
        messagesSent: msgSentValue,
        messagesReceived: msgRecValue,
        avgPerAgent,
        avgHandlingTime,
      };
    }),

  // Atendimentos por canal
  getConversationsByChannel: publicProcedure
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

      const rawResult = await db.execute(sql`
        SELECT 
          channel,
          COUNT(*) as count
        FROM conversations
        WHERE channel IS NOT NULL
        GROUP BY channel
        ORDER BY count DESC
      `);

      const result = Array.isArray(rawResult) ? (rawResult[0] as any[]) : (rawResult as any[]);

      // Cores para cada canal
      const channelColors: Record<string, string> = {
        whatsapp: "#25D366",
        instagram: "#E4405F",
        facebook: "#1877F2",
        telegram: "#0088CC",
        email: "#EA4335",
        web: "#4285F4",
      };

      return result?.map((r: any) => ({
        name: r.channel?.charAt(0).toUpperCase() + r.channel?.slice(1) || "Desconhecido",
        value: Number(r.count) || 0,
        color: channelColors[r.channel?.toLowerCase()] || "#6B7280",
      })) || [];
    }),

  // Atendimentos por status
  getConversationsByStatus: publicProcedure
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

      const rawResult = await db.execute(sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM conversations
        WHERE status IS NOT NULL
        GROUP BY status
        ORDER BY count DESC
      `);

      const result = Array.isArray(rawResult) ? (rawResult[0] as any[]) : (rawResult as any[]);

      const statusLabels: Record<string, string> = {
        open: "Em aberto",
        closed: "Encerrados",
        pending: "Pendentes",
        waiting: "Aguardando",
        assigned: "Atribuídos",
      };

      const statusColors: Record<string, string> = {
        open: "#3B82F6",
        closed: "#10B981",
        pending: "#F59E0B",
        waiting: "#8B5CF6",
        assigned: "#F59E0B",
      };

      return result?.map((r: any) => ({
        name: statusLabels[r.status] || r.status || "Desconhecido",
        value: Number(r.count) || 0,
        color: statusColors[r.status] || "#6B7280",
      })) || [];
    }),

  // Contatos por hora
  getContactsByHour: publicProcedure
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
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Calculate date range - always use last 30 days for the chart
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        console.log(
          "[getContactsByHour] Using last 30 days:",
          start,
          "to",
          end
        );

        // Contatos por hora = quantidade de conversas com ao menos 1 mensagem do cliente
        const rawResult = await db.execute(sql`
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

        // O resultado vem como array: [dados, metadados]
        // Pegamos apenas a primeira parte
        const result = Array.isArray(rawResult) ? rawResult[0] as any[] : rawResult as any[];
        
        console.log("[getContactsByHour] Result:", result);

        // Criar array com todas as 24 horas (00h-23h)
        const allHours = Array.from({ length: 24 }, (_, i) => {
          const hourStr = i.toString().padStart(2, "0");
          const existingData = result?.find(
            (d: any) => Number(d.hour) === i
          );

          return {
            hour: `${hourStr}h`,
            chats: Number(existingData?.chats) || 0,
            calls: 0,
            abandoned: 0,
          };
        });

        console.log(
          "[getContactsByHour] Returning:",
          JSON.stringify(allHours.filter(h => h.chats > 0))
        );
        return allHours;
      } catch (error) {
        console.error("[getContactsByHour] Error:", error);
        return Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}h`,
          chats: 0,
          calls: 0,
          abandoned: 0,
        }));
      }
    }),

  // Estatísticas por agente
  getAgentStats: publicProcedure
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
            name: agent.name,
            conversations: totalConversations.count,
            days: activeDays.count,
            avgPerDay: parseFloat(avgPerDay),
            messagesSent: messagesSent.count,
            messagesReceived: messagesReceived.count,
            tma,
          };
        })
      );

      // Ordenar por número de atendimentos (decrescente)
      return agentStats.sort((a, b) => b.conversations - a.conversations);
    }),

  // Atendimentos por fila
  getConversationsByQueue: publicProcedure
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
  getVariations: publicProcedure
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
