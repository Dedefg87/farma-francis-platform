/**
 * Get image source URL with WhatsApp CDN proxy support.
 *
 * WhatsApp profile pictures (pps.whatsapp.net, mmg.whatsapp.net) block
 * direct browser access with 403. This function routes them through our
 * backend proxy instead.
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

  // WhatsApp CDN URLs must be proxied (403 if loaded directly)
  if (
    url.startsWith("https://pps.whatsapp.net/") ||
    url.startsWith("https://mmg.whatsapp.net/")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }

  // Other absolute URLs are fine as-is
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
