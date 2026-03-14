import React from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, Video } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  preview: string | null;
  onRemove: () => void;
}

/**
 * Preview de arquivo selecionado antes de enviar
 * Mostra thumbnail para imagens/vídeos, ícone para documentos
 */
export function FilePreviewAttachment({ file, preview, onRemove }: FilePreviewProps) {
  const isVideo = file.type?.startsWith?.('video/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-16 h-16 object-cover rounded"
          />
        ) : isVideo ? (
          <div className="w-16 h-16 bg-purple-100 rounded flex items-center justify-center">
            <Video className="w-8 h-8 text-purple-500" />
          </div>
        ) : isPdf ? (
          <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
            <span className="text-2xl">📄</span>
          </div>
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-gray-500">
            {file.type || 'Arquivo'} • {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
