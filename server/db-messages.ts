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
import { eq, desc, and, or, sql, like, inArray } from "drizzle-orm";
import { sseManager, EVENTS } from "./_core/sse";
import { fetchEvolutionProfile } from "./messaging";
import { normalizeWhatsAppNumber, generatePhoneVariants, formatPhoneBR } from "./utils/phone";

// Cache para evitar queries repetitivas de agent assignment
const agentAssignmentCache = new Map<string, { agentId: number | null; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

async function pickLeastLoadedOnlineAgent(params: {
  provider: "whatsapp" | "instagram";
}) {
  const db = await getDb();
  if (!db) return null;

  const cacheKey = params.provider;
  const cached = agentAssignmentCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.agentId ? { userId: cached.agentId, loadCount: 0, lastSignedIn: null } : null;
  }

  const connected = sseManager
    .getConnectedUsers()
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);

  if (connected.length === 0) {
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
      agentAssignmentCache.set(cacheKey, { agentId: chosenId, timestamp: Date.now() });
      return {
        userId: chosenId,
        candidates: rows.length,
        minLoad,
        source: "sse",
      };
    }
  }

  agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
  return null;
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

// Função removida — usar generatePhoneVariants de utils/phone.ts

export async function findOrCreateCustomerByPhone(
  phone: string,
  name?: string,
  photoUrl?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 🚨 PONTO CRÍTICO: Normalização estrita com formatPhoneBR
  // Esta função garante que TODOS os números no banco tenham o mesmo formato
  const normalizedPhone = formatPhoneBR(phone);

  if (normalizedPhone.length < 10) {
    throw new Error(`Número muito curto após normalização: ${phone} → ${normalizedPhone}`);
  }

  // Busca por qualquer variação que possa existir no banco (com/sem 9, com +, etc.)
  // Usa TODAS as 6 variações possíveis para evitar duplicação
  const searchVariants = generatePhoneVariants(phone);

  let existing = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      status: customers.status,
      photoUrl: customers.photoUrl,
    })
    .from(customers)
    .where(inArray(customers.phone, searchVariants))
    .limit(1);

  if (!existing || existing.length === 0) {
    const pushName = name;
    const finalName = (pushName && pushName.trim() !== '')
      ? pushName
      : `Cliente ${normalizedPhone.slice(-4)}`;

    const result = await db.insert(customers).values({
      name: finalName,
      phone: normalizedPhone, // Sempre salvo no formato normalizado
      photoUrl: photoUrl || null,
      status: "active",
    });

    const rawId = Array.isArray(result) ? result[0]?.insertId : result?.insertId || result?.lastInsertRowid;
    const newId = Number(rawId);

    if (!newId || isNaN(newId)) {
      throw new Error("Falha ao obter ID do cliente recém-criado");
    }

    existing = [{
      id: newId,
      name: finalName,
      email: null,
      phone: normalizedPhone,
      status: "active",
      photoUrl: photoUrl || null,
    } as any];
  }

  const customer = existing[0];

  // Se criamos agora ou encontramos existente, garantir que o nome/foto estejam atualizados
  if (name && customer.name !== name) {
    await db
      .update(customers)
      .set({ name, updatedAt: new Date() })
      .where(eq(customers.id, customer.id));
  }
  if (photoUrl && customer.photoUrl !== photoUrl) {
    await db
      .update(customers)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(customers.id, customer.id));
  }

  return customer;
}

function buildInboundContent(message: {
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  text?: string | null;
  extendedTextMessage?: { text?: string } | null;
}) {
  if (message.text?.trim()) return message.text;
  
  // PROBLEMA 2: extendedTextMessage (respostas a status)
  if (message.extendedTextMessage?.text?.trim()) {
    return message.extendedTextMessage.text;
  }

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
    case "stickerMessage":
      return "[Sticker]";
    case "extendedTextMessage":
      return "[Resposta a Status]";
    case "reaction":
      return "[Reacao]";
    case "contact":
      return "[Contato]";
    default:
      return "[Mensagem]";
  }
}

// ==============================================
// Ingest inbound conversation message (WhatsApp/Instagram)
// ==============================================
export async function ingestInboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  fromNumber: string;
  fromName?: string | null;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null;
  createdAt?: Date;
  fromMe?: boolean;
  remoteJid?: string;
  // Campos para extendedTextMessage
  extendedTextMessage?: { text?: string } | null;
  // Campos para sticker
  sticker?: any | null;
}) {
  console.log("[Ingest] Starting for message from", message.fromNumber, "type:", message.messageType, "fromMe:", message.fromMe);
  
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] ❌ Database not available!");
    return null;
  }

  try {
    // Determinar número do cliente e tipo do remetente (PROBLEMA 2)
    let customerPhoneNumber: string;
    let senderType: "agent" | "customer";
    let senderName: string | undefined;

    if (message.fromMe) {
      if (!message.remoteJid) {
        console.error("[Ingest] ❌ fromMe=true but remoteJid missing!");
        return null;
      }
      customerPhoneNumber = message.remoteJid;
      senderType = "agent";
      senderName = "Anderson"; // TODO: buscar nome dinamicamente
      console.log("[Ingest] 📱 fromMe=true - customer is remoteJid:", customerPhoneNumber);
    } else {
      customerPhoneNumber = message.fromNumber;
      senderType = "customer";
      senderName = message.fromName || undefined;
      console.log("[Ingest] 📥 fromMe=false - customer is fromNumber");
    }

    // Normalizar número (PROBLEMA 1)
    const normalizedPhone = normalizeWhatsAppNumber(customerPhoneNumber);
    console.log("[Ingest] Normalized phone:", normalizedPhone);

    // 0. IDEMPOTÊNCIA
    if (message.externalId) {
      console.log("[Ingest] Step 0: Checking idempotency for externalId:", message.externalId);
      const existing = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.externalId, message.externalId),
            eq(conversationMessages.provider, message.provider)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log("[Ingest] ⏭️ Duplicate detected, skipping.");
        return { conversationId: existing[0].conversationId, customerId: null };
      }
      console.log("[Ingest] ✅ New message, proceeding");
    }

    // 1. Find or create customer (USANDO NÚMERO NORMALIZADO)
    console.log("[Ingest] Step 1: findOrCreateCustomerByPhone");
    const customer = await findOrCreateCustomerByPhone(
      normalizedPhone,
      senderName
    );
    console.log("[Ingest] Customer:", { id: customer.id, name: customer.name, phone: customer.phone });

    // 2. Fetch profile picture (apenas para mensagens do cliente)
    if (message.provider === "whatsapp" && !customer?.photoUrl && !message.fromMe) {
      setImmediate(async () => {
        try {
          const profile = await fetchEvolutionProfile(normalizedPhone);
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
          // Silently fail
        }
      });
    }

    const now = message.createdAt ?? new Date();

    // 3. Pick least loaded online agent
    console.log("[Ingest] Step 3: pickLeastLoadedOnlineAgent");
    let picked = await pickLeastLoadedOnlineAgent({ provider: message.provider });
    let assignedUserId: number | null = null;
    
    if (senderType === "agent") {
      assignedUserId = 1;
    } else if (picked && Number.isFinite(picked.userId) && picked.userId > 0) {
      assignedUserId = picked.userId;
    }
    console.log("[Ingest] Agent pick result:", { picked: picked?.userId, assignedUserId });

    // 4. Get default queue
    console.log("[Ingest] Step 4: Get default queue");
    const [defaultQueue] = await db
      .select()
      .from(queues)
      .where(eq(queues.status, "active"))
      .orderBy(desc(queues.priority))
      .limit(1);
    console.log("[Ingest] Default queue:", defaultQueue?.id || "none");

    // 5. Find existing conversation (com busca por variações de número) - SQL CRU
    console.log("[Ingest] Step 5: Find existing conversation");
    // Usar generatePhoneVariants para gerar todas as variações de busca (6 variações)
    const phoneVariants = generatePhoneVariants(normalizedPhone);
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(
        sql`conversations.customer_id = ${customer.id} AND conversations.channel = ${message.provider} AND conversations.customer_phone IN (${sql.join(phoneVariants.map(v => sql`${v}`), sql`, `)})`
      )
      .limit(1);

    let conversationId: number;
    if (existingConversation) {
      conversationId = existingConversation.id;
      console.log("[Ingest] Found existing conversation:", conversationId);
    } else {
      console.log("[Ingest] Creating new conversation");
      const result = await db
        .insert(conversations)
        .values({
          customerId: customer.id,
          channel: message.provider,
          remoteJid: normalizedPhone,
          assignedTo: assignedUserId,
          status: "open",
          createdAt: now,
          updatedAt: now,
          queueId: defaultQueue?.id || null,
          lastMessageAt: now,
        });
      const newConvId = Array.isArray(result) ? result[0]?.insertId : result?.insertId ?? result?.lastInsertRowid;
      conversationId = newConvId;

      console.log("[Ingest] Created conversation:", conversationId);
    }

    // 6. Insert the message (COM senderType CORRETO)
    console.log("[Ingest] Step 6: Insert message");
    const content = buildInboundContent(message);
    const fileUrl = message.mediaUrl || null;
    const fileName = message.fileName || null;
    const fileType = message.mimeType || null;
    const fileSize = message.fileSize || null;

    const result = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        externalId: message.externalId || null,
        senderId: assignedUserId,
        senderType,
        content,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        provider: message.provider,
        remoteJid: normalizedPhone,
        createdAt: now,
        readAt: null,
      });

    // MySQL returns insertId in the result array
    const newMessageId = Array.isArray(result) ? result[0]?.insertId : result?.insertId ?? result?.lastInsertRowid;
    const newMessage = { id: newMessageId };

    console.log("[Ingest] ✅ Message inserted:", newMessage.id, "senderType:", senderType);

    // 7. Broadcast SSE event
    sseManager.emitToAdmins(EVENTS.NEW_MESSAGE, {
      messageId: newMessage.id,
      conversationId,
      senderType: "customer",
      content,
      fileUrl,
      fileName,
      fileType: insertMessage.mimeType,
      fileSize,
      fromMe: false,
      timestamp: now.toISOString(),
    });

    return { conversationId, customerId: customer.id };
  } catch (err) {
    console.error("[Ingest] ❌ Error:", err);
    throw err;
  }
}

export async function listReceivedMessages(filters?: {
  provider?: string;
}) {
  const db = await getDb();
  if (!db) return [];

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
