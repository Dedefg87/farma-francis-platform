/**
 * Profile Picture Service
 *
 * WhatsApp CDN URLs (pps.whatsapp.net) expire and block hotlinks — both from the
 * browser AND from server-side fetch. The only reliable way to obtain the bytes is
 * to proxy the download through the Evolution API instance (which holds the auth
 * session). We then upload the resolved bytes to Cloudflare R2 and store the
 * permanent public URL in the database.
 */

import { getDb } from '../db';
import { customers, receivedMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchEvolutionProfile } from '../messaging';
import { uploadToR2 } from '../r2-client';
import { downloadWhatsAppMediaFromEvolution } from './evolution-download';

/**
 * Generate initials for avatar fallback
 */
export function getCustomerInitials(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // Use last 4 digits or first letters
  if (cleanPhone.length >= 4) {
    return cleanPhone.slice(-4);
  }
  return 'USR';
}

/**
 * Downloads the client profile picture from Evolution API (via its authenticated
 * proxy) and uploads the bytes to R2. Updates the database tables with the static
 * R2 URL so the browser can render it without 403/hotlink issues.
 */
export async function downloadAndUploadProfilePic(
  phone: string,
  customerId: number
): Promise<string | null> {
  try {
    console.log(
      `[ProfilePic] Resolving profile picture for customer ${customerId} (phone: ${phone})...`
    );

    // 1. Ask Evolution for the profile picture URL / base64
    const profile = await fetchEvolutionProfile(phone);
    if (!profile || !profile.profilePicture) {
      console.log(
        `[ProfilePic] No profile picture available in Evolution for phone ${phone}`
      );
      return null;
    }

    const pictureRef = profile.profilePicture;
    let buffer: Buffer | null = null;
    let mimetype = 'image/jpeg';

    // 2a. Inline base64 data URL — decode directly
    if (pictureRef.startsWith('data:')) {
      const mimeMatch = pictureRef.match(/^data:([^;]+);base64,(.*)$/s);
      if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
        mimetype = mimeMatch[1];
        buffer = Buffer.from(mimeMatch[2], 'base64');
      } else {
        console.error('[ProfilePic] Invalid base64 profile picture format');
        return null;
      }
    } else {
      // 2b. Remote URL (WhatsApp CDN) — MUST be proxied through Evolution API.
      // Direct fetch from the server is blocked by WhatsApp hotlink protection.
      buffer = await downloadWhatsAppMediaFromEvolution({ url: pictureRef });

      if (!buffer) {
        // 2c. Fallback: some Evolution versions expose a dedicated picture endpoint
        try {
          const config = await getEvolutionConfig();
          if (config) {
            const picRes = await fetch(
              `${config.apiUrl}/chat/fetchProfilePicture/${config.instanceName}`,
              {
                method: 'POST',
                headers: {
                  apikey: config.apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ number: phone.replace(/\D/g, '') }),
                signal: AbortSignal.timeout(20000),
              }
            );
            if (picRes.ok) {
              const picData = await picRes.json();
              if (picData?.base64) {
                buffer = Buffer.from(picData.base64, 'base64');
                mimetype = picData.mimetype || 'image/jpeg';
              } else if (picData?.url || picData?.mediaUrl) {
                buffer = await downloadWhatsAppMediaFromEvolution({
                  url: picData.url || picData.mediaUrl,
                });
              }
            }
          }
        } catch (fbErr) {
          console.error('[ProfilePic] Fallback endpoint failed:', fbErr);
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      console.error(
        `[ProfilePic] Could not resolve profile picture bytes for phone ${phone}`
      );
      return null;
    }

    // 3. Upload resolved bytes to Cloudflare R2 (permanent public URL)
    console.log(
      `[ProfilePic] Uploading ${buffer.length} bytes (${mimetype}) to R2...`
    );
    const fileName = `profile-pics/profile-${customerId}-${Date.now()}.jpg`;
    const uploadResult = await uploadToR2(buffer, fileName, mimetype);

    if (!uploadResult || !uploadResult.url) {
      console.error('[ProfilePic] Failed to upload to R2');
      return null;
    }

    console.log(
      `[ProfilePic] Resolved to permanent R2 URL: ${uploadResult.url}`
    );

    // 4. Persist the public URL in the database
    const db = await getDb();
    if (!db) {
      console.error('[ProfilePic] DB unavailable, returning URL anyway');
      return uploadResult.url;
    }

    await db
      .update(customers)
      .set({ photoUrl: uploadResult.url })
      .where(eq(customers.id, customerId));

    await db
      .update(receivedMessages)
      .set({ fromProfilePic: uploadResult.url })
      .where(eq(receivedMessages.customerId, customerId));

    console.log(`[ProfilePic] DB updated for customer ${customerId}`);
    return uploadResult.url;
  } catch (error) {
    console.error(
      `[ProfilePic] Error resolving profile picture for customer ${customerId}:`,
      error
    );
    return null;
  }
}

/**
 * Lightweight helper to read Evolution config without duplicating the logic in
 * evolution-download (which is not exported from there).
 */
async function getEvolutionConfig(): Promise<{
  apiUrl: string;
  apiKey: string;
  instanceName: string;
} | null> {
  try {
    const { integrationSettings } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, 'evolution_api'))
      .limit(1);

    if (!row) return null;
    const cfg =
      typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    const apiUrl = cfg.apiUrl?.replace(/\/$/, '');
    const apiKey = cfg.apiKey || cfg.accessToken || cfg.token;
    const instanceName = cfg.instanceName || cfg.instance || 'Meu';
    if (!apiUrl || !apiKey || !instanceName) return null;
    return { apiUrl, apiKey, instanceName };
  } catch {
    return null;
  }
}
