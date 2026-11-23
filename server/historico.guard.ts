export const LIMITE_MIN = Number(process.env.WA_HISTORICO_MIN ?? 60);
export const MODO = String(process.env.WA_HISTORICO_MODE ?? 'log').toLowerCase();

function tsSeg(ts: any): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
  if (typeof ts === 'string') { const n = Number(ts); if (!isFinite(n)) return 0; return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n); }
  if (typeof ts === 'object') {
    if (typeof (ts as any).toNumber === 'function') return tsSeg((ts as any).toNumber());
    if (typeof (ts as any).low === 'number') return Math.floor((ts as any).low);
  }
  return 0;
}

export function atrasoMin(ts: any): number {
  const s = tsSeg(ts);
  if (!s) return 0;
  return Math.round((Date.now() / 1000 - s) / 60);
}

export function guardHistorico(req: any, res: any): boolean {
  const body = req?.body ?? {};
  const event = body.event ?? body.type;
  const data = body.data ?? body;
  if (event !== 'messages.upsert') return false;
  if (data?.key?.fromMe === true) return false;
  const min = atrasoMin(data?.messageTimestamp);
  if (min <= LIMITE_MIN) return false;
  console.log('[historico] atraso=' + min + 'min modo=' + MODO + ' jid=' + (data?.key?.remoteJid ?? '?'));
  if (MODO !== 'drop') return false;
  try { if (typeof res?.status === 'function') res.status(200).json({ ok: true, historico: true, atrasoMin: min }); } catch {}
  return true;
}
