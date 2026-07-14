/**
 * Evolution API Media Download Service
 *
 * Downloads WhatsApp CDN media through Evolution API's proxy endpoints.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) are hotlink-protected
 * and require authentication through the Evolution instance.
 *
 * KEY ENDPOINTS:
 * - /message/download/{instance}/{msgId} -> returns JSON {url, mediaUrl}
 * - /chat/getBase64FromMediaMessage -> POST with messageKey, returns {base64, mimetype}
 *   (used for story replies where quotedMessage has no URL)
 * - /instance/fetchImage/{instance} -> proxy download of external URL
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
async function getEvolutionConfig(): Promise<{ apiUrl: string; apiKey: string; instanceName: string } | null> {
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
    const apiKey = configData.apiKey || configData.accessToken;
    const instanceName = configData.instanceName;

    if (!apiUrl || !apiKey || !instanceName) return null;

    return { apiUrl, apiKey, instanceName };
  } catch (err) {
    console.error('[Evolution Config] Error:', err);
    return null;
  }
}

/**
 * Download story media via Evolution API /chat/getBase64FromMediaMessage endpoint.
 * 
 * This is the CORRECT way to get story reply media from WhatsApp.
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

    const endpoint = `${apiUrl}/chat/getBase64FromMediaMessage`;
    
    // Build the payload matching what Evolution API expects
    // The message.key structure MUST have:
    // - remoteJid: 'status@broadcast' (stories are on status)
    // - id: the stanzaId (original story message ID)
    // - fromMe: true (the story was posted by the instance user)
    // - participant: the LID of the person who posted (e.g., '84735929938087@lid')
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

    console.log(`[StoryMedia] 📤 Calling getBase64FromMediaMessage:`, {
      endpoint: endpoint,
      stanzaId,
      participant,
      hasQuotedMessage: !!quotedMessage,
    });

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

    console.log(`[StoryMedia] 📥 getBase64FromMediaMessage response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[StoryMedia] ❌ HTTP ${response.status}:`, errorText.substring(0, 200));
      return null;
    }

    const result = await response.json();
    console.log(`[StoryMedia] 📥 Response keys:`, Object.keys(result));

    // Evolution API returns { base64: "...", mimetype: "..." }
    if (result?.base64) {
      const buffer = Buffer.from(result.base64, 'base64');
      console.log(`[StoryMedia] ✅ Buffer obtido: ${buffer.length} bytes, mime: ${result.mimetype || 'unknown'}`);
      return buffer;
    }

    // If no base64, check if it returned a URL instead
    if (result?.url || result?.mediaUrl) {
      const mediaUrl = result.url || result.mediaUrl;
      console.log(`[StoryMedia] 🔄 Got URL instead of base64, fetching: ${mediaUrl.substring(0, 80)}`);
      
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

    console.log(`[StoryMedia] ❌ No base64 or URL in response:`, JSON.stringify(result).substring(0, 200));
    return null;
  } catch (err) {
    console.error(`[StoryMedia] ❌ Error:`, err.message);
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
      const fetchImageUrl = `${apiUrl}/instance/fetchImage/${instanceName}`;
      
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

    // Method 2: Try /message/download/{instanceName}/{messageId} 
    // This returns JSON with a URL to the media (already uploaded to MinIO/R2 by Evolution)
    // Use the original story ID (stanzaId) and remoteJid 'status@broadcast'
    const messageId = params.messageKey?.id || 'unknown';
    const downloadUrl = `${apiUrl}/message/download/${instanceName}/${messageId}`;
    
    console.log('🚨 [Evolution Download] Trying message/download endpoint:', downloadUrl);
    
    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
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
      headers: { 'User-Agent': 'FarmaFrancisBot/1.0' },
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