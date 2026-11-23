/**
 * Guardiao do webhook da Evolution API.
 * Reafirma o webhook apos cada boot e a cada 10 min, porque ele se perde
 * quando o servico Evolution redeploya.
 */
const EVENTS = [
  "MESSAGES_UPSERT","MESSAGES_UPDATE","SEND_MESSAGE","CONNECTION_UPDATE",
  "QRCODE_UPDATED","CONTACTS_UPSERT","CONTACTS_UPDATE",
];

function guardCfg() {
  const apiUrl = String(process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const apiKey = String(process.env.EVOLUTION_API_KEY || "");
  const instance = String(process.env.EVOLUTION_INSTANCE_NAME || "");
  let appUrl = String(process.env.PUBLIC_APP_URL || "");
  if (!appUrl && process.env.RAILWAY_PUBLIC_DOMAIN) appUrl = "https://" + process.env.RAILWAY_PUBLIC_DOMAIN;
  appUrl = appUrl.replace(/\/+$/, "");
  if (!apiUrl || !apiKey || !instance || !appUrl) return null;
  return { apiUrl, apiKey, instance, appUrl };
}

async function guardEnsure(c: any, motivo: string) {
  const url = c.appUrl + "/api/webhooks/evolution?apikey=" + encodeURIComponent(c.apiKey);
  const headers: any = { apikey: c.apiKey };
  try {
    const f = await fetch(c.apiUrl + "/webhook/find/" + encodeURIComponent(c.instance), { headers });
    const fj: any = await f.json().catch(() => ({}));
    if (f.status === 200 && fj && fj.enabled === true && String(fj.url) === url) {
      console.log("[webhook-guard] ok (" + motivo + ") | " + fj.url);
      return;
    }
    const body: any = { webhook: { enabled: true, url, byEvents: false, base64: false, events: EVENTS } };
    const s = await fetch(c.apiUrl + "/webhook/set/" + encodeURIComponent(c.instance), {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    console.log("[webhook-guard] reafirmado (" + motivo + ") | status " + s.status + " | " + url);
  } catch (e: any) {
    console.error("[webhook-guard] erro:", e && e.message ? e.message : e);
  }
}

export function startWebhookGuard() {
  if (process.env.WEBHOOK_GUARD === "false") { console.log("[webhook-guard] desativado"); return; }
  const c = guardCfg();
  if (!c) {
    console.warn("[webhook-guard] inativo: defina EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME e PUBLIC_APP_URL");
    return;
  }
  setTimeout(() => { void guardEnsure(c, "boot"); }, 25000);
  setInterval(() => { void guardEnsure(c, "periodico"); }, 10 * 60 * 1000);
  console.log("[webhook-guard] ativo | instancia: " + c.instance + " | api: " + c.apiUrl);
}
