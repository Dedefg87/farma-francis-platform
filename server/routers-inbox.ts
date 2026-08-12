import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { receivedMessages, messages, customers, conversationMessages, conversations, users, employees } from "../drizzle/schema";
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
          fromProfilePic: sql<string | null>`COALESCE(${customers.photoUrl}, MAX(${receivedMessages.fromProfilePic}))`,
          provider: receivedMessages.provider,
          lastMessage: receivedMessages.messageText,
          lastMessageType: receivedMessages.messageType,
          lastMessageTime: receivedMessages.timestamp,
          unreadCount: sql<number>`COUNT(CASE WHEN ${receivedMessages.processed} = 0 THEN 1 END)`,
          customerId: receivedMessages.customerId,
        })
        .from(receivedMessages)
        .leftJoin(customers, eq(customers.id, receivedMessages.customerId))
        .groupBy(receivedMessages.fromNumber, receivedMessages.provider, customers.photoUrl)
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

      // Lazy load profile pictures in background if null or expired CDN URLs
      conversations.forEach(conv => {
        const hasNoPhoto = !conv.fromProfilePic;
        const isExpiredWhatsAppCdn = conv.fromProfilePic && (
          conv.fromProfilePic.includes("whatsapp.net") || 
          conv.fromProfilePic.includes("whatsapp.com") ||
          conv.fromProfilePic.includes("mmg.whatsapp.net") ||
          conv.fromProfilePic.includes("pps.whatsapp.net")
        );

        if ((hasNoPhoto || isExpiredWhatsAppCdn) && conv.fromNumber && conv.provider === "whatsapp") {
          setImmediate(async () => {
            try {
              // Resolve customerId if missing (old messages may not have it)
              let custId = conv.customerId ? Number(conv.customerId) : null;
              if (!custId) {
                const { findOrCreateCustomerByPhone } = await import('./db-messages.js');
                const c = await findOrCreateCustomerByPhone(conv.fromNumber);
                custId = c?.id ?? null;
                // Link old received_messages to the customer so JOIN + photo update work
                if (custId) {
                  const db = await getDb();
                  if (db) {
                    await db
                      .update(receivedMessages)
                      .set({ customerId: custId })
                      .where(
                        and(
                          eq(receivedMessages.fromNumber, conv.fromNumber),
                          eq(receivedMessages.provider, conv.provider)
                        )
                      );
                  }
                }
              }
              if (!custId) return;

              console.log(`[Inbox Lazy Load] Resolving missing/expired profile pic for ${conv.fromNumber}...`);
              const { downloadAndUploadProfilePic } = await import('./services/profile-pic.js');
              await downloadAndUploadProfilePic(conv.fromNumber, custId);
            } catch (err) {
              console.error(`[Inbox Lazy Load] Failed resolving profile pic for ${conv.fromNumber}:`, err);
            }
          });
        }
      });

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

      // Buscar conversa pelo número do cliente
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.customerPhone, input.fromNumber))
        .limit(1);

      if (!conv) return [];

      // Buscar mensagens da conversa usando a nova tabela conversation_messages
      const msgs = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conv.id))
        .orderBy(conversationMessages.createdAt);

      // Enriquecer com nome/cargo do agente (senderName/senderPosition já vêm do DB agora)
      return msgs.map(msg => ({
        id: `cm-${msg.id}`,
        direction: msg.senderType === "agent" ? "outbound" : "inbound",
        content: msg.content || (msg.messageType === "reaction" ? msg.reaction || "" : ""),
        messageType: msg.messageType,
        mediaUrl: msg.fileUrl,
        timestamp: msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime(),
        createdAt: msg.createdAt,
        fromName: msg.fromName || null,
        senderId: msg.senderId,
        senderName: msg.senderName || null,
        senderPosition: msg.senderPosition || null,
        reaction: msg.reaction || null,
        replyToExternalId: (msg as any).replyToExternalId || null,
        externalId: msg.externalId,
        processed: true,
      }));
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
