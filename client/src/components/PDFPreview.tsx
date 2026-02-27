import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ExternalLink } from "lucide-react";

interface PDFPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  messageId?: number;
}

export function PDFPreview({ open, onOpenChange, url, fileName, messageId }: PDFPreviewProps) {
  // Construir URL final - usar endpoint de mídia se tiver messageId
  const getFinalUrl = () => {
    if (url?.startsWith('data:')) {
      // Para data URLs, criar blob URL para o iframe
      try {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          return URL.createObjectURL(blob);
        }
      } catch (e) {
        console.error("[PDFPreview] Erro ao criar blob:", e);
      }
    }
    // Usar endpoint de mídia
    if (messageId) {
      return `/api/media/${messageId}`;
    }
    return url;
  };

  const finalUrl = getFinalUrl();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = fileName || 'documento.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    window.open(finalUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {fileName || "Documento PDF"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                Baixar
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden border bg-gray-100">
          {finalUrl ? (
            <iframe
              src={finalUrl}
              className="w-full h-full"
              title={fileName || "PDF Preview"}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Não foi possível carregar o documento
            </div>
          )}
        </div>
      </DialogContent>
  );
}
