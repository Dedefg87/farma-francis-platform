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
    case "reaction":
      return message.reaction ? `Reação: ${message.reaction}` : `[Reação]`;
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
  reaction?: string | null; // Emoji de reação
  replyToMessageId?: string | null; // Mensagem respondida
  replyToExternalId?: string | null; // externalId da mensagem respondida
  replyToContent?: string | null; // Conteudo da mensagem respondida
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

  // 4a. Guarda de idempotencia: nao inserir a mesma mensagem duas vezes
  const _outboundExtId = (message.externalId || (message as any).key?.id) ?? null;
  if (_outboundExtId) {
    const _existingOut = await db
      .select({ id: conversationMessages.id })
      .from(conversationMessages)
      .where(and(eq(conversationMessages.externalId, _outboundExtId), eq(conversationMessages.provider, message.provider)))
      .limit(1);
    if (_existingOut.length > 0) {
      console.log("[ingestOutbound] Skipping duplicate outbound message:", _outboundExtId);
      return null;
    }
  }

  // 4c. Guarda: se for reação, NÃO insere nova mensagem (não é mensagem — é atualização de reação)
  // A reação é processada pelo endpoint /api/messages/react, não pelo ingestOutbound
  if (message.messageType === "reaction") {
    const reactionEmoji = message.reaction || message.emoji || message.content || "";
    if (_outboundExtId) {
      // Tenta encontrar mensagem pela externalId
      await db.update(conversationMessages)
        .set({ reaction: reactionEmoji })
        .where(and(
          eq(conversationMessages.externalId, _outboundExtId),
          eq(conversationMessages.provider, message.provider)
        ));
      console.log("[ingestOutbound] ✅ Reação atualizada via externalId:", _outboundExtId, "emoji:", reactionEmoji);
      return { conversationId, customerId: customer.id, messageDbId: undefined, reactionUpdated: true };
    }
    // Fallback: tenta encontrar pela externalId de reply (se reaction for resposta)
    if (message.replyToExternalId) {
      await db.update(conversationMessages)
        .set({ reaction: reactionEmoji })
        .where(and(
          eq(conversationMessages.externalId, message.replyToExternalId),
          eq(conversationMessages.provider, message.provider)
        ));
      console.log("[ingestOutbound] ✅ Reação atualizada via replyToExternalId:", message.replyToExternalId, "emoji:", reactionEmoji);
      return { conversationId, customerId: customer.id, messageDbId: undefined, reactionUpdated: true };
    }
    // Se for reação sem referência válida, não faz nada (não cria mensagem vazia)
    console.log("[ingestOutbound] Ignorando reação sem referência válida:", message);
    return { conversationId, customerId: customer.id, messageDbId: undefined, skipped: "reaction_ignored" };
  }
  // 4d. Guarda: nao exibir no chat a mensagem de encerramento / pesquisa de satisfacao
  const _normOut = String(content || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (_normOut.indexOf("aperfeic") >= 0 && _normOut.indexOf("atendimento") >= 0) {
    console.log("[ingestOutbound] Ignorando mensagem de encerramento/pesquisa:", content.substring(0, 40));
    return null;
  }
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
    reaction: message.reaction || null,
    replyToMessageId: message.replyToMessageId || null,
      replyToExternalId: message.replyToExternalId || null,
      replyToContent: message.replyToContent || null,
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