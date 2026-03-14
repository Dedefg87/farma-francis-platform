import { useState, useCallback, useEffect } from 'react';

interface UsePdfViewerReturn {
  isOpen: boolean;
  url: string | null;
  fileName: string | null;
  messageId: number | null;
  open: (url: string, options?: { fileName?: string; messageId?: number }) => void;
  close: () => void;
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para gerenciar visualização de PDFs
 * - Converte data URLs para blob URLs (melhor performance)
 * - Gerencia estado do modal
 * - Limpa memória automaticamente
 */
export function usePdfViewer(): UsePdfViewerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<number | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpar blob URL quando fechar ou mudar
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const open = useCallback((fileUrl: string, options?: { fileName?: string; messageId?: number }) => {
    setUrl(fileUrl);
    setFileName(options?.fileName || null);
    setMessageId(options?.messageId || null);
    setIsOpen(true);
    setError(null);

    // Se tem messageId, usar endpoint de mídia (não precisa de blob)
    if (options?.messageId) {
      setBlobUrl(null);
      setIsLoading(false);
      return;
    }

    // Se é data URL, converter para blob
    if (fileUrl?.startsWith?.('data:')) {
      setIsLoading(true);
      try {
        const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          
          // Decode em chunks para evitar stack overflow
          const byteCharacters = atob(base64Data);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          
          const blob = new Blob([byteArray], { type: mimeType });
          const newBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(newBlobUrl);
          setIsLoading(false);
        } else {
          setError('Formato de data URL inválido');
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[usePdfViewer] Erro ao criar blob:', e);
        setError('Erro ao processar documento');
        setIsLoading(false);
      }
    } else {
      setBlobUrl(null);
      setIsLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Não limpar blobUrl aqui para evitar flicker
    // Será limpo no useEffect ou quando abrir outro
  }, []);

  // URL final para o iframe
  const getFinalUrl = useCallback(() => {
    if (messageId) {
      return `/api/media/${messageId}`;
    }
    if (blobUrl) {
      return blobUrl;
    }
    return url;
  }, [messageId, blobUrl, url]);

  return {
    isOpen,
    url,
    fileName,
    messageId,
    open,
    close,
    blobUrl,
    isLoading,
    error,
  };
}

/**
 * Extrai o MIME type real de um arquivo
 * Prioriza o MIME type do data URL (mais confiável)
 */
export function getMimeType(fileUrl: string | null | undefined, fileType: string | null | undefined): string {
  if (fileUrl?.startsWith?.('data:')) {
    const mimeMatch = fileUrl.match(/^data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      return mimeMatch[1];
    }
  }
  return fileType || '';
}

/**
 * Constrói URL para exibir mídia
 */
export function getMediaUrl(url: string | null | undefined, messageId?: number): string {
  if (!url) return '';

  // Se é data URL, retorna direto
  if (url?.startsWith?.('data:')) {
    return url;
  }

  // Se tem messageId, usar endpoint de mídia
  if (messageId) {
    return `/api/media/${messageId}`;
  }

  return url;
}
