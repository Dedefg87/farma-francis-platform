import { z } from "zod";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { getDb } from "./db";
import { users, queues } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// ============================================================================
// ROUTERS
// ============================================================================

// 1. systemRouter - Health check
export const systemRouter = router({
  health: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { status: "error", error: "Database not available" };
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: "error", error: String(error) };
    }
  }),
});

// 2. authRouter - Authentication
export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Auth:Login] 🚀 Iniciando login para:", input.email);
        
        const db = await getDb();
        console.log("[Auth:Login] 📦 Database:", db ? "OK" : "FAIL");
        
        if (!db) {
          console.error("[Auth:Login] ❌ Database not available");
          throw new Error("Database not available");
        }

        console.log("[Auth:Login] 🔍 Buscando usuário:", input.email.toLowerCase());

        // Busca usuário (case-insensitive)
        const users_result = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email.toLowerCase()))
          .limit(1);

        console.log("[Auth:Login] 📊 Resultado da query:", users_result.length, "usuário(s) encontrado(s)");

        const user = users_result[0];
        
        // Não revelar se o email existe
        if (!user) {
          console.log("[Auth:Login] ❌ Usuário não encontrado:", input.email);
          await new Promise(resolve => setTimeout(resolve, 500));
          throw new Error("Email ou senha inválidos");
        }

        console.log("[Auth:Login] ✅ Usuário encontrado:", user.email);
        console.log("[Auth:Login] 🔐 passwordHash existe?", !!user.passwordHash);

        if (!user.passwordHash) {
          console.log("[Auth:Login] ❌ passwordHash vazio para:", user.email);
          throw new Error("Email ou senha inválidos");
        }

        console.log("[Auth:Login] 🔑 Comparando senhas...");
        const validPassword = await bcrypt.compare(input.password, user.passwordHash);
        console.log("[Auth:Login] ✅ Senha válida?", validPassword);
        
        if (!validPassword) {
          console.log("[Auth:Login] ❌ Senha inválida para:", input.email);
          await new Promise(resolve => setTimeout(resolve, 500));
          throw new Error("Email ou senha inválidos");
        }

        // Verificar se usuário está ativo
        console.log("[Auth:Login] 🧐 Status do usuário:", user.status);
        if (user.status === "inactive" || user.deletedAt) {
          console.log("[Auth:Login] ❌ Usuário inativo:", input.email);
          throw new Error("Usuário inativo");
        }

        console.log("[Auth:Login] ✅ Gerando JWT...");
        const secret = process.env.JWT_SECRET;
        console.log("[Auth:Login] 🔐 JWT_SECRET configurado?", !!secret);
        
        if (!secret) {
          console.error("[Auth:Login] ❌ JWT_SECRET not configured");
          throw new Error("Server configuration error");
        }

        const token = jwt.sign(
          { 
            sub: user.id, 
            email: user.email,
            role: user.role || "user" 
          },
          secret,
          { expiresIn: "7d" }
        );

        console.log("[Auth:Login] ✅ Token gerado com sucesso para user ID:", user.id);

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      } catch (error) {
        console.error("[Auth:Login] ❌ Erro completo:", error);
        throw error;
      }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    console.log("[Auth:Logout] Logout para user:", ctx.user?.id || "anonymous");
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("[Auth:Me] Buscando dados do usuário:", ctx.user?.id);
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const users_result = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user!.id))
        .limit(1);

      const user = users_result[0];
      
      if (!user) {
        console.log("[Auth:Me] ❌ Usuário não encontrado:", ctx.user!.id);
        throw new Error("Usuário não encontrado");
      }

      console.log("[Auth:Me] ✅ Usuário encontrado:", user.email);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      console.error("[Auth:Me] ❌ Erro:", error);
      throw error;
    }
  }),
});

// 3. queuesRouter - Queue management
export const queuesRouter = router({
  list: protectedProcedure.query(async () => {
    try {
      console.log("[Queues:List] Listando filas");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(queues);
    } catch (error) {
      console.error("[Queues:List] Erro:", error);
      throw error;
    }
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        console.log("[Queues:Get] Buscando fila:", input.id);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .select()
          .from(queues)
          .where(eq(queues.id, input.id))
          .limit(1);

        if (!result || result.length === 0) {
          throw new Error("Fila não encontrada");
        }

        return result[0];
      } catch (error) {
        console.error("[Queues:Get] Erro:", error);
        throw error;
      }
    }),
});

// ============================================================================
// IMPORT ALL OTHER ROUTERS
// ============================================================================

import { conversationsRouter } from "./routers-conversations";
import { agentsRouter } from "./routers-agents";
import { automationRouter } from "./routers-automation";
import { inboxRouter } from "./routers-inbox";
import { messagesRouter } from "./routers-messages";
import { tagsRouter } from "./routers-tags";
import { surveyRouter } from "./routers-survey";
import { crmRouter } from "./routers-crm";

// ============================================================================
// APP ROUTER
// ============================================================================

export const appRouter = router({
  // Core
  system: systemRouter,
  auth: authRouter,
  queues: queuesRouter,

  // Business logic
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
