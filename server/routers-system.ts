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

      // ✅ Verificar quais colunas já existem
      const [cols] = await db.execute(sql`SHOW COLUMNS FROM conversation_messages`);
      const existingCols = cols.map((c: any) => (c.Field || c.field || Object.values(c)[0]).toLowerCase());
      console.log("[migrate] Existing columns:", existingCols);
      
      const columnsToAdd = [
        { name: "reply_to_external_id", def: "VARCHAR(255) NULL" },
        { name: "reaction", def: "VARCHAR(10) NULL" },
        { name: "sender_name", def: "VARCHAR(255) NULL" },
        { name: "sender_position", def: "VARCHAR(255) NULL" },
      ];

      for (const { name, def } of columnsToAdd) {
        if (!existingCols.includes(name)) {
          await db.execute(sql`ALTER TABLE conversation_messages ADD COLUMN ${sql.raw(`${name} ${def}`)}`);
          console.log(`✅ ${name} added`);
        } else {
          console.log(`ℹ️ ${name} já existe`);
        }
      }
      
      return { 
        success: true, 
        message: "Migration applied: reply + reaction + sender columns",
        cols: existingCols
      };
    }),
  
  // ✅ Endpoint: verificar schema real do MySQL
  dbSchema: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [cols] = await db.execute(sql`SHOW COLUMNS FROM conversation_messages`);
      return cols.map((c: any) => ({
        Field: c.Field || c.field,
        Type: c.Type || c.type
      }));
    }),
});