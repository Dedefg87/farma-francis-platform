import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Usa variáveis S3_* (não valida no escopo global para não quebrar startup)
const endpoint = process.env.S3_ENDPOINT || "";
const formattedEndpoint = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;

// Cliente S3 para R2 (compatível com AWS S3)
export const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: formattedEndpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

/**
 * Faz upload de um arquivo para o Cloudflare R2
 * @param buffer - Conteúdo do arquivo como Buffer
 * @param originalName - Nome original do arquivo (será usado na chave)
 * @param mimetype - Tipo MIME do arquivo
 * @returns URL pública do arquivo no R2
 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<string> {
  // Gera chave única na pasta broadcast
  const fileKey = `broadcast/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;

  // Fazer upload
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: fileKey,
    Body: buffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  // URL pública (usa VITE_PUBLIC_R2_URL)
  const publicUrl = `${process.env.VITE_PUBLIC_R2_URL}/${fileKey}`;
  return publicUrl;
}

/**
 * Gera URL pré-assinada para acesso privado (não usado aqui, mas útil)
 */
export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}
