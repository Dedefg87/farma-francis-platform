/**
 * Get image source URL.
 *
 * WhatsApp CDN URLs (pps.whatsapp.net, mmg.whatsapp.net) block direct
 * browser access with 403. Profile pictures are now uploaded to R2
 * automatically by profile-pic.ts, so new customers won't have these URLs.
 * 
 * For legacy customers with WhatsApp CDN URLs, we proxy through /api/media/:messageId
 * (for messages) or /api/media/proxy?url=... (for profile photos without messageId).
 */

export function getImageSrc(
  url: string | null | undefined,
  messageId?: number
): string {
  if (!url) return "";

  // Data URLs are fine as-is
  if (url.startsWith("data:")) {
    return url;
  }

  // WhatsApp CDN block direct browser access with 403
  const isWhatsAppCdn = /whatsapp\.net|whatsapp\.com/.test(url);
  
  if (isWhatsAppCdn) {
    // If we have a messageId, use the message-based proxy
    if (messageId) {
      return `/api/media/${messageId}`;
    }
    // Otherwise use the URL-based proxy for profile photos
    return `/api/media/proxy?url=${encodeURIComponent(url)}`;
  }

  // R2 and other public URLs are fine
  if (url.startsWith("http")) {
    return url;
  }

  // Relative paths → R2 public URL
  const r2Base =
    import.meta.env.VITE_PUBLIC_R2_URL ||
    "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev";
  const cleanUrl = url.replace(/^\//, "");
  return `${r2Base.replace(/\/$/, "")}/${cleanUrl}`;
}