import { z } from "zod";
import { and, eq, or, desc, inArray } from "drizzle-orm";
import { conversations, customers, conversationMessages } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import {
  Conversation,
  ConversationMessage,
  ConversationStatus,
  ConversationChannel,
} from "@shared/types/conversations";

/**
 * Helper: Converte uma row do Drizzle para o tipo Conversation compartilhado.
 * - Mapeia status do Drizzle ('open','assigned','closed') para ConversationStatus.
 * - Converte tipos numéricos para string onde necessário.
 * - Preenche campos ausentes com valores default.
 */
function mapConversation(row: any): Conversation {
  // Mapeia status do banco para o enum compartilhado
  const statusMap: Record<string, ConversationStatus> = {
    open: ConversationStatus.OPEN,
    assigned: ConversationStatus.PENDING, // 'assigned' mapeia para PENDING
    closed: ConversationStatus.CLOSED,
  };
  const status =
    statusMap[row.status] ||
    (row.status === "open"
      ? ConversationStatus.OPEN
      : row.status === "closed"
      ? ConversationStatus.CLOSED
      : ConversationStatus.PENDING);

  return {
    id: String(row.id),
    externalId: String(row.id), // fallback; idealmente haveria uma coluna externalId
    channel: row.channel as ConversationChannel,
    channelReference: "", // não existe no schema atual
    customerId: String(row.customerId),
    assignedAgentId: row.assignedTo ? String(row.assignedTo) : null,
    status,
    subject: null,
    priority: "normal",
    tags: [],
    metadata: {},
    createdAt: row.openedAt instanceof Date ? row.openedAt.toISOString() : new Date(row.openedAt).toISOString(),
    updatedAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.toISOString() : new Date(row.lastMessageAt).toISOString(),
    closedAt: row.closedAt ? (row.closedAt instanceof Date ? row.closedAt.toISOString() : new Date(row.closedAt).toISOString()) : null,
    lastMessageAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.toISOString() : new Date(row.lastMessageAt).toISOString(),
    lastMessagePreview: row.lastMessage || null,
    unreadCount: row.unreadCount,
    // Campos extras do cliente
    customerName: row.customerName || undefined,
    customerPhone: row.customerPhone || undefined,
    customerAvatar: row.customerAvatar || undefined,
  };
}

export const conversationsRouter = router({
  /**
   * Lista todas as conversas atribuídas ao agente logado.
   */
  list: protectedProcedure
    .query(async ({ ctx }): Promise<Conversation[]> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Admins veem todas; agentes comuns veem só as suas
      const isUser = (ctx as any)?.user?.role === 'user';
      const conditions = isUser
        ? eq(conversations.assignedTo, ctx.user.id)
        : undefined;

      const rows = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          queueId: conversations.queueId,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          closeReason: conversations.closeReason,
          lastMessageAt: conversations.lastMessageAt,
          unreadCount: conversations.unreadCount,
          customerAvatar: customers.photoUrl,
          lastMessage: sql<string>`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as('lastMessage'),
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .where(conditions)
        .orderBy(desc(conversations.lastMessageAt));

      return rows.map(mapConversation);
    }),

  /**
   * Lista apenas conversas abertas ou atribuídas (não fechadas) para o agente.
   */
  listActive: protectedProcedure
    .query(async ({ ctx }): Promise<Conversation[]> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Admins veem todas as conversas abertas (incluindo sem agente); agentes comuns veem só as suas
      const isUser = (ctx as any)?.user?.role === 'user';
      const conditions = isUser
        ? and(
            eq(conversations.assignedTo, ctx.user.id),
            inArray(conversations.status, ["open", "assigned"])
          )
        : inArray(conversations.status, ["open", "assigned"]);

      const rows = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          queueId: conversations.queueId,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          closeReason: conversations.closeReason,
          lastMessageAt: conversations.lastMessageAt,
          unreadCount: conversations.unreadCount,
          customerAvatar: customers.photoUrl,
          lastMessage: sql<string>`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as('lastMessage'),
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .where(conditions)
        .orderBy(desc(conversations.lastMessageAt));

      return rows.map(mapConversation);
    }),

  /**
   * Obtém uma conversa específica por ID (apenas se atribuída ao agente).
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<Conversation | null> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;

      const rows = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          queueId: conversations.queueId,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          closedAt: conversations.closedAt,
          closeReason: conversations.closeReason,
          lastMessageAt: conversations.lastMessageAt,
          unreadCount: conversations.unreadCount,
          customerAvatar: customers.photoUrl,
          lastMessage: sql<string>`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as('lastMessage'),
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .where(eq(conversations.id, numericId))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      // Admins podem ver qualquer conversa; agentes só veem as suas
      const isUser = (ctx as any)?.user?.role === 'user';
      if (isUser && row.assignedTo !== ctx.user.id) {
        return null;
      }

      return mapConversation(row);
    }),

  /**
   * Cria uma nova conversa.
   */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        channel: z.enum(["whatsapp", "instagram", "telegram", "webchat", "email", "sms", "facebook"]),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        queueId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<Conversation> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      const insertValues: any = {
        customerId: parseInt(input.customerId, 10),
        channel: input.channel,
        status: "open",
        openedAt: now,
        lastMessageAt: now,
        unreadCount: 0,
        assignedTo: ctx.user.id, // Atribui automaticamente ao criador
      };

      if (input.customerName) insertValues.customerName = input.customerName;
      if (input.customerPhone) insertValues.customerPhone = input.customerPhone;
      if (input.queueId) insertValues.queueId = parseInt(input.queueId, 10);

      const result = await db
        .insert(conversations)
        .values(insertValues)
        .$returningId();

      const [newRow] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, result[0].id));

      return mapConversation(newRow);
    }),

  /**
   * Atualiza uma conversa existente.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "assigned", "closed"]).optional(),
        assignedTo: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        queueId: z.string().optional(),
        closeReason: z.enum(["venda", "orcamento", "conversa_anterior", "engano"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) {
        throw new Error("ID inválido");
      }

      const updates: any = {
        updatedAt: new Date(),
      };

      if (input.status !== undefined) {
        updates.status = input.status;
      }
      if (input.assignedTo !== undefined) {
        const agentId = parseInt(input.assignedTo, 10);
        if (!isNaN(agentId)) {
          updates.assignedTo = agentId;
        }
      }
      if (input.customerName !== undefined) {
        updates.customerName = input.customerName;
      }
      if (input.customerPhone !== undefined) {
        updates.customerPhone = input.customerPhone;
      }
      if (input.queueId !== undefined) {
        const qId = parseInt(input.queueId, 10);
        if (!isNaN(qId)) {
          updates.queueId = qId;
        }
      }
      if (input.closeReason !== undefined) {
        updates.closeReason = input.closeReason;
      }

      // Se status for 'closed' e ainda não há closedAt, define
      if (updates.status === "closed") {
        updates.closedAt = new Date();
      }

      await db.update(conversations).set(updates).where(eq(conversations.id, numericId));

      return { success: true };
    }),

  /**
   * Atribui uma conversa a um agente (normalmente o próprio agente logado).
   */
  assign: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(conversations)
        .set({ assignedTo: ctx.user.id, status: "open" })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * Fecha uma conversa com um motivo.
   */
  close: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        reason: z.enum(["venda", "orcamento", "conversa_anterior", "engano"]),
      })
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(conversations)
        .set({ status: "closed", closeReason: input.reason, closedAt: new Date() })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * List conversations assigned to the current agent
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["open", "assigned", "closed"]).optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      console.log(`[conversations.list] Fetching conversations for agent ${ctx.user?.id}`);

      let query = db
        .select({
          id: conversations.id,
          channel: conversations.channel,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          lastMessageAt: conversations.lastMessageAt,
          lastMessage: sql<string>`(
            SELECT content
            FROM conversation_messages cm
            WHERE cm.conversation_id = conversations.id
            ORDER BY cm.created_at DESC
            LIMIT 1
          )`,
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .where(or(eq(conversations.assignedTo, ctx.user!.id), eq(conversations.status, "open")))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(input.limit);

      if (input.status) {
        query = query.where(eq(conversations.status, input.status)) as any;
      }

      const results = await query;
      console.log(`[conversations.list] Found ${results.length} conversations for agent ${ctx.user?.id}`);

      return results.map(row => ({
        id: String(row.id),
        channel: row.channel,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        status: row.status,
        assignedTo: row.assignedTo,
        openedAt: row.openedAt?.toISOString(),
        lastMessageAt: row.lastMessageAt?.toISOString(),
        lastMessage: row.lastMessage,
      }));
    }),
});
