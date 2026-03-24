import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  customers,
} from "../drizzle/schema";
import { eq, sql, asc, desc, and, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { formatPhoneBR, generatePhoneVariants } from "./utils/phone";
import { normalizeEmptyStringToNull } from "./utils/helpers";

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
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        console.error('[BroadcastDelete] Database not available');
        throw new Error("Database not available");
      }

      try {
        const listId = input.listId;
        console.log(`[BroadcastDelete] Starting deletion for list ID: ${listId}`);

        // 1. Selecionar IDs das mensagens associadas a esta lista
        const messageIds = await db
          .select({ id: broadcastMessages.id })
          .from(broadcastMessages)
          .where(eq(broadcastMessages.listId, listId));

        const idsToDelete = messageIds.map(m => m.id);
        console.log(`[BroadcastDelete] Found ${idsToDelete.length} message IDs for list ${listId}`);

        // 2. Deletar broadcast_members_sent em chunks (evita SIGTERM e MySQL 1093)
        if (idsToDelete.length > 0) {
          const chunkSize = 20; // chunk menor para evitar timeout/lock
          for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            console.log(`[BroadcastDelete] Deleting broadcast_members_sent chunk: ${chunk.length} items (batch ${Math.floor(i / chunkSize) + 1})`);
            await db.delete(broadcastMembersSent).where(
              inArray(broadcastMembersSent.broadcastMessageId, chunk)
            );
          }
          console.log(`[BroadcastDelete] Completed deletion of broadcast_members_sent (${idsToDelete.length} total)`);
        } else {
          console.log(`[BroadcastDelete] No messages found, skipping broadcast_members_sent deletion`);
        }

        // 3. Deletar as mensagens
        console.log(`[BroadcastDelete] Deleting broadcastMessages for listId: ${listId}`);
        await db.delete(broadcastMessages).where(eq(broadcastMessages.listId, listId));

        // 4. Deletar a lista
        console.log(`[BroadcastDelete] Deleting broadcastLists for listId: ${listId}`);
        await db.delete(broadcastLists).where(eq(broadcastLists.id, listId));

        console.log(`[BroadcastDelete] List ${listId} and associated data deleted successfully.`);
        return { success: true };
      } catch (err: any) {
        console.error(`[BroadcastDelete] Failed to delete list ${input.listId}:`, err.message);
        throw err;
      }
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
      memberId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      console.log(`[BroadcastRemoveMember] Removing memberId: ${input.memberId}`);

      const db = await getDb();
      if (!db) {
        console.error('[BroadcastRemoveMember] Database not available');
        throw new Error("Database not available");
      }

      await db.delete(broadcastListMembers).where(
        eq(broadcastListMembers.id, input.memberId)
      );

      console.log(`[BroadcastRemoveMember] MemberId ${input.memberId} removed successfully.`);
      return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({
      listIds: z.array(z.number().int().positive()),
    }))
    .mutation(async ({ input }) => {
      console.log(`[BroadcastDeleteMany] Starting bulk deletion for ${input.listIds.length} lists:`, input.listIds);

      const db = await getDb();
      if (!db) {
        console.error('[BroadcastDeleteMany] Database not available');
        throw new Error("Database not available");
      }

      try {
        // Process each list deletion sequentially to maintain order
        for (const listId of input.listIds) {
          console.log(`[BroadcastDeleteMany] Processing list ID: ${listId}`);

          // 1. Get message IDs for this list
          const messageIds = await db
            .select({ id: broadcastMessages.id })
            .from(broadcastMessages)
            .where(eq(broadcastMessages.listId, listId));

          const idsToDelete = messageIds.map(m => m.id);
          console.log(`[BroadcastDeleteMany] List ${listId}: Found ${idsToDelete.length} messages`);

          // 2. Delete broadcast_members_sent in chunks (avoids MySQL 1093 error)
          if (idsToDelete.length > 0) {
            const chunkSize = 20; // chunk menor para evitar timeout/lock
            for (let i = 0; i < idsToDelete.length; i += chunkSize) {
              const chunk = idsToDelete.slice(i, i + chunkSize);
              await db.delete(broadcastMembersSent).where(
                inArray(broadcastMembersSent.broadcastMessageId, chunk)
              );
              console.log(`[BroadcastDeleteMany] List ${listId}: Deleted chunk ${i / chunkSize + 1} of broadcast_members_sent`);
            }
          }

          // 3. Delete broadcast_messages
          await db.delete(broadcastMessages).where(eq(broadcastMessages.listId, listId));
          console.log(`[BroadcastDeleteMany] List ${listId}: Deleted broadcast_messages`);

          // 4. Delete broadcast_list_members
          await db.delete(broadcastListMembers).where(eq(broadcastListMembers.listId, listId));
          console.log(`[BroadcastDeleteMany] List ${listId}: Deleted broadcast_list_members`);

          // 5. Delete the list itself
          await db.delete(broadcastLists).where(eq(broadcastLists.id, listId));
          console.log(`[BroadcastDeleteMany] List ${listId}: Deleted broadcast_lists`);
        }

        console.log(`[BroadcastDeleteMany] Successfully deleted ${input.listIds.length} lists`);
        return { success: true, deletedCount: input.listIds.length };
      } catch (err: any) {
        console.error(`[BroadcastDeleteMany] Failed:`, err.message);
        throw err;
      }
    }),

  listMembers: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log(`[BroadcastListMembers] Fetching members for listId: ${input.listId}`);

      // Buscar membros com JOIN à tabela customers para obter nome e telefone
      const members = await db
        .select({
          id: broadcastListMembers.id,
          customerId: broadcastListMembers.customerId,
          addedAt: broadcastListMembers.addedAt,
          name: customers.name,
          phone: customers.phone,
        })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(eq(broadcastListMembers.listId, input.listId))
        .orderBy(asc(broadcastListMembers.addedAt));

      console.log(`[BroadcastListMembers] Raw members found: ${members.length}`);

      // Deduplicar por telefone (manter apenas 1 contato por número)
      const uniqueMembersMap = new Map<string, any>();
      for (const member of members) {
        if (member.phone && !uniqueMembersMap.has(member.phone)) {
          uniqueMembersMap.set(member.phone, member);
        }
      }
      const deduplicatedMembers = Array.from(uniqueMembersMap.values());

      console.log(`[BroadcastListMembers] Unique members (by phone): ${deduplicatedMembers.length}`);

      return deduplicatedMembers;
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
      content: z.string().optional().default('').transform(e => normalizeEmptyStringToNull(e)),
      caption: z.string().optional().default('').transform(e => normalizeEmptyStringToNull(e)),
      fileUrl: z.string().url().optional().or(z.string().max(0).optional()).transform(e => normalizeEmptyStringToNull(e)),
      fileName: z.string().optional().default('').transform(e => normalizeEmptyStringToNull(e)),
      fileType: z.string().optional().default('').transform(e => normalizeEmptyStringToNull(e)),
      fileSize: z.number().int().optional().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[BroadcastSendMessage] 🚀 Mutation iniciada - input:', JSON.stringify(input, null, 2));
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

      const values = {
        listId: input.listId,
        messageText: normalizeEmptyStringToNull(input.content),
        caption: normalizeEmptyStringToNull(input.caption),
        fileUrl: normalizeEmptyStringToNull(input.fileUrl),
        fileName: normalizeEmptyStringToNull(input.fileName),
        fileType: normalizeEmptyStringToNull(input.fileType),
        fileSize: input.fileSize ?? null,
        senderId: ctx.user.id,
        senderType: "agent",
        status: "sending",
        sentAt: new Date(),
        errorMessage: null,
      };

      console.log('[BroadcastInsert] Normalized values:', JSON.stringify(values));
      const messageResult = await db.insert(broadcastMessages).values(values);

      const rawId = (messageResult as any).insertId || (messageResult as any).ids?.[0] || (messageResult as any).lastInsertRowid;
      const messageId = Number(rawId);
      if (!messageId || isNaN(messageId)) {
        throw new Error("Falha ao obter ID da mensagem broadcast");
      }

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
