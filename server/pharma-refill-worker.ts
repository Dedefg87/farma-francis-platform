import { and, eq, gte, lte, desc } from "drizzle-orm";
import { getDb } from "./db";
import { customerTreatments, customers, crmTasks } from "../drizzle/schema";
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

    try {
      // Query using Drizzle ORM - JOIN customers com customerTreatments
      const upcoming = await db
        .select({
          id: customerTreatments.id,
          customerId: customerTreatments.customerId,
          nomeMedicamento: customerTreatments.nomeMedicamento,
          posologiaDiaria: customerTreatments.posologiaDiaria,
          qtdCaixa: customerTreatments.qtdCaixa,
          dataFimPrevisto: customerTreatments.dataFimPrevisto,
          dataUltimaCompra: customerTreatments.dataUltimaCompra,
          isActive: customerTreatments.isActive,
          customeName: customers.name,
          customerPhone: customers.phone,
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
        const endAt = row.dataFimPrevisto
          ? new Date(row.dataFimPrevisto as any)
          : null;

        if (!endAt || Number.isNaN(endAt.getTime())) continue;

        const dueAt = subDays(endAt, safetyDays);
        const dueStart = new Date(dueAt);
        dueStart.setHours(dueStart.getHours() - 1);
        const dueEnd = new Date(dueAt);
        dueEnd.setHours(dueEnd.getHours() + 1);

        // Avoid duplicate tasks
        const existing = await db
          .select({ id: crmTasks.id })
          .from(crmTasks)
          .where(
            and(
              eq(crmTasks.entityType, "customer_treatment"),
              eq(crmTasks.entityId, row.id),
              eq(crmTasks.status, "open")
            )
          )
          .limit(1);

        if (existing.length > 0) continue;

        // Create task
        await db.insert(crmTasks).values({
          entityType: "customer_treatment",
          entityId: row.id,
          title: `Reposição: ${row.nomeMedicamento}`,
          body: `${row.customeName} precisa repor ${row.nomeMedicamento}`,
          dueAt,
          status: "open",
          priority: "normal",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Enqueue event
        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "refill_task_created",
            entityType: "customer_treatment",
            entityId: row.id,
            payload: {
              treatmentId: row.id,
              medicamento: row.nomeMedicamento,
              customer: row.customeName,
            },
          });
        });
      }
    } catch (err) {
      console.error("[pharma-refill-worker] Error:", err);
    }
  };

  // Run immediately
  runOnce();

  // Schedule interval
  refillTimer = setInterval(runOnce, intervalMinutes * 60 * 1000);
}

export function stopPharmaRefillWorker() {
  if (refillTimer) {
    clearInterval(refillTimer);
    refillTimer = null;
  }
}
