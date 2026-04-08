import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";
import bcrypt from "bcrypt";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const authRouter = router({
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

        // Buscar usuário pelo username (campo 'name' na tabela users) — raw SQL para evitar bind em LIMIT
        const rawResult = await db.execute(
          sql`SELECT id, open_id, name, email, password_hash, login_method, role, created_at, updated_at, last_signed_in, display_name 
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

        // ❌ BUG: raw mode retorna snake_case (password_hash), não passwordHash
        // Corrigido: fallback para ambos os formatos
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
        const safeUser: any = user;
        const userForToken = {
          id: safeUser.id,
          name: safeUser.name,
          username: safeUser.name,
          displayName: safeUser.displayName ?? safeUser.display_name ?? safeUser.name,
          email: safeUser.email,
          role: safeUser.role,
        };

        const token = jwt.sign(userForToken, JWT_SECRET, { expiresIn: "7d" });

        return {
          success: true,
          user: userForToken,
          token,
        };
      } catch (error: any) {
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
