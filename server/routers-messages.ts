import { z } from "zod";
import { eq } from "drizzle-orm";
import { conversationMessages, conversations } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";

export const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ conversation_id: z.number() }))
    .query(async ({ input }) => {
      return await conversationMessages
        .select()
        .where(eq(conversationMessages.conversationId, input.conversation_id))
        .orderBy(conversationMessages.createdAt);
    }),

  send: protectedProcedure
    .input(
      z.object({
        conversation_id: z.number(),
        content: z.string(),
        file_url: z.string().optional(),
        file_name: z.string().optional(),
        file_type: z.string().optional(),
        file_size: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [msg] = await conversationMessages
        .insert({
          conversationId: input.conversation_id,
          content: input.content,
          fileUrl: input.file_url ?? null,
          fileName: input.file_name ?? null,
          fileType: input.file_type ?? null,
          fileSize: input.file_size ?? null,
          senderId: 1, // TODO: use ctx.user.id
          senderType: "agent",
        })
        .returning();
      await conversations.update()
        .where(eq(conversations.id, input.conversation_id))
        .set({ lastMessageAt: new Date() });
      return msg;
    }),
});
