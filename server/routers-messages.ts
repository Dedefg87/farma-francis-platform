import { z } from "zod";
import { eq } from "drizzle-orm";
import { conversationMessages } from "../drizzle/schema";
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
});
