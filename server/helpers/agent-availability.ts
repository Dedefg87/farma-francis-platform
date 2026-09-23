import { getDb } from '../db';
import { agentPauses, queueAgents, conversations } from '../../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
function rowsOf(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray((res as any).rows)) return (res as any).rows;
  if (Array.isArray((res as any)[0])) return (res as any)[0];
  return [];
}

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
export async function pickLeastLoadedAgent(agentIds: number[]): Promise<number | null> {
  if (!agentIds || agentIds.length === 0) return null;
  const db = await getDb();
  if (!db) return null;
  const res = await db.execute(sql`
    SELECT c.assigned_to AS agent_id, COUNT(*) AS n
    FROM conversations c
    WHERE c.status IN ('open','assigned') AND c.assigned_to IS NOT NULL
    GROUP BY c.assigned_to
  `);
  const rows = rowsOf(res);  const counts = new Map<number, number>();
  for (const row of (rows as Array<any>)) {
    if (row && row.agent_id != null) counts.set(Number(row.agent_id), Number(row.n || 0));
  }
  let best: number | null = null;
  let bestCount = Number.MAX_SAFE_INTEGER;
  for (const id of agentIds) {
    const c = counts.get(id) ?? 0;
    if (c < bestCount) { bestCount = c; best = id; }
  }
  return best;
}

export async function getLoggedInAgents(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  // [fix58] Fonte primaria: atendentes (role 'user') que fizeram login recentemente.
  // lastSignedIn e atualizado no login (routers-auth) e reflete quem esta logado hoje.
  // Admin (role='admin') nunca entra na distribuicao.
  try {
    const res = await db.execute(sql`
      SELECT id FROM users
      WHERE role = 'user'
        AND lastSignedIn IS NOT NULL
        AND lastSignedIn >= NOW() - INTERVAL 24 HOUR
      ORDER BY lastSignedIn DESC
    `);
    const rows = rowsOf(res);    const ids = (rows as Array<any>).map(r => Number(r?.id)).filter(Boolean);
    if (ids.length > 0) return ids;
  } catch { /* fallback abaixo */ }

  // Fallback 1: agent_status online com atividade recente (se houver registro fresco)
  try {
    const res = await db.execute(sql`
      SELECT DISTINCT user_id AS id FROM agent_status
      WHERE status = 'online'
        AND last_activity >= NOW() - INTERVAL 15 MINUTE
        AND user_id IN (SELECT id FROM users WHERE role = 'user')
    `);
    const rows = rowsOf(res);    const ids = (rows as Array<any>).map(r => Number(r?.id)).filter(Boolean);
    if (ids.length > 0) return ids;
  } catch { /* fallback final */ }

  // Fallback final: qualquer atendente (role 'user'); admin nunca entra
  try {
    const res = await db.execute(sql`
      SELECT id FROM users WHERE role = 'user' ORDER BY lastSignedIn DESC
    `);
    const rows = rowsOf(res);    return (rows as Array<any>).map(r => Number(r?.id)).filter(Boolean);
  } catch { return []; }
}

export async function autoAssignUnassigned(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const online = await getLoggedInAgents();
  if (online.length === 0) return 0;
  let available = online;
  try { available = await filterAvailableAgents(online); } catch { /* mantem online */ }
  if (available.length === 0) return 0;
  const res = await db.execute(sql`
    SELECT id FROM conversations
    WHERE status = 'open' AND assigned_to IS NULL
    ORDER BY opened_at ASC
    LIMIT 50
  `);
  const rows = rowsOf(res);  const ids = (rows as Array<any>).map(r => Number(r?.id)).filter(Boolean);
  let assigned = 0;
  for (const id of ids) {
    const picked = await pickLeastLoadedAgent(available);
    if (picked == null) break;
    await db.update(conversations).set({ assignedTo: picked, status: 'assigned' }).where(eq(conversations.id, id));
    assigned++;
  }
  if (assigned > 0) console.log(`[AgentAvailability] Distribuicao automatica: ${assigned} conversa(s) atribuida(s) entre ${available.length} agente(s)`);
  return assigned;
}
