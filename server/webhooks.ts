import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { apiConfigurations, receivedMessages, integrationSettings, conversations } from "../drizzle/schema";
import { getReceivedMessageByExternalId, ingestInboundConversationMessage, findOrCreateCustomerByPhone } from "./db-messages";
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

const addDebugLog = debugModule?.addLog || ((level: string, category: string, message: string, data?: any) => {
  console.log(`[${level.toUpperCase()}] [${category}]`, message, data);
});

const addDebugLogWebhook = debugModule?.webhookLogger || ((req: any, res: any, next: any) => {
  console.log(`[WEBHOOK] ${req.method} ${req.url}`);
  next();
});

function normalizeInboundNumber(value: string | undefined | null) {
  if (!value) return null;
  const stripped = value.split("@")[0].replace(/\D/g, "");
  if (!stripped) return null;
  return stripped.startsWith("+") ? stripped : `+${stripped}`;
}

function logWebhookSummary(provider: "WhatsApp" | "Instagram", payload: unknown) {
  if (!isProduction) {
    console.log(`[${provider} Webhook] Received payload:`, JSON.stringify(payload, null, 2));
    return;
  }
  const body = payload as { entry?: unknown[] };
  const entryCount = Array.isArray(body?.entry) ? body.entry.length : 0;
  console.log(`[${provider} Webhook] Received payload with ${entryCount} entries`);
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

    console.log("[WhatsApp Webhook] Verification request:", { mode, token: token ? "***" : undefined });

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
      const configData = typeof config[0].config === 'string' ? JSON.parse(config[0].config) : config[0].config;
      const storedToken = configData.webhookVerifyToken;

      console.log("[WhatsApp Webhook] Verify token present:", Boolean(token));
      console.log("[WhatsApp Webhook] Stored token present:", Boolean(storedToken));

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
      const isValid = await validateWhatsAppSignature((req as any).rawBody, signature);
      if (!isValid) {
        console.error("[WhatsApp Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[WhatsApp Webhook] Signature validated successfully");
    }

    // Acknowledge receipt immediately
    res.status(200).send("EVENT_RECEIVED");

    // Process the webhook asynchronously
    processWhatsAppWebhook(body).catch((error) => {
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

    console.log("[Instagram Webhook] Verification request:", { mode, token: token ? "***" : undefined });

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
      const configData = typeof config[0].config === 'string' ? JSON.parse(config[0].config) : config[0].config;
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
      const isValid = await validateInstagramSignature((req as any).rawBody, signature);
      if (!isValid) {
        console.error("[Instagram Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[Instagram Webhook] Signature validated successfully");
    }

    // Acknowledge receipt immediately
    res.status(200).send("EVENT_RECEIVED");

    // Process the webhook asynchronously
    processInstagramWebhook(body).catch((error) => {
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
    console.log('[Evolution Webhook] ================= NEW REQUEST =================');
    console.log('[Evolution Webhook] Method:', req.method);
    console.log('[Evolution Webhook] URL:', req.originalUrl);
    console.log('[Evolution Webhook] Headers:', JSON.stringify(req.headers).substring(0, 500));
    console.log('[Evolution Webhook] Body type:', typeof req.body);
    console.log('[Evolution Webhook] Body:', JSON.stringify(req.body).substring(0, 500));
    
    const body = req.body;
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    console.log('[Evolution Webhook] Received request from:', fullUrl);

    // Verificar se body está vazio
    if (!body || Object.keys(body).length === 0) {
      console.error('[Evolution Webhook] ERROR: Body is empty! Raw body might not be parsed.');
      // Tentar ler o raw body
      const raw = (req as any).rawBody;
      console.log('[Evolution Webhook] Raw body:', raw ? raw.toString().substring(0, 500) : 'undefined');
    }

    // Detectar evento pela URL quando o Evolution API envia no formato: /presence-update, /chats-update, etc
    let eventName = body?.event || body?.data?.event;
    if (!eventName) {
      const urlParts = fullUrl.split('/evolution')[1] || '';
      const eventMatch = urlParts.match(/\/(presence-update|chats-update|contacts-update|messages-update)/i);
      if (eventMatch) {
        eventName = eventMatch[1];
        console.log('[Evolution Webhook] Event extracted from URL:', eventName);
      }
    }

    const db = await getDb();
    if (!db) {
      console.error('[Evolution Webhook] Database not available');
      return res.status(500).send("Database not available");
    }

    // Extrair apikey da URL (pode vir com ou sem @)
    const [configRow] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (configRow) {
      const configData = typeof configRow.config === "string" ? JSON.parse(configRow.config) : configRow.config;
      const expectedApiKey = configData.apiKey || configData.accessToken;
      
      // Buscar apikey na query string - pode ter formato: ?apikey=@Afrancis87/presence-update
      const queryApikey = (req.query["apikey"] as string | undefined) || '';
      const cleanApikey = queryApikey.split('/')[0].replace('@', '');
      const cleanExpected = expectedApiKey?.replace('@', '') || '';

      console.log('[Evolution Webhook] Auth Check:', { 
        expectedHasValue: !!expectedApiKey,
        providedHasValue: !!queryApikey,
        cleanMatch: cleanApikey === cleanExpected
      });

      if (expectedApiKey && cleanApikey !== cleanExpected && cleanExpected) {
        console.error('[Evolution Webhook] Invalid API Key - REJECTING');
        if (isProduction) {
          return res.status(403).send("Invalid API key");
        }
      } else {
        console.log('[Evolution Webhook] Auth passed');
      }
    } else {
      console.log('[Evolution Webhook] No integration settings found - skipping auth');
    }

    console.log('[Evolution Webhook] Calling processEvolutionWebhook with event:', eventName);
    res.status(200).send("EVENT_RECEIVED");

    console.log('[Evolution Webhook] Response sent, processing async...');
    processEvolutionWebhook({ ...body, event: eventName }).then(() => {
      console.log('[Evolution Webhook] processEvolutionWebhook completed');
    }).catch((error) => {
      console.error('[Evolution Webhook] Processing error:', error);
    });
  } catch (error) {
    console.error('[Evolution Webhook] Handler error:', error);
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

          const existing = await getReceivedMessageByExternalId(messageId, "whatsapp");
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
            messageType: ["text", "image", "audio", "video", "document", "location", "contact", "sticker", "reaction"].includes(type) 
              ? type as any 
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

          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber: from,
            fromName,
            messageType: ["text", "image", "audio", "video", "document", "location", "contact", "sticker", "reaction"].includes(type)
              ? type
              : "unknown",
            messageText,
            caption,
            mediaUrl,
            mimeType,
            createdAt: new Date(),
          });

          console.log(`[WhatsApp] Saved message ${messageId} from ${from}`);
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

          messageType = type === "image" ? "image" 
            : type === "video" ? "video" 
            : type === "audio" ? "audio" 
            : type === "file" ? "document" 
            : "unknown";

          mediaUrl = payload?.url || null;
        }

        const existing = await getReceivedMessageByExternalId(messageId, "instagram");
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

        console.log(`[Instagram] Saved message ${messageId} from ${sender}`);
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
  const remoteJid = key?.remoteJid || messageEntry?.key?.remoteJid || payload?.remoteJid || payload?.from;
  const pushName = payload?.pushName || payload?.senderName || payload?.contact?.name || messageEntry?.pushName;
  const message = messageEntry?.message || messageEntry;

  return { message, remoteJid, pushName, fromMe, messageId: key?.id || payload?.id || messageEntry?.id };
}

function parseEvolutionMessageContent(message: any) {
  if (!message) return { type: "unknown", text: null, caption: null, mediaUrl: null, mimeType: null };

  if (message.conversation) {
    return { type: "text", text: message.conversation, caption: null, mediaUrl: null, mimeType: null };
  }

  if (message.extendedTextMessage?.text) {
    return { type: "text", text: message.extendedTextMessage.text, caption: null, mediaUrl: null, mimeType: null };
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

  return { type: "unknown", text: null, caption: null, mediaUrl: null, mimeType: null };
}

async function processEvolutionWebhook(body: any) {
  console.log('[Evolution Webhook] Starting processEvolutionWebhook');
  console.log('[Evolution Webhook] Body:', JSON.stringify(body).substring(0, 500));

  try {
    const db = await getDb();
    if (!db) {
      console.error('[Evolution Webhook] Database not available');
      throw new Error("Database not available");
    }

    // Normalizar nome do evento - pode vir de várias formas
    let eventName = body?.event || body?.data?.event || '';
    
    // Se o evento vier vazio mas houver dados, tentar detectar pelo conteúdo
    if (!eventName && body?.key) {
      eventName = 'messages.upsert';
    } else if (!eventName && body?.remoteJid) {
      eventName = 'messages.upsert';
    }
    
    console.log('[Evolution Webhook] Event name:', eventName);

    if (!eventName) {
      console.warn('[Evolution Webhook] No event name in payload');
      console.warn('[Evolution Webhook] Payload:', JSON.stringify(body).substring(0, 500));
      return;
    }

    // Normalizar o nome do evento para consistência
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, '_');
    console.log('[Evolution Webhook] Normalized event:', normalizedEvent);

    // Verificar se é evento de contatos
    if (normalizedEvent.includes('contact') || normalizedEvent === 'contacts_update') {
      console.log('[Evolution Webhook] Handling contacts event');
      const payload = body?.data || body;
      const remoteJid = payload?.remoteJid || payload?.contact?.id || payload?.id || body?.jid;
      const fromNumber = normalizeInboundNumber(remoteJid);
      
      if (!fromNumber) {
        console.warn('[Evolution Webhook] No phone number found for contact', { remoteJid, payload: JSON.stringify(payload).substring(0, 200) });
        return;
      }

      const pushName = payload?.pushName || payload?.name || payload?.notify || null;
      console.log('[Evolution Webhook] Contact update:', { fromNumber, pushName });

      const customer = await findOrCreateCustomerByPhone(fromNumber, pushName);
      console.log('[Evolution Webhook] Customer processed:', customer?.insertId || 'existing');
      return;
    }

    // Verificar se é evento de mensagens
    if (normalizedEvent.includes('message') || normalizedEvent === 'messages_update' || normalizedEvent === 'chats_update') {
      console.log('[Evolution Webhook] Handling messages event');

      // Tentar extrair mensagem de várias estruturas possíveis
      const data = body?.data || body;
      
      // Diferentes estruturas que o Evolution API pode usar
      const messageData = data?.message || data?.messages?.[0] || body || {};
      const key = data?.key || messageData?.key || {};
      const messageContent = messageData?.message || messageData;
      
      // Extrair dados
      const messageId = key?.id || data?.id || messageData?.id || `evo-${Date.now()}`;
      const remoteJid = key?.remoteJid || data?.remoteJid || messageData?.remoteJid || body?.remoteJid;
      const pushName = data?.pushName || data?.senderName || messageData?.pushName || body?.pushName;
      const fromMe = key?.fromMe ?? data?.fromMe ?? messageData?.fromMe ?? body?.fromMe;

      console.log('[Evolution Webhook] Extracted data:', {
        messageId,
        remoteJid,
        pushName,
        fromMe,
        hasContent: !!messageContent
      });

      if (!remoteJid) {
        console.warn('[Evolution Webhook] No remoteJid found');
        return;
      }

      // Ignorar mensagens do próprio bot
      if (fromMe === true || fromMe === 'true' || fromMe === 1) {
        console.log('[Evolution Webhook] Ignoring message from self (fromMe=true)');
        return;
      }

      // Verificar duplicata
      const existing = await getReceivedMessageByExternalId(messageId, "whatsapp");
      if (existing) {
        console.log(`[Evolution Webhook] Duplicate message ${messageId} ignored`);
        return;
      }

      // Determinar tipo e conteúdo da mensagem
      let messageType = "unknown";
      let messageText = null;
      let caption = null;
      let mediaUrl = null;
      let mimeType = null;

      if (messageContent?.conversation || messageContent?.text) {
        messageType = "text";
        messageText = messageContent.conversation || messageContent.text;
      } else if (messageContent?.extendedTextMessage?.text) {
        messageType = "text";
        messageText = messageContent.extendedTextMessage.text;
      } else if (messageContent?.imageMessage) {
        messageType = "image";
        caption = messageContent.imageMessage.caption || null;
        mediaUrl = messageContent.imageMessage.url || messageContent.imageMessage.mediaUrl || null;
        mimeType = messageContent.imageMessage.mimetype || null;
      } else if (messageContent?.videoMessage) {
        messageType = "video";
        caption = messageContent.videoMessage.caption || null;
        mediaUrl = messageContent.videoMessage.url || messageContent.videoMessage.mediaUrl || null;
        mimeType = messageContent.videoMessage.mimetype || null;
      } else if (messageContent?.audioMessage) {
        messageType = "audio";
        mediaUrl = messageContent.audioMessage.url || messageContent.audioMessage.mediaUrl || null;
        mimeType = messageContent.audioMessage.mimetype || null;
      } else if (messageContent?.documentMessage) {
        messageType = "document";
        caption = messageContent.documentMessage.caption || null;
        mediaUrl = messageContent.documentMessage.url || messageContent.documentMessage.mediaUrl || null;
        mimeType = messageContent.documentMessage.mimetype || null;
      } else if (messageContent?.locationMessage) {
        messageType = "location";
      } else if (messageContent?.stickerMessage) {
        messageType = "sticker";
      } else if (messageContent?.reactionMessage) {
        messageType = "reaction";
        messageText = messageContent.reactionMessage?.text || null;
      }

      console.log('[Evolution Webhook] Parsed message:', { messageType, messageText, caption });

      const messageTimestamp = data?.messageTimestamp || messageData?.timestamp || messageContent?.timestamp || Math.floor(Date.now() / 1000);

      // Salvar mensagem no banco
      await db.insert(receivedMessages).values({
        provider: "whatsapp",
        externalId: messageId,
        fromNumber: remoteJid,
        fromName: pushName || null,
        messageType: messageType as "text" | "image" | "audio" | "video" | "document" | "location" | "contact" | "sticker" | "reaction" | "unknown",
        messageText,
        mediaUrl,
        mimeType,
        caption,
        timestamp: messageTimestamp,
        rawPayload: JSON.stringify(body),
        processed: 0,
      });

      console.log('[Evolution Webhook] Message saved to database:', messageId);

      // Ingerir na conversa
      await ingestInboundConversationMessage({
        provider: "whatsapp",
        fromNumber: remoteJid,
        fromName: pushName || null,
        messageType,
        messageText,
        caption,
        mediaUrl,
        mimeType,
      });
        
      console.log('[Evolution Webhook] Webhook processed successfully:', { messageId, fromNumber: remoteJid });
      return;
    }

    // Eventos de presença - não precisamos processar
    if (normalizedEvent.includes('presence') || normalizedEvent === 'status_update') {
      console.log('[Evolution Webhook] Presence event ignored:', normalizedEvent);
      return;
    }

    // Chats update - pode ser útil para atualizar status
    if (normalizedEvent === 'chats_update') {
      console.log('[Evolution Webhook] Chats update event received');
      return;
    }

    // Connection update - quando a conexão é estabelecida
    if (normalizedEvent === 'connection_update') {
      console.log('[Evolution Webhook] Connection update event received');
      const payload = body?.data || body;
      const profileName = payload?.profileName || payload?.profile?.name || null;
      const profilePicture = payload?.profilePictureUrl || payload?.profile?.picture || null;
      console.log('[Evolution Webhook] Connection established:', { profileName, profilePicture });
      return;
    }

    console.log('[Evolution Webhook] Unhandled event type:', eventName);
  } catch (error) {
    console.error('[Evolution Webhook] Error processing webhook:', error);
    console.error('[Evolution Webhook] Stack:', error instanceof Error ? error.stack : '');
    throw error;
  }
}

/**
 * Validate WhatsApp webhook signature using HMAC SHA256
 */
async function validateWhatsAppSignature(rawBody: Buffer | string | undefined, signature: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const config = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "whatsapp_business"))
      .limit(1);

    if (config.length === 0) {
      console.log("[WhatsApp Webhook] No configuration found, skipping signature validation");
      return true;
    }

    const configData = typeof config[0].config === 'string' ? JSON.parse(config[0].config) : config[0].config;
    const appSecret = configData.appSecret;

    if (!appSecret) {
      if (isProduction) {
        console.log("[WhatsApp Webhook] No app secret configured in production");
        return false;
      }
      console.log("[WhatsApp Webhook] No app secret configured, skipping signature validation");
      return true;
    }
    if (!rawBody) {
      console.log("[WhatsApp Webhook] Missing raw body for signature validation");
      return false;
    }

    const payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature = "sha256=" + crypto
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
async function validateInstagramSignature(rawBody: Buffer | string | undefined, signature: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const config = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "instagram_graph"))
      .limit(1);

    if (config.length === 0) {
      console.log("[Instagram Webhook] No configuration found, skipping signature validation");
      return true;
    }

    const configData = typeof config[0].config === 'string' ? JSON.parse(config[0].config) : config[0].config;
    const appSecret = configData.appSecret;

    if (!appSecret) {
      if (isProduction) {
        console.log("[Instagram Webhook] No app secret configured in production");
        return false;
      }
      console.log("[Instagram Webhook] No app secret configured, skipping signature validation");
      return true;
    }
    if (!rawBody) {
      console.log("[Instagram Webhook] Missing raw body for signature validation");
      return false;
    }

    const payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature = "sha256=" + crypto
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
