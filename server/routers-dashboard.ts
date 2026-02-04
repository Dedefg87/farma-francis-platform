import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { tickets, customers, receivedMessages, messages, employees } from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

/**
 * Dashboard router for real-time statistics
 */
export const dashboardRouter = router({
  /**
   * Get main dashboard statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return {
          totalTickets: 0,
          uniqueCustomers: 0,
          messagesSent: 0,
          messagesReceived: 0,
          avgHandlingTime: 0,
        };

      // Count tickets
      const ticketCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tickets);

      // Count unique customers
      const customerCount = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${customers.id})` })
        .from(customers);

      // Count messages sent
      const sentCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(messages)
        .where(eq(messages.direction, "outbound"));

      // Count messages received
      const receivedCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(receivedMessages);

      // Calculate average handling time (in minutes)
      const avgTime = await db
        .select({ avg: sql<number>`AVG(${tickets.timeSpentMinutes})` })
        .from(tickets)
        .where(sql`${tickets.timeSpentMinutes} > 0`);

      return {
        totalTickets: Number(ticketCount[0]?.count || 0),
        uniqueCustomers: Number(customerCount[0]?.count || 0),
        messagesSent: Number(sentCount[0]?.count || 0),
        messagesReceived: Number(receivedCount[0]?.count || 0),
        avgHandlingTime: Math.round(Number(avgTime[0]?.avg || 0)),
      };
    }),

  /**
   * Get messages by hour for chart
   */
  getMessagesByHour: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Get messages grouped by hour
    const result = await db
      .select({
        hour: sql<number>`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(receivedMessages)
      .groupBy(sql`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`)
      .orderBy(sql`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`);

    return result.map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    }));
  }),

  /**
   * Get tickets by status
   */
  getTicketsByStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .groupBy(tickets.status);

    return result.map((r) => ({
      status: r.status,
      count: Number(r.count),
    }));
  }),

  /**
   * Get tickets by channel
   */
  getTicketsByChannel: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        channel: tickets.channel,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(sql`${tickets.channel} IS NOT NULL`)
      .groupBy(tickets.channel);

    return result.map((r) => ({
      channel: r.channel,
      count: Number(r.count),
    }));
  }),

  /**
   * Get employee performance metrics
   */
  getEmployeeMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Get tickets assigned to each employee
    const result = await db
      .select({
        employeeId: tickets.assignedTo,
        ticketsHandled: sql<number>`COUNT(*)`,
        avgTime: sql<number>`AVG(${tickets.timeSpentMinutes})`,
      })
      .from(tickets)
      .where(sql`${tickets.assignedTo} IS NOT NULL`)
      .groupBy(tickets.assignedTo);

    return result.map((r) => ({
      employeeId: r.employeeId,
      ticketsHandled: Number(r.ticketsHandled),
      avgHandlingTime: Math.round(Number(r.avgTime || 0)),
    }));
  }),

  /**
   * Get recent tickets
   */
  getRecentTickets: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(tickets)
        .orderBy(desc(tickets.createdAt))
        .limit(input.limit);

      return result;
    }),
});
