import { z } from "zod";
import { eq, and, gte, lte, desc, sql, or, inArray } from "drizzle-orm";
import { reminders, customers, users } from "../drizzle/schema";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { format, addDays, subDays, startOfDay, endOfDay } from "date-fns";

export const remindersRouter = router({
  /**
   * Buscar lembretes pendentes para o atendente logado
   * Retorna agrupados por cliente, ordenados por prioridade
   */
  getPending: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentId = ctx.user.id;
      const limit = input?.limit || 10;

      // Buscar lembretes pendentes do atendente
      // Inclui: pendentes + adiados que já chegou a data
      const now = new Date();
      const today = startOfDay(now);

      const remindersList = await db
        .select({
          reminder: reminders,
          customer: customers,
        })
        .from(reminders)
        .innerJoin(customers, eq(reminders.customerId, customers.id))
        .where(
          and(
            eq(reminders.agentId, agentId),
            or(
              // Pendentes normais com eventDate <= hoje
              and(
                eq(reminders.status, "pendente"),
                lte(reminders.eventDate, today)
              ),
              // Adiados que chegaram na data
              and(
                eq(reminders.status, "adiado"),
                lte(reminders.snoozedUntil, now)
              )
            )
          )
        )
        .orderBy(
          // Prioridade: critica > alta > media > baixa
          sql`CASE ${reminders.priority}
            WHEN 'critica' THEN 4
            WHEN 'alta' THEN 3
            WHEN 'media' THEN 2
            WHEN 'baixa' THEN 1
            ELSE 0 END DESC`,
          // Eventos mais urgentes primeiro
          reminders.eventDate,
          // Desempate por nome do cliente
          customers.name
        )
        .limit(limit);

      // Agrupar por cliente
      const grouped = new Map<number, any>();

      for (const row of remindersList) {
        const customerId = row.customer.id;
        if (!grouped.has(customerId)) {
          grouped.set(customerId, {
            customerId: row.customer.id,
            customerName: row.customer.name,
            customerPhone: row.customer.phone,
            reminders: [],
          });
        }
        grouped.get(customerId).reminders.push({
          id: row.reminder.id,
          type: row.reminder.type,
          priority: row.reminder.priority,
          title: row.reminder.title,
          description: row.reminder.description,
          eventDate: row.reminder.eventDate.toISOString(),
          status: row.reminder.status,
          snoozedUntil: row.reminder.snoozedUntil?.toISOString(),
          metadata: row.reminder.metadata,
        });
      }

      return Array.from(grouped.values());
    }),

  /**
   * Adiar lembrete (snooze)
   */
  snooze: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        snoozeOption: z.enum(["1dia", "3dias", "1semana", "custom"]).optional(),
        customDate: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentId = ctx.user.id;

      const [reminder] = await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, input.id), eq(reminders.agentId, agentId)))
        .limit(1);

      if (!reminder) {
        throw new Error("Lembrete não encontrado");
      }

      let snoozedUntil: Date;

      if (input.customDate) {
        snoozedUntil = new Date(input.customDate);
      } else {
        const baseDate = new Date();
        switch (input.snoozeOption) {
          case "1dia":
            snoozedUntil = addDays(baseDate, 1);
            break;
          case "3dias":
            snoozedUntil = addDays(baseDate, 3);
            break;
          case "1semana":
            snoozedUntil = addDays(baseDate, 7);
            break;
          default:
            snoozedUntil = addDays(baseDate, 1);
        }
      }

      await db
        .update(reminders)
        .set({
          status: "adiado",
          snoozedUntil,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, input.id));

      return { success: true, snoozedUntil };
    }),

  /**
   * Dispensar lembrete (marcar como lido)
   */
  dismiss: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentId = ctx.user.id;

      // Verificar se o lembrete pertence ao atendente
      const [reminder] = await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, input.id), eq(reminders.agentId, agentId)))
        .limit(1);

      if (!reminder) {
        throw new Error("Lembrete não encontrado");
      }

      await db
        .update(reminders)
        .set({
          status: "dispensado",
          dismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, input.id));

      return { success: true };
    }),

  /**
   * Criar lembrete manual (admin ou atendente)
   */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        type: z.enum(["aniversario", "medicamento_vencendo", "follow_up", "renovacao", "custom"]),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        eventDate: z.string(), // ISO date
        daysBefore: z.number().default(0).optional(),
        metadata: z.record(z.any()).optional(),
        assignedAgentId: z.number().optional(), // Admin pode atribuir a outro atendente
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentId = input.assignedAgentId || ctx.user.id;

      // Verificar se cliente existe
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (!customer) {
        throw new Error("Cliente não encontrado");
      }

      // Calcular prioridade baseada no tipo e data
      const priority = calculatePriority(input.type, new Date(input.eventDate));

      const [result] = await db
        .insert(reminders)
        .values({
          agentId,
          customerId: input.customerId,
          type: input.type,
          priority,
          title: input.title,
          description: input.description,
          eventDate: new Date(input.eventDate),
          daysBefore: input.daysBefore,
          metadata: input.metadata,
          status: "pendente",
        })
        .$returningId();

      return { success: true, id: result.id };
    }),

  /**
   * Listar todos os lembretes (admin)
   */
  listAll: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.enum(["pendente", "dispensado", "adiado", "expirado"]).optional(),
        type: z.enum(["aniversario", "medicamento_vencendo", "follow_up", "renovacao", "custom"]).optional(),
        agentId: z.number().optional(),
        customerId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (input?.status) conditions.push(eq(reminders.status, input.status));
      if (input?.type) conditions.push(eq(reminders.type, input.type));
      if (input?.agentId) conditions.push(eq(reminders.agentId, input.agentId));
      if (input?.customerId) conditions.push(eq(reminders.customerId, input.customerId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: sql`count(*)` })
        .from(reminders)
        .where(whereClause);

      const total = Number(totalResult.count);
      const totalPages = Math.ceil(total / pageSize);

      const results = await db
        .select({
          reminder: reminders,
          customer: customers,
          agent: users,
        })
        .from(reminders)
        .leftJoin(customers, eq(reminders.customerId, customers.id))
        .leftJoin(users, eq(reminders.agentId, users.id))
        .where(whereClause)
        .orderBy(desc(reminders.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        reminders: results,
        pagination: { total, totalPages, currentPage: page, pageSize },
      };
    }),

  /**
   * Estatísticas de lembretes
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const agentId = ctx.user.id;
    const now = new Date();
    const today = startOfDay(now);

    const [pendingCount] = await db
      .select({ count: sql`count(*)` })
      .from(reminders)
      .where(
        and(
          eq(reminders.agentId, agentId),
          eq(reminders.status, "pendente"),
          lte(reminders.eventDate, today)
        )
      );

    const [snoozedCount] = await db
      .select({ count: sql`count(*)` })
      .from(reminders)
      .where(
        and(
          eq(reminders.agentId, agentId),
          eq(reminders.status, "adiado"),
          lte(reminders.snoozedUntil, now)
        )
      );

    const [criticalCount] = await db
      .select({ count: sql`count(*)` })
      .from(reminders)
      .where(
        and(
          eq(reminders.agentId, agentId),
          eq(reminders.priority, "critica"),
          or(
            and(eq(reminders.status, "pendente"), lte(reminders.eventDate, today)),
            and(eq(reminders.status, "adiado"), lte(reminders.snoozedUntil, now))
          )
        )
      );

    return {
      pending: Number(pendingCount.count),
      snoozed: Number(snoozedCount.count),
      critical: Number(criticalCount.count),
    };
  }),
});

/**
 * Calcula prioridade baseada no tipo e proximidade da data
 */
function calculatePriority(type: string, eventDate: Date): "critica" | "alta" | "media" | "baixa" {
  const now = new Date();
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  switch (type) {
    case "aniversario":
      if (diffDays <= 0) return "critica"; // Hoje ou passou
      if (diffDays <= 7) return "alta"; // Próximos 7 dias
      return "media";

    case "medicamento_vencendo":
      if (diffDays <= 0) return "critica"; // Vencido
      if (diffDays <= 3) return "critica"; // <= 3 dias
      if (diffDays <= 7) return "alta"; // <= 7 dias
      return "media";

    case "follow_up":
      if (diffDays <= 0) return "alta"; // Atrasado ou hoje
      if (diffDays <= 3) return "alta";
      return "media";

    case "renovacao":
      if (diffDays <= 0) return "alta";
      if (diffDays <= 7) return "alta";
      return "media";

    default:
      return "baixa";
  }
}