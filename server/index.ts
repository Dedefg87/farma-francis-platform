import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { eq, and, sql } from "drizzle-orm";
import { conversations, conversationMessages } from "../drizzle/schema";
// __dirname is natively available in CJS (esbuild --format=cjs)
import { appRouter } from "./routers/index";
import { createContext } from "./_core/trpc/context";
import healthRouter from "./_core/routes/health";
import createSSERouter from "./routers-sse";
import webhooksRouter from "./webhooks";
import cookieParser from "cookie-parser";

// In CJS (esbuild --format=cjs), __dirname is provided by the Node.js module wrapper
// No need to define it via import.meta.url

async function startServer() {
  console.log("[Server] Starting... (PID:", process.pid, ")");

  try {
    console.log("[DB] Connecting...");
    const db = await getDb();
    console.log("[DB] Connected successfully");

    console.log("[Migrations] Applying...");
    await applySqlMigrations();
    console.log("[Migrations] Applied successfully");

    // Ensure critical tables exist (safety net)
    try {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`CREATE TABLE IF NOT EXISTS internal_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        content TEXT NOT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON internal_messages(conversation_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient ON internal_messages(recipient_id, read_at)`);
      console.log("[DB] ✅ internal_messages table ensured");
    } catch (tableErr: any) {
      console.warn("[DB] ⚠️ Could not create internal_messages:", tableErr.message);
    }

    // Safety net: ensure customers.source column exists
    try {
      const [colRows] = await db.execute(sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'source'`);
      if (!Array.isArray(colRows) || colRows.length === 0) {
        await db.execute(sql`ALTER TABLE customers ADD COLUMN source VARCHAR(64) DEFAULT 'manual' AFTER status`);
        console.log("[DB] ✅ customers.source column added");
      }
    } catch (colErr: any) {
      console.warn("[DB] ⚠️ Could not add customers.source:", colErr.message);
    }
  } catch (error) {
    console.error("[Startup Error]", error);
    throw error;
  }

  const app = express();
  // Aumentar limite do body-parser para 50MB (padrão é 100kb)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  const publicPath = path.join(__dirname, "../dist/public");
  app.use(express.static(publicPath));
  console.log("[Static] Serving from:", publicPath);

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/health/detail", healthRouter);

  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
  });

  app.use("/api/trpc", (req, res, next) => {
    console.log("[tRPC]", req.method, req.url);
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // SSE endpoint para notificações em tempo real
  app.use("/api/events", createSSERouter());

  // Webhooks para WhatsApp, Instagram e Evolution API
  app.use("/api/webhooks", webhooksRouter);

  // Debug: List all database tables
  app.get("/api/debug/db-tables", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const [result] = await db.execute(sql`SHOW TABLES`);
      const tables = (result as any[]).map((row: any) => Object.values(row)[0]);
      res.json({ tables: tables.sort(), count: tables.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Debug: Show columns for a table
  app.get("/api/debug/db-columns/:table", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const tableName = req.params.table.replace(/[^a-z_]/gi, "");
      const [result] = await db.execute(sql.raw(`DESCRIBE ${tableName}`));
      res.json({ table: tableName, columns: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/mark-read", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
      const conversationId = parseInt(req.params.id, 10);
      if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid ID" }); return; }
      await db
        .update(conversationMessages)
        .set({ readAt: new Date() })
        .where(and(
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.senderType, "customer"),
          sql`${conversationMessages.readAt} IS NULL`
        ));
      await db
        .update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, conversationId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("[mark-read] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      const indexPath = path.join(__dirname, "../dist/public/index.html");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("[SPA Fallback] File not found:", indexPath);
          res.status(404).json({ error: "Frontend not found" });
        }
      });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  const PORT = process.env.PORT || 3000;
  console.log(`[Server] Attempting to listen on port ${PORT}...`);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("[Server] ✅ Successfully listening on port", PORT);
    console.log("[Server] Environment:", process.env.NODE_ENV || "development");
    console.log("[Server] Health check endpoint: /api/health");
  });

  server.on('error', (error) => {
    console.error("[Server] ❌ Failed to start server:", error);
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
