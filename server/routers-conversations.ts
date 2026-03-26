import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { conversations, conversationMessages } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";

export const conversationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Lista conversas atribuídas ao agente
    return await conversations
      .select()
      .where(eq(conversations.assignedTo, ctx.user.id))
      .orderBy(desc(conversations.lastMessageAt));
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [conv] = await conversations.select().where(eq(conversations.id, input.id)).limit(1);
      return conv;
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
