import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { verifyToken } from "./auth";
import type { Context } from "./_core/trpc/context";

export const authRouter = router({
  // Login procedure
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Implement actual login logic with database query
        // For now, return a mock response
        const user = {
          id: "1",
          email: input.email,
          name: "User",
          role: "user",
        };

        // TODO: Generate JWT token
        const token = "mock-token";

        return {
          success: true,
          user,
          token,
        };
      } catch (error) {
        throw new Error("Login failed");
      }
    }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new Error("User not authenticated");
      }

      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
      };
    } catch (error) {
      throw new Error("Failed to get user");
    }
  }),

  // Logout procedure
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // TODO: Implement logout logic (clear sessions, etc)
      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      throw new Error("Logout failed");
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
