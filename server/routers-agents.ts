/**
 * tRPC Routers for Agent Performance Metrics
 * Provides API for agent rankings, statistics, and performance data
 * USING REAL DATA FROM DATABASE
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  conversations,
  users,
  conversationMessages,
  surveyResponses,
} from "../drizzle/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

export const agentsRouter = router({
  /**
   * Get agent performance metrics with filters and pagination
   * USING REAL DATA FROM DATABASE - OPTIMIZED VERSION
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
        sortBy: z
          .enum(["satisfaction", "resolved", "response_time", "active"])
          .default("satisfaction"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return {
          agents: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        };

      const { page, pageSize, timeRange, sortBy } = input;
      const offset = (page - 1) * pageSize;

      // Calculate date range
      let startDate: Date | undefined;
      if (timeRange !== "all") {
        const days = parseInt(timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Get ALL users (todos os usuários são agentes potenciais)
      const allAgents = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

      console.log(
        `[agents.list] Total de usuários encontrados: ${allAgents.length}`
      );
      console.log(
        `[agents.list] IDs: ${allAgents.map(a => `${a.id}(${a.name})`).join(", ")}`
      );

      if (allAgents.length === 0) {
        console.log("[agents.list] Nenhum usuário encontrado no banco");
        return {
          agents: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        };
      }

      // Get all conversations with assignments for these agents
      const agentIds = allAgents.map(a => a.id);

      // Fetch conversations using raw SQL for better performance
      const allConversations = startDate
        ? await db
            .select()
            .from(conversations)
            .where(
              and(
                sql`${conversations.assignedTo} IN (${agentIds.join(",")})`,
                gte(conversations.openedAt, startDate)
              )
            )
        : await db
            .select()
            .from(conversations)
            .where(sql`${conversations.assignedTo} IN (${agentIds.join(",")})`);

      // Group conversations by agent
      const conversationsByAgent: Record<number, typeof allConversations> = {};
      agentIds.forEach(id => {
        conversationsByAgent[id] = allConversations.filter(
          c => c.assignedTo === id
        );
      });

      // Get all survey responses for these agents
      const allSurveys = startDate
        ? await db
            .select()
            .from(surveyResponses)
            .where(
              and(
                sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`,
                gte(surveyResponses.createdAt, startDate)
              )
            )
        : await db
            .select()
            .from(surveyResponses)
            .where(sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`);

      // Group surveys by agent
      const surveysByAgent: Record<number, typeof allSurveys> = {};
      agentIds.forEach(id => {
        surveysByAgent[id] = allSurveys.filter(s => s.agentId === id);
      });

      // Get conversation IDs to fetch messages
      const conversationIds = allConversations.map(c => c.id);

      // Fetch all messages for these conversations in one query
      let allMessages: (typeof conversationMessages.$inferSelect)[] = [];
      if (conversationIds.length > 0) {
        // Batch fetch messages
        const batchSize = 100;
        for (let i = 0; i < conversationIds.length; i += batchSize) {
          const batch = conversationIds.slice(i, i + batchSize);
          const batchMessages = await db
            .select()
            .from(conversationMessages)
            .where(
              sql`${conversationMessages.conversationId} IN (${batch.join(",")})`
            )
            .orderBy(conversationMessages.createdAt);
          allMessages = [...allMessages, ...batchMessages];
        }
      }

      // Group messages by conversation
      const messagesByConversation: Record<number, typeof allMessages> = {};
      conversationIds.forEach(id => {
        messagesByConversation[id] = allMessages.filter(
          m => m.conversationId === id
        );
      });

      // Calculate metrics for each agent
      const agentsWithMetrics = allAgents.map(agent => {
        const agentConversations = conversationsByAgent[agent.id] || [];
        const totalTickets = agentConversations.length;
        const resolvedTickets = agentConversations.filter(
          c => c.status === "closed"
        ).length;
        const activeTickets = agentConversations.filter(
          c => c.status === "assigned" || c.status === "open"
        ).length;

        // Calculate average response time
        let avgResponseTime = 0;
        let totalResponseTime = 0;
        let responseCount = 0;

        for (const conv of agentConversations) {
          const messages = messagesByConversation[conv.id] || [];

          if (messages.length >= 2) {
            const firstCustomerMsg = messages.find(
              m => m.senderType === "customer"
            );
            const firstAgentMsg = messages.find(m => m.senderType === "agent");

            if (firstCustomerMsg && firstAgentMsg) {
              const customerTime = new Date(
                firstCustomerMsg.createdAt
              ).getTime();
              const agentTime = new Date(firstAgentMsg.createdAt).getTime();
              const responseTime = (agentTime - customerTime) / (1000 * 60);

              if (responseTime > 0 && responseTime < 1440) {
                totalResponseTime += responseTime;
                responseCount++;
              }
            }
          }
        }

        avgResponseTime =
          responseCount > 0 ? totalResponseTime / responseCount : 0;

        // Calculate average resolution time
        let avgResolutionTime = 0;
        const resolvedConversations = agentConversations.filter(
          c => c.status === "closed" && c.closedAt && c.openedAt
        );

        if (resolvedConversations.length > 0) {
          const totalResolutionTime = resolvedConversations.reduce((sum, c) => {
            const opened = new Date(c.openedAt!).getTime();
            const closed = new Date(c.closedAt!).getTime();
            return sum + (closed - opened);
          }, 0);
          avgResolutionTime =
            totalResolutionTime /
            resolvedConversations.length /
            (1000 * 60 * 60);
        }

        // Calculate satisfaction rate
        const agentSurveys = surveysByAgent[agent.id] || [];
        let satisfactionRate = 0;
        if (agentSurveys.length > 0) {
          const totalRating = agentSurveys.reduce(
            (sum, s) => sum + s.rating,
            0
          );
          satisfactionRate = (totalRating / (agentSurveys.length * 5)) * 100;
        }

        // Determine trend
        let trend: "up" | "down" | "stable" = "stable";
        let trendValue = 0;

        if (agentSurveys.length >= 2) {
          const recentSurveys = agentSurveys.slice(
            -Math.ceil(agentSurveys.length / 2)
          );
          const olderSurveys = agentSurveys.slice(
            0,
            Math.floor(agentSurveys.length / 2)
          );

          const recentAvg =
            recentSurveys.reduce((sum, s) => sum + s.rating, 0) /
            recentSurveys.length;
          const olderAvg =
            olderSurveys.reduce((sum, s) => sum + s.rating, 0) /
            olderSurveys.length;

          if (recentAvg > olderAvg) {
            trend = "up";
            trendValue = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
          } else if (recentAvg < olderAvg) {
            trend = "down";
            trendValue = Math.round(((olderAvg - recentAvg) / olderAvg) * 100);
          }
        }

        // Assign badges
        const badges: string[] = [];
        if (satisfactionRate >= 90) badges.push("🏆 Top Performer");
        if (avgResponseTime > 0 && avgResponseTime < 5)
          badges.push("⚡ Resposta Rápida");
        if (satisfactionRate >= 90) badges.push("😊 Melhor Avaliação");
        if (resolvedTickets > 50) badges.push("💪 Produtivo");
        if (agentSurveys.length > 0 && satisfactionRate >= 95)
          badges.push("⭐ Excelência");

        return {
          id: agent.id,
          name: agent.name || agent.email || `Agente ${agent.id}`,
          email: agent.email,
          avatar: agent.name
            ? agent.name
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : agent.email
              ? agent.email.substring(0, 2).toUpperCase()
              : "AG",
          totalTickets,
          resolvedTickets,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
          satisfactionRate: Math.round(satisfactionRate),
          activeTickets,
          badges,
          trend,
          trendValue,
        };
      });

      // Sort agents
      const sortedAgents = agentsWithMetrics.sort((a, b) => {
        switch (sortBy) {
          case "satisfaction":
            return b.satisfactionRate - a.satisfactionRate;
          case "resolved":
            return b.resolvedTickets - a.resolvedTickets;
          case "response_time":
            return a.avgResponseTime - b.avgResponseTime;
          case "active":
            return b.activeTickets - a.activeTickets;
          default:
            return 0;
        }
      });

      // Paginate
      const paginatedAgents = sortedAgents.slice(offset, offset + pageSize);
      const total = sortedAgents.length;

      console.log(`[agents.list] Total de agentes com métricas: ${total}`);
      console.log(
        `[agents.list] Retornando ${paginatedAgents.length} agentes na página ${page}`
      );
      console.log(
        `[agents.list] Primeiros agentes: ${paginatedAgents
          .slice(0, 3)
          .map(a => `${a.name}(${a.totalTickets} tickets)`)
          .join(", ")}`
      );

      return {
        agents: paginatedAgents,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get detailed metrics for a specific agent
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const agent = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (agent.length === 0) return null;

      let startDate: Date | undefined;
      if (input.timeRange !== "all") {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const agentConversations = await db
        .select()
        .from(conversations)
        .where(
          startDate
            ? and(
                eq(conversations.assignedTo, input.id),
                gte(conversations.openedAt, startDate)
              )
            : eq(conversations.assignedTo, input.id)
        );

      const ticketsByDay: Record<string, number> = {};
      agentConversations.forEach(conv => {
        if (conv.openedAt) {
          const day = new Date(conv.openedAt).toISOString().split("T")[0];
          ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
        }
      });

      const agentSurveys = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.agentId, input.id));

      const avgRating =
        agentSurveys.length > 0
          ? (
              agentSurveys.reduce((sum, s) => sum + s.rating, 0) /
              agentSurveys.length
            ).toFixed(1)
          : "0.0";

      return {
        agent: agent[0],
        totalTickets: agentConversations.length,
        resolvedTickets: agentConversations.filter(c => c.status === "closed")
          .length,
        activeTickets: agentConversations.filter(
          c => c.status === "assigned" || c.status === "open"
        ).length,
        ticketsByDay,
        surveyCount: agentSurveys.length,
        avgRating: parseFloat(avgRating),
      };
    }),

  /**
   * Get team overview statistics
   */
  getTeamStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return {
          totalAgents: 0,
          totalTickets: 0,
          avgSatisfaction: 0,
          avgResponseTime: 0,
        };

      let startDate: Date | undefined;
      if (input.timeRange !== "all") {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const allAgents = await db
        .select()
        .from(users)
        .where(eq(users.role, "user"));

      const allConversations = await db
        .select()
        .from(conversations)
        .where(startDate ? gte(conversations.openedAt, startDate) : undefined);

      const allSurveys = await db
        .select()
        .from(surveyResponses)
        .where(
          startDate ? gte(surveyResponses.createdAt, startDate) : undefined
        );

      const avgSatisfaction =
        allSurveys.length > 0
          ? Math.round(
              (allSurveys.reduce((sum, s) => sum + s.rating, 0) /
                (allSurveys.length * 5)) *
                100
            )
          : 0;

      return {
        totalAgents: allAgents.length,
        totalTickets: allConversations.length,
        avgSatisfaction,
        avgResponseTime: 0,
      };
    }),

  /**
   * Get chart data for performance trends
   */
  getChartData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let startDate: Date | undefined;
      if (input.timeRange !== "all") {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const allAgents = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

      if (allAgents.length === 0) {
        return [];
      }

      const agentIds = allAgents.map(a => a.id);

      // Get conversations grouped by date
      const allConversations = startDate
        ? await db
            .select({
              openedAt: conversations.openedAt,
              status: conversations.status,
            })
            .from(conversations)
            .where(
              and(
                sql`${conversations.assignedTo} IN (${agentIds.join(",")})`,
                gte(conversations.openedAt, startDate)
              )
            )
        : await db
            .select({
              openedAt: conversations.openedAt,
              status: conversations.status,
            })
            .from(conversations)
            .where(sql`${conversations.assignedTo} IN (${agentIds.join(",")})`);

      // Get surveys grouped by date
      const allSurveys = startDate
        ? await db
            .select({
              createdAt: surveyResponses.createdAt,
              rating: surveyResponses.rating,
            })
            .from(surveyResponses)
            .where(
              and(
                sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`,
                gte(surveyResponses.createdAt, startDate)
              )
            )
        : await db
            .select({
              createdAt: surveyResponses.createdAt,
              rating: surveyResponses.rating,
            })
            .from(surveyResponses)
            .where(sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`);

      // Group by date
      const dataByDate: Record<
        string,
        {
          tickets: number;
          resolved: number;
          satisfaction: number;
          count: number;
        }
      > = {};

      allConversations.forEach(conv => {
        if (conv.openedAt) {
          const date = new Date(conv.openedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          if (!dataByDate[date]) {
            dataByDate[date] = {
              tickets: 0,
              resolved: 0,
              satisfaction: 0,
              count: 0,
            };
          }
          dataByDate[date].tickets++;
          if (conv.status === "closed") {
            dataByDate[date].resolved++;
          }
        }
      });

      allSurveys.forEach(survey => {
        if (survey.createdAt) {
          const date = new Date(survey.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          if (!dataByDate[date]) {
            dataByDate[date] = {
              tickets: 0,
              resolved: 0,
              satisfaction: 0,
              count: 0,
            };
          }
          dataByDate[date].satisfaction += survey.rating;
          dataByDate[date].count++;
        }
      });

      // Convert to array and calculate percentages
      const chartData = Object.entries(dataByDate)
        .map(([date, data]) => ({
          date,
          tickets: data.tickets,
          resolved: data.resolved,
          satisfacao:
            data.count > 0
              ? Math.round((data.satisfaction / data.count / 5) * 100)
              : 0,
        }))
        .sort((a, b) => {
          const [dayA, monthA] = a.date.split("/").map(Number);
          const [dayB, monthB] = b.date.split("/").map(Number);
          return monthA * 31 + dayA - (monthB * 31 + dayB);
        });

      return chartData;
    }),

  /**
   * Generate real insights based on agent performance
   */
  getInsights: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let startDate: Date | undefined;
      if (input.timeRange !== "all") {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const allAgents = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

      if (allAgents.length === 0) {
        return ["Nenhum agente cadastrado no sistema."];
      }

      const agentIds = allAgents.map(a => a.id);

      // Get all conversations and surveys
      const allConversations = startDate
        ? await db
            .select()
            .from(conversations)
            .where(
              and(
                sql`${conversations.assignedTo} IN (${agentIds.join(",")})`,
                gte(conversations.openedAt, startDate)
              )
            )
        : await db
            .select()
            .from(conversations)
            .where(sql`${conversations.assignedTo} IN (${agentIds.join(",")})`);

      const allSurveys = startDate
        ? await db
            .select()
            .from(surveyResponses)
            .where(
              and(
                sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`,
                gte(surveyResponses.createdAt, startDate)
              )
            )
        : await db
            .select()
            .from(surveyResponses)
            .where(sql`${surveyResponses.agentId} IN (${agentIds.join(",")})`);

      const insights: string[] = [];

      // Check if there's data
      if (allConversations.length === 0) {
        insights.push(
          "Não há tickets atribuídos aos agentes no período selecionado."
        );
        return insights;
      }

      // Find top performer by satisfaction
      const surveysByAgent: Record<number, number[]> = {};
      allSurveys.forEach(survey => {
        if (survey.agentId && !surveysByAgent[survey.agentId]) {
          surveysByAgent[survey.agentId] = [];
        }
        if (survey.agentId) {
          surveysByAgent[survey.agentId].push(survey.rating);
        }
      });

      let bestAgentId: number | null = null;
      let bestAgentName = "";
      let bestAvgRating = 0;

      Object.entries(surveysByAgent).forEach(([agentId, ratings]) => {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const agent = allAgents.find(a => a.id === parseInt(agentId));
        if (agent && avg > bestAvgRating) {
          bestAgentId = agent.id;
          bestAgentName = agent.name || agent.email || `Agente ${agent.id}`;
          bestAvgRating = avg;
        }
      });

      if (bestAgentId && bestAvgRating >= 4) {
        insights.push(
          `• ${bestAgentName} mantém excelente performance com média de ${bestAvgRating.toFixed(1)} estrelas - considere reconhecê-lo(a)`
        );
      }

      // Find agent with most tickets
      const ticketsByAgent: Record<number, number> = {};
      allConversations.forEach(conv => {
        if (conv.assignedTo) {
          ticketsByAgent[conv.assignedTo] =
            (ticketsByAgent[conv.assignedTo] || 0) + 1;
        }
      });

      const topTicketAgent = Object.entries(ticketsByAgent).sort(
        (a, b) => b[1] - a[1]
      )[0];

      if (topTicketAgent) {
        const agent = allAgents.find(a => a.id === parseInt(topTicketAgent[0]));
        if (agent) {
          insights.push(
            `• ${agent.name || agent.email} liderou com ${topTicketAgent[1]} tickets atendidos no período`
          );
        }
      }

      // Overall satisfaction
      if (allSurveys.length > 0) {
        const avgSatisfaction =
          allSurveys.reduce((sum, s) => sum + s.rating, 0) / allSurveys.length;
        const satisfactionPercent = (avgSatisfaction / 5) * 100;

        if (satisfactionPercent >= 80) {
          insights.push(
            `• Equipe geral está com ${satisfactionPercent.toFixed(0)}% de satisfação - excelente desempenho! 🎉`
          );
        } else if (satisfactionPercent >= 60) {
          insights.push(
            `• Satisfação da equipe está em ${satisfactionPercent.toFixed(0)}% - há espaço para melhorias`
          );
        } else {
          insights.push(
            `• Satisfação da equipe está em ${satisfactionPercent.toFixed(0)}% - considere treinamentos`
          );
        }
      }

      // Resolution rate
      const resolvedCount = allConversations.filter(
        c => c.status === "closed"
      ).length;
      const resolutionRate =
        allConversations.length > 0
          ? (resolvedCount / allConversations.length) * 100
          : 0;

      if (resolutionRate >= 90) {
        insights.push(
          `• Taxa de resolução está excelente em ${resolutionRate.toFixed(0)}%`
        );
      } else if (resolutionRate >= 70) {
        insights.push(
          `• Taxa de resolução está em ${resolutionRate.toFixed(0)}%`
        );
      } else {
        insights.push(
          `• Taxa de resolução está em ${resolutionRate.toFixed(0)}% - verifique tickets pendentes`
        );
      }

      if (insights.length === 0) {
        insights.push(
          "Dados insuficientes para gerar insights no período selecionado."
        );
      }

      return insights;
    }),
});
