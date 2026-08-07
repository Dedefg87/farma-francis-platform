import { getDb } from "./db";
import { integrationSettings, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ingestOutboundConversationMessage } from "./db-messages-outbound";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// S3 Client para R2 (uso interno - download de mídia para base64)
const s3Client = new S3Client({
  region: "auto",
  endpoint: "https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "debc3a713faeb6d442dab499221ba42f",
    secretAccessKey: "c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c",
  },
});

/**
 * Extrai a key do R2 de uma URL (pública .r2.dev ou interna .cloudflarestorage.com)
 */
function extractR2Key(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.includes("pub-33c481f0a9e94adb8870472308f49471.r2.dev")) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(1).join("/");
    } catch {
      return null;
    }
  }
  // Non-R2 paths (e.g. evolution-api/...): return as-is so getMediaAsBase64 can handle them
  if (!url.startsWith("http") && !url.startsWith("data:")) return url;
  // HTTP URLs: return as-is, getMediaAsBase64 will fetch via HTTP
  return url;
}

/**
 * Baixa mídia do R2 e retorna como base64 puro (sem prefixo data:)
 * Usado para enviar mídia à Evolution API que não acessa URLs do R2
 */
async function getMediaAsBase64(urlOrKey: string): Promise<{ base64: string; mimetype: string }> {
  if (!urlOrKey) throw new Error("Media URL or key is empty");
  // Handle data: URLs
  if (urlOrKey.startsWith("data:")) {
    const m = urlOrKey.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) return { base64: m[2], mimetype: m[1] };
  }
  // Determine R2 key from URL or path
  let r2Key: string | null = null;
  if (urlOrKey.includes(".r2.dev") || urlOrKey.includes("r2.cloudflarestorage.com")) {
    try { r2Key = new URL(urlOrKey).pathname.split("/").filter(Boolean).join("/"); } catch {}
  } else if (!urlOrKey.startsWith("http") && !urlOrKey.startsWith("data:")) {
    r2Key = urlOrKey;
  }
  // Try R2 first (with and without URL decoding)
  if (r2Key) {
    const keysToTry = [r2Key];
    try { const decoded = decodeURIComponent(r2Key); if (decoded !== r2Key) keysToTry.push(decoded); } catch {}
    for (const key of keysToTry) {
      try {
        const command = new GetObjectCommand({ Bucket: "farmafranciswhatsappmedia", Key: key });
        const response = await s3Client.send(command);
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as any) { chunks.push(Buffer.from(chunk)); }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString("base64");
        const mimetype = response.ContentType || "application/octet-stream";
        const MAX_BASE64_SIZE = 5 * 1024 * 1024;
        if (base64.length > MAX_BASE64_SIZE) {
          throw new Error("Mídia muito grande (" + (base64.length / 1024 / 1024).toFixed(1) + "MB). Limite: 5MB.");
        }
        return { base64, mimetype };
      } catch (e: any) {
        console.log("[getMediaAsBase64] R2 failed for key: " + String(key).substring(0, 80) + " - " + String(e.message || e).substring(0, 100));
      }
    }
  }
  // Fallback: fetch via HTTP
  if (urlOrKey.startsWith("http")) {
    const response = await fetch(urlOrKey, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimetype = response.headers.get("content-type") || "application/octet-stream";
    if (base64.length > 5 * 1024 * 1024) throw new Error("Media too large");
    return { base64, mimetype };
  }
  // Fallback: try fetching from Evolution API server (for files not in R2)
  if (urlOrKey.startsWith("evolution-api/") || urlOrKey.includes("evolution-api/")) {
    try {
      const config = await getEvolutionConfig();
      if (config) {
        const decodedPath = urlOrKey.includes("%40") ? decodeURIComponent(urlOrKey) : urlOrKey;
        const fetchUrl = config.apiUrl + "/" + decodedPath;
        console.log("[getMediaAsBase64] Trying Evolution API:", fetchUrl.substring(0, 100));
        const evoResp = await fetch(fetchUrl, {
          headers: { "apikey": config.apiKey, "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15000)
        });
        console.log("[getMediaAsBase64] Evolution API response:", evoResp.status);
        if (evoResp.ok) {
          const ctype = evoResp.headers.get("content-type") || "";
          if (!ctype.includes("text/html") && !ctype.includes("text/plain") && !ctype.includes("application/json")) {
            const buf = Buffer.from(await evoResp.arrayBuffer());
            if (buf.length > 0 && buf.length < 10 * 1024 * 1024) {
              const b64 = buf.toString("base64");
              const mt = ctype || "application/octet-stream";
              console.log("[getMediaAsBase64] Got media from Evolution API:", buf.length, "bytes");
              return { base64: b64, mimetype: mt };
            }
          }
        }
      }
    } catch (e: any) {
      console.log("[getMediaAsBase64] Evolution API fallback failed:", String(e.message || e).substring(0, 100));
    }
  }
  throw new Error("Could not fetch media: " + String(urlOrKey).substring(0, 100));
}

function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

async function getIntegrationConfig(
  type: "whatsapp_business" | "instagram_graph" | "evolution_api"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.integrationType, type))
    .limit(1);

  if (!config || !config.isActive) {
    throw new Error(`${type} configuration not found or inactive`);
  }

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;
  return { configData, configId: config.id };
}

async function getEvolutionConfig() {
  try {
    const { configData } = await getIntegrationConfig("evolution_api");
    const apiUrl = configData.apiUrl as string | undefined;
    const apiKey =
      (configData.apiKey as string | undefined) ||
      (configData.accessToken as string | undefined);
    const instanceName = configData.instanceName as string | undefined;

    if (!apiUrl || !apiKey || !instanceName) {
      return null;
    }

    return {
      apiUrl: apiUrl.replace(/\/$/, ""),
      apiKey,
      instanceName,
    };
  } catch {
    return null;
  }
}

async function sendEvolutionText(params: { to: string; message: string }) {
  const config = await getEvolutionConfig();
  if (!config) {
    throw new Error("Evolution API configuration not found or incomplete");
  }

  const response = await fetch(
    `${config.apiUrl}/message/sendText/${config.instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: normalizeWhatsAppNumber(params.to),
        text: params.message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Fetch profile info from Evolution API
 */
export async function fetchEvolutionProfile(phone: string) {
  const config = await getEvolutionConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(
      `${config.apiUrl}/chat/fetchProfile/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber(phone),
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      name: data.name || data.pushname || null,
      profilePicture: data.picture || data.profilePictureUrl || null,
      phone: phone,
    };
  } catch (error) {
    console.error("[Evolution API] Error fetching profile:", error);
    return null;
  }
}

/**
 * Fetch Instagram user profile (name + profile picture) via Graph API.
 * Requires instagram_manage_messages / IGSID lookup permission on the token.
 */
export async function fetchInstagramProfile(igsid: string) {
  try {
    const { configData } = await getIntegrationConfig("instagram_graph");
    const token = configData.accessToken as string | undefined;
    if (!token || !igsid) return null;

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${igsid}?fields=name,username,profile_pic&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.warn("[Instagram Profile] fetch failed:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      name: data.name || data.username || null,
      profilePicture: data.profile_pic || null,
    };
  } catch (error) {
    console.error("[Instagram Profile] Error fetching profile:", error);
    return null;
  }
}

/**
 * Send a text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(params: {
  to: string;
  message: string;
  replyToMessageId?: string;
  mediaUrl?: string;
  caption?: string;
  senderName?: string;
  senderPosition?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build message with sender identification if provided
  let finalMessage = params.message;
  if (params.senderName) {
    const senderLabel = params.senderPosition
      ? `${params.senderName} - ${params.senderPosition}`
      : params.senderName;
    finalMessage = `*${senderLabel}*\n${params.message}`;
  }

  // If mediaUrl is provided, send media message
  if (params.mediaUrl) {
    const result = await sendWhatsAppViewOnceMedia({
      to: params.to,
      mediaUrl: params.mediaUrl,
      mediaType:
        params.mediaUrl.startsWith("data:") ||
        params.mediaUrl.includes("base64")
          ? "image"
          : "image",
      caption: params.caption || finalMessage,
    });
    return result;
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
    const result = await sendEvolutionText({
      to: params.to,
      message: finalMessage,
    });
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: finalMessage,
      messageId: result?.key?.id || null,
      status: "sent",
    });

      // Also save to conversation_messages for visibility in chat
      await ingestOutboundConversationMessage({
        provider: "whatsapp",
        toNumber: params.to,
        fromUserId: 1,
        messageType: "text",
        messageText: finalMessage,
        externalId: result?.key?.id || null,
      });
    return { success: true, messageId: result?.key?.id || null, to: params.to };
  }

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }

  // Prepare request body
  const body: unknown = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber(params.to),
    type: "text",
    text: {
      body: finalMessage,
    },
  };

  if (params.replyToMessageId) {
    body.context = {
      message_id: params.replyToMessageId,
    };
  }

  // Send message via WhatsApp API
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[WhatsApp Send] Error:", error);
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  // Save sent message to database
  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: finalMessage,
    messageId: result.messages[0].id,
    status: "sent",
  });

  console.log(
    `[WhatsApp Send] Message sent to ${params.to}: ${result.messages[0].id}`
  );

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send an image via WhatsApp Business API
 */
export async function sendWhatsAppImage(params: {
  to: string;
  imageUrl: string;
  caption?: string;
  senderName?: string;
  senderPosition?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build caption with sender identification if provided
  let finalCaption = params.caption || "";
  if (params.senderName) {
    const senderLabel = params.senderPosition
      ? `${params.senderName} - ${params.senderPosition}`
      : params.senderName;
    finalCaption = `*${senderLabel}*\n${params.caption || "[Image]"}`;
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
    // Converter mídia do R2 para base64 puro (Evolution não acessa URLs do R2)
    let mediaBase64: string;
    let mediaMimetype: string;

    try {
      const fileKey = extractR2Key(params.imageUrl);
      if (!fileKey) {
        throw new Error(`Não foi possível extrair key do R2 da URL: ${params.imageUrl}`);
      }
      const media = await getMediaAsBase64(fileKey);
      mediaBase64 = media.base64;
      mediaMimetype = media.mimetype;
    } catch (err) {
      console.error("[sendWhatsAppImage] Erro ao converter para base64:", err);
      throw new Error(`Falha ao preparar mídia para Evolution API: ${(err as Error).message}`);
    }

    // Usar endpoint correto de mídia para enviar imagem (não como texto!)
    const response = await fetch(
      `${evolutionConfig.apiUrl}/message/sendMedia/${evolutionConfig.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: evolutionConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber(params.to),
          mediatype: "image",
          media: mediaBase64, // base64 puro, sem prefixo data:
          caption: finalCaption || undefined,
          mimetype: mediaMimetype,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: finalCaption,
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        imageUrl: params.imageUrl,
        caption: finalCaption,
      }),
    });

    // Also save to conversation_messages for visibility in chat
    await ingestOutboundConversationMessage({
      provider: "whatsapp",
      toNumber: params.to,
      fromUserId: 1,
      messageType: "image",
      messageText: finalCaption,
      mediaUrl: params.imageUrl,
      mimeType: mediaMimetype,
      fileName: params.imageUrl.split("/").pop() || "imagem.jpg",
      externalId: result?.key?.id || null,
    });

    return { success: true, messageId: result?.key?.id || null, to: params.to };
  }

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }

  const body = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber(params.to),
    type: "image",
    image: {
      link: params.imageUrl,
      caption: finalCaption,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: finalCaption,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      imageUrl: params.imageUrl,
      caption: finalCaption,
    }),
  });

  // Also save to conversation_messages for visibility in chat
  await ingestOutboundConversationMessage({
    provider: "whatsapp",
    toNumber: params.to,
    fromUserId: 1,
    messageType: "image",
    messageText: finalCaption,
    mediaUrl: params.imageUrl,
    mimeType: "image/jpeg",
    fileName: params.imageUrl.split("/").pop() || "imagem.jpg",
    externalId: result.messages[0].id,
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send an Instagram text message
 */
export async function sendInstagramMessage(params: {
  to: string;
  message: string;
  mediaUrl?: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken as string | undefined;
  const igsid = configData.igsid as string | undefined;

  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }

  const messageText = params.message;

  const body = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      text: {
        body: messageText,
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: messageText,
    messageId: result?.messageId || null,
    status: "sent",
  });

  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to,
  };
}

/**
 * Send an Instagram image
 */
export async function sendInstagramImage(params: {
  to: string;
  imageUrl: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken as string | undefined;
  const igsid = configData.igsid as string | undefined;

  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }

  const body = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      image: {
        link: params.imageUrl,
        caption: params.caption,
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: params.caption || "[Image]",
    messageId: result?.messageId || null,
    status: "sent",
    metadata: JSON.stringify({
      imageUrl: params.imageUrl,
      caption: params.caption,
    }),
  });

  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to,
  };
}

/**
 * Send a document via WhatsApp Business API
 */
export async function sendWhatsAppDocument(params: {
  to: string;
  documentUrl: string;
  fileName: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }

  const body = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber(params.to),
    type: "document",
    document: {
      link: params.documentUrl,
      caption: params.caption,
      filename: params.fileName,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: params.caption || params.fileName,
    messageId: result.messages[0].id,
    status: "sent",
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send an Instagram document
 */
export async function sendInstagramDocument(params: {
  to: string;
  documentUrl: string;
  fileName: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken as string | undefined;
  const igsid = configData.igsid as string | undefined;

  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }

  const body = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      attachment: {
        type: "MEDIA",
        payload: {
          url: params.documentUrl,
          is_video: false,
        },
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: params.caption || params.fileName,
    messageId: result?.messageId || null,
    status: "sent",
  });

  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to,
  };
}

/**
 * Send any media file via WhatsApp (generic function)
 */
export async function sendWhatsAppMedia(params: {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "audio" | "document";
  fileName?: string;
  caption?: string;
}) {
  // Route to appropriate function based on media type
  switch (params.mediaType) {
    case "image":
      return await sendWhatsAppImage({
        to: params.to,
        imageUrl: params.mediaUrl,
        caption: params.caption,
      });
    case "video":
      // For video, we'd need a sendWhatsAppVideo function
      throw new Error("Video sending not implemented yet");
    case "audio":
      // For audio, we'd need a sendWhatsAppAudio function
      throw new Error("Audio sending not implemented yet");
    case "document":
      return await sendWhatsAppDocument({
        to: params.to,
        documentUrl: params.mediaUrl,
        fileName: params.fileName || "document",
        caption: params.caption,
      });
    default:
      throw new Error(`Unsupported media type: ${params.mediaType}`);
  }
}

/**
 * Send a view-once (disappearing) image or video via WhatsApp Business API
 */
export async function sendWhatsAppViewOnceMedia(params: {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  senderName?: string;
  senderPosition?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build caption with sender identification if provided
  let finalCaption = params.caption || `""`;
  if (params.senderName) {
    const senderLabel = params.senderPosition
      ? `${params.senderName} - ${params.senderPosition}`
      : params.senderName;
    finalCaption = `*${senderLabel}*\n${params.caption || `[View-once ${params.mediaType}]`}`;
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
    // Converter mídia do R2 para base64 puro
    let mediaBase64: string;
    let mediaMimetype: string;

    try {
      const fileKey = extractR2Key(params.mediaUrl);
      if (!fileKey) {
        throw new Error(`Não foi possível extrair key do R2 da URL: ${params.mediaUrl}`);
      }
      const media = await getMediaAsBase64(fileKey);
      mediaBase64 = media.base64;
      mediaMimetype = media.mimetype;
    } catch (err) {
      console.error("[sendWhatsAppViewOnceMedia] Erro ao converter para base64:", err);
      throw new Error(`Falha ao preparar mídia para Evolution API: ${(err as Error).message}`);
    }

    // Usar endpoint correto de mídia para view-once
    const response = await fetch(
      `${evolutionConfig.apiUrl}/message/sendMedia/${evolutionConfig.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: evolutionConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber(params.to),
          mediatype: params.mediaType,
          media: mediaBase64, // base64 puro
          caption: finalCaption || undefined,
          mimetype: mediaMimetype,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: finalCaption,
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        caption: finalCaption,
        viewOnce: true,
      }),
    });
    return { success: true, messageId: result?.key?.id || null, to: params.to };
  }

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }

  const body = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber(params.to),
    type: params.mediaType,
    [params.mediaType]: {
      link: params.mediaUrl,
      caption: finalCaption,
      animated: false,
    },
    ephemeral: true,
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  // Also save to conversation_messages for visibility in chat
  await ingestOutboundConversationMessage({
    provider: "whatsapp",
    toNumber: params.to,
    fromUserId: 1,
    messageType: params.mediaType,
    messageText: finalCaption,
    mediaUrl: params.mediaUrl,
    mimeType: params.mediaType === "image" ? "image/jpeg" : "video/mp4",
    fileName: params.mediaUrl.split("/").pop() || "media.jpg",
    externalId: result.messages[0].id,
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Get sent messages (for testing and admin views)
 */
export async function getSentMessages(params: {
  channel?: "whatsapp" | "instagram";
  customerId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(messages);

  if (params.channel) {
    query = query.where(eq(messages.channel, params.channel));
  }

  if (params.customerId) {
    query = query.where(eq(messages.customerId, params.customerId));
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  return await query;
}
    else if (rawMessageType === 'extendedTextMessage') typeToSave = 'text';