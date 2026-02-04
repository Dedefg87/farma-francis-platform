import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { queues, queueAgents, conversations, users } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const queuesRouter = router({
  // Listar filas com contadores de conversas aguardando
  listWithCounts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const allQueues = await db.select().from(queues).where(eq(queues.status, 'active'));

    const queuesWithCounts = await Promise.all(
      allQueues.map(async (queue) => {
        const [waiting] = await db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, 'open')
            )
          );

        return {
          id: queue.id,
          name: queue.name,
          waitingCount: Number(waiting?.count || 0),
        };
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

  // Listar todas as filas
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allQueues = await db.select().from(queues).where(eq(queues.status, "active"));
    
    // Para cada fila, buscar estatísticas
    const queuesWithStats = await Promise.all(
      allQueues.map(async (queue) => {
        // Contar agentes online na fila
        const agentsOnline = await db
          .select({ count: sql<number>`count(*)` })
          .from(queueAgents)
          .where(
            and(
              eq(queueAgents.queueId, queue.id),
              eq(queueAgents.isActive, 1)
            )
          );

        // Contar conversas aguardando (status = 'open')
        const waiting = await db
          .select({ count: sql<number>`count(*)`})
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, "open")
            )
          );

        // Contar conversas em atendimento (status = 'assigned')
        const active = await db
          .select({ count: sql<number>`count(*)`})
          .from(conversations)
          .where(
            and(
              eq(conversations.queueId, queue.id),
              eq(conversations.status, "assigned")
            )
          );

        return {
          ...queue,
          stats: {
            agentsOnline: Number(agentsOnline[0]?.count || 0),
            waiting: Number(waiting[0]?.count || 0),
            active: Number(active[0]?.count || 0),
          },
        };
      })
    );

    return queuesWithStats;
  }),

  // Criar nova fila (admin only)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        maxConcurrentChats: z.number().default(3),
        priority: z.number().default(0),
        color: z.string().default("#D32F2F"),
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
        createdBy: ctx.user.id,
      });

      return { success: true, queueId: newQueue.insertId };
    }),

  // Atualizar fila (admin only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        maxConcurrentChats: z.number().optional(),
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

      return { success: true };
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
  myQueues: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const myQueues = await db
      .select({
        queue: queues,
        isActive: queueAgents.isActive,
      })
      .from(queueAgents)
      .innerJoin(queues, eq(queueAgents.queueId, queues.id))
      .where(eq(queueAgents.agentId, ctx.user!.id));

    return myQueues;
  }),
});
