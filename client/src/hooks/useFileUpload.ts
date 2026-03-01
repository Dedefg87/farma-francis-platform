import { useState, useCallback } from 'react';

interface UseFileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onError?: (error: string) => void;
}

export interface UseFileUploadReturn {
  selectedFile: File | null;
  filePreview: string | null;
  selectFile: (file: File) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: () => void;
  toBase64: () => Promise<string | null>;
  isUploading: boolean;
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
];

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { maxSizeMB = 16, allowedTypes = DEFAULT_ALLOWED_TYPES, onError } = options;
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectFile = useCallback((file: File) => {
    // Validar tamanho
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
      return;
    }

    // Validar tipo
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return type === file.type;
    });

    if (!isAllowed) {
      onError?.('Tipo de arquivo não suportado');
      return;
    }

    setSelectedFile(file);

    // Criar preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFilePreview(canvas.toDataURL('image/jpeg'));
        URL.revokeObjectURL(video.src);
      };
    } else {
      setFilePreview(null);
    }
  }, [maxSizeMB, allowedTypes, onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  }, [selectFile]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
  }, []);

  const toBase64 = useCallback(async (): Promise<string | null> => {
    if (!selectedFile) return null;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        onError?.('Erro ao converter arquivo');
        resolve(null);
      };
      reader.readAsDataURL(selectedFile);
    });
  }, [selectedFile, onError]);

  return {
    selectedFile,
    filePreview,
    selectFile,
    handleFileSelect,
    removeFile,
    toBase64,
    isUploading,
  };
}
