export function getDateRangeFromPeriod(
  period: string,
  customStart?: string | Date,
  customEnd?: string | Date
): { startDate: Date; endDate: Date } {
  // Use UTC para garantir consistência com banco de dados (tudo em UTC)
  const now = new Date();

  const setEndOfDayUTC = (date: Date) => {
    const utc = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999
    ));
    return utc;
  };

  const setStartOfDayUTC = (date: Date) => {
    const utc = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));
    return utc;
  };

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "hoje":
      startDate = setStartOfDayUTC(now);
      endDate = setEndOfDayUTC(now);
      break;

    case "ontem":
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      startDate = setStartOfDayUTC(yesterday);
      endDate = setEndOfDayUTC(yesterday);
      break;

    case "semana":
      // Domingo a sábado da semana atual (UTC)
      const dayOfWeek = now.getUTCDay(); // 0 ( Domingo)
      const tempStartDateWeek = new Date(now);
      tempStartDateWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
      startDate = setStartOfDayUTC(tempStartDateWeek);
      const tempEndDateWeek = new Date(startDate);
      tempEndDateWeek.setUTCDate(startDate.getUTCDate() + 6);
      endDate = setEndOfDayUTC(tempEndDateWeek);
      break;

    case "mes":
      // Mês calendário atual (UTC)
      startDate = setStartOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
      endDate = setEndOfDayUTC(now);
      break;

    case "mes_anterior":
      // Mês anterior completo (UTC)
      const firstDayCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const lastDayPreviousMonth = new Date(firstDayCurrentMonth);
      lastDayPreviousMonth.setUTCDate(lastDayPreviousMonth.getUTCDate() - 1);
      const firstDayPreviousMonth = new Date(Date.UTC(
        lastDayPreviousMonth.getUTCFullYear(),
        lastDayPreviousMonth.getUTCMonth(),
        1
      ));
      startDate = setStartOfDayUTC(firstDayPreviousMonth);
      endDate = setEndOfDayUTC(lastDayPreviousMonth);
      break;

    case "30d":
      const ThirtyDaysAgo = new Date(now);
      ThirtyDaysAgo.setUTCDate(ThirtyDaysAgo.getUTCDate() - 30);
      startDate = setStartOfDayUTC(ThirtyDaysAgo);
      endDate = setEndOfDayUTC(now);
      break;

    case "365d":
      const YearAgo = new Date(now);
      YearAgo.setUTCDate(YearAgo.getUTCDate() - 365);
      startDate = setStartOfDayUTC(YearAgo);
      endDate = setEndOfDayUTC(now);
      break;

    case "custom":
      if (customStart && customEnd) {
        const customStartDate = new Date(customStart);
        const customEndDate = new Date(customEnd);
        startDate = setStartOfDayUTC(customStartDate);
        endDate = setEndOfDayUTC(customEndDate);
      } else {
        const ThirtyDaysAgoCustom = new Date(now);
        ThirtyDaysAgoCustom.setUTCDate(ThirtyDaysAgoCustom.getUTCDate() - 30);
        startDate = setStartOfDayUTC(ThirtyDaysAgoCustom);
        endDate = setEndOfDayUTC(now);
      }
      break;

    default:
      throw new Error(`Período não suportado: ${period}`);
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error(`Datas inválidas geradas para período: ${period}`);
  }

  return { startDate, endDate };
}
