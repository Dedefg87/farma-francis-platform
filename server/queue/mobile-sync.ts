/**
 * Mobile Sync Queue - Sincroniza mensagens enviadas do celular (fromMe)
 *
 * IMPORTANTE: Esta fila processa jobs em background SEM bloquear o webhook
 */
import { getDb } from "../db";
import { conversations, conversationMessages, customers } from "../../drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getMediaBase64FromEvolution } from "../media-download";
import { sseManager, EVENTS } from "../_core/sse";

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

  // Buscar conversa aberta/assigned para este cliente
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        or(
          eq(conversations.customerPhone, customerPhone),
          eq(conversations.customerPhone, `+${customerPhone}`)
        ),
        sql`${conversations.status} IN ('open', 'assigned')`
      )
    )
    .limit(1);

  if (!conv) {
    console.log("[MobileSync] No active conversation for phone:", customerPhone);
    return;
  }

  // DUPLICATE CHECK: Verificar sealready exists a message with same externalId for this conversation
  const existing = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conv.id),
        eq(conversationMessages.externalId, job.messageId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log("[MobileSync] Duplicate message ignored:", job.messageId);
    return;
  }

  console.log("[MobileSync] Processing job:", job.id, "for conversation:", conv.id, "agentId:", conv.assignedTo);

  // Preparar conteúdo da mensagem
  let content = job.messageText || job.caption || "";
  let permanentMediaUrl: string | null = job.mediaUrl || null;

  console.log("[MobileSync] Job media info:", {
    messageId: job.messageId,
    messageType: job.messageType,
    mediaUrl: job.mediaUrl ? "present" : "missing",
    mimeType: job.mimeType,
  });

  // Inserir mensagem na tabela conversation_messages
  await db.insert(conversationMessages).values({
    conversationId: conv.id,
    senderId: conv.assignedTo,
    senderType: "agent",
    content: content,
    fileUrl: permanentMediaUrl || null,
    fileName: null,
    fileType: job.messageType || null,
    fileSize: null,
    externalId: job.messageId, // Store externalId for duplicate detection
    remoteJid: job.remoteJid,
    createdAt: new Date(job.messageTimestamp * 1000),
  });

  // Notificar via SSE
  const [insertedMessage] = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conv.id),
        eq(conversationMessages.externalId, job.messageId)
      )
    )
    .orderBy(sql`${conversationMessages.id} DESC`)
    .limit(1);

  if (insertedMessage && insertedMessage.id) {
    sseManager.emitToUser(conv.assignedTo, EVENTS.MESSAGE_CREATED, {
      messageId: insertedMessage.id,
      conversationId: conv.id,
      senderId: conv.assignedTo,
      senderType: "agent",
      content: content,
      fileUrl: permanentMediaUrl || null,
      fileType: job.messageType || null,
      createdAt: new Date(job.messageTimestamp * 1000).toISOString(),
    });
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
