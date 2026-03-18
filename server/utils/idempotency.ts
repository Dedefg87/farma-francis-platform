/**
 * Idempotency constraints for MySQL
 * Creates unique indexes if they don't exist (check via information_schema)
 */

import { getDb, sql, getDbRaw } from "../db.js";

/**
 * Check if an index exists on a table
 */
export async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  try {
    const db = await getDbRaw();
    if (!db || !db.raw) return false;
    const rows = await db.raw(
      "SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
      [tableName, indexName]
    );
    const count = (rows as any[])[0]?.cnt || 0;
    return count > 0;
  } catch (err) {
    console.error("[Idempotency] Error checking index existence:", err);
    return false;
  }
}

/**
 * Create unique index if not exists (MySQL compatible)
 */
export async function createUniqueIndexIfNotExists(
  tableName: string,
  indexName: string,
  columns: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  if (await indexExists(tableName, indexName)) {
    console.log(`[Idempotency] Index ${indexName} already exists on ${tableName}`);
    return;
  }

  try {
    const cols = columns.join(", ");
    await db.execute(
      sql`CREATE UNIQUE INDEX ${sql.raw(indexName)} 
          ON ${sql.raw(tableName)} (${sql.raw(cols)})`
    );
    console.log(`[Idempotency] Created unique index ${indexName} on ${tableName} (${cols})`);
  } catch (e: any) {
    // MySQL error 1061 = Duplicate key name (already exists)
    if (e?.cause?.errno !== 1061) {
      console.error(`[Idempotency] Failed to create index ${indexName}:`, e);
    } else {
      console.log(`[Idempotency] Index ${indexName} already exists (race condition)`);
    }
  }
}

/**
 * Run all idempotency constraints for the application
 */
export async function runIdempotencyConstraints() {
  console.log("[Idempotency] Running constraints...");

  // received_messages: (provider, external_id)
  await createUniqueIndexIfNotExists(
    "received_messages",
    "uq_received_messages_provider_externalid",
    ["provider", "external_id"]
  );

  // conversation_messages: (provider, external_id)
  await createUniqueIndexIfNotExists(
    "conversation_messages",
    "uq_conversation_messages_provider_externalid",
    ["provider", "external_id"]
  );

  console.log("[Idempotency] Constraints applied");
}
