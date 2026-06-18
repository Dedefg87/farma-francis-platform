// Script para atualizar MessageMedia.tsx para suporte a stories citados
const fs = require('fs');
const path = require('path');

const mediaPath = path.join(__dirname, 'client/src/components/shared/MessageMedia.tsx');
let content = fs.readFileSync(mediaPath, 'utf8');

// Atualizar interface para incluir props de quoted
const oldInterface = `interface MessageMediaProps {
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize?: number | null;
  messageId?: number;
  onImageClick?: (url: string, id?: number) => void;
  onDocumentClick?: (url: string, id?: number, name?: string) => void;
  isAgent?: boolean;
}`;

const newInterface = `interface MessageMediaProps {
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize?: number | null;
  messageId?: number;
  onImageClick?: (url: string, id?: number) => void;
  onDocumentClick?: (url: string, id?: number, name?: string) => void;
  isAgent?: boolean;
  // Props para renderizar story citado (resposta a stories)
  quotedMediaUrl?: string | null;
  quotedMimeType?: string | null;
  quotedCaption?: string | null;
  quotedFileUrl?: string | null;
}`;

content = content.replace(oldInterface, newInterface);

// Atualizar a função MessageMedia para aceitar novos props
const oldFunction = `export function MessageMedia({
  fileUrl,
  fileType,
  fileName,
  fileSize,
  messageId,
  onImageClick,
  onDocumentClick,
  isAgent = false,
}: MessageMediaProps) {`;

const newFunction = `export function MessageMedia({
  fileUrl,
  fileType,
  fileName,
  fileSize,
  messageId,
  onImageClick,
  onDocumentClick,
  isAgent = false,
  quotedMediaUrl,
  quotedMimeType,
  quotedCaption,
  quotedFileUrl,
}: MessageMediaProps) {
  // Renderizar story citado se existir (resposta a stories)
  const quotedMediaSrc = quotedMediaUrl ? getMediaSrc(quotedMediaUrl, messageId) : null;
  const quotedIsImage = quotedMimeType?.startsWith?.('image/');
  const quotedIsVideo = quotedMimeType?.startsWith?.('video/');

  // Story citado - renderizar acima da mensagem
  const quotedStory = quotedCaption || quotedMediaUrl ? (
    <div className="mb-2 p-2 bg-gray-100 rounded-lg border-l-4 border-l-green-500">
      <p className="text-xs text-gray-500 mb-1">Respondeu ao Story:</p>
      {quotedIsImage && quotedMediaSrc ? (
        <img
          src={quotedMediaSrc}
          alt="Story respondido"
          className="max-w-full rounded max-h-32 object-cover cursor-pointer"
          onClick={() => onImageClick?.(quotedMediaSrc, messageId)}
        />
      ) : quotedIsVideo && quotedMediaSrc ? (
        <video
          src={quotedMediaSrc}
          controls
          className="max-w-full rounded max-h-32"
          preload="metadata"
        />
      ) : quotedCaption ? (
        <p className="text-xs italic text-gray-700">{quotedCaption}</p>
      ) : null}
    </div>
  ) : null;`;

content = content.replace(oldFunction, newFunction);

// Envolver o retorno com o quotedStory acima
const oldReturnWrapper = `  if (!fileUrl) return null;`;
const newReturnWrapper = `  if (!fileUrl && !quotedCaption && !quotedMediaUrl) return null;

  // Renderizar apenas o quoted story se não houver fileUrl
  if (!fileUrl && quotedStory) {
    return quotedStory;
  }`;

content = content.replace(oldReturnWrapper, newReturnWrapper);

// Adicionar quotedStory antes do retorno normal
const fileUrlSection = `  const isImage = mimeType?.startsWith?.('image/');`;
const quotedStoryInsert = `  const isImage = mimeType?.startsWith?.('image/');

  // Inserir story citado antes do conteúdo principal
  const renderQuotedStory = () => {
    if (!quotedCaption && !quotedMediaUrl) return null;
    return quotedStory;
  };`;

content = content.replace(fileUrlSection, quotedStoryInsert);

// Atualizar o render para incluir quotedStory antes do conteúdo
const imageDiv = `  // Imagem
  if (isImage) {
    return (
      <div className="relative group">`;
const imageDivNew = `  // Imagem
  if (isImage) {
    return (
      <div className="relative group">
        {renderQuotedStory()}
        <img`;

content = content.replace(imageDiv, imageDivNew);

fs.writeFileSync(mediaPath, content);
console.log('MessageMedia.tsx atualizado para suporte a stories citados!');