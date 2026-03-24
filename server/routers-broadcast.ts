import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  customers,
} from "../drizzle/schema";
import { eq, sql, asc, desc, and, or } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { formatPhoneBR, generatePhoneVariants } from "./utils/phone";

export const broadcastRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      console.log('[BroadcastList] query started. input:', JSON.stringify(input), 'user:', ctx.user?.id);
      const db = await getDb();
      if (!db) {
        console.error('[BroadcastList] Database not available');
        throw new Error("Database not available");
      }

      try {
        const offset = (input.page - 1) * input.limit;

        console.log('[BroadcastList] Executing main query with groupBy...');
        const lists = await db
          .select({
            id: broadcastLists.id,
            name: broadcastLists.name,
            description: broadcastLists.description,
            memberCount: sql<number>`COUNT(DISTINCT ${broadcastListMembers.customerId})`.as("memberCount"),
            lastSentAt: broadcastLists.lastSentAt,
            createdAt: broadcastLists.createdAt,
          })
          .from(broadcastLists)
          .leftJoin(broadcastListMembers, eq(broadcastLists.id, broadcastListMembers.listId))
          .groupBy(broadcastLists.id, broadcastLists.name, broadcastLists.description, broadcastLists.lastSentAt, broadcastLists.createdAt)
          .orderBy(desc(broadcastLists.createdAt))
          .limit(Number(input.limit))
          .offset(offset);

        console.log('[BroadcastList] Main query returned', lists.length, 'rows');

        console.log('[BroadcastList] Executing count query...');
        const [{ total }] = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(broadcastLists);
        console.log('[BroadcastList] Count returned total:', total);

        // Sanitize: convert Date objects to ISO strings
        const sanitizedLists = lists.map(item => {
          const { createdAt, lastSentAt, ...rest } = item as any;
          return {
            ...rest,
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
            lastSentAt: lastSentAt instanceof Date ? lastSentAt.toISOString() : lastSentAt,
            memberCount: Number(item.memberCount),
          };
        });

        console.log('[BroadcastList] Sanitized dates, returning', sanitizedLists.length, 'items');

        return {
          lists: sanitizedLists,
          pagination: {
            page: input.page,
            limit: input.limit,
            total: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
          },
        };
      } catch (err: any) {
        console.error('[BroadcastList] Query failed:', err.message, 'stack:', err.stack);
        throw err;
      }
    }),

  getById: protectedProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [list] = await db
        .select({
          id: broadcastLists.id,
          name: broadcastLists.name,
          description: broadcastLists.description,
          createdAt: broadcastLists.createdAt,
          updatedAt: broadcastLists.updatedAt,
        })
        .from(broadcastLists)
        .where(eq(broadcastLists.id, input.listId))
        .limit(1);

      if (!list) throw new Error("Lista não encontrada");

      const members = await db
        .select({
          id: broadcastListMembers.id,
          customerId: broadcastListMembers.customerId,
          addedAt: broadcastListMembers.addedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
            photoUrl: customers.photoUrl,
          },
        })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(eq(broadcastListMembers.listId, input.listId))
        .orderBy(asc(broadcastListMembers.addedAt));

      return {
        ...list,
        members: members.map(m => ({ ...m, customer: m.customer || null })),
      };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.execute(
        sql`
          INSERT INTO broadcast_lists (name, description, created_by, created_at, updated_at)
          VALUES (${input.name}, ${input.description || null}, ${ctx.user.id}, NOW(), NOW())
        `
      );
      
      const insertId = (result as any).insertId || (result as any).ids?.[0];
      return { id: Number(insertId) };
    }),

  delete: protectedProcedure
    .input(z.object({ listId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(broadcastMembersSent).where(
        sql`broadcast_message_id IN (SELECT id FROM ${broadcastMessages} WHERE list_id = ${input.listId})`
      );
      await db.delete(broadcastMessages).where(eq(broadcastMessages.listId, input.listId));
      await db.delete(broadcastListMembers).where(eq(broadcastListMembers.listId, input.listId));
      await db.delete(broadcastLists).where(eq(broadcastLists.id, input.listId));

      return { success: true };
    }),

  addMember: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      customerId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db.select()
        .from(broadcastListMembers)
        .where(and(
          eq(broadcastListMembers.listId, input.listId),
          eq(broadcastListMembers.customerId, input.customerId)
        ))
        .limit(1);

      if (existing.length > 0) throw new Error("Cliente já está na lista");

      await db.insert(broadcastListMembers).values({
        listId: input.listId,
        customerId: input.customerId,
        addedAt: new Date(),
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      customerId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(broadcastListMembers).where(and(
        eq(broadcastListMembers.listId, input.listId),
        eq(broadcastListMembers.customerId, input.customerId)
      ));

      return { success: true };
    }),

  searchCustomers: protectedProcedure
    .input(z.object({
      query: z.string().default(""),
      excludeListId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const searchPattern = `%${input.query}%`;
      const query = db.select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        photoUrl: customers.photoUrl,
      }).from(customers);

      const whereClause = or(
        sql`LOWER(${customers.name}) LIKE LOWER(${searchPattern})`,
        sql`LOWER(${customers.email}) LIKE LOWER(${searchPattern})`,
        sql`${customers.phone} LIKE ${searchPattern}`
      );

      if (input.excludeListId) {
        const subquery = sql`SELECT customer_id FROM broadcast_list_members WHERE list_id = ${input.excludeListId}`;
        query.where(and(whereClause, sql`customers.id NOT IN (${subquery})`));
      } else {
        query.where(whereClause);
      }

      return query.limit(50);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      content: z.string().optional().default(''),
      caption: z.string().optional().default(''),
      fileUrl: z.string().url().optional().or(z.string().max(0).optional()),
      fileName: z.string().optional().default(''),
      fileType: z.string().optional().default(''),
      fileSize: z.number().int().optional().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const members = await db.select({
        customerId: broadcastListMembers.customerId,
        phone: customers.phone,
      })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(eq(broadcastListMembers.listId, input.listId));

      if (members.length === 0) throw new Error("Lista não tem membros");

      const messageResult = await db.insert(broadcastMessages).values({
        listId: input.listId,
        messageText: input.content,
        caption: input.caption || null,
        fileUrl: input.fileUrl || null,
        fileName: input.fileName || null,
        fileType: input.fileType || null,
        fileSize: input.fileSize || 0,
        senderId: ctx.user.id,
        senderType: "agent",
        status: "sending",
        sentAt: new Date(),
        errorMessage: null,
      });

      const messageId = Number(messageResult.insertId || messageResult.ids?.[0]);

      const batchSize = 1000;
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const valuesSql = batch.map(m =>
          `(${Number(messageId)}, ${m.customerId}, '${m.phone.replace(/'/g, "''")}', 'pending', NULL, NULL, NOW(), NOW(), NOW())`
        ).join(',');
        
        await db.execute(sql`INSERT INTO broadcast_members_sent (broadcast_message_id, customer_id, phone, status, error_message, delivered_at, read_at, sent_at, created_at) VALUES ${sql.raw(valuesSql)}`);
      }

      await db.update(broadcastLists)
        .set({ lastSentAt: new Date() })
        .where(eq(broadcastLists.id, input.listId));

      return { messageId: Number(messageId), status: 'sending' };
    }),

  getMessageStats: protectedProcedure
    .input(z.object({ messageId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const message = await db.select()
        .from(broadcastMessages)
        .where(eq(broadcastMessages.id, input.messageId))
        .limit(1);

      if (!message.length) throw new Error("Mensagem não encontrada");

      const [[{ total }]] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(broadcastListMembers)
        .where(eq(broadcastListMembers.listId, message[0].listId));

      const stats = await db.select({
        status: broadcastMembersSent.status,
        count: sql<number>`COUNT(*)`,
      })
        .from(broadcastMembersSent)
        .where(eq(broadcastMembersSent.broadcastMessageId, input.messageId))
        .groupBy(broadcastMembersSent.status);

      const result: any = { total, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
      stats.forEach(s => { result[s.status] = Number(s.count); });

      return result;
    }),

  listMessages: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(50).optional().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;

      const messages = await db
        .select({
          id: broadcastMessages.id,
          messageText: broadcastMessages.messageText,
          fileUrl: broadcastMessages.fileUrl,
          fileName: broadcastMessages.fileName,
          fileType: broadcastMessages.fileType,
          fileSize: broadcastMessages.fileSize,
          senderId: broadcastMessages.senderId,
          status: broadcastMessages.status,
          sentAt: broadcastMessages.sentAt,
          createdAt: broadcastMessages.createdAt,
        })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId))
        .orderBy(desc(broadcastMessages.createdAt))
        .limit(Number(input.limit))
        .offset(offset);

      const [[{ total }]] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId));

      return {
        messages,
        pagination: { page: input.page, limit: input.limit, total: Number(total), totalPages: Math.ceil(Number(total) / input.limit) },
      };
    }),
});
