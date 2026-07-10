import { getDb } from "./db";
import { integrationSettings, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

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
 * Send a text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(params: {
  to: string; // Phone number in international format (e.g., +5511999999999)
  message: string;
  replyToMessageId?: string;
  mediaUrl?: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If mediaUrl is provided, send media message
  if (params.mediaUrl) {
    return sendWhatsAppViewOnceMedia({
      to: params.to,
      mediaUrl: params.mediaUrl,
      mediaType:
        params.mediaUrl.startsWith("data:") ||
        params.mediaUrl.includes("base64")
          ? "image"
          : "image",
      caption: params.caption || params.message,
    });
  }

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
    const result = await sendEvolutionText({
      to: params.to,
      message: params.message,
    });
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: params.message,
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
      body: params.message,
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
    content: params.message,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: params.mediaUrl ? JSON.stringify({
      mediaUrl: params.mediaUrl,
      caption: params.caption,
      fileType: "image",
    }) : null,
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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
          caption: params.caption || undefined,
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
      content: params.caption || "[Image]",
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        imageUrl: params.imageUrl,
        caption: params.caption,
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
    type: "image",
    image: {
      link: params.imageUrl,
      caption: params.caption || undefined,
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
    content: params.caption || "[Image]",
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      imageUrl: params.imageUrl,
      caption: params.caption,
    }),
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send a view-once (disappearing) image or video via WhatsApp Business API
 */
export async function sendWhatsAppViewOnceMedia(params: {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
          caption: params.caption || undefined,
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
      content: params.caption || `[View-once ${params.mediaType}]`,
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        caption: params.caption,
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
      caption: params.caption || undefined,
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

  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: params.caption || `[View-once ${params.mediaType}]`,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      caption: params.caption,
      viewOnce: true,
    }),
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send a text message via Instagram Graph API
 */
export async function sendInstagramMessage(params: {
  to: string; // Instagram user ID (IGSID)
  message: string;
  mediaUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const pageId = configData.pageId || configData.businessAccountId;

  if (!token || !pageId) {
    throw new Error("Instagram configuration missing accessToken or pageId");
  }

  // If mediaUrl is provided, send media message
  if (params.mediaUrl) {
    // For Instagram, we send the media as a message with the image URL
    const body = {
      recipient: {
        id: params.to,
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: params.mediaUrl,
            is_reusable: true,
          },
        },
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("[Instagram] Send media error:", data);
      throw new Error(data.error?.message || "Failed to send media");
    }

    await db.insert(messages).values({
      channel: "instagram",
      direction: "outbound",
      content: params.message || "[Imagem]",
      messageId: data.message_id || null,
      status: "sent",
      metadata: JSON.stringify({ mediaUrl: params.mediaUrl }),
    });

    return { success: true, messageId: data.message_id, to: params.to };
  }

  const body = {
    recipient: {
      id: params.to,
    },
    message: {
      text: params.message,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
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
    console.error("[Instagram Send] Error:", error);
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: params.message,
    messageId: result.message_id,
    status: "sent",
  });

  console.log(
    `[Instagram Send] Message sent to ${params.to}: ${result.message_id}`
  );

  return {
    success: true,
    messageId: result.message_id,
    to: params.to,
  };
}

/**
 * Send an image via Instagram Graph API
 */
export async function sendInstagramImage(params: {
  to: string;
  imageUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const pageId = configData.pageId || configData.businessAccountId;

  if (!token || !pageId) {
    throw new Error("Instagram configuration missing accessToken or pageId");
  }

  const body = {
    recipient: {
      id: params.to,
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: params.imageUrl,
          is_reusable: true,
        },
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
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
    content: "[Image]",
    messageId: result.message_id,
    status: "sent",
    metadata: JSON.stringify({ imageUrl: params.imageUrl }),
  });

  return {
    success: true,
    messageId: result.message_id,
    to: params.to,
  };
}

/**
 * Send a document (PDF, DOC, etc.) via WhatsApp Business API
 */
export async function sendWhatsAppDocument(params: {
  to: string;
  documentUrl: string;
  filename: string;
  mimeType: string;
  caption?: string;
}) {
  console.log("[sendWhatsAppDocument] Params:", JSON.stringify(params));
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const evolutionConfig = await getEvolutionConfig();
  console.log("[sendWhatsAppDocument] Evolution config:", evolutionConfig ? "FOUND" : "NOT FOUND");
  
  if (evolutionConfig) {
    // Evolution API - usar sendMedia com mediatype 'document'
    const url = `${evolutionConfig.apiUrl}/message/sendMedia/${evolutionConfig.instanceName}`;
    const body = {
      number: normalizeWhatsAppNumber(params.to),
      mediatype: "document",
      media: params.documentUrl,
      fileName: params.filename,
      mimetype: params.mimeType,
      caption: params.caption || undefined,
    };
    
    console.log("[sendWhatsAppDocument] Sending to Evolution API:", url);
    console.log("[sendWhatsAppDocument] Body:", JSON.stringify(body));
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: evolutionConfig.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("[sendWhatsAppDocument] Response status:", response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[sendWhatsAppDocument] Error:", error);
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log("[sendWhatsAppDocument] Result:", JSON.stringify(result));
    
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: params.caption || params.filename,
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        documentUrl: params.documentUrl,
        filename: params.filename,
        mimeType: params.mimeType,
        caption: params.caption,
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
    type: "document",
    document: {
      link: params.documentUrl,
      filename: params.filename,
      caption: params.caption || undefined,
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
    content: params.caption || params.filename,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      documentUrl: params.documentUrl,
      filename: params.filename,
      mimeType: params.mimeType,
      caption: params.caption,
    }),
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Send a document (PDF, DOC, etc.) via Instagram Graph API
 */
export async function sendInstagramDocument(params: {
  to: string;
  documentUrl: string;
  filename: string;
  mimeType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const pageId = configData.pageId || configData.businessAccountId;

  if (!token || !pageId) {
    throw new Error("Instagram configuration missing accessToken or pageId");
  }

  // Instagram suporta anexos de arquivo via API
  const body = {
    recipient: {
      id: params.to,
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: params.documentUrl,
          is_reusable: true,
        },
      },
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
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
    content: params.filename,
    messageId: result.message_id,
    status: "sent",
    metadata: JSON.stringify({
      documentUrl: params.documentUrl,
      filename: params.filename,
      mimeType: params.mimeType,
    }),
  });

  return {
    success: true,
    messageId: result.message_id,
    to: params.to,
  };
}

/**
 * Send media (image, video, audio, document) via WhatsApp with correct mime type
 * This function ensures the file type is preserved
 */
export async function sendWhatsAppMedia(params: {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "audio" | "document";
  filename?: string;
  mimeType: string;
  caption?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const evolutionConfig = await getEvolutionConfig();
  if (evolutionConfig) {
    // Evolution API - usar sendMedia para todos os tipos com mediatype correto
    let endpoint = `message/sendMedia/${evolutionConfig.instanceName}`;
    
    if (params.mediaType === "audio") {
      // Áudio usa endpoint específico
      endpoint = `message/sendWhatsAppAudio/${evolutionConfig.instanceName}`;
    }

    const body: unknown = {
      number: normalizeWhatsAppNumber(params.to),
      mediatype: params.mediaType === "audio" ? "audio" : params.mediaType,
      media: params.mediaUrl,
      mimetype: params.mimeType,
      caption: params.caption || undefined,
    };

    // fileName é obrigatório para documentos
    if (params.mediaType === "document") {
      body.fileName = params.filename || "documento";
    }

    const response = await fetch(
      `${evolutionConfig.apiUrl}/${endpoint}`,
      {
        method: "POST",
        headers: {
          apikey: evolutionConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
      content: params.caption || params.filename || `[${params.mediaType}]`,
      messageId: result?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        filename: params.filename,
        mimeType: params.mimeType,
        caption: params.caption,
      }),
    });
    return { success: true, messageId: result?.key?.id || null, to: params.to };
  }

  // WhatsApp Business API
  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }

  const body: unknown = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber(params.to),
    type: params.mediaType,
  };

  if (params.mediaType === "document") {
    body.document = {
      link: params.mediaUrl,
      filename: params.filename || "document",
      caption: params.caption || undefined,
    };
  } else if (params.mediaType === "image") {
    body.image = {
      link: params.mediaUrl,
      caption: params.caption || undefined,
    };
  } else if (params.mediaType === "video") {
    body.video = {
      link: params.mediaUrl,
      caption: params.caption || undefined,
    };
  } else if (params.mediaType === "audio") {
    body.audio = {
      link: params.mediaUrl,
    };
  }

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
    content: params.caption || params.filename || `[${params.mediaType}]`,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      filename: params.filename,
      mimeType: params.mimeType,
      caption: params.caption,
    }),
  });

  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to,
  };
}

/**
 * Get sent messages history
 */
export async function getSentMessages(filters?: {
  channel?: "whatsapp" | "instagram";
  customerId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(messages.direction, "outbound")];

  if (filters?.channel) {
    conditions.push(eq(messages.channel, filters.channel));
  }

  if (filters?.customerId) {
    conditions.push(eq(messages.customerId, filters.customerId));
  }

  let query = db
    .select()
    .from(messages)
    .where(and(...conditions));

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}
