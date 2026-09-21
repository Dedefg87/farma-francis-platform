import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  customers,
  conversations,
} from "../drizzle/schema";
import { eq, sql, asc, desc, and, or, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { formatPhoneBR, generatePhoneVariants } from "./utils/phone";
import { normalize, normalizeEmptyStringToNull } from "./utils/normalize";
import { enqueueBroadcastMessage } from "./services/broadcast-queue";

export const broadcastRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        console.error('[BroadcastList] Database not available');
        throw new Error("Database not available");
      }

      try {
        const offset = (input.page - 1) * input.limit;

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


        const [{ total }] = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(broadcastLists);

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


        return {
          lists: sanitizedLists,
          pagination: {
            page: input.page,
            limit: input.limit,
            total: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
          },
        };
      } catch (err: unknown) {
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

        // 1. Selecionar IDs das mensagens associadas a esta lista
        const messageIds = await db
          .select({ id: broadcastMessages.id })
          .from(broadcastMessages)
          .where(eq(broadcastMessages.listId, listId));

        const idsToDelete = messageIds.map(m => m.id);

        // 2. Deletar broadcast_members_sent em chunks (evita SIGTERM e MySQL 1093)
        if (idsToDelete.length > 0) {
          const chunkSize = 20; // chunk menor para evitar timeout/lock
          for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            await db.delete(broadcastMembersSent).where(
              inArray(broadcastMembersSent.broadcastMessageId, chunk)
            );
          }
        } else {
        }

        // 3. Deletar as mensagens
        await db.delete(broadcastMessages).where(eq(broadcastMessages.listId, listId));

        // 4. Deletar a lista
        await db.delete(broadcastLists).where(eq(broadcastLists.id, listId));

        return { success: true };
      } catch (err: unknown) {
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

      const db = await getDb();
      if (!db) {
        console.error('[BroadcastRemoveMember] Database not available');
        throw new Error("Database not available");
      }

      await db.delete(broadcastListMembers).where(
        eq(broadcastListMembers.id, input.memberId)
      );

      return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({
      listIds: z.array(z.number().int().positive()),
    }))
    .mutation(async ({ input }) => {

      const db = await getDb();
      if (!db) {
        console.error('[BroadcastDeleteMany] Database not available');
        throw new Error("Database not available");
      }

      try {
        // Process each list deletion sequentially to maintain order
        for (const listId of input.listIds) {

          // 1. Get message IDs for this list
          const messageIds = await db
            .select({ id: broadcastMessages.id })
            .from(broadcastMessages)
            .where(eq(broadcastMessages.listId, listId));

          const idsToDelete = messageIds.map(m => m.id);

          // 2. Delete broadcast_members_sent in chunks (avoids MySQL 1093 error)
          if (idsToDelete.length > 0) {
            const chunkSize = 20; // chunk menor para evitar timeout/lock
            for (let i = 0; i < idsToDelete.length; i += chunkSize) {
              const chunk = idsToDelete.slice(i, i + chunkSize);
              await db.delete(broadcastMembersSent).where(
                inArray(broadcastMembersSent.broadcastMessageId, chunk)
              );
            }
          }

          // 3. Delete broadcast_messages
          await db.delete(broadcastMessages).where(eq(broadcastMessages.listId, listId));

          // 4. Delete broadcast_list_members
          await db.delete(broadcastListMembers).where(eq(broadcastListMembers.listId, listId));

          // 5. Delete the list itself
          await db.delete(broadcastLists).where(eq(broadcastLists.id, listId));
        }

        return { success: true, deletedCount: input.listIds.length };
      } catch (err: unknown) {
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


      // Deduplicar por telefone (manter apenas 1 contato por número)
      const uniqueMembersMap = new Map<string, any>();
      for (const member of members) {
        if (member.phone && !uniqueMembersMap.has(member.phone)) {
          uniqueMembersMap.set(member.phone, member);
        }
      }
      const deduplicatedMembers = Array.from(uniqueMembersMap.values());


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
      const whereClause = or(
        sql`LOWER(${customers.name}) LIKE LOWER(${searchPattern})`,
        sql`LOWER(${customers.email}) LIKE LOWER(${searchPattern})`,
        sql`${customers.phone} LIKE ${searchPattern}`
      );

      let query = db.select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        photoUrl: customers.photoUrl,
      }).from(customers).where(whereClause);

      if (input.excludeListId) {
        // Exclude customers already in the list
        const excludeIds = await db.select({ customerId: broadcastListMembers.customerId })
          .from(broadcastListMembers)
          .where(eq(broadcastListMembers.listId, input.excludeListId));
        const excludeIdList = excludeIds.map(r => r.customerId);
        
        if (excludeIdList.length > 0) {
          query = db.select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
            photoUrl: customers.photoUrl,
          }).from(customers).where(and(whereClause, notInArray(customers.id, excludeIdList)));
        }
      }

      return query.limit(50);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      content: z.string().optional().nullable().transform(normalize),
      caption: z.string().optional().nullable().transform(normalize),
      fileUrl: z.string().optional().nullable().transform(normalize),
      fileName: z.string().optional().nullable().transform(normalize),
      fileType: z.string().optional().nullable().transform(normalize),
      fileSize: z.number().int().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // [FIX] Regra 5: apenas clientes que conversaram com a farmacia nas ultimas 24h
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentRows = await db
        .select({ customerId: conversations.customerId })
        .from(conversations)
        .where(sql`${conversations.lastMessageAt} >= ${cutoff}`);
      const recentIds = Array.from(new Set(recentRows.map(r => r.customerId).filter(Boolean)));
      
      const members = await db.select({
        customerId: broadcastListMembers.customerId,
        phone: customers.phone,
      })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(and(
          eq(broadcastListMembers.listId, input.listId),
          inArray(broadcastListMembers.customerId, recentIds)
        ));

      if (members.length === 0) throw new Error("Nenhum cliente ativo nas ultimas 24h nesta lista (ou lista vazia)");

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
        totalRecipients: members.length,
        successfulSends: 0,
        failedSends: 0,
        status: "sending",
        sentAt: new Date(),
        errorMessage: null,
      };


      try {
        // Use Drizzle ORM (schema aligned with MySQL)
        const [result] = await db.insert(broadcastMessages).values(values);
        const rawId = result.insertId;
        const messageId = Number(rawId);
        if (!messageId || isNaN(messageId)) {
          throw new Error("Falha ao obter ID da mensagem broadcast");
        }

        // Inserir membros em lote usando Drizzle
        const batchSize = 1000;
        for (let i = 0; i < members.length; i += batchSize) {
          const batch = members.slice(i, i + batchSize);
          const valuesToInsert = batch.map(m => ({
            broadcastMessageId: messageId,
            customerId: m.customerId,
            phone: normalize(m.phone),
            status: "pending",
            errorMessage: null,
            deliveredAt: null,
            readAt: null,
            sentAt: null,
          }));

          await db.insert(broadcastMembersSent).values(valuesToInsert);
        }

        await db.update(broadcastLists)
          .set({ lastSentAt: new Date() })
          .where(eq(broadcastLists.id, input.listId));

        // Processar broadcast diretamente (sem depender de Redis/Bull)
        // Bull queue está desabilitada até Redis ser configurado
        const { processBroadcastMessage } = await import('./workers/broadcast-sender.js');
        // Processar em background para não bloquear a resposta HTTP
        setImmediate(() => {
          processBroadcastMessage(messageId).catch((e: unknown) =>
            console.error('[Broadcast] processBroadcastMessage error:', e.message)
          );
        });

        return { messageId: Number(messageId), status: 'queued' };
      } catch (error) {
        console.error('[BroadcastSendMessage] Error:', error);
        throw error;
      }
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

      const result: unknown = { total, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
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
