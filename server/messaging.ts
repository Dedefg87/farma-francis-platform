import { getDb } from "./db";
import { integrationSettings, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

function normalizeWhatsAppNumber(value: string) {
  return value.replace(/\D/g, "");
}

async function getIntegrationConfig(type: "whatsapp_business" | "instagram_graph") {
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

  const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  return { configData, configId: config.id };
}

/**
 * Send a text message via WhatsApp Business API
 */
export async function sendWhatsAppMessage(params: {
  to: string; // Phone number in international format (e.g., +5511999999999)
  message: string;
  replyToMessageId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
  }

  // Prepare request body
  const body: any = {
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
        "Authorization": `Bearer ${token}`,
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
  });

  console.log(`[WhatsApp Send] Message sent to ${params.to}: ${result.messages[0].id}`);

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

  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
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
        "Authorization": `Bearer ${token}`,
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
    metadata: JSON.stringify({ imageUrl: params.imageUrl, caption: params.caption }),
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
      text: params.message,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
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

  console.log(`[Instagram Send] Message sent to ${params.to}: ${result.message_id}`);

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
        "Authorization": `Bearer ${token}`,
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

  let query = db.select().from(messages).where(and(...conditions));

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}
