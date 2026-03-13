/**
 * Media download functions for WhatsApp/Evolution API
 */

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

/**
 * Normaliza URL da API removendo barra final.
 * Isso previne o bug de dupla barra "//" que causa 404.
 * 
 * Exemplos:
 * - "https://api.example.com/" → "https://api.example.com"
 * - "https://api.example.com" → "https://api.example.com"
 */
export function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  const { getDb } = await import("./db");
  const { integrationSettings } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.integrationType, "evolution_api"))
    .limit(1);

  if (!config || !config.isActive) return null;

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;

  // Normalizar apiUrl para remover barra final (previne bug //)
  const apiUrl = normalizeApiUrl(configData?.apiUrl || process.env.EVOLUTION_API_URL || "");
  const apiKey =
    configData?.apiKey ||
    configData?.accessToken ||
    process.env.EVOLUTION_API_KEY ||
    "";
  const instanceName =
    configData?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || "";

  console.log(
    "[Evolution Config] apiUrl:",
    apiUrl || "(from env: " + process.env.EVOLUTION_API_URL + ")"
  );
  console.log(
    "[Evolution Config] instanceName:",
    instanceName || "(from env: " + process.env.EVOLUTION_INSTANCE_NAME + ")"
  );
  console.log(
    "[Evolution Config] apiKey length:",
    apiKey?.length || "(from env)"
  );
  console.log(
    "[Evolution Config] apiKey first 5 chars:",
    apiKey?.substring ? apiKey.substring(0, 5) : "N/A"
  );

  if (!apiUrl || !apiKey || !instanceName) return null;

  return { apiUrl, apiKey, instanceName };
}

/**
 * Get media as base64 from Evolution API using the message key
 * This is the recommended way to get media from WhatsApp messages
 */
export async function getMediaBase64FromEvolution(messageKey: {
  id: string;
  remoteJid?: string;
  fromMe?: boolean;
}): Promise<{ base64Data: string; dataUrl: string; mimeType: string } | null> {
  try {
    const evoConfig = await getEvolutionConfig();
    if (!evoConfig) {
      console.error("[Media] No Evolution config found");
      return null;
    }

    console.log(
      "[Media] Using getBase64FromMediaMessage for message:",
      messageKey.id
    );

    // URL já vem normalizada (sem barra final) do getEvolutionConfig()
    const url = `${evoConfig.apiUrl}/chat/getBase64FromMediaMessage/${evoConfig.instanceName}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evoConfig.apiKey,
      },
      body: JSON.stringify({
        message: {
          key: messageKey,
        },
        convertToMp4: false,
      }),
    });

    if (!response.ok) {
      console.error(
        "[Media] getBase64FromMediaMessage failed:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("[Media] Error response:", errorText.substring(0, 500));
      return null;
    }

    const data = await response.json();

    // The response contains base64, mimetype, and filename
    if (data.base64) {
      const mimeType = data.mimetype || "application/octet-stream";
      const dataUrl = `data:${mimeType};base64,${data.base64}`;
      console.log(
        "[Media] Successfully got base64, size:",
        data.base64.length,
        "type:",
        mimeType
      );
      return {
        base64Data: data.base64,
        dataUrl,
        mimeType,
      };
    }

    console.error(
      "[Media] No base64 in response:",
      JSON.stringify(data).substring(0, 200)
    );
    return null;
  } catch (error) {
    console.error("[Media] Error in getMediaBase64FromEvolution:", error);
    return null;
  }
}

/**
 * Download and decrypt WhatsApp media using Evolution API
 */
export async function downloadAndSaveMedia(
  mediaUrl: string,
  mimeType: string | null,
  fromNumber: string,
  mediaKey?: string | null,
  directPath?: string | null
): Promise<{ base64Data: string; dataUrl: string } | null> {
  console.log("[Media] Starting download...");
  console.log("[Media] URL:", mediaUrl?.substring(0, 100));
  console.log("[Media] mimeType:", mimeType);
  console.log("[Media] fromNumber:", fromNumber);
  console.log("[Media] mediaKey:", mediaKey ? "present" : "missing");
  console.log("[Media] directPath:", directPath?.substring(0, 50));

  // FALLBACK: Download direto (provavelmente vai retornar dados criptografados)
  console.log("[Media] Falling back to direct download...");

  try {
    const response = await fetch(mediaUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error("[Media] Direct download failed:", response.status);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");

    console.log("[Media] Downloaded", buffer.length, "bytes");
    console.log(
      "[Media] First 8 bytes (hex):",
      buffer.slice(0, 8).toString("hex")
    );

    // Detectar MIME type por magic bytes
    let contentType = mimeType || "application/octet-stream";

    const isJpeg =
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isPdf =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (isJpeg) contentType = "image/jpeg";
    else if (isPng) contentType = "image/png";
    else if (isPdf) contentType = "application/pdf";

    console.log("[Media] Detected MIME type:", contentType);

    const dataUrl = `data:${contentType};base64,${base64}`;
    return { base64Data: base64, dataUrl };
  } catch (error) {
    console.error("[Media] Direct download error:", error);
    return null;
  }
}
// force deploy Tue Mar  3 21:39:28 -03 2026
