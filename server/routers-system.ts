import { router, publicProcedure } from "./trpc";
import { getDb } from "./db";

export const systemRouter = router({
// ✅ Endpoint: forçar teste de conexão DB
debugDb: publicProcedure
  .query(async () => {
    const dbUrl = process.env.DATABASE_URL || "";
    console.log("[debugDb] DATABASE_URL:", dbUrl.substring(0, 50) + "...");
    console.log("[debugDb] DATABASE_URL length:", dbUrl.length);
    
    const db = await getDb();
    return {
      hasDb: !!db,
      hasDatabaseUrl: !!dbUrl,
      urlLength: dbUrl.length,
      urlPreview: dbUrl.substring(0, 60) + "..."
    };
  }),

  // ✅ Endpoint: aplicar migration via raw SQL (não depende de schema)
  migrate: publicProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) {
        // Try to log the issue
        const dbUrl = process.env.DATABASE_URL || "";
        console.error("[migrate] getDb() returned null. DATABASE_URL:", dbUrl.substring(0, 50));
        throw new Error("Database not available. DATABASE_URL=" + (dbUrl ? "[SET]" : "[EMPTY]"));
      }
      
      // Use raw SQL for safety
      const queries = [
        "ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_to_external_id VARCHAR(255) NULL",
        "ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_to_message_id VARCHAR(255) NULL",
        "ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reaction VARCHAR(10) NULL",
        "ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) NULL",
        "ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_position VARCHAR(255) NULL",
      ];
      
      for (const q of queries) {
        try {
          await db.execute(q);
          console.log("[migrate] ✅", q);
        } catch (e: any) {
          if (e.message?.includes("Duplicate") || e.message?.includes("exists")) {
            console.log("[migrate] ℹ️ Coluna já existe");
          } else {
            console.error("[migrate] ❌ Erro:", e.message);
          }
        }
      }
      
      return { success: true, message: "Migration completed" };
    }),
});
