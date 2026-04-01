export function getDateRangeFromPeriod(
  period: string,
  customStart?: string | Date,
  customEnd?: string | Date
): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "hoje":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case "semana":
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "mes":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;

    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;

    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;

    case "all":
      startDate = new Date("2000-01-01");
      endDate = now;
      break;

    case "custom":
      if (!customStart || !customEnd) {
        throw new Error("Período personalizado requer startDate e endDate");
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      break;

    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
  }

  return { startDate, endDate };
}
