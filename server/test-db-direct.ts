import { getDb } from "./db";
import { conversations, conversationMessages } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function testDatabase() {
  console.log("[TEST] Iniciando diagnóstico direto do banco...\n");

  const db = await getDb();
  if (!db) {
    console.error("[ERROR] Não conseguiu conectar ao banco");
    process.exit(1);
  }

  try {
    // 1. Contagem total
    console.log("=== CONTAGENS TOTAIS ===");
    const totalConvs = await db
      .select()
      .from(conversations)
      .then((rows) => rows.length);
    console.log(`✓ Total de conversas: ${totalConvs}`);

    const totalMsgs = await db
      .select()
      .from(conversationMessages)
      .then((rows) => rows.length);
    console.log(`✓ Total de mensagens: ${totalMsgs}\n`);

    // 2. Distribuição por período
    console.log("=== DISTRIBUIÇÃO POR PERÍODO ===");
    const now = new Date();
    const periods = [
      { name: "7d", days: 7 },
      { name: "30d", days: 30 },
      { name: "90d", days: 90 },
    ];

    for (const period of periods) {
      const cutoff = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const count = await db
        .select()
        .from(conversations)
        .where(sql`opened_at >= ${cutoff}`)
        .then((rows) => rows.length);
      console.log(`✓ ${period.name}: ${count} conversas`);
    }

    // 3. Exemplo de conversa
    console.log("\n=== EXEMPLO DE CONVERSA ===");
    const example = await db
      .select()
      .from(conversations)
      .then((rows) => rows[0]);
    if (example) {
      console.log("ID:", example.id);
      console.log("Cliente:", example.customerName);
      console.log("Aberta em:", example.openedAt);
      console.log("Status:", example.status);
    } else {
      console.log("⚠️ Nenhuma conversa encontrada!");
    }

    console.log("\n✅ Diagnóstico completo");
    process.exit(0);
  } catch (error) {
    console.error("[ERROR]", error);
    process.exit(1);
  }
}

testDatabase();
