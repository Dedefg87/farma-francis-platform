import { z } from "zod";
import { and, eq, or, desc, inArray, like } from "drizzle-orm";
import { conversations, customers, conversationMessages } from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { generatePhoneVariants, formatPhoneBR, findConversationByPhone } from "./utils/phone";
import { sql } from "drizzle-orm";
import {
  Conversation,
  ConversationMessage,
  ConversationStatus,
  ConversationChannel,
} from "@shared/types/conversations";
import { closeConversation } from "./chatbot";

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
    customerAvatar: row.customerAvatar || (row as any).photoUrl || undefined,
  };
}

export const conversationsRouter = router({
  /**
   * Lista TODAS as conversas (sem filtro de status) para o CRM
   */
  listAll: protectedProcedure
    .query(async ({ ctx }): Promise<Conversation[]> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        .orderBy(desc(conversations.lastMessageAt));

      return rows.map(mapConversation);
    }),

  /**
   * Lista contatos recentes para encaminhamento de mensagens.
   * Retorna clientes únicos com última interação, telefone e canal.
   */
  recentContacts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }): Promise<Array<{
      customerId: number;
      customerName: string;
      customerPhone: string;
      channel: string;
      lastMessageAt: Date | null;
      lastMessagePreview: string | null;
    }>> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit || 20;

      // Buscar conversas recentes agrupadas por cliente (pegar a mais recente de cada cliente)
      const [rows] = await db.execute(sql`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          conv.channel,
          conv.last_message_at,
          (
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = conv.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          ) as last_message_preview
        FROM conversations conv
        INNER JOIN customers c ON conv.customer_id = c.id
        WHERE conv.status IN ('open', 'assigned', 'closed')
          AND c.phone IS NOT NULL
          AND c.phone != ''
        ORDER BY conv.last_message_at DESC
        LIMIT ${limit}
      `);

      const contacts = (rows as any[]).map(row => ({
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        channel: row.channel,
        lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
        lastMessagePreview: row.last_message_preview,
      }));

      // Deduplicar por telefone (manter o mais recente)
      const uniqueContacts = new Map();
      for (const contact of contacts) {
        const key = contact.customerPhone.replace(/\D/g, '').slice(-8); // últimos 8 dígitos
        if (!uniqueContacts.has(key) || 
            (contact.lastMessageAt && uniqueContacts.get(key).lastMessageAt && 
             contact.lastMessageAt > uniqueContacts.get(key).lastMessageAt)) {
          uniqueContacts.set(key, contact);
        }
      }

      return Array.from(uniqueContacts.values())
        .sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
        })
        .slice(0, limit);
    }),

  /**
   * Lista todas as conversas atribuídas ao agente logado.
   */
  list: protectedProcedure
    .query(async ({ ctx }): Promise<Conversation[]> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Todos veem todas as conversas ativas — qualquer agente pode atender qualquer cliente
      // Antes: agents só viam suas próprias conversas — mudou porque conversas podem ser reatribuídas
      const conditions = inArray(conversations.status, ["open", "assigned"]);

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
      console.log('[Conversations] listActive called | ctx.user:', ctx.user?.name, '| role:', ctx.user?.role);
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Todos veem todas as conversas ativas — qualquer agente pode atender qualquer cliente
      const conditions = inArray(conversations.status, ["open", "assigned"]);

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
        customerId: z.string().optional(), // Opcional — se não fornecido, busca/cria pelo telefone
        customerPhone: z.string(), // Obrigatório — usado pra buscar ou criar cliente
        customerName: z.string().optional(),
        channel: z.enum(["whatsapp", "instagram", "telegram", "webchat", "email", "sms", "facebook"]),
        queueId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<Conversation> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      let numericCustomerId: number;
      let resolvedName = input.customerName || '';
      let resolvedPhone = input.customerPhone || '';

      console.log('[conversations.create] Input:', JSON.stringify({ customerId: input.customerId, customerPhone: input.customerPhone, customerName: input.customerName, channel: input.channel }));

      // Se customerId foi fornecido, usar diretamente
      if (input.customerId) {
        numericCustomerId = parseInt(input.customerId, 10);
        console.log('[conversations.create] Using provided customerId:', numericCustomerId);
      } else {
        // Buscar cliente existente pelo telefone (matching flexível com variantes)
        const phoneVariants = generatePhoneVariants(resolvedPhone);
        console.log('[conversations.create] Phone variants:', phoneVariants);
        let foundCustomer: unknown = null;

        if (phoneVariants.length > 0) {
          const phoneConditions = phoneVariants.map(v => like(customers.phone, `%${v.replace(/[^0-9]/g, '')}%`));
          const phoneDigits = resolvedPhone.replace(/\D/g, '');
          if (phoneDigits.length >= 8) {
            phoneConditions.push(like(customers.phone, `%${phoneDigits.slice(-8)}%`));
          }

          const candidates = await db
            .select()
            .from(customers)
            .where(or(...phoneConditions))
            .limit(5);

          console.log('[conversations.create] Found candidates:', candidates.length, candidates.map((c: unknown) => ({ id: c.id, name: c.name, phone: c.phone })));

          if (candidates.length > 0) {
            foundCustomer = candidates[0];
          }
        }

        if (foundCustomer) {
          numericCustomerId = foundCustomer.id;
          resolvedName = foundCustomer.name || resolvedName;
          resolvedPhone = foundCustomer.phone || resolvedPhone;
          console.log('[conversations.create] Matched existing customer:', { id: numericCustomerId, name: resolvedName, phone: resolvedPhone });
        } else {
          const normalizedPhone = formatPhoneBR(resolvedPhone);
          const insertResult = await db
            .insert(customers)
            .values({
              name: resolvedName || 'Cliente',
              phone: normalizedPhone || resolvedPhone,
            });

          const rawId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
          numericCustomerId = Number(rawId) || 0;

          if (!numericCustomerId) {
            const [newCustomer] = await db
              .select()
              .from(customers)
              .orderBy(desc(customers.id))
              .limit(1);
            numericCustomerId = newCustomer?.id || 0;
          }
          console.log('[conversations.create] Created new customer:', numericCustomerId);
        }
      }

      if (!numericCustomerId) {
        throw new Error("Não foi possível encontrar ou criar o cliente");
      }

      // 🔥 BUSCAR conversa existente por TELEFONE (últimos 8 dígitos)
      // Resolve o problema de clientes duplicados com formatos diferentes de telefone
      const found = await findConversationByPhone(db, resolvedPhone, conversations, customers);

      console.log('[conversations.create] findConversationByPhone result:', found);

      if (found) {
        // Buscar a conversa completa
        const [existingConversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, found.conversationId))
          .limit(1);

        if (existingConversation) {
          // Usar o customerId correto (pode ser diferente do encontrado inicialmente)
          numericCustomerId = found.customerId;

          if (existingConversation.status === 'open' || existingConversation.status === 'assigned') {
            if (!existingConversation.assignedTo) {
              await db
                .update(conversations)
                .set({ assignedTo: ctx.user.id })
                .where(eq(conversations.id, existingConversation.id));
              const [updated] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, existingConversation.id));
              console.log('[conversations.create] Assigned to agent, returning:', updated.id);
              return mapConversation(updated);
            }
            console.log('[conversations.create] Returning existing active conversation:', existingConversation.id);
            return mapConversation(existingConversation);
          }

          // Conversa fechada — reabrir apenas se NÃO foi encerrada com motivo obrigatório
          // venda, orcamento e engano enviam mensagem de encerramento e NAO devem ser reabertas automaticamente
          const canReopen = true; // reabertura manual pelo atendente: sempre permitida (acao explicita)
          if (canReopen) {
            await db
              .update(conversations)
              .set({
                status: "open",
                assignedTo: ctx.user.id,
                unreadCount: 0,
                lastMessageAt: now,
                ...(resolvedName ? { customerName: resolvedName } : {}),
                ...(resolvedPhone ? { customerPhone: resolvedPhone } : {}),
              })
              .where(eq(conversations.id, existingConversation.id));

            const [reopened] = await db
              .select()
              .from(conversations)
              .where(eq(conversations.id, existingConversation.id));

            console.log('[conversations.create] Reopened closed conversation:', reopened.id, '(had messages preserved)');
            return mapConversation(reopened);
          } else {
            // Conversa fechada com motivo obrigatório (ex: venda → pesquisa) — NÃO reabrir automaticamente
            // Retornar a conversa existente mas manter fechada (o cliente deve responder a pesquisa)
            console.log('[conversations.create] Conversation closed with mandatory reason, not reopening:', existingConversation.closeReason);
            return mapConversation(existingConversation);
          }
        }
      }

      const insertValues: unknown = {
        customerId: numericCustomerId,
        channel: input.channel,
        status: "open",
        openedAt: now,
        lastMessageAt: now,
        unreadCount: 0,
        assignedTo: ctx.user.id,
      };

      if (resolvedName) insertValues.customerName = resolvedName;
      if (resolvedPhone) insertValues.customerPhone = resolvedPhone;
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

      const updates: unknown = {
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

        console.log(`[conversations.close] Closing conversation ${input.conversationId} with reason ${input.reason}`);

        await db
          .update(conversations)
          .set({ status: "closed", closeReason: input.reason, closedAt: new Date() })
          .where(eq(conversations.id, input.conversationId));

        console.log(`[conversations.close] Conversation ${input.conversationId} closed successfully`);

        // Chamar a função do chatbot para enviar mensagem de fechamento/pesquisa
        try {
          await closeConversation(input.conversationId, input.reason, true); // skipDbUpdate=true pois já atualizamos acima
        } catch (chatbotError) {
          console.error("[conversations.close] Error calling chatbot closeConversation:", chatbotError);
          // Não falha o request principal se o chatbot falhar
        }

        return { success: true };
      }),

    /**
     * Exclui uma conversa permanentemente.
     */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // O CASCADE no banco deve cuidar das mensagens e tags
      await db
        .delete(conversations)
        .where(eq(conversations.id, input.id));

      return { success: true };
    }),

  /**
   * Encerra todas as conversas abertas e atribuídas.
   */
  closeAll: protectedProcedure
    .mutation(async (): Promise<{ count: number }> => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const now = new Date();
      const result = await db.execute(
        sql`UPDATE conversations SET status = 'closed', closed_at = ${now} WHERE status IN ('open', 'assigned')`
      );
      
      return { count: result.affectedRows || 0 };
    }),
});


