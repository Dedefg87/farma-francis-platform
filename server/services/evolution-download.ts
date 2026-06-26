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
  messageKey: string | { id: string; fromMe?: boolean; remoteJid: string }
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
    
    // Format messageKey for Evolution API - supports both string and object formats
    const keyPayload = typeof messageKey === 'string'
      ? { messageKey }
      : {
          messageKey: {
            id: messageKey.id,
            fromMe: messageKey.fromMe ?? false,
            remoteJid: messageKey.remoteJid
          }
        };
    
    const keyDisplay = typeof messageKey === 'string' 
      ? messageKey.substring(0, 30) + '...' 
      : `id=${messageKey.id}, remoteJid=${messageKey.remoteJid}`;
    
    console.log('[Evolution Download] Calling authenticated endpoint:', {
      messageKey: keyDisplay,
    });

    const response = await fetch(downloadUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(keyPayload),
    });

    if (!response.ok) {
      console.log('[Evolution Download] Failed:', response.status, response.statusText);
      const errorBody = await response.text();
      console.log('[Evolution Download] Error body:', errorBody.substring(0, 200));
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