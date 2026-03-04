import React, { useMemo, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  ExternalLink,
  Loader2,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  FileCode,
  File,
  Music,
  Film,
  Image,
  FileType,
  Eye
} from "lucide-react";

interface PDFPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  messageId?: number;
  fileType?: string;
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

/**
 * Retorna informações do arquivo baseado no tipo
 */
function getFileInfo(mimeType: string, fileName: string | null): {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  canPreview: boolean;
} {
  // Imagens
  if (mimeType.startsWith("image/")) {
    return {
      icon: <Image className="w-16 h-16" />,
      color: "text-pink-500",
      bgColor: "bg-pink-100",
      label: "Imagem",
      canPreview: true,
    };
  }

  // Vídeos
  if (mimeType.startsWith("video/")) {
    return {
      icon: <Film className="w-16 h-16" />,
      color: "text-purple-500",
      bgColor: "bg-purple-100",
      label: "Vídeo",
      canPreview: true,
    };
  }

  // Áudios
  if (mimeType.startsWith("audio/")) {
    return {
      icon: <Music className="w-16 h-16" />,
      color: "text-green-500",
      bgColor: "bg-green-100",
      label: "Áudio",
      canPreview: true,
    };
  }

  // PDF
  if (mimeType === "application/pdf") {
    return {
      icon: <FileText className="w-16 h-16" />,
      color: "text-red-500",
      bgColor: "bg-red-100",
      label: "PDF",
      canPreview: true,
    };
  }

  // Word
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName?.endsWith(".doc") ||
    fileName?.endsWith(".docx")
  ) {
    return {
      icon: <FileText className="w-16 h-16" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      label: "Word",
      canPreview: false,
    };
  }

  // Excel
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv" ||
    fileName?.endsWith(".xls") ||
    fileName?.endsWith(".xlsx") ||
    fileName?.endsWith(".csv")
  ) {
    return {
      icon: <FileSpreadsheet className="w-16 h-16" />,
      color: "text-green-600",
      bgColor: "bg-green-100",
      label: "Excel",
      canPreview: false,
    };
  }

  // PowerPoint
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileName?.endsWith(".ppt") ||
    fileName?.endsWith(".pptx")
  ) {
    return {
      icon: <Presentation className="w-16 h-16" />,
      color: "text-orange-500",
      bgColor: "bg-orange-100",
      label: "PowerPoint",
      canPreview: false,
    };
  }

  // Arquivos compactados
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed" ||
    fileName?.endsWith(".zip") ||
    fileName?.endsWith(".rar") ||
    fileName?.endsWith(".7z")
  ) {
    return {
      icon: <FileArchive className="w-16 h-16" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      label: "Compactado",
      canPreview: false,
    };
  }

  // Código
  if (
    mimeType === "application/json" ||
    mimeType.startsWith("text/") ||
    fileName?.endsWith(".json") ||
    fileName?.endsWith(".js") ||
    fileName?.endsWith(".html") ||
    fileName?.endsWith(".css")
  ) {
    return {
      icon: <FileCode className="w-16 h-16" />,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100",
      label: "Código",
      canPreview: false,
    };
  }

  // Padrão
  return {
    icon: <File className="w-16 h-16" />,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    label: "Arquivo",
    canPreview: false,
  };
}

/**
 * Formata tamanho do arquivo
 */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function PDFPreview({
  open,
  onOpenChange,
  url,
  fileName,
  messageId,
  fileType,
}: PDFPreviewProps) {
  console.log("[PDFPreview] Render - open:", open, "url:", url?.substring(0, 50), "fileType:", fileType);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mimeType = getMimeType(url, fileType);
  const fileInfo = getFileInfo(mimeType, fileName || null);

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
          ) : !fileInfo.canPreview ? (
            // Interface para arquivos sem preview
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className={`p-6 rounded-2xl ${fileInfo.bgColor}`}>
                <div className={fileInfo.color}>{fileInfo.icon}</div>
              </div>
              <div className="text-center max-w-md">
                <p className="font-semibold text-xl text-gray-700">{fileName || "Arquivo"}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {fileInfo.label} • {formatFileSize(null)}
                </p>
                <p className="text-sm text-gray-400 mt-4">
                  Este tipo de arquivo não pode ser visualizado no navegador.
                  <br />
                  Use os botões abaixo para baixar ou abrir o arquivo.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleOpenExternal}
                  className="gap-2"
                  disabled={!finalUrl}
                >
                  <Eye className="w-4 h-4" />
                  Abrir em nova aba
                </Button>
                <Button onClick={handleDownload} className="gap-2" disabled={!finalUrl}>
                  <Download className="w-4 h-4" />
                  Baixar arquivo
                </Button>
              </div>
            </div>
          ) : finalUrl ? (
            // Preview para PDF, imagens e vídeos
            <iframe
              key={finalUrl}
              src={finalUrl}
              className="w-full h-full"
              title={fileName || "Preview"}
              onError={(e) => {
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
