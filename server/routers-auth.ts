import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { verifyToken } from "./auth";
import * as db from "./db";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";

export const authRouter = router({
  // Login procedure - aceita username ou email
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

        // TODO: Implementar lógica real de busca no banco de dados
        // Por enquanto, aceitar admin/admin como padrão
        if (username === "admin" && password === "admin") {
          const user = {
            id: "1",
            name: "Admin",
            username: "admin",
            role: "admin",
          };

          // Gerar JWT token
          const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

          return {
            success: true,
            user,
            token,
          };
        }

        throw new Error("Username ou senha inválidos");
      } catch (error: any) {
        throw new Error(error.message || "Falha no login");
      }
    }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new Error("Usuário não autenticado");
      }

      return {
        id: ctx.user.id,
        name: ctx.user.name,
        username: ctx.user.username,
        role: ctx.user.role,
      };
    } catch (error) {
      throw new Error("Falha ao obter usuário");
    }
  }),

  // Logout procedure
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      throw new Error("Falha no logout");
    }
  }),

  // Verify token
  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await verifyToken(input.token);
        if (!user) {
          return { valid: false };
        }
        return {
          valid: true,
          user,
        };
      } catch (error) {
        return { valid: false };
      }
    }),
});
