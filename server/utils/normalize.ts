/**
 * Normalização universal de valores
 * Converte strings vazias, undefined e null para null
 */
export function normalize(value: any): any {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}
