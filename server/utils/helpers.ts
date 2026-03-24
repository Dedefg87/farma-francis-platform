/**
 * Utilitários diversos para o servidor
 */

/**
 * Normaliza strings vazias para NULL
 * Se o valor for undefined, null ou string vazia (após trim), retorna null
 * Caso contrário retorna o próprio valor
 */
export function normalizeEmptyStringToNull(value: any): any {
  if (value === undefined || value === null) return null;
  const trimmedValue = typeof value === 'string' ? value.trim() : value;
  return trimmedValue === '' ? null : trimmedValue;
}
