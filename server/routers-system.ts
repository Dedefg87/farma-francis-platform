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
      // MySQL não suporta IF NOT EXISTS em ALTER TABLE, então usamos try/catch
      try {
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN reply_to_external_id VARCHAR(255) NULL`);
        console.log("✅ reply_to_external_id added");
      } catch (e: any) {
        if (!e.message?.includes("Duplicate column") && !e.message?.includes("exists")) {
          throw e; // Re-throw unexpected errors
        }
        console.log("ℹ️ reply_to_external_id já existe");
      }
      
      try {
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN reaction VARCHAR(10) NULL`);
        console.log("✅ reaction added");
      } catch (e: any) {
        if (!e.message?.includes("Duplicate column") && !e.message?.includes("exists")) {
          throw e;
        }
        console.log("ℹ️ reaction já existe");
      }
      
      return { success: true, message: "Migration applied: reply + reaction columns" };
    }),
});