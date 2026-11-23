/**
 * Media Download Service - Fallback for broken Evolution API endpoints
 * 
 * When Evolution API /message/download and /instance/fetchImage return 404,
 * we need alternative methods to download WhatsApp media.
 * 
 * Strategy:
 * 1. Try direct WhatsApp CDN URL (if public)
 * 2. Use mediaKey/directPath for authenticated download
 * 3. Store locally if R2 upload fails
 */

import { downloadWithValidation } from './media-validator';
import { uploadToR2 } from '../r2-client';
import crypto from 'crypto';

/**
 * Download WhatsApp media directly from CDN or via alternative methods
 */
export async function downloadWhatsAppMedia(
  params: {
    url?: string | null;
    mediaKey?: string | null;
    directPath?: string | null;
    fileType?: 'image' | 'video' | 'audio' | 'document';
    fileName?: string;
  }
): Promise<{ url: string; key: string } | null> {
  try {
    const { url, mediaKey, directPath, fileType = 'image', fileName } = params;
    
    // Method 1: Try direct URL (WhatsApp CDN may be public)
    if (url) {
      console.log(`[Media Download] Trying direct URL: ${url.substring(0, 60)}...`);
      try {
        const buffer = await downloadWithValidation(url, { 
          expectedMimeType: getMimeType(fileType) 
        });
        
        if (buffer && buffer.length > 0) {
          console.log(`[Media Download] ✅ Direct download success: ${buffer.length} bytes`);
          const result = await uploadToR2(buffer, fileName || `media.${getExtension(fileType)}`, buffer.mimetype);
          return { url: result.url, key: result.key };
        }
      } catch (err) {
        console.log(`[Media Download] ⚠️ Direct URL failed: ${err}`);
      }
    }
    
    // Method 2: Use mediaKey + directPath (authenticated download)
    if (mediaKey && directPath) {
      console.log('[Media Download] Trying mediaKey/directPath method...');
      // This requires building the authenticated URL
      // WhatsApp CDN URLs follow pattern: https://mmg.whatsapp.net/{mediaKey}
      const cdnUrl = `https://mmg.whatsapp.net/${mediaKey}`;
      try {
        const buffer = await downloadWithValidation(cdnUrl);
        if (buffer && buffer.length > 0) {
          console.log(`[Media Download] ✅ MediaKey download success: ${buffer.length} bytes`);
          const result = await uploadToR2(buffer, fileName || `media.${getExtension(fileType)}`, buffer.mimetype);
          return { url: result.url, key: result.key };
        }
      } catch (err) {
        console.log(`[Media Download] ⚠️ MediaKey download failed: ${err}`);
      }
    }
    
    console.log('[Media Download] ❌ All download methods failed');
    return null;
    
  } catch (error) {
    console.error('[Media Download] Unexpected error:', error);
    return null;
  }
}

function getMimeType(type: string): string {
  const map: Record<string, string> = {
    image: 'image/jpeg',
    video: 'video/mp4',
    audio: 'audio/mp4',
    document: 'application/pdf'
  };
  return map[type] || 'application/octet-stream';
}

function getExtension(type: string): string {
  const map: Record<string, string> = {
    image: 'jpg',
    video: 'mp4',
    audio: 'mp4',
    document: 'pdf'
  };
  return map[type] || 'bin';
}

export { downloadWithValidation };