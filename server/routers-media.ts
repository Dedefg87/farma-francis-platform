import { Router } from "express";
import { getDb } from "./db";
import { receivedMessages, conversationMessages } from "../drizzle/schema";
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

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Buscar em received_messages primeiro
    const [received] = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.externalId, messageId))
      .limit(1);

    let mediaUrl: string | null = null;
    let mimeType: string | null = null;
    let fromNumber: string | null = null;
    let source: "received" | "conversation" = "received";

    if (received) {
      mediaUrl = received.mediaUrl;
      mimeType = received.mimeType;
      fromNumber = received.fromNumber;
    } else {
      // Buscar em conversation_messages
      const [convMsg] = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.id, Number(messageId))) // pode ser ID interno
        .limit(1);

      if (convMsg) {
        mediaUrl = convMsg.fileUrl;
        mimeType = convMsg.fileType || null;
        source = "conversation";
        // Para mensagens de agente, não temos remoteJid facilmente; usar fallback
        fromNumber = null;
      }
    }

    if (!mediaUrl) {
      return res.status(404).json({ error: "Mídia não encontrada" });
    }

    // Se já é data URL (base64), extrair e servir diretamente
    if (mediaUrl.startsWith("data:")) {
      const base64Data = mediaUrl.split(",")[1];
      const contentType = mediaUrl.split(";")[0].split(":")[1];
      const buffer = Buffer.from(base64Data, "base64");
      res.set("Content-Type", contentType || "application/octet-stream");
      return res.send(buffer);
    }

    // Se for URL http/https, tentar fetch direto (pode já estar válida)
    try {
      const fetchResponse = await fetch(mediaUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (fetchResponse.ok) {
        const contentType = fetchResponse.headers.get("content-type") || mimeType || "application/octet-stream";
        res.set("Content-Type", contentType);
        const buffer = Buffer.from(await fetchResponse.arrayBuffer());
        return res.send(buffer);
      }
    } catch (e) {
      // URL expirou ou deu erro, vamos buscar da Evolution API
      console.log("[MediaProxy] URL expired or error, fetching from Evolution API:", messageId);
    }

    // Fallback: buscar da Evolution API (getBase64FromMediaMessage)
    if (fromNumber && messageId) {
      try {
        const mediaResult = await getMediaBase64FromEvolution({
          id: messageId,
          remoteJid: fromNumber,
          fromMe: source === "conversation", // se for conversationMessages, assume fromMe (agente)
        });

        if (mediaResult && mediaResult.dataUrl) {
          const base64Data = mediaResult.dataUrl.split(",")[1];
          const contentType = mediaResult.mimeType || "application/octet-stream";
          const buffer = Buffer.from(base64Data, "base64");
          res.set("Content-Type", contentType);
          return res.send(buffer);
        }
      } catch (err) {
        console.error("[MediaProxy] Error fetching from Evolution:", err);
      }
    }

    // Se tudo falhar, redirecionar para URL original (pode ainda funcionar)
    if (mediaUrl.startsWith("http")) {
      return res.redirect(307, mediaUrl);
    }

    return res.status(404).json({ error: "Mídia não disponível" });
  } catch (error) {
    console.error("[MediaProxy] Error:", error);
    return res.status(500).json({ error: "Erro ao servir mídia" });
  }
});

export default router;
