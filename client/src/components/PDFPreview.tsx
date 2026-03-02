import React, { useMemo, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, FileText } from "lucide-react";

interface PDFPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  messageId?: number;
}

function getMimeType(
  fileUrl: string | null | undefined,
  fileType: string | null | undefined
): string {
  if (fileUrl?.startsWith("data:")) {
    const mimeMatch = fileUrl.match(/^data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      return mimeMatch[1];
    }
  }
  return fileType || "";
}

export function PDFPreview({
  open,
  onOpenChange,
  url,
  fileName,
  messageId,
}: PDFPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Criar URL final quando o modal abrir
  useEffect(() => {
    if (!open) {
      // Limpar blob URL anterior
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    setLoading(true);
    setError(null);

    // Se tem messageId, usar endpoint de mídia (mais confiável)
    if (messageId) {
      console.log("[PDFPreview] Usando endpoint de mídia:", messageId);
      setBlobUrl(null);
      setLoading(false);
      return;
    }

    // Se é data URL, converter para blob
    if (url?.startsWith("data:")) {
      console.log("[PDFPreview] Convertendo data URL para blob...");
      try {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];

          // Fazer decode em chunks para evitar stack overflow
          const byteCharacters = atob(base64Data);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }

          const blob = new Blob([byteArray], { type: mimeType });
          const newBlobUrl = URL.createObjectURL(blob);
          console.log("[PDFPreview] Blob URL criada:", newBlobUrl);
          setBlobUrl(newBlobUrl);
          setLoading(false);
        } else {
          setError("Formato de data URL inválido");
          setLoading(false);
        }
      } catch (e) {
        console.error("[PDFPreview] Erro ao criar blob:", e);
        setError("Erro ao processar documento");
        setLoading(false);
      }
    } else if (url) {
      console.log("[PDFPreview] Usando URL direta:", url.substring(0, 100));
      setLoading(false);
    } else {
      setError("URL não fornecida");
      setLoading(false);
    }
  }, [open, url, messageId]);

  // Limpar blob URL ao desmontar
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // URL final para o iframe
  const finalUrl = useMemo(() => {
    if (messageId) {
      return `/api/media/${messageId}`;
    }
    if (blobUrl) {
      return blobUrl;
    }
    return url;
  }, [messageId, blobUrl, url]);

  // Verificar se é um documento que pode ser visualizado
  const canPreview = useMemo(() => {
    if (!finalUrl) return false;
    const mimeType = getMimeType(url, undefined);
    // PDFs e imagens podem ser visualizados
    return (
      mimeType === "application/pdf" ||
      mimeType.startsWith("image/") ||
      mimeType.startsWith("video/")
    );
  }, [finalUrl, url]);

  const handleDownload = () => {
    if (!finalUrl) return;
    const link = document.createElement("a");
    link.href = finalUrl;
    link.download = fileName || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    if (!finalUrl) return;
    window.open(finalUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {fileName || "Documento"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="gap-1"
                disabled={!finalUrl}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gap-1"
                disabled={!finalUrl}
              >
                <Download className="w-4 h-4" />
                Baixar
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 rounded-lg overflow-hidden border bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <span className="text-red-500">❌</span>
              <span>{error}</span>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 p-8">
              <FileText className="w-16 h-16 text-gray-400" />
              <div className="text-center">
                <p className="font-medium text-lg">
                  Pré-visualização não disponível
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Este tipo de arquivo não pode ser visualizado no navegador
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Use o botão Baixar para salvar o arquivo
                </p>
              </div>
              <Button onClick={handleDownload} className="gap-2 mt-4">
                <Download className="w-4 h-4" />
                Baixar {fileName || "arquivo"}
              </Button>
            </div>
          ) : finalUrl ? (
            <iframe
              key={finalUrl}
              src={finalUrl}
              className="w-full h-full"
              title={fileName || "PDF Preview"}
              onError={e => {
                console.error("[PDFPreview] Erro no iframe:", e);
                setError("Erro ao carregar documento");
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Não foi possível carregar o documento
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
