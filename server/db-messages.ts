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
    console.log(
      "[Media Download] Starting download:",
      mediaUrl.substring(0, 100) + "..."
    );

    // If already data URL, return as-is
    if (mediaUrl.startsWith("data:")) {
      console.log("[Media Download] Already base64 data URL");
      return mediaUrl;
    }

    // WhatsApp URLs expire quickly - download immediately with retry
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Media Download] Attempt ${attempt}/2...`);

        const response = await fetch(mediaUrl, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          console.warn(
            `[Media Download] Attempt ${attempt} failed:`,
            response.status,
            response.statusText
          );
          throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Check if we got actual data
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

        // Guess from URL if still unknown
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

        const dataUrl = `data:${contentType};base64,${base64}`;
        console.log(
          "[Media Download] Success! Size:",
          Math.round(buffer.length / 1024),
          "KB, Type:",
          contentType
        );

        return dataUrl;
      } catch (attemptError) {
        lastError = attemptError as Error;
        console.warn(
          `[Media Download] Attempt ${attempt} error:`,
          lastError.message
        );

        if (attempt < 2) {
          // Wait before retry (shorter delay)
          const delay = 500;
          console.log(`[Media Download] Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    // All attempts failed
    console.error("[Media Download] All attempts failed:", lastError?.message);
    return null;
  } catch (error) {
    console.error("[Media Download] Fatal error:", error);
    return null;
  }
}
async function pickLeastLoadedOnlineAgent(params: {
  provider: "whatsapp" | "instagram";
}) {
  const db = await getDb();
  if (!db) return null;

  // Prefer agents with an active SSE connection (actually online in the UI)
  const connected = sseManager
    .getConnectedUsers()
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);

  if (connected.length > 0) {
    const rows = (await db.execute(sql`
      SELECT 
        u.id AS userId,
        COUNT(c.id) AS loadCount,
        MAX(u.last_signed_in) AS lastSignedIn
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
      if (!Number.isFinite(chosenId) || chosenId <= 0) return null;
      return {
        userId: chosenId,
        candidates: rows.length,
        minLoad,
        source: "sse",
      };
    }
  }

  const rows = (await db.execute(sql`
    SELECT 
      a.user_id AS userId,
      COUNT(c.id) AS loadCount,
      MAX(a.last_activity) AS lastActivity
    FROM agent_status a
    INNER JOIN users u ON u.id = a.user_id
    LEFT JOIN agent_pauses p
      ON p.agent_id = a.user_id AND p.status = 'active'
    LEFT JOIN conversations c
      ON c.assigned_to = a.user_id
     AND c.status IN ('open','assigned')
     AND c.channel = a.channel
    WHERE a.channel = ${params.provider}
      AND a.status = 'online'
      AND u.role = 'user'
      AND p.id IS NULL
    GROUP BY a.user_id
    ORDER BY loadCount ASC, lastActivity DESC
  `)) as any[];

  if (Array.isArray(rows) && rows.length > 0) {
    const minLoad = Number(rows[0]?.loadCount ?? 0);
    const minRows = rows.filter(r => Number(r.loadCount ?? 0) === minLoad);
    const chosenId = Number(minRows[0]?.userId);
    if (!Number.isFinite(chosenId) || chosenId <= 0) return null;

    return {
      userId: chosenId,
      candidates: rows.length,
      minLoad,
      source: "agent_status",
    };
  }

  // Final fallback: distribute across all users (admin or user role) even if status is not set
  const anyRows = (await db.execute(sql`
    SELECT 
      u.id AS userId,
      u.role AS role,
      COUNT(c.id) AS loadCount,
      MAX(u.last_signed_in) AS lastSignedIn
    FROM users u
    LEFT JOIN agent_pauses p
      ON p.agent_id = u.id AND p.status = 'active'
    LEFT JOIN conversations c
      ON c.assigned_to = u.id
     AND c.status IN ('open','assigned')
     AND c.channel = ${params.provider}
    WHERE (u.role = 'user' OR u.role = 'admin')
      AND p.id IS NULL
    GROUP BY u.id
    ORDER BY loadCount ASC, lastSignedIn DESC
    LIMIT 1
  `)) as any[];

  if (!Array.isArray(anyRows) || anyRows.length === 0) return null;
  const chosenId = Number(anyRows[0]?.userId);
  if (!Number.isFinite(chosenId) || chosenId <= 0) return null;
  return {
    userId: chosenId,
    candidates: 1,
    minLoad: Number(anyRows[0]?.loadCount ?? 0),
    source: "any_user",
  };
}

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
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function findOrCreateCustomerByPhone(
  phone: string,
  name?: string,
  photoUrl?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedPhone = normalizePhone(phone);

  // Try to find existing customer
  const existing = await db
    .select()
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

  // Create new customer
  const result = await db.insert(customers).values({
    name: name || `Cliente ${phone}`,
    phone: normalizedPhone,
    photoUrl: photoUrl || null,
    status: "active",
  });

  // Get the newly created customer
  const newCustomer = await db
    .select()
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
  console.log(
    "[ingestInbound] Step A: Starting with fromNumber:",
    message.fromNumber
  );
  console.error("[ingestInbound] === STEP A START ===");
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] Database not available!");
    return null;
  }
  console.log("[ingestInbound] Step B: DB connected");

  const customer = await findOrCreateCustomerByPhone(
    message.fromNumber,
    message.fromName || undefined
  );
  console.log(
    "[ingestInbound] Step C: Customer created/found:",
    customer?.id,
    customer?.name
  );
  const now = message.createdAt ?? new Date();

  // Equal-load distribution: pick the least loaded online agent (not paused)
  console.error("[ingestInbound] === STEP D START - picking agent ===");
  let picked = await pickLeastLoadedOnlineAgent({
    provider: message.provider,
  });
  console.log("[ingestInbound] Step D: Picked agent:", picked);

  // NO FALLBACK: If no agent found, leave conversation in queue (open/unassigned)
  // This ensures equal distribution - only assign when agent is actually online
  if (!picked) {
    console.log(
      "[ingestInbound] Step D2: No agent online - conversation stays in queue"
    );
  }

  const assignedUserId =
    picked && Number.isFinite(picked.userId) && picked.userId > 0
      ? picked.userId
      : null;

  console.log("[ingestInbound] Step D4: Final assignedUserId:", assignedUserId);

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
  console.log(
    "[ingestInbound] Step E: Existing conversation?",
    existingConversation?.id,
    "status:",
    existingConversation?.status
  );

  if (!conversationId) {
    console.log(
      "[ingestInbound] Step F: Creating NEW conversation for customer:",
      customer.id
    );
    const insertData = {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: message.provider,
      status: (assignedUserId ? "assigned" : "open") as
        | "open"
        | "assigned"
        | "closed",
      assignedTo: assignedUserId,
      queueId: assignedUserId ? null : (defaultQueue?.id ?? null),
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 1,
    };
    console.log(
      "[ingestInbound] Step G: Insert data:",
      JSON.stringify(insertData)
    );

    await db.insert(conversations).values(insertData);
    console.log(
      "[ingestInbound] Step G2: Insert done, fetching new conversation"
    );

    const [newConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerId, customer.id))
      .orderBy(desc(conversations.id))
      .limit(1);

    conversationId = newConversation?.id;
    console.log(
      "[ingestInbound] Step H: Conversation created with ID:",
      conversationId
    );
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

  // Download media immediately if present (URLs from WhatsApp expire quickly!)
  let fileUrlToSave = message.mediaUrl || null;
  if (fileUrlToSave && message.messageType !== "text") {
    console.log("[ingestInbound] Downloading media file...");
    const base64Url = await downloadMediaAsBase64(
      fileUrlToSave,
      message.mimeType ?? null
    );
    if (base64Url) {
      fileUrlToSave = base64Url;
      console.log("[ingestInbound] Media converted to base64 successfully");
    } else {
      console.warn(
        "[ingestInbound] Failed to download media, keeping original URL"
      );
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
  }

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
