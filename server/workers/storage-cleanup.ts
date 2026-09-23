import { getDb } from "../db";
import { sql } from "drizzle-orm";

const RETENTION: Array<{ table: string; dateCol: string }> = [
  { table: "processed_webhook_messages", dateCol: "processed_at" },
  { table: "received_messages", dateCol: "created_at" },
  { table: "conversation_messages", dateCol: "created_at" },
  { table: "messages", dateCol: "created_at" },
  { table: "broadcast_members_sent", dateCol: "created_at" },
];

const HARD_PROTECT = new Set([
  "customers", "users", "employees", "conversations", "tickets", "deals",
  "broadcast_lists", "broadcast_list_members", "broadcast_list_contacts",
  "crm_activities", "crm_audit_logs", "crm_outbox_events",
  "audit_logs", "notifications", "story_cache",
]);

const MAX_MB = Number(process.env.STORAGE_MAX_MB || 400);
const TRIGGER_PCT = 0.8;
const KEEP_PCT = 0.2;
const MIN_ROWS = 300;
const CLEAN_R2_ORPHANS = process.env.CLEAN_R2_ORPHANS === "true";
const COOLDOWN_MS = Number(process.env.STORAGE_COOLDOWN_MIN || 30) * 60 * 1000;
const INTERVAL_MIN = Number(process.env.STORAGE_INTERVAL_MIN || 30);

let running = false;
let lastRunAt = 0;

async function getDbUsageMb(): Promise<number> {
  const db = await getDb();
  const [rows] = await db.execute(sql`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS mb FROM information_schema.tables WHERE table_schema = DATABASE()`);
  const row = (rows as Array<any>)[0];
  return Number(row?.mb || 0);
}

async function deleteOlderThan(table: string, dateCol: string, cutoff: Date): Promise<number> {
  const db = await getDb();
  let deleted = 0;
  for (;;) {
    const [res] = await db.execute(sql`DELETE FROM ${sql.raw(table)} WHERE ${sql.raw(dateCol)} < ${cutoff} LIMIT 2000`);
    const affected = Number((res as any)?.affectedRows || 0);
    deleted += affected;
    if (affected < 2000) break;
  }
  return deleted;
}

export async function runStorageCleanup(): Promise<any> {
  if (running) return { triggered: false, reason: "already_running" };
  const now = Date.now();
  if (now - lastRunAt < COOLDOWN_MS) return { triggered: false, reason: "cooldown" };
  running = true;
  try {
    const usageMb = await getDbUsageMb();
    const pct = usageMb / MAX_MB;
    const result: any = { triggered: pct >= TRIGGER_PCT, usageMb, maxMb: MAX_MB, pct: Math.round(pct * 100) / 100, deleted: {} };
    if (pct < TRIGGER_PCT) return result;
    const db = await getDb();
    for (const item of RETENTION) {
      const { table, dateCol } = item;
      if (HARD_PROTECT.has(table)) continue;
      const [cnt] = await db.execute(sql`SELECT COUNT(*) AS n FROM ${sql.raw(table)}`);
      const total = Number((cnt as Array<any>)[0]?.n || 0);
      if (total < MIN_ROWS) continue;
      const keep = Math.max(50, Math.ceil(total * KEEP_PCT));
      const [cut] = await db.execute(sql`SELECT ${sql.raw(dateCol)} AS c FROM ${sql.raw(table)} WHERE ${sql.raw(dateCol)} IS NOT NULL ORDER BY ${sql.raw(dateCol)} DESC LIMIT 1 OFFSET ${keep}`);
      const cutoff = (cut as Array<any>)[0]?.c;
      if (!cutoff) continue;
      const deleted = await deleteOlderThan(table, dateCol, new Date(cutoff));
      result.deleted[table] = deleted;
      console.log("[StorageCleanup] " + table + ": apagadas " + deleted + " linhas anteriores a " + new Date(cutoff).toISOString() + " (mantendo " + keep + " recentes)");
    }
    if (CLEAN_R2_ORPHANS) {
      try {
        const mod: any = await import("@aws-sdk/client-s3");
        if (mod && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
          const s3 = new mod.S3Client({
            region: "auto",
            endpoint: process.env.R2_ENDPOINT || "https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com",
            credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
          });
          const bucket = process.env.R2_BUCKET || "farmafranciswhatsappmedia";
          const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const [refs] = await db.execute(sql`SELECT file_url FROM conversation_messages WHERE file_url IS NOT NULL AND file_url <> ''`);
          const refsSet = new Set((refs as Array<any>).map((r: any) => String(r.file_url || "").split("/").pop()));
          let token: string | undefined;
          let removed = 0;
          do {
            const list = await s3.send(new mod.ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 500 }));
            for (const o of list.Contents || []) {
              const key = String(o.Key || "");
              const tail = key.split("/").pop() || key;
              const age = Date.now() - (o.LastModified ? o.LastModified.getTime() : Date.now());
              if (age >= cutoffDate && !refsSet.has(tail)) {
                try { await s3.send(new mod.DeleteObjectCommand({ Bucket: bucket, Key: key })); removed++; } catch { /* ignore */ }
              }
            }
            token = list.IsTruncated ? list.NextContinuationToken : undefined;
          } while (token);
          result.r2OrphansRemoved = removed;
          console.log("[StorageCleanup] R2: " + removed + " objetos orfaos removidos");
        }
      } catch (e: any) {
        console.warn("[StorageCleanup] R2 cleanup ignorado: " + (e?.message || e));
      }
    }
    lastRunAt = now;
    return result;
  } finally {
    running = false;
  }
}

export function startStorageCleanupWorker(): void {
  const run = () => {
    runStorageCleanup().catch((e: any) => console.error("[StorageCleanup] erro: " + (e?.message || e)));
  };
  setTimeout(run, 5000).unref?.();
  const t = setInterval(run, INTERVAL_MIN * 60 * 1000);
  t.unref?.();
  console.log("[StorageCleanup] Worker ativo: a cada " + INTERVAL_MIN + "min, gatilho em " + Math.round(TRIGGER_PCT * 100) + "% de " + MAX_MB + "MB, mantendo os " + Math.round(KEEP_PCT * 100) + "% mais recentes");
}
