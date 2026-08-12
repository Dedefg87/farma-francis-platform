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
    .mutation(async (): Promise<{ closed: number }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.execute(
        sql`UPDATE conversations SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE status IN ('open', 'assigned')`
      );
      
      return { closed: result.affectedRows || 0 };
    }),
  
  // ✅ Endpoint temporário para aplicar migration
  migrate: publicProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // ✅ Aplicar: adicionar reply_to_external_id + reaction
      await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_to_external_id VARCHAR(255) NULL`);
      await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reaction VARCHAR(10) NULL`);
      
      return { success: true, message: "Migration applied: reply + reaction columns added" };
    }),
});