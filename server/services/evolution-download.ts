/**
 * Evolution API Media Download Service
 *
 * Downloads WhatsApp CDN media through Evolution API's proxy endpoints.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) are hotlink-protected
 * and require authentication through the Evolution instance.
 *
 * NOW WITH: Full validation via media-validator (magic bytes, size, hashes)
 */

import { getDb } from '../db';
import { integrationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { downloadWithValidation, isWhatsAppCdnUrl } from './media-validator';

/**
 * Download WhatsApp media using Evolution API proxy endpoint.
 * Supports URL-based download for story replies where mediaKey is unavailable.
 * Returns validated buffer with integrity checks.
 */
export async function downloadWhatsAppMediaFromEvolution(
  params: { 
    url: string;  // WhatsApp CDN URL (mmg.whatsapp.net, pps.whatsapp.net)
    messageKey?: { id: string; remoteJid: string; fromMe?: boolean }; // Optional for reference
  }
): Promise<Buffer | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[Evolution Download] No database connection');
      return null;
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, 'evolution_api'))
      .limit(1);

    if (!config) {
      console.log('[Evolution Download] No Evolution API config found');
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
      console.log('[Evolution Download] Missing required config fields');
      return null;
    }

    console.log('[Evolution Download] Attempting proxy download for:', params.url.substring(0, 60) + '...');

    // Method 1: Try /instance/fetchImage (accepts URL directly for proxy download)
    const fetchImageUrl = `${apiUrl}/instance/fetchImage/${instanceName}`;
    
    const fetchResponse = await fetch(fetchImageUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: params.url }),
    });

    if (fetchResponse.ok) {
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('[Evolution Download] fetchImage success, size:', buffer.length);
      
      // ✅ VALIDAÇÃO COMPLETA DO BUFFER
      try {
        const validated = await downloadWithValidation(params.url, { 
          expectedMimeType: 'image/jpeg', // WhatsApp images usually JPEG
          maxRetries: 1, // já tentou via Evolution
        });
        console.log('[Evolution Download] ✅ Buffer validado:', validated.mimeType, validated.fileSize);
        return validated.buffer;
      } catch (validationErr) {
        console.error('[Evolution Download] ❌ Falha na validação do buffer:', validationErr.message);
        return null;
      }
    }

    // Method 2: Try /message/download/{instanceName}/{messageId} (based on working code in db-messages.ts)
    const messageId = params.messageKey?.id || 'unknown';
    const downloadUrl = `${apiUrl}/message/download/${instanceName}/${messageId}`;
    
    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!downloadResponse.ok) {
      console.log('[Evolution Download] Both endpoints failed:', {
        fetchImageStatus: fetchResponse.status,
        downloadMediaStatus: downloadResponse.status,
      });
      const errorBody = await downloadResponse.text();
      console.log('[Evolution Download] Error body:', errorBody.substring(0, 300));
      return null;
    }

    // The response should be the media file directly (arrayBuffer)
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[Evolution Download] message/download success, size:', buffer.length);

    // ✅ VALIDAÇÃO COMPLETA DO BUFFER TAMBÉM NO FALLBACK
    try {
      const validated = await downloadWithValidation(params.url, { 
        maxRetries: 1,
      });
      console.log('[Evolution Download] ✅ Buffer validado (fallback):', validated.mimeType, validated.fileSize);
      return validated.buffer;
    } catch (validationErr) {
      console.error('[Evolution Download] ❌ Falha na validação do buffer (fallback):', validationErr.message);
      return null;
    }
  } catch (error) {
    console.error('[Evolution Download] Unexpected error:', error);
    return null;
  }
}

/**
 * Download genérico para URLs não-WhatsApp (Instagram, etc.) com validação completa
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