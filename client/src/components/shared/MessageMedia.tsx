import React from 'react';
import { getMimeType, getMediaUrl } from '@/hooks/usePdfViewer';

interface MessageMediaProps {
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize?: number | null;
  messageId?: number;
  onImageClick?: (url: string, id?: number) => void;
  onDocumentClick?: (url: string, id?: number, name?: string) => void;
  isAgent?: boolean;
}

/**
 * Renderiza mídia anexada a uma mensagem
 * - Imagens: preview clicável
 * - Vídeos: player inline
 * - PDFs: preview com botão de ampliar
 * - Outros: ícone + nome
 */
export function MessageMedia({
  fileUrl,
  fileType,
  fileName,
  fileSize,
  messageId,
  onImageClick,
  onDocumentClick,
  isAgent = false,
}: MessageMediaProps) {
  if (!fileUrl) return null;

  const mimeType = getMimeType(fileUrl, fileType);
  const mediaUrl = getMediaUrl(fileUrl, messageId);

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isPdf = mimeType === 'application/pdf';
  const isDocument = mimeType.startsWith('application/') || mimeType.startsWith('text/');
  const isOther = !isImage && !isVideo && !isDocument;

  // Imagem
  if (isImage) {
    return (
      <div className="relative group">
        <img
          src={mediaUrl}
          alt={fileName || 'Imagem'}
          className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer"
          onClick={() => onImageClick?.(fileUrl, messageId)}
          onError={(e) => {
            const el = e.currentTarget;
            el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==';
            el.alt = 'Imagem indisponível';
          }}
        />
      </div>
    );
  }

  // Vídeo
  if (isVideo) {
    return (
      <video
        src={mediaUrl}
        controls
        className="max-w-full rounded-lg max-h-64"
      />
    );
  }

  // PDF com preview inline
  if (isPdf) {
    return (
      <div className="rounded-lg overflow-hidden border bg-white max-w-xs">
        <div
          className="h-32 overflow-hidden cursor-pointer"
          onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
        >
          <iframe
            src={mediaUrl}
            className="w-full h-full pointer-events-none"
            title={fileName || 'PDF'}
          />
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 border-t">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="text-xs font-medium truncate max-w-[100px]">
              {fileName || 'PDF'}
            </span>
          </div>
          <button
            onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Ampliar
          </button>
        </div>
      </div>
    );
  }

  // Outros documentos
  return (
    <div
      onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isAgent
          ? 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30'
          : 'bg-white/20 hover:bg-white/30 border border-white/30'
      }`}
    >
      <span className="text-3xl">📄</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || 'Documento'}</p>
        {fileSize && (
          <p className="text-xs opacity-70">
            {(fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
    </div>
  );
}
