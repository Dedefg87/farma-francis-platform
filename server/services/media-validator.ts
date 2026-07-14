/**
 * Media Validator Service
 * 
 * Validação robusta de mídia baixada:
 * - Magic bytes (assinatura de arquivo)
 * - Tamanho mínimo por tipo
 * - Hashes MD5 + SHA256
 * - Detecção automática de MIME type
 * - Retry com backoff exponencial
 */

import crypto from 'crypto';

// Assinaturas de arquivo (magic bytes) por MIME type
const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/webp': [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
    new Uint8Array([0x57, 0x45, 0x42, 0x50])  // WEBP
  ],
  'video/mp4': [new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])], // ftyp
  'video/quicktime': [new Uint8Array([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70])],
  'audio/mpeg': [
    new Uint8Array([0x49, 0x44, 0x33]), // ID3
    new Uint8Array([0xFF, 0xFB])         // MP3 frame
  ],
  'audio/ogg': [new Uint8Array([0x4F, 0x67, 0x67, 0x53])], // OggS
  'audio/aac': [new Uint8Array([0xFF, 0xF1])], // ADTS
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
  'application/zip': [new Uint8Array([0x50, 0x4B, 0x03, 0x04])], // PK
};

export interface ValidatedMedia {
  buffer: Buffer;
  mimeType: string;
  fileSize: number;
  sha256: string;
  md5: string;
  extension: string;
}

const MIN_SIZES: Record<string, number> = {
  'image/jpeg': 100,
  'image/png': 100,
  'image/webp': 100,
  'video/mp4': 1000,
  'video/quicktime': 1000,
  'audio/mpeg': 500,
  'audio/ogg': 500,
  'audio/aac': 500,
  'application/pdf': 100,
};

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
};

export interface DownloadOptions {
  expectedMimeType?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Valida buffer de mídia: magic bytes, tamanho, hashes
 */
export function validateMediaBuffer(buffer: Buffer, expectedMimeType?: string): ValidatedMedia {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer vazio');
  }

  // 1. Detectar MIME type pelos magic bytes
  const detectedMime = detectMimeFromMagicBytes(buffer);
  
  if (expectedMimeType && detectedMime !== expectedMimeType) {
    console.warn(`[MediaValidator] MIME mismatch: expected ${expectedMimeType}, detected ${detectedMime}`);
  }

  // 2. Verificar tamanho mínimo
  const minSize = MIN_SIZES[detectedMime] || 50;
  if (buffer.length < minSize) {
    throw new Error(`Arquivo muito pequeno (${buffer.length} bytes) para ${detectedMime}, mínimo ${minSize}`);
  }

  // 3. Calcular hashes
  const md5 = crypto.createHash('md5').update(buffer).digest('hex');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 4. Extensão baseada no MIME real detectado
  const extension = EXTENSION_MAP[detectedMime] || 'bin';

  return {
    buffer,
    mimeType: detectedMime,
    fileSize: buffer.length,
    sha256,
    md5,
    extension,
  };
}

function detectMimeFromMagicBytes(buffer: Buffer): string {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(sig)) {
        return mime;
      }
    }
  }
  return 'application/octet-stream';
}

/**
 * Verifica se URL é de CDN do WhatsApp (hotlink protected)
 */
export function isWhatsAppCdnUrl(url: string): boolean {
  return url.includes('mmg.whatsapp.net') || 
         url.includes('pps.whatsapp.net') || 
         url.includes('whatsapp.net') || 
         url.includes('whatsapp.com');
}

/**
 * Verifica se URL é de CDN do Instagram/Facebook (hotlink protected)
 */
export function isInstagramCdnUrl(url: string): boolean {
  return url.includes('fbcdn.net') || 
         url.includes('scontent') || 
         url.includes('instagram.com') || 
         url.includes('ig.gg') ||
         url.includes('cdninstagram.com');
}

/**
 * Download com validação completa e retry
 */
export async function downloadWithValidation(
  url: string,
  options: DownloadOptions = {}
): Promise<ValidatedMedia> {
  const { expectedMimeType, maxRetries = 3, timeoutMs = 30000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'FarmaFrancisBot/1.0',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verificar Content-Length se disponível
      const contentLength = response.headers.get('content-length');
      const expectedSize = contentLength ? parseInt(contentLength, 10) : null;

      // Verificar Content-Type da resposta
      const responseMime = response.headers.get('content-type')?.split(';')[0]?.trim();
      const mimeToValidate = expectedMimeType || responseMime || undefined;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validar tamanho se Content-Length presente
      if (expectedSize && buffer.length !== expectedSize) {
        throw new Error(`Tamanho incompleto: esperado ${expectedSize}, recebido ${buffer.length}`);
      }

      // Validação completa do buffer
      return validateMediaBuffer(buffer, mimeToValidate);
      
    } catch (err) {
      lastError = err as Error;
      console.warn(`[MediaValidator] Tentativa ${attempt}/${maxRetries} falhou: ${err.message}`);
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // backoff linear
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Download falhou após todas as tentativas');
}

/**
 * Calcula MD5 em base64 (para header Content-MD5 do S3/R2)
 */
export function calculateContentMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('base64');
}

/**
 * Calcula SHA256 hex
 */
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}