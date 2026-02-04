import type { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { receivedMessages, integrationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * WhatsApp Webhook Handler
 * 
 * Handles webhook verification (GET) and incoming messages (POST)
 * from WhatsApp Business API
 */

// GET /api/webhooks/whatsapp - Webhook verification
export async function verifyWhatsAppWebhook(req: Request, res: Response) {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("[WhatsApp Webhook] Verification request:", { mode, token });

    // Load verify token from database
    const db = await getDb();
    if (!db) {
      console.error("[WhatsApp Webhook] Database not available");
      return res.status(500).send("Database not available");
    }

    const settings = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.name, "whatsapp"))
      .limit(1);

    if (!settings.length) {
      console.error("[WhatsApp Webhook] No WhatsApp settings found");
      return res.status(403).send("No WhatsApp configuration found");
    }

    const config = JSON.parse(settings[0].config as string);
    const verifyToken = config.verifyToken;

    // Check if mode and token are valid
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Verification successful");
      return res.status(200).send(challenge);
    }

    console.error("[WhatsApp Webhook] Verification failed - invalid token");
    return res.status(403).send("Invalid verify token");
  } catch (error) {
    console.error("[WhatsApp Webhook] Verification error:", error);
    return res.status(500).send("Internal server error");
  }
}

// POST /api/webhooks/whatsapp - Receive messages
export async function receiveWhatsAppMessage(req: Request, res: Response) {
  try {
    console.log("[WhatsApp Webhook] Received payload:", JSON.stringify(req.body, null, 2));

    // Validate signature (optional but recommended for production)
    const signature = req.headers["x-hub-signature-256"] as string;
    if (signature) {
      const db = await getDb();
      if (!db) return;

      const settings = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.name, "whatsapp"))
        .limit(1);

      if (settings.length) {
        const config = JSON.parse(settings[0].config as string);
        const appSecret = config.appSecret;

        if (appSecret) {
          const expectedSignature = crypto
            .createHmac("sha256", appSecret)
            .update(JSON.stringify(req.body))
            .digest("hex");

          if (signature !== `sha256=${expectedSignature}`) {
            console.error("[WhatsApp Webhook] Invalid signature");
            return res.status(403).send("Invalid signature");
          }
        }
      }
    }

    // Parse webhook payload
    const { entry } = req.body;
    if (!entry || !Array.isArray(entry)) {
      console.log("[WhatsApp Webhook] No entries found");
      return res.status(200).send("OK");
    }

    // Process each entry
    for (const item of entry) {
      const changes = item.changes || [];
      for (const change of changes) {
        if (change.field === "messages") {
          const value = change.value;
          const messages = value.messages || [];

          // Process each message
          for (const message of messages) {
            await processWhatsAppMessage(message, value);
          }
        }
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing message:", error);
    // Still return 200 to avoid retries
    return res.status(200).send("OK");
  }
}

// Helper function to process individual WhatsApp messages
async function processWhatsAppMessage(message: any, value: any) {
  try {
    const messageId = message.id;
    const fromNumber = message.from;
    const timestamp = message.timestamp;

    // Determine message type and extract content
    let messageType = message.type || "unknown";
    let messageText = null;
    let mediaUrl = null;
    let mediaId = null;
    let mimeType = null;

    switch (messageType) {
      case "text":
        messageText = message.text?.body;
        break;
      case "image":
        mediaId = message.image?.id;
        mimeType = message.image?.mime_type;
        messageText = message.image?.caption;
        break;
      case "audio":
        mediaId = message.audio?.id;
        mimeType = message.audio?.mime_type;
        break;
      case "video":
        mediaId = message.video?.id;
        mimeType = message.video?.mime_type;
        messageText = message.video?.caption;
        break;
      case "document":
        mediaId = message.document?.id;
        mimeType = message.document?.mime_type;
        messageText = message.document?.caption || message.document?.filename;
        break;
      case "location":
        const loc = message.location;
        messageText = `Location: ${loc?.latitude}, ${loc?.longitude}`;
        break;
      case "contact":
        const contacts = message.contacts || [];
        messageText = contacts.map((c: any) => c.name?.formatted_name).join(", ");
        break;
      case "sticker":
        mediaId = message.sticker?.id;
        mimeType = message.sticker?.mime_type;
        break;
      case "reaction":
        messageText = `Reaction: ${message.reaction?.emoji}`;
        break;
    }

    // Get sender name from contacts
    const contacts = value.contacts || [];
    const contact = contacts.find((c: any) => c.wa_id === fromNumber);
    const fromName = contact?.profile?.name || null;

    // Save to database
    const db = await getDb();
    if (!db) {
      console.error("[WhatsApp Webhook] Database not available for saving message");
      return;
    }

    await db.insert(receivedMessages).values({
      provider: "whatsapp",
      externalId: messageId,
      fromNumber,
      fromName,
      messageType: messageType as any,
      messageText,
      mediaUrl,
      mediaId,
      mimeType,
      timestamp: parseInt(timestamp),
      rawPayload: JSON.stringify(message),
      processed: 0,
    });

    console.log(`[WhatsApp Webhook] Message saved: ${messageId} from ${fromNumber}`);
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing individual message:", error);
  }
}
