import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'debc3a713faeb6d442dab499221ba42f',
    secretAccessKey: 'c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c',
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export interface UploadResult {
  url: string;
  key: string;
  etag: string;
  size: number;
  contentType: string;
}

/**
 * Upload validado para R2 com verificação de integridade:
 * - Envia Content-MD5 no header (R2 valida no recebimento)
 * - Verifica ETag retornado vs hash local (MD5)
 * - Retorna metadados completos para auditoria
 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<UploadResult> {
  // 1. Validação prévia
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer vazio - upload abortado');
  }

  // 2. Calcular MD5 local para Content-MD5 header
  const contentMD5 = crypto.createHash('md5').update(buffer).digest('base64');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const localMd5Hex = crypto.createHash('md5').update(buffer).digest('hex');

  // 3. Gerar key única
  const ext = originalName.split('.').pop() || 'bin';
  const fileKey = `media/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  // 4. Upload com Content-MD5 (R2 valida integridade no recebimento)
  const command = new PutObjectCommand({
    Bucket: 'farmafranciswhatsappmedia',
    Key: fileKey,
    Body: buffer,
    ContentType: mimetype,
    ContentMD5: contentMD5,
    Metadata: {
      'original-name': originalName,
      'sha256': sha256,
      'uploaded-at': new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // 5. Verificação pós-upload via HEAD (confirma ETag)
  const headCmd = new HeadObjectCommand({ Bucket: 'farmafranciswhatsappmedia', Key: fileKey });
  const headResult = await s3Client.send(headCmd);

  const r2Etag = headResult.ETag?.replace(/"/g, ''); // R2 retorna ETag com aspas

  if (r2Etag && r2Etag !== localMd5Hex) {
    console.error('[R2 Upload] ⚠️ ETag mismatch!', { r2Etag, localMd5Hex, fileKey });
    throw new Error('Falha de integridade: ETag do R2 não confere com hash local');
  }

  const publicUrl = `https://pub-33c481f0a9e94adb8870472308f49471.r2.dev/${fileKey}`;

  console.log('[R2 Upload] ✅ Sucesso:', { fileKey, size: buffer.length, etag: r2Etag });

  return {
    url: publicUrl,
    key: fileKey,
    etag: r2Etag || localMd5Hex,
    size: buffer.length,
    contentType: mimetype,
  };
}

/**
 * Extrai a key do objeto R2 de uma URL pública
 */
export function extractR2Key(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.includes("pub-33c481f0a9e94adb8870472308f49471.r2.dev")) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(1).join("/");
    } catch {
      return null;
    }
  }
  // Non-R2 paths (e.g. evolution-api/...): return as-is so getMediaAsBase64 can handle them
  if (!url.startsWith("http") && !url.startsWith("data:")) return url;
  // HTTP URLs: return as-is, getMediaAsBase64 will fetch via HTTP
  return url;
}

/**
 * Verifica se URL já é do nosso R2
 */
export function isR2Url(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('.r2.') || 
         url.includes('r2.cloudflarestorage.com') || 
         url.includes('.r2.dev') ||
         url.includes('pub-33c481f0a9e94adb8870472308f49471.r2.dev');
}