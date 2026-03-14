import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  const endpoint = process.env.S3_ENDPOINT || "";

  // Trava de segurança
  if (!endpoint) {
    throw new Error("S3_ENDPOINT não está carregado nas variáveis de ambiente do processo.");
  }

  const formattedEndpoint = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;

  // Cliente S3 inicializado apenas quando a função é chamada (garante que process.env existe)
  const s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: formattedEndpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "",
      secretAccessKey: process.env.S3_SECRET_KEY || "",
    },
  });

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
  const endpoint = process.env.S3_ENDPOINT || "";

  if (!endpoint) {
    throw new Error("S3_ENDPOINT não está carregado nas variáveis de ambiente do processo.");
  }

  const formattedEndpoint = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;

  const s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: formattedEndpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "",
      secretAccessKey: process.env.S3_SECRET_KEY || "",
    },
  });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}
