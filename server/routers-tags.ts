import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { tags, conversationTags, ticketTags } from "../drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";

function dbErrCode(e: any) {
  return e?.cause?.code || e?.code;
}

function isMissingTable(e: any) {
  const code = dbErrCode(e);
  const msg = String(e?.cause?.sqlMessage || e?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist");
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (isMissingTable(e)) return fallback;
    throw e;
  }
}

export const tagsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(tags).orderBy(tags.name);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(tags)
        .where(eq(tags.name, input.name))
        .limit(1);
      if (existing?.[0]) return existing[0];

      const inserted = await db
        .insert(tags)
        .values({
          name: input.name,
          color: input.color || "#3b82f6",
          icon: null,
          description: null,
          createdBy: null,
          createdAt: new Date(),
        } as any)
        .$returningId();

      const id = inserted?.[0]?.id;
      const created = await db
        .select()
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);
      return created?.[0];
    }),

  addToConversation: protectedProcedure
    .input(z.object({ conversationId: z.string(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await safe(
        async () => {
          await db.insert(conversationTags).values({
            conversationId: input.conversationId,
            tagId: input.tagId,
            createdAt: new Date(),
          } as any);
          return { success: true };
        },
        { success: true }
      );
    }),

  removeFromConversation: protectedProcedure
    .input(z.object({ conversationId: z.string(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await safe(
        async () => {
          await db
            .delete(conversationTags)
            .where(
              and(
                eq(conversationTags.conversationId, input.conversationId),
                eq(conversationTags.tagId, input.tagId)
              )
            );
          return { success: true };
        },
        { success: true }
      );
    }),

  addToTicket: protectedProcedure
    .input(z.object({ ticketId: z.number(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await safe(
        async () => {
          await db.insert(ticketTags).values({
            ticketId: input.ticketId,
            tagId: input.tagId,
            createdAt: new Date(),
          } as any);
          return { success: true };
        },
        { success: true }
      );
    }),

  removeFromTicket: protectedProcedure
    .input(z.object({ ticketId: z.number(), tagId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await safe(
        async () => {
          await db
            .delete(ticketTags)
            .where(
              and(
                eq(ticketTags.ticketId, input.ticketId),
                eq(ticketTags.tagId, input.tagId)
              )
            );
          return { success: true };
        },
        { success: true }
      );
    }),

  getTagStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return await safe(async () => {
      const rows = await db
        .select({
          tagId: conversationTags.tagId,
          conversationCount: sql<number>`COUNT(DISTINCT ${conversationTags.conversationId})`,
        })
        .from(conversationTags)
        .groupBy(conversationTags.tagId)
        .orderBy(desc(sql`conversationCount`));
      return rows as any;
    }, [] as any);
  }),
});
