/**
 * Profile Picture Service
 *
 * WhatsApp CDN URLs (pps.whatsapp.net) expire and block hotlinks.
 * We store URLs as-is, but return fallback avatar URLs when they fail.
 */

import { getDb } from '../db';
import { customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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