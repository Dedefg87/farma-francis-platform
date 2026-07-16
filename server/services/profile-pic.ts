/**
 * Profile Picture Service
 *
 * WhatsApp CDN URLs (pps.whatsapp.net) expire and block hotlinks.
 * We store URLs as-is, but return fallback avatar URLs when they fail.
 */

import { getDb } from '../db';
import { customers, receivedMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchEvolutionProfile } from '../messaging';
import { uploadToR2 } from '../r2-client';

/**
 * Get a safe profile picture URL for display.
 * Returns a fallback avatar if the WhatsApp CDN URL would fail.
 */
export async function getSafeProfilePicUrl(
  customerPhone: string,
  photoUrl: string | null | undefined
): Promise<string> {
  // If no photo URL, return default placeholder
  if (!photoUrl) {
    return '/avatars/default-customer.png';
  }

  // WhatsApp CDN URLs are temporary and block hotlinks
  // Use a fallback service that generates avatars from phone numbers
  const isWhatsAppCdn = photoUrl.includes('whatsapp.net') || photoUrl.includes('whatsapp.com');
  
  if (isWhatsAppCdn) {
    // Generate deterministic avatar based on phone number
    // Using ui-avatars.com which is reliable and doesn't block
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const initials = cleanPhone.slice(-4) || 'user';
    return `https://ui-avatars.com/api/?name=${initials}&background=random&size=128`;
  }

  return photoUrl;
}

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
 * Downloads the client profile picture from Evolution API and uploads to R2.
 * Updates the database tables with the static R2 URL.
 */
export async function downloadAndUploadProfilePic(
  phone: string,
  customerId: number
): Promise<string | null> {
  try {
    console.log(`[ProfilePic] Downloading and uploading profile pic for customer ${customerId} (phone: ${phone})...`);
    
    // 1. Fetch profile pic from Evolution API
    const profile = await fetchEvolutionProfile(phone);
    if (!profile || !profile.profilePicture) {
      console.log(`[ProfilePic] No profile picture found in Evolution API for phone ${phone}`);
      return null;
    }

    const pictureUrl = profile.profilePicture;
    let buffer: Buffer;
    let mimetype = 'image/jpeg';

    // 2. Resolve buffer from base64 data URL or remote URL
    if (pictureUrl.startsWith('data:')) {
      const mimeMatch = pictureUrl.match(/^data:([^;]+);base64,(.*)$/s);
      if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
        mimetype = mimeMatch[1];
        buffer = Buffer.from(mimeMatch[2], 'base64');
      } else {
        throw new Error('Invalid base64 profile picture format');
      }
    } else {
      // It's a remote URL (most likely a secure/expires whatsapp cdn link)
      const res = await fetch(pictureUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch remote profile pic: ${res.statusText}`);
      }
      mimetype = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('Empypy profile picture buffer resolved');
    }

    // 3. Upload to R2 Cloudflare
    console.log(`[ProfilePic] Uploading resolved picture Buffer (${buffer.length} bytes, type ${mimetype}) to Cloudflare R2...`);
    const fileName = `profile-pics/profile-${customerId}-${Date.now()}.jpg`;
    const uploadResult = await uploadToR2(buffer, fileName, mimetype);
    
    if (!uploadResult || !uploadResult.url) {
      throw new Error('Failed to upload profile picture to R2');
    }

    console.log(`[ProfilePic] Resolved dynamic CDN profile pic to secure public R2 URL: ${uploadResult.url}`);

    // 4. Update Database
    const db = await getDb();
    if (!db) {
       console.error('[ProfilePic] Database connection unavailable to save profile pic URL');
       return uploadResult.url;
    }

    // Update customers table
    await db
      .update(customers)
      .set({ photoUrl: uploadResult.url })
      .where(eq(customers.id, customerId));

    // Update receivedMessages table to make sure it immediately updates in conversations view if queried from there
    await db
      .update(receivedMessages)
      .set({ fromProfilePic: uploadResult.url })
      .where(eq(receivedMessages.customerId, customerId));

    console.log(`[ProfilePic] Successfully updated customers and received_messages with R2 image URL: ${uploadResult.url}`);
    return uploadResult.url;

  } catch (error) {
    console.error(`[ProfilePic] Error downloading/uploading profile picture for customer ${customerId}:`, error);
    return null;
  }
}
