/**
 * Evolution API Media Download Service
 *
 * Downloads WhatsApp CDN media through Evolution API's proxy endpoints.
 * WhatsApp CDN URLs (mmg.whatsapp.net, pps.whatsapp.net) are hotlink-protected
 * and require authentication through the Evolution instance.
 */

import { getDb } from '../db';
import { integrationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Download WhatsApp media using Evolution API proxy endpoint.
 * Supports URL-based download for story replies where mediaKey is unavailable.
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
      const buffer = Buffer.from(await fetchResponse.arrayBuffer());
      console.log('[Evolution Download] fetchImage success, size:', buffer.length);
      return buffer;
    }

    // Method 2: Try /message/downloadMedia with messageKey format
    const downloadUrl = `${apiUrl}/message/downloadMedia/${instanceName}`;
    
    const keyPayload = params.messageKey 
      ? { messageKey: params.messageKey }
      : { messageKey: { id: 'unknown' } };
    
    const downloadResponse = await fetch(downloadUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(keyPayload),
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

    // Check content type - Evolution may return base64 JSON or binary
    const contentType = downloadResponse.headers.get('content-type');
    console.log('[Evolution Download] Response content-type:', contentType);
    
    let buffer: Buffer | null = null;
    if (contentType?.includes('application/json')) {
      const jsonResponse = await downloadResponse.json();
      console.log('[Evolution Download] JSON response keys:', Object.keys(jsonResponse));
      if (jsonResponse.base64) {
        buffer = Buffer.from(jsonResponse.base64, 'base64');
      } else if (jsonResponse.url) {
        const proxiedResponse = await fetch(jsonResponse.url);
        if (proxiedResponse.ok) {
          buffer = Buffer.from(await proxiedResponse.arrayBuffer());
        }
      }
    } else {
      buffer = Buffer.from(await downloadResponse.arrayBuffer());
    }

    if (!buffer || buffer.length === 0) {
      console.log('[Evolution Download] Empty response body');
      return null;
    }

    console.log('[Evolution Download] Success, size:', buffer.length);
    return buffer;
  } catch (err) {
    console.error('[Evolution Download] Error:', err);
    return null;
  }
}