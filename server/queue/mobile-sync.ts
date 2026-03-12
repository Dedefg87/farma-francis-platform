/**
 * Mobile Sync Queue - Sincroniza mensagens enviadas do celular (fromMe)
 *
 * IMPORTANTE: Esta fila processa jobs em background SEM bloquear o webhook
 */
import { getDb } from "../db";
import { conversations, conversationMessages, customers } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { downloadMediaAsBase64 } from "../db-messages";

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
  if (!db) return;

  // Converter remoteJid para número do cliente
  const customerPhone = normalizeInboundNumber(job.remoteJid);
  if (!customerPhone) return;

  // Buscar conversa aberta/assigned para este cliente
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.customerPhone, customerPhone),
        sql`${conversations.status} IN ('open', 'assigned')`
      )
    )
    .limit(1);

  if (!conv) {
    // Nenhuma conversa ativa com este cliente, ignorar
    return;
  }

  // Preparar conteúdo da mensagem
  let content = job.messageText || job.caption || "";
  let permanentMediaUrl: string | null = job.mediaUrl || null;

  // Se for mídia e não for data URL, baixar para preservar
  if (
    permanentMediaUrl &&
    !permanentMediaUrl.startsWith("data:") &&
    (job.messageType === "image" ||
      job.messageType === "video" ||
      job.messageType === "audio" ||
      job.messageType === "document")
  ) {
    try {
      const downloaded = await downloadMediaAsBase64(
        permanentMediaUrl,
        job.mimeType || null
      );
      if (downloaded) {
        permanentMediaUrl = downloaded;
      }
    } catch (downloadError) {
      console.error("[MobileSync] Failed to download media:", job.messageId);
      // Manter URL original (mesmo que expire depois)
    }
  }

  // Inserir mensagem na tabela conversation_messages
  await db.insert(conversationMessages).values({
    conversationId: conv.id,
    senderId: conv.assignedTo, // Agente dono da conversa
    senderType: "agent",
    content: content,
    fileUrl: permanentMediaUrl || null,
    fileName: null,
    fileType: job.messageType || null,
    fileSize: null,
    createdAt: new Date(job.messageTimestamp * 1000),
  });
}

/**
 * Normaliza número do WhatsApp para formato interno
 */
function normalizeInboundNumber(remoteJid: string): string | null {
  // remoteJid é algo como "5511999999999@s.whatsapp.net"
  const match = remoteJid.match(/^(\d+)@/);
  if (!match) return null;

  let number = match[1];

  // Remover prefixos desnecessários
  number = number.replace(/^@?/, "");

  // Garantir formato internacional
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


/**
 * Inicializa o processador da fila (chamar no startup)
 */
export function startMobileSyncProcessor() {
  // Processar a cada 100ms se houver jobs
  setInterval(() => {
    if (queue.length > 0 && !isProcessing) {
      setImmediate(processQueue);
    }
  }, 100);
}
