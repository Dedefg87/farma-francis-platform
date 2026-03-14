import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuração do R2/Cloudflare
const R2_ENDPOINT = process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || process.env.CLOUDFLARE_BUCKET;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error(
    "R2 configuration missing. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET environment variables."
  );
}

// Cliente S3 para R2 (compatível com AWS S3)
export const r2Client = new S3Client({
  region: "auto", // R2 usa 'auto' como região
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Faz upload de um arquivo para o Cloudflare R2
 * @param buffer - Conteúdo do arquivo como Buffer
 * @param fileName - Nome original do arquivo (será usado na chave)
 * @param mimeType - Tipo MIME do arquivo
 * @returns URL pública do arquivo no R2
 */
export async function uploadToR2(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  // Gerar chave única: broadcast-temp/timestamp-random.ext
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split(".").pop() || "bin";
  const key = `broadcast-temp/${timestamp}-${random}.${ext}`;

  // Fazer upload
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);

  // URL pública (R2 usa o endpoint público)
  const publicUrl = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  return publicUrl;
}

/**
 * Gera URL pré-assinada para acesso privado (não usado aqui, mas útil)
 */
export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return url;
}
