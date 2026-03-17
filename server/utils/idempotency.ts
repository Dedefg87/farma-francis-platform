/**
 * Idempotency constraints for MySQL
 * Creates unique indexes if they don't exist (check via information_schema)
 */

import { getDb } from "../db.js";

/**
 * Check if an index exists on a table
 */
export async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [rows] = await db.execute(`
      SELECT COUNT(*) as cnt
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
    `, [tableName, indexName]);

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
    await db.execute(`
      CREATE UNIQUE INDEX ${indexName}
      ON ${tableName} (${cols})
    `);
    console.log(`[Idempotency] Created unique index ${indexName} on ${tableName} (${cols})`);
  } catch (err) {
    console.error(`[Idempotency] Failed to create index ${indexName}:`, err);
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
