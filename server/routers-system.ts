import { publicProcedure, router } from "./_core/trpc";

export const systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  // Add other system procedures as needed
});
