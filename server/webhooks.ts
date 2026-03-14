import { Router, Request, Response } from "express";
import { getDb } from "./db";
import {
  apiConfigurations,
  receivedMessages,
  integrationSettings,
  conversations,
  conversationMessages,
  customers,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  getReceivedMessageByExternalId,
  ingestInboundConversationMessage,
  findOrCreateCustomerByPhone,
} from "./db-messages";

import { enqueueMobileSyncJob } from "./queue/mobile-sync";
import crypto from "crypto";
import { sseManager, EVENTS } from "./_core/sse";

// Import debug module
let debugModule: any = null;
try {
  debugModule = require("./debug");
} catch (e) {
  console.error("[Webhooks] Debug module not loaded");
}

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

const addDebugLog =
  debugModule?.addLog ||
  ((level: string, category: string, message: string, data?: any) => {
    console.log(`[${level.toUpperCase()}] [${category}]`, message, data);
  });

const addDebugLogWebhook =
  debugModule?.webhookLogger ||
  ((req: any, res: any, next: any) => {
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

function normalizeInboundNumber(value: string | undefined | null) {
  if (!value) return null;
  const stripped = value.split("@")[0].replace(/\D/g, "");
  if (!stripped) return null;

  // Usar normalização brasileira
  const normalized = normalizeBrazilianNumber(stripped);
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
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
function extractEvolutionRemoteJid(body: any): string | null {
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
 */
function normalizeForDb(value: string): string {
  return value.replace(/\D/g, "");
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
router.get("/webhooks/whatsapp", async (req: Request, res: Response) => {
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
router.post("/webhooks/whatsapp", async (req: Request, res: Response) => {
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

    // Process the webhook asynchronously
    processWhatsAppWebhook(body).catch(error => {
      console.error("[WhatsApp Webhook] Processing error:", error);
    });
  } catch (error) {
    console.error("[WhatsApp Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Instagram Webhook Verification (GET)
 * Called by Meta when setting up the webhook
 */
router.get("/webhooks/instagram", async (req: Request, res: Response) => {
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
router.post("/webhooks/instagram", async (req: Request, res: Response) => {
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
router.post("/evolution", async (req: Request, res: Response) => {
  return handleEvolutionWebhook(req, res);
});

router.post("/evolution/:event", async (req: Request, res: Response) => {
  return handleEvolutionWebhook(req, res);
});

async function handleEvolutionWebhook(req: Request, res: Response) {
  try {
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
    // 🎯 FILTRAGEM CRÍTICA - PROCESSAR APENAS MENSAGENS
    // ==========================================
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");

    // Aceitar variações de eventos de mensagem
    const allowedEvents = ["messages_upsert"];
    
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

    // Extrair apikey da URL
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

      const queryApikey = queryApikeyRaw;
      const cleanApikey = queryApikey.split("/")[0].replace("@", "");
      const cleanExpected = expectedApiKey?.replace("@", "") || "";

      if (expectedApiKey && cleanApikey !== cleanExpected && cleanExpected && isProduction) {
        console.log("[Evolution Webhook] 🔐 API key mismatch, ignoring");
        console.log("  Expected:", cleanExpected.substring(0, 5) + "...");
        console.log("  Received:", cleanApikey.substring(0, 5) + "...");
        return;
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
async function processWhatsAppWebhook(body: any) {
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
          const contact = contacts.find((c: any) => c.wa_id === from);
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

          // Save to database
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
          });

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
async function processInstagramWebhook(body: any) {
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
        const text = message.text || null;

        // Extract attachments
        let mediaUrl = null;
        let mediaId = null;
        let mimeType = null;
        let messageType: any = "text";

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
                    : "unknown";

          mediaUrl = payload?.url || null;
        }

        const existing = await getReceivedMessageByExternalId(
          messageId,
          "instagram"
        );
        if (existing) {
          console.log(`[Instagram] Duplicate message ${messageId} ignored`);
          continue;
        }

        // Save to database
        await db.insert(receivedMessages).values({
          provider: "instagram",
          externalId: messageId,
          fromNumber: sender,
          fromName: null, // Instagram doesn't provide name in webhook
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
        });

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

function extractEvolutionMessage(body: any) {
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

function parseEvolutionMessageContent(message: any, rawMessageType?: string) {
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
  if (typeToSave === 'image' && message.imageMessage?.mimetype) {
    mimeType = message.imageMessage.mimetype || message.imageMessage.mimeType || null;
  } else if (typeToSave === 'video' && message.videoMessage?.mimetype) {
    mimeType = message.videoMessage.mimetype || message.videoMessage.mimeType || null;
  } else if (typeToSave === 'audio' && message.audioMessage?.mimetype) {
    mimeType = message.audioMessage.mimetype || message.audioMessage.mimeType || null;
  } else if (typeToSave === 'document' && message.documentMessage?.mimetype) {
    mimeType = message.documentMessage.mimetype || message.documentMessage.mimeType || null;
  } else if (typeToSave === 'sticker' && message.stickerMessage?.mimetype) {
    mimeType = message.stickerMessage.mimetype || message.stickerMessage.mimeType || null;
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
  if (typeToSave === 'image' && message.imageMessage?.fileName) {
    fileName = message.imageMessage.fileName;
  } else if (typeToSave === 'video' && message.videoMessage?.fileName) {
    fileName = message.videoMessage.fileName;
  } else if (typeToSave === 'audio' && message.audioMessage?.fileName) {
    fileName = message.audioMessage.fileName;
  } else if (typeToSave === 'document' && message.documentMessage) {
    // Documentos: fileName ou title (title é fallback comum)
    fileName = message.documentMessage.fileName || message.documentMessage.title || null;
  } else if (typeToSave === 'sticker' && message.stickerMessage?.fileName) {
    fileName = message.stickerMessage.fileName;
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

  // ===========================================
  // 🎯 PRIORIDADE 3: Extrair URL (sempre usar message.mediaUrl primeiro)
  // ===========================================
  let rawUrl: string | null = null;
  
  // Primeiro: message.mediaUrl (URL do R2/Cloudflare) - MAIS IMPORTANTE
  if (message.mediaUrl) {
    rawUrl = message.mediaUrl;
  } else if (typeToSave === 'image' && message.imageMessage) {
    rawUrl = message.imageMessage.url || message.imageMessage.mediaUrl || null;
  } else if (typeToSave === 'video' && message.videoMessage) {
    rawUrl = message.videoMessage.url || message.videoMessage.mediaUrl || null;
  } else if (typeToSave === 'audio' && message.audioMessage) {
    rawUrl = message.audioMessage.url || message.audioMessage.mediaUrl || null;
  } else if (typeToSave === 'document' && message.documentMessage) {
    rawUrl = message.documentMessage.url || message.documentMessage.mediaUrl || null;
  } else if (typeToSave === 'sticker' && message.stickerMessage) {
    rawUrl = message.stickerMessage.url || message.stickerMessage.mediaUrl || null;
  }

  // Limpar URL do R2 para obter apenas o caminho relativo
  const mediaUrl = rawUrl ? cleanR2Url(rawUrl) : null;

  // ===========================================
  // 🎯 Texto e Caption
  // ===========================================
  let text: string | null = null;
  let caption: string | null = null;

  if (typeToSave === 'text' || typeToSave === 'unknown') {
    text = message.conversation || message.extendedTextMessage?.text || null;
  } else {
    caption = message.caption || 
              message.imageMessage?.caption || 
              message.videoMessage?.caption || 
              message.documentMessage?.caption || null;
  }

  // ===========================================
  // 🎯 FileSize (tentar de qualquer fonte)
  // ===========================================
  const fileSize = message.fileSize || 
                   message.imageMessage?.fileSize || 
                   message.videoMessage?.fileSize || 
                   message.documentMessage?.fileSize || 
                   message.audioMessage?.fileSize || null;

  // Base64 (apenas para imagens, se fornecido)
  const base64 = typeToSave === 'image' ? message.imageMessage?.base64 || null : null;
  const mediaKey = (typeToSave === 'image' && message.imageMessage?.mediaKey) ||
                   (typeToSave === 'video' && message.videoMessage?.mediaKey) ||
                   (typeToSave === 'audio' && message.audioMessage?.mediaKey) ||
                   (typeToSave === 'document' && message.documentMessage?.mediaKey) ||
                   null;
  const directPath = (typeToSave === 'image' && message.imageMessage?.directPath) ||
                     (typeToSave === 'video' && message.videoMessage?.directPath) ||
                     (typeToSave === 'audio' && message.audioMessage?.directPath) ||
                     (typeToSave === 'document' && message.documentMessage?.directPath) ||
                     null;

  return {
    type: typeToSave as any,
    text,
    caption,
    mediaUrl,
    mimeType,
    fileName,
    fileSize,
    // Campos extras que podem ser úteis
    ...(base64 && { base64 }),
    ...(mediaKey && { mediaKey }),
    ...(directPath && { directPath }),
  };
}

async function processEvolutionWebhook(body: any) {
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

        const messageId = key?.id || data?.id || messageData?.id || `evo-${Date.now()}`;
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
        const parsed = parseEvolutionMessageContent(messageContent, rawMessageType);
        const messageType = parsed.type;
        const messageText = parsed.text;
        const caption = parsed.caption;
        const mediaUrl = parsed.mediaUrl;
        const mimeType = parsed.mimeType;
        const mediaKey = parsed.mediaKey;
        const directPath = parsed.directPath;
        const imageBase64 = parsed.base64;

        // Detectar mensagens enviadas pelo celular (fromMe === true)
        const isSentByMe = fromMe === true || fromMe === "true" || fromMe === 1;

        console.log("5. [Evolution] fromMe check:", { isSentByMe, fromMe, fromNumber, messageType });

        if (!isSentByMe) {
          console.log("[Evolution Webhook] Received inbound message from:", fromNumber, "type:", messageType);
        }

        if (isSentByMe) {
          console.log("[Evolution Webhook] Detected fromMe message, enqueuing:", messageId, "to:", fromNumber);
          // Se for mensagem enviada pelo agente via celular, enfileirar para processamento assíncrono
          // Enfileirar job em background (fire and forget)
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

        // Dados comuns
        const messageValues = {
          provider: "whatsapp" as const,
          externalId: messageId,
          fromNumber,
          fromName: pushName || null,
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
              messageText: messageText || existing.messageText,
              mediaUrl: mediaUrl || existing.mediaUrl,
              mimeType: mimeType || existing.mimeType,
              caption: caption || existing.caption,
              updatedAt: new Date(),
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
