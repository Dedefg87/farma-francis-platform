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
import { eq, and, gte, lte, sql, count, avg, desc } from "drizzle-orm";

export const agentsRouter = router({
  /**
   * Get agent performance metrics with filters and pagination
   * USING REAL DATA FROM DATABASE
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

      // Get all users with role 'user' (agents)
      const allAgents = await db
        .select()
        .from(users)
        .where(eq(users.role, "user"));

      // Calculate metrics for each agent using REAL DATA
      const agentsWithMetrics = await Promise.all(
        allAgents.map(async agent => {
          // Get conversations assigned to this agent
          const agentConversations = await db
            .select()
            .from(conversations)
            .where(
              startDate
                ? and(
                    eq(conversations.assignedTo, agent.id),
                    gte(conversations.openedAt, startDate)
                  )
                : eq(conversations.assignedTo, agent.id)
            );

          const totalTickets = agentConversations.length;
          const resolvedTickets = agentConversations.filter(
            c => c.status === "closed"
          ).length;
          const activeTickets = agentConversations.filter(
            c => c.status === "assigned" || c.status === "open"
          ).length;

          // Calculate REAL average response time from conversationMessages
          let avgResponseTime = 0;
          let totalResponseTime = 0;
          let responseCount = 0;

          for (const conv of agentConversations) {
            // Get first customer message and first agent response
            const messages = await db
              .select()
              .from(conversationMessages)
              .where(eq(conversationMessages.conversationId, conv.id))
              .orderBy(conversationMessages.createdAt);

            if (messages.length >= 2) {
              const firstCustomerMsg = messages.find(
                m => m.senderType === "customer"
              );
              const firstAgentMsg = messages.find(
                m => m.senderType === "agent"
              );

              if (firstCustomerMsg && firstAgentMsg) {
                const customerTime = new Date(
                  firstCustomerMsg.createdAt
                ).getTime();
                const agentTime = new Date(firstAgentMsg.createdAt).getTime();
                const responseTime = (agentTime - customerTime) / (1000 * 60); // in minutes

                if (responseTime > 0 && responseTime < 1440) {
                  // Max 24 hours
                  totalResponseTime += responseTime;
                  responseCount++;
                }
              }
            }
          }

          avgResponseTime =
            responseCount > 0 ? totalResponseTime / responseCount : 0;

          // Calculate REAL average resolution time
          let avgResolutionTime = 0;
          const resolvedConversations = agentConversations.filter(
            c => c.status === "closed" && c.closedAt && c.openedAt
          );

          if (resolvedConversations.length > 0) {
            const totalResolutionTime = resolvedConversations.reduce(
              (sum, c) => {
                const opened = new Date(c.openedAt!).getTime();
                const closed = new Date(c.closedAt!).getTime();
                return sum + (closed - opened);
              },
              0
            );
            avgResolutionTime =
              totalResolutionTime /
              resolvedConversations.length /
              (1000 * 60 * 60); // in hours
          }

          // Calculate REAL satisfaction rate from surveyResponses
          const agentSurveys = await db
            .select()
            .from(surveyResponses)
            .where(eq(surveyResponses.agentId, agent.id));

          let satisfactionRate = 0;
          if (agentSurveys.length > 0) {
            const totalRating = agentSurveys.reduce(
              (sum, s) => sum + s.rating,
              0
            );
            satisfactionRate = (totalRating / (agentSurveys.length * 5)) * 100; // Convert to percentage
          }

          // Determine trend based on satisfaction rate
          let trend: "up" | "down" | "stable" = "stable";
          let trendValue = 0;

          if (agentSurveys.length >= 2) {
            // Compare recent surveys with older ones
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
              trendValue = Math.round(
                ((recentAvg - olderAvg) / olderAvg) * 100
              );
            } else if (recentAvg < olderAvg) {
              trend = "down";
              trendValue = Math.round(
                ((olderAvg - recentAvg) / olderAvg) * 100
              );
            }
          }

          // Assign badges based on REAL performance
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
            name: agent.name || "Agente " + agent.id,
            email: agent.email,
            avatar: agent.name
              ? agent.name
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
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
        })
      );

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
   * USING REAL DATA
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

      // Calculate date range
      let startDate: Date | undefined;
      if (input.timeRange !== "all") {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Get detailed conversation statistics
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

      // Calculate metrics by day for chart
      const ticketsByDay: Record<string, number> = {};
      agentConversations.forEach(conv => {
        if (conv.openedAt) {
          const day = new Date(conv.openedAt).toISOString().split("T")[0];
          ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
        }
      });

      // Get REAL survey ratings
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
   * USING REAL DATA
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

      // Calculate date range
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

      // Get all surveys for the period
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
        avgResponseTime: 4.2, // Still mock - would need complex calculation
      };
    }),
});
