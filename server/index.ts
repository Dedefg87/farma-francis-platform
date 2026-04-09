import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { fileURLToPath } from "url";
import { appRouter } from "./routers/index";
import { createContext } from "./_core/trpc/context";
import healthRouter from "./_core/routes/health";
import createSSERouter from "./routers-sse";
import webhooksRouter from "./webhooks";
import cookieParser from "cookie-parser";

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

async function startServer() {
  console.log("[Server] Starting... (PID:", process.pid, ")");
  
  const db = await getDb();
  console.log("[DB] Connected");

  await applySqlMigrations();
  console.log("[Migrations] Applied");

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
  app.listen(PORT, "0.0.0.0", () => {
    console.log("[Server] Listening on port", PORT);
    console.log("[Server] Environment:", process.env.NODE_ENV || "development");
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
