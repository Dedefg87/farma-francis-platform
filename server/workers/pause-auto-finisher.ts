import { getDb } from '../db';
import { agentPauses } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Worker para finalizar automaticamente pausas que excederam sua duração planejada
 * Deve ser executado periodicamente (ex: a cada minuto)
 */
export async function checkAndFinishExpiredPauses() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[PauseAutoFinisher] Database not available');
      return { finishedCount: 0, error: 'Database not available' };
    }

    const now = new Date();
    
    // Buscar pausas ativas via SQL raw
    const session = (db as any).session;
    const client = session?.client;
    if (!client) {
      console.error('[PauseAutoFinisher] Raw client not available');
      return { finishedCount: 0, error: 'Raw client not available' };
    }
    // CORREÇÃO APLICADA: Usar durationMinutes ao invés de duration_minutes
    const [rawPauses] = await client.execute(
      "SELECT id, agent_id, status, started_at, ended_at, durationMinutes FROM agent_pauses WHERE status = ?",
      ['active']
    );
    // CORREÇÃO: Mapear durationMinutes (não duration_minutes)
    const activePauses = (rawPauses as any[]).map(r => ({
      id: r.id,
      agentId: r.agent_id,
      status: r.status,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      durationMinutes: r.durationMinutes, // Campo corrigido
    }));

    let finishedCount = 0;

    for (const pause of activePauses) {
      

      // Calcular tempo decorrido em minutos
      const startedAt = new Date(pause.startedAt);
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);

      // Se o tempo decorrido excedeu a duração planejada, finalizar a pausa
      if (elapsedMinutes >= 60) { // Auto-finish after 60 min by default
        await db
          .update(agentPauses)
          .set({
            endedAt: now,
            status: 'completed',
          })
          .where(eq(agentPauses.id, pause.id));

        finishedCount++;

        console.log(
          `[PauseAutoFinisher] Pausa ${pause.id} do agente ${pause.agentId} finalizada automaticamente ` +
          `(${elapsedMinutes.toFixed(1)} min / 60 min)`
        );
      }
    }

    if (finishedCount > 0) {
      console.log(`[PauseAutoFinisher] ${finishedCount} pausa(s) finalizada(s) automaticamente`);
    }

    return { finishedCount, checkedCount: activePauses.length };
  } catch (error) {
    console.error('[PauseAutoFinisher] Erro ao verificar pausas:', error);
    return { finishedCount: 0, error: String(error) };
  }
}

/**
 * Inicia o worker com intervalo configurável
 * @param intervalMinutes Intervalo em minutos entre verificações (padrão: 1 minuto)
 */
export function startPauseAutoFinisher(intervalMinutes: number = 1) {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[PauseAutoFinisher] Iniciando worker (intervalo: ${intervalMinutes} min)`);

  // Executar imediatamente na inicialização
  checkAndFinishExpiredPauses();

  // Executar periodicamente
  const interval = setInterval(() => {
    checkAndFinishExpiredPauses();
  }, intervalMs);

  // Retornar função para parar o worker
  return () => {
    clearInterval(interval);
    console.log('[PauseAutoFinisher] Worker parado');
  };
}
