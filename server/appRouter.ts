import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  users,
  agentStatus,
  queues,
  conversations,
  conversationMessages,
  broadcastLists,
  broadcastMembersSent,
  broadcastMessages,
  customers,
  receivedMessages,
  processedWebhookMessages,
} from "../drizzle/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { db } from "../_core/db";

// Create the main router
export const appRouter = publicProcedure.router({
  // Health check
  health: publicProcedure.query(() => ({ status: "ok", timestamp: new Date().toISOString() })),

  // Auth routes
  auth: publicProcedure.router({
    login: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Find user by email (using openId as email for simplicity)
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1)
          .then((rows) => rows[0]);

        if (!user) {
          throw new Error("Invalid credentials");
        }

        // TODO: verify password (stored as passwordHash). For now, accept any password for demo
        // In production, use bcrypt.compare(input.password, user.passwordHash)

        // Generate JWT
        const token = `fake-jwt-${user.id}`; // Replace with real JWT generation

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),

    logout: protectedProcedure.mutation(() => {
      // Invalidate token if using DB sessions; JWT is stateless, so nothing to do
      return { success: true };
    }),
  }),

  // User routes
  users: protectedProcedure.router({
    me: protectedProcedure.query(async () => {
      // For demo: return first admin user
      const user = await db
        .select()
        .from(users)
        .limit(1)
        .then((rows) => rows[0]);

      return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
    }),
  }),

  // Agent status
  agentStatus: protectedProcedure.router({
    get: protectedProcedure.query(async () => {
      const userId = 1; // TEMP: get from session
      const status = await db
        .select()
        .from(agentStatus)
        .where(eq(agentStatus.userId, userId))
        .then((rows) => rows[0]);

      return status || { userId, status: "offline", lastSeen: new Date(), currentConversationId: null };
    }),
    setOnline: protectedProcedure.mutation(async () => {
      const userId = 1;
      await db
        .insert(agentStatus)
        .values({ userId, status: "online", lastSeen: new Date() })
        .onDuplicateKeyUpdate({ set: { status: "online", lastSeen: new Date() } });
      return { success: true };
    }),
    setOffline: protectedProcedure.mutation(async () => {
      const userId = 1;
      await db
        .insert(agentStatus)
        .values({ userId, status: "offline", lastSeen: new Date() })
        .onDuplicateKeyUpdate({ set: { status: "offline", lastSeen: new Date() } });
      return { success: true };
    }),
  }),

  // Queues
  queues: protectedProcedure.router({
    list: protectedProcedure.query(async () => {
      const list = await db.select().from(queues).orderBy(asc(queues.priority), desc(queues.createdAt));
      return list;
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const q = await db.select().from(queues).where(eq(queues.id, input.id)).limit(1).then((r) => r[0]);
        return q;
      }),
  }),

  // Conversations
  conversations: protectedProcedure.router({
    list: protectedProcedure
      .input(
        z.object({
          queueId: z.number().optional(),
          assignedTo: z.number().optional(),
          status: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const where = [];
        if (input?.queueId) where.push(eq(conversations.queueId, input.queueId));
        if (input?.assignedTo) where.push(eq(conversations.assignedTo, input.assignedTo));
        if (input?.status) where.push(eq(conversations.status, input.status));

        const list = await db
          .select()
          .from(conversations)
          .where(where.length > 0 ? and(...where) : undefined)
          .orderBy(desc(conversations.lastMessageAt))
          .limit(50);
        return list;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.id))
          .limit(1)
          .then((r) => r[0]);
        return conv;
      }),

    assign: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          agentId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db
          .update(conversations)
          .set({ assignedTo: input.agentId })
          .where(eq(conversations.id, input.conversationId));
        return { success: result > 0 };
      }),
  }),

  // Conversation messages
  conversationMessages: protectedProcedure.router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const msgs = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, input.conversationId))
          .orderBy(asc(conversationMessages.createdAt))
          .limit(100);
        return msgs;
      }),

    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().nullable(),
          fileUrl: z.string().nullable(),
          fileName: z.string().nullable(),
          fileType: z.string().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const userId = 1; // from session
        const msg = await db.insert(conversationMessages).values({
          conversationId: input.conversationId,
          senderId: userId,
          senderType: "agent",
          content: input.content,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          createdAt: new Date(),
        });
        // Update conversation lastMessageAt
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, input.conversationId));
        return { id: msg.insertId };
      }),
  }),

  // Customers
  customers: protectedProcedure.router({
    list: protectedProcedure.query(async () => {
      const list = await db.select().from(customers).limit(100);
      return list;
    }),
    getByPhone: protectedProcedure
      .input(z.object({ phone: z.string() }))
      .query(async ({ input }) => {
        const cust = await db
          .select()
          .from(customers)
          .where(eq(customers.phone, input.phone))
          .limit(1)
          .then((r) => r[0]);
        return cust;
      }),
  }),

  // Broadcast lists
  broadcastLists: protectedProcedure.router({
    list: protectedProcedure.query(async () => {
      const lists = await db.select().from(broadcastLists).orderBy(desc(broadcastLists.createdAt));
      return lists;
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const list = await db
          .select()
          .from(broadcastLists)
          .where(eq(broadcastLists.id, input.id))
          .limit(1)
          .then((r) => r[0]);
        return list;
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().nullable(),
          memberIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.insert(broadcastLists).values({
          name: input.name,
          description: input.description,
          createdBy: 1, // from session
          status: "active",
          createdAt: new Date(),
        });
        const listId = result.insertId;
        // Add members
        const memberValues = input.memberIds.map((customerId, idx) => ({
          listId,
          customerId,
          addedAt: new Date(),
        }));
        if (memberValues.length > 0) {
          await db.insert(broadcastListMembers).values(memberValues);
        }
        return { id: listId };
      }),
    addMember: protectedProcedure
      .input(
        z.object({
          listId: z.number(),
          customerId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.insert(broadcastListMembers).values({
          listId: input.listId,
          customerId: input.customerId,
          addedAt: new Date(),
        }).onDuplicateKeyIgnore();
        return { success: true };
      }),
    removeMember: protectedProcedure
      .input(
        z.object({
          listId: z.number(),
          customerId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db
          .delete(broadcastListMembers)
          .where(
            and(
              eq(broadcastListMembers.listId, input.listId),
              eq(broadcastListMembers.customerId, input.customerId)
            )
          );
        return { success: true };
      }),
  }),

  // Broadcast messages
  broadcastMessages: protectedProcedure.router({
    send: protectedProcedure
      .input(
        z.object({
          listId: z.number(),
          content: z.string(),
          caption: z.string().nullable(),
          fileUrl: z.string().nullable(),
          fileName: z.string().nullable(),
          fileType: z.string().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const msg = await db.insert(broadcastMessages).values({
          listId: input.listId,
          messageText: input.content,
          caption: input.caption,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          senderId: 1, // from session
          senderType: "agent",
          totalRecipients: 0,
          successfulSends: 0,
          failedSends: 0,
          status: "sending",
          sentAt: new Date(),
        });
        return { messageId: msg.insertId };
      }),
  }),

  // Received messages (from Evolution)
  receivedMessages: protectedProcedure.router({
    ingest: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          messageId: z.string(),
          content: z.string().nullable(),
          mediaUrl: z.string().nullable(),
          messageType: z.string().nullable(),
          externalId: z.string().optional(),
          provider: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Check for duplicate externalId if provided
        if (input.externalId) {
          const dup = await db
            .select()
            .from(processedWebhookMessages)
            .where(eq(processedWebhookMessages.id, input.externalId))
            .limit(1)
            .then((r) => r[0]);
          if (dup) {
            return { duplicate: true };
          }
        }

        const result = await db.insert(receivedMessages).values({
          customerId: input.customerId,
          messageId: input.messageId,
          content: input.content,
          mediaUrl: input.mediaUrl,
          messageType: input.messageType,
          receivedAt: new Date(),
          rawMessage: null,
        });

        // Mark processed if externalId provided
        if (input.externalId) {
          await db.insert(processedWebhookMessages).values({
            id: input.externalId,
            processedAt: new Date(),
            provider: input.provider || "evolution",
          });
        }

        return { id: result.insertId, duplicate: false };
      }),
  }),
});

// Export type helper
export type AppRouter = typeof appRouter;
