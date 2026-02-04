/**
 * Utilitário para calcular range de datas baseado no período selecionado
 */

export function getDateRangeFromPeriod(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (period) {
    case 'hoje':
      // Início do dia atual
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;

    case 'ontem':
      // Início do dia anterior
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      // Fim do dia anterior
      const endYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      return { start, end: endYesterday };

    case 'semana':
      // Início da semana (domingo)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0);
      break;

    case 'mes':
      // Início do mês
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;

    case '7dias':
      // Últimos 7 dias
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;

    case '30dias':
      // Últimos 30 dias
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;

    default:
      // Default: hoje
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }

  return { start, end };
}
