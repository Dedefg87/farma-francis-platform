import { getDb } from "./db";
import { crmOutboxEvents } from "../drizzle/schema";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { appendCrmActivity } from "./crm-core";

const DEFAULT_INTERVAL_MS = 3000;

function isMissingTable(e: any) {
  const code = e?.cause?.code || e?.code;
  const msg = String(e?.cause?.sqlMessage || e?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist");
}

async function processBatch() {
  const db = await getDb();
  if (!db) return;

  // Grab small batch to keep overhead minimal
  const events = await db
    .select()
    .from(crmOutboxEvents)
    .where(eq(crmOutboxEvents.status, "pending"))
    .orderBy(asc(crmOutboxEvents.createdAt))
    .limit(25);

  for (const ev of events) {
    try {
      // Minimal default projection: create an activity record for timeline
      if (ev.entityType && ev.entityId) {
        await appendCrmActivity({
          entityType: ev.entityType,
          entityId: ev.entityId,
          activityType: "event",
          title: ev.eventName,
          body: null,
          metadata: ev.payloadJson ? { payload: ev.payloadJson } : undefined,
          actorUserId: ev.actorUserId ?? null,
          occurredAt: ev.createdAt,
        });
      }

      await db
        .update(crmOutboxEvents)
        .set({
          status: "processed",
          processedAt: new Date(),
          error: null,
        })
        .where(eq(crmOutboxEvents.id, ev.id));
    } catch (e: any) {
      if (isMissingTable(e)) {
        // If tables not migrated yet, just stop.
        return;
      }
      await db
        .update(crmOutboxEvents)
        .set({
          status: "failed",
          processedAt: new Date(),
          error: String(e?.message || e),
        })
        .where(eq(crmOutboxEvents.id, ev.id));
    }
  }
}

export function startCrmOutboxWorker(intervalMs: number = DEFAULT_INTERVAL_MS) {
  console.log(`[CRM Outbox] Starting worker (interval: ${intervalMs} ms)`);

  // Initial run
  processBatch().catch(err =>
    console.error("[CRM Outbox] initial error:", err)
  );

  setInterval(() => {
    processBatch().catch(err => console.error("[CRM Outbox] error:", err));
  }, intervalMs);
}
