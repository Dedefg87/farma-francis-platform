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

    // Buscar a mensagem (conversationMessages primeiro, depois receivedMessages)
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
      console.log("[MediaProxy] Not found");
      return res.status(404).json({ error: "Mídia não encontrada" });
    }

    // Se não for URL absoluta, prefixar com PUBLIC_R2_URL
    let finalUrl = fileUrl;
    if (!fileUrl.startsWith("http")) {
      const r2Base = (process.env.PUBLIC_R2_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev").replace(/\/$/, "");
      finalUrl = `${r2Base}/${fileUrl.replace(/^\//, "")}`;
    }

    console.log("[MediaProxy] Redirecting to:", finalUrl);
    return res.redirect(302, finalUrl);
  } catch (error) {
    console.error("[MediaProxy] Error:", error);
    return res.status(500).json({ error: "Erro ao servir mídia" });
  }
});

export default router;
