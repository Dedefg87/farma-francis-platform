import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";
import bcrypt from "bcrypt";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";

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

        // Buscar usuário pelo username (campo 'name' na tabela users)
        const users = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.name, username))
          .limit(1);

        if (users.length === 0) {
          throw new Error("Username ou senha inválidos");
        }

        const user = users[0];

        // Validar senha
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new Error("Username ou senha inválidos");
        }

        // Atualizar lastSignedIn
        await db
          .update(usersTable)
          .set({ lastSignedIn: new Date() })
          .where(eq(usersTable.id, user.id));

        // Retornar dados para token (excluir campos sensíveis)
        const userForToken = {
          id: user.id,
          name: user.name,
          username: user.name,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
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
