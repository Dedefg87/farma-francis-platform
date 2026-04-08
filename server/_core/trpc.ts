import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;

// 📝 Middleware para logging de inputs (debug)
const inputLogger = t.middleware(async ({ next, input, ctx }) => {
  console.log(`[TRPC INPUT] ${ctx.path}:`, {
    input,
    hasInput: input !== undefined,
    type: typeof input,
    jsonInput: JSON.stringify(input)?.substring(0, 500),
  });
  return next({ input, ctx });
});

// 🔐 Middleware de autenticação
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }
  return next({ ctx: { user: ctx.user } });
});

// 🔒 Middleware para admin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores",
    });
  }
  return next({ ctx });
});

// Procedures com logging
export const publicProcedure = t.procedure.use(inputLogger);
export const protectedProcedure = t.procedure.use(isAuthed).use(inputLogger);
export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin).use(inputLogger);
