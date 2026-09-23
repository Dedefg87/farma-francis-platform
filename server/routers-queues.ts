import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { queues, queueAgents, conversations, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Queue, RoutingRule, RoutingCondition, RoutingAction } from "../../shared/types/queues";
import { ConversationChannel } from "../../shared/types/conversations";

// Função auxiliar para transformar registro do Drizzle no tipo Queue compartilhado
function toQueueType(
  dbQueue: typeof queues.$inferSelect,
  stats: {
    agentsOnline: number;
    waiting: number;
    active: number;
  },
  assignedAgents: string[] = []
): Queue {
  return {
    id: String(dbQueue.id),
    name: dbQueue.name,
    description: dbQueue.description || null,
    channel: dbQueue.channel as ConversationChannel,
    maxWaitTime: 300, // valor padrão de 5 minutos (não existe no schema atual)
    maxSize: 0, // ilimitado por padrão (não existe no schema)
    currentSize: stats.waiting + stats.active, // conversas atualmente na fila
    waitingCount: stats.waiting,
    assignedAgents: assignedAgents,
    routingRules: [], // não implementado no schema atual
    isActive: dbQueue.status === 'active',
    createdAt: dbQueue.createdAt.toISOString(),
    updatedAt: dbQueue.updatedAt.toISOString(),
  };
}

// Sobrecarga: quando temos apenas o registro base (sem stats)
//临到临 （注：原文如此，可能表示“overload”)
function toQueueTypeBase(dbQueue: typeof queues.$inferSelect): Queue {
  return toQueueType(dbQueue, { agentsOnline: 0, waiting: 0, active: 0 }, []);
}

export const queuesRouter = router({
  // Listar filas com contadores de conversas aguardando
  // Retorna array de Queue (com waitingCount preenchido)
  listWithCounts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const allQueues = await db.select().from(queues).where(eq(queues.status, 'active'));

    const queuesWithCounts: Queue[] = await Promise.all(
      allQueues.map(async (queue) => {
        const [waitingResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, 'open')
            )
          );

        const waiting = Number(waitingResult?.count || 0);

        // Buscar agentes ativos na fila (para assignedAgents)
        const agentsRows = await db
          .select({ agentId: queueAgents.agentId })
          .from(queueAgents)
          .where(
            and(
              eq(queueAgents.queueId, queue.id),
              eq(queueAgents.isActive, 1)
            )
          );
        const assignedAgents = agentsRows.map(row => String(row.agentId));

        // Contar conversas em atendimento (assigned)
        const [activeResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, 'assigned')
            )
          );
        const active = Number(activeResult?.count || 0);

        const stats = {
          agentsOnline: assignedAgents.length,
          waiting,
          active,
        };

        return toQueueType(queue, stats, assignedAgents);
      })
    );

    return queuesWithCounts;
  }),

  // Puxar próxima conversa de uma fila
  pullConversation: protectedProcedure
    .input(
      z.object({
        queueId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Buscar próxima conversa aguardando na fila
      const [nextConversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.queueId, input.queueId),
            eq(conversations.status, 'open')
          )
        )
        .orderBy(conversations.openedAt)
        .limit(1);

      if (!nextConversation) {
        throw new Error('Nenhuma conversa disponível nesta fila');
      }

      // Atribuir conversa ao agente
      await db
        .update(conversations)
        .set({
          assignedTo: ctx.user.id,
          status: 'assigned',
        })
        .where(eq(conversations.id, nextConversation.id));

      return { success: true, conversationId: nextConversation.id };
    }),
  // Puxar da sala de espera: conversa aberta mais antiga sem dono (mesmo sem fila)
  claimUnassignedConversation: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [next] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.status, 'open'),
            sql`${conversations.assignedTo} IS NULL`
          )
        )
        .orderBy(conversations.openedAt)
        .limit(1);
      if (!next) throw new Error('Nenhuma conversa aguardando na sala de espera');
      await db.update(conversations).set({ assignedTo: ctx.user.id, status: 'assigned' }).where(eq(conversations.id, next.id));
      return { success: true, conversationId: next.id };
    }),

  // Transferir conversa para outro agente
  transferConversation: protectedProcedure
    .input(z.object({ conversationId: z.number(), targetAgentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [exists] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, input.conversationId)).limit(1);
      if (!exists) throw new Error('Conversa nao encontrada');
      await db.update(conversations).set({ assignedTo: input.targetAgentId, status: 'assigned' }).where(eq(conversations.id, input.conversationId));
      return { success: true, conversationId: input.conversationId };
    }),

  // Listar agentes (role user) para transferencia
  listTransferAgents: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [rows] = await db.execute(sql`SELECT id, name FROM users WHERE role = 'user' ORDER BY name ASC`);
      return (rows as Array<any>).map(r => ({ id: Number(r?.id), name: String(r?.name || '') || ('Agente ' + r?.id) }));
    }),

  // Listar todas as filas (com estatísticas completas)
  // Retorna array de Queue
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allQueues = await db.select().from(queues).where(eq(queues.status, "active"));

    const queuesList: Queue[] = await Promise.all(
      allQueues.map(async (queue) => {
        // Buscar agentes ativos na fila (IDs)
        const agentsRows = await db
          .select({ agentId: queueAgents.agentId })
          .from(queueAgents)
          .where(
            and(
              eq(queueAgents.queueId, queue.id),
              eq(queueAgents.isActive, 1)
            )
          );
        const assignedAgents = agentsRows.map(row => String(row.agentId));

        // Contar conversas aguardando (status = 'open')
        const [waitingResult] = await db
          .select({ count: sql<number>`count(*)`})
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, "open")
            )
          );

        // Contar conversas em atendimento (status = 'assigned')
        const [activeResult] = await db
          .select({ count: sql<number>`count(*)`})
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, "assigned")
            )
          );

        const stats = {
          agentsOnline: assignedAgents.length,
          waiting: Number(waitingResult?.count || 0),
          active: Number(activeResult?.count || 0),
        };

        return toQueueType(queue, stats, assignedAgents);
      })
    );

    return queuesList;
  }),

  // Criar nova fila (admin only)
  // Input é um subconjunto de Queue (sem campos calculados/auto)
  // Retorna a fila criada (tipo Queue completo)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        channel: z.enum(['whatsapp', 'instagram', 'email', 'telegram', 'webchat', 'facebook']),
        priority: z.number().default(0),
        color: z.string().default("#3b82f6"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem criar filas");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [newQueue] = await db.insert(queues).values({
        ...input,
        status: 'active',
        createdBy: ctx.user.id,
      });

      // Buscar a fila criada para retornar o objeto completo
      const createdQueue = await db.select().from(queues).where(eq(queues.id, newQueue.insertId)).limit(1);

      if (!createdQueue[0]) {
        throw new Error("Falha ao criar fila");
      }

      return toQueueTypeBase(createdQueue[0]);
    }),

  // Atualizar fila (admin only)
  // Input parcial de campos atualizáveis de Queue
  // Retorna a fila atualizada (tipo Queue completo)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        priority: z.number().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem atualizar filas");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;
      await db.update(queues).set(updateData).where(eq(queues.id, id));

      // Buscar a fila atualizada para retornar
      const updatedQueue = await db.select().from(queues).where(eq(queues.id, id)).limit(1);

      if (!updatedQueue[0]) {
        throw new Error("Fila não encontrada");
      }

      return toQueueTypeBase(updatedQueue[0]);
    }),

  // Agente entrar na fila
  join: protectedProcedure
    .input(z.object({ queueId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se o agente está em pausa
      const { agentPauses } = await import("../drizzle/schema");
      const [activePause] = await db
        .select()
        .from(agentPauses)
        .where(
          and(
            eq(agentPauses.agentId, ctx.user!.id),
            eq(agentPauses.status, 'active')
          )
        )
        .limit(1);

      if (activePause) {
        throw new Error(
          'Você não pode entrar na fila enquanto estiver em pausa. Finalize sua pausa primeiro.'
        );
      }

      // Verificar se já está na fila
      const existing = await db
        .select()
        .from(queueAgents)
        .where(
          and(
            eq(queueAgents.queueId, input.queueId),
            eq(queueAgents.agentId, ctx.user!.id)
          )
        );

      if (existing.length > 0) {
        // Reativar se estava inativo
        await db
          .update(queueAgents)
          .set({ isActive: 1 })
          .where(eq(queueAgents.id, existing[0].id));
      } else {
        // Adicionar à fila
        await db.insert(queueAgents).values({
          queueId: input.queueId,
          agentId: ctx.user!.id,
          isActive: 1,
        });
      }

      return { success: true };
    }),

  // Agente sair da fila
  leave: protectedProcedure
    .input(z.object({ queueId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(queueAgents)
        .set({ isActive: 0 })
        .where(
          and(
            eq(queueAgents.queueId, input.queueId),
            eq(queueAgents.agentId, ctx.user!.id)
          )
        );

      return { success: true };
    }),

  // Listar filas que o agente está participando
  // Retorna array de Queue completos
  myQueues: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const myQueueAssociations = await db
      .select({
        queue: queues,
        isActive: queueAgents.isActive,
      })
      .from(queueAgents)
      .innerJoin(queues, eq(queueAgents.queueId, queues.id))
      .where(eq(queueAgents.agentId, ctx.user!.id));

    // Para cada fila, buscar assignedAgents (todos os agentes ativos)
    const queuesList: Queue[] = await Promise.all(
      myQueueAssociations.map(async (item) => {
        // Buscar todos os agentes ativos nesta fila
        const agentsRows = await db
          .select({ agentId: queueAgents.agentId })
          .from(queueAgents)
          .where(
            and(
              eq(queueAgents.queueId, item.queue.id),
              eq(queueAgents.isActive, 1)
            )
          );
        const assignedAgents = agentsRows.map(row => String(row.agentId));

        // Contar conversas aguardando e em atendimento (para currentSize e waitingCount)
        const [waitingResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, item.queue.id),
              eq(conversations.status, "open")
            )
          );
        const waiting = Number(waitingResult?.count || 0);

        const [activeResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, item.queue.id),
              eq(conversations.status, "assigned")
            )
          );
        const active = Number(activeResult?.count || 0);

        const stats = {
          agentsOnline: assignedAgents.length,
          waiting,
          active,
        };

        return toQueueType(item.queue, stats, assignedAgents);
      })
    );

    return queuesList;
  }),
});
