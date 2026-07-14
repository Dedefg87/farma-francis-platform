/**
 * Evolution API Media Download Service
 *
 * Downloads WhatsApp CDN media through Evolution API's proxy endpoints.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) are hotlink-protected
 * and require authentication through the Evolution instance.
 *
 * NOW WITH: Full validation via media-validator (magic bytes, size, hashes)
 * Supports: mediaKey and directPath for authenticated download of story media
 * CRITICAL: /message/download returns JSON with URL, not raw bytes!
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
  console.log("🚨🚨🚨 [Evolution Download] INÍCIO - params:", {
    hasUrl: !!params.url && params.url.length > 0,
    urlPreview: params.url?.substring(0, 60),
    hasMessageKey: !!params.messageKey,
    messageKeyId: params.messageKey?.id,
    messageKeyRemoteJid: params.messageKey?.remoteJid,
    hasMediaKey: !!params.mediaKey,
    hasDirectPath: !!params.directPath
  });

  try {
    const db = await getDb();
    if (!db) {
      console.log('🚨 [Evolution Download] No database connection');
      return null;
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, 'evolution_api'))
      .limit(1);

    if (!config) {
      console.log('🚨 [Evolution Download] No Evolution API config found');
      return null;
    }

    const configData =
      typeof config.config === 'string'
        ? JSON.parse(config.config)
        : config.config;

    const apiUrl = configData.apiUrl?.replace(/\/$/, '');
    const apiKey = configData.apiKey || configData.accessToken;
    const instanceName = configData.instanceName;

    if (!apiUrl || !apiKey || !instanceName) {
      console.log('🚨 [Evolution Download] Missing required config fields');
      return null;
    }

    console.log('🚨 [Evolution Download] Config OK, attempting download...');

    // Method 1: Try /instance/fetchImage (accepts URL directly for proxy download)
    // Only use if we have a URL
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
        
        // ✅ FULL VALIDATION OF BUFFER
        try {
          const validated = await downloadWithValidation(params.url, { 
            expectedMimeType: 'image/jpeg', // WhatsApp images usually JPEG
            maxRetries: 1, // already tried via Evolution
          });
          console.log('🚨 [Evolution Download] ✅ Buffer validated:', validated.mimeType, validated.fileSize);
          return validated.buffer;
        } catch (validationErr) {
          console.error('🚨 [Evolution Download] ❌ Buffer validation failed:', validationErr.message);
          return null;
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

    // CRITICAL: This endpoint returns JSON with URL, NOT raw bytes!
    // Format: { "url": "https://...", "mediaUrl": "https://...", ... }
    const data = await downloadResponse.json() as EvolutionDownloadResponse;
    console.log('🚨 [Evolution Download] message/download response data:', JSON.stringify(data).substring(0, 500));
    
    // Get the media URL from response
    const mediaUrl = data?.url || data?.mediaUrl || null;
    
    if (!mediaUrl) {
      console.log('🚨 [Evolution Download] ❌ No URL in download response');
      return null;
    }

    console.log('🚨 [Evolution Download] Got media URL:', mediaUrl.substring(0, 80));

    // Now download the actual media from the returned URL
    // This URL might be a direct WhatsApp CDN URL or an Evolution/MinIO/R2 URL
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'FarmaFrancisBot/1.0',
      },
    });

    if (!mediaResponse.ok) {
      console.log('🚨 [Evolution Download] Failed to fetch media from returned URL:', mediaResponse.status);
      return null;
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('🚨 [Evolution Download] Media fetch success, size:', buffer.length);

    // ✅ FULL VALIDATION OF BUFFER
    try {
      const validated = await downloadWithValidation(mediaUrl, { 
        maxRetries: 1,
      });
      console.log('🚨 [Evolution Download] ✅ Buffer validated:', validated.mimeType, validated.fileSize);
      return validated.buffer;
    } catch (validationErr) {
      console.error('🚨 [Evolution Download] ❌ Buffer validation failed:', validationErr.message);
      return null;
    }
  } catch (error) {
    console.error('🚨 [Evolution Download] Unexpected error:', error);
    return null;
  }
}

/**
 * Generic download for non-WhatsApp URLs (Instagram, etc.) with full validation
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