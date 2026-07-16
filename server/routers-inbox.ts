import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { receivedMessages, messages, customers } from "../drizzle/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { sendWhatsAppMessage, sendInstagramMessage } from "./messaging";

/**
 * Inbox router for managing conversations
 */
export const inboxRouter = router({
  /**
   * Get list of conversations (grouped by customer/phone number)
   */
  getConversations: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["whatsapp", "instagram", "all"]).optional(),
        limit: z.number().optional().default(50),
        tagIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Se houver filtro por tags, buscar apenas conversas com essas tags
      let filteredConversationIds: string[] | null = null;
      if (input.tagIds && input.tagIds.length > 0) {
        const { conversationTags } = await import("../drizzle/schema.js");

        // Buscar conversões que possuem TODAS as tags selecionadas
        const taggedConversations = await db
          .select({
            conversationId: conversationTags.conversationId,
            tagCount: sql<number>`COUNT(DISTINCT ${conversationTags.tagId})`,
          })
          .from(conversationTags)
          .where(
            sql`${conversationTags.tagId} IN (${sql.join(
              input.tagIds.map(id => sql`${id}`),
              sql`, `
            )})`
          )
          .groupBy(conversationTags.conversationId)
          .having(
            sql`COUNT(DISTINCT ${conversationTags.tagId}) = ${input.tagIds.length}`
          );

        filteredConversationIds = taggedConversations.map(
          c => c.conversationId
        );

        // Se nenhuma conversa tem todas as tags, retornar vazio
        if (filteredConversationIds.length === 0) {
          return [];
        }
      }

      // Get latest message for each unique fromNumber
      let query = db
        .select({
          fromNumber: receivedMessages.fromNumber,
          fromName: receivedMessages.fromName,
          fromProfilePic: sql<string | null>`MAX(${receivedMessages.fromProfilePic})`,
          provider: receivedMessages.provider,
          lastMessage: receivedMessages.messageText,
          lastMessageType: receivedMessages.messageType,
          lastMessageTime: receivedMessages.timestamp,
          unreadCount: sql<number>`COUNT(CASE WHEN ${receivedMessages.processed} = 0 THEN 1 END)`,
          customerId: receivedMessages.customerId,
        })
        .from(receivedMessages)
        .groupBy(receivedMessages.fromNumber, receivedMessages.provider)
        .orderBy(desc(sql`MAX(${receivedMessages.timestamp})`))
        .limit(input.limit);

      // Aplicar filtros
      const conditions = [];

      if (input.provider && input.provider !== "all") {
        conditions.push(eq(receivedMessages.provider, input.provider));
      }

      if (filteredConversationIds) {
        // Filtrar por conversationIds que possuem as tags
        conditions.push(
          sql`CONCAT(${receivedMessages.provider}, '-', ${receivedMessages.fromNumber}) IN (${sql.join(
            filteredConversationIds.map(id => sql`${id}`),
            sql`, `
          )})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(sql`${sql.join(conditions, sql` AND `)}`) as any;
      }

      const conversations = await query;

      return conversations.map(conv => ({
        ...conv,
        lastMessageTime: Number(conv.lastMessageTime),
        unreadCount: Number(conv.unreadCount),
      }));
    }),

  /**
   * Get conversation history for a specific phone number
   */
  getConversationHistory: protectedProcedure
    .input(
      z.object({
        fromNumber: z.string(),
        provider: z.enum(["whatsapp", "instagram"]),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get received messages
      const received = await db
        .select()
        .from(receivedMessages)
        .where(
          and(
            eq(receivedMessages.fromNumber, input.fromNumber),
            eq(receivedMessages.provider, input.provider)
          )
        )
        .orderBy(desc(receivedMessages.timestamp))
        .limit(input.limit);

      // Get sent messages
      const sent = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.channel, input.provider),
            eq(messages.direction, "outbound")
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      // Merge and sort by timestamp
      const allMessages = [
        ...received.map(msg => ({
          id: `received-${msg.id}`,
          direction: "inbound" as const,
          content: msg.messageText || "[Media]",
          messageType: msg.messageType,
          mediaUrl: msg.mediaUrl,
          timestamp: Number(msg.timestamp),
          createdAt: msg.createdAt,
          fromName: msg.fromName,
          processed: msg.processed === 1,
        })),
        ...sent.map(msg => ({
          id: `sent-${msg.id}`,
          direction: "outbound" as const,
          content: msg.content,
          messageType: msg.metadata ? (() => { try { const m = JSON.parse(msg.metadata); return m.fileType || "text"; } catch { return "text"; } })() : "text",
          mediaUrl: msg.metadata ? (() => { try { const m = JSON.parse(msg.metadata); return m.mediaUrl || null; } catch { return null; } })() : null,
          timestamp: msg.createdAt.getTime(),
          createdAt: msg.createdAt,
          fromName: null,
          processed: true,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      return allMessages;
    }),

  /**
   * Send a message to a customer
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        provider: z.enum(["whatsapp", "instagram"]),
        message: z.string(),
        customerId: z.number().optional(),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.provider === "whatsapp") {
        const result = await sendWhatsAppMessage({
          to: input.to,
          message: input.message,
          mediaUrl: input.fileUrl,
          caption: input.fileName,
        });

        // 💾 Save outbound message to conversation history
        try {
          const { ingestOutboundConversationMessage } = await import('./db-messages-outbound');
          await ingestOutboundConversationMessage({
            provider: "whatsapp",
            toNumber: input.to,
            fromUserId: ctx.user?.id || 1,
            messageType: input.fileUrl ? 'image' : 'text',
            messageText: input.message,
            mediaUrl: input.fileUrl,
            fileName: input.fileName,
            mimeType: input.fileType,
            externalId: result?.messageId || result?.messages?.[0]?.id || `outbound-${Date.now()}`,
            createdAt: new Date(),
          });
          console.log('[Inbox] Outbound message saved to conversation history');
        } catch (saveError) {
          console.error('[Inbox] Failed to save outbound message:', saveError);
          // Non-critical - message was already sent
        }

        return result;
      } else if (input.provider === "instagram") {
        const result = await sendInstagramMessage({
          to: input.to,
          message: input.message,
          mediaUrl: input.fileUrl,
        });
        return result;
      }

      throw new Error("Invalid provider");
    }),

  /**
   * Mark conversation as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        fromNumber: z.string(),
        provider: z.enum(["whatsapp", "instagram"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(receivedMessages)
        .set({ processed: 1, processedAt: new Date() })
        .where(
          and(
            eq(receivedMessages.fromNumber, input.fromNumber),
            eq(receivedMessages.provider, input.provider),
            eq(receivedMessages.processed, 0)
          )
        );

      return { success: true };
    }),

  /**
   * Get inbox statistics
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      return {
        totalConversations: 0,
        unreadMessages: 0,
        whatsappCount: 0,
        instagramCount: 0,
      };

    const stats = await db
      .select({
        totalConversations: sql<number>`COUNT(DISTINCT ${receivedMessages.fromNumber})`,
        unreadMessages: sql<number>`COUNT(CASE WHEN ${receivedMessages.processed} = 0 THEN 1 END)`,
        whatsappCount: sql<number>`COUNT(CASE WHEN ${receivedMessages.provider} = 'whatsapp' THEN 1 END)`,
        instagramCount: sql<number>`COUNT(CASE WHEN ${receivedMessages.provider} = 'instagram' THEN 1 END)`,
      })
      .from(receivedMessages);

    return {
      totalConversations: Number(stats[0].totalConversations),
      unreadMessages: Number(stats[0].unreadMessages),
      whatsappCount: Number(stats[0].whatsappCount),
      instagramCount: Number(stats[0].instagramCount),
    };
  }),
});
