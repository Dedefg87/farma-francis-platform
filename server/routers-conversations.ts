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
});
