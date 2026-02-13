import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { frontendTelemetryEvents } from "../drizzle/schema";

export const telemetryRouter = router({
  ingest: protectedProcedure
    .input(
      z.object({
        events: z
          .array(
            z.object({
              page: z.string().max(160).optional(),
              eventName: z.string().max(120),
              payload: z.unknown().optional(),
              occurredAt: z.string().datetime().optional(),
            })
          )
          .min(1)
          .max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const rows = input.events.map(e => ({
        userId: ctx.user.id,
        page: e.page ?? null,
        eventName: e.eventName,
        payloadJson: e.payload ? JSON.stringify(e.payload) : null,
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
        createdAt: now,
      }));

      // Best-effort, batched insert
      await db.insert(frontendTelemetryEvents).values(rows as any);

      return { success: true };
    }),
});
