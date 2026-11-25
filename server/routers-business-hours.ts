import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { businessHourSchedules, businessHourHolidays } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Horários de atendimento por dia da semana (persistidos no banco)
 */

const DEFAULT_SCHEDULES = [
  { day: "monday", enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "tuesday", enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "wednesday", enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "thursday", enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "friday", enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "saturday", enabled: true, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  { day: "sunday", enabled: false, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
] as const;

// Feriados padrão por ano (fallback para antes da migração)
function defaultHolidaysForYear(year: number) {
  return [
    { date: `${year}-01-01`, name: "Confraternização Universal", type: "national" as const, enabled: true },
    { date: `${year}-02-17`, name: "Carnaval", type: "national" as const, enabled: true },
    { date: `${year}-04-03`, name: "Paixão de Cristo", type: "national" as const, enabled: true },
    { date: `${year}-04-21`, name: "Tiradentes", type: "national" as const, enabled: true },
    { date: `${year}-05-01`, name: "Dia do Trabalho", type: "national" as const, enabled: true },
    { date: `${year}-09-07`, name: "Independência do Brasil", type: "national" as const, enabled: true },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", type: "national" as const, enabled: true },
    { date: `${year}-11-02`, name: "Finados", type: "national" as const, enabled: true },
    { date: `${year}-11-15`, name: "Proclamação da República", type: "national" as const, enabled: true },
    { date: `${year}-11-20`, name: "Dia da Consciência Negra", type: "national" as const, enabled: true },
    { date: `${year}-12-25`, name: "Natal", type: "national" as const, enabled: true },
  ];
}

interface DayScheduleView {
  day: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
  holidayOpenTime?: string;
  holidayCloseTime?: string;
}

// Day schedule input schema
const DayScheduleInput = z.object({
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  enabled: z.boolean().default(true),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  holidayOpenTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  holidayCloseTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

// Holiday input schema
const HolidayInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  name: z.string().min(1),
  type: z.enum(["national", "municipal", "state"]),
  enabled: z.boolean().default(true),
});

/**
 * Ler horários persistidos do banco. Se a tabela estiver vazia (pré-migração),
 * são inseridos os defaults e retornam-se os defaults.
 */
async function getSchedulesFromDb(): Promise<DayScheduleView[]> {
  const db = await getDb();
  if (!db) {
    return DEFAULT_SCHEDULES.map(s => ({ ...s, enabled: s.enabled }));
  }
  const rows = await db.select().from(businessHourSchedules);
  if (rows.length === 0) {
    for (const s of DEFAULT_SCHEDULES) {
      try {
        await db.insert(businessHourSchedules).values({
          day: s.day,
          enabled: s.enabled ? 1 : 0,
          openTime: s.openTime,
          closeTime: s.closeTime,
          holidayOpenTime: s.holidayOpenTime,
          holidayCloseTime: s.holidayCloseTime,
        });
      } catch {
        // ignorado (tabela pode não existir em bases antigas)
      }
    }
    return DEFAULT_SCHEDULES.map(s => ({ ...s, enabled: s.enabled }));
  }
  return rows.map(r => ({
    day: r.day,
    enabled: !!r.enabled,
    openTime: r.openTime,
    closeTime: r.closeTime,
    holidayOpenTime: r.holidayOpenTime || "08:00",
    holidayCloseTime: r.holidayCloseTime || "12:00",
  }));
}

/**
 * Ler feriados: defaults do ano atual (fallback) + os salvos no banco.
 */
async function getHolidaysFromDb(): Promise<Array<{ date: string; name: string; type: string; enabled: boolean }>> {
  const db = await getDb();
  const rows = db ? await db.select().from(businessHourHolidays) : [];
  const merged = [
    ...defaultHolidaysForYear(new Date().getFullYear()),
    ...rows.map(r => ({ date: r.date, name: r.name, type: r.type, enabled: !!r.enabled })),
  ];
  const seen = new Set<string>();
  return merged.filter(h => {
    if (seen.has(h.date)) return false;
    seen.add(h.date);
    return true;
  });
}

export const businessHoursRouter = router({
  // Get all day schedules
  getAll: protectedProcedure.query(async () => {
    return getSchedulesFromDb();
  }),

  // Update day schedule (upsert)
  update: protectedProcedure
    .input(DayScheduleInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const value = {
        enabled: input.enabled ? 1 : 0,
        openTime: input.openTime,
        closeTime: input.closeTime,
        holidayOpenTime: input.holidayOpenTime || "08:00",
        holidayCloseTime: input.holidayCloseTime || "12:00",
      };

      try {
        await db
          .insert(businessHourSchedules)
          .values({ day: input.day, ...value })
          .onDuplicateKeyUpdate({ set: value });
      } catch (err) {
        console.error("[businessHours.update] Error:", (err as Error).message);
        throw new Error("Falha ao salvar horário");
      }
      return { success: true };
    }),

  // Check if currently within business hours (used by flow-engine)
  checkNow: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const now = input?.date ? new Date(input.date) : new Date();
      const dayOfWeek = now.getDay();
      const timeStr = now.toTimeString().slice(0, 5);

      const schedules = await getSchedulesFromDb();
      const byDay = new Map(schedules.map(s => [s.day, s]));

      const dayMap: Record<number, string> = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
      };

      const dayKey = dayMap[dayOfWeek] as string;
      const dateStr = now.toISOString().split("T")[0];

      const holidays = (await getHolidaysFromDb()).filter(h => h.enabled);
      const holiday = holidays.find(h => h.date === dateStr);

      if (holiday && dayKey && byDay.get(dayKey)?.enabled) {
        const s = byDay.get(dayKey)!;
        const holidayOpen = s.holidayOpenTime || "08:00";
        const holidayClose = s.holidayCloseTime || "12:00";
        const isOpen = timeStr >= holidayOpen && timeStr < holidayClose;
        return {
          isBusinessHours: isOpen,
          isOpen,
          type: "holiday",
          holidayName: holiday.name,
          schedule: { openTime: holidayOpen, closeTime: holidayClose },
          currentTime: timeStr,
        };
      }

      const schedule = byDay.get(dayKey);
      const isOpen = schedule?.enabled && schedule.openTime && timeStr >= schedule.openTime && timeStr < schedule.closeTime;
      if (!schedule) {
        return {
          isBusinessHours: false,
          isOpen: false,
          type: "error",
          schedule: null,
          currentTime: timeStr,
        };
      }
      return {
        isBusinessHours: !!schedule.enabled && isOpen,
        isOpen: !!schedule.enabled && isOpen,
        type: "regular",
        schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
        currentTime: timeStr,
      };
    }),

  // List holidays (defaults of current year + custom ones)
  getHolidays: protectedProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async () => {
      return getHolidaysFromDb();
    }),

  // Add/Update holiday (persistido)
  upsertHoliday: protectedProcedure
    .input(HolidayInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .insert(businessHourHolidays)
        .values({
          date: input.date,
          name: input.name,
          type: input.type,
          enabled: input.enabled ? 1 : 0,
        })
        .onDuplicateKeyUpdate({
          set: { name: input.name, enabled: input.enabled ? 1 : 0, updatedAt: new Date() },
        });
      return { success: true };
    }),

  // Delete holiday (persistido)
  deleteHoliday: protectedProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        await db.delete(businessHourHolidays).where(eq(businessHourHolidays.date, input.date));
      }
      return { success: true };
    }),
});

export type BusinessHoursRouter = typeof businessHoursRouter;

// Export function for flow-engine to check business hours (now DB-backed)
export async function checkBusinessHours(date: Date = new Date()): Promise<{
  isOpen: boolean;
  schedule?: { openTime: string; closeTime: string };
  holidayName?: string;
}> {
  const schedules = await getSchedulesFromDb();
  const byDay = new Map(schedules.map(s => [s.day, s]));

  const dayOfWeek = date.getDay();
  const timeStr = date.toTimeString().slice(0, 5);
  const dayMap: Record<number, string> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  const dayKey = dayMap[dayOfWeek] as string;
  const dateStr = date.toISOString().split("T")[0];

  const holidays = (await getHolidaysFromDb()).filter(h => h.enabled);
  const holiday = holidays.find(h => h.date === dateStr);

  if (holiday && dayKey && byDay.get(dayKey)?.enabled) {
    const s = byDay.get(dayKey)!;
    const holidayOpen = s.holidayOpenTime || "08:00";
    const holidayClose = s.holidayCloseTime || "12:00";
    return {
      isOpen: timeStr >= holidayOpen && timeStr < holidayClose,
      schedule: { openTime: holidayOpen, closeTime: holidayClose },
      holidayName: holiday.name,
    };
  }

  const schedule = byDay.get(dayKey);
  if (!schedule?.enabled) return { isOpen: false };
  return {
    isOpen: timeStr >= schedule.openTime && timeStr < schedule.closeTime,
    schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
  };
}
