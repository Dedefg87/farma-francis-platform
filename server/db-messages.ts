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

// Gera todas as variações de número de telefone brasileiro (com/sem 9, com/sem +55)
function getPhoneVariations(rawPhone: string): string[] {
  const clean = rawPhone.replace(/\D/g, ''); // Remove tudo que não é número

  // Se não for número brasileiro válido, retorna apenas as versões básicas
  if (!clean.startsWith('55') || clean.length < 12) {
    return [rawPhone, clean, `+${clean}`];
  }

  // Extrai DDD e os últimos 8 dígitos (ignorando o 9)
  const ddd = clean.substring(2, 4);
  const last8 = clean.slice(-8);

  // Retorna todas as 6 combinações possíveis no WhatsApp BR
  return [
    `55${ddd}9${last8}`,          // Padrão com 9
    `55${ddd}${last8}`,           // Padrão sem 9
    `+55${ddd}9${last8}`,         // Com + e com 9
    `+55${ddd}${last8}`,          // Com + e sem 9
    `${ddd}9${last8}`,            // Sem DDI e com 9
    `${ddd}${last8}`              // Sem DDI e sem 9
  ];
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
function normalizePhone(value: string): string {
  // Remover tudo que não for dígito
  let digits = value.replace(/\D/g, "");
  if (!digits) return value;

  // Se for muito longo (ID do WhatsApp), extrair a parte do telefone
  if (digits.length >= 20) {
    const atIndex = value.indexOf("@");
    if (atIndex > 0) {
      const cleanNumber = value.substring(0, atIndex).replace(/\D/g, "");
      if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
        digits = cleanNumber;
      }
    }
    if (digits.length > 15) {
      digits = digits.slice(-15);
    }
  }

  // Remover nono dígito brasileiro se presente (após DDD)
  // Formato: 55 + DDD (2) + 8 ou 9 dígitos
  // Com nono: 55+DDD+9+número (13 dígitos sem o +)
  // Sem nono: 55+DDD+número (12 dígitos)
  if (digits.startsWith('55')) {
    if (digits.length === 13) {
      // Remover o nono (5º dígito)
      digits = digits.slice(0, 4) + digits.slice(5);
    }
    // Se length 12, já está correto
    // Outros tamanhos mantemos como está
  }

  // Garantir formato internacional com +
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// Gera variações de números para busca flexível (com/sem nono para Brasil)
export function getPhoneSearchVariants(normalizedPhone: string): string[] {
  const variants: string[] = [normalizedPhone];
  const digits = normalizedPhone.replace(/\D/g, '');
  
  // Apenas para números brasileiros (55)
  if (digits.startsWith('55')) {
    if (digits.length === 12) {
      // Versão SEM nono, gerar COM nono (para pegar registros antigos que foram salvos com nono)
      const withNon = digits.slice(0, 4) + '9' + digits.slice(4);
      variants.push(normalizedPhone.startsWith('+') ? `+${withNon}` : withNon);
    } else if (digits.length === 11) {
      // Raro, mas pode ser número sem o código do país? Ignorar.
    }
  }
  
  return variants;
}

export async function findOrCreateCustomerByPhone(
  phone: string,
  name?: string,
  photoUrl?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rawPhone = phone;
  const cleanPhone = rawPhone.replace(/\D/g, '');

  // Gera todas as variações possíveis do número (com/sem 9, com/sem +55)
  const phoneVariations = getPhoneVariations(phone);

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
    .where(inArray(customers.phone, phoneVariations))
    .limit(1);

  // Para armazenamento, usar o número limpo (apenas dígitos) como padrão
  const normalizedPhone = cleanPhone;

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

  // Get the newly created customer (use same search condition to be consistent)
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
    .where(searchCondition)
    .limit(1);

  // 🎯 BUSCA AGRESSIVA DE FOTO DE PERFIL (se não foi fornecida)
  if (!photoUrl && newCustomer[0]?.id) {
    setImmediate(async () => {
      try {
        const profile = await fetchEvolutionProfile(phone);
        if (profile?.profilePicture) {
          const db = await getDb();
          if (db) {
            await db
              .update(customers)
              .set({ photoUrl: profile.profilePicture, updatedAt: new Date() })
              .where(eq(customers.id, newCustomer[0].id));
            console.log(`[Profile] Foto buscada e salva para cliente ${phone}`);
          }
        }
      } catch (err) {
        console.error(`[Profile] Erro ao buscar foto para ${phone}:`, err);
      }
    });
  }

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
  externalId?: string | null; // Evolution API message ID
  createdAt?: Date;
}) {
  console.log("[Ingest] Starting for message from", message.fromNumber, "type:", message.messageType);
  
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] ❌ Database not available!");
    return null;
  }

  try {
    // 0. IDEMPOTÊNCIA: Verificar se já existe mensagem com este externalId
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
        console.log("[Ingest] ⏭️ Duplicate message detected, skipping. externalId:", message.externalId);
        return { conversationId: existing[0].conversationId, customerId: null };
      }
      console.log("[Ingest] ✅ New message, proceeding");
    }

    // 1. Find or create customer
    console.log("[Ingest] Step 1: findOrCreateCustomerByPhone");
    const customer = await findOrCreateCustomerByPhone(
      message.fromNumber,
      message.fromName || undefined
    );
    console.log("[Ingest] Customer:", { id: customer.id, name: customer.name, phone: customer.phone });

    // 2. Fetch profile picture in background (non-blocking)
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

    // 3. Pick least loaded online agent
    console.log("[Ingest] Step 3: pickLeastLoadedOnlineAgent");
    let picked = await pickLeastLoadedOnlineAgent({ provider: message.provider });
    const assignedUserId = picked && Number.isFinite(picked.userId) && picked.userId > 0
      ? picked.userId
      : null;
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

    // 5. Find existing conversation (open or assigned)
    console.log("[Ingest] Step 5: Find existing conversation");
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
    console.log("[Ingest] Existing conversation:", conversationId || "none");

    // 6. Create or update conversation
    if (!conversationId) {
      console.log("[Ingest] Step 6a: Creating new conversation");
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
      if (!conversationId) {
        throw new Error("Failed to retrieve new conversation ID after insert");
      }
      console.log("[Ingest] New conversation created:", conversationId);
    } else {
      console.log("[Ingest] Step 6b: Updating existing conversation");
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
      console.log("[Ingest] Conversation updated:", conversationId, shouldAssign ? "(assigned)" : "");
    }

    // 7. ECONOMIA DE ESPAÇO: salvar apenas URL original (não baixar como base64)
    // O endpoint /api/media/:id fará fetch da Evolution API quando necessário
    const fileUrlToSave = message.mediaUrl || null;
    console.log("[Ingest] Step 7: fileUrl to save:", fileUrlToSave ? "present" : "null");

    // 8. Insert conversation message (COM TRY/CATCH ROBUSTO)
    console.log("[Ingest] Step 8: Inserting conversation message");
    
    // Preparar valores com sanitização
    const insertValues = {
      conversationId,
      externalId: message.externalId || null,
      senderId: null,
      senderType: "customer",
      content: buildInboundContent(message),
      fileUrl: fileUrlToSave,
      fileName: message.fileName || null,
      fileType: message.mimeType || null,
      fileSize: message.fileSize || null,
      createdAt: now,
    };
    
    // Log dos valores para debug (limitando tamanho para não poluir logs)
    console.log("[Ingest] Insert values (prepared):", {
      conversationId,
      externalId: message.externalId,
      senderType: "customer",
      contentLength: buildInboundContent(message)?.length || 0,
      fileUrl: fileUrlToSave ? `${fileUrlToSave.substring(0, 100)}...` : null,
      fileName: message.fileName,
      fileType: message.mimeType,
      fileSize: message.fileSize,
      createdAt: now,
    });
    
    let insertResult: any;
    try {
      insertResult = await db.insert(conversationMessages).values(insertValues);
    } catch (error: any) {
      console.error("[INGEST][DrizzleError] ❌ FATAL: Failed to insert conversation message");
      console.error("[INGEST][DrizzleError] Error message:", error.message);
      console.error("[INGEST][DrizzleError] Error code:", error.code);
      console.error("[INGEST][DrizzleError] Full error:", error);
      console.error("[INGEST][DrizzleError] Stack:", error instanceof Error ? error.stack : "N/A");
      console.error("[INGEST][DrizzleError] Values that caused error:", JSON.stringify({
        conversationId,
        externalId: message.externalId,
        content: buildInboundContent(message),
        fileUrl: fileUrlToSave,
        fileUrlLength: fileUrlToSave?.length,
        fileName: message.fileName,
        fileNameLength: message.fileName?.length,
        fileType: message.mimeType,
        fileTypeLength: message.mimeType?.length,
        fileSize: message.fileSize,
        createdAt: now,
      }, null, 2));
      throw error; // re-throw para webhook
    }
    
    const messageDbId = insertResult.insertId as number;
    console.log("[Ingest] ✅ Message inserted into conversationMessages:", { conversationId, messageDbId, externalId: message.externalId });

    return { conversationId, customerId: customer.id };
  } catch (error) {
    console.error("[ingestInbound] ❌ Error during ingestion:", error);
    console.error("[ingestInbound] Stack:", error instanceof Error ? error.stack : "N/A");
    throw error; // rethrow para ser capturado pelo webhook
  }
}

export async function listReceivedMessages(filters?: {
  provider?: string;
}) {
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
