import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { z } from "zod";
import {
  broadcastLists,
  broadcastListMembers,
} from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const broadcastRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(broadcastLists).values({
        name: input.name,
        description: input.description,
        createdAt: new Date(),
      });
      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const offset = (input.page - 1) * input.limit;
      
      const lists = await db
        .select({
          id: broadcastLists.id,
          name: broadcastLists.name,
          description: broadcastLists.description,
          memberCount: sql<number>`COUNT(DISTINCT ${broadcastListMembers.customerId})`,
          lastSentAt: broadcastLists.lastSentAt,
          createdAt: broadcastLists.createdAt,
        })
        .from(broadcastLists)
        .leftJoin(
          broadcastListMembers,
          eq(broadcastLists.id, broadcastListMembers.listId)
        )
        .groupBy(broadcastLists.id)
        .orderBy(desc(broadcastLists.createdAt))
        .limit(input.limit)
        .offset(offset);

      const countResult = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(broadcastLists);

      const total = countResult[0]?.total || 0;

      return {
        lists,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / input.limit),
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const lists = await db
        .select()
        .from(broadcastLists)
        .where(eq(broadcastLists.id, input.listId));
      return lists[0] || null;
    }),
});
