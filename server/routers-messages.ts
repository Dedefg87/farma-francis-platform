import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { conversationMessages, conversations, users, employees } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sseManager, EVENTS } from "./_core/sse";

export const messagesRouter = router({
  /**
   * Deleta uma mensagem por ID.
   */
  delete: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .delete(conversationMessages)
        .where(eq(conversationMessages.id, input.messageId));

      // MySQL delete returns affected rows
      const affected = (result as any)?.[0]?.affectedRows ?? 0;
      if (affected === 0) {
        throw new Error("Mensagem não encontrada");
      }

      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ conversation_id: z.coerce.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Buscar mensagens usando Drizzle ORM simples
        const messages = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, input.conversation_id))
          .orderBy(conversationMessages.createdAt);

        // Mapear mensagens e buscar dados do usuário separadamente
        const result = await Promise.all(messages.map(async (msg) => {
          let senderName = null;
          let senderPosition = null;

          // Buscar nome do usuário
          if (msg.senderId) {
            const [user] = await db.select().from(users).where(eq(users.id, msg.senderId)).limit(1);
            senderName = user?.name || null;

            // Buscar cargo do funcionário
            const [employee] = await db.select().from(employees).where(eq(employees.userId, msg.senderId)).limit(1);
            senderPosition = employee?.position || null;
          }

          return {
            id: msg.id,
            conversationId: msg.conversationId,
            externalId: msg.externalId,
            remoteJid: msg.remoteJid,
            provider: msg.provider,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileType: msg.fileType,
            fileSize: msg.fileSize,
            readAt: msg.readAt,
            createdAt: msg.createdAt,
            senderName,
            senderPosition,
          };
        }));

        return result;
      } catch (error) {
        console.error("[messages.list] Error fetching messages:", error);
        return []; // Return empty array on error to prevent UI crash
      }
    }),

  send: protectedProcedure
    .input(
      z.object({
        // Frontend sends these parameters
        to: z.string().optional(),
        provider: z.enum(["whatsapp", "instagram"]).optional(),
        message: z.string().optional(),
        customerId: z.number().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        viewOnce: z.boolean().optional(),
        // Also accept snake_case
        conversation_id: z.coerce.number().optional(),
        content: z.string().optional(),
        file_url: z.string().optional(),
        file_name: z.string().optional(),
        file_type: z.string().optional(),
        file_size: z.number().optional(),
      }).refine(
        data => {
          // Must have either conversation_id or (to + provider)
          return !!(data.conversation_id || (data.to && data.provider));
        },
        {
          message: "Either conversation_id or (to + provider) is required",
        }
      )
    )
    .mutation(async ({ input, ctx }) => {
      // Admin NÃO pode enviar mensagens ao cliente — usar sussurros (internalMessages)
      if (ctx.user?.role === "admin") {
        throw new Error(
          "Admin não pode enviar mensagens ao cliente. Use mensagens internas (sussurros) para orientar agentes."
        );
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Normalize camelCase/snake_case from frontend
      let fileUrl = input.fileUrl ?? input.file_url ?? null;
      const fileName = input.fileName ?? input.file_name ?? null;
      let fileType = input.fileType ?? input.file_type ?? null;
      const fileSize = input.fileSize ?? input.file_size ?? null;
      const messageText = input.message ?? input.content ?? "";

      // Get conversation details
      // Support both old format (conversation_id) and new format (to + provider)
      let conversationId = input.conversation_id;
      if (!conversationId) {
        // Find conversation by customer phone and provider
        const [foundConv] = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.customerPhone, input.to),
              eq(conversations.channel, input.provider)
            )
          )
          .limit(1);
        conversationId = foundConv?.id;
      }

      if (!conversationId) {
        throw new Error("Conversation not found - cannot determine which conversation to add message to");
      }

      // Get agent info for sender name and position - DO THIS BEFORE SENDING
      const userId = (ctx as any)?.user?.id;
      const agentName = (ctx as any)?.user?.name || "Atendente";
      
      // Fetch position from employees table
      let agentPosition = null;
      let senderName = agentName;
      
      if (userId) {
        try {
          const [employee] = await db.select()
            .from(employees)
            .where(eq(employees.userId, userId))
            .limit(1);
          
          if (employee) {
            agentPosition = employee.position;
          }
          
          // Also get user name
          const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          if (user?.name) {
            senderName = user.name;
          }
        } catch (err) {
          console.error("[messages.send] Error fetching employee:", err);
        }
      }

      // If fileUrl is a data URL (base64), upload to R2 first
      // Evolution API requires a public URL or raw base64 for media
      if (fileUrl && fileUrl.startsWith("data:")) {
        try {
          const { uploadToR2 } = await import("./r2-client.js");
          // Extract base64 data and mime type
          const mimeMatch = fileUrl.match(/^data:([^;]+);base64,(.*)$/s);
          if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
            const mimetype = mimeMatch[1];
            const base64Data = mimeMatch[2];
            const buffer = Buffer.from(base64Data, "base64");
            const ext =
              mimetype.includes("png")
                ? "png"
                : mimetype.includes("webp")
                ? "webp"
                : mimetype.includes("pdf")
                ? "pdf"
                : "jpg";
            const r2Result = await uploadToR2(
              buffer,
              `messages/${conversationId}_${Date.now()}.${ext}`,
              mimetype
            );
            fileUrl = r2Result.url; // Replace data URL with R2 public URL
            fileType = mimetype;
            console.log(
              "[messages.send] 📎 Uploaded media to R2:",
              r2Result.url
            );
          }
        } catch (r2Err: unknown) {
          console.error(
            "[messages.send] ⚠️ R2 upload failed, will try sending base64 directly:",
            r2Err
          );
          // Fallback: extract raw base64 for Evolution API
          const base64Match = fileUrl.match(/^data:[^;]+;base64,(.*)$/s);
          if (base64Match) {
            fileUrl = base64Match[1]; // Send raw base64 without data: prefix
          }
        }
      }

      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conv) throw new Error("Conversation not found");

      // Send via Evolution API if WhatsApp - NOW WITH SENDER INFO
      let externalId: string | null = null;
      if (conv.channel === "whatsapp" && conv.customerPhone) {
        try {
          const { sendWhatsAppMessage } = await import("./messaging");
          const result = await sendWhatsAppMessage({
            to: conv.customerPhone,
            message: messageText,
            mediaUrl: fileUrl || undefined,
            caption: fileName || undefined,
            senderName,
            senderPosition: agentPosition,
          });
          externalId = result?.messageId || null;
          console.log(
            "[messages.send] ✅ Sent via Evolution API, externalId:",
            externalId
          );
        } catch (err: unknown) {
          console.error(
            "[messages.send] ❌ Failed to send via Evolution API:",
            err
          );
          // Continue to save message locally even if send fails
        }
      }

      // Save message in DB
      const insertResult = await db.insert(conversationMessages).values({
        conversationId,
        content: messageText,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        senderId: userId || null,
        senderType: "agent",
        externalId,
      });

      const rawId = Array.isArray(insertResult)
        ? insertResult[0]?.insertId
        : insertResult?.insertId || insertResult?.lastInsertRowid;
      const messageId = Number(rawId) || null;

      // Update conversation lastMessageAt
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));

      // Notify via SSE - INCLUDE senderName and senderPosition
      const assignedTo = conv.assignedTo;
      if (assignedTo) {
        sseManager.emitToUser(String(assignedTo), {
          type: EVENTS.MESSAGE_NEW,
          data: {
            conversationId,
            message: {
              id: messageId,
              content: messageText,
              senderType: "agent",
              senderName,
              senderPosition: agentPosition,
              fileUrl,
              fileType,
              createdAt: new Date().toISOString(),
            },
          },
          timestamp: Date.now(),
        });
      }

      // Return full message with sender info
      return { 
        success: true, 
        messageId, 
        externalId, 
        conversationId,
        message: {
          id: messageId,
          conversationId,
          content: messageText,
          senderType: "agent",
          senderName,
          senderPosition: agentPosition,
          fileUrl,
          fileName,
          fileType,
          fileSize,
          createdAt: new Date().toISOString(),
        }
      };
    }),
});