/**
 * Get image source URL.
 *
 * WhatsApp CDN URLs (pps.whatsapp.net, mmg.whatsapp.net) block direct
 * browser access with 403. Profile pictures are now uploaded to R2
 * automatically by profile-pic.ts, so new customers won't have these URLs.
 * 
 * For legacy customers with WhatsApp CDN URLs, we return the URL as-is
 * (will show a fallback avatar in the UI).
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

  // R2 and other public URLs are fine
  if (url.startsWith("http")) {
    // WhatsApp CDN URLs won't load in browser (403)
    // Profile pics should be on R2 now, but legacy ones may still exist
    // Return as-is — the Avatar component will show fallback if it fails
    return url;
  }

  // Relative paths → R2 public URL
  const r2Base =
    import.meta.env.VITE_PUBLIC_R2_URL ||
    "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev";
  const cleanUrl = url.replace(/^\//, "");
  return `${r2Base.replace(/\/$/, "")}/${cleanUrl}`;
}
