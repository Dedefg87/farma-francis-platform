import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { crmTasks, customers } from "../drizzle/schema";
import { fireAndForget, enqueueCrmOutboxEvent } from "./crm-core";

let birthdayTimer: unknown = null;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startPharmaBirthdayWorker(intervalMinutes = 720) {
  if (birthdayTimer) return;

  const runOnce = async () => {
    const db = await getDb();
    if (!db) return;

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // MySQL: match month-day regardless of year
    const bdayCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
      })
      .from(customers)
      .where(
        sql`birth_date IS NOT NULL AND DATE_FORMAT(birth_date, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')`
      );

    for (const c of bdayCustomers) {
      // Avoid duplicates for the same day
      const existing = await db
        .select({ id: crmTasks.id })
        .from(crmTasks)
        .where(
          and(
            eq(crmTasks.status, "open"),
            eq(crmTasks.relatedEntityType, "customer"),
            eq(crmTasks.relatedEntityId, c.id),
            gte(crmTasks.dueAt, dayStart),
            lte(crmTasks.dueAt, dayEnd)
          )
        )
        .limit(1);

      if (existing?.[0]) continue;

      const inserted = await db
        .insert(crmTasks)
        .values({
          title: `Aniversario: ${c.name}`,
          description: "Lembrete: enviar parabens e oferta personalizada.",
          dueAt: dayStart,
          status: "open",
          priority: "low",
          relatedEntityType: "customer",
          relatedEntityId: c.id,
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
          eventName: "BirthdayTaskCreated",
          entityType: "customer",
          entityId: c.id,
          actorUserId: null,
          payload: { taskId },
        });
      });
    }
  };

  runOnce().catch(err => {
    console.error("[Pharma Birthday Worker] run failed:", err);
  });

  birthdayTimer = setInterval(
    () => {
      runOnce().catch(err => {
        console.error("[Pharma Birthday Worker] run failed:", err);
      });
    },
    Math.max(1, intervalMinutes) * 60 * 1000
  );

  console.log(`[Pharma Birthday Worker] started (every ${intervalMinutes}m)`);
}
