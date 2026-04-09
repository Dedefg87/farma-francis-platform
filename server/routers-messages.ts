import { z } from "zod";
import { eq } from "drizzle-orm";
import { conversationMessages, conversations } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sseManager, EVENTS } from "./_core/sse";

export const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ conversation_id: z.number() }))
    .query(async ({ input }) => {
      console.log(`[messages.list] 🔍 Fetching messages for conversation_id: ${input.conversation_id}`);

      const messages = await conversationMessages
        .select()
        .where(eq(conversationMessages.conversationId, input.conversation_id))
        .orderBy(conversationMessages.createdAt);

      console.log(`[messages.list] 📊 Found ${messages.length} messages for conversation ${input.conversation_id}`);
      if (messages.length > 0) {
        console.log(`[messages.list] 🕐 Latest message: ${messages[messages.length - 1].content?.substring(0, 50)}...`);
        console.log(`[messages.list] 🆔 Latest message ID: ${messages[messages.length - 1].id}`);
      }

      return messages;
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
        // Frontend sends camelCase - accept both
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        viewOnce: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Normalize camelCase/snake_case from frontend
      const fileUrl = input.fileUrl ?? input.file_url ?? null;
      const fileName = input.fileName ?? input.file_name ?? null;
      const fileType = input.fileType ?? input.file_type ?? null;
      const fileSize = input.fileSize ?? input.file_size ?? null;

      // Get conversation details to find the customer phone
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversation_id))
        .limit(1);

      if (!conv) throw new Error("Conversation not found");

      // Send via Evolution API if WhatsApp
      let externalId: string | null = null;
      if (conv.channel === "whatsapp" && conv.customerPhone) {
        try {
          const { sendWhatsAppMessage } = await import("./messaging");
          const result = await sendWhatsAppMessage({
            to: conv.customerPhone,
            message: input.content,
            mediaUrl: fileUrl || undefined,
            caption: fileName || undefined,
          });
          externalId = result?.messageId || null;
          console.log("[messages.send] ✅ Sent via Evolution API, externalId:", externalId);
        } catch (err: any) {
          console.error("[messages.send] ❌ Failed to send via Evolution API:", err.message);
          // Continue to save message locally even if send fails
        }
      }

      // Save message in DB
      const insertResult = await db.insert(conversationMessages).values({
        conversationId: input.conversation_id,
        content: input.content,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        senderId: (ctx as any)?.user?.id || null,
        senderType: "agent",
        externalId,
      });

      const rawId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
      const messageId = Number(rawId) || null;

      // Update conversation lastMessageAt
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, input.conversation_id));

      // Notify via SSE
      const assignedTo = conv.assignedTo;
      if (assignedTo) {
        sseManager.emitToUser(String(assignedTo), {
          type: EVENTS.MESSAGE_NEW,
          data: {
            conversationId: input.conversation_id,
            message: {
              id: messageId,
              content: input.content,
              senderType: "agent",
              fileUrl,
              fileType,
              createdAt: new Date().toISOString(),
            },
          },
          timestamp: Date.now(),
        });
      }

      return { success: true, messageId, externalId };
    }),
});
