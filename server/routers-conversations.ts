import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { conversations } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";

export const conversationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await conversations
      .select()
      .where(eq(conversations.assignedTo, ctx.user.id))
      .orderBy(desc(conversations.lastMessageAt));
  }),
  assign: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await conversations.update()
        .where(eq(conversations.id, input.conversationId))
        .set({ assignedTo: ctx.user.id, status: "open" });
      return { success: true };
    }),
  close: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        reason: z.enum(["venda", "orcamento", "conversa_anterior", "engano"]),
      })
    )
    .mutation(async ({ input }) => {
      await conversations.update()
        .where(eq(conversations.id, input.conversationId))
        .set({ status: "closed" });
      return { success: true };
    }),
});
