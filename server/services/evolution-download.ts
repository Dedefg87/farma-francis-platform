/**
 * Evolution API Media Download Service
 *
 * Uses the Evolution API /message/downloadMedia endpoint which handles
 * WhatsApp authentication internally, avoiding 403 hotlink blocks.
 */

import { getDb } from '../db';
import { integrationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function downloadWhatsAppMediaFromEvolution(
  messageKey: string
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

    // Evolution API endpoint for authenticated download
    const downloadUrl = `${apiUrl}/message/downloadMedia/${instanceName}`;
    
    console.log('[Evolution Download] Calling authenticated endpoint:', {
      messageKey: messageKey.substring(0, 30) + '...',
    });

    const response = await fetch(downloadUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageKey: messageKey, // Baileys message key format
      }),
    });

    if (!response.ok) {
      console.log('[Evolution Download] Failed:', response.status, response.statusText);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('[Evolution Download] Success, size:', buffer.length);
    return buffer;
  } catch (err) {
    console.error('[Evolution Download] Error:', err);
    return null;
  }
}