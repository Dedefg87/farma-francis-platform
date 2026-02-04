import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from './db';import { agentPauses } from '../drizzle/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { removeAgentFromQueuesOnPause } from './helpers/agent-availability';export const pausesRouter = router({
  // Iniciar pausa
  start: protectedProcedure
    .input(
      z.object({
        pauseType: z.enum(['lunch', 'snack', 'bathroom', 'other']),
        durationMinutes: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar se já existe pausa ativa
      const [activePause] = await db
        .select()
        .from(agentPauses)
        .where(
          and(
            eq(agentPauses.agentId, ctx.user.id),
            eq(agentPauses.status, 'active')
          )
        )
        .limit(1);

      if (activePause) {
        throw new Error('Você já tem uma pausa ativa');
      }

      // Criar nova pausa
      const [pause] = await db
        .insert(agentPauses)
        .values({
          agentId: ctx.user.id,
          pauseType: input.pauseType,
          durationMinutes: input.durationMinutes || null,
          startedAt: new Date(),
          status: 'active',
        })
        .$returningId();

      // Remover agente de todas as filas automaticamente
      await removeAgentFromQueuesOnPause(ctx.user.id);

      return { success: true, pauseId: pause.id };
    }),

  // Finalizar pausa
  end: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar pausa ativa
    const [activePause] = await db
      .select()
      .from(agentPauses)
      .where(
        and(
          eq(agentPauses.agentId, ctx.user.id),
          eq(agentPauses.status, 'active')
        )
      )
      .limit(1);

    if (!activePause) {
      throw new Error('Nenhuma pausa ativa encontrada');
    }

    // Finalizar pausa
    await db
      .update(agentPauses)
      .set({
        endedAt: new Date(),
        status: 'completed',
      })
      .where(eq(agentPauses.id, activePause.id));

    return { success: true };
  }),

  // Obter pausa ativa do agente
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [activePause] = await db
      .select()
      .from(agentPauses)
      .where(
        and(
          eq(agentPauses.agentId, ctx.user.id),
          eq(agentPauses.status, 'active')
        )
      )
      .limit(1);

    return activePause || null;
  }),

  // Histórico de pausas do agente
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const pauses = await db
        .select()
        .from(agentPauses)
        .where(eq(agentPauses.agentId, ctx.user.id))
        .orderBy(desc(agentPauses.startedAt))
        .limit(input.limit);

      return pauses;
    }),
});
