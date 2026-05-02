/**
 * Profile Picture Service
 *
 * Downloads WhatsApp profile pictures and uploads them to R2 Cloudflare.
 * This avoids 403 errors from pps.whatsapp.net when the browser tries
 * to load them directly.
 */

import { getDb } from '../db';
import { customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { uploadToR2 } from '../r2-client';
import { fetchEvolutionProfile } from '../messaging';

/**
 * Download a WhatsApp profile picture, upload to R2, and update the customer record.
 * Returns the R2 URL or null if failed.
 */
export async function downloadAndUploadProfilePic(
  customerPhone: string,
  customerId: number
): Promise<string | null> {
  try {
    // 1. Fetch profile from Evolution API
    const profile = await fetchEvolutionProfile(customerPhone);
    if (!profile?.profilePicture) {
      return null;
    }

    const profilePicUrl = profile.profilePicture;

    // 2. Check if already stored in R2 (not a whatsapp.net URL)
    if (
      !profilePicUrl.includes('whatsapp.net') &&
      !profilePicUrl.includes('whatsapp.com')
    ) {
      return profilePicUrl;
    }

    // 3. Download the image from WhatsApp CDN
    const imageResponse = await fetch(profilePicUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!imageResponse.ok) {

      return null;
    }

    // 4. Upload to R2
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType =
      imageResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';

    const result = await uploadToR2(
      buffer,
      `profile_${customerId}_${Date.now()}.${ext}`,
      contentType
    );

    // 5. Update customer record with R2 URL
    const db = await getDb();
    if (db) {
      await db
        .update(customers)
        .set({ photoUrl: result.url, updatedAt: new Date() })
        .where(eq(customers.id, customerId));
    }

    return result.url;
  } catch (err: unknown) {

    return null;
  }
}
