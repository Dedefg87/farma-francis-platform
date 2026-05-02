import type { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { receivedMessages, integrationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Instagram Webhook Handler
 *
 * Handles webhook verification (GET) and incoming messages (POST)
 * from Instagram Graph API
 */

// GET /api/webhooks/instagram - Webhook verification
export async function verifyInstagramWebhook(req: Request, res: Response) {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("[Instagram Webhook] Verification request:", { mode, token });

    // Load verify token from database
    const db = await getDb();
    if (!db) {
      console.error("[Instagram Webhook] Database not available");
      return res.status(500).send("Database not available");
    }

    const settings = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.name, "instagram"))
      .limit(1);

    if (!settings.length) {
      console.error("[Instagram Webhook] No Instagram settings found");
      return res.status(403).send("No Instagram configuration found");
    }

    const config = JSON.parse(settings[0].config as string);
    const verifyToken = config.verifyToken;

    // Check if mode and token are valid
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Instagram Webhook] Verification successful");
      return res.status(200).send(challenge);
    }

    console.error("[Instagram Webhook] Verification failed - invalid token");
    return res.status(403).send("Invalid verify token");
  } catch (error) {
    console.error("[Instagram Webhook] Verification error:", error);
    return res.status(500).send("Internal server error");
  }
}

// POST /api/webhooks/instagram - Receive messages
export async function receiveInstagramMessage(req: Request, res: Response) {
  try {
    console.log(
      "[Instagram Webhook] Received payload:",
      JSON.stringify(req.body, null, 2)
    );

    // Validate signature (optional but recommended for production)
    const signature = req.headers["x-hub-signature-256"] as string;
    if (signature) {
      const db = await getDb();
      if (!db) return res.status(200).send("OK");

      const settings = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.name, "instagram"))
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
            console.error("[Instagram Webhook] Invalid signature");
            return res.status(403).send("Invalid signature");
          }
        }
      }
    }

    // Parse webhook payload
    const { entry } = req.body;
    if (!entry || !Array.isArray(entry)) {
      console.log("[Instagram Webhook] No entries found");
      return res.status(200).send("OK");
    }

    // Process each entry
    for (const item of entry) {
      const messaging = item.messaging || [];
      for (const event of messaging) {
        if (event.message) {
          await processInstagramMessage(event);
        }
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    return res.status(200).send("OK");
  } catch (error) {
    console.error("[Instagram Webhook] Error processing message:", error);
    // Still return 200 to avoid retries
    return res.status(200).send("OK");
  }
}

// Helper function to process individual Instagram messages
async function processInstagramMessage(event: unknown) {
  try {
    const messageId = event.message.mid;
    const fromNumber = event.sender.id; // Instagram User ID (IGSID)
    const timestamp = event.timestamp;

    // Determine message type and extract content
    let messageType = "text";
    let messageText = null;
    let mediaUrl = null;
    let mediaId = null;
    let mimeType = null;

    if (event.message.text) {
      messageType = "text";
      messageText = event.message.text;
    } else if (event.message.attachments) {
      const attachment = event.message.attachments[0];
      messageType = attachment.type || "unknown";

      switch (messageType) {
        case "image":
          mediaUrl = attachment.payload?.url;
          mimeType = "image/jpeg";
          break;
        case "video":
          mediaUrl = attachment.payload?.url;
          mimeType = "video/mp4";
          break;
        case "audio":
          mediaUrl = attachment.payload?.url;
          mimeType = "audio/mpeg";
          break;
        case "file":
          mediaUrl = attachment.payload?.url;
          mimeType =
            attachment.payload?.extension || "application/octet-stream";
          break;
      }
    } else if (event.message.quick_reply) {
      messageType = "text";
      messageText = event.message.quick_reply.payload;
    } else if (event.message.reply_to) {
      messageType = "text";
      messageText = event.message.text || "[Reply]";
    }

    // Download and save media to permanent storage if present
    let permanentMediaUrl = null;
    if (mediaUrl && ["image", "video", "audio", "file"].includes(messageType)) {
      console.log(`[Instagram Webhook] Downloading media: ${messageType}`);
      try {
        const response = await fetch(mediaUrl, {
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");

          // Detect content type
          let contentType = mimeType;
          const headerCt = response.headers.get("content-type");
          if (headerCt) {
            contentType = headerCt.split(";")[0];
          }

          permanentMediaUrl = `data:${contentType};base64,${base64}`;
          console.log(
            `[Instagram Webhook] Media downloaded, size: ${buffer.length}`
          );
        } else {
          console.warn(
            `[Instagram Webhook] Media download failed: ${response.status}`
          );
        }
      } catch (downloadError) {
        console.error(
          "[Instagram Webhook] Media download error:",
          downloadError
        );
      }
    }

    // Save to database
    const db = await getDb();
    if (!db) {
      console.error(
        "[Instagram Webhook] Database not available for saving message"
      );
      return;
    }

    await db.insert(receivedMessages).values({
      provider: "instagram",
      externalId: messageId,
      fromNumber,
      fromName: null, // Instagram doesn't provide name in webhook
      messageType: messageType as any,
      messageText,
      mediaUrl: permanentMediaUrl || mediaUrl,
      mediaId,
      mimeType,
      timestamp: parseInt(timestamp),
      rawPayload: JSON.stringify({
        ...event,
        mediaDownloaded: !!permanentMediaUrl,
      }),
      processed: 0,
    });

    console.log(
      `[Instagram Webhook] Message saved: ${messageId} from ${fromNumber}`
    );
  } catch (error) {
    console.error(
      "[Instagram Webhook] Error processing individual message:",
      error
    );
  }
}
