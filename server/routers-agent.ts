import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";

export const agentRouter = router({
  // Conversations
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { conversations } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");

      const convs = await db
        .select()
        .from(conversations)
        .where(eq(conversations.assignedTo, ctx.user.id))
        .orderBy(desc(conversations.lastMessageAt));
      return convs;
    }),

    getById: protectedProcedure
      .input((raw: unknown) => z.object({ id: z.number() }).parse(raw))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { conversations } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const [conv] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.id));
        return conv;
      }),

    assign: protectedProcedure
      .input((raw: unknown) =>
        z.object({ conversationId: z.number() }).parse(raw)
      )
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { conversations } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        await db
          .update(conversations)
          .set({ assignedTo: ctx.user.id, status: "assigned" })
          .where(eq(conversations.id, input.conversationId));
        return { success: true };
      }),

    close: protectedProcedure
      .input((raw: unknown) =>
        z
          .object({
            conversationId: z.number(),
            reason: z.enum([
              "venda",
              "orcamento",
              "conversa_anterior",
              "engano",
            ]),
          })
          .parse(raw)
      )
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { conversations } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // First, call closeConversation to send the closing message
        const { closeConversation } = await import("./chatbot");
        await closeConversation(input.conversationId, input.reason);

        // Then update the database
        await db
          .update(conversations)
          .set({
            status: "closed",
            closedAt: new Date(),
            closeReason: input.reason,
          })
          .where(eq(conversations.id, input.conversationId));
        return { success: true };
      }),
  }),

  // Messages
  messages: router({
    list: protectedProcedure
      .input((raw: unknown) =>
        z.object({ conversationId: z.number() }).parse(raw)
      )
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { conversationMessages, users } = await import("../drizzle/schema");
        const { eq, sql } = await import("drizzle-orm");

        const msgs = await db
          .select({
            id: conversationMessages.id,
            conversationId: conversationMessages.conversationId,
            senderId: conversationMessages.senderId,
            senderType: conversationMessages.senderType,
            content: conversationMessages.content,
            fileUrl: conversationMessages.fileUrl,
            fileName: conversationMessages.fileName,
            fileType: conversationMessages.fileType,
            fileSize: conversationMessages.fileSize,
            readAt: conversationMessages.readAt,
            createdAt: conversationMessages.createdAt,
            senderName: sql<string>`CASE 
              WHEN ${conversationMessages.senderType} = 'agent' AND ${users.role} = 'admin' 
              THEN CONCAT(${users.name}, ' - Gerente')
              WHEN ${conversationMessages.senderType} = 'agent' 
              THEN ${users.name}
              ELSE NULL 
            END`.as('senderName'),
          })
          .from(conversationMessages)
          .leftJoin(users, eq(conversationMessages.senderId, users.id))
          .where(eq(conversationMessages.conversationId, input.conversationId))
          .orderBy(conversationMessages.createdAt);

        return msgs;
      }),

    send: protectedProcedure
      .input((raw: unknown) =>
        z
          .object({
            conversationId: z.number(),
            content: z.string(),
            fileUrl: z.string().optional(),
            fileName: z.string().optional(),
            fileType: z.string().optional(),
            fileSize: z.number().optional(),
          })
          .parse(raw)
      )
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { conversationMessages } = await import("../drizzle/schema");

        await db.insert(conversationMessages).values({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          senderType: "agent",
          content: input.content,
          fileUrl: input.fileUrl || null,
          fileName: input.fileName || null,
          fileType: input.fileType || null,
          fileSize: input.fileSize || null,
          createdAt: new Date(),
        });

        return { success: true };
      }),
  }),

  // Quick Replies
  quickReplies: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { quickReplies } = await import("../drizzle/schema");

      const replies = await db
        .select()
        .from(quickReplies)
        .orderBy(quickReplies.category);
      return replies;
    }),

    create: adminProcedure
      .input((raw: unknown) =>
        z
          .object({
            title: z.string(),
            content: z.string(),
            category: z.string().optional(),
          })
          .parse(raw)
      )
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { quickReplies } = await import("../drizzle/schema");

        await db.insert(quickReplies).values({
          title: input.title,
          content: input.content,
          category: input.category,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // Agent Status
  status: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { agentStatus } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const statuses = await db
        .select()
        .from(agentStatus)
        .where(eq(agentStatus.userId, ctx.user.id));
      return statuses;
    }),

    update: protectedProcedure
      .input((raw: unknown) =>
        z
          .object({
            channel: z.enum(["whatsapp", "instagram"]),
            status: z.enum(["online", "paused", "offline"]),
          })
          .parse(raw)
      )
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { agentStatus } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Verificar se já existe
        const [existing] = await db
          .select()
          .from(agentStatus)
          .where(
            and(
              eq(agentStatus.userId, ctx.user.id),
              eq(agentStatus.channel, input.channel)
            )
          );

        if (existing) {
          await db
            .update(agentStatus)
            .set({ status: input.status, lastActivity: new Date() })
            .where(eq(agentStatus.id, existing.id));
        } else {
          await db.insert(agentStatus).values({
            userId: ctx.user.id,
            channel: input.channel,
            status: input.status,
            lastActivity: new Date(),
          });
        }
        return { success: true };
      }),
  }),

  // Queues
  queues: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { queueSettings } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const queues = await db
        .select()
        .from(queueSettings)
        .where(eq(queueSettings.isActive, 1));
      return queues;
    }),
  }),

  // Metrics
  metrics: router({
    realtime: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { conversations } = await import("../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // Contar atendimentos ativos do agente
      const activeConversations = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            eq(conversations.assignedTo, ctx.user.id),
            eq(conversations.status, "assigned")
          )
        );

      // Contar mensagens não lidas
      const unreadMessages = await db
        .select({ total: sql<number>`sum(unread_count)` })
        .from(conversations)
        .where(eq(conversations.assignedTo, ctx.user.id));

      return {
        activeConversations: activeConversations[0]?.count || 0,
        unreadMessages: unreadMessages[0]?.total || 0,
      };
    }),
  }),
});
