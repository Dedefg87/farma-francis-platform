#!/usr/bin/env node
/**
 * Auto-cleanup: quando disco >= 80%, remove registros antigos mantendo os 20% mais recentes
 * Tabelas: conversation_messages, received_messages, attachments, conversation_messages (mídias)
 */

import { getDb } from "./db.js";

const THRESHOLD_PCT = 80;
const KEEP_PCT = 20;

async function getDiskUsage(): Promise<number> {
  // Simplified: usa variáveis de ambiente ou consulta ao sistema
  // Em produção Railway, pode usar stats via Railway Metrics
  return Number(process.env.DISK_USAGE_PCT || 0);
}

async function main() {
  const usage = await getDiskUsage();
  console.log(`[AutoCleanup] Disco atual: ${usage}% (threshold: ${THRESHOLD_PCT}%)`);
  if (usage < THRESHOLD_PCT) {
    console.log(`[AutoCleanup] Nenhuma ação necessária.`);
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error(`[AutoCleanup] DB não disponível.`);
    return;
  }

  // Mantém 20% mais recentes (por data decrescente) de conversation_messages
  // Remove os 80% mais antigos
  const tablesToClean = [
    { name: "conversation_messages", dateCol: "created_at", idCol: "id" },
    { name: "received_messages", dateCol: "timestamp", idCol: "id" },
    { name: "attachments", dateCol: "created_at", idCol: "id" },
  ];

  for (const t of tablesToClean) {
    try {
      // Conta total
      const totalResult = await db.execute(`SELECT COUNT(*) as total FROM ${t.name}`);
      const total = Number((totalResult as any)[0]?.total || 0);
      if (total === 0) continue;

      const keepCount = Math.ceil(total * (KEEP_PCT / 100));
      const deleteCount = total - keepCount;

      if (deleteCount <= 0) continue;

      // Deleta os mais antigos (mantém os mais recentes)
      await db.execute(
        `DELETE FROM ${t.name} WHERE ${t.idCol} NOT IN (SELECT ${t.idCol} FROM (SELECT ${t.idCol} FROM ${t.name} ORDER BY ${t.dateCol} DESC LIMIT ${keepCount}) AS sub)`
      );

      console.log(`[AutoCleanup] ${t.name}: removidos ${deleteCount} registros (mantidos ${keepCount} de ${total})`);
    } catch (err: any) {
      console.error(`[AutoCleanup] Erro em ${t.name}:`, err.message || err);
    }
  }
}

main();
