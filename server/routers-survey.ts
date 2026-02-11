import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  surveyResponses,
  customers,
  users,
  conversations,
} from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const surveyRouter = router({
  // List all survey responses
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().default(50),
          offset: z.number().default(0),
          minRating: z.number().optional(),
          maxRating: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      const conditions = [];
      if (input?.minRating !== undefined) {
        conditions.push(sql`${surveyResponses.rating} >= ${input.minRating}`);
      }
      if (input?.maxRating !== undefined) {
        conditions.push(sql`${surveyResponses.rating} <= ${input.maxRating}`);
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      let query = db
        .select({
          survey: surveyResponses,
          customer: customers,
          agent: users,
          conversation: conversations,
        })
        .from(surveyResponses)
        .leftJoin(customers, eq(surveyResponses.customerId, customers.id))
        .leftJoin(users, eq(surveyResponses.agentId, users.id))
        .leftJoin(
          conversations,
          eq(surveyResponses.conversationId, conversations.id)
        );

      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      const results = await query
        .orderBy(desc(surveyResponses.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    }),

  // Get survey statistics
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses);

    const [avgRating] = await db
      .select({ avg: sql<number>`avg(rating)` })
      .from(surveyResponses);

    const [rating1] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.rating, 1));

    const [rating2] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.rating, 2));

    const [rating3] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.rating, 3));

    const [rating4] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.rating, 4));

    const [rating5] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.rating, 5));

    return {
      totalResponses: Number(total?.count) || 0,
      averageRating: Number(avgRating?.avg) || 0,
      ratingDistribution: {
        rating1: Number(rating1?.count) || 0,
        rating2: Number(rating2?.count) || 0,
        rating3: Number(rating3?.count) || 0,
        rating4: Number(rating4?.count) || 0,
        rating5: Number(rating5?.count) || 0,
      },
    };
  }),

  // Get a single survey response by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select({
          survey: surveyResponses,
          customer: customers,
          agent: users,
          conversation: conversations,
        })
        .from(surveyResponses)
        .leftJoin(customers, eq(surveyResponses.customerId, customers.id))
        .leftJoin(users, eq(surveyResponses.agentId, users.id))
        .leftJoin(
          conversations,
          eq(surveyResponses.conversationId, conversations.id)
        )
        .where(eq(surveyResponses.id, input.id))
        .limit(1);

      return result;
    }),
});
