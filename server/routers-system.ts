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
      // ✅ Verificar quais colunas já existem antes de tentar adicionar
      const [cols] = await db.execute(sql`SHOW COLUMNS FROM conversation_messages`);
      const existingCols = cols.map((c: any) => c.Field || c.field || Object.values(c)[0]).map((s: string) => s.toLowerCase());
      console.log("[migrate] Existing columns:", existingCols);
      
      if (!existingCols.includes("reply_to_external_id")) {
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN reply_to_external_id VARCHAR(255) NULL`);
        console.log("✅ reply_to_external_id added");
      } else {
        console.log("ℹ️ reply_to_external_id já existe");
      }
      
      if (!existingCols.includes("reaction")) {
        await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN reaction VARCHAR(10) NULL`);
        console.log("✅ reaction added");
      } else {
        console.log("ℹ️ reaction já existe");
      }
      
      return { success: true, message: "Migration applied: reply + reaction columns" };
    }),
});