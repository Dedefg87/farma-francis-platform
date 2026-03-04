import React from 'react';
import { getMimeType, getMediaUrl } from '@/hooks/usePdfViewer';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File,
  Music,
  Film,
  Image,
  FileType
} from 'lucide-react';

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
 * Retorna o ícone e cor apropriada para cada tipo de arquivo
 */
function getFileIcon(mimeType: string, fileName: string | null): { icon: React.ReactNode; color: string; bgColor: string; label: string } {
  // Imagens
  if (mimeType.startsWith('image/')) {
    return {
      icon: <Image className="w-8 h-8" />,
      color: 'text-pink-500',
      bgColor: 'bg-pink-100',
      label: 'Imagem'
    };
  }

  // Vídeos
  if (mimeType.startsWith('video/')) {
    return {
      icon: <Film className="w-8 h-8" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100',
      label: 'Vídeo'
    };
  }

  // Áudios
  if (mimeType.startsWith('audio/')) {
    return {
      icon: <Music className="w-8 h-8" />,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Áudio'
    };
  }

  // PDF
  if (mimeType === 'application/pdf') {
    return {
      icon: <FileText className="w-8 h-8" />,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      label: 'PDF'
    };
  }

  // Word
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName?.endsWith('.doc') ||
    fileName?.endsWith('.docx')
  ) {
    return {
      icon: <FileText className="w-8 h-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      label: 'Word'
    };
  }

  // Excel
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv' ||
    fileName?.endsWith('.xls') ||
    fileName?.endsWith('.xlsx') ||
    fileName?.endsWith('.csv')
  ) {
    return {
      icon: <FileSpreadsheet className="w-8 h-8" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Excel'
    };
  }

  // PowerPoint
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName?.endsWith('.ppt') ||
    fileName?.endsWith('.pptx')
  ) {
    return {
      icon: <Presentation className="w-8 h-8" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      label: 'PowerPoint'
    };
  }

  // Arquivos compactados
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/gzip' ||
    fileName?.endsWith('.zip') ||
    fileName?.endsWith('.rar') ||
    fileName?.endsWith('.7z') ||
    fileName?.endsWith('.tar') ||
    fileName?.endsWith('.gz')
  ) {
    return {
      icon: <FileArchive className="w-8 h-8" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Compactado'
    };
  }

  // Código
  if (
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'text/html' ||
    mimeType === 'text/css' ||
    mimeType === 'text/javascript' ||
    fileName?.endsWith('.json') ||
    fileName?.endsWith('.js') ||
    fileName?.endsWith('.ts') ||
    fileName?.endsWith('.html') ||
    fileName?.endsWith('.css') ||
    fileName?.endsWith('.py') ||
    fileName?.endsWith('.java') ||
    fileName?.endsWith('.cpp') ||
    fileName?.endsWith('.c')
  ) {
    return {
      icon: <FileCode className="w-8 h-8" />,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100',
      label: 'Código'
    };
  }

  // Texto
  if (mimeType.startsWith('text/')) {
    return {
      icon: <FileType className="w-8 h-8" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: 'Texto'
    };
  }

  // Padrão
  return {
    icon: <File className="w-8 h-8" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Arquivo'
  };
}

/**
 * Formata tamanho do arquivo
 */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Renderiza mídia anexada a uma mensagem
 * - Imagens: preview clicável
 * - Vídeos: player inline
 * - Áudios: player inline
 * - PDFs: preview com botão de ampliar
 * - Outros: ícone + nome com botões
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
  const { icon, color, bgColor, label } = getFileIcon(mimeType, fileName);
  const size = formatFileSize(fileSize);

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isPdf = mimeType === 'application/pdf';

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
      <div className="relative group">
        <video
          src={mediaUrl}
          controls
          className="max-w-full rounded-lg max-h-64"
          preload="metadata"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Film className="w-3 h-3" />
          {size}
        </div>
      </div>
    );
  }

  // Áudio
  if (isAudio) {
    return (
      <div className={`rounded-lg p-3 ${isAgent ? 'bg-blue-600/20 border border-blue-400/30' : 'bg-white/20 border border-white/30'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-full ${bgColor}`}>
            <Music className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName || 'Áudio'}</p>
            <p className="text-xs opacity-70">{size || label}</p>
          </div>
        </div>
        <audio
          src={mediaUrl}
          controls
          className="w-full h-10"
          preload="metadata"
        />
      </div>
    );
  }

  // PDF com preview inline
  if (isPdf) {
    return (
      <div className="rounded-lg overflow-hidden border bg-white max-w-xs">
        <div
          className="h-32 overflow-hidden cursor-pointer relative"
          onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
        >
          <iframe
            src={mediaUrl}
            className="w-full h-full pointer-events-none"
            title={fileName || 'PDF'}
          />
          <div className="absolute inset-0 bg-transparent" />
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 border-t">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate max-w-[100px]">{fileName || 'PDF'}</p>
              <p className="text-xs text-gray-500">{size}</p>
            </div>
          </div>
          <button
            onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Abrir
          </button>
        </div>
      </div>
    );
  }

  // Outros documentos com ícone específico
  return (
    <div
      onClick={() => onDocumentClick?.(fileUrl, messageId, fileName || undefined)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isAgent
          ? 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30'
          : 'bg-white/20 hover:bg-white/30 border border-white/30'
      }`}
    >
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || 'Documento'}</p>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <span>{label}</span>
          {size && (
            <>
              <span>•</span>
              <span>{size}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-xs opacity-50">Clique para abrir</div>
    </div>
  );
}
