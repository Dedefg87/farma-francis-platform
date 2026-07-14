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
    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    console.log('[Evolution Download] message/download success, size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('[Evolution Download] Unexpected error:', error);
    return null;
  }
}