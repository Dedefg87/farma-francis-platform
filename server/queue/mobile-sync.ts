/**
 * Mobile Sync Queue - Sincroniza mensagens enviadas do celular (fromMe)
 *
 * IMPORTANTE: Esta fila processa jobs em background SEM bloquear o webhook
 */
import { getDb } from "../db";
import { conversations, conversationMessages, customers, integrationSettings } from "../../drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";

import { sseManager, EVENTS } from "../_core/sse";

// Gera variações de números para busca flexível (com/sem nono para Brasil)
function getPhoneSearchVariants(phone: string): string[] {
  const variants: string[] = [phone];
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('55')) {
    if (digits.length === 12) {
      // SEM nono -> gerar COM nono
      const withNon = digits.slice(0, 4) + '9' + digits.slice(4);
      variants.push(phone.startsWith('+') ? `+${withNon}` : withNon);
    } else if (digits.length === 13) {
      // COM nono -> gerar SEM nono
      const withoutNon = digits.slice(0, 4) + digits.slice(5);
      variants.push(phone.startsWith('+') ? `+${withoutNon}` : withoutNon);
    }
  }
  
  return variants;
}

interface MobileSyncJob {
  id: string;
  remoteJid: string; // Número do cliente (destinatário)
  messageId: string;
  messageText?: string | null;
  caption?: string | null;
  messageType?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  messageTimestamp: number;
}

// Fila simples em memória (Railway roda instância única)
const queue: MobileSyncJob[] = [];
let isProcessing = false;

/**
 * Adiciona job na fila
 */
export function enqueueMobileSyncJob(job: Omit<MobileSyncJob, "id">) {
  const jobWithId: MobileSyncJob = {
    ...job,
    id: `mobile-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  queue.push(jobWithId);

  // Log mínimo (apenas em debug, senão count pro CI)
  if (queue.length % 10 === 0) {
    console.log("[MobileSync] Queue size:", queue.length);
  }

  // Processar assíncrono sem await
  if (!isProcessing) {
    setImmediate(processQueue);
  }
}

/**
 * Processador da fila
 */
async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;

  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;

      try {
        await processMobileSyncJob(job);
        // Log de sucesso a cada 10 jobs para não sobrecarregar
        if (Math.random() < 0.1) {
          console.log("[MobileSync] Job processed:", job.id, "queue remaining:", queue.length);
        }
      } catch (error) {
        // Log mínimo, não quebra
        console.error("[MobileSync] Job failed:", job.id, error.message);
        // Job é descartado (não reenfileiramos para evitar loop)
      }
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Executa um job de sync
 */
async function processMobileSyncJob(job: MobileSyncJob) {
  const db = await getDb();
  if (!db) {
    console.error("[MobileSync] DB not available for job:", job.id);
    return;
  }

  // Converter remoteJid para número do cliente
  const customerPhone = normalizeInboundNumber(job.remoteJid);
  if (!customerPhone) {
    console.error("[MobileSync] Failed to normalize phone from:", job.remoteJid);
    return;
  }

  // Buscar cliente com busca flexível (com/sem nono)
  const phoneVariants = getPhoneSearchVariants(customerPhone);
  const phoneCondition = phoneVariants.length > 1
    ? or(...phoneVariants.map(v => eq(customers.phone, v)))
    : eq(customers.phone, phoneVariants[0]);

  let customer = await db
    .select()
    .from(customers)
    .where(phoneCondition)
    .limit(1);

  if (customer.length === 0) {
    // Criar novo cliente
    await db.insert(customers).values({
      name: `Cliente ${customerPhone}`,
      phone: customerPhone,
      status: "active",
    });
    customer = await db
      .select()
      .from(customers)
      .where(phoneCondition)
      .limit(1);
  }

  if (customer.length === 0) {
    console.error("[MobileSync] Failed to create/find customer:", customerPhone);
    return;
  }

  const customerRecord = customer[0];

  // Buscar conversa aberta/assigned para este cliente
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.customerId, customerRecord.id),
        eq(conversations.channel, "whatsapp"),
        or(
          eq(conversations.status, "open"),
          eq(conversations.status, "assigned")
        )
      )
    )
    .limit(1);

  let conversationId: number;

  if (!conv) {
    // Criar nova conversa (open, sem agente designado, sem queue)
    const insertResult = await db.insert(conversations).values({
      customerId: customerRecord.id,
      customerName: customerRecord.name,
      customerPhone: customerPhone,
      channel: "whatsapp",
      status: "open",
      assignedTo: null,
      queueId: null,
      openedAt: new Date(),
      lastMessageAt: new Date(),
      unreadCount: 1,
    });
    conversationId = insertResult.insertId as number;
    console.log("[MobileSync] Created new conversation:", conversationId, "for phone:", customerPhone);
  } else {
    conversationId = conv.id;
    // Atualizar lastMessageAt e unreadCount
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        unreadCount: sql<number>`unread_count + 1`,
      })
      .where(eq(conversations.id, conversationId));
  }

  // DUPLICATE CHECK: Verificar se já existe mensagem com mesmo externalId para esta conversa
  const existing = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.externalId, job.messageId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log("[MobileSync] Duplicate message ignored:", job.messageId);
    return;
  }

  console.log("[MobileSync] Processing job:", job.id, "for conversation:", conversationId);

  // Preparar conteúdo da mensagem
  let content = job.messageText || job.caption || "";

  // Inserir mensagem na tabela conversation_messages
  const insertResult = await db.insert(conversationMessages).values({
    conversationId,
    senderId: null, // Mensagem do agente, mas não há user_id no contexto do mobile-sync (será atualizado depois se necessário)
    senderType: "agent",
    content,
    fileUrl: job.mediaUrl || null,
    fileName: null,
    fileType: job.messageType || null,
    fileSize: null,
    externalId: job.messageId,
    remoteJid: job.remoteJid,
    createdAt: new Date(job.messageTimestamp * 1000),
  });
  const messageDbId = insertResult.insertId as number;

  // Se houver mídia com URL temporária do WhatsApp, baixar via Evolution API e subir para R2
  if (
    job.mediaUrl &&
    job.mediaUrl.includes("mmg.whatsapp.net") &&
    job.messageId
  ) {
    try {
      console.log("[MobileSync][S3] Triggering Evolution download for R2 upload, messageId:", job.messageId);
      const dbForUpload = await getDb();
      if (!dbForUpload) throw new Error("DB not available for S3 upload");

      const [configRecord] = await dbForUpload
        .select()
        .from(integrationSettings)
        .where(eq(integrationSettings.integrationType, "evolution_api"))
        .limit(1);

      if (configRecord?.config) {
        const configData =
          typeof configRecord.config === "string"
            ? JSON.parse(configRecord.config)
            : configRecord.config;

        // Obter a instância "Meu" ou a primeira
        const instance = (configData.instances as any[])?.find((i: any) => i.name === "Meu") || (configData.instances as any[])?.[0];

        if (instance?.url && instance?.apiKey) {
          const normalizedUrl = (instance.url as string).replace(/\/$/, "");
          const downloadUrl = `${normalizedUrl}/message/download/${job.messageId}`;
          console.log("[MobileSync][S3] Calling Evolution download endpoint:", downloadUrl);

          const response = await fetch(downloadUrl, {
            headers: {
              apikey: instance.apiKey as string,
            },
            signal: AbortSignal.timeout(15000),
          });

          if (response.ok) {
            const data = await response.json();
            const r2Url = data?.url || data?.mediaUrl || null;
            if (r2Url && r2Url.includes("r2.dev")) {
              console.log("[MobileSync][S3] ✅ Got R2 URL, updating message:", r2Url);

              await dbForUpload
                .update(conversationMessages)
                .set({ fileUrl: r2Url })
                .where(eq(conversationMessages.id, messageDbId));

              console.log("[MobileSync][S3] Message updated with R2 URL");
            }
          } else {
            console.log("[MobileSync][S3] ❌ Download failed:", response.status, response.statusText);
          }
        }
      }
    } catch (error) {
      console.log("[MobileSync][S3] Error during R2 upload:", error);
      // Non-critical - message still saved with original URL
    }
  }

  // Notificar via SSE se houver agente designado
  const [updatedConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (updatedConv?.assignedTo) {
    const [insertedMessage] = await db
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.externalId, job.messageId)
        )
      )
      .orderBy(sql`${conversationMessages.id} DESC`)
      .limit(1);

    if (insertedMessage && insertedMessage.id) {
      sseManager.emitToUser(updatedConv.assignedTo, EVENTS.MESSAGE_CREATED, {
        messageId: insertedMessage.id,
        conversationId,
        senderId: null,
        senderType: "agent",
        content,
        fileUrl: job.mediaUrl || null,
        fileType: job.messageType || null,
        createdAt: new Date(job.messageTimestamp * 1000).toISOString(),
      });
    }
  }
}

/**
 * Normaliza número do WhatsApp para formato interno
 */
function normalizeInboundNumber(remoteJid: string): string | null {
  // remoteJid é algo como "5511999999999@s.whatsapp.net" ou "+5511999999999@..."
  // Extrair apenas os dígitos
  const digits = remoteJid.replace(/\D/g, "");
  if (digits.length < 10) return null;

  // Garantir formato internacional (55 no início)
  let number = digits;
  if (!number.startsWith("55") && number.length === 11) {
    number = "55" + number;
  }

  return number;
}

/**
 * Inicializa o processador da fila (chamar no startup)
 */
export function startMobileSyncProcessor() {
  // Processar a cada 100ms se houver jobs
  const interval = setInterval(() => {
    if (queue.length > 0 && !isProcessing) {
      setImmediate(processQueue);
    }
  }, 100);

  // Limpar intervalo ao encerrar (opcional)
  return () => clearInterval(interval);
}
