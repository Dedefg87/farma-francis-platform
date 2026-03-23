import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  customers,
} from "../drizzle/schema";
import { eq, asc, desc, sql, and, or } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { formatPhoneBR, generatePhoneVariants } from "./utils/phone";

/**
 * Broadcast Lists Router
 * Gerencia listas de transmissão e envio de mensagens em massa via WhatsApp
 */
export const broadcastRouter = router({
  /**
   * Listar todas as listas de broadcast
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const offset = (input.page - 1) * input.limit;
      const lists = await db.select({
        id: broadcastLists.id,
        name: broadcastLists.name,
        description: broadcastLists.description,
        memberCount: sql`COUNT(DISTINCT blm.customer_id)`,
        lastSentAt: broadcastLists.lastSentAt,
        createdAt: broadcastLists.createdAt,
      }).from(broadcastLists).leftJoin(broadcastListMembers, eq(broadcastLists.id, broadcastListMembers.listId)).groupBy(broadcastLists.id).orderBy(desc(broadcastLists.createdAt)).limit(input.limit).offset(offset);
      const [{ total }] = await db.select({ total: sql`COUNT(*)` }).from(broadcastLists);
      return { lists, pagination: { page: input.page, limit: input.limit, total: Number(total), totalPages: Math.ceil(Number(total) / input.limit) } };
    }),

      // Buscar lista
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

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      // Buscar membros da lista
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
        members: members.map(m => ({
          ...m,
          customer: m.customer || null,
        })),
      };
    }),

  /**
   * Criar nova lista de broadcast
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Insert manual via SQL para evitar bug do Drizzle com default
      const result = await db.execute(
        sql`
          INSERT INTO broadcast_lists (name, description, created_by, created_at, updated_at)
          VALUES (${input.name}, ${input.description || null}, ${ctx.user.id}, NOW(), NOW())
        `
      );

      // Pegar o ID inserido
      const insertId = (result as any).insertId || (result as any).ids?.[0];

      return { id: Number(insertId) };
    }),
  /**
   * Deletar lista de broadcast
   */
  delete: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Primeiro deletar mensagens e membros (cascade deve funcionar, mas garantimos)
      await db
        .delete(broadcastMembersSent)
        .where(
          sql`message_id IN (SELECT id FROM ${broadcastMessages} WHERE list_id = ${input.listId})`
        );

      await db
        .delete(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId));

      await db
        .delete(broadcastListMembers)
        .where(eq(broadcastListMembers.listId, input.listId));

      await db
        .delete(broadcastLists)
        .where(eq(broadcastLists.id, input.listId));

      return { success: true };
    }),

  /**
   * Adicionar cliente à lista
   */
  addMember: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      customerId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se já existe
      const existing = await db
        .select()
        .from(broadcastListMembers)
        .where(
          and(
            eq(broadcastListMembers.listId, input.listId),
            eq(broadcastListMembers.customerId, input.customerId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Cliente já está na lista");
      }

      await db
        .insert(broadcastListMembers)
        .values({
          listId: input.listId,
          customerId: input.customerId,
          addedAt: new Date(),
        });

      return { success: true };
    }),

  /**
   * Remover cliente da lista
   */
  removeMember: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      customerId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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

  /**
   * Buscar clientes para adicionar à lista
   */
  searchCustomers: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      excludeListId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const searchTerm = `%${input.query}%`;
      const phoneVariants = generatePhoneVariants(input.query);

      const whereClause = or(
        sql`LOWER(${customers.name}) LIKE LOWER(${searchTerm})`,
        sql`${customers.phone} LIKE ${searchTerm}`,
        sql`${customers.phone} IN (${sql.join(phoneVariants.map(v => sql`${v}`), sql`, `)})`
      );

      const customersList = await db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          photoUrl: customers.photoUrl,
        })
        .from(customers)
        .where(whereClause)
        .limit(20);

      // Se excludeListId fornecido, filtrar já adicionados
      if (input.excludeListId) {
        const [members] = await db
          .select({ customerId: broadcastListMembers.customerId })
          .from(broadcastListMembers)
          .where(eq(broadcastListMembers.listId, input.excludeListId));

        const excludedIds = new Set(members.map(m => m.customerId));
        return customersList.filter(c => !excludedIds.has(c.id));
      }

      return customersList;
    }),

  /**
   * Enviar mensagem broadcast para uma lista
   */
  sendMessage: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      message: z.string().min(1).max(4000),
      fileUrl: z.string().url().optional().nullable(),
      fileName: z.string().optional().nullable(),
      fileType: z.string().optional().nullable(),
      fileSize: z.number().int().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Buscar lista e membros
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(eq(broadcastLists.id, input.listId))
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      const members = await db
        .select({ customerId: broadcastListMembers.customerId })
        .from(broadcastListMembers)
        .where(eq(broadcastListMembers.listId, input.listId));

      if (members.length === 0) {
        throw new Error("Lista vazia - adicione membros antes de enviar");
      }

      // 2. Criar mensagem broadcast
      const messageResult = await db
        .insert(broadcastMessages)
        .values({
          listId: input.listId,
          content: input.message,
          fileUrl: input.fileUrl || null,
          fileName: input.fileName || null,
          fileType: input.fileType || null,
          fileSize: input.fileSize || null,
          sentBy: ctx.user.id,
          sentAt: new Date(),
          status: "pending",
          successfulSends: 0,
          failedSends: 0,
        })
        .$returningId();

      const messageId = messageResult[0].id;

      // 3. Disparar envio assíncrono (usar fila ou processamento background)
      // Por simplicidade, vamos inserir registros de entrega e disparar webhook manual
      // Em produção, isso deve ser uma fila (BullMQ/Kafka)
      for (const member of members) {
        await db
          .insert(broadcastMembersSent)
          .values({
            messageId,
            customerId: member.customerId,
            phone: sql`(SELECT phone FROM customers WHERE id = ${member.customerId})`,
            status: "pending",
            error: null,
            sentAt: null,
          })
          .onDuplicateKeyUpdate({
            status: "pending",
            error: null,
            sentAt: null,
          });
      }

      // 4. Atualizar contadores
      await db
        .update(broadcastMessages)
        .set({
          successfulSends: 0,
          failedSends: members.length,
          status: "sending",
        })
        .where(eq(broadcastMessages.id, messageId));

      // 5. Atualizar lastSentAt da lista
      await db
        .update(broadcastLists)
        .set({ lastSentAt: new Date() })
        .where(eq(broadcastLists.id, input.listId));

      // TODO: Disparar processamento assíncrono real (worker/fila)
      // Por ora, o frontend pode poll por status

      return {
        messageId,
        totalRecipients: members.length,
        status: "sending",
      };
    }),

  /**
   * Estatísticas de uma mensagem broadcast
   */
  getMessageStats: protectedProcedure
    .input(z.object({
      messageId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [message] = await db
        .select({
          id: broadcastMessages.id,
          content: broadcastMessages.content,
          fileUrl: broadcastMessages.fileUrl,
          fileName: broadcastMessages.fileName,
          fileType: broadcastMessages.fileType,
          fileSize: broadcastMessages.fileSize,
          sentAt: broadcastMessages.sentAt,
          status: broadcastMessages.status,
          successfulSends: broadcastMessages.successfulSends,
          failedSends: broadcastMessages.failedSends,
        })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.id, input.messageId))
        .limit(1);

      if (!message) {
        throw new Error("Mensagem não encontrada");
      }

      // Contar por status
      const [stats] = await db
        .select({
          pending: sql<number>`COUNT(*) FILTER (WHERE ${broadcastMembersSent.status} = 'pending')`.as("pending"),
          sent: sql<number>`COUNT(*) FILTER (WHERE ${broadcastMembersSent.status} = 'sent')`.as("sent"),
          failed: sql<number>`COUNT(*) FILTER (WHERE ${broadcastMembersSent.status} = 'failed')`.as("failed"),
        })
        .from(broadcastMembersSent)
        .where(eq(broadcastMembersSent.messageId, input.messageId))
        .limit(1);

      return {
        ...message,
        stats: {
          pending: Number(stats.pending || 0),
          sent: Number(stats.sent || 0),
          failed: Number(stats.failed || 0),
        },
      };
    }),

  /**
   * Lista de mensagens enviadas de uma lista
   */
  listMessages: protectedProcedure
    .input(z.object({
      listId: z.number().int().positive(),
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;

      const messages = await db
        .select({
          id: broadcastMessages.id,
          content: broadcastMessages.content,
          fileUrl: broadcastMessages.fileUrl,
          fileName: broadcastMessages.fileName,
          fileType: broadcastMessages.fileType,
          sentAt: broadcastMessages.sentAt,
          status: broadcastMessages.status,
          successfulSends: broadcastMessages.successfulSends,
          failedSends: broadcastMessages.failedSends,
        })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId))
        .orderBy(desc(broadcastMessages.sentAt))
        .limit(input.limit)
        .offset(offset);

      const [[{ total }]] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId));

      return {
        messages,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / input.limit),
        },
      };
    }),
});

export type BroadcastRouter = typeof broadcastRouter;
