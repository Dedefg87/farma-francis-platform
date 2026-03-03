import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X } from "lucide-react";

interface ImageItem {
  id: number;
  fileUrl: string;
  fileName?: string | null;
}

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ImageItem[];
  initialIndex?: number;
}

function getImageSrc(url: string | null | undefined, messageId?: number): string {
  if (!url) return "";
  if (url.startsWith("data:")) {
    return url;
  }
  if (url.includes("whatsapp.net") || url.includes("whatsapp.com")) {
    return `/api/media/${messageId}`;
  }
  return url;
}

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
    setLoading(true);
  }, [currentIndex]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
    }
  }, [open, initialIndex]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleDownload = () => {
    const image = images[currentIndex];
    if (!image) return;
    
    const src = getImageSrc(image.fileUrl, image.id);
    const link = document.createElement("a");
    link.href = src;
    link.download = image.fileName || `imagem-${image.id}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onOpenChange(false);
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrevious, handleNext, onOpenChange]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];
  const imageSrc = getImageSrc(currentImage?.fileUrl, currentImage?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        {/* Header com controles */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="text-white text-sm">
            {currentIndex + 1} / {images.length}
            {currentImage?.fileName && (
              <span className="ml-3 text-gray-300">
                {currentImage.fileName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              title="Diminuir zoom (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              title="Aumentar zoom (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Imagem central */}
        <div className="flex items-center justify-center w-full h-full min-h-[60vh] relative">
          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          <img
            src={imageSrc}
            alt={currentImage?.fileName || "Imagem"}
            className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onLoad={() => setLoading(false)}
            onError={(e) => {
              setLoading(false);
              const el = e.currentTarget as HTMLImageElement;
              el.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==";
            }}
          />
        </div>

        {/* Navegação */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12 rounded-full"
              title="Anterior (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12 rounded-full"
              title="Próxima (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-blue-500 scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getImageSrc(img.fileUrl, img.id)}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
