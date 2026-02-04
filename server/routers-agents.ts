/**
 * tRPC Routers for Agent Performance Metrics
 * Provides API for agent rankings, statistics, and performance data
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { tickets, users, messages } from "../drizzle/schema";
import { eq, and, gte, lte, sql, count, avg, desc } from "drizzle-orm";

export const agentsRouter = router({
  /**
   * Get agent performance metrics with filters and pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
        sortBy: z.enum(['satisfaction', 'resolved', 'response_time', 'active']).default('satisfaction'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { agents: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

      const { page, pageSize, timeRange, sortBy } = input;
      const offset = (page - 1) * pageSize;

      // Calculate date range
      let startDate: Date | undefined;
      if (timeRange !== 'all') {
        const days = parseInt(timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Get all users with role 'user' (agents)
      const allAgents = await db
        .select()
        .from(users)
        .where(eq(users.role, 'user'));

      // Calculate metrics for each agent
      const agentsWithMetrics = await Promise.all(
        allAgents.map(async (agent) => {
          // Get tickets assigned to this agent
          const agentTickets = await db
            .select()
            .from(tickets)
            .where(
              startDate
                ? and(
                    eq(tickets.assignedTo, agent.id),
                    gte(tickets.createdAt, startDate)
                  )
                : eq(tickets.assignedTo, agent.id)
            );

          const totalTickets = agentTickets.length;
          const resolvedTickets = agentTickets.filter(t => t.status === 'closed').length;
          const activeTickets = agentTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

          // Calculate average response time (mock - would need message timestamps)
          const avgResponseTime = 3.5; // em minutos

          // Calculate average resolution time
          const resolvedWithTime = agentTickets.filter(t => t.status === 'closed' && t.createdAt);
          const avgResolutionTime = resolvedWithTime.length > 0
            ? resolvedWithTime.reduce((sum, t) => {
                const created = new Date(t.createdAt!).getTime();
                const now = Date.now();
                return sum + (now - created);
              }, 0) / resolvedWithTime.length / (1000 * 60 * 60) // convert to hours
            : 0;

          // Calculate satisfaction rate (mock - would need feedback data)
          const satisfactionRate = resolvedTickets > 0 
            ? Math.min(98, 85 + Math.random() * 13) 
            : 0;

          // Determine trend
          const trend: 'up' | 'down' | 'stable' = satisfactionRate > 90 ? 'up' : satisfactionRate < 75 ? 'down' : 'stable';
          const trendValue = Math.floor(Math.random() * 15);

          // Assign badges based on performance
          const badges: string[] = [];
          if (satisfactionRate >= 95) badges.push('🏆 Top Performer');
          if (avgResponseTime < 5) badges.push('⚡ Resposta Rápida');
          if (satisfactionRate >= 95) badges.push('😊 Melhor Avaliação');
          if (resolvedTickets > 100) badges.push('💪 Produtivo');

          return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            avatar: agent.name ? agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AG',
            totalTickets,
            resolvedTickets,
            avgResponseTime,
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
          case 'satisfaction':
            return b.satisfactionRate - a.satisfactionRate;
          case 'resolved':
            return b.resolvedTickets - a.resolvedTickets;
          case 'response_time':
            return a.avgResponseTime - b.avgResponseTime;
          case 'active':
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
   */
  getById: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
    }))
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
      if (input.timeRange !== 'all') {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      // Get detailed ticket statistics
      const agentTickets = await db
        .select()
        .from(tickets)
        .where(
          startDate
            ? and(
                eq(tickets.assignedTo, input.id),
                gte(tickets.createdAt, startDate)
              )
            : eq(tickets.assignedTo, input.id)
        );

      // Calculate metrics by day for chart
      const ticketsByDay: Record<string, number> = {};
      agentTickets.forEach(ticket => {
        if (ticket.createdAt) {
          const day = new Date(ticket.createdAt).toISOString().split('T')[0];
          ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
        }
      });

      return {
        agent: agent[0],
        totalTickets: agentTickets.length,
        resolvedTickets: agentTickets.filter(t => t.status === 'closed').length,
        activeTickets: agentTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        ticketsByDay,
      };
    }),

  /**
   * Get team overview statistics
   */
  getTeamStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        totalAgents: 0,
        totalTickets: 0,
        avgSatisfaction: 0,
        avgResponseTime: 0,
      };

      // Calculate date range
      let startDate: Date | undefined;
      if (input.timeRange !== 'all') {
        const days = parseInt(input.timeRange);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const allAgents = await db
        .select()
        .from(users)
        .where(eq(users.role, 'user'));

      const allTickets = await db
        .select()
        .from(tickets)
        .where(startDate ? gte(tickets.createdAt, startDate) : undefined);

      return {
        totalAgents: allAgents.length,
        totalTickets: allTickets.length,
        avgSatisfaction: 92, // Mock
        avgResponseTime: 4.2, // Mock em minutos
      };
    }),
});
