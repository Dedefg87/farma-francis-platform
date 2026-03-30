import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./_core/env";

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

        // TODO: Buscar no banco de dados e validar senha
        // Hardcoded para teste: admin/admin
        if (username === "admin" && password === "admin") {
          const user = {
            id: "1",
            name: "Admin",
            username: "admin",
            role: "admin",
          };

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
