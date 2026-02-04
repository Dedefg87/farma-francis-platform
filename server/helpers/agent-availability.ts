import { getDb } from '../db';
import { agentPauses, queueAgents } from '../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Verifica se um agente está disponível (não está em pausa ativa)
 * @param agentId ID do agente
 * @returns true se disponível, false se em pausa
 */
export async function isAgentAvailable(agentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [activePause] = await db
    .select()
    .from(agentPauses)
    .where(
      and(
        eq(agentPauses.agentId, agentId),
        eq(agentPauses.status, 'active')
      )
    )
    .limit(1);

  return !activePause; // Disponível se NÃO tiver pausa ativa
}

/**
 * Filtra lista de agentes removendo aqueles que estão em pausa
 * @param agentIds Array de IDs de agentes
 * @returns Array de IDs de agentes disponíveis (não em pausa)
 */
export async function filterAvailableAgents(agentIds: number[]): Promise<number[]> {
  if (agentIds.length === 0) return [];

  const db = await getDb();
  if (!db) return agentIds; // Se DB não disponível, retorna todos

  // Buscar agentes que estão em pausa ativa
  const pausedAgents = await db
    .select({ agentId: agentPauses.agentId })
    .from(agentPauses)
    .where(
      and(
        inArray(agentPauses.agentId, agentIds),
        eq(agentPauses.status, 'active')
      )
    );

  const pausedAgentIds = new Set(pausedAgents.map(p => p.agentId));

  // Retornar apenas agentes que NÃO estão pausados
  return agentIds.filter(id => !pausedAgentIds.has(id));
}

/**
 * Obtém agentes disponíveis de uma fila (ativos E não em pausa)
 * @param queueId ID da fila
 * @returns Array de IDs de agentes disponíveis
 */
export async function getAvailableAgentsInQueue(queueId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  // Buscar agentes ativos na fila
  const activeAgents = await db
    .select({ agentId: queueAgents.agentId })
    .from(queueAgents)
    .where(
      and(
        eq(queueAgents.queueId, queueId),
        eq(queueAgents.isActive, 1)
      )
    );

  const activeAgentIds = activeAgents.map(a => a.agentId);

  // Filtrar removendo os que estão em pausa
  return await filterAvailableAgents(activeAgentIds);
}

/**
 * Remove agente da fila quando ele inicia uma pausa
 * @param agentId ID do agente
 */
export async function removeAgentFromQueuesOnPause(agentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Desativar agente de todas as filas
  await db
    .update(queueAgents)
    .set({ isActive: 0 })
    .where(eq(queueAgents.agentId, agentId));

  console.log(`[AgentAvailability] Agente ${agentId} removido de todas as filas (pausa iniciada)`);
}
