import { publicProcedure, router } from "../_core/trpc.ts";

export const systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  // Add other system procedures as needed
});
