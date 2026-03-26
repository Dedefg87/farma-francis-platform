import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure.use((opts) => {
  // optional: add logging, etc.
  return opts.next();
});

export const protectedProcedure = t.procedure.use(({ next, ctx }) => {
  // Simplified auth: accept any request with Authorization header containing a token
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing token" });
  }
  // Attach dummy user
  const user = { id: 1, role: "admin" as const };
  return next({ ctx: { ...ctx, user, db: ctx.db } });
});
