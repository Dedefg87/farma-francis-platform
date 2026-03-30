import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// 🔐 Middleware de autenticação
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// 🔒 Procedimentos protegidos
export const protectedProcedure = t.procedure.use(isAuthed);
// 🔒 Middleware para admin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores",
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// 🔐 Procedimento exclusivo para admin
export const adminProcedure = t.procedure.use(isAdmin);
