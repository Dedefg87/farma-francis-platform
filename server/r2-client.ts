import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadToR2(buffer: Buffer, originalName: string, mimetype: string) {
  // Conexão direta e forçada ignorando o process.env do Railway
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: 'debc3a713faeb6d442dab499221ba42f',
      secretAccessKey: 'c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c',
    },
  });

  // Limpa o nome do arquivo para evitar quebras de link
  const fileKey = `broadcast/${Date.now()}-${originalName.replace(/\s+/g, '_')}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: 'farmafranciswhatsappmedia',
    Key: fileKey,
    Body: buffer,
    ContentType: mimetype,
  }));

  return { url: `https://pub-33c481f0a9e94adb8870472308f49471.r2.dev/${fileKey}` };
}
