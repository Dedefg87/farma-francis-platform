export function safeNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}
