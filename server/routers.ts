import { z } from "zod";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { getDb } from "./db";
import { users, queues } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// 1. systemRouter - Rotas de saúde e status do sistema
export const systemRouter = router({
  health: publicProcedure.query(async () => {
    console.log("[System] Health check requested");
    try {
      const db = await getDb();
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: "error", error: String(error) };
    }
  }),
});

// 2. authRouter - Rotas de autenticação (login, logout, me)
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
        console.log("[Login] ✅ Iniciando login para:", input.email);

        const db = await getDb();

        // Busca o usuário
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user || user.length === 0) {
          console.log("[Login] ❌ Usuário não encontrado:", input.email);
          throw new Error("Credenciais inválidas");
        }

        const userData = user[0];
        console.log("[Login] ✅ Usuário encontrado:", userData.email);
        console.log("[Login] 🔐 Hash armazenado:", userData.passwordHash?.substring(0, 20) + "...");

        // Compara a senha
        if (!userData.passwordHash) {
          console.log("[Login] ❌ Usuário sem senha configurada");
          throw new Error("Credenciais inválidas");
        }

        const valid = await bcrypt.compare(input.password, userData.passwordHash);
        console.log("[Login] 🔑 Senha válida?", valid);

        if (!valid) {
          console.log("[Login] ❌ Senha inválida para:", input.email);
          throw new Error("Credenciais inválidas");
        }

        console.log("[Login] ✅ Senha correta, gerando token...");

        // Gera o token
        const secret = process.env.JWT_SECRET || "secret";
        console.log("[Login] 🔐 JWT_SECRET configurado?", !!process.env.JWT_SECRET);

        const token = jwt.sign(
          { sub: userData.id, role: userData.role || "user" },
          secret,
          { expiresIn: "7d" }
        );

        console.log("[Login] ✅ Token gerado com sucesso");

        return {
          token,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          },
        };
      } catch (error) {
        console.error("[Login] ❌ Erro completo:", error);
        throw error;
      }
    }),

  logout: publicProcedure.mutation(() => {
    console.log("[Logout] Usuário fez logout");
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    console.log("[Me] Buscando dados do usuário:", ctx.user?.id);

    const db = await getDb();

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user!.id))
      .limit(1);

    if (!user || user.length === 0) {
      throw new Error("User not found");
    }

    const userData = user[0];
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    };
  }),
});

// 3. queuesRouter - Rotas para gerenciamento de filas
export const queuesRouter = router({
  list: protectedProcedure.query(async () => {
    console.log("[Queues] Listando todas as filas");
    const db = await getDb();
    return await db.select().from(queues);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      console.log("[Queues] Buscando fila:", input.id);

      const db = await getDb();

      const q = await db
        .select()
        .from(queues)
        .where(eq(queues.id, input.id))
        .limit(1);

      if (!q || q.length === 0) {
        throw new Error("Queue not found");
      }

      return q[0];
    }),
});

// 4. appRouter - Combina todos os routers
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  queues: queuesRouter,
});

export type AppRouter = typeof appRouter;

