import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
  }
  return next({ ctx });
});
export const adminProcedure = t.procedure.use(({ next, ctx }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({ ctx });
});
export const router = t.router;
