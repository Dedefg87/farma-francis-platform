/**
 * Media download functions for WhatsApp/Evolution API
 */

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
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

  const apiUrl = configData.apiUrl as string | undefined;
  const apiKey = configData.apiKey || configData.accessToken;
  const instanceName = configData.instanceName;

  if (!apiUrl || !apiKey || !instanceName) return null;

  return { apiUrl, apiKey, instanceName };
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

  // Extrair mediaId da URL
  let mediaId: string | null = null;
  if (mediaUrl) {
    const match = mediaUrl.match(/\/([A-Za-z0-9_-]+)(\?|$)/);
    if (match) {
      mediaId = match[1];
    }
  }

  // PRIMEIRO: Tentar Evolution API para obter mídia descriptografada
  console.log("[Media] Trying Evolution API for decrypted media...");
  const evoConfig = await getEvolutionConfig();
  
  if (evoConfig && mediaId) {
    console.log(`[Media] mediaId: ${mediaId}`);
    
    try {
      // Endpoint para obter mídia descriptografada
      const endpoint = `${evoConfig.apiUrl}/chat/getBase64FromMediaMessage/${evoConfig.instanceName}`;
      
      console.log("[Media] Calling Evolution API:", endpoint);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: evoConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageTimestamp: Math.floor(Date.now() / 1000),
          key: {
            remoteJid: fromNumber.includes("@") ? fromNumber : `${fromNumber}@s.whatsapp.net`,
            fromMe: false,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.base64) {
          console.log("[Media] SUCCESS! Got base64 from Evolution API, size:", data.base64.length);
          const contentType = mimeType || "application/octet-stream";
          const dataUrl = `data:${contentType};base64,${data.base64}`;
          return { base64Data: data.base64, dataUrl };
        } else {
          console.warn("[Media] Evolution API response missing base64");
        }
      } else {
        const errorText = await response.text();
        console.warn(`[Media] Evolution API failed: ${response.status}`, errorText.substring(0, 200));
      }
    } catch (error) {
      console.warn("[Media] Evolution API error:", error);
    }
  }

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
    console.log("[Media] First 8 bytes (hex):", buffer.slice(0, 8).toString('hex'));
    
    // Detectar MIME type por magic bytes
    let contentType = mimeType || "application/octet-stream";
    
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    
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
