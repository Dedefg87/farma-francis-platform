import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
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
