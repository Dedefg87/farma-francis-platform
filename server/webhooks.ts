import { Router, Request, Response } from "express";
import { getDb } from "./db";
import {
  apiConfigurations,
  receivedMessages,
  integrationSettings,
  conversations,
  conversationMessages,
  customers,
  storyCache,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  getReceivedMessageByExternalId,
  ingestInboundConversationMessage,
  findOrCreateCustomerByPhone,
} from "./db-messages";

import { enqueueMobileSyncJob } from "./queue/mobile-sync";
import crypto from "crypto";
import { sseManager, EVENTS } from "./_core/sse";
import { formatPhoneBR } from "./utils/phone";

// Import debug module
let debugModule: unknown = null;
try {
  debugModule = require("./debug");
} catch (e) {
  console.error("[Webhooks] Debug module not loaded");
}

// In-memory cache of customer profile pictures to avoid hitting provider APIs on every message.
// key: `${provider}:${fromNumber}` -> { url, fetchedAt }
const profilePicCache = new Map<string, { url: string | null; fetchedAt: number }>();
const PROFILE_PIC_TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function resolveProfilePic(
  provider: "whatsapp" | "instagram",
  fromNumber: string
): Promise<string | null> {
  const key = `${provider}:${fromNumber}`;
  const cached = profilePicCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_PIC_TTL_MS) {
    return cached.url;
  }
  let url: string | null = null;
  try {
    if (provider === "whatsapp") {
      const { fetchEvolutionProfile } = await import("./messaging");
      const prof = await fetchEvolutionProfile(fromNumber);
      url = prof?.profilePicture || null;
    } else {
      const { fetchInstagramProfile } = await import("./messaging");
      const prof = await fetchInstagramProfile(fromNumber);
      url = prof?.profilePicture || null;
    }
  } catch (e) {
    console.warn(`[ProfilePic] Failed to fetch for ${key}:`, (e as Error).message);
  }
  profilePicCache.set(key, { url, fetchedAt: Date.now() });
  return url;
}


const router = Router();
const isProduction = process.env.NODE_ENV === "production";

const addDebugLog =
  debugModule?.addLog ||
  ((level: string, category: string, message: string, data?: unknown) => {
    console.log(`[${level.toUpperCase()}] [${category}]`, message, data);
  });

const addDebugLogWebhook =
  debugModule?.webhookLogger ||
  ((req: unknown, res: unknown, next: unknown) => {
    console.log(`[WEBHOOK] ${req.method} ${req.url}`);
    next();
  });

/**
 * Normalizar número de telefone brasileiro
 * Remove o 9 do celular se presente (padroniza para DDD + número fixo)
 * Garante que número brasileiro tenha formato correto
 */
function normalizeBrazilianNumber(value: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = value.replace(/\D/g, "");

  // Se não começar com 55 (Brasil), adiciona
  let normalized = cleaned;
  if (!normalized.startsWith("55")) {
    if (normalized.startsWith("9")) {
      // Número começa com 9, adiciona 55 na frente
      normalized = "55" + normalized;
    }
    // Se não começar com 9 nem 55, adiciona 55
    if (!normalized.startsWith("55") && normalized.length > 0) {
      normalized = "55" + normalized;
    }
  }

  // Agora normaliza para formato brasileiro sem 9
  // Se tem 13 dígitos (55 + DDD + 9 + número), remove o 9
  if (normalized.length === 13 && normalized.startsWith("55")) {
    normalized = normalized.substring(0, 2) + normalized.substring(3);
  }

  return normalized;
}

/**
 * Limpa URL do R2 para obter apenas o caminho relativo dentro do bucket.
 * Remove query string, nome do bucket e deixa o path (ex: evolution-api/.../file.jpg)
 */
function cleanR2Url(url: string | null | undefined): string | null {
  console.log("[cleanR2Url] Input URL:", url?.substring(0, 120));
  if (!url) return null;

  // Verificar se é URL do R2 (r2.cloudflarestorage.com ou .r2.dev)
  const isR2 =
    url.includes(".r2.") ||
    url.includes("r2.cloudflarestorage.com") ||
    url.includes(".r2.dev");

  if (!isR2) {
    // Não é URL do R2, ignorar (não salvar)
    console.log("[Webhooks] Non-R2 URL, skipping:", url.substring(0, 80));
    return null;
  }

  try {
    const parsed = new URL(url);
    // pathname exemplo: /bucket-name/evolution-api/xxxx/file.jpg
    const pathname = parsed.pathname;
    // Separar partes e remover o primeiro segmento (bucket name)
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      console.log("[Webhooks] R2 URL has no bucket+path:", url);
      return null;
    }
    const relativePath = parts.slice(1).join("/");
    console.log("[Webhooks] Cleaned R2 path:", relativePath);
    return relativePath;
  } catch (e) {
    console.error("[Webhooks] Failed to parse R2 URL:", url, e);
    return null;
  }
}

/**
 * Get Evolution API configuration
 */
async function getEvolutionConfig() {
  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.integrationType, "evolution_api"))
    .limit(1);

  if (!config || !config.isActive) return null;

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;

  const apiUrl = configData.apiUrl as string | undefined;
  const apiKey = configData.apiKey || configData.accessToken;
  const instanceName = configData.instanceName;

  if (!apiUrl || !apiKey || !instanceName) return null;

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiKey,
    instanceName,
  };
}
/**
 * Evolution API payloads vary a lot. Try to extract the contact JID/phone
 * from multiple possible shapes.
 */
function extractEvolutionRemoteJid(body: unknown): string | null {
  if (!body) return null;

  const data = body?.data || body?.payload || body;
  const msg0 =
    data?.messages?.[0] ||
    data?.message ||
    body?.message ||
    body?.messages?.[0] ||
    body?.data?.messages?.[0];

  const key =
    data?.key ||
    data?.data?.key ||
    data?.message?.key ||
    msg0?.key ||
    msg0?.message?.key;

  const sender = data?.sender || body?.sender;
  const destination = data?.destination || body?.destination;

  const senderStr = typeof sender === "string" ? sender : null;
  const destinationStr = typeof destination === "string" ? destination : null;

  const candidates = [
    body?.remoteJid,
    body?.data?.remoteJid,
    data?.remoteJid,
    key?.remoteJid,
    msg0?.key?.remoteJid,
    msg0?.remoteJid,
    data?.from,
    data?.chatId,
    senderStr,
    sender?.remoteJid,
    sender?.jid,
    sender?.id,
    sender?.phone,
    sender?.number,
    destinationStr,
    destination?.remoteJid,
    destination?.jid,
    destination?.id,
    destination?.phone,
    destination?.number,
  ].filter(Boolean);

  for (const c of candidates) {
    if (typeof c !== "string") continue;
    // Ignore destination URLs that are not JIDs
    if (c.startsWith("http://") || c.startsWith("https://")) continue;
    return c;
  }

  return null;
}

/**
 * Normalizar número para busca no banco (sem +)
 * DEPRECATED: Use formatPhoneBR em vez disso
 */
function normalizeForDb(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalizar número de entrada do webhook (com +)
 * Usa formatPhoneBR internamente e adiciona + se necessário para consistência
 */
function normalizeInboundNumber(value: string | undefined | null) {
  if (!value) return null;
  // Remove sufixo WhatsApp (@s.whatsapp.net) se houver
  const stripped = value.split("@")[0];
  if (!stripped) return null;

  // Usar a função de normalização estrita
  const normalized = formatPhoneBR(stripped);
  return normalized; // return without +, as formatPhoneBR does
}

/**
 * Verificar se dois números brasileiros são o mesmo contato
 * Considera números com ou sem 9 como o mesmo contato
 */
function isSameBrazilianNumber(num1: string, num2: string): boolean {
  const n1 = normalizeBrazilianNumber(num1);
  const n2 = normalizeBrazilianNumber(num2);
  return n1 === n2;
}

function logWebhookSummary(
  provider: "WhatsApp" | "Instagram",
  payload: unknown
) {
  if (!isProduction) {
    console.log(
      `[${provider} Webhook] Received payload:`,
      JSON.stringify(payload, null, 2)
    );
    return;
  }
  const body = payload as { entry?: unknown[] };
  const entryCount = Array.isArray(body?.entry) ? body.entry.length : 0;
  console.log(
    `[${provider} Webhook] Received payload with ${entryCount} entries`
  );
}

/**
 * WhatsApp Webhook Verification (GET)
 * Called by Meta when setting up the webhook
 */
router.get("/whatsapp", async (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("[WhatsApp Webhook] Verification request:", {
      mode,
      token: token ? "***" : undefined,
    });

    if (mode === "subscribe") {
      // Get stored verify token from database
      const db = await getDb();
      if (!db) {
        return res.status(500).send("Database not available");
      }

      // Buscar configuração da tabela integration_settings
      const config = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, "whatsapp_business"))
        .limit(1);

      if (config.length === 0) {
        console.log("[WhatsApp Webhook] No configuration found");
        return res.status(403).send("No configuration found");
      }

      // Parse config JSON
      const configData =
        typeof config[0].config === "string"
          ? JSON.parse(config[0].config)
          : config[0].config;
      const storedToken = configData.webhookVerifyToken;

      console.log("[WhatsApp Webhook] Verify token present:", Boolean(token));
      console.log(
        "[WhatsApp Webhook] Stored token present:",
        Boolean(storedToken)
      );

      if (token === storedToken) {
        console.log("[WhatsApp Webhook] Verification successful");
        return res.status(200).send(challenge);
      } else {
        console.log("[WhatsApp Webhook] Token mismatch");
        return res.status(403).send("Verification token mismatch");
      }
    }

    res.status(400).send("Invalid verification request");
  } catch (error) {
    console.error("[WhatsApp Webhook] Verification error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * WhatsApp Webhook Message Handler (POST)
 * Receives incoming messages from WhatsApp Business API
 */
router.get("/whatsapp", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    logWebhookSummary("WhatsApp", body);

    // Validate signature if app secret is configured
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!signature && isProduction) {
      console.error("[WhatsApp Webhook] Missing signature in production");
      return res.status(403).send("Missing signature");
    }
    if (signature) {
      const isValid = await validateWhatsAppSignature(
        (req as any).rawBody,
        signature
      );
      if (!isValid) {
        console.error("[WhatsApp Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[WhatsApp Webhook] Signature validated successfully");
    }

    // Acknowledge receipt immediately
    res.status(200).send("EVENT_RECEIVED");

    // Handler antigo desativado — Evolution API usa /evolution
    // processWhatsAppWebhook(body) — DESATIVADO para evitar duplicação
    console.log("[WhatsApp Webhook] ⛔ Handler antigo desativado — usando /evolution");
  } catch (error) {
    console.error("[WhatsApp Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Instagram Webhook Verification (GET)
 * Called by Meta when setting up the webhook
 */
router.get("/instagram", async (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("[Instagram Webhook] Verification request:", {
      mode,
      token: token ? "***" : undefined,
    });

    if (mode === "subscribe") {
      // Get stored verify token from database
      const db = await getDb();
      if (!db) {
        return res.status(500).send("Database not available");
      }

      // Buscar configuração da tabela integration_settings
      const config = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, "instagram_graph"))
        .limit(1);

      if (config.length === 0) {
        console.log("[Instagram Webhook] No configuration found");
        return res.status(403).send("No configuration found");
      }

      // Parse config JSON
      const configData =
        typeof config[0].config === "string"
          ? JSON.parse(config[0].config)
          : config[0].config;
      const storedToken = configData.webhookVerifyToken;

      if (token === storedToken) {
        console.log("[Instagram Webhook] Verification successful");
        return res.status(200).send(challenge);
      } else {
        console.log("[Instagram Webhook] Token mismatch");
        return res.status(403).send("Verification token mismatch");
      }
    }

    res.status(400).send("Invalid verification request");
  } catch (error) {
    console.error("[Instagram Webhook] Verification error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Instagram Webhook Message Handler (POST)
 * Receives incoming messages from Instagram Graph API
 */
router.get("/instagram", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    logWebhookSummary("Instagram", body);

    // Validate signature if app secret is configured
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!signature && isProduction) {
      console.error("[Instagram Webhook] Missing signature in production");
      return res.status(403).send("Missing signature");
    }
    if (signature) {
      const isValid = await validateInstagramSignature(
        (req as any).rawBody,
        signature
      );
      if (!isValid) {
        console.error("[Instagram Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[Instagram Webhook] Signature validated successfully");
    }

    // Acknowledge receipt immediately
    res.status(200).send("EVENT_RECEIVED");

    // Process the webhook asynchronously
    processInstagramWebhook(body).catch(error => {
      console.error("[Instagram Webhook] Processing error:", error);
    });
  } catch (error) {
    console.error("[Instagram Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Evolution API Webhook (POST)
 * Supports both /evolution and /evolution/:event (when webhook_by_events is true)
 */
router.get("/whatsapp", async (req: Request, res: Response) => {
  return handleEvolutionWebhook(req, res);
});

router.post("/evolution", async (req: Request, res: Response) => {
  return handleEvolutionWebhook(req, res);
});

async function handleEvolutionWebhook(req: Request, res: Response) {
  try {
    console.log("🔵🔵🔵 [Evolution Handler] ENTRY - req.method:", req.method, "req.path:", req.path, "query:", JSON.stringify(req.query));
    console.log("🔵🔵🔵 [Evolution Handler] BODY type:", typeof req.body, "| keys:", Object.keys(req.body || {}));
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    console.log("[Evolution Handler] 🎯 Received webhook:", {
      method: req.method,
      path: req.path,
      url: fullUrl,
      query: req.query,
    });

    // RESPOSTA IMEDIATA - não bloquear o Evolution
    res.status(200).send("EVENT_RECEIVED");

    // Processar em background (não usar await para não bloquear)
    setImmediate(() => {
      processEvolutionWebhookAsync(req).catch((err) => {
        console.error("[Evolution Webhook] Background processing error:", err);
      });
    });
  } catch (error) {
    console.error("[Evolution Webhook] Handler error:", error);
    // Já enviamos 200, então só logamos o erro
  }
}

async function processEvolutionWebhookAsync(req: Request) {
  try {
    const body = req.body;
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    console.log("1. [Evolution Webhook] 📥 Webhook recebido:", {
      url: fullUrl,
      bodyKeys: Object.keys(body || {}),
      hasData: !!body?.data,
      query: req.query,
    });

    if (!body || Object.keys(body).length === 0) {
      console.log("[Evolution Webhook] Empty body, skipping");
      return;
    }

    // Detectar evento
    let eventName = body?.event || body?.data?.event;
    const queryApikeyRaw = (req.query["apikey"] as string | undefined) || "";
    const apikeyParts = queryApikeyRaw.split("/").filter(Boolean);
    const eventFromQuery = apikeyParts.length > 1 ? apikeyParts.slice(1).join("/") : "";
    if (!eventName && eventFromQuery) {
      eventName = eventFromQuery;
    }
    if (!eventName) {
      const urlParts = fullUrl.split("/evolution")[1] || "";
      const m = urlParts.match(/\/([a-z0-9_-]+)$/i);
      if (m?.[1]) {
        eventName = m[1];
      }
    }

    if (!eventName) {
      console.log("[Evolution Webhook] Event name not detected, ignoring");
      return;
    }

    console.log("[Evolution Webhook] 📥 Received event:", {
      event: eventName,
      hasData: !!body?.data,
      bodyKeys: Object.keys(body),
    });

    console.log("2. [Evolution Webhook] ✅ Evento detectado:", eventName);

    // ==========================================
    // 🚫 BLOQUEIO DE GRUPOS - Early Return
    // ==========================================
    // Extrair remoteJid (identificador da conversa) de várias estruturas possíveis
    const remoteJid =
      body?.data?.key?.remoteJid ||
      body?.data?.remoteJid ||
      body?.destination ||
      body?.data?.message?.key?.remoteJid ||
      "";

    if (remoteJid.includes("@g.us")) {
      console.log(`🚫 [Grupos] Mensagem de grupo ignorada: ${remoteJid}`);
      return; // Não processar nada, silenciosamente
    }

    // ==========================================
    // 🎯 FILTRAGEM CRÍTICA - PROCESSAR APENAS MENSAGENS
    // ==========================================
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");

    // Aceitar variações de eventos de mensagem
    const allowedEvents = ["messages_upsert", "messages_update"];
    
    // Ignorar TUDO que não for mensagem nova
    if (!allowedEvents.includes(normalizedEvent)) {
      console.log(`[Evolution Webhook] ⏭️ Ignoring event type: ${eventName} (normalized: ${normalizedEvent})`);
      return;
    }

    console.log("[Evolution Webhook] ✅ Event approved for processing");
    console.log("3. [Evolution Webhook] ✅ Passou no filtro de eventos permitidos");

    // A partir daqui, processamos APENAS mensagens.upsert
    const db = await getDb();
    if (!db) {
      console.error("[Evolution Webhook] ❌ Database not available");
      return;
    }

    // Extrair apikey da URL (suportar webhook_by_events: apikey/event-name)
    const [configRow] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (configRow) {
      const configData =
        typeof configRow.config === "string"
          ? JSON.parse(configRow.config)
          : configRow.config;
      const expectedApiKey = configData.apiKey || configData.accessToken;

      // Extrair apenas o primeiro segmento antes de "/" (para webhook_by_events)
      const cleanApikey = queryApikeyRaw.split("/")[0].split("@")[0] || "";
      const cleanExpected = expectedApiKey?.split("@")[0] || "";

      // Se há apikey configurada no banco mas não bate com a recebida, logar mas NÃO bloquque
      // Isso permite webhooks de múltiplas instâncias ou mudança de apikey
      if (expectedApiKey && cleanApikey && cleanExpected && cleanApikey !== cleanExpected) {
        console.log("[Evolution Webhook] ⚠️ API key mismatch (continuing anyway):");
        console.log("  Expected:", cleanExpected.substring(0, 5) + "...");
        console.log("  Received:", cleanApikey.substring(0, 5) + "...");
        // NÃO return - permite processamento mesmo com mismatch
      }
    } else {
      console.warn("[Evolution Webhook] ⚠️ No Evolution API config found in database");
    }

    console.log("[Evolution Webhook] 🚀 Starting message processing...");
    // Processar evento de mensagem
    await processEvolutionWebhook({ ...body, event: eventName });
    console.log("[Evolution Webhook] ✅ Message processing completed");
  } catch (error) {
    console.error("[Evolution Webhook] 💥 Unhandled error:", error);
    throw error;
  }
}

/**
 * Process WhatsApp webhook payload
 * Extracts message data and saves to database
 */
async function processWhatsAppWebhook(body: unknown) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // WhatsApp webhook structure:
    // body.entry[].changes[].value.messages[]
    if (!body.entry || !Array.isArray(body.entry)) {
      console.log("[WhatsApp] No entries in payload");
      return;
    }

    for (const entry of body.entry) {
      const changes = entry.changes;
      if (!changes || !Array.isArray(changes)) continue;

      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const messages = value.messages;
        const contacts = value.contacts || [];

        for (const message of messages) {
          const messageId = message.id;
          const from = message.from;
          const timestamp = parseInt(message.timestamp, 10);
          const type = message.type;

          // Get sender name from contacts array
          const contact = contacts.find((c: unknown) => c.wa_id === from);
          const fromName = contact?.profile?.name || null;

          // Extract message content based on type
          let messageText = null;
          let mediaUrl = null;
          let mediaId = null;
          let mimeType = null;
          let caption = null;
          let latitude = null;
          let longitude = null;
          let fileName = null;
          let fileSize: number | null = null;

          switch (type) {
            case "text":
              messageText = message.text?.body || null;
              break;
            case "image":
              mediaId = message.image?.id || null;
              caption = message.image?.caption || null;
              mimeType = message.image?.mime_type || null;
              fileName = message.image?.file_name || null;
              fileSize = message.image?.file_size ? parseInt(message.image.file_size) : null;
              break;
            case "audio":
              mediaId = message.audio?.id || null;
              mimeType = message.audio?.mime_type || null;
              fileName = message.audio?.file_name || null;
              fileSize = message.audio?.file_size ? parseInt(message.audio.file_size) : null;
              break;
            case "video":
              mediaId = message.video?.id || null;
              caption = message.video?.caption || null;
              mimeType = message.video?.mime_type || null;
              fileName = message.video?.file_name || null;
              fileSize = message.video?.file_size ? parseInt(message.video.file_size) : null;
              break;
            case "document":
              mediaId = message.document?.id || null;
              caption = message.document?.caption || null;
              mimeType = message.document?.mime_type || null;
              fileName = message.document?.file_name || null;
              fileSize = message.document?.file_size ? parseInt(message.document.file_size) : null;
              break;
            case "location":
              latitude = message.location?.latitude || null;
              longitude = message.location?.longitude || null;
              break;
            case "sticker":
              mediaId = message.sticker?.id || null;
              mimeType = message.sticker?.mime_type || null;
              fileName = message.sticker?.file_name || null;
              fileSize = message.sticker?.file_size ? parseInt(message.sticker.file_size) : null;
              break;
            case "reaction":
              messageText = message.reaction?.emoji || null;
              break;
            case "contact":
              messageText = JSON.stringify(message.contacts || []);
              break;
            default:
              console.log(`[WhatsApp] Unknown message type: ${type}`);
          }

          const existing = await getReceivedMessageByExternalId(
            messageId,
            "whatsapp"
          );
          if (existing) {
            console.log(`[WhatsApp] Duplicate message ${messageId} ignored`);
            continue;
          }

          // Save to database (idempotent - ignore duplicates)
          try {
            await db.insert(receivedMessages).values({
              provider: "whatsapp",
              externalId: messageId,
              fromNumber: from,
              fromName: fromName,
              messageType: [
                "text",
                "image",
                "audio",
                "video",
                "document",
                "location",
                "contact",
                "sticker",
                "reaction",
              ].includes(type)
                ? (type as any)
                : "unknown",
              messageText,
              mediaUrl,
              mediaId,
              mimeType,
              caption,
              latitude: latitude ? latitude.toString() : null,
              longitude: longitude ? longitude.toString() : null,
              timestamp,
              rawPayload: JSON.stringify(message),
              processed: 0,
            }).onConflict({
              target: [receivedMessages.provider, receivedMessages.externalId],
            }).doNothing();
          } catch (e: unknown) {
            if (!e.message.includes('Duplicate entry') && !e.message.includes('already exists')) {
              throw e;
            }
            console.log(`[WhatsApp] Duplicate message ${messageId} ignored (onConflict)`);
          }

          // Check if this might be a survey response (single digit 1-5)
          // Survey responses should NOT be inserted into conversationMessages
          // They will be processed by the chatbot and saved to survey_responses table
          const isPossibleSurveyResponse =
            type === "text" &&
            messageText &&
            /^\s*[1-5]\s*$/.test(messageText.trim());

          if (!isPossibleSurveyResponse) {
            // Only insert non-survey messages into conversationMessages
            await ingestInboundConversationMessage({
              provider: "whatsapp",
              fromNumber: from,
              fromName,
              messageType: [
                "text",
                "image",
                "audio",
                "video",
                "document",
                "location",
                "contact",
                "sticker",
                "reaction",
              ].includes(type)
                ? type
                : "unknown",
              messageText,
              caption,
              mediaUrl,
              mediaId,
              mimeType,
              fileName,
              fileSize,
              externalId: messageId, // Add this to trigger S3 download
              createdAt: new Date(),
            });
            console.log(
              `[WhatsApp] Saved message ${messageId} from ${from} to conversation`
            );
          } else {
            console.log(
              `[WhatsApp] Message ${messageId} from ${from} appears to be a survey response, not inserting into conversation`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("[WhatsApp] Processing error:", error);
    throw error;
  }
}

/**
 * Process Instagram webhook payload
 * Extracts message data and saves to database
 */

async function downloadMediaToBuffer(url: string): Promise<Buffer | null> {
  try {
    console.log("[downloadMediaToBuffer] Downloading:", url.substring(0, 100));
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)",
      },
    });
    if (!response.ok) {
      console.error("[downloadMediaToBuffer] HTTP error:", response.status, response.statusText);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[downloadMediaToBuffer] Download failed:", err);
    return null;
  }
}

async function processInstagramWebhook(body: unknown) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Instagram webhook structure:
    // body.entry[].messaging[]
    if (!body.entry || !Array.isArray(body.entry)) {
      console.log("[Instagram] No entries in payload");
      return;
    }

    for (const entry of body.entry) {
      const messaging = entry.messaging;
      if (!messaging || !Array.isArray(messaging)) continue;

      for (const event of messaging) {
        const sender = event.sender?.id;
        const recipient = event.recipient?.id;
        const timestamp = event.timestamp;
        const message = event.message;

        if (!message || !sender) continue;

        const messageId = message.mid;
        let text = message.text || null;

        // Extract attachments
        let mediaUrl = null;
        let mediaId = null;
        let mimeType = null;
        let messageType: unknown = "text";

        if (message.attachments && Array.isArray(message.attachments)) {
          const attachment = message.attachments[0];
          const type = attachment.type;
          const payload = attachment.payload;

          messageType =
            type === "image"
              ? "image"
              : type === "video"
                ? "video"
                : type === "audio"
                  ? "audio"
                  : type === "file"
                    ? "document"
                    : type === "story"
                      ? "image"
                      : type === "story_template"
                        ? "image"
                        : type === "fallback"
                          ? "image"
                          : "unknown";

          let rawMediaUrl = payload?.url || null;

          // Download and upload to R2 for Instagram media URLs (hotlink protection)
          // NOW WITH: Full validation (magic bytes, size, hashes) + retry
          if (rawMediaUrl && !cleanR2Url(rawMediaUrl)) {
            try {
              const { downloadWithValidation } = await import("./services/media-validator");
              const { uploadToR2 } = await import("./r2-client");
              
              const validated = await downloadWithValidation(rawMediaUrl, { 
                expectedMimeType: attachment.mime_type || undefined,
                maxRetries: 3,
              });
              
              const fileName = rawMediaUrl.split("/").pop() || "instagram-media";
              const uploadResult = await uploadToR2(validated.buffer, fileName, validated.mimeType);
              rawMediaUrl = uploadResult.url;
              console.log("[Instagram] ✅ Mídia validada e upada para R2:", { 
                url: rawMediaUrl, 
                etag: uploadResult.etag, 
                size: uploadResult.size,
                mime: validated.mimeType 
              });
            } catch (downloadErr) {
              console.error("[Instagram] ❌ Falha ao baixar/validar/upload mídia:", downloadErr);
            }
          }

          mediaUrl = cleanR2Url(rawMediaUrl) || rawMediaUrl;

          // Priority for story caption (Instagram may send text in caption field)
          const storyCaption = attachment.caption || attachment.story_caption || null;
          if (storyCaption) {
            text = text || storyCaption;
          }
        }

        // Story reply: cliente respondeu a um story. O Instagram envia a imagem do
        // story em message.reply_to.story (NÃO em attachments). Precisamos anexar
        // essa imagem como mídia e manter o texto digitado embaixo.
        if (!mediaUrl && message.reply_to && message.reply_to.story) {
          const storyUrl =
            message.reply_to.story.url ||
            message.reply_to.story.cdn_url ||
            message.reply_to.story.link ||
            null;
          if (storyUrl) {
            let rawStoryUrl = storyUrl;
            // Download + upload to R2 (Instagram story URLs expire / hotlink-protected)
            // NOW WITH: Full validation + retry
            if (!cleanR2Url(rawStoryUrl)) {
              try {
                const { downloadWithValidation } = await import("./services/media-validator");
                const { uploadToR2 } = await import("./r2-client");
                
                const validated = await downloadWithValidation(rawStoryUrl, { 
                  maxRetries: 3,
                });
                
                const fileName = `story-${messageId || Date.now()}.${validated.extension}`;
                const uploadResult = await uploadToR2(validated.buffer, fileName, validated.mimeType);
                rawStoryUrl = uploadResult.url;
                console.log("[Instagram] ✅ Story image validada e upada para R2:", { 
                  url: rawStoryUrl, 
                  etag: uploadResult.etag, 
                  size: uploadResult.size,
                  mime: validated.mimeType 
                });
              } catch (storyErr) {
                console.error("[Instagram] ❌ Falha ao baixar/validar/upload story image:", storyErr);
              }
            }
            mediaUrl = cleanR2Url(rawStoryUrl) || rawStoryUrl;
            messageType = "image";
            // texto digitado pelo cliente já está em `text` e será exibido embaixo da imagem
            console.log("[Instagram] Story reply detected — attaching story image + reply text");
          }
        }

        // Buscar foto de perfil do cliente (com cache) para exibir na tela de conversas
        let profilePic: string | null = null;
        try {
          profilePic = await resolveProfilePic("instagram", sender);
        } catch (picErr) {
          console.warn("[Instagram] Could not resolve profile pic:", (picErr as Error).message);
        }

        const existing = await getReceivedMessageByExternalId(
          messageId,
          "instagram"
        );
        if (existing) {
          console.log(`[Instagram] Duplicate message ${messageId} ignored`);
          continue;
        }

        // Save to database (idempotent - ignore duplicates)
        try {
          await db.insert(receivedMessages).values({
            provider: "instagram",
            externalId: messageId,
            fromNumber: sender,
            fromName: null, // Instagram doesn't provide name in webhook
            fromProfilePic: profilePic,
            messageType,
            messageText: text,
            mediaUrl,
            mediaId,
            mimeType,
            caption: null,
            latitude: null,
            longitude: null,
            timestamp,
            rawPayload: JSON.stringify(event),
            processed: 0,
          }).onConflict({
            target: [receivedMessages.provider, receivedMessages.externalId],
          }).doNothing();
        } catch (e: unknown) {
          // Se erro de duplicidade e onConflict não suportado ou falhou, ignorar silenciosamente
          if (!e.message.includes('Duplicate entry') && !e.message.includes('already exists')) {
            throw e;
          }
          console.log(`[Instagram] Duplicate message ${messageId} ignored (onConflict)`);
        }

        // Check if this might be a survey response (single digit 1-5)
        const isPossibleSurveyResponse =
          messageType === "text" && text && /^\s*[1-5]\s*$/.test(text.trim());

        if (!isPossibleSurveyResponse) {
          await ingestInboundConversationMessage({
            provider: "instagram",
            fromNumber: sender,
            fromName: null,
            messageType,
            messageText: text,
            caption: null,
            mediaUrl,
            mediaId: null,
            mimeType,
            externalId: messageId, // Add this to trigger S3 download
            createdAt: new Date(),
          });
          console.log(
            `[Instagram] Saved message ${messageId} from ${sender} to conversation`
          );
        } else {
          console.log(
            `[Instagram] Message ${messageId} from ${sender} appears to be a survey response, not inserting into conversation`
          );
        }
      }
    }
  } catch (error) {
    console.error("[Instagram] Processing error:", error);
    throw error;
  }
}

function extractEvolutionMessage(body: unknown) {
  const payload = body?.data || body?.payload || body;
  const messageEntry =
    payload?.message ||
    payload?.messages?.[0] ||
    payload?.messages?.[0]?.message ||
    payload?.data?.messages?.[0] ||
    payload?.data?.message ||
    payload?.message ||
    body?.message;

  const key =
    payload?.key ||
    payload?.data?.key ||
    payload?.message?.key ||
    messageEntry?.key ||
    messageEntry?.message?.key;

  const fromMe = key?.fromMe ?? messageEntry?.key?.fromMe ?? payload?.fromMe;
  const remoteJid =
    key?.remoteJid ||
    messageEntry?.key?.remoteJid ||
    payload?.remoteJid ||
    payload?.from;
  const pushName =
    payload?.pushName ||
    payload?.senderName ||
    payload?.contact?.name ||
    messageEntry?.pushName;
  const message = messageEntry?.message || messageEntry;

  return {
    message,
    remoteJid,
    pushName,
    fromMe,
    messageId: key?.id || payload?.id || messageEntry?.id,
  };
}

function parseEvolutionMessageContent(message: unknown, rawMessageType?: string, contextInfoFromData?: unknown) {
  if (!message)
    return {
      type: "unknown",
      text: null,
      caption: null,
      mediaUrl: null,
      mimeType: null,
      fileName: null,
      fileSize: null,
    };

  // ===========================================
  // 🎯 DESEMPACOTAMENTO DE VIEW ONCE E OUTROS WRAPPERS
  // O WhatsApp (Baileys) encapsula mídias em viewOnceMessage, viewOnceMessageV2, etc.
  // Precisamos extrair a mensagem real desses wrappers
  // ===========================================
  const actualMessage = 
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message;

// 🎯 EXTRAIR TEXTO - Para respostas a stories, texto está em message.conversation
  // Para mensagens de texto normais, também está em message.conversation ou extendedTextMessage.text
let text: string | null = null;
if (message.conversation) {
    text = message.conversation;
} else if (message.extendedTextMessage?.text) {
    text = message.extendedTextMessage.text;
}

  // ===========================================
  // 🎯 PRIORIDADE 1: Usar messageType da Evolution API
  // A Evolution envia o tipo exato em payload.data.messageType
  // ===========================================
  let typeToSave = 'text';
  if (rawMessageType) {
    if (rawMessageType === 'imageMessage') typeToSave = 'image';
    else if (rawMessageType === 'audioMessage') typeToSave = 'audio';
    else if (rawMessageType === 'videoMessage') typeToSave = 'video';
    else if (rawMessageType === 'documentMessage') typeToSave = 'document';
    else if (rawMessageType === 'conversation') typeToSave = 'text';
    else if (rawMessageType === 'stickerMessage') typeToSave = 'sticker';
    else if (rawMessageType === 'locationMessage') typeToSave = 'location';
    else if (rawMessageType === 'contactMessage') typeToSave = 'contact';
    else if (rawMessageType === 'reactionMessage') typeToSave = 'reaction';
  }

  // ===========================================
  // 🎯 PRIORIDADE 2: Extrair mimetype específico baseado no tipo
  // ===========================================
  let mimeType: string | null = null;
  
  // Primeiro: tentar mimetype do tipo específico (documentMessage, imageMessage, etc)
  if (typeToSave === 'image' && actualMessage.imageMessage?.mimetype) {
    mimeType = actualMessage.imageMessage.mimetype || actualMessage.imageMessage.mimeType || null;
  } else if (typeToSave === 'video' && actualMessage.videoMessage?.mimetype) {
    mimeType = actualMessage.videoMessage.mimetype || actualMessage.videoMessage.mimeType || null;
  } else if (typeToSave === 'audio' && actualMessage.audioMessage?.mimetype) {
    mimeType = actualMessage.audioMessage.mimetype || actualMessage.audioMessage.mimeType || null;
  } else if (typeToSave === 'document' && actualMessage.documentMessage?.mimetype) {
    mimeType = actualMessage.documentMessage.mimetype || actualMessage.documentMessage.mimeType || null;
  } else if (typeToSave === 'sticker' && actualMessage.stickerMessage?.mimetype) {
    mimeType = actualMessage.stickerMessage.mimetype || actualMessage.stickerMessage.mimeType || null;
  }
  
  // Fallback 1: mimetype genérico na mensagem
  if (!mimeType) {
    mimeType = message.mimetype || message.mimeType || message.fileMimeType || null;
  }

  // ===========================================
  // 🎯 PRIORIDADE 2.5: Extrair fileName específico por tipo
  // ===========================================
  let fileName: string | null = null;
  
  // Priorizar fileName do tipo específico (documentMessage, imageMessage, etc)
  if (typeToSave === 'image' && actualMessage.imageMessage?.fileName) {
    fileName = actualMessage.imageMessage.fileName;
  } else if (typeToSave === 'video' && actualMessage.videoMessage?.fileName) {
    fileName = actualMessage.videoMessage.fileName;
  } else if (typeToSave === 'audio' && actualMessage.audioMessage?.fileName) {
    fileName = actualMessage.audioMessage.fileName;
  } else if (typeToSave === 'document' && actualMessage.documentMessage) {
    // Documentos: fileName ou title (title é fallback comum)
    fileName = actualMessage.documentMessage.fileName || actualMessage.documentMessage.title || null;
  } else if (typeToSave === 'sticker' && actualMessage.stickerMessage?.fileName) {
    fileName = actualMessage.stickerMessage.fileName;
  }
  
  // Fallback: usar message.fileName genérico
  if (!fileName) {
    fileName = message.fileName || null;
  }

  // Se ainda não temos fileName mas temos tipo, gerar nome padrão
  if (!fileName) {
    const typeNames: Record<string, string> = {
      image: 'imagem',
      video: 'video',
      audio: 'audio',
      document: 'documento',
      sticker: 'sticker',
      location: 'localizacao',
      contact: 'contato',
      reaction: 'reacao'
    };
    fileName = `${typeNames[typeToSave] || 'arquivo'}_${Date.now()}`;
  }
  if (!mimeType && fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
      mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    mimeType = mimeMap[ext || ''] || null;
  }

  // 🎯 BLINDAGEM PARA DOCUMENTOS ENCAPSULADOS (documentWithCaptionMessage)
  // O WhatsApp às vezes envia documentos com legenda dentro de documentWithCaptionMessage
  // Nesse caso, o documentMessage original fica aninhado: documentWithCaptionMessage.actualMessage.documentMessage
  // Precisamos re-extrair fileName e mimeType diretamente do documento real
  const docWrapper = message.documentWithCaptionMessage;
  if (docWrapper?.message?.documentMessage) {
    const realDoc = docWrapper.actualMessage.documentMessage;
    // Sobrescrever fileName e mimeType com os valores reais do documento
    if (realDoc.fileName) fileName = realDoc.fileName;
    else if (realDoc.title) fileName = realDoc.title;
    
    // Se o mimeType não foi capturado ou é genérico, tentar do documento real
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = realDoc.mimetype || realDoc.mimeType || null;
    }
    
    console.log("[Blindagem] documentWithCaptionMessage detectado. fileName extraído:", fileName, "mimeType:", mimeType);
  }

  // ===========================================
  // 🎯 PRIORIDADE 3: Extrair URL (sempre usar message.mediaUrl primeiro)
  // ===========================================
  // 🎯 PRIORIDADE 3: Extrair URL (sempre usar message.mediaUrl primeiro)
  // ===========================================
  let rawUrl: string | null = null;
  
  // Primeiro: message.mediaUrl (URL do R2/Cloudflare) - MAIS IMPORTANTE
  if (message.mediaUrl) {
    rawUrl = message.mediaUrl;
  } else if (typeToSave === 'image' && actualMessage.imageMessage) {
    rawUrl = actualMessage.imageMessage.url || actualMessage.imageMessage.mediaUrl || null;
  } else if (typeToSave === 'video' && actualMessage.videoMessage) {
    rawUrl = actualMessage.videoMessage.url || actualMessage.videoMessage.mediaUrl || null;
  } else if (typeToSave === 'audio' && actualMessage.audioMessage) {
    rawUrl = actualMessage.audioMessage.url || actualMessage.audioMessage.mediaUrl || null;
  } else if (typeToSave === 'document' && actualMessage.documentMessage) {
    rawUrl = actualMessage.documentMessage.url || actualMessage.documentMessage.mediaUrl || null;
  } else if (typeToSave === 'sticker' && actualMessage.stickerMessage) {
    rawUrl = actualMessage.stickerMessage.url || actualMessage.stickerMessage.mediaUrl || null;
  }

// Story reply via conversation (contextInfo na raiz do data)
if (!rawUrl && contextInfoFromData?.quotedMessage?.imageMessage?.url) {
  rawUrl = contextInfoFromData.quotedMessage.imageMessage.url;
  typeToSave = 'image'; } else if (!rawUrl && contextInfoFromData?.quotedMessage?.videoMessage?.url) {
  rawUrl = contextInfoFromData.quotedMessage.videoMessage.url;
  typeToSave = 'video'; }

  // Limpar URL do R2 para obter apenas o caminho relativo
  let mediaUrl = rawUrl ? cleanR2Url(rawUrl) : null;

  // Se não é R2, retornar rawUrl para download posterior
  let needsDownload = rawUrl && !mediaUrl;

  // ===========================================
  // 🎯 Texto e Caption
  // ===========================================
  let caption: string | null = null;

  // ===========================================
  // 🎯 FileSize declaration (moved outside text block)
  // ===========================================
  let fileSize: number | null = message.fileSize ||
    actualMessage.imageMessage?.fileSize ||
    actualMessage.videoMessage?.fileSize ||
    actualMessage.documentMessage?.fileSize ||
    actualMessage.audioMessage?.fileSize || null;

  // 🎯 Store quotedMessage for later access (needed for mediaKey/directPath)
  const quotedMessage = message.extendedTextMessage?.contextInfo?.quotedMessage || (contextInfoFromData as any)?.quotedMessage;

  if (typeToSave === 'text' || typeToSave === 'unknown') {
    // Text already set at the start of the function
    if (quotedMessage) {
      console.log("[Parse] Detected quotedMessage in extendedTextMessage (story reply)");
      
      // Detect media type from quoted message
      if (quotedMessage.imageMessage) {
        typeToSave = 'image';
        rawUrl = quotedMessage.imageMessage.url || quotedMessage.imageMessage.mediaUrl || null;
        // Try to get mediaKey/directPath for authenticated download
        const quotedMediaKey = quotedMessage.imageMessage.mediaKey || quotedMessage.imageMessage.directPath || null;
        mimeType = quotedMessage.imageMessage.mimetype || quotedMessage.imageMessage.mimeType || null;
        fileName = quotedMessage.imageMessage.fileName || null;
        fileSize = quotedMessage.imageMessage.fileSize || null;
        caption = quotedMessage.imageMessage.caption || null;
        console.log("[Parse] Story reply with imageMessage detected. mediaKey available:", !!quotedMediaKey);
      } else if (quotedMessage.videoMessage) {
        typeToSave = 'video';
        rawUrl = quotedMessage.videoMessage.url || quotedMessage.videoMessage.mediaUrl || null;
        mimeType = quotedMessage.videoMessage.mimetype || quotedMessage.videoMessage.mimeType || null;
        fileName = quotedMessage.videoMessage.fileName || null;
        fileSize = quotedMessage.videoMessage.fileSize || null;
        caption = quotedMessage.videoMessage.caption || null;
        console.log("[Parse] Story reply with videoMessage detected");
      } else if (quotedMessage.stickerMessage) {
        typeToSave = 'sticker';
        rawUrl = quotedMessage.stickerMessage.url || quotedMessage.stickerMessage.mediaUrl || null;
        mimeType = quotedMessage.stickerMessage.mimetype || quotedMessage.stickerMessage.mimeType || null;
        fileName = quotedMessage.stickerMessage.fileName || null;
        fileSize = quotedMessage.stickerMessage.fileSize || null;
        console.log("[Parse] Story reply with stickerMessage detected");
      } else if (quotedMessage.audioMessage) {
        typeToSave = 'audio';
        rawUrl = quotedMessage.audioMessage.url || quotedMessage.audioMessage.mediaUrl || null;
        mimeType = quotedMessage.audioMessage.mimetype || quotedMessage.audioMessage.mimeType || null;
        fileName = quotedMessage.audioMessage.fileName || null;
        fileSize = quotedMessage.audioMessage.fileSize || null;
        caption = quotedMessage.audioMessage.caption || null;
        console.log("[Parse] Story reply with audioMessage detected");
      } else if (quotedMessage.documentMessage) {
        typeToSave = 'document';
        rawUrl = quotedMessage.documentMessage.url || quotedMessage.documentMessage.mediaUrl || null;
        mimeType = quotedMessage.documentMessage.mimetype || quotedMessage.documentMessage.mimeType || null;
        fileName = quotedMessage.documentMessage.fileName || quotedMessage.documentMessage.title || null;
        fileSize = quotedMessage.documentMessage.fileSize || null;
        caption = quotedMessage.documentMessage.caption || null;
        console.log("[Parse] Story reply with documentMessage detected");
      }
    }

    // ===========================================
    // 🎯 RECALCULAR mediaUrl e needsDownload após story reply
    // Quando o quotedMessage mudar typeToSave/rawUrl, recalcular as variáveis
    // ===========================================
    if (rawUrl && !mediaUrl) {
      mediaUrl = cleanR2Url(rawUrl);
      needsDownload = rawUrl && !mediaUrl;
      console.log("[Parse] Recalculated mediaUrl after story reply:", mediaUrl ? "FOUND" : "needs download");
    }
  } else {
    caption = message.caption || 
              actualMessage.imageMessage?.caption || 
              actualMessage.videoMessage?.caption || 
              actualMessage.documentMessage?.caption || null;
  }

  // ===========================================
  // 🎯 TRATAMENTO DE LOCALIZAÇÃO (Transforma em Link)
  // ===========================================
  const locationMsg = actualMessage?.locationMessage || actualMessage?.liveLocationMessage;
  
  if (locationMsg) {
    const lat = locationMsg.degreesLatitude || locationMsg.latitude;
    const lng = locationMsg.degreesLongitude || locationMsg.longitude;
    
    if (lat && lng) {
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      let locationText = `📍 *Localização Recebida:*\n${mapsUrl}`;
      
      if (locationMsg.name) locationText += `\nLocal: ${locationMsg.name}`;
      if (locationMsg.address) locationText += `\nEndereço: ${locationMsg.address}`;
      
      text = locationText;
    }
  }

  // ===========================================
  // 🎯 FileSize (tentar de qualquer fonte)
  // ===========================================
  // Base64 (apenas para imagens, se fornecido)
  const base64 = typeToSave === 'image' ? actualMessage.imageMessage?.base64 || null : null;
  // 🎯 Include quotedMessage mediaKey/directPath for story replies
  const mediaKey = (typeToSave === 'image' && actualMessage.imageMessage?.mediaKey) ||
                   (typeToSave === 'video' && actualMessage.videoMessage?.mediaKey) ||
                   (typeToSave === 'audio' && actualMessage.audioMessage?.mediaKey) ||
                   (typeToSave === 'document' && actualMessage.documentMessage?.mediaKey) ||
                   (typeToSave === 'image' && quotedMessage?.imageMessage?.mediaKey) ||
                   (typeToSave === 'video' && quotedMessage?.videoMessage?.mediaKey) ||
                   (typeToSave === 'audio' && quotedMessage?.audioMessage?.mediaKey) ||
                   (typeToSave === 'document' && quotedMessage?.documentMessage?.mediaKey) ||
                   null;
  const directPath = (typeToSave === 'image' && actualMessage.imageMessage?.directPath) ||
                     (typeToSave === 'video' && actualMessage.videoMessage?.directPath) ||
                     (typeToSave === 'audio' && actualMessage.audioMessage?.directPath) ||
                     (typeToSave === 'document' && actualMessage.documentMessage?.directPath) ||
                     (typeToSave === 'image' && quotedMessage?.imageMessage?.directPath) ||
                     (typeToSave === 'video' && quotedMessage?.videoMessage?.directPath) ||
                     (typeToSave === 'audio' && quotedMessage?.audioMessage?.directPath) ||
                     (typeToSave === 'document' && quotedMessage?.documentMessage?.directPath) ||
                     null;
  const quotedRawUrl = (typeToSave === 'image' && quotedMessage?.imageMessage?.url) ||
                       (typeToSave === 'video' && quotedMessage?.videoMessage?.url) ||
                       (typeToSave === 'audio' && quotedMessage?.audioMessage?.url) ||
                       (typeToSave === 'document' && quotedMessage?.documentMessage?.url) ||
                       null;

  return {
    type: typeToSave as any,
    text,
    caption,
    mediaUrl,
    rawUrl,
    quotedRawUrl,
    needsDownload,
    mimeType,
    fileName,
    fileSize,
    isStoryReply: !!quotedMessage,
    // Campos extras que podem ser úteis
    ...(base64 && { base64 }),
    ...(mediaKey && { mediaKey }),
    ...(directPath && { directPath }),
  };
}

async function processEvolutionWebhook(body: unknown) {
  try {
    console.log("4. [Evolution] 🚀 Iniciando processEvolutionWebhook");
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Normalizar nome do evento
    let eventName = body?.event || body?.data?.event || "";
    if (!eventName && body?.key) eventName = "messages.upsert";
    else if (!eventName && body?.remoteJid) eventName = "messages.upsert";

    if (!eventName) return;

    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");

    // Evento de contatos
    if (normalizedEvent.includes("contact") || normalizedEvent === "contacts_update") {
      let remoteJid = body?.data?.remoteJid || body?.remoteJid || extractEvolutionRemoteJid(body);
      if (!remoteJid && Array.isArray(body)) remoteJid = body[0]?.remoteJid;
      
      const fromNumber = normalizeInboundNumber(remoteJid);
      if (!fromNumber) return;

      const pushName = body?.data?.profileName || body?.profileName || body?.data?.name || body?.name || null;
      await findOrCreateCustomerByPhone(fromNumber, pushName);
      return;
    }

    // Evento de mensagens
    if (normalizedEvent === "messages_upsert" || normalizedEvent === "messages.upsert") {
      try {
        const data = body?.data || body;
        const messageData = data?.message || data?.messages?.[0] || body || {};
        const key = data?.key || messageData?.key || {};
        const messageContent = messageData?.message || messageData;

        // 🎯 Garantir messageId NUNCA nulo/undefined - fallback robusto
        let messageId = key?.id || data?.id || messageData?.id;
        if (!messageId) {
          messageId = `evo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.warn("[Evolution Webhook] ⚠️ Message ID missing, using generated fallback:", messageId);
        }
        const remoteJid = key?.remoteJid || data?.remoteJid || messageData?.remoteJid || body?.remoteJid || extractEvolutionRemoteJid(body);
        const pushName = data?.pushName || data?.senderName || messageData?.pushName || body?.pushName || body?.sender?.name || body?.sender?.pushName || body?.data?.sender?.name;
        const fromMe = key?.fromMe ?? data?.fromMe ?? messageData?.fromMe ?? body?.fromMe;
        const messageTimestamp = data?.messageTimestamp || messageData?.timestamp || messageContent?.timestamp || Math.floor(Date.now() / 1000);
        const rawMessageType = data?.messageType || null; // PRIORITY: Evolution API message type

        // Se não tem remoteJid, não dá pra processar
        if (!remoteJid) {
          console.log("[Evolution Webhook] Missing remoteJid, skipping");
          return;
        }

        const fromNumber = normalizeInboundNumber(remoteJid);
        if (!fromNumber) return;

        // Determinar tipo e conteúdo da mensagem (rápido, sem download)
        // 🎯 contextInfo deve vir de data.message.contextInfo (Evolution API docs) ou data.contextInfo (fallback)
                const contextInfoForParse = data?.message?.contextInfo || data?.contextInfo || null;

                const parsed = parseEvolutionMessageContent(messageContent, rawMessageType, contextInfoForParse);
                let messageType = parsed.type; // DECLARAR ANTES DO STORY REPLY
                let messageText = parsed.text;
                const caption = parsed.caption;
                let mediaUrl = parsed.mediaUrl; // DECLARAR ANTES DO STORY REPLY

                // Detectar mensagens enviadas pelo celular (fromMe === true) - DEVE VIR ANTES DO STORY REPLY
                const isSentByMe = fromMe === true || fromMe === "true" || fromMe === 1;

                console.log("5. [Evolution] fromMe check:", { isSentByMe, fromMe, fromNumber, messageType });

                if (!isSentByMe) {
                  console.log("[Evolution Webhook] Received inbound message from:", fromNumber, "type:", messageType);
                }

                // 🎯 STORY REPLY DETECTION - Verificar contextInfo.remoteJid === 'status@broadcast' + quotedMessage
                                                        // A Evolution API envia story replies COM contextInfo (não @lid no remoteJid principal)
                                                        const contextInfo = data?.contextInfo || data?.message?.contextInfo || {};
                                                        const isStoryReply = contextInfo.remoteJid === 'status@broadcast' && 
                                                          (contextInfo.quotedMessage?.imageMessage || contextInfo.quotedMessage?.videoMessage);
      
                                                        if (isStoryReply) {
                                                          console.log("🚨🚨🚨 [Evolution Webhook] STORY REPLY DETECTADO - INICIANDO PROCESSAMENTO 🚨🚨🚨");
                                                          console.log("[Evolution Webhook] 🎯 STORY REPLY DETECTADO via status@broadcast + quotedMessage");
                                                          // Log completo do quotedMessage para debug
                                                          console.log("[Evolution Webhook] 📋 quotedMessage keys:", Object.keys(contextInfo.quotedMessage || {}));
                                          if (contextInfo.quotedMessage?.imageMessage) {
                                            console.log("[Evolution Webhook] 📋 imageMessage keys:", Object.keys(contextInfo.quotedMessage.imageMessage));
                                            console.log("[Evolution Webhook] 📋 imageMessage mediaKey:", !!contextInfo.quotedMessage.imageMessage.mediaKey);
                                            console.log("[Evolution Webhook] 📋 imageMessage directPath:", !!contextInfo.quotedMessage.imageMessage.directPath);
                                            console.log("[Evolution Webhook] 📋 imageMessage url:", !!contextInfo.quotedMessage.imageMessage.url);
                                            console.log("[Evolution Webhook] 📋 imageMessage mediaUrl:", !!contextInfo.quotedMessage.imageMessage.mediaUrl);
                                          }
                                          if (contextInfo.quotedMessage?.videoMessage) {
                                            console.log("[Evolution Webhook] 📋 videoMessage keys:", Object.keys(contextInfo.quotedMessage.videoMessage));
                                          }
                                          console.log("[Evolution Webhook] 📋 stanzaId (original story ID):", contextInfo.stanzaId);
         
                                          // Se já temos mídia do quotedMessage (contextInfo), usar direto
                                          const quotedMedia = contextInfo.quotedMessage?.imageMessage || contextInfo.quotedMessage?.videoMessage;
                                          if (quotedMedia?.url || quotedMedia?.mediaUrl) {
                                            let storyMediaUrl = quotedMedia.url || quotedMedia.mediaUrl;
                                            messageType = contextInfo.quotedMessage?.imageMessage ? 'image' : 'video';
                           
                                            // 🎯 Baixar via Evolution API e subir pro R2 (com validação robusta)
                                            // A URL do WhatsApp CDN (mmg.whatsapp.net) é hotlink-protected
                                            const isWhatsAppCdn = storyMediaUrl.includes("mmg.whatsapp.net") || 
                                              storyMediaUrl.includes("pps.whatsapp.net") || 
                                              storyMediaUrl.includes("whatsapp.net") || 
                                              storyMediaUrl.includes("whatsapp.com");
                           
                                            if (isWhatsAppCdn) {
                                              try {
                                                console.log("[Evolution Webhook] 📥 Baixando mídia do story via Evolution API (com validação)...");
                                                const { downloadWhatsAppMediaFromEvolution } = await import("./services/evolution-download");
                                                const { uploadToR2 } = await import("./r2-client");
                                                const mediaBuffer = await downloadWhatsAppMediaFromEvolution({
                                                  url: storyMediaUrl,
                                                  messageKey: { id: messageId, remoteJid, fromMe: false }
                                                });
                                                if (mediaBuffer) {
                                                  const fileName = `story-${messageId}.${messageType === 'video' ? 'mp4' : 'jpg'}`;
                                                  const uploadResult = await uploadToR2(mediaBuffer, fileName, messageType === 'video' ? "video/mp4" : "image/jpeg");
                                                  mediaUrl = cleanR2Url(uploadResult.url);
                                                  console.log("[Evolution Webhook] ✅ Story reply: mídia validada e upada pro R2:", { 
                                                    url: mediaUrl, 
                                                    etag: uploadResult.etag, 
                                                    size: uploadResult.size 
                                                  });
                                                } else {
                                                  console.log("[Evolution Webhook] ⚠️ Falha ao baixar/validar mídia do story via Evolution");
                                                }
                                              } catch (downloadErr) {
                                                console.error("[Evolution Webhook] ❌ Erro ao baixar/validar mídia do story:", downloadErr);
                                              }
                                            } else {
                                              // URL não é CDN (raro), usar direto
                                              mediaUrl = storyMediaUrl;
                                              console.log("[Evolution Webhook] ✅ Story reply: mídia extraída do quotedMessage (não CDN):", mediaUrl);
                                            }
                                          } else {
                                            // 🚨 SEM URL NO QUOTEDMESSAGE - usar getBase64FromMediaMessage + thumbnail fallback
                                            console.log("[Evolution Webhook] ⚠️ quotedMessage NÃO tem url/mediaUrl - tentando getBase64FromMediaMessage");
                                            
                                            // PRESERVAR participant original (não o normalizado vazio)
                                            // No log, participant aparece como '84735929938087@lid' na primeira ocorrência
                                            // mas vazio na versão normalizada. Precisamos do original!
                                            const rawContextInfo = data?.contextInfo || {};
                                            const storyParticipant = rawContextInfo.participant || 
                                                                    data?.key?.participant || 
                                                                    data?.participant || 
                                                                    '';
                                            console.log("[Evolution Webhook] 📋 storyParticipant:", storyParticipant || '(vazio)');

                                            const originalStoryId = contextInfo.stanzaId || messageId;
                                            const quotedMsg = contextInfo.quotedMessage;
                                            const quotedImage = quotedMsg?.imageMessage;
                                            const quotedVideo = quotedMsg?.videoMessage;
                                            const isImage = !!quotedImage;
                                            const isVideo = !!quotedVideo;
                                            const mimeType = isImage ? 'image/jpeg' : 'video/mp4';
                                            const ext = isImage ? 'jpg' : 'mp4';

                                            let mediaBuffer: Buffer | null = null;
                                            let source = '';

                                            // TENTATIVA 1: getBase64FromMediaMessage (endpoint correto para stories)
                                            if (originalStoryId && storyParticipant) {
                                              try {
                                                const { getStoryMediaViaBase64 } = await import("./services/evolution-download");
                                                const { uploadToR2 } = await import("./r2-client");
                                                console.log("[Evolution Webhook] 📤 Tentativa 1: getBase64FromMediaMessage com stanzaId:", originalStoryId, "participant:", storyParticipant);
                                                
                                                mediaBuffer = await getStoryMediaViaBase64(
                                                  originalStoryId,
                                                  storyParticipant,
                                                  quotedMsg,
                                                  data.instance || 'Meu'
                                                );
                                                
                                                if (mediaBuffer) {
                                                  source = 'getBase64FromMediaMessage';
                                                  console.log("[Evolution Webhook] ✅ Tentativa 1 OK: buffer obtido via getBase64FromMediaMessage:", mediaBuffer.length, "bytes");
                                                } else {
                                                  console.log("[Evolution Webhook] ⚠️ Tentativa 1 falhou: getBase64FromMediaMessage retornou null");
                                                }
                                              } catch (err1) {
                                                console.error("[Evolution Webhook] ❌ Tentativa 1 (getBase64FromMediaMessage) erro:", err1.message);
                                              }
                                            } else {
                                              console.log("[Evolution Webhook] ⚠️ Pulando Tentativa 1: stanzaId ou participant vazio", { 
                                                originalStoryId, 
                                                hasParticipant: !!storyParticipant 
                                              });
                                            }

                                            // TENTATIVA 2: jpegThumbnail como fallback (baixa resolução, mas aparece na tela)
                                            if (!mediaBuffer && quotedImage?.jpegThumbnail) {
                                              try {
                                                console.log("[Evolution Webhook] 📤 Tentativa 2: jpegThumbnail fallback");
                                                const thumbnailBase64 = quotedImage.jpegThumbnail;
                                                mediaBuffer = Buffer.from(thumbnailBase64, 'base64');
                                                source = 'thumbnail_fallback';
                                                console.log("[Evolution Webhook] ✅ Tentativa 2 OK: thumbnail buffer obtido:", mediaBuffer.length, "bytes");
                                              } catch (err2) {
                                                console.error("[Evolution Webhook] ❌ Tentativa 2 (thumbnail) erro:", err2.message);
                                              }
                                            } else if (!mediaBuffer) {
                                              console.log("[Evolution Webhook] ⚠️ Pulando Tentativa 2: jpegThumbnail não disponível ou já temos buffer");
                                            }

                                            // TENTATIVA 3: message/download (fallback antigo)
                                            if (!mediaBuffer) {
                                              try {
                                                const { downloadWhatsAppMediaFromEvolution } = await import("./services/evolution-download");
                                                const { uploadToR2 } = await import("./r2-client");
                                                console.log("[Evolution Webhook] 📤 Tentativa 3: message/download endpoint");
                                                
                                                mediaBuffer = await downloadWhatsAppMediaFromEvolution({
                                                  url: "",
                                                  messageKey: { 
                                                    id: originalStoryId, 
                                                    remoteJid: 'status@broadcast',
                                                    fromMe: true 
                                                  }
                                                });
                                                
                                                if (mediaBuffer) {
                                                  source = 'message_download';
                                                  console.log("[Evolution Webhook] ✅ Tentativa 3 OK: buffer obtido via message/download:", mediaBuffer.length, "bytes");
                                                } else {
                                                  console.log("[Evolution Webhook] ❌ Tentativa 3 falhou: message/download retornou null");
                                                }
                                              } catch (err3) {
                                                console.error("[Evolution Webhook] ❌ Tentativa 3 (message/download) erro:", err3.message);
                                              }
                                            }

                                            // Se alguma tentativa funcionou, fazer upload para R2
                                            if (mediaBuffer) {
                                              try {
                                                const { uploadToR2 } = await import("./r2-client");
                                                const fileName = `story-${messageId}.${ext}`;
                                                const uploadResult = await uploadToR2(mediaBuffer, fileName, mimeType);
                                                mediaUrl = cleanR2Url(uploadResult.url);
                                                messageType = isImage ? 'image' : 'video';
                                                console.log("[Evolution Webhook] ✅ Story reply: mídia upada pro R2 (fonte:", source, "):", { 
                                                  url: mediaUrl, 
                                                  etag: uploadResult.etag, 
                                                  size: uploadResult.size,
                                                  source
                                                });
                                              } catch (uploadErr) {
                                                console.error("[Evolution Webhook] ❌ Erro no upload R2:", uploadErr.message);
                                              }
                                            } else {
                                              console.log("[Evolution Webhook] ⚠️ Todas as tentativas de download falharam - salvando apenas texto");
                                            }
                            
                                            // Se ainda não tem mediaUrl, tentar cache
                                            if (!mediaUrl) {
                                              // 🚨 CACHE WORKAROUND - Pesquisar story cacheado recentemente
                                              const timeWindow = 120; // 2 minutos
                                              const storyCacheWindowStart = Math.floor(messageTimestamp) - timeWindow;
            
                                              const cachedStory = await db
                                                .select()
                                                .from(storyCache)
                                                .where(
                                                  and(
                                                    eq(storyCache.remoteJid, remoteJid || ""),
                                                    sql`${storyCache.messageTimestamp} >= ${storyCacheWindowStart}`
                                                  )
                                                )
                                                .orderBy(desc(storyCache.messageTimestamp))
                                                .limit(1);
            
                                              if (cachedStory?.[0]) {
                                                console.log("[Evolution Webhook] ✅ Story correlacionado via cache:", cachedStory[0].storyId);
                                                if (messageType === 'text' || messageType === 'unknown') {
                                                  messageType = cachedStory[0].mediaType;
                                                }
                                                if (!mediaUrl) {
                                                  mediaUrl = cachedStory[0].mediaUrl;
                                                }
                                                if (messageText) {
                                                  messageText = `Responderam ao seu story: ${messageText}`;
                                                }
                                              } else {
                                                console.log("[Evolution Webhook] ⚠️ Nenhum story cacheado encontrado para correlacionar");
                                                // 🔥 FALLBACK FINAL: Tentar baixar via Evolution API usando messageKey (com validação)
                                                try {
                                                  console.log("[Evolution Webhook] 🔄 Tentando fallback final download via Evolution API (com validação)...");
                                                  const { downloadWhatsAppMediaFromEvolution } = await import("./services/evolution-download");
                                                  const { uploadToR2 } = await import("./r2-client");
                                                  const mediaBuffer = await downloadWhatsAppMediaFromEvolution({
                                                    url: "",
                                                    messageKey: { id: messageId, remoteJid, fromMe: false }
                                                  });
                                                  if (mediaBuffer) {
                                                    const fileName = `story-${messageId}.jpg`;
                                                    const uploadResult = await uploadToR2(mediaBuffer, fileName, "image/jpeg");
                                                    mediaUrl = cleanR2Url(uploadResult.url);
                                                    messageType = 'image';
                                                    console.log("[Evolution Webhook] ✅ Story reply fallback: mídia validada e upada pro R2:", { 
                                                      url: mediaUrl, 
                                                      etag: uploadResult.etag, 
                                                      size: uploadResult.size 
                                                    });
            
                                                    // Salvar no cache para futuras replies
                                                    try {
                                                      await db.insert(storyCache).values({
                                                        storyId: messageId,
                                                        remoteJid: remoteJid || '',
                                                        fromNumber,
                                                        mediaUrl: mediaUrl,
                                                        rawUrl: mediaUrl,
                                                        mediaType: 'image',
                                                        caption: messageText || null,
                                                        messageTimestamp: Math.floor(messageTimestamp),
                                                      });
                                                      console.log("[Evolution Webhook] ✅ Story cached for future replies");
                                                    } catch (cacheErr) {
                                                      console.error("[Evolution Webhook] ❌ Failed to store story in cache:", cacheErr);
                                                    }
                                                  }
                                                } catch (fallbackErr) {
                                                  console.error("[Evolution Webhook] ❌ Fallback download failed:", fallbackErr);
                                                }
                                              }
                                            }
                                          }
                                        }
        const mimeType = parsed.mimeType;
       
                // 🎯 DOWNLOAD DE MÍDIA DO WHATSAPP CDN (COM VALIDAÇÃO ROBUSTA)
                if (parsed.needsDownload && parsed.rawUrl) {
                  try {
                    const { downloadWhatsAppMediaFromEvolution, downloadGenericMedia, isWhatsAppCdnUrl } = await import("./services/evolution-download");
                    const { uploadToR2 } = await import("./r2-client");
            
                    const isWhatsAppCdn = isWhatsAppCdnUrl(parsed.rawUrl);
                    let mediaBuffer: Buffer | null = null;
                    let detectedMime = parsed.mimeType || "image/jpeg";

                    if (isWhatsAppCdn) {
                      // Use Evolution API proxy for WhatsApp CDN URLs (story replies)
                      mediaBuffer = await downloadWhatsAppMediaFromEvolution({
                        url: parsed.rawUrl,
                        messageKey: { id: messageId, remoteJid, fromMe: false }
                      });
                    } else {
                      // Standard download for other URLs (Instagram, etc.) - com validação completa
                      const { downloadWithValidation } = await import("./services/media-validator");
                      const validated = await downloadWithValidation(parsed.rawUrl, { 
                        expectedMimeType: parsed.mimeType || undefined,
                        maxRetries: 3,
                      });
                      mediaBuffer = validated.buffer;
                      detectedMime = validated.mimeType;
                    }
            
                    if (mediaBuffer) {
                      const fileName = parsed.fileName || parsed.rawUrl.split("/").pop() || "whatsapp-media";
                      const uploadResult = await uploadToR2(mediaBuffer, fileName, detectedMime);
                      mediaUrl = cleanR2Url(uploadResult.url);
                      console.log("[Evolution] ✅ Mídia validada e upada para R2:", { url: mediaUrl, etag: uploadResult.etag, size: uploadResult.size });
                    }
                  } catch (downloadErr) {
                    console.error("[Evolution] ❌ Falha no download/upload validado:", downloadErr);
                  }
                }

                // Story reply fallback: quando a Evolution não expõe rawUrl, usar quotedRawUrl/mediaKey/directPath
                if (!mediaUrl && parsed.isStoryReply) {
                  try {
                    const { downloadWhatsAppMediaFromEvolution } = await import("./services/evolution-download");
                    const { uploadToR2 } = await import("./r2-client");
            
                    const fallbackUrl = parsed.quotedRawUrl || parsed.rawUrl || null;
                    const mediaBuffer = await downloadWhatsAppMediaFromEvolution({
                      url: fallbackUrl || "",
                      messageKey: { id: messageId, remoteJid, fromMe: false }
                    });
            
                    if (mediaBuffer) {
                      const uploadResult = await uploadToR2(mediaBuffer, parsed.fileName || `story-${messageId}.jpg`, parsed.mimeType || "image/jpeg");
                      mediaUrl = cleanR2Url(uploadResult.url);
                      messageType = parsed.type === "video" ? "video" : "image";
                      console.log("[Evolution] ✅ Story reply fallback validado e upado para R2:", { 
                        url: mediaUrl, 
                        etag: uploadResult.etag, 
                        size: uploadResult.size 
                      });
                    }
                  } catch (storyDownloadErr) {
                    console.error("[Evolution] ❌ Story reply fallback failed:", storyDownloadErr);
                  }
                }
        const mediaKey = parsed.mediaKey;
        const directPath = parsed.directPath;
        const imageBase64 = parsed.base64;
        
        if (isSentByMe) {
          console.log("[Evolution Webhook] Detected fromMe message, enqueuing:", messageId, "to:", fromNumber);

          // 🎯 Cachear stories enviadas para que respostas futuras (story replies) possam
          // recuperar a mídia original. A Evolution NÃO envia o contextInfo/quotedMessage
          // nas replies de story, então precisamos do cache.
          const isMediaType = messageType === "image" || messageType === "video";
          const isStoryCandidate = isMediaType && mediaUrl && mediaUrl.length > 0;
          if (isStoryCandidate) {
            try {
              await db.insert(storyCache).values({
                storyId: messageId,
                remoteJid: remoteJid || "",
                fromNumber,
                mediaUrl: mediaUrl,
                rawUrl: mediaUrl,
                mediaType: messageType === "video" ? "video" : "image",
                caption: caption || messageText || null,
                messageTimestamp: Math.floor(messageTimestamp),
              });
              console.log("[Evolution] ✅ Story cached on send for future replies:", messageId);
            } catch (cacheErr) {
              console.error("[Evolution] ❌ Failed to cache story on send:", cacheErr);
            }
          }

          // Se for mensagem enviada pelo agente via celular, enfileirar para processamento assíncrono
          try {
            enqueueMobileSyncJob({
              remoteJid: remoteJid,
              messageId: messageId,
              messageText: messageText,
              caption: caption,
              messageType: messageType,
              mediaUrl: mediaUrl,
              mimeType: mimeType,
              messageTimestamp: messageTimestamp,
            });
          } catch (e) {
            // Erro ao enfileirar (raro), ignora silenciosamente
          }
          return;
        }

        // ==============================================
        // 🎯 FILTRO DE TIPO - Processar APENAS mensagens notify
        // ==============================================
        // Evolution pode enviar tipos: "notify" (mensagem nova), "append" (mídia de uma mensagem existente), "ephemeral" (temporária)
        // Só queremos processar mensagens novas (notify)
        const messageContext = data?.messageContext || data?.context || {};
        const messageStatus = messageContext?.status || data?.status || "notify";

        console.log("[Evolution Webhook] 📊 Message status check:", {
          messageStatus,
          messageType,
          fromNumber,
          fromMe: isSentByMe,
        });

        console.log("6. [Evolution] 📊 Message status check:", { messageStatus, messageType, fromNumber });

        // Removido filtro por messageStatus - processar todas as mensagens
        console.log("[Evolution Webhook] ✅ Message approved, proceeding to ingest");
        console.log("7. [Evolution] ✅ Processando mensagem (sem filtro de status)");

        // ==============================================
        // 🎯 IDEMPOTÊNCIA - UPSERT com ID único
        // ==============================================
        // Verificar se já existe (mais seguro que simples insert)
        const existing = await getReceivedMessageByExternalId(messageId, "whatsapp");

        // Buscar foto de perfil do cliente (Evolution API, com cache)
        let profilePic: string | null = null;
        try {
          profilePic = await resolveProfilePic("whatsapp", fromNumber);
        } catch (picErr) {
          console.warn("[Evolution Webhook] Could not resolve profile pic:", (picErr as Error).message);
        }

        // Dados comuns
        const messageValues = {
          provider: "whatsapp" as const,
          externalId: messageId,
          fromNumber,
          fromName: pushName || null,
          fromProfilePic: profilePic,
          messageType: messageType as any,
          messageText,
          mediaUrl: mediaUrl || null,
          mimeType: mimeType || null,
          caption,
          latitude: null,
          longitude: null,
          timestamp: messageTimestamp,
          rawPayload: JSON.stringify({ ...body, mediaDownloaded: !!mediaUrl }),
          processed: 0,
          customerId: existing?.customerId || null, // Manter customerId se já existir
        };

        if (existing) {
          // Atualizar apenas campos que podem mudar (nome, foto, etc.)
          await db
            .update(receivedMessages)
            .set({
              fromName: pushName || null,
              fromProfilePic: profilePic || existing.fromProfilePic,
              messageText: messageText || existing.messageText,
              mediaUrl: mediaUrl || existing.mediaUrl,
              mimeType: mimeType || existing.mimeType,
              caption: caption || existing.caption,
            })
            .where(eq(receivedMessages.id, existing.id));
          console.log(`[Evolution Webhook] Updated existing message ${messageId}`);
        } else {
          // Inserir novo
          await db.insert(receivedMessages).values(messageValues);
          console.log(`[Evolution Webhook] Inserted new message ${messageId}`);
        }

        // Check survey response
        const isPossibleSurveyResponse = messageType === "text" && messageText && /^\s*[1-5]\s*$/.test(messageText.trim());

        if (!isPossibleSurveyResponse) {
          console.log("8. [Evolution] 🎯 Chamando ingestInboundConversationMessage para", { fromNumber, messageType });
          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber,
            fromName: pushName || null,
            messageType,
            messageText,
            caption,
            mediaUrl: mediaUrl || null,
            mediaId: parsed.mediaId || null,
            mimeType,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            externalId: messageId,
          });
          console.log("9. [Evolution] ✅ ingestInboundConversationMessage concluído");
        } else {
          console.log("[Evolution] Pulando ingest (survey response)");
        }
      } catch (msgError) {
        console.error("[Evolution Webhook] ❌ Error in message processing:", msgError);
        console.error("[Evolution Webhook] Stack:", msgError instanceof Error ? msgError.stack : "N/A");
      }
      return;
    }

    // Eventos de presença - não precisamos processar
    if (
      normalizedEvent.includes("presence") ||
      normalizedEvent === "status_update"
    ) {
      console.log(
        "[Evolution Webhook] Presence event ignored:",
        normalizedEvent
      );
      return;
    }

    // Messages update - status updates like READ, DELIVERY_ACK - ignore
    if (
      normalizedEvent === "messages_update" ||
      normalizedEvent === "messages.update"
    ) {
      const status = body?.data?.status || body?.status;
      console.log("[Evolution Webhook] Message status update ignored:", status);
      return;
    }

    // Chats update - pode ser útil para atualizar status
    if (normalizedEvent === "chats_update") {
      console.log("[Evolution Webhook] Chats update event received");
      return;
    }

    // Connection update - quando a conexão é estabelecida
    if (normalizedEvent === "connection_update") {
      console.log("[Evolution Webhook] Connection update event received");
      const payload = body?.data || body;
      const profileName =
        payload?.profileName || payload?.profile?.name || null;
      const profilePicture =
        payload?.profilePictureUrl || payload?.profile?.picture || null;
      console.log("[Evolution Webhook] Connection established:", {
        profileName,
        profilePicture,
      });
      return;
    }

    console.log("[Evolution Webhook] Unhandled event type:", eventName);
  } catch (error) {
    console.error("[Evolution Webhook] Error processing webhook:", error);
    console.error(
      "[Evolution Webhook] Stack:",
      error instanceof Error ? error.stack : ""
    );
    throw error;
  }
}

/**
 * Validate WhatsApp webhook signature using HMAC SHA256
 */
async function validateWhatsAppSignature(
  rawBody: Buffer | string | undefined,
  signature: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const config = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "whatsapp_business"))
      .limit(1);

    if (config.length === 0) {
      console.log(
        "[WhatsApp Webhook] No configuration found, skipping signature validation"
      );
      return true;
    }

    const configData =
      typeof config[0].config === "string"
        ? JSON.parse(config[0].config)
        : config[0].config;
    const appSecret = configData.appSecret;

    if (!appSecret) {
      if (isProduction) {
        console.log(
          "[WhatsApp Webhook] No app secret configured in production"
        );
        return false;
      }
      console.log(
        "[WhatsApp Webhook] No app secret configured, skipping signature validation"
      );
      return true;
    }
    if (!rawBody) {
      console.log(
        "[WhatsApp Webhook] Missing raw body for signature validation"
      );
      return false;
    }

    const payloadBuffer =
      typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", appSecret)
        .update(payloadBuffer)
        .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[WhatsApp Webhook] Signature validation error:", error);
    return false;
  }
}

/**
 * Validate Instagram webhook signature using HMAC SHA256
 */
async function validateInstagramSignature(
  rawBody: Buffer | string | undefined,
  signature: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const config = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "instagram_graph"))
      .limit(1);

    if (config.length === 0) {
      console.log(
        "[Instagram Webhook] No configuration found, skipping signature validation"
      );
      return true;
    }

    const configData =
      typeof config[0].config === "string"
        ? JSON.parse(config[0].config)
        : config[0].config;
    const appSecret = configData.appSecret;

    if (!appSecret) {
      if (isProduction) {
        console.log(
          "[Instagram Webhook] No app secret configured in production"
        );
        return false;
      }
      console.log(
        "[Instagram Webhook] No app secret configured, skipping signature validation"
      );
      return true;
    }
    if (!rawBody) {
      console.log(
        "[Instagram Webhook] Missing raw body for signature validation"
      );
      return false;
    }

    const payloadBuffer =
      typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", appSecret)
        .update(payloadBuffer)
        .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[Instagram Webhook] Signature validation error:", error);
    return false;
  }
}

export default router;
// Force rebuild Mon Mar  2 15:42:15 -03 2026
