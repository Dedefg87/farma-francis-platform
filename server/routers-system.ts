import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  debugTime: publicProcedure.query(() => {
    const now = new Date();
    return {
      nowISO: now.toISOString(),
      nowUTC: now.getTime(),
      timezoneOffset: now.getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }),
  closeAll: publicProcedure
    .input(z.object({ reason: z.string() }))
    .mutation(async (opts): Promise<{ closed: number }> => {
      const { reason } = opts.input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.execute(
        sql`UPDATE conversations SET status = 'closed', closed_at = CURRENT_TIMESTAMP, close_reason = ${reason} WHERE status IN ('open', 'assigned')`
      );
      
      return { closed: result.affectedRows || 0 };
    }),
});