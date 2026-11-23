/*
 * 📊 DIAGNÓSTICO DE SCHEMA
 * Executar via cURL: POST /api/trpc/system.migrate
 */
const db = await getDb();

// ✅ Listar colunas reais
const [cols] = await db.execute(sql`DESCRIBE conversation_messages`);
console.log("Schema real (MySQL):\n", cols);

// ✅ Listar tabelas relacionadas
const [tables] = await db.execute(sql`SHOW TABLES LIKE '%message%'`);
console.log("Tables:", tables);

// ✅ Verificar se replyToExternalId existe
const hasReply = cols.some((c: any) => (c.Field || "").toLowerCase() === "reply_to_external_id");
const hasReplyOld = cols.some((c: any) => (c.Field || "").toLowerCase() === "reply_to_message_id");
const hasReaction = cols.some((c: any) => (c.Field || "").toLowerCase() === "reaction");

return {
  hasReply,          // ✅ Drizzle espera isso
  hasReplyOld,       // 🚨 Banco pode ter nome antigo
  hasReaction,       // ✅ Reação
  cols: cols.map((c: any) => c.Field),
};
