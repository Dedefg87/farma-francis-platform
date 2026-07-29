import { getDb } from "./db";
import {
  customers,
  conversations,
  conversationMessages,
} from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { 
  findOrCreateCustomerByPhone 
} from "./db-messages";
import { findConversationByPhone } from "./utils/phone";

/**
 * Build content for outbound message
 */
function buildOutboundContent(message: {
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
}): string {
  if (message.messageText?.trim()) return message.messageText;
  if (message.caption?.trim()) return message.caption;

  switch (message.messageType) {
    case "image":
      return "[Imagem]";
    case "audio":
      return "[Áudio]";
    case "video":
      return "[Vídeo]";
    case "document":
      return "[Documento]";
    case "sticker":
      return "";
    case "location":
      return "[Localização]";
    case "contact":
      return "[Contato]";
    default:
      return `[${message.messageType}]`;
  }
}

// ==============================================
// Ingest outbound conversation message (WhatsApp/Instagram)
// ==============================================
export async function ingestOutboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  toNumber: string;
  fromUserId: number; // ID do agente que enviou
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
}) {
  console.log("[ingestOutbound] Starting for message to", message.toNumber, "type:", message.messageType);

  const db = await getDb();
  if (!db) {
    console.error("[ingestOutbound] Database not available!");
    return null;
  }

  // 1. Find or create customer
  const customer = await findOrCreateCustomerByPhone(
    message.toNumber,
    undefined,
    null
  );

  if (!customer) {
    console.error("[ingestOutbound] Customer not found for:", message.toNumber);
    return null;
  }

  // 2. Find existing conversation or create new one
  const found = await findConversationByPhone(db, customer.phone, conversations, customers);

  let conversationId: number;
  if (found?.conversationId) {
    conversationId = found.conversationId;
  } else {
    // Create new conversation
    const [newConv] = await db.insert(conversations).values({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: message.provider,
      status: "open",
      assignedTo: message.fromUserId,
      openedAt: message.createdAt || new Date(),
      lastMessageAt: message.createdAt || new Date(),
      unreadCount: 0,
    });
    conversationId = newConv.id;
  }

  // 3. Build message content
  const content = buildOutboundContent({
    messageType: message.messageType,
    messageText: message.messageText,
    caption: message.caption,
  });

  // 4. Insert message into conversation_messages
  const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: (message.externalId || message.key?.id) ?? null,
    senderId: message.fromUserId,
    senderType: "agent",
    content,
    fileUrl: message.mediaUrl || null,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    createdAt: message.createdAt || new Date(),
  });
  
  // LOG para depurar problemas com externalId (obrigatório para investigação)
  console.log("[DB-INSERT] externalId gravado (insertion):", message.externalId ? "PRESENTE - " + message.externalId : "NULL (erro)");

  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || undefined;

  console.log("[ingestOutbound] ✅ Message ingested successfully:", {
    conversationId,
    messageDbId,
    content: content.substring(0, 50),
  });

  // 5. Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: message.createdAt || new Date() })
    .where(eq(conversations.id, conversationId));

  return { conversationId, customerId: customer.id, messageDbId };
}