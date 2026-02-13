import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { crmTasks, customerTreatments, customers } from "../drizzle/schema";
import { fireAndForget, enqueueCrmOutboxEvent } from "./crm-core";

let refillTimer: any = null;

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function subDays(d: Date, days: number) {
  return addDays(d, -days);
}

export function startPharmaRefillWorker(
  intervalMinutes = 10,
  daysAhead = 7,
  safetyDays = 3
) {
  if (refillTimer) return;

  const runOnce = async () => {
    const db = await getDb();
    if (!db) return;

    const now = new Date();
    const future = addDays(now, daysAhead);

    const upcoming = await db
      .select({
        treatment: customerTreatments,
        customer: customers,
      })
      .from(customerTreatments)
      .innerJoin(customers, eq(customerTreatments.customerId, customers.id))
      .where(
        and(
          eq(customerTreatments.isActive, 1),
          gte(customerTreatments.dataFimPrevisto, now),
          lte(customerTreatments.dataFimPrevisto, future)
        )
      )
      .orderBy(desc(customerTreatments.dataFimPrevisto));

    for (const row of upcoming) {
      const endAt = row.treatment.dataFimPrevisto
        ? new Date(row.treatment.dataFimPrevisto as any)
        : null;
      if (!endAt || Number.isNaN(endAt.getTime())) continue;

      const dueAt = subDays(endAt, safetyDays);
      const dueStart = new Date(dueAt);
      dueStart.setHours(dueStart.getHours() - 1);
      const dueEnd = new Date(dueAt);
      dueEnd.setHours(dueEnd.getHours() + 1);

      // Avoid duplicate open tasks for same treatment around same dueAt
      const existing = await db
        .select({ id: crmTasks.id })
        .from(crmTasks)
        .where(
          and(
            eq(crmTasks.status, "open"),
            eq(crmTasks.relatedEntityType, "customer_treatment"),
            eq(crmTasks.relatedEntityId, row.treatment.id),
            gte(crmTasks.dueAt, dueStart),
            lte(crmTasks.dueAt, dueEnd)
          )
        )
        .limit(1);

      if (existing?.[0]) continue;

      const title = `Reposicao: ${row.customer.name} - ${row.treatment.nomeMedicamento}`;
      const description =
        `Tratamento perto do fim (safety ${safetyDays}d). ` +
        `Fim previsto: ${endAt.toISOString().slice(0, 10)}.`;

      const inserted = await db
        .insert(crmTasks)
        .values({
          title,
          description,
          dueAt,
          status: "open",
          priority: "medium",
          relatedEntityType: "customer_treatment",
          relatedEntityId: row.treatment.id,
          assignedTo: null,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        } as any)
        .$returningId();

      const taskId = inserted?.[0]?.id ?? null;

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "SmartRefillTaskCreated",
          entityType: "customer",
          entityId: row.customer.id,
          actorUserId: null,
          payload: {
            taskId,
            treatmentId: row.treatment.id,
            customerId: row.customer.id,
            dueAt: dueAt.toISOString(),
            endAt: endAt.toISOString(),
          },
        });
      });
    }
  };

  // initial run
  runOnce().catch(err => {
    console.error("[Pharma Refill Worker] run failed:", err);
  });

  refillTimer = setInterval(
    () => {
      runOnce().catch(err => {
        console.error("[Pharma Refill Worker] run failed:", err);
      });
    },
    Math.max(1, intervalMinutes) * 60 * 1000
  );

  console.log(
    `[Pharma Refill Worker] started (every ${intervalMinutes}m, ahead=${daysAhead}d, safety=${safetyDays}d)`
  );
}
