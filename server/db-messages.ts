import { getDb } from "./db";
import {
  receivedMessages,
  customers,
  conversations,
  conversationMessages,
  agentStatus,
  agentPauses,
  queues,
  users,
} from "../drizzle/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { sseManager, EVENTS } from "./_core/sse";
import { fetchEvolutionProfile } from "./messaging";

/**
 * Download media from URL and convert to base64 Data URL
 * This ensures the file persists even after the temporary WhatsApp/Meta URL expires
 */
/**
 * Download media from URL and convert to base64 Data URL
 * Enhanced version with proper headers and redirect handling
 */
async function downloadMediaAsBase64(
  mediaUrl: string,
  mimeType: string | null
): Promise<string | null> {
  try {
    // If already data URL, return as-is
    if (mediaUrl.startsWith("data:")) {
      return mediaUrl;
    }

    // WhatsApp URLs expire quickly - download immediately
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(mediaUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error("Empty response");
        }

        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        // Determine content type
        let contentType = mimeType || "application/octet-stream";
        const headerCt = response.headers.get("content-type");
        if (headerCt) {
          contentType = headerCt.split(";")[0];
        }
        if (contentType === "application/octet-stream") {
          const ext = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase();
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
            pdf: "application/pdf",
            mp4: "video/mp4",
            mp3: "audio/mpeg",
            ogg: "audio/ogg",
            webm: "video/webm",
          };
          if (ext && mimeMap[ext]) {
            contentType = mimeMap[ext];
          }
        }

        // Detect MIME type from magic bytes
        if (buffer.length >= 4) {
          const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
          const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
          const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                          buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

          if (isJpeg) contentType = "image/jpeg";
          else if (isPng) contentType = "image/png";
          else if (isGif) contentType = "image/gif";
          else if (isPdf) contentType = "application/pdf";
          else if (isWebp) contentType = "image/webp";
        }

        return `data:${contentType};base64,${base64}`;
      } catch (attemptError) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Cache para evitar queries repetitivas de agent assignment
const agentAssignmentCache = new Map<string, { agentId: number | null; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

async function pickLeastLoadedOnlineAgent(params: {
  provider: "whatsapp" | "instagram";
}) {
  const db = await getDb();
  if (!db) return null;

  // Check cache first
  const cacheKey = params.provider;
  const cached = agentAssignmentCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.agentId ? { userId: cached.agentId, loadCount: 0, lastSignedIn: null } : null;
  }

  // Prefer agents with an active SSE connection (actually online in the UI)
  const connected = sseManager
    .getConnectedUsers()
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);

  if (connected.length === 0) {
    // Cache the null result too
    agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
    return null;
  }

  if (connected.length > 0) {
    const rows = (await db.execute(sql`
      SELECT 
        u.id AS userId,
        COUNT(c.id) AS loadCount,
        MAX(u.lastSignedIn) AS lastSignedIn
      FROM users u
      LEFT JOIN agent_pauses p
        ON p.agent_id = u.id AND p.status = 'active'
      LEFT JOIN conversations c
        ON c.assigned_to = u.id
       AND c.status IN ('open','assigned')
       AND c.channel = ${params.provider}
      WHERE u.role = 'user'
        AND u.id IN (${sql.join(
          connected.map(id => sql`${id}`),
          sql`, `
        )})
        AND p.id IS NULL
      GROUP BY u.id
      ORDER BY loadCount ASC, lastSignedIn DESC
    `)) as any[];

    if (Array.isArray(rows) && rows.length > 0) {
      const minLoad = Number(rows[0]?.loadCount ?? 0);
      const minRows = rows.filter(r => Number(r.loadCount ?? 0) === minLoad);
      const chosenId = Number(minRows[0]?.userId);
      if (!Number.isFinite(chosenId) || chosenId <= 0) {
        agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
        return null;
      }
      // Cache the result
      agentAssignmentCache.set(cacheKey, { agentId: chosenId, timestamp: Date.now() });
      return {
        userId: chosenId,
        candidates: rows.length,
        minLoad,
        source: "sse",
      };
    }
  }

  // No connected agents - cache null result
  agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
  return null;
}

// ========================================
// INGESTION FUNCTIONS
// ========================================

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
export async function getReceivedMessageByExternalId(
  externalId: string,
  provider: "whatsapp" | "instagram"
) {
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
export async function markMessageAsProcessed(
  id: number,
  updates?: {
    customerId?: number;
    ticketId?: number;
    automationFlowId?: number;
  }
) {
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
function normalizePhone(value: string) {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;

  // Handle WhatsApp IDs that are too long - extract just the phone number
  // WhatsApp IDs can be like: 55120363423395306073@c.us
  let phone = digits;

  // If it's a WhatsApp-style ID (very long number), extract just the phone part
  if (digits.length >= 20) {
    // Try to extract phone from WhatsApp ID format: 5511XXXXXXXXX@c.us -> 5511XXXXXXXXX
    const atIndex = value.indexOf("@");
    if (atIndex > 0) {
      const cleanNumber = value.substring(0, atIndex).replace(/\D/g, "");
      if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
        phone = cleanNumber;
      }
    }
    // If still too long, just use the last 15 digits (typical phone)
    if (phone.length > 15) {
      phone = phone.slice(-15);
    }
  }

  return phone.startsWith("+") ? phone : `+${phone}`;
}

export async function findOrCreateCustomerByPhone(
  phone: string,
  name?: string,
  photoUrl?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedPhone = normalizePhone(phone);

  // Selecionar apenas colunas que existem no banco (evitar erro de colunas faltantes)
  const existing = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      status: customers.status,
      photoUrl: customers.photoUrl,
    })
    .from(customers)
    .where(eq(customers.phone, normalizedPhone))
    .limit(1);

  if (existing.length > 0) {
    const updates: Record<string, unknown> = {};
    if (name && existing[0].name !== name) {
      updates.name = name;
    }
    if (photoUrl && existing[0].photoUrl !== photoUrl) {
      updates.photoUrl = photoUrl;
    }
    if (Object.keys(updates).length > 0) {
      await db
        .update(customers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(customers.id, existing[0].id));
    }
    return existing[0];
  }

  // Create new customer - apenas campos essenciais
  const result = await db.insert(customers).values({
    name: name || `Cliente ${phone}`,
    phone: normalizedPhone,
    photoUrl: photoUrl || null,
    status: "active",
  });

  // Get the newly created customer
  const newCustomer = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      status: customers.status,
      photoUrl: customers.photoUrl,
    })
    .from(customers)
    .where(eq(customers.phone, normalizedPhone))
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
  try {
    const db = await getDb();
    if (!db) {
      console.error("[ingestInbound] Database not available!");
      return null;
    }

    // Process message first - don't block on profile picture fetch
    const customer = await findOrCreateCustomerByPhone(
      message.fromNumber,
      message.fromName || undefined
    );
  
  // Fetch profile picture in background (non-blocking)
  if (message.provider === "whatsapp" && !customer?.photoUrl) {
    setImmediate(async () => {
      try {
        const profile = await fetchEvolutionProfile(message.fromNumber);
        if (profile?.profilePicture) {
          const db = await getDb();
          if (db && customer?.id) {
            await db
              .update(customers)
              .set({ photoUrl: profile.profilePicture, updatedAt: new Date() })
              .where(eq(customers.id, customer.id));
          }
        }
      } catch (err) {
        // Silently fail - photo is not critical
      }
    });
  }
  
  const now = message.createdAt ?? new Date();

  // Equal-load distribution: pick the least loaded online agent
  let picked = await pickLeastLoadedOnlineAgent({
    provider: message.provider,
  });

  // NO FALLBACK: If no agent found, leave conversation in queue (open/unassigned)
  const assignedUserId =
    picked && Number.isFinite(picked.userId) && picked.userId > 0
      ? picked.userId
      : null;

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
    // Create new conversation
    await db.insert(conversations).values({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: message.provider,
      status: assignedUserId ? "assigned" : "open",
      assignedTo: assignedUserId,
      queueId: assignedUserId ? null : (defaultQueue?.id ?? null),
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 1,
    });

    const [newConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerId, customer.id))
      .orderBy(desc(conversations.id))
      .limit(1);

    conversationId = newConversation?.id;
  } else {
    // Update existing conversation
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

  // Download media if present (URLs expire quickly)
  let fileUrlToSave = message.mediaUrl || null;
  if (fileUrlToSave && message.messageType !== "text") {
    const base64Url = await downloadMediaAsBase64(
      fileUrlToSave,
      message.mimeType ?? null
    );
    if (base64Url) {
      fileUrlToSave = base64Url;
    }
  }
  
  await db.insert(conversationMessages).values({
    conversationId,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: fileUrlToSave,
    fileName: null,
    fileType: message.mimeType || null,
    fileSize: null,
    createdAt: now,
  });

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  // Notify via SSE - notificar todos os agentes conectados
  // Se tiver agente atribuído, notifica ele. Se não, notifica todos.
  if (conversation?.assignedTo) {
    sseManager.emitToUser(String(conversation.assignedTo), {
      type: EVENTS.MESSAGE_NEW,
      data: {
        conversationId,
        customerName: customer.name,
        customerPhone: customer.phone,
        content: buildInboundContent(message),
        channel: message.provider,
      },
      timestamp: now.getTime(),
    });
  } else {
    // Conversa na fila - notificar todos os agentes conectados
    sseManager.emitToAll({
      type: EVENTS.MESSAGE_NEW,
      data: {
        conversationId,
        customerName: customer.name,
        customerPhone: customer.phone,
        content: buildInboundContent(message),
        channel: message.provider,
      },
      timestamp: now.getTime(),
    });
  }

  return { conversationId, customerId: customer.id };
  } catch (error) {
    console.error("[ingestInbound] ERROR:", error);
    return { conversationId: null, customerId: null };
  }
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
  if (!db)
    return {
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
