import { z } from "zod";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { getDb } from "./db";
import { users, queues } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// 1. systemRouter
export const systemRouter = router({
  health: publicProcedure.query(async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});

// 2. authRouter
export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Auth:Login] ✅ Tentando login para:", input.email);
        
        const db = await getDb();
        if (!db) throw new Error("Database error");

        const result = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
        const user = result[0];
        
        if (!user || !user.passwordHash) {
          console.log("[Auth:Login] ❌ Usuário não encontrado");
          throw new Error("Credenciais inválidas");
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          console.log("[Auth:Login] ❌ Senha inválida");
          throw new Error("Credenciais inválidas");
        }

        const secret = process.env.JWT_SECRET || "secret";
        const token = jwt.sign({ sub: user.id, email: user.email, role: user.role || "user" }, secret, { expiresIn: "7d" });

        console.log("[Auth:Login] ✅ Login bem-sucedido, token gerado");

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      } catch (error: any) {
        console.error("[Auth:Login] ❌ Erro:", error.message);
        throw new Error(error.message || "Login failed");
      }
    }),

  logout: publicProcedure.mutation(() => ({ success: true })),

  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    const db = await getDb();
    if (!db) throw new Error("Database error");
    
    const result = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const user = result[0];
    
    if (!user) throw new Error("User not found");
    
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }),
});

// 3. queuesRouter
export const queuesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database error");
    return await db.select().from(queues);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database error");
      const result = await db.select().from(queues).where(eq(queues.id, input.id)).limit(1);
      if (!result[0]) throw new Error("Queue not found");
      return result[0];
    }),
});

// IMPORT OTHER ROUTERS
import { conversationsRouter } from "./routers-conversations";
import { agentsRouter } from "./routers-agents";
import { automationRouter } from "./routers-automation";
import { inboxRouter } from "./routers-inbox";
import { messagesRouter } from "./routers-messages";
import { tagsRouter } from "./routers-tags";
import { surveyRouter } from "./routers-survey";
import { crmRouter } from "./routers-crm";

// APP ROUTER
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  queues: queuesRouter,
  conversations: conversationsRouter,
  agents: agentsRouter,
  automation: automationRouter,
  inbox: inboxRouter,
  messages: messagesRouter,
  tags: tagsRouter,
  survey: surveyRouter,
  crm: crmRouter,
});

export type AppRouter = typeof appRouter;
