/**
 * Broadcast Sender Service
 *
 * Processa o envio de mensagens broadcast via WhatsApp Evolution API
 * com retry de 4 variações de número por contato.
 *
 * Worker automático: processa mensagens com status 'sending' e
 * membros com status 'pending'.
 */

import { getDb } from "../db.js";
import {
  broadcastMessages,
  broadcastMembersSent,
  customers,
  integrationSettings,
} from "../../drizzle/schema.js";
import { eq, sql, and } from "drizzle-orm";
import { generatePhoneVariants } from "../utils/phone.js";

// Mapeamento de MIME type para mediatype da Evolution API
const mimetypeToMediatype: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
};

/**
 * Obtém a configuração da Evolution API do banco de dados
 */
async function getEvolutionConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(sql`integration_type = ${"evolution_api"}`)
    .limit(1);

  if (!config || !config.isActive) {
    throw new Error("Evolution API not configured");
  }

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;

  const apiUrl = (configData.apiUrl as string)?.replace(/\/$/, "");
  const apiKey = (configData.apiKey as string) || (configData.accessToken as string);
  const instanceName = configData.instanceName as string;

  if (!apiUrl || !apiKey || !instanceName) {
    throw new Error("Evolution config incomplete");
  }

  return { apiUrl, apiKey, instanceName };
}

/**
 * Envia uma mensagem via Evolution API com retry de 4 variações
 */
async function sendWhatsAppMessageWithRetry(
  phone: string,
  content: string,
  fileAttachment?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const variants = generatePhoneVariants(phone);
  const { apiUrl, apiKey, instanceName } = await getEvolutionConfig();

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    try {
      const payload: any = {
        number: variant,
        text: content,
      };

      if (fileAttachment) {
        payload.mediaUrl = fileAttachment.url;
        payload.fileName = fileAttachment.name;
        payload.fileType = fileAttachment.type;
        payload.mediatype = mimetypeToMediatype[fileAttachment.type] || "document";
        // O Evolution-api espera sendMediaMessage para mídia
        const response = await fetch(
          `${apiUrl}/message/sendMedia/${instanceName}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          console.log(`[Broadcast] ✅ Enviado com sucesso para ${variant} (mídia)`);
          return { success: true };
        } else {
          const errorText = await response.text();
          console.warn(
            `[Broadcast] ⚠️ Tentativa ${i + 1}/${variants.length} falhou para ${variant}: ${response.status} - ${errorText}`
          );
          // Continua para próxima variação
        }
      } else {
        // Apenas texto
        const response = await fetch(
          `${apiUrl}/message/sendText/${instanceName}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          console.log(`[Broadcast] ✅ Enviado com sucesso para ${variant} (texto)`);
          return { success: true };
        } else {
          const errorText = await response.text();
          console.warn(
            `[Broadcast] ⚠️ Tentativa ${i + 1}/${variants.length} falhou para ${variant}: ${response.status} - ${errorText}`
          );
        }
      }
    } catch (err: any) {
      console.warn(
        `[Broadcast] ⚠️ Erro na tentativa ${i + 1}/${variants.length} para ${variant}:`,
        err.message
      );
    }
  }

  return {
    success: false,
    error: "Todas as 4 variações falharam",
  };
}

/**
 * Processa uma mensagem broadcast (enviando para todos os membros pendentes)
 */
export async function processBroadcastMessage(messageId: number) {
  const db = await getDb();
  if (!db) {
    console.error("[Broadcast] Database not available");
    return;
  }

  try {
    // 1. Buscar mensagem
    const [message] = await db
      .select({
        id: broadcastMessages.id,
        messageText: broadcastMessages.messageText,
        fileUrl: broadcastMessages.fileUrl,
        fileName: broadcastMessages.fileName,
        fileType: broadcastMessages.fileType,
        fileSize: broadcastMessages.fileSize,
      })
      .from(broadcastMessages)
      .where(eq(broadcastMessages.id, messageId))
      .limit(1);

    if (!message) {
      console.error(`[Broadcast] Mensagem ${messageId} não encontrada`);
      return;
    }

    // 2. Buscar membros pendentes (juntamente com o telefone do cliente)
    const pendingSents = await db
      .select({
        id: broadcastMembersSent.id,
        customerId: broadcastMembersSent.customerId,
        phone: broadcastMembersSent.phone,
        customerPhone: customers.phone, // telefone do cliente (original)
      })
      .from(broadcastMembersSent)
      .leftJoin(customers, eq(broadcastMembersSent.customerId, customers.id))
      .where(
        and(
          eq(broadcastMembersSent.broadcastMessageId, messageId),
          eq(broadcastMembersSent.status, "pending")
        )
      );

    if (pendingSents.length === 0) {
      console.log(`[Broadcast] Nenhum pendente para mensagem ${messageId}`);
      return;
    }

    console.log(
      `[Broadcast] Processando ${pendingSents.length} envios pendentes para mensagem ${messageId}`
    );

    let successCount = 0;
    let failCount = 0;

    // 3. Processar cada membro
    for (const sent of pendingSents) {
      // Usar o telefone do customer se disponível, senão o phone do broadcastMembersSent
      const targetPhone = sent.customerPhone || sent.phone;

      const fileAttachment = message.fileUrl
        ? {
            url: message.fileUrl,
            name: message.fileName || "arquivo",
            type: message.fileType || "application/octet-stream",
            size: message.fileSize || 0,
          }
        : undefined;

      const result = await sendWhatsAppMessageWithRetry(
        targetPhone,
        message.messageText,
        fileAttachment
      );

      if (result.success) {
        await db
          .update(broadcastMembersSent)
          .set({
            status: "sent",
            sentAt: new Date(),
            errorMessage: null,
          })
          .where(eq(broadcastMembersSent.id, sent.id));
        successCount++;
      } else {
        await db
          .update(broadcastMembersSent)
          .set({
            status: "failed",
            errorMessage: result.error || "Erro desconhecido",
            sentAt: null,
          })
          .where(eq(broadcastMembersSent.id, sent.id));
        failCount++;
      }

      // Pequena pausa para evitar rate limit (0.5s entre envios)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 4. Atualizar contadores da mensagem
    await db
      .update(broadcastMessages)
      .set({
        successfulSends: successCount,
        failedSends: failCount,
        status: successCount > 0 && failCount === 0 ? "completed" : "partial",
      })
      .where(eq(broadcastMessages.id, messageId));

    console.log(
      `[Broadcast] Mensagem ${messageId} processada: ${successCount} sucessos, ${failCount} falhas`
    );
  } catch (err) {
    console.error(
      `[Broadcast] Erro ao processar mensagem ${messageId}:`,
      err
    );
  }
}

/**
 * Worker que fica processando mensagens broadcast pendentes
 */
export function startBroadcastSenderWorker(pollIntervalMs = 5000) {
  console.log("[BroadcastWorker] Iniciando worker de envio de broadcast...");

  // Processar imediatamente na inicialização
  processPendingBroadcasts().catch(err => {
    console.error("[BroadcastWorker] Erro inicial:", err);
  });

  // Configurar intervalo
  const intervalId = setInterval(async () => {
    try {
      await processPendingBroadcasts();
    } catch (err) {
      console.error("[BroadcastWorker] Erro no intervalo:", err);
    }
  }, pollIntervalMs);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[BroadcastWorker] Recebido SIGTERM, parando...");
    clearInterval(intervalId);
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("[BroadcastWorker] Recebido SIGINT, parando...");
    clearInterval(intervalId);
    process.exit(0);
  });

  return intervalId;
}

/**
 * Busca e processa todas as mensagens broadcast com status 'sending' e pendentes
 */
async function processPendingBroadcasts() {
  const db = await getDb();
  if (!db) return;

  // Buscar mensagens em status 'sending' que ainda têm pendentes
  const messages = await db
    .select({ id: broadcastMessages.id })
    .from(broadcastMessages)
    .where(eq(broadcastMessages.status, "sending"))
    .limit(10); //_processar até 10 por ciclo para evitar sobrecarga

  for (const msg of messages) {
    try {
      await processBroadcastMessage(msg.id);
    } catch (err) {
      console.error(
        `[BroadcastWorker] Falha ao processar mensagem ${msg.id}:`,
        err
      );
    }
  }
}
