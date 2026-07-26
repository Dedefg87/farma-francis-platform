import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";
import bcrypt from "bcrypt";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const authRouter = router({
  // Teste de autenticação (debug)
  testAuth: protectedProcedure
    .query(({ ctx }) => {
      console.log('[testAuth] ctx.user:', ctx.user);
      return {
        autenticado: !!ctx.user,
        user: ctx.user,
      };
    }),

  // Login procedure
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username é obrigatório"),
        password: z.string().min(1, "Senha é obrigatória"),
        cfTurnstileToken: z.string().optional(), // Token do Cloudflare Turnstile
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[LOGIN] INPUT RECEIVED:", input);
      console.log("[LOGIN] CTX USER:", ctx.user);

      try {
        const { username, password, cfTurnstileToken } = input;

        // Validar token do Turnstile em produção
        if (process.env.NODE_ENV === 'production' && process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
          if (!cfTurnstileToken) {
            throw new Error("Token de segurança necessário");
          }

          // Verificar token com a API do Cloudflare
          const formData = new URLSearchParams();
          formData.append('secret', process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
          formData.append('response', cfTurnstileToken);

          const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            console.log("[LOGIN] Turnstile validation failed:", result);
            throw new Error("Falha na validação de segurança. Por favor, tente novamente.");
          }
        }

        console.log("[LOGIN] Turnstile validation successful");

        const db = await getDb();

        if (!db) throw new Error("Database unavailable");

        // Login: campo 'name' é o username (login), 'display_name' é o nome de exibição
        // NOTA: O banco Railway usa camelCase nas colunas
        const rawResult = await db.execute(
          sql`SELECT id, openId, name, email, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn, display_name
                FROM users
                WHERE name = ${username}
                LIMIT 1`
        );
        console.log("[LOGIN] DB Result raw:", JSON.stringify(rawResult).substring(0, 200));

        const rows = (rawResult as any).rows ?? (rawResult as any)[0] ?? rawResult;
        const usersList = Array.isArray(rows) ? rows : [rows];

        if (usersList.length === 0) {
          console.log("[LOGIN] User not found:", username);
          throw new Error("Username ou senha inválidos");
        }

        const user = usersList[0];
        console.log("[LOGIN] User found:", user?.name, "| Role:", user?.role);

        // Fallback: raw mode pode retornar camelCase ou snake_case dependendo do driver
        const passwordHash = (user as any).passwordHash ?? (user as any).password_hash;
        if (!passwordHash) {
          console.error("[LOGIN] password_hash missing from user row:", user);
          throw new Error("Username ou senha inválidos");
        }

        // Validar senha
        console.log("[LOGIN] Comparing password...");
        const valid = await bcrypt.compare(password, passwordHash);
        if (!valid) {
          console.log("[LOGIN] Password invalid for:", username);
          throw new Error("Username ou senha inválidos");
        }

        console.log("[LOGIN] Password valid! Updating lastSignedIn...");
        // Atualizar lastSignedIn
        await db
          .update(usersTable)
          .set({ lastSignedIn: new Date() })
          .where(eq(usersTable.id, user.id));

        // Retornar dados para token (excluir campos sensíveis)
        // Nota: raw mode retorna snake_case (ex: password_hash), então usamos fallback
        const safeUser: unknown = user;
        const userForToken = {
          id: safeUser.id,
          name: safeUser.display_name ?? safeUser.name,  // display_name é o nome real (atendimento)
          username: safeUser.name,                        // name é o login
          email: safeUser.email,
          role: safeUser.role,
        };

        console.log("[LOGIN] Signing JWT with JWT_SECRET exists:", !!JWT_SECRET);
        const token = jwt.sign(userForToken, JWT_SECRET, { expiresIn: "7d" });

        console.log("[LOGIN] Returning success for:", username);
        return {
          success: true,
          user: userForToken,
          token,
        };
      } catch (error: unknown) {
        console.log("[LOGIN] ERROR:", error.message);
        throw new Error(error.message || "Falha no login");
      }
    }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Usuário não autenticado");
    }

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      username: ctx.user.username,
      role: ctx.user.role,
      photo: ctx.user.photo, // Add photo field to user profile
    };
  }),

  // Logout (opcional, frontend limpa localStorage)
  logout: protectedProcedure.mutation(({ ctx }) => {
    console.log("[LOGOUT] User logging out:", ctx.user?.username);
    return { success: true };
  }),
});
