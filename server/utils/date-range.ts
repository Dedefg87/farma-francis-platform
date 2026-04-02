export function getDateRangeFromPeriod(
  period: string,
  customStart?: string | Date,
  customEnd?: string | Date
): { startDate: Date; endDate: Date } {
  const now = new Date();

  const setEndOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const setStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "hoje":
      startDate = setStartOfDay(now);
      endDate = setEndOfDay(now);
      break;

    case "semana":
      const dayOfWeek = now.getDay();
      const tempStartDateWeek = new Date(now);
      tempStartDateWeek.setDate(now.getDate() - dayOfWeek);
      startDate = setStartOfDay(tempStartDateWeek);
      
      const tempEndDateWeek = new Date(startDate);
      tempEndDateWeek.setDate(startDate.getDate() + 6);
      endDate = setEndOfDay(tempEndDateWeek);
      break;

    case "mes":
      // Últimos 30 dias (não o mês calendário)
      startDate = setStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      endDate = setEndOfDay(now);
      break;

    case "7d":
      startDate = setStartOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      endDate = setEndOfDay(now);
      break;

    case "30d":
      startDate = setStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      endDate = setEndOfDay(now);
      break;

    case "90d":
      startDate = setStartOfDay(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
      endDate = setEndOfDay(now);
      break;

    case "all":
    case "todas":
      startDate = setStartOfDay(new Date("2000-01-01T00:00:00.000Z"));
      endDate = setEndOfDay(now);
      break;

    case "custom":
      if (customStart && customEnd) {
        startDate = setStartOfDay(new Date(customStart));
        endDate = setEndOfDay(new Date(customEnd));
      } else {
        startDate = setStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        endDate = setEndOfDay(now);
      }
      break;

    default:
      startDate = setStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      endDate = setEndOfDay(now);
      break;
  }

  if (isNaN(startDate.getTime())) {
    startDate = setStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  }
  if (isNaN(endDate.getTime())) {
    endDate = setEndOfDay(now);
  }

  return { startDate, endDate };
}
