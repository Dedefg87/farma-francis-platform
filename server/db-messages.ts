import { getDb } from "./db";
import { receivedMessages, customers, conversations, conversationMessages, agentStatus, queues, users } from "../drizzle/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";

/**
 * Get all received messages with optional filters
 */
export async function getReceivedMessages(filters?: {
  provider?: "whatsapp" | "instagram";
  processed?: boolean;
  customerId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(receivedMessages);

  const conditions = [];
  if (filters?.provider) {
    conditions.push(eq(receivedMessages.provider, filters.provider));
  }
  if (filters?.processed !== undefined) {
    conditions.push(eq(receivedMessages.processed, filters.processed ? 1 : 0));
  }
  if (filters?.customerId) {
    conditions.push(eq(receivedMessages.customerId, filters.customerId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(receivedMessages.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

/**
 * Get a single received message by ID
 */
export async function getReceivedMessageById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(receivedMessages)
    .where(eq(receivedMessages.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a received message by external ID (from provider)
 */
export async function getReceivedMessageByExternalId(externalId: string, provider: "whatsapp" | "instagram") {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(receivedMessages)
    .where(
      and(
        eq(receivedMessages.externalId, externalId),
        eq(receivedMessages.provider, provider)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Mark a message as processed
 */
export async function markMessageAsProcessed(id: number, updates?: {
  customerId?: number;
  ticketId?: number;
  automationFlowId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(receivedMessages)
    .set({
      processed: 1,
      processedAt: new Date(),
      ...updates,
    })
    .where(eq(receivedMessages.id, id));

  return await getReceivedMessageById(id);
}

/**
 * Get conversation history for a phone number/user ID
 */
export async function getConversationHistory(
  fromNumber: string,
  provider: "whatsapp" | "instagram",
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(receivedMessages)
    .where(
      and(
        eq(receivedMessages.fromNumber, fromNumber),
        eq(receivedMessages.provider, provider)
      )
    )
    .orderBy(desc(receivedMessages.timestamp))
    .limit(limit);
}

/**
 * Find or create customer by phone number
 */
export async function findOrCreateCustomerByPhone(phone: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing customer
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new customer
  const result = await db.insert(customers).values({
    name: name || `Cliente ${phone}`,
    phone,
    status: "active",
  });

  // Get the newly created customer
  const newCustomer = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  return newCustomer[0];
}

function buildInboundContent(message: {
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
}) {
  if (message.messageText?.trim()) return message.messageText;
  if (message.caption?.trim()) return message.caption;

  switch (message.messageType) {
    case "image":
      return "[Imagem]";
    case "audio":
      return "[Audio]";
    case "video":
      return "[Video]";
    case "document":
      return "[Documento]";
    case "location":
      return "[Localizacao]";
    case "sticker":
      return "[Sticker]";
    case "reaction":
      return "[Reacao]";
    case "contact":
      return "[Contato]";
    default:
      return "[Mensagem]";
  }
}

export async function ingestInboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  fromNumber: string;
  fromName?: string | null;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  createdAt?: Date;
}) {
  const db = await getDb();
  if (!db) return null;

  const customer = await findOrCreateCustomerByPhone(message.fromNumber, message.fromName || undefined);
  const now = message.createdAt ?? new Date();

  const [onlineAgent] = await db
    .select()
    .from(agentStatus)
    .where(
      and(
        eq(agentStatus.channel, message.provider),
        eq(agentStatus.status, "online")
      )
    )
    .orderBy(desc(agentStatus.lastActivity))
    .limit(1);

  const [fallbackAgent] = await db
    .select()
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(desc(users.lastSignedIn))
    .limit(1);

  const assignedUserId = onlineAgent?.userId ?? fallbackAgent?.id ?? null;

  const [defaultQueue] = await db
    .select()
    .from(queues)
    .where(eq(queues.status, "active"))
    .orderBy(desc(queues.priority))
    .limit(1);

  const [existingConversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.customerId, customer.id),
        eq(conversations.channel, message.provider),
        or(
          eq(conversations.status, "open"),
          eq(conversations.status, "assigned")
        )
      )
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);

  let conversationId = existingConversation?.id;

  if (!conversationId) {
    const [newConversation] = await db
      .insert(conversations)
      .values({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        channel: message.provider,
        status: assignedUserId ? "assigned" : "open",
        assignedTo: assignedUserId,
        queueId: assignedUserId ? null : defaultQueue?.id ?? null,
        openedAt: now,
        lastMessageAt: now,
        unreadCount: 1,
      })
      .$returningId();
    conversationId = newConversation.id;
  } else {
    const shouldAssign = !existingConversation?.assignedTo && assignedUserId;
    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        unreadCount: sql<number>`unread_count + 1`,
        ...(shouldAssign
          ? {
              assignedTo: assignedUserId,
              status: "assigned",
              queueId: null,
            }
          : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  await db.insert(conversationMessages).values({
    conversationId,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: message.mediaUrl || null,
    fileName: null,
    fileType: message.mimeType || null,
    fileSize: null,
    createdAt: now,
  });

  return { conversationId, customerId: customer.id };
}

/**
 * Get statistics about received messages
 */
export async function getMessageStatistics(filters?: {
  provider?: "whatsapp" | "instagram";
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return {
    total: 0,
    processed: 0,
    pending: 0,
    byType: {},
    byProvider: {},
  };

  const conditions = [];
  if (filters?.provider) {
    conditions.push(eq(receivedMessages.provider, filters.provider));
  }

  let query = db.select().from(receivedMessages);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const messages = await query;

  const stats = {
    total: messages.length,
    processed: messages.filter(m => m.processed === 1).length,
    pending: messages.filter(m => m.processed === 0).length,
    byType: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
  };

  messages.forEach(msg => {
    stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
    stats.byProvider[msg.provider] = (stats.byProvider[msg.provider] || 0) + 1;
  });

  return stats;
}
