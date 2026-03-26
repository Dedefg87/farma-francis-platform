import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, queues, agentStatus, broadcastLists } from "../drizzle/schema";
import jwt from "jsonwebtoken";
import { conversationsRouter } from "./routers-conversations";
import { messagesRouter } from "./routers-messages";

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

async function startServer() {
  console.log("[Server] Starting...");

  const db = await getDb();
  console.log("[DB] Connected");

  await applySqlMigrations();
  console.log("[Migrations] Applied");

  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../dist/public")));

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
  });

  // Minimal tRPC router
  const { router, publicProcedure, protectedProcedure } = await import("./_core/trpc");

  const systemRouter = router({
    health: publicProcedure.query(() => ({ status: "ok", timestamp: new Date().toISOString() })),
  });

  const authRouter = router({
    login: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const [user] = await users.select().where(eq(users.email, input.email)).limit(1);
        if (!user || input.password !== "123456") throw new Error("Invalid credentials");
        const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
      }),
  });

  const queuesRouter = router({
    list: protectedProcedure.query(() => queues.select().orderBy("priority")),
  });

  const agentRouter = router({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      const [record] = await db.select().from(agentStatus).where(eq(agentStatus.userId, ctx.user.id));
      return record || null;
    }),
    setOnline: protectedProcedure.mutation(async ({ ctx }) => {
      await db.insert(agentStatus).values({
        userId: ctx.user.id,
        status: "online",
        lastSeen: new Date(),
      }).onDuplicateKeyUpdate({ status: "online", lastSeen: new Date() });
      return { success: true };
    }),
    setOffline: protectedProcedure.mutation(async ({ ctx }) => {
      await db.update(agentStatus).set({ status: "offline", lastSeen: new Date() }).where(eq(agentStatus.userId, ctx.user.id));
      return { success: true };
    }),
  });

  const broadcastRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await broadcastLists.select().where(eq(broadcastLists.userId, ctx.user.id)).orderBy("createdAt");
    }),
  });

  const appRouter = router({
    system: systemRouter,
    auth: authRouter,
    queues: queuesRouter,
    conversations: conversationsRouter,
    messages: messagesRouter,
    agent: agentRouter,
    broadcast: broadcastRouter,
  });

  // tRPC mount with logging
  app.use("/api/trpc", (req, res, next) => {
    console.log(`[tRPC] ${req.method} ${req.url}`);
    next();
  });

  // Error handler to log errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[tRPC Error]", err?.message, err?.stack || "");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", details: err?.message });
    }
  });

  try {
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext: async ({ req }) => {
          // Log context creation
          console.log("[createContext] Building context for", req.path);
          return {
            db,
            user: req.headers.authorization ? { id: 1, role: "admin" as const } : undefined,
          };
        },
      })
    );
  } catch (err: any) {
    console.error("[tRPC Setup] Failed to mount middleware:", err);
    throw err;
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
