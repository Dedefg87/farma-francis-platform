import { getDb } from "./db";
import {
  crmAuditLogs,
  crmOutboxEvents,
  crmActivities,
} from "../drizzle/schema";

type JsonValue = unknown;

function safeJson(value: JsonValue) {
  try {
    return value === undefined ? null : JSON.stringify(value);
  } catch {
    return null;
  }
}

export function fireAndForget(fn: () => Promise<void>) {
  // Never block request lifecycle
  setImmediate(() => {
    fn().catch(err => {
      console.error("[CRM] fireAndForget error:", err);
    });
  });
}

export async function enqueueCrmOutboxEvent(params: {
  eventName: string;
  entityType: string;
  entityId?: number | null;
  actorUserId?: number | null;
  payload?: JsonValue;
  idempotencyKey?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(crmOutboxEvents).values({
    eventName: params.eventName,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    actorUserId: params.actorUserId ?? null,
    payloadJson: safeJson(params.payload),
    idempotencyKey: params.idempotencyKey ?? null,
    status: "pending",
    createdAt: new Date(),
  });
}

export async function appendCrmAuditLog(params: {
  action: string;
  entityType: string;
  entityId?: number | null;
  actorUserId?: number | null;
  before?: JsonValue;
  after?: JsonValue;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(crmAuditLogs).values({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    actorUserId: params.actorUserId ?? null,
    beforeJson: safeJson(params.before),
    afterJson: safeJson(params.after),
    requestId: params.requestId ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: new Date(),
  });
}

export async function appendCrmActivity(params: {
  entityType: string;
  entityId: number;
  activityType: string;
  title?: string | null;
  body?: string | null;
  metadata?: JsonValue;
  actorUserId?: number | null;
  occurredAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(crmActivities).values({
    entityType: params.entityType,
    entityId: params.entityId,
    activityType: params.activityType,
    title: params.title ?? null,
    body: params.body ?? null,
    metadataJson: safeJson(params.metadata),
    actorUserId: params.actorUserId ?? null,
    occurredAt: params.occurredAt ?? new Date(),
    createdAt: new Date(),
  });
}
