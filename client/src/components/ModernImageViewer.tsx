import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

interface ModernImageViewerProps {
  src: string;
  alt?: string;
  onClose?: () => void;
  showThumbnails?: boolean;
  thumbnails?: string[];
  initialIndex?: number;
}

export function ModernImageViewer({
  src,
  alt = "Imagem",
  onClose,
  showThumbnails = false,
  thumbnails = [],
  initialIndex = 0,
}: ModernImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const images = showThumbnails && thumbnails.length > 0 ? thumbnails : [src];
  const currentImage = images[index] || src;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === "r") setRotation((r) => (r + 90) % 360);
      if (e.key === "f") setIsFullscreen((f) => !f);
    },
    [images.length, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoom((z) => Math.min(z + 0.15, 4));
    else setZoom((z) => Math.max(z - 0.15, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 text-white/80 text-sm">
        <span className="font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          {index + 1} / {images.length}
        </span>
        <span className="hidden sm:inline text-xs opacity-60">Teclas: ← → navegar · +/- zoom · R rotacionar · F fullscreen · Esc fechar</span>
      </div>

      {/* Close */}
      <button
        onClick={() => onClose?.()}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Image */}
      <div
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={currentImage}
          alt={alt}
          className="max-h-[85vh] max-w-[90vw] object-contain select-none transition-transform duration-150 ease-out shadow-2xl rounded-lg"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="p-2 hover:bg-white/10 rounded-xl disabled:opacity-30 transition" aria-label="Anterior">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Zoom out">
          <ZoomOut className="w-5 h-5 text-white" />
        </button>
        <button onClick={resetView} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Resetar">
          <RotateCcw className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(z + 0.25, 4))} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Zoom in">
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Rotacionar">
          <RotateCcw className="w-5 h-5 text-white rotate-[-45deg]" />
        </button>
        <button onClick={() => setIsFullscreen((f) => !f)} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Fullscreen">
          {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
        </button>
        <a href={currentImage} download={alt} className="p-2 hover:bg-white/10 rounded-xl transition" aria-label="Download">
          <Download className="w-5 h-5 text-white" />
        </a>
        <button onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))} disabled={index === images.length - 1} className="p-2 hover:bg-white/10 rounded-xl disabled:opacity-30 transition" aria-label="Proximo">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] px-4 py-2">
          {images.map((img, i) => (
            <button
              key={img + i}
              onClick={() => { setIndex(i); setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${i === index ? "border-white scale-110 shadow-lg" : "border-white/20 opacity-60 hover:opacity-100 hover:scale-105"}`}
            >
              <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
