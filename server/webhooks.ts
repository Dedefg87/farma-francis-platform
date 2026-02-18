import { Router, Request, Response } from "express";
import { getDb } from "./db";
import {
  apiConfigurations,
  receivedMessages,
  integrationSettings,
  conversations,
} from "../drizzle/schema";
import {
  getReceivedMessageByExternalId,
  ingestInboundConversationMessage,
  findOrCreateCustomerByPhone,
} from "./db-messages";
import { eq } from "drizzle-orm";
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
 * Download media from WhatsApp/Evolution and convert to base64
 * Returns base64 data URL that can be displayed directly
 */
async function downloadAndSaveMedia(
  mediaUrl: string,
  mimeType: string | null,
  fromNumber: string
): Promise<{ base64Data: string; dataUrl: string } | null> {
  try {
    console.log("[Media] Starting download:", mediaUrl);

    // Try to download from the provided URL first
    let response = await fetch(mediaUrl);

    // If direct URL fails, try Evolution API endpoint
    if (!response.ok && mediaUrl.includes("whatsapp.net")) {
      const evoConfig = await getEvolutionConfig();
      if (evoConfig) {
        const mediaIdMatch = mediaUrl.match(/\/([A-Za-z0-9_-]+)\?/);
        if (mediaIdMatch) {
          const mediaId = mediaIdMatch[1];
          const mediaFetchUrl = `${evoConfig.apiUrl}/chat/fetchMedia/${mediaId}`;
          response = await fetch(mediaFetchUrl, {
            headers: { apikey: evoConfig.apiKey },
          });
        }
      }
    }

    if (!response.ok) {
      console.error(
        "[Media] Failed to download:",
        response.status,
        response.statusText
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Determine content type
    const contentType = mimeType || "application/octet-stream";
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log("[Media] Downloaded successfully, size:", buffer.length);

    return { base64Data: base64, dataUrl };
  } catch (error) {
    console.error("[Media] Error downloading media:", error);
    return null;
  }
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
 */
router.post("/evolution", async (req: Request, res: Response) => {
  try {
    console.log(
      "==========================================[Evolution Webhook] =========================================="
    );
    console.log(
      "[Evolution Webhook] NEW REQUEST RECEIVED at",
      new Date().toISOString()
    );
    console.log("[Evolution Webhook] Method:", req.method);
    console.log("[Evolution Webhook] URL:", req.originalUrl);
    console.log("[Evolution Webhook] Query:", JSON.stringify(req.query));
    console.log(
      "[Evolution Webhook] Headers:",
      JSON.stringify(req.headers).substring(0, 500)
    );
    console.log("[Evolution Webhook] Body type:", typeof req.body);
    console.log(
      "[Evolution Webhook] Body:",
      JSON.stringify(req.body).substring(0, 1000)
    );
    console.log("[Evolution Webhook] Method:", req.method);
    console.log("[Evolution Webhook] URL:", req.originalUrl);
    console.log(
      "[Evolution Webhook] Headers:",
      JSON.stringify(req.headers).substring(0, 500)
    );
    console.log("[Evolution Webhook] Body type:", typeof req.body);
    console.log(
      "[Evolution Webhook] Body:",
      JSON.stringify(req.body).substring(0, 500)
    );

    const body = req.body;
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    console.log("[Evolution Webhook] Received request from:", fullUrl);

    // Verificar se body está vazio
    if (!body || Object.keys(body).length === 0) {
      console.error(
        "[Evolution Webhook] ERROR: Body is empty! Raw body might not be parsed."
      );
      // Tentar ler o raw body
      const raw = (req as any).rawBody;
      console.log(
        "[Evolution Webhook] Raw body:",
        raw ? raw.toString().substring(0, 500) : "undefined"
      );
    }

    // Detectar evento (pode vir no body, na URL path, ou embutido na query `apikey` como: ?apikey=@KEY/messages-update)
    let eventName = body?.event || body?.data?.event;

    // Extract event from query apikey suffix
    const queryApikeyRaw = (req.query["apikey"] as string | undefined) || "";
    const apikeyParts = queryApikeyRaw.split("/").filter(Boolean);
    const eventFromQuery =
      apikeyParts.length > 1 ? apikeyParts.slice(1).join("/") : "";
    if (!eventName && eventFromQuery) {
      eventName = eventFromQuery;
      console.log(
        "[Evolution Webhook] Event extracted from query apikey:",
        eventName
      );
    }
    if (!eventName) {
      const urlParts = fullUrl.split("/evolution")[1] || "";
      const m = urlParts.match(/\/([a-z0-9_-]+)$/i);
      if (m?.[1]) {
        eventName = m[1];
        console.log("[Evolution Webhook] Event extracted from URL:", eventName);
      }
    }

    const db = await getDb();
    if (!db) {
      console.error("[Evolution Webhook] Database not available");
      return res.status(500).send("Database not available");
    }

    // Extrair apikey da URL (pode vir com ou sem @)
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

      // Buscar apikey na query string - pode ter formato: ?apikey=@Afrancis87/presence-update
      const queryApikey = queryApikeyRaw;
      const cleanApikey = queryApikey.split("/")[0].replace("@", "");
      const cleanExpected = expectedApiKey?.replace("@", "") || "";

      console.log("[Evolution Webhook] Auth Check:", {
        expectedHasValue: !!expectedApiKey,
        providedHasValue: !!queryApikey,
        cleanMatch: cleanApikey === cleanExpected,
      });

      if (expectedApiKey && cleanApikey !== cleanExpected && cleanExpected) {
        console.error("[Evolution Webhook] Invalid API Key - REJECTING", {
          provided: cleanApikey,
          expected: cleanExpected,
        });
        // TEMPORARY: Skip auth check for debugging
        console.log(
          "[Evolution Webhook] Auth check FAILED but continuing for debug..."
        );
        // if (isProduction) {
        //   return res.status(403).send("Invalid API key");
        // }
      } else {
        console.log("[Evolution Webhook] Auth passed");
      }
    } else {
      console.log(
        "[Evolution Webhook] No integration settings found - skipping auth"
      );
    }

    console.log(
      "[Evolution Webhook] Calling processEvolutionWebhook with event:",
      eventName
    );
    res.status(200).send("EVENT_RECEIVED");

    console.log("[Evolution Webhook] Response sent, processing async...");
    processEvolutionWebhook({ ...body, event: eventName })
      .then(() => {
        console.log("[Evolution Webhook] processEvolutionWebhook completed");
      })
      .catch(error => {
        console.error("[Evolution Webhook] Processing error:", error);
      });
  } catch (error) {
    console.error("[Evolution Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});

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

          switch (type) {
            case "text":
              messageText = message.text?.body || null;
              break;
            case "image":
              mediaId = message.image?.id || null;
              caption = message.image?.caption || null;
              mimeType = message.image?.mime_type || null;
              break;
            case "audio":
              mediaId = message.audio?.id || null;
              mimeType = message.audio?.mime_type || null;
              break;
            case "video":
              mediaId = message.video?.id || null;
              caption = message.video?.caption || null;
              mimeType = message.video?.mime_type || null;
              break;
            case "document":
              mediaId = message.document?.id || null;
              caption = message.document?.caption || null;
              mimeType = message.document?.mime_type || null;
              break;
            case "location":
              latitude = message.location?.latitude || null;
              longitude = message.location?.longitude || null;
              break;
            case "sticker":
              mediaId = message.sticker?.id || null;
              mimeType = message.sticker?.mime_type || null;
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

function parseEvolutionMessageContent(message: any) {
  if (!message)
    return {
      type: "unknown",
      text: null,
      caption: null,
      mediaUrl: null,
      mimeType: null,
    };

  if (message.conversation) {
    return {
      type: "text",
      text: message.conversation,
      caption: null,
      mediaUrl: null,
      mimeType: null,
    };
  }

  if (message.extendedTextMessage?.text) {
    return {
      type: "text",
      text: message.extendedTextMessage.text,
      caption: null,
      mediaUrl: null,
      mimeType: null,
    };
  }

  if (message.imageMessage) {
    return {
      type: "image",
      text: null,
      caption: message.imageMessage.caption || null,
      mediaUrl: message.imageMessage.url || null,
      mimeType: message.imageMessage.mimetype || null,
    };
  }

  if (message.videoMessage) {
    return {
      type: "video",
      text: null,
      caption: message.videoMessage.caption || null,
      mediaUrl: message.videoMessage.url || null,
      mimeType: message.videoMessage.mimetype || null,
    };
  }

  if (message.documentMessage) {
    return {
      type: "document",
      text: null,
      caption: message.documentMessage.caption || null,
      mediaUrl: message.documentMessage.url || null,
      mimeType: message.documentMessage.mimetype || null,
    };
  }

  if (message.audioMessage) {
    return {
      type: "audio",
      text: null,
      caption: null,
      mediaUrl: message.audioMessage.url || null,
      mimeType: message.audioMessage.mimetype || null,
    };
  }

  return {
    type: "unknown",
    text: null,
    caption: null,
    mediaUrl: null,
    mimeType: null,
  };
}

async function processEvolutionWebhook(body: any) {
  console.log("[Evolution Webhook] Starting processEvolutionWebhook");
  console.log(
    "[Evolution Webhook] Body:",
    JSON.stringify(body).substring(0, 500)
  );

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Evolution Webhook] Database not available");
      throw new Error("Database not available");
    }

    // Normalizar nome do evento - pode vir de várias formas
    let eventName = body?.event || body?.data?.event || "";

    // Se o evento vier vazio mas houver dados, tentar detectar pelo conteúdo
    if (!eventName && body?.key) {
      eventName = "messages.upsert";
    } else if (!eventName && body?.remoteJid) {
      eventName = "messages.upsert";
    }

    console.log("[Evolution Webhook] Event name:", eventName);

    if (!eventName) {
      console.warn("[Evolution Webhook] No event name in payload");
      console.warn(
        "[Evolution Webhook] Payload:",
        JSON.stringify(body).substring(0, 500)
      );
      return;
    }

    // Normalizar o nome do evento para consistência
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");
    console.log("[Evolution Webhook] Normalized event:", normalizedEvent);

    // Verificar se é evento de contatos
    if (
      normalizedEvent.includes("contact") ||
      normalizedEvent === "contacts_update"
    ) {
      console.log("[Evolution Webhook] Handling contacts event");

      // Tentar extrair remoteJid de várias estruturas possíveis
      let remoteJid =
        body?.data?.remoteJid ||
        body?.remoteJid ||
        extractEvolutionRemoteJid(body);

      // Se o body for um array, pegar o primeiro elemento
      if (!remoteJid && Array.isArray(body)) {
        remoteJid = body[0]?.remoteJid;
      }

      const fromNumber = normalizeInboundNumber(remoteJid);

      if (!fromNumber) {
        console.warn("[Evolution Webhook] No phone number found for contact", {
          remoteJid,
          sender: body?.sender,
          destination: body?.destination,
          bodyKeys: Object.keys(body || {}),
          bodyIsArray: Array.isArray(body),
          sample: Array.isArray(body)
            ? JSON.stringify(body[0]).substring(0, 200)
            : "N/A",
        });
        return;
      }

      const pushName =
        body?.data?.profileName ||
        body?.profileName ||
        body?.data?.name ||
        body?.name ||
        null;
      console.log("[Evolution Webhook] Contact update:", {
        fromNumber,
        pushName,
      });

      const customer = await findOrCreateCustomerByPhone(fromNumber, pushName);
      console.log(
        "[Evolution Webhook] Customer processed:",
        (customer as any)?.insertId || (customer as any)?.id || "existing"
      );
      return;
    }

    // Verificar se é evento de mensagens
    // IMPORTANTE: o Evolution pode enviar "chats_update" e outros eventos sem mensagem.
    // Aqui processamos apenas eventos de mensagem (messages.upsert).
    // Ignoramos messages.update pois é apenas status (READ, DELIVERY_ACK, etc)
    if (
      normalizedEvent === "messages_upsert" ||
      normalizedEvent === "messages.upsert"
    ) {
      console.log("[Evolution Webhook] Handling messages.upsert event - START");

      try {
        console.log("[Evolution Webhook] Step 1: extracting data from body");
        const data = body?.data || body;
        console.log("[Evolution Webhook] Step 2: data extracted");
        console.log(
          "[Evolution Webhook] Step 2b: data keys:",
          JSON.stringify(Object.keys(data || {}))
        );

        const messageData = data?.message || data?.messages?.[0] || body || {};
        console.log(
          "[Evolution Webhook] Step 3: messageData type:",
          typeof messageData
        );

        const key = data?.key || messageData?.key || {};
        console.log("[Evolution Webhook] Step 4: key exists:", !!key);

        const messageContent = messageData?.message || messageData;
        console.log(
          "[Evolution Webhook] Step 5: messageContent type:",
          typeof messageContent
        );

        const messageId =
          key?.id || data?.id || messageData?.id || `evo-${Date.now()}`;
        const remoteJid =
          key?.remoteJid ||
          data?.remoteJid ||
          messageData?.remoteJid ||
          body?.remoteJid ||
          extractEvolutionRemoteJid(body);
        const pushName =
          data?.pushName ||
          data?.senderName ||
          messageData?.pushName ||
          body?.pushName ||
          body?.sender?.name ||
          body?.sender?.pushName ||
          body?.data?.sender?.name;
        const fromMe =
          key?.fromMe ?? data?.fromMe ?? messageData?.fromMe ?? body?.fromMe;

        console.log("[Evolution Webhook] Step 6: Extracted:", {
          messageId,
          remoteJid,
          pushName,
          fromMe,
        });

        console.error("[Evolution Webhook] === STEP 7 START ===");
        console.log("[Evolution Webhook] Step 7: Checking send events");
        // Ignore send/ack events (outbound)
        if (
          normalizedEvent.startsWith("send") ||
          normalizedEvent.includes("send_message")
        ) {
          console.log("[Evolution Webhook] IGNORING: send event");
          return;
        }

        console.error("[Evolution Webhook] === STEP 8 START ===");
        console.log("[Evolution Webhook] Step 8: Checking remoteJid");
        if (!remoteJid) {
          console.warn("[Evolution Webhook] FAILED: No remoteJid");
          return;
        }

        console.error("[Evolution Webhook] === STEP 9 START ===");
        console.log("[Evolution Webhook] Step 9: Normalizing phone");
        const fromNumber = normalizeInboundNumber(remoteJid);
        if (!fromNumber) {
          console.warn("[Evolution Webhook] FAILED: Could not normalize phone");
          return;
        }
        console.log("[Evolution Webhook] Step 9b: fromNumber=", fromNumber);

        console.error("[Evolution Webhook] === STEP 10 START ===");
        console.log("[Evolution Webhook] Step 10: Checking fromMe");
        // Ignorar mensagens do próprio bot
        if (fromMe === true || fromMe === "true" || fromMe === 1) {
          console.log("[Evolution Webhook] IGNORING: fromMe=true");
          return;
        }

        console.error("[Evolution Webhook] === STEP 11 START ===");
        console.log("[Evolution Webhook] Step 11: Checking duplicate");
        // Verificar duplicata
        const existing = await getReceivedMessageByExternalId(
          messageId,
          "whatsapp"
        );
        if (existing) {
          console.log("[Evolution Webhook] IGNORING: Duplicate message");
          return;
        }

        console.error("[Evolution Webhook] === STEP 12 START ===");
        // Determinar tipo e conteúdo da mensagem (robusto)
        const parsed = parseEvolutionMessageContent(messageContent);
        const messageType = parsed.type;
        const messageText = parsed.text;
        const caption = parsed.caption;
        const mediaUrl = parsed.mediaUrl;
        const mimeType = parsed.mimeType;
        console.log(
          "[Evolution Webhook] Step 12b: messageType=",
          messageType,
          "text=",
          messageText
        );

        // Se nao tem conteudo real (ex: payload de update sem mensagem), ignorar para nao criar conversa fantasma
        const hasRealContent =
          Boolean(messageText && String(messageText).trim()) ||
          Boolean(caption && String(caption).trim()) ||
          Boolean(mediaUrl && String(mediaUrl).trim());
        if (!hasRealContent && messageType === "unknown") {
          console.log("[Evolution Webhook] IGNORING: No content");
          return;
        }

        // Download and save media to permanent storage if present
        let permanentMediaUrl = null;
        if (
          mediaUrl &&
          ["image", "video", "audio", "document"].includes(messageType)
        ) {
          console.log("[Evolution Webhook] Downloading media...");
          const mediaResult = await downloadAndSaveMedia(
            mediaUrl,
            mimeType,
            fromNumber
          );
          if (mediaResult) {
            console.log(
              "[Evolution Webhook] Media downloaded, size:",
              mediaResult.base64Data.length
            );
            // Store base64 in raw_payload for permanent access
            permanentMediaUrl = mediaResult.dataUrl;
          } else {
            console.log(
              "[Evolution Webhook] Media download failed, using original URL"
            );
          }
        }

        console.log("[Evolution Webhook] Step 13: Saving to database");

        const messageTimestamp =
          data?.messageTimestamp ||
          messageData?.timestamp ||
          messageContent?.timestamp ||
          Math.floor(Date.now() / 1000);

        // Salvar mensagem no banco
        await db.insert(receivedMessages).values({
          provider: "whatsapp",
          externalId: messageId,
          fromNumber,
          fromName: pushName || null,
          messageType: messageType as
            | "text"
            | "image"
            | "audio"
            | "video"
            | "document"
            | "location"
            | "contact"
            | "sticker"
            | "reaction"
            | "unknown",
          messageText,
          mediaUrl: permanentMediaUrl || mediaUrl,
          mimeType,
          caption,
          timestamp: messageTimestamp,
          rawPayload: JSON.stringify({
            ...body,
            mediaDownloaded: !!permanentMediaUrl,
            mediaSize: permanentMediaUrl ? permanentMediaUrl.length : 0,
          }),
          processed: 0,
        });

        console.log("[Evolution Webhook] Step 14: Saved to receivedMessages");

        // Check if this might be a survey response (single digit 1-5)
        const isPossibleSurveyResponse =
          messageType === "text" &&
          messageText &&
          /^\s*[1-5]\s*$/.test(messageText.trim());

        if (!isPossibleSurveyResponse) {
          console.log(
            "[Evolution Webhook] Step 15: Calling ingestInboundConversationMessage"
          );
          // Ingerir na conversa apenas se não for resposta de pesquisa
          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber,
            fromName: pushName || null,
            messageType,
            messageText,
            caption,
            mediaUrl: permanentMediaUrl || mediaUrl,
            mimeType,
          });
          console.log(
            "[Evolution Webhook] Step 16: ingestInboundConversationMessage DONE"
          );
        } else {
          console.log("[Evolution Webhook] IGNORING: Survey response");
        }

        console.log("[Evolution Webhook] SUCCESS: Webhook processed");
      } catch (msgError) {
        console.error(
          "[Evolution Webhook] ERROR in message processing:",
          msgError
        );
        console.error(
          "[Evolution Webhook] Error stack:",
          msgError instanceof Error ? msgError.stack : "no stack"
        );
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
