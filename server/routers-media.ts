import { Router } from "express";
import { getDb } from "./db";
import { receivedMessages, conversationMessages, conversations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/media/:messageId
 * Redireciona para a URL do arquivo no R2 (Cloudflare).
 * O fileUrl no banco já contém o caminho (relativo ou absoluto).
 * Se for relativo, concatena com PUBLIC_R2_URL.
 */
router.get("/:messageId", async (req, res) => {
  const { messageId } = req.params;
  console.log("[MediaProxy] Request for:", messageId);

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Buscar a mensagem
    const [convMsg] = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, Number(messageId)))
      .limit(1);

    let fileUrl: string | null = convMsg?.fileUrl || null;

    if (!fileUrl) {
      const [received] = await db
        .select()
        .from(receivedMessages)
        .where(eq(receivedMessages.externalId, messageId))
        .limit(1);
      fileUrl = received?.mediaUrl || null;
    }

    if (!fileUrl) {
      console.log("[MediaProxy] Not found for messageId:", messageId);
      return res.status(404).json({ error: "Mídia não encontrada" });
    }

    // Se for URL do WhatsApp CDN (hotlink protection), fazer download e servir como proxy
    if (fileUrl.includes("whatsapp.net") || fileUrl.includes("whatsapp.com")) {
      console.log("[MediaProxy] WhatsApp CDN detected, downloading:", fileUrl.substring(0, 80));

      try {
        const response = await fetch(fileUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)",
          },
        });

        if (!response.ok) {
          console.log("[MediaProxy] WhatsApp download failed:", response.status);
          return res.status(403).json({ error: "Mídia bloqueada pelo WhatsApp" });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determinar tipo MIME
        const mime = response.headers.get("content-type") || "application/octet-stream";

        // Servir como anexo com headers corretos
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Content-Disposition", `inline; filename="${convMsg?.fileName || 'media'}"`);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      } catch (downloadErr) {
        console.error("[MediaProxy] Download error:", downloadErr);
        return res.status(500).json({ error: "Erro ao baixar mídia" });
      }
    }

    // Se não for URL absoluta, prefixar com PUBLIC_R2_URL
    let finalUrl = fileUrl;
    if (!fileUrl.startsWith("http")) {
      const r2Base = (process.env.PUBLIC_R2_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev").replace(/\$/, "");
      finalUrl = `${r2Base}/${fileUrl.replace(/^\//, "")}`;
    }

    console.log("[MediaProxy] Redirecting to:", finalUrl);
    return res.redirect(302, finalUrl);
  } catch (error) {
    console.error("[MediaProxy] Error:", error);
    return res.status(500).json({ error: "Erro ao servir mídia" });
  }
});

/**
 * GET /api/media/proxy
 * Proxy para URLs do WhatsApp CDN ou outros CDNs protegidos.
 * Query: ?url=<url-encoded-url>
 * Usado para fotos de perfil (customerAvatar) que não têm messageId.
 */
router.get("/proxy", async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL parameter required" });
  }

  // Decodificar a URL
  let fileUrl: string;
  try {
    fileUrl = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  // Verificar se é WhatsApp CDN
  const isWhatsAppCdn = /whatsapp\.net|whatsapp\.com/.test(fileUrl);
  if (!isWhatsAppCdn) {
    // Não é WhatsApp CDN, redirecionar direto
    return res.redirect(302, fileUrl);
  }

  console.log("[MediaProxy] WhatsApp CDN proxy request:", fileUrl.substring(0, 80));

  try {
    const response = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)",
      },
    });

    if (!response.ok) {
      console.log("[MediaProxy] WhatsApp download failed:", response.status);
      return res.status(403).json({ error: "Mídia bloqueada pelo WhatsApp" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mime = response.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return res.send(buffer);
  } catch (err) {
    console.error("[MediaProxy] Proxy error:", err);
    return res.status(500).json({ error: "Erro ao proxy mídia" });
  }
});

export default router;