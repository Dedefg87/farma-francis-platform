/**
 * Get image source URL.
 *
 * WhatsApp CDN URLs (pps.whatsapp.net, mmg.whatsapp.net) block direct
 * browser access with 403. Profile pictures are now replaced with
 * ui-avatars.com placeholders to avoid blocking.
 */

export function getImageSrc(
  url: string | null | undefined,
  _messageId?: number
): string {
  if (!url) return "";

  // Data URLs are fine as-is
  if (url.startsWith("data:")) {
    return url;
  }

  // WhatsApp CDN blocks direct browser access with 403
  // Replace with ui-avatars.com placeholder (reliable, no blocking)
  const isWhatsAppCdn = /whatsapp\.net|whatsapp\.com/.test(url);
  
  if (isWhatsAppCdn) {
    // Generate deterministic avatar from URL hash
    const hash = url.split("/").pop()?.replace(/\W/g, "")?.slice(-6) || Math.random().toString(36).substr(2, 6);
    return `https://ui-avatars.com/api/?name=${hash}&background=random&size=128&rounded=true`;
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