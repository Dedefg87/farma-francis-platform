import { Router } from "express";
import { getDb } from "./db";
import { receivedMessages, conversationMessages, conversations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getMediaBase64FromEvolution } from "./media-download";

const router = Router();

/**
 * GET /api/media/:messageId
 * Proxy para servir mídia (imagens, vídeos, áudios, documentos)
 * Busca da Evolution API se a URL original expirou
 */
router.get("/:messageId", async (req, res) => {
  const { messageId } = req.params;
  console.log("[MediaProxy] Received request for messageId:", messageId);

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // 1. Buscar na tabela conversation_messages pelo ID interno (primary key)
    const [convMsg] = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, Number(messageId)))
      .limit(1);

    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    let fromNumber: string | null = null;

    if (convMsg) {
      mediaUrl = convMsg.fileUrl;
      mimeType = convMsg.fileType || null;
      // Se for mensagem do cliente, buscar o phone (remoteJid) da conversations
      if (convMsg.senderType === "customer") {
        const [conv] = await db
          .select({ customerPhone: conversations.customerPhone })
          .from(conversations)
          .where(eq(conversations.id, convMsg.conversationId))
          .limit(1);
        if (conv) fromNumber = conv.customerPhone;
      }
      console.log("[MediaProxy] Found in conversation_messages:", { mediaUrl: !!mediaUrl, mimeType, fromNumber });
    } else {
      // 2. Fallback: buscar em received_messages por externalId (ID da Evolution)
      const [received] = await db
        .select()
        .from(receivedMessages)
        .where(eq(receivedMessages.externalId, messageId))
        .limit(1);

      if (received) {
        mediaUrl = received.mediaUrl;
        mimeType = received.mimeType;
        fromNumber = received.fromNumber;
        console.log("[MediaProxy] Found in received_messages:", { mediaUrl: !!mediaUrl, mimeType, fromNumber });
      }
    }

    if (!mediaUrl) {
      console.log("[MediaProxy] Media not found for messageId:", messageId);
      return res.status(404).json({ error: "Mídia não encontrada" });
    }

    // Caso 1: Já é data URL (base64) → servir diretamente
    if (mediaUrl.startsWith("data:")) {
      const base64Data = mediaUrl.split(",")[1];
      const contentType = mediaUrl.split(";")[0].split(":")[1];
      const buffer = Buffer.from(base64Data, "base64");
      res.set("Content-Type", contentType || "application/octet-stream");
      return res.send(buffer);
    }

    // Caso 2: URL http/https → tentar fetch direto (pode ainda estar válida)
    try {
      const fetchResponse = await fetch(mediaUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (fetchResponse.ok) {
        const contentType = fetchResponse.headers.get("content-type") || mimeType || "application/octet-stream";
        res.set("Content-Type", contentType);
        const buffer = Buffer.from(await fetchResponse.arrayBuffer());
        console.log("[MediaProxy] Served directly from URL (len:", buffer.length, ")");
        return res.send(buffer);
      }
    } catch (e) {
      // URL expirou ou erro de rede → prosseguir para Evolution API fallback
      console.log("[MediaProxy] Direct fetch failed, trying Evolution API");
    }

    // Caso 3: Buscar da Evolution API (usando getMediaBase64FromEvolution)
    // Requer fromNumber (remoteJid) e messageId (ID da mensagem no WhatsApp)
    if (fromNumber && messageId) {
      try {
        console.log("[MediaProxy] Calling Evolution API with:", {
          messageId,
          fromNumber,
          fromNumberIncludesAt: fromNumber.includes("@"),
          fromMe: false,
        });
        const mediaResult = await getMediaBase64FromEvolution({
          id: messageId,
          remoteJid: fromNumber,
          fromMe: false, // mensagem recebida do cliente
        });

        if (mediaResult && mediaResult.dataUrl) {
          const base64Data = mediaResult.dataUrl.split(",")[1];
          const contentType = mediaResult.mimeType || "application/octet-stream";
          const buffer = Buffer.from(base64Data, "base64");
          res.set("Content-Type", contentType);
          console.log("[MediaProxy] Served from Evolution API (len:", buffer.length, ")");
          return res.send(buffer);
        } else {
          console.log("[MediaProxy] Evolution API returned null/empty");
        }
      } catch (err) {
        console.error("[MediaProxy] Error fetching from Evolution:", err);
      }
    } else {
      console.log("[MediaProxy] Skipping Evolution API - missing fromNumber or messageId", { fromNumber, messageId });
    }

    // Caso 4: Redirecionar para URL original (pode funcionar no navegador)
    if (mediaUrl.startsWith("http")) {
      console.log("[MediaProxy] Redirecting to original URL");
      return res.redirect(307, mediaUrl);
    }

    return res.status(404).json({ error: "Mídia não disponível" });
  } catch (error) {
    console.error("[MediaProxy] Error:", error);
    return res.status(500).json({ error: "Erro ao servir mídia" });
  }
});

export default router;
