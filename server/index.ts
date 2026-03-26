import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./_core/db";
import { applySqlMigrations } from "./_core/migrations";
import { appRouter } from "./routers";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

async function startServer() {
  console.log("[Server] Starting...");

  // DB initialization
  const db = await getDb();
  console.log("[DB] Connected");

  // Apply migrations
  await applySqlMigrations();
  console.log("[Migrations] Applied");

  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../dist/public")));

  // Health endpoint
  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  console.log("[tRPC] About to mount. appRouter type:", typeof appRouter, "keys:", appRouter?.router ? Object.keys(appRouter.router) : "none");
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => ({
        db,
        user: req.headers.authorization ? { id: 1, role: "admin" as const } : undefined,
      }),
    })
  );
  console.log("[tRPC] Mounted on /api/trpc");

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
