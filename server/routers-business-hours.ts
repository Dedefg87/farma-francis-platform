import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

// In-memory schedule storage (will be migrated to DB)
let daySchedulesCache: Record<string, {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  holidayOpenTime?: string;
  holidayCloseTime?: string;
}> = {
  monday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  tuesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  wednesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  thursday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  friday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  saturday: { enabled: true, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
  sunday: { enabled: false, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
};

let holidaysCache: Array<{
  date: string;
  name: string;
  type: "national" | "municipal" | "state";
  enabled: boolean;
}> = [];

// Default 2026 holidays
const defaultHolidays2026 = [
  { date: "2026-01-01", name: "Confraternização Universal", type: "national" as const, enabled: true },
  { date: "2026-02-17", name: "Carnaval", type: "national" as const, enabled: true },
  { date: "2026-04-03", name: "Paixão de Cristo", type: "national" as const, enabled: true },
  { date: "2026-04-21", name: "Tiradentes", type: "national" as const, enabled: true },
  { date: "2026-05-01", name: "Dia do Trabalho", type: "national" as const, enabled: true },
  { date: "2026-09-07", name: "Independência do Brasil", type: "national" as const, enabled: true },
  { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" as const, enabled: true },
  { date: "2026-11-02", name: "Finados", type: "national" as const, enabled: true },
  { date: "2026-11-15", name: "Proclamação da República", type: "national" as const, enabled: true },
  { date: "2026-11-20", name: "Dia da Consciência Negra", type: "national" as const, enabled: true },
  { date: "2026-12-25", name: "Natal", type: "national" as const, enabled: true },
];

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

export const businessHoursRouter = router({
  // Get all day schedules
  getAll: protectedProcedure.query(async () => {
    return Object.entries(daySchedulesCache).map(([day, s]) => ({
      day,
      ...s,
    }));
  }),

  // Update day schedule
  update: protectedProcedure
    .input(DayScheduleInput)
    .mutation(async ({ input }) => {
      daySchedulesCache[input.day] = {
        enabled: input.enabled,
        openTime: input.openTime,
        closeTime: input.closeTime,
        holidayOpenTime: input.holidayOpenTime || "08:00",
        holidayCloseTime: input.holidayCloseTime || "12:00",
      };
      return { success: true };
    }),

  // Check if currently within business hours
  checkNow: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const now = input?.date ? new Date(input.date) : new Date();
      const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
      const timeStr = now.toTimeString().slice(0, 5); // HH:MM format

      const dayMap: Record<number, keyof typeof daySchedulesCache> = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
      };

      const dayKey = dayMap[dayOfWeek] as keyof typeof daySchedulesCache;
      const dateStr = now.toISOString().split("T")[0];

      // Check if it's a holiday
      const holiday = holidaysCache.find(h => h.date === dateStr && h.enabled);
      
      if (holiday && dayKey && daySchedulesCache[dayKey]?.enabled) {
        const holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
        const holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
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

      // Regular schedule check
      if (!dayKey) {
        return {
          isBusinessHours: false,
          isOpen: false,
          type: "error",
          schedule: null,
          currentTime: timeStr,
        };
      }

      const schedule = daySchedulesCache[dayKey];
      const isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;

      return {
        isBusinessHours: schedule.enabled && isOpen,
        isOpen,
        type: "regular",
        schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
        currentTime: timeStr,
      };
    }),

  // List holidays
  getHolidays: protectedProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(async () => {
      // Merge default holidays with custom ones
      const merged = [...defaultHolidays2026, ...holidaysCache];
      const seen = new Set<string>();
      return merged.filter(h => {
        if (seen.has(h.date)) return false;
        seen.add(h.date);
        return true;
      });
    }),

  // Add/Update holiday
  upsertHoliday: protectedProcedure
    .input(HolidayInput)
    .mutation(async ({ input }) => {
      const existingIndex = holidaysCache.findIndex(h => h.date === input.date);
      
      if (existingIndex >= 0) {
        holidaysCache[existingIndex] = input;
      } else {
        holidaysCache.push(input);
      }
      return { success: true };
    }),

  // Delete holiday
  deleteHoliday: protectedProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      holidaysCache = holidaysCache.filter(h => h.date !== input.date);
      return { success: true };
    }),
});

export type BusinessHoursRouter = typeof businessHoursRouter;

// Export function for flow-engine to check business hours
export async function checkBusinessHours(date: Date = new Date()): Promise<{
  isOpen: boolean;
  schedule?: { openTime: string; closeTime: string };
  holidayName?: string;
}> {
  const dayOfWeek = date.getDay();
  const timeStr = date.toTimeString().slice(0, 5);

  const dayMap: Record<number, keyof typeof daySchedulesCache> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };

  const dayKey = dayMap[dayOfWeek] as keyof typeof daySchedulesCache;
  const dateStr = date.toISOString().split("T")[0];

  // Check if it's a holiday
  const holiday = [...defaultHolidays2026, ...holidaysCache].find(h => h.date === dateStr && h.enabled);
  
  if (holiday && dayKey && daySchedulesCache[dayKey]?.enabled) {
    const holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
    const holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
    const isOpen = timeStr >= holidayOpen && timeStr < holidayClose;
    return {
      isOpen,
      schedule: { openTime: holidayOpen, closeTime: holidayClose },
      holidayName: holiday.name,
    };
  }

  if (!dayKey) {
    return { isOpen: false };
  }

  const schedule = daySchedulesCache[dayKey];
  const isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;

  return {
    isOpen,
    schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
  };
}