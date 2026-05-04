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
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { username, password } = input;
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
        const rows = (rawResult as any).rows ?? (rawResult as any)[0] ?? rawResult;
        const usersList = Array.isArray(rows) ? rows : [rows];

        if (usersList.length === 0) {
          throw new Error("Username ou senha inválidos");
        }

        const user = usersList[0];

        // Fallback: raw mode pode retornar camelCase ou snake_case dependendo do driver
        const passwordHash = (user as any).passwordHash ?? (user as any).password_hash;
        if (!passwordHash) {
          console.error("[auth] password_hash missing from user row:", user);
          throw new Error("Username ou senha inválidos");
        }

        // Validar senha
        const valid = await bcrypt.compare(password, passwordHash);
        if (!valid) {
          throw new Error("Username ou senha inválidos");
        }

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

        const token = jwt.sign(userForToken, JWT_SECRET, { expiresIn: "7d" });

        return {
          success: true,
          user: userForToken,
          token,
        };
      } catch (error: unknown) {
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
    };
  }),

  // Logout
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    return {
      success: true,
      message: "Logged out successfully",
    };
  }),
});
