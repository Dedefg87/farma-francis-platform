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
  processedWebhookMessages,
  integrationSettings,
} from "../drizzle/schema";
import { eq, desc, and, or, sql, like, inArray, gte, lte } from "drizzle-orm";
import { sseManager, EVENTS } from "./_core/sse";
import { fetchEvolutionProfile } from "./messaging";
import { normalizeWhatsAppNumber, generatePhoneVariants, formatPhoneBR, findConversationByPhone } from "./utils/phone";

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

  // FALLBACK: If no agents are connected via SSE, find any active agent
  // This prevents conversations from being created without assignment
  // when SSE connections drop (Railway kills long connections)
  if (connected.length === 0) {
    console.log("[pickAgent] ⚠️ No agents online via SSE — using offline fallback");
    // NOTE: users table does NOT have is_active column
    // We check agent_pauses to exclude agents on break
    const offlineResult = await db.execute(sql`
      SELECT 
        u.id AS userId,
        COUNT(c.id) AS loadCount
      FROM users u
      LEFT JOIN agent_pauses p
        ON p.agent_id = u.id AND p.status = 'active'
      LEFT JOIN conversations c
        ON c.assigned_to = u.id
       AND c.status IN ('open','assigned')
      WHERE u.role IN ('user', 'admin')
        AND p.id IS NULL
      GROUP BY u.id
      ORDER BY loadCount ASC, u.id DESC
      LIMIT 1
    `);

    // drizzle execute returns [rows, fields] for mysql2
    const offlineRows = Array.isArray(offlineResult) ? offlineResult[0] : offlineResult;

    if (Array.isArray(offlineRows) && offlineRows.length > 0) {
      const fallbackId = Number(offlineRows[0]?.userId);
      if (Number.isFinite(fallbackId) && fallbackId > 0) {
        console.log("[pickAgent] 🔄 Offline fallback assigned to agent", fallbackId);
        agentAssignmentCache.set(cacheKey, { agentId: fallbackId, timestamp: Date.now() });
        return { userId: fallbackId, loadCount: Number(offlineRows[0]?.loadCount ?? 0), lastSignedIn: null };
      }
    }

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
      WHERE u.role IN ('user', 'admin')
        AND u.id IN (${sql.join(
          connected.map(id => sql`${id}`),
          sql`, `
        )})
        AND p.id IS NULL
      GROUP BY u.id
      ORDER BY loadCount ASC, u.id DESC
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
      return ""; // Sticker é renderizado como imagem no frontend
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
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
}) {
  console.log("[Ingest] Starting for message from", message.fromNumber, "type:", message.messageType);
  
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] Database not available!");
    return null;
  }

  // 0. Deduplicação: verificar se mensagem já foi processada
  if (message.externalId) {
    const existing = await db
      .select()
      .from(processedWebhookMessages)
      .where(eq(processedWebhookMessages.id, message.externalId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[Webhook] Duplicate message ignored: ${message.externalId}`);
      return null;
    }

    // Marcar como processada
    await db.insert(processedWebhookMessages).values({ id: message.externalId });
    console.log(`[Webhook] New message registered: ${message.externalId}`);
  }

  // 1. Find or create customer
  const customer = await findOrCreateCustomerByPhone(
    message.fromNumber,
    message.fromName || undefined
  );

  // 2. Fetch profile picture in background (non-blocking)
  // Download from WhatsApp CDN (proxied via Evolution API) and upload to R2.
  // Re-download if missing OR if the stored URL is a (now-expired) WhatsApp CDN link.
  const isExpiredCdn =
    !!customer?.photoUrl &&
    (customer.photoUrl.includes('whatsapp.net') ||
      customer.photoUrl.includes('whatsapp.com'));
  if (message.provider === "whatsapp" && customer?.id && (!customer?.photoUrl || isExpiredCdn)) {
    setImmediate(async () => {
      try {
        const { downloadAndUploadProfilePic } = await import('./services/profile-pic.js');
        await downloadAndUploadProfilePic(message.fromNumber, customer.id);
      } catch (err) {
        // Silently fail - photo is not critical
      }
    });
  }

  // 2b. CRITICAL: link received_messages to the customer so getConversations
  // LEFT JOIN (customers.id = receivedMessages.customerId) and the profile-pic
  // update resolve correctly. Without this, photos never show in the inbox.
  if (customer?.id) {
    await db
      .update(receivedMessages)
      .set({ customerId: customer.id })
      .where(
        and(
          eq(receivedMessages.fromNumber, message.fromNumber),
          eq(receivedMessages.provider, message.provider)
        )
      );
  }

  const now = message.createdAt ?? new Date();

  // 3. Pick least loaded online agent
  let picked = await pickLeastLoadedOnlineAgent({ provider: message.provider });
  const assignedUserId = picked && Number.isFinite(picked.userId) && picked.userId > 0
    ? picked.userId
    : null;

  console.log("[ingestInbound] 🎯 Agent pick result:", { picked: picked?.userId, assignedUserId, customerPhone: customer.phone });

  // 4. Get default queue
  const [defaultQueue] = await db
    .select()
    .from(queues)
    .where(eq(queues.status, "active"))
    .orderBy(desc(queues.priority))
    .limit(1);

  // 5. Find existing conversation by PHONE (últimos 8 dígitos)
  // Resolve problema de clientes duplicados com formatos diferentes de telefone
  const found = await findConversationByPhone(db, customer.phone, conversations, customers);

  let conversationId = found?.conversationId;
  let existingConversation: unknown = null;

  if (conversationId) {
    [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    conversationId = existingConversation?.id;
  }

  // Se a conversa encontrada pertence a outro customerId, usar o correto
  if (existingConversation && existingConversation.customerId !== customer.id) {
    // Usar o customer da conversa existente (para manter consistência)
    console.log(`[ingestInbound] 🔄 Customer ID ajustado: ${customer.id} → ${existingConversation.customerId} (mesmo telefone)`);
  }

  // 6. Create or update conversation
  if (!conversationId) {
    // Create new conversation
    await db.insert(conversations).values({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: message.provider || "whatsapp", // fallback para whatsapp se undefined
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
    // Update existing conversation (ou reabrir conversa fechada)
    const isReopening = existingConversation?.status === "closed";
    const shouldAssign = !existingConversation?.assignedTo && assignedUserId;
    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        unreadCount: isReopening ? 1 : sql<number>`unread_count + 1`,
        // Reabrir conversa fechada
        ...(isReopening
          ? {
              status: assignedUserId ? "assigned" : "open",
              assignedTo: assignedUserId ?? null,
              queueId: assignedUserId ? null : (defaultQueue?.id ?? null),
              closedAt: null,
              closeReason: null,
            }
          : {}),
        // Atribuir agente se não tinha
        ...(shouldAssign && !isReopening
          ? {
              assignedTo: assignedUserId,
              status: "assigned",
              queueId: null,
            }
          : {}),
      })
      .where(eq(conversations.id, conversationId));
  }

  // 7. ECONOMIA DE ESPAÇO: salvar apenas URL original (não baixar como base64)
  // O endpoint /api/media/:id fará fetch da Evolution API quando necessário
  const fileUrlToSave = message.mediaUrl || null;

  // 8. Insert conversation message — guard contra duplicata por externalId
  let duplicateCheck;
  if (message.externalId) {
    duplicateCheck = and(
      eq(conversationMessages.externalId, message.externalId),
      eq(conversationMessages.senderType, "customer")
    );
  } else {
    // Fallback: mensagens sem externalId (raro) — verificar por conteúdo + timestamp within 5s
    const timeWindowMs = 5000;
    const now = new Date();
    duplicateCheck = and(
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.senderType, "customer"),
      eq(conversationMessages.content, message.messageText || message.caption || ""),
      gte(conversationMessages.createdAt, new Date(now.getTime() - timeWindowMs)),
      lte(conversationMessages.createdAt, new Date(now.getTime() + timeWindowMs))
    );
  }

  const [already] = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(duplicateCheck)
    .limit(1);
  if (already) {
    console.log(`[EvolutionDeduplication] Mensagem já processada, ignorando: ${message.externalId || 'sem externalId'}`);
    return null;
  }

  console.log(`[EvolutionDeduplication] Nova mensagem, processando: ${message.externalId || 'sem externalId'}`);

  const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: (message.key?.id as string) ?? null,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message),
    fileUrl: fileUrlToSave,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    createdAt: now,
  });

  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || undefined;

  // 9. If it's a WhatsApp media message, trigger Evolution download to upload to R2
  // Covers: images with WhatsApp CDN URLs AND stickers/media with only mediaId (no URL)
  const needsR2Upload =
    message.provider === "whatsapp" &&
    message.externalId &&
    (
      // Case 1: has WhatsApp CDN URL
      (fileUrlToSave?.includes("mmg.whatsapp.net") || fileUrlToSave?.includes("pps.whatsapp.net")) ||
      // Case 2: has media but no URL (stickers, etc.) — mediaId or mimeType indicates media
      (!fileUrlToSave && (message.mediaId || ["sticker", "stickerMessage", "image", "audio", "video", "document"].includes(message.messageType || "")))
    );

  if (needsR2Upload) {
    try {
      console.log("[S3] Triggering Evolution download for R2 upload, messageId:", message.externalId);
      
      const [configRecord] = await db
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, "evolution_api"))
        .limit(1);
      
      if (configRecord?.config) {
        const configData = typeof configRecord.config === "string"
          ? JSON.parse(configRecord.config as string)
          : configRecord.config;
        const apiUrl = (configData.apiUrl as string)?.replace(/\/$/, "");
        const apiKey = (configData.apiKey as string) || (configData.accessToken as string);
        const instanceName = configData.instanceName as string;

        if (apiUrl && apiKey && instanceName) {
          const downloadUrl = `${apiUrl}/message/download/${instanceName}/${message.externalId}`;
          console.log("[S3] Calling Evolution download endpoint:", downloadUrl);
          
          const response = await fetch(downloadUrl, {
            headers: {
              "apikey": apiKey,
            },
            signal: AbortSignal.timeout(15000),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("[S3] Download response:", data);
            
            const r2Url = data?.url || data?.mediaUrl || null;
            if (r2Url && r2Url.includes("r2.dev")) {
              console.log("[S3] ✅ Got R2 URL, updating message:", r2Url);
              
              await db
                .update(conversationMessages)
                .set({ fileUrl: r2Url })
                .where(eq(conversationMessages.id, messageDbId));
              
              console.log("[S3] Message updated with R2 URL");
            }
          } else {
            console.log("[S3] ❌ Download failed:", response.status, response.statusText);
          }
        }
      }
    } catch (error) {
      console.log("[S3] Error during R2 upload:", error);
      // Non-critical - message still saved with original URL
    }
  }

  console.log("[Ingest] ✅ Message ingested successfully:", {
    conversationId,
    messageDbId,
    content: buildInboundContent(message).substring(0, 50),
    assignedUserId
  });

  // 10. Notify connected agents via SSE (real-time update)
  const messageContent = message.messageText || message.caption || "[Mídia]";
  const sseMessage = {
    type: EVENTS.MESSAGE_NEW,
    data: {
      conversationId,
      message: {
        id: messageDbId,
        content: buildInboundContent(message),
        senderType: "customer",
        fileUrl: fileUrlToSave,
        fileType: message.mimeType || null,
        createdAt: now.toISOString(),
      },
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAvatar: customer.photoUrl,
    },
    timestamp: Date.now(),
  };

  const sseConvUpdate = {
    type: !existingConversation ? EVENTS.CONVERSATION_NEW : EVENTS.CONVERSATION_UPDATE,
    data: {
      id: conversationId,
      conversationId,
      lastMessageAt: now.toISOString(),
      lastMessage: messageContent,
      unreadCount: existingConversation ? (existingConversation.unreadCount + 1) : 1,
      status: assignedUserId ? "assigned" : "open",
      assignedTo: assignedUserId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAvatar: customer.photoUrl,
    },
    timestamp: Date.now(),
  };

  // BROADCAST STRATEGY: 
  // 1. Notify the assigned agent specifically
  // 2. Notify ALL connected users if it's a NEW conversation or UNASSIGNED
  if (assignedUserId) {
    sseManager.emitToUser(String(assignedUserId), sseMessage);
    sseManager.emitToUser(String(assignedUserId), sseConvUpdate);
    
    // Also notify ALL because admins need to see the update in the list
    sseManager.emitToAll(sseConvUpdate);
  } else {
    // No assigned agent — notify all connected users (Admins/Available Agents)
    sseManager.emitToAll(sseMessage);
    sseManager.emitToAll(sseConvUpdate);
  }

  return { conversationId, customerId: customer.id };
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

  // 11. Trigger automation flows (WhatsApp/Business) - fire and forget
  setImmediate(async () => {
    try {
      const { findAndExecuteFlowForTrigger } = await import("./flow-engine");
      await findAndExecuteFlowForTrigger(message.fromNumber, customer, conversationId);
    } catch (err) {
      console.error("[Flow Engine] Error:", err);
    }
  });

  return { conversationId, customerId: customer.id };
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

  // 1. Find customer by phone number
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
  const found = await findConversationByPhone(db, customer.phone, conversations);
  
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

  // 3. Insert message into conversation_messages
  const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    externalId: message.externalId || null,
    senderId: message.fromUserId,
    senderType: "agent",
    content: message.messageText || message.caption || buildInboundContent({
      messageType: message.messageType,
      messageText: message.messageText,
      caption: message.caption,
    } as any),
    fileUrl: message.mediaUrl || null,
    fileName: message.fileName || null,
    fileType: message.mimeType || null,
    fileSize: message.fileSize || null,
    createdAt: message.createdAt || new Date(),
  });

  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || undefined;

  console.log("[ingestOutbound] ✅ Message ingested successfully:", {
    conversationId,
    messageDbId,
    content: (message.messageText || message.caption || "[Mídia]").substring(0, 50),
  });

  return { conversationId, customerId: customer.id, messageDbId };
}
