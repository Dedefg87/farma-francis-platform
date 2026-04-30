import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { conversations, customers, users, conversationMessages } from '../drizzle/schema';
import { like, eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';

/**
 * Mapeia status da conversa para status do ticket
 */
function mapStatusToTicket(status: string): string {
  switch (status) {
    case 'open': return 'open';
    case 'assigned': return 'in_progress';
    case 'closed': return 'resolved';
    default: return 'open';
  }
}

/**
 * Gera ticketNumber baseado no ID da conversa
 */
function generateTicketNumber(conversationId: number): string {
  return `TKT-${conversationId.toString().padStart(6, '0')}`;
}

export const ticketsRouter = router({
  // Listar tickets (baseado em conversas reais)
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
        customerId: z.number().optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { page, pageSize, search, status, priority, assignedTo, customerId } = input || {};
      const offset = ((page || 1) - 1) * (pageSize || 20);

      // Build where clause para conversations
      const conditions: any[] = [];
      
      if (search) {
        conditions.push(
          or(
            like(conversations.customerName, `%${search}%`),
            like(conversations.customerPhone, `%${search}%`)
          )
        );
      }
      
      // Mapear status do ticket para status da conversa
      if (status) {
        const conversationStatus = status === 'in_progress' ? 'assigned' :
                                 status === 'resolved' ? 'closed' :
                                 status === 'open' ? 'open' : status;
        conditions.push(eq(conversations.status, conversationStatus));
      }
      
      if (assignedTo !== undefined) {
        conditions.push(eq(conversations.assignedTo, assignedTo));
      }
      
      if (customerId !== undefined) {
        conditions.push(eq(conversations.customerId, customerId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Fetch conversations com joins
      const results = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          lastMessageAt: conversations.lastMessageAt,
          closedAt: conversations.closedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          },
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          // Buscar última mensagem como subject
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
        .leftJoin(users, eq(conversations.assignedTo, users.id))
        .where(whereClause)
        .orderBy(desc(conversations.lastMessageAt))
        .limit(pageSize || 20)
        .offset(offset);

      // Transformar para formato de ticket
      const tickets = results.map(row => ({
        id: row.id,
        ticketNumber: generateTicketNumber(row.id),
        customerId: row.customerId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        subject: row.lastMessage || 'Sem mensagem',
        description: row.lastMessage || '',
        status: mapStatusToTicket(row.status),
        priority: 'medium', // padrão, já que conversations não tem priority
        category: null,
        channel: row.channel,
        assignedTo: row.assignedTo,
        slaDeadline: null,
        resolvedAt: row.status === 'closed' ? row.closedAt : null,
        closedAt: row.closedAt,
        timeSpentMinutes: null,
        createdBy: null,
        createdAt: row.openedAt,
        updatedAt: row.lastMessageAt,
        customer: row.customer,
        assignedAgent: row.assignedAgent,
      }));

      return {
        data: tickets,
        pagination: {
          page: page || 1,
          pageSize: pageSize || 20,
          total,
          totalPages: Math.ceil(total / (pageSize || 20)),
        },
      };
    }),

  // Buscar ticket por ID (conversa real)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          openedAt: conversations.openedAt,
          lastMessageAt: conversations.lastMessageAt,
          closedAt: conversations.closedAt,
          unreadCount: conversations.unreadCount,
          customer: {
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          },
          assignedAgent: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .leftJoin(users, eq(conversations.assignedTo, users.id))
        .where(eq(conversations.id, input.id))
        .limit(1);

      if (!result || result.length === 0) {
        throw new Error('Ticket not found');
      }

      const row = result[0];

      // Buscar última mensagem
      const lastMessage = await db
        .select({ content: conversationMessages.content })
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, input.id))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(1);

      return {
        id: row.id,
        ticketNumber: generateTicketNumber(row.id),
        customerId: row.customerId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        subject: lastMessage[0]?.content || 'Sem mensagem',
        description: lastMessage[0]?.content || '',
        status: mapStatusToTicket(row.status),
        priority: 'medium',
        category: null,
        channel: row.channel,
        assignedTo: row.assignedTo,
        slaDeadline: null,
        resolvedAt: row.status === 'closed' ? row.closedAt : null,
        closedAt: row.closedAt,
        timeSpentMinutes: null,
        createdBy: null,
        createdAt: row.openedAt,
        updatedAt: row.lastMessageAt,
        customer: row.customer,
        assignedAgent: row.assignedAgent,
      };
    }),

  // Estatísticas baseadas em conversas reais
  stats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Count by status (mapeando para ticket status)
      const statusCounts = await db
        .select({
          status: conversations.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(conversations)
        .groupBy(conversations.status);

      // Total counts
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .limit(1);
      const total = Number(totalResult[0].count) || 0;

      // Open tickets (conversations open + assigned)
      const openResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .where(sql`status IN ('open', 'assigned')`)
        .limit(1);
      const open = Number(openResult[0].count) || 0;

      // In progress tickets (assigned)
      const inProgressResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .where(eq(conversations.status, 'assigned'))
        .limit(1);
      const inProgress = Number(inProgressResult[0].count) || 0;

      // Pending tickets (não existe equivalente direto, usar 0)
      const pending = 0;

      // Resolved tickets (closed)
      const resolvedResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .where(eq(conversations.status, 'closed'))
        .limit(1);
      const resolved = Number(resolvedResult[0].count) || 0;

      return {
        total,
        open,
        inProgress,
        pending,
        resolved,
        byStatus: statusCounts.map(s => ({
          status: mapStatusToTicket(s.status),
          count: Number(s.count),
        })),
        byPriority: [], // conversations não tem priority
      };
    }),

  // Placeholder: criar ticket (não aplicável, tickets vêm de conversas)
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        subject: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        category: z.string().optional(),
        channel: z.string().optional(),
        assignedTo: z.number().optional(),
        slaDeadline: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Não aplicável: tickets são gerados automaticamente de conversas
      throw new Error('Tickets são criados automaticamente a partir de conversas reais');
    }),

  // Placeholder: atualizar ticket
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Mapear ticket status para conversation status
      const conversationStatus = input.status === 'in_progress' ? 'assigned' :
                                input.status === 'resolved' ? 'closed' :
                                input.status === 'open' ? 'open' : undefined;

      if (conversationStatus) {
        await db.update(conversations)
          .set({ status: conversationStatus, updatedAt: sql`NOW()` })
          .where(eq(conversations.id, input.id));
      }

      return { success: true };
    }),

  // Placeholder: deletar ticket
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Não aplicável: não deletamos conversas, apenas fechamos
      throw new Error('Use update status para fechar uma conversa/ticket');
    }),
});
