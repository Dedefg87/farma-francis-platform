/**
 * Profile Picture Service
 *
 * Downloads WhatsApp profile pictures and uploads them to R2 Cloudflare.
 * Uses Evolution API's internal proxy to avoid 403 errors from pps.whatsapp.net.
 */

import { getDb } from '../db';
import { customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { uploadToR2 } from '../r2-client';

async function getEvolutionConfig() {
  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(customers) // Wrong table, but keeping for reference - actual config in integrationSettings
    .limit(1);

  // Actually get from integrationSettings
  const [integration] = await db
    .select()
    .from(require('../../drizzle/schema').integrationSettings)
    .where(eq(require('../../drizzle/schema').integrationSettings.integrationType, 'evolution_api'))
    .limit(1);

  if (!integration) return null;

  const configData = typeof integration.config === 'string' 
    ? JSON.parse(integration.config) 
    : integration.config;

  return {
    apiUrl: (configData.apiUrl as string)?.replace(/\/$/, ''),
    apiKey: configData.apiKey || configData.accessToken,
    instanceName: configData.instanceName,
  };
}

/**
 * Download WhatsApp profile picture using Evolution API's authenticated endpoint
 * This uses the internal WhatsApp session to avoid hotlink protection
 */
async function downloadProfilePicWithEvolution(phoneNumber: string): Promise<Buffer | null> {
  const config = await getEvolutionConfig();
  if (!config) {
    console.log('[ProfilePic] No Evolution API config found');
    return null;
  }

  // Try /chat/wfetchProfilePicture first (uses internal WhatsApp session)
  // This is the authenticated endpoint that doesn't get blocked
  try {
    const response = await fetch(
      `${config.apiUrl}/chat/wfetchProfilePicture/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phoneNumber.replace(/\D/g, ''), // Remove non-digits, keep only phone digits
        }),
      }
    );

    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      // Check if we got an image
      const buffer = Buffer.from(await response.arrayBuffer());
      
      if (buffer.length > 0 && !buffer.toString('utf8', 0, 50).includes('error')) {
        console.log('[ProfilePic] Downloaded via wfetchProfilePicture, size:', buffer.length, 'contentType:', contentType);
        return buffer;
      }
    }
    console.log('[ProfilePic] wfetchProfilePicture failed, status:', response.status);
  } catch (err) {
    console.log('[ProfilePic] wfetchProfilePicture error:', err);
  }

  // Fallback: Try fetchProfilePictureUrl + download (may still fail due to hotlink)
  try {
    const profileResponse = await fetch(
      `${config.apiUrl}/chat/fetchProfilePictureUrl/${config.instanceName}`,
      {
        method: 'POST',
        headers: {
          apikey: config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phoneNumber.replace(/\D/g, ''),
        }),
      }
    );

    if (profileResponse.ok) {
      const data = await profileResponse.json();
      const picUrl = data.profilePictureUrl;
      
      if (picUrl && (picUrl.includes('whatsapp.net') || picUrl.includes('whatsapp.com'))) {
        // Try download with special headers
        const dlResponse = await fetch(picUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (dlResponse.ok) {
          return Buffer.from(await dlResponse.arrayBuffer());
        }
      }
    }
  } catch (err) {
    console.log('[ProfilePic] Fallback fetchProfilePictureUrl error:', err);
  }

  return null;
}

/**
 * Download a WhatsApp profile picture, upload to R2, and update the customer record.
 * Returns the R2 URL or null if failed.
 */
export async function downloadAndUploadProfilePic(
  customerPhone: string,
  customerId: number
): Promise<string | null> {
  try {
    const buffer = await downloadProfilePicWithEvolution(customerPhone);
    
    if (!buffer) {
      console.log('[ProfilePic] No buffer received for', customerPhone);
      return null;
    }

    // Upload to R2
    const ext = 'jpg'; // Default, could be detected from magic bytes
    const contentType = 'image/jpeg'; // Could be detected too

    const result = await uploadToR2(
      buffer,
      `profile_${customerId}_${Date.now()}.${ext}`,
      contentType
    );

    console.log('[ProfilePic] Uploaded to R2:', result.url);

    // Update customer record with R2 URL
    const db = await getDb();
    if (db) {
      await db
        .update(customers)
        .set({ photoUrl: result.url, updatedAt: new Date() })
        .where(eq(customers.id, customerId));
    }

    return result.url;
  } catch (err: unknown) {
    console.error('[ProfilePic] Error:', err);
    return null;
  }
}