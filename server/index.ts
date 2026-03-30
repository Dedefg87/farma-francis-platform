import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { users, agentStatus, broadcastLists } from "../drizzle/schema";
import jwt from "jsonwebtoken";

// Importa o appRouter completo JÁ PRONTO com todas as rotas
import { appRouter } from "./routers";

// Health check router separado
import healthRouter from "./_core/routes/health";

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

async function startServer() {
  console.log("[Server] Starting... (PID:", process.pid, ")");

  const db = await getDb();
  console.log("[DB] Connected (db getDb returned)");

  await applySqlMigrations();
  console.log("[Migrations] Applied");

  const app = express();

  // Note: Removing global express.json() because tRPC handles its own body parsing
  app.use(express.static(path.join(__dirname, "../dist/public")));

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Detailed health check
  app.use("/api/health/detail", healthRouter);

  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
  });

  // tRPC mount with logging
  app.use("/api/trpc", (req, res, next) => {
    console.log(`[tRPC] ${req.method} ${req.url}`);
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req }) => {
        console.log("[createContext] Building context for", req.path);
        
        const auth = req.headers.authorization;
        if (!auth) {
          return { db, user: null };
        }

        const token = auth.replace("Bearer ", "").trim();
        
        try {
          const payload = jwt.verify(
            token,
            process.env.JWT_SECRET || "secret"
          ) as any;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.sub))
            .limit(1);

          if (!user) {
            return { db, user: null };
          }

          return { db, user };
        } catch (err) {
          console.error("[Auth] Invalid token:", err);
          return { db, user: null };
        }
      },
    })
  );

  // ⭐ NOVO: Fallback para SPA - redireciona rotas desconhecidas para index.html
  app.get("*", (req, res) => {
    // Se não for uma rota de API ou tRPC, serve o index.html
    if (!req.path.startsWith("/api") && !req.path.startsWith("/trpc")) {
      res.sendFile(path.join(__dirname, "../dist/public/index.html"));
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
