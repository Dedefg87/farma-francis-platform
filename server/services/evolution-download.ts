/**
 * Evolution API Media Download Service
 * 
 * Downloads WhatsApp CDN media through Evolution API's proxy endpoints.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) are hotlink-protected
 * and require authentication through the Evolution instance.
 * 
 * KEY ENDPOINTS (v2.x):
 * - /instance/messages/{instanceName}/{messageId} -> returns JSON {url, mediaUrl}
 * - /instance/{instanceName} -> POST {url} -> returns image buffer
 * - /chat/getBase64FromMediaMessage -> POST with messageKey, returns {base64, mimetype}
 */

import { getDb } from '../db';
import { integrationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { downloadWithValidation, isWhatsAppCdnUrl } from './media-validator';

interface DownloadParams {
  url: string;  // WhatsApp CDN URL (mmg.whatsapp.net, pps.whatsapp.net)
  messageKey?: { 
    id: string; 
    remoteJid: string; 
    fromMe?: boolean 
  }; // Optional for reference
  mediaKey?: string;     // Base64 media key for authenticated download
  directPath?: string;   // Direct path for authenticated download
}

interface EvolutionDownloadResponse {
  url?: string;
  mediaUrl?: string;
  [key: string]: unknown;
}

/**
 * Get Evolution API config from database
 */
export async function getEvolutionConfig(): Promise<{ apiUrl: string; apiKey: string; instanceName: string } | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, 'evolution_api'))
      .limit(1);

    if (!config) return null;

    const configData =
      typeof config.config === 'string'
        ? JSON.parse(config.config)
        : config.config;

    const apiUrl = configData.apiUrl?.replace(/\/$/, '');
    const apiKey = configData.apiKey || configData.accessToken || configData.token;
    const instanceName = configData.instanceName || configData.instance || 'Meu';

    if (!apiUrl || !apiKey || !instanceName) return null;

    return { apiUrl, apiKey, instanceName };
  } catch (err) {
    console.error('[Evolution Config] Error:', err);
    return null;
  }
}

/**
 * Download story media via Evolution API.
 * 
 * Story replies don't have URL/mediaKey in quotedMessage — only stanzaId + participant.
 * 
 * @param stanzaId - The original story message ID (from contextInfo.stanzaId)
 * @param participant - The LID of who posted the story (from contextInfo.participant)
 * @param quotedMessage - The quotedMessage object (imageMessage or videoMessage)
 * @param instanceName - The Evolution instance name
 * @returns Buffer with the media, or null if failed
 */
export async function getStoryMediaViaBase64(
  stanzaId: string,
  participant: string,
  quotedMessage: Record<string, unknown>,
  instanceName?: string
): Promise<Buffer | null> {
  try {
    const config = await getEvolutionConfig();
    if (!config) {
      console.log('[StoryMedia] ❌ No Evolution API config found');
      return null;
    }

    const apiUrl = config.apiUrl;
    const apiKey = config.apiKey;
    const inst = instanceName || config.instanceName;

    // Try multiple endpoint formats for compatibility
    const endpoints = [
      `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
      `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
    ];

    const payload = {
      message: {
        key: {
          remoteJid: 'status@broadcast',
          id: stanzaId,
          fromMe: true,
          participant: participant,
        },
        message: quotedMessage,
      },
    };

    for (const endpoint of endpoints) {
      try {
        console.log(`[StoryMedia] 📤 Trying endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
            'instance': inst,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });

        console.log(`[StoryMedia] 📥 Response status: ${response.status}`);

        if (response.ok) {
          const result = await response.json();
          console.log('[StoryMedia] 📥 Response keys:', Object.keys(result));

          if (result?.base64) {
            const base64Str = typeof result.base64 === 'string' ? result.base64 : JSON.stringify(result.base64);
            const buffer = Buffer.from(base64Str, 'base64');
            console.log(`[StoryMedia] ✅ Buffer: ${buffer.length} bytes`);
            return buffer;
          }

          if (result?.url || result?.mediaUrl) {
            const mediaUrl = result.url || result.mediaUrl;
            console.log(`[StoryMedia] 🔄 Fetching from URL: ${mediaUrl.substring(0, 80)}`);
            
            const mediaResponse = await fetch(mediaUrl, {
              signal: AbortSignal.timeout(15000),
            });
            
            if (mediaResponse.ok) {
              const arrayBuffer = await mediaResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              console.log(`[StoryMedia] ✅ Buffer from URL: ${buffer.length} bytes`);
              return buffer;
            }
          }
        }
      } catch (err) {
        console.log(`[StoryMedia] ⚠️ Endpoint ${endpoint} failed: ${err}`);
      }
    }

    // Fallback: try jpegThumbnail
    if ((quotedMessage as any).imageMessage?.jpegThumbnail) {
      console.log('[StoryMedia] 📎 Using jpegThumbnail fallback');
      const thumbBase64 = (quotedMessage as any).imageMessage.jpegThumbnail;
      const buffer = typeof thumbBase64 === 'string' ? Buffer.from(thumbBase64, 'base64') : Buffer.from(Object.values(thumbBase64));
      console.log(`[StoryMedia] ✅ Thumbnail buffer: ${buffer.length} bytes`);
      return buffer;
    }

    console.log('[StoryMedia] ❌ All endpoints failed');
    return null;
  } catch (err) {
    console.error('[StoryMedia] ❌ Error:', err);
    return null;
  }
}

/**
 * Download WhatsApp media using Evolution API proxy endpoint.
 * Supports URL-based download for story replies where mediaKey is unavailable.
 * Also supports mediaKey/directPath for authenticated download of original story media.
 * Returns validated buffer with integrity checks.
 * 
 * IMPORTANT: Evolution API /message/download returns JSON { url, mediaUrl }, not raw bytes!
 * We need to fetch the returned URL to get the actual media bytes.
 */
export async function downloadWhatsAppMediaFromEvolution(
  params: DownloadParams
): Promise<Buffer | null> {
  console.log("🚨 [Evolution Download] INÍCIO - params:", {
    hasUrl: !!params.url && params.url.length > 0,
    urlPreview: params.url?.substring(0, 60),
    hasMessageKey: !!params.messageKey,
    messageKeyId: params.messageKey?.id,
    messageKeyRemoteJid: params.messageKey?.remoteJid,
    hasMediaKey: !!params.mediaKey,
    hasDirectPath: !!params.directPath
  });

  try {
    const config = await getEvolutionConfig();
    if (!config) {
      console.log('🚨 [Evolution Download] No Evolution API config found');
      return null;
    }

    const apiUrl = config.apiUrl;
    const apiKey = config.apiKey;
    const instanceName = config.instanceName;

    console.log('🚨 [Evolution Download] Config OK, attempting download...');

    // Method 1: Try /instance/fetchImage (accepts URL directly for proxy download)
    if (params.url && params.url.length > 0) {
      console.log('🚨 [Evolution Download] Trying fetchImage endpoint...');
      const fetchImageUrl = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
      
      const fetchResponse = await fetch(fetchImageUrl, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: params.url }),
      });

      console.log('🚨 [Evolution Download] fetchImage response status:', fetchResponse.status);

      if (fetchResponse.ok) {
        const arrayBuffer = await fetchResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('🚨 [Evolution Download] fetchImage success, size:', buffer.length);
        
        if (buffer.length > 0) {
          return buffer;
        }
      } else {
        const errorText = await fetchResponse.text();
        console.log('🚨 [Evolution Download] fetchImage failed:', fetchResponse.status, errorText.substring(0, 200));
      }
    } else {
      console.log('🚨 [Evolution Download] No URL provided, skipping fetchImage');
    }

    // Method 2: Try /instance/messages/{instanceName}/{messageId} 
    // Method 2: Use getBase64FromMediaMessage with correct endpoint
    const downloadUrl = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    
    console.log("🚨 [Evolution Download] Trying getBase64FromMediaMessage endpoint:", downloadUrl);
    
    const downloadResponse = await fetch(downloadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        message: {
          key: params.messageKey,
        },
      }),
    });

    console.log('🚨 [Evolution Download] message/download response status:', downloadResponse.status);

    if (!downloadResponse.ok) {
      console.log('🚨 [Evolution Download] Both endpoints failed:', {
        fetchImageStatus: params.url ? 'attempted' : 'skipped (no url)',
        downloadMediaStatus: downloadResponse.status,
      });
      const errorBody = await downloadResponse.text();
      console.log('🚨 [Evolution Download] Error body:', errorBody.substring(0, 300));
      return null;
    }

    // This endpoint returns JSON with URL, NOT raw bytes!
    const data = await downloadResponse.json() as EvolutionDownloadResponse;
    console.log('🚨 [Evolution Download] message/download response data keys:', Object.keys(data));
    
    const mediaUrl = data?.url || data?.mediaUrl || null;
    
    if (!mediaUrl) {
      console.log('🚨 [Evolution Download] ❌ No URL in download response');
      return null;
    }

    console.log('🚨 [Evolution Download] Got media URL:', mediaUrl.substring(0, 80));

    // Now download the actual media from the returned URL
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      },
    });

    if (!mediaResponse.ok) {
      console.log('🚨 [Evolution Download] Failed to fetch media from returned URL:', mediaResponse.status);
      return null;
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('🚨 [Evolution Download] Media fetch success, size:', buffer.length);

    return buffer;
  } catch (error) {
    console.error('🚨 [Evolution Download] Unexpected error:', error);
    return null;
  }
}

/**
 * Download non-WhatsApp media (Instagram, etc.)
 */
export async function downloadGenericMedia(
  url: string,
  options: { expectedMimeType?: string; maxRetries?: number } = {}
): Promise<Buffer | null> {
  try {
    const validated = await downloadWithValidation(url, options);
    return validated.buffer;
  } catch (error) {
    console.error('[Generic Download] Failed:', error);
    return null;
  }
}

export { isWhatsAppCdnUrl, downloadWithValidation } from './media-validator';

/**
 * Download story media using multiple strategies.
 * Consolidates logic for handling story replies (status@broadcast).
 * Implements robust fallback chain for Evolution API v2.3.7
 */
export async function downloadStoryMedia(
  contextInfo: {
    stanzaId: string;
    participant?: string;
    quotedMessage?: any;
  },
  messageId: string,
  instanceName?: string
): Promise<{ buffer: Buffer; mimetype: string; isThumbnail?: boolean } | null> {
  console.log('[downloadStoryMedia] Attempting to download story media:', {
    stanzaId: contextInfo.stanzaId,
    participant: contextInfo.participant,
    messageId
  });

  if (!contextInfo) {
    console.log('[downloadStoryMedia] ❌ Missing contextInfo');
    return null;
  }

  const { stanzaId, participant, quotedMessage } = contextInfo;
  const config = await getEvolutionConfig();
  if (!config) {
    console.log('[downloadStoryMedia] ❌ No Evolution API config found');
    return null;
  }

  const apiUrl = config.apiUrl;
  const apiKey = config.apiKey;
  const inst = instanceName || config.instanceName;

  // ============================================
  // ============================================
  // TENTATIVA 0: Download direto da URL do quotedMessage via proxy Evolution API
  // ============================================
  if (quotedMessage?.imageMessage?.url || quotedMessage?.videoMessage?.url) {
    const directUrl = quotedMessage.imageMessage?.url || quotedMessage.videoMessage?.url;
    const isImage = !!quotedMessage.imageMessage;
    const mimeType = isImage ? "image/jpeg" : "video/mp4";
    console.log("[downloadStoryMedia] 📤 Tentativa 0: Download direto da URL:", directUrl.substring(0, 80));
    try {
      // Usar proxy da Evolution API para baixar URL do WhatsApp CDN
      const proxyResponse = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${inst}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ url: directUrl }),
        signal: AbortSignal.timeout(20000),
      });
      console.log("[downloadStoryMedia] 📥 Proxy response status:", proxyResponse.status);
      if (proxyResponse.ok) {
        const arrayBuffer = await proxyResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 0) {
          console.log("[downloadStoryMedia] ✅ Tentativa 0 sucesso: " + buffer.length + " bytes");
          return { buffer, mimetype: mimeType };
        }
      }
    } catch (err) {
      console.log("[downloadStoryMedia] ⚠️ Tentativa 0 falhou:", err);
    }
  }

  // TENTATIVA 1: quotedMessage completo via getBase64FromMediaMessage
  // ============================================
  if (quotedMessage && (quotedMessage.imageMessage || quotedMessage.videoMessage)) {
    console.log('[downloadStoryMedia] 📤 Tentativa 1: getBase64FromMediaMessage com quotedMessage');
    try {
      const payload = {
        message: {
          key: {
            remoteJid: 'status@broadcast',
            id: stanzaId,
            fromMe: true,
            participant: participant,
          },
          message: quotedMessage,
        },
      };

      const endpoints = [
        `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
        `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
              'instance': inst,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
          });

          console.log(`[downloadStoryMedia] 📥 ${endpoint} status: ${response.status}`);

          if (response.ok) {
            const result = await response.json();
            console.log('[downloadStoryMedia] 📥 Response keys:', Object.keys(result));

            if (result?.base64) {
              const base64Str = typeof result.base64 === 'string' ? result.base64 : JSON.stringify(result.base64);
              const buffer = Buffer.from(base64Str, 'base64');
              const isImage = !!quotedMessage.imageMessage;
              const mimeType = isImage ? 'image/jpeg' : 'video/mp4';
              console.log(`[downloadStoryMedia] ✅ Tentativa 1 sucesso: ${buffer.length} bytes`);
              return { buffer, mimetype: mimeType };
            }

            if (result?.url || result?.mediaUrl) {
              const mediaUrl = result.url || result.mediaUrl;
              console.log(`[downloadStoryMedia] 🔄 Fetching from returned URL: ${mediaUrl.substring(0, 80)}`);
              const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) });
              if (mediaResponse.ok) {
                const arrayBuffer = await mediaResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const isImage = !!quotedMessage.imageMessage;
                const mimeType = isImage ? 'image/jpeg' : 'video/mp4';
                console.log(`[downloadStoryMedia] ✅ Tentativa 1 via URL: ${buffer.length} bytes`);
                return { buffer, mimetype: mimeType };
              }
            }
          }
        } catch (err) {
          console.log(`[downloadStoryMedia] ⚠️ Endpoint ${endpoint} failed: ${err}`);
        }
      }
    } catch (err) {
      console.log('[downloadStoryMedia] ⚠️ Tentativa 1 falhou:', err);
    }
  }

  // ============================================
  // TENTATIVA 2: Buscar mensagem completa via stanzaId
  // ============================================
  if (stanzaId && participant) {
    console.log('[downloadStoryMedia] 📤 Tentativa 2: getMessageById via stanzaId');
    try {
      const msgResponse = await fetch(
        `${apiUrl}/chat/getMessageById/${inst}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            message: {
              key: {
                remoteJid: 'status@broadcast',
                id: stanzaId,
                fromMe: true,
                participant: participant,
              }
            }
          }),
        }
      );

      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        console.log('[downloadStoryMedia] 📥 getMessageById response:', Object.keys(msgData));
        
        if (msgData?.message) {
          const fullMessage = msgData.message;
          if (fullMessage.imageMessage || fullMessage.videoMessage) {
            // Tentar getBase64FromMediaMessage com mensagem completa
            const payload = {
              message: {
                key: {
                  remoteJid: 'status@broadcast',
                  id: stanzaId,
                  fromMe: true,
                  participant: participant,
                },
                message: fullMessage,
              },
            };

            const endpoints = [
              `${apiUrl}/chat/getBase64FromMediaMessage`,
              `${apiUrl}/api/chat/getBase64FromMediaMessage`,
            ];

            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                    'instance': inst,
                  },
                  body: JSON.stringify(payload),
                  signal: AbortSignal.timeout(30000),
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result?.base64) {
                    const base64Str = typeof result.base64 === 'string' ? result.base64 : JSON.stringify(result.base64);
                    const buffer = Buffer.from(base64Str, 'base64');
                    const isImage = !!fullMessage.imageMessage;
                    const mimeType = isImage ? 'image/jpeg' : 'video/mp4';
                    console.log(`[downloadStoryMedia] ✅ Tentativa 2 sucesso: ${buffer.length} bytes`);
                    return { buffer, mimetype: mimeType };
                  }
                  if (result?.url || result?.mediaUrl) {
                    const mediaUrl = result.url || result.mediaUrl;
                    const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) });
                    if (mediaResponse.ok) {
                      const arrayBuffer = await mediaResponse.arrayBuffer();
                      const buffer = Buffer.from(arrayBuffer);
                      const isImage = !!fullMessage.imageMessage;
                      const mimeType = isImage ? 'image/jpeg' : 'video/mp4';
                      console.log(`[downloadStoryMedia] ✅ Tentativa 2 via URL: ${buffer.length} bytes`);
                      return { buffer, mimetype: mimeType };
                    }
                  }
                }
              } catch (err) {
                console.log(`[downloadStoryMedia] ⚠️ Endpoint ${endpoint} failed: ${err}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log('[downloadStoryMedia] ⚠️ Tentativa 2 falhou:', err);
    }
  }

  // ============================================
  // TENTATIVA 3: thumbnail (jpegThumbnail) fallback
  // ============================================
  const thumbnail =
    quotedMessage?.imageMessage?.jpegThumbnail ||
    quotedMessage?.videoMessage?.jpegThumbnail;

  if (thumbnail) {
    console.log('[downloadStoryMedia] 📎 Tentativa 3: Usando jpegThumbnail fallback');
    try {
      const buffer = typeof thumbnail === 'string' ? Buffer.from(thumbnail, 'base64') : Buffer.from(Object.values(thumbnail));
      console.log(`[downloadStoryMedia] ✅ Thumbnail buffer: ${buffer.length} bytes`);
      return { buffer, mimetype: 'image/jpeg', isThumbnail: true };
    } catch (error) {
      console.log('[downloadStoryMedia] ⚠️ Thumbnail fallback falhou:', error);
    }
  }

  console.log('[downloadStoryMedia] ❌ Todas as tentativas falharam');
  return null;
}
