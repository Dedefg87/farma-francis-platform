import { getDb } from "./db";
import { integrationSettings, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ingestOutboundConversationMessage } from "./db-messages-outbound";

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
  let finalCaption = params.caption || "[Image]";
  if (params.senderName) {
    const senderLabel = params.senderPosition
      ? `${params.senderName} - ${params.senderPosition}`
      : params.senderName;
    finalCaption = `*${senderLabel}*\n${params.caption || "[Image]"}`;
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
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
          media: params.imageUrl,
          caption: finalCaption,
          mimetype: "image/jpeg",
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
      mimeType: "image/jpeg",
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
  let finalCaption = params.caption || `[View-once ${params.mediaType}]`;
  if (params.senderName) {
    const senderLabel = params.senderPosition
      ? `${params.senderName} - ${params.senderPosition}`
      : params.senderName;
    finalCaption = `*${senderLabel}*\n${params.caption || `[View-once ${params.mediaType}]`}`;
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
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
          media: params.mediaUrl,
          caption: finalCaption,
          mimetype: params.mediaType === "image" ? "image/jpeg" : "video/mp4",
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