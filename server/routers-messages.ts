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
        // Buscar mensagens usando query raw com JOIN
        const rows = await db.execute(`
          SELECT 
            cm.id,
            cm.conversation_id,
            cm.external_id,
            cm.remote_jid,
            cm.provider,
            cm.sender_id,
            cm.sender_type,
            cm.content,
            cm.file_url,
            cm.file_name,
            cm.file_type,
            cm.file_size,
            cm.read_at,
            cm.created_at,
            u.name as sender_name,
            e.position as sender_position
          FROM conversation_messages cm
          LEFT JOIN users u ON cm.sender_id = u.id
          LEFT JOIN employees e ON u.id = e.user_id
          WHERE cm.conversation_id = ?
          ORDER BY cm.created_at ASC
        `, [input.conversation_id]);

        // Mapear resultados para o formato esperado pelo frontend
        return (rows as any[]).map((row: any) => ({
          id: row.id,
          conversationId: row.conversation_id,
          externalId: row.external_id,
          remoteJid: row.remote_jid,
          provider: row.provider,
          senderId: row.sender_id,
          senderType: row.sender_type,
          content: row.content,
          fileUrl: row.file_url,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: row.file_size,
          readAt: row.read_at,
          createdAt: row.created_at,
          senderName: row.sender_name,
          senderPosition: row.sender_position,
        }));
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

      // Send via Evolution API if WhatsApp
      let externalId: string | null = null;
      if (conv.channel === "whatsapp" && conv.customerPhone) {
        try {
          const { sendWhatsAppMessage } = await import("./messaging");
          const result = await sendWhatsAppMessage({
            to: conv.customerPhone,
            message: messageText,
            mediaUrl: fileUrl || undefined,
            caption: fileName || undefined,
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

      // Get agent info for sender name and position
      const userId = (ctx as any)?.user?.id;
      const agentName = (ctx as any)?.user?.name || "Atendente";
      
      // Fetch position from employees table
      let agentPosition = null;
      if (userId) {
        const employeeResult = await db.query.employees.findFirst({
          where: eq(employees.userId, userId),
          columns: { position: true },
        });
        if (employeeResult) {
          agentPosition = employeeResult.position;
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
        // Fetch agent details
        const senderEmployee = await db.query.employees.findFirst({
          where: eq(employees.userId, userId),
          with: {
            user: {
              columns: { name: true },
            },
          },
        });
        
        const senderName = senderEmployee?.user?.name || agentName;
        const senderPosition = senderEmployee?.position || null;
        
        sseManager.emitToUser(String(assignedTo), {
          type: EVENTS.MESSAGE_NEW,
          data: {
            conversationId,
            message: {
              id: messageId,
              content: messageText,
              senderType: "agent",
              senderName,
              senderPosition,
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
          senderName: agentName,
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