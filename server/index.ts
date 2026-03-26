import express from "express";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { schema } from "./drizzle/schema";
import { applySqlMigrations } from "./_core/migrations";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  try {
    console.log("[Startup] Applying migrations...");
    await applySqlMigrations();
    console.log("[Startup] Migrations applied");

    console.log("[Startup] Connecting to MySQL...");
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
    });
    const db = drizzle({ client: connection as any, schema });
    console.log("[Startup] Database connected");

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, "dist/public")));

    // tRPC
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

    // Health
    app.get("/api/health", (_, res) =>
      res.json({ status: "ok", timestamp: new Date().toISOString() })
    );

    // SPA fallback
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "Not found" });
      }
      res.sendFile(path.join(__dirname, "dist/public/index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Startup] Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Startup] Fatal error:", err);
    process.exit(1);
  }
}

start();
