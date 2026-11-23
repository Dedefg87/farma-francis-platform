import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, X, Maximize2, Minimize2 } from "lucide-react";
import { getImageSrc } from "@/utils/image-url";

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const currentImage = images[index];
  const imageSrc = currentImage ? getImageSrc(currentImage.fileUrl, currentImage.id) : "";

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setZoomOrigin({ x: 50, y: 50 });
    setLoading(true);
  }, [index]);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setZoomOrigin({ x: 50, y: 50 });
    }
  }, [open, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : Math.max(0, images.length - 1)));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  const zoomIn = useCallback(() => {
    setZoom((z) => clamp(round2(z + 0.25), 0.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => clamp(round2(z - 0.25), 0.5, 5));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setZoomOrigin({ x: 50, y: 50 });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        } else {
          onOpenChange(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext, zoomIn, zoomOut, toggleFullscreen, onOpenChange]);

  const handleWheel = (e: React.WheelEvent) => {
    const el = viewportRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const ox = ((e.clientX - rect.left) / rect.width) * 100;
      const oy = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({ x: clamp(ox, 0, 100), y: clamp(oy, 0, 100) });
    }
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => clamp(round2(z * factor), 0.5, 5));
  };

  const handleDoubleClick = () => {
    if (zoom > 1.05) resetView();
    else setZoom(2.5);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = { dist: dist > 0 ? dist : 1, zoom };
      return;
    }
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const cur = pointersRef.current.get(e.pointerId);
    if (!cur) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const base = pinchRef.current.zoom;
      const scale = dist / pinchRef.current.dist;
      setZoom((z) => clamp(round2(base * scale), 0.5, 5));
      return;
    }
    if (dragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = currentImage.fileName || ("imagem-" + String(currentImage.id) + ".jpg");
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open || images.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white/90 text-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm shrink-0">
            {index + 1} / {images.length}
          </span>
          <span className="truncate text-white/70 max-w-[40vw]">
            {currentImage?.fileName || ("Imagem " + String(index + 1))}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} className="p-2 rounded-lg hover:bg-white/10 transition" title="Diminuir zoom (-)" aria-label="Diminuir zoom">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/80 text-xs w-14 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-2 rounded-lg hover:bg-white/10 transition" title="Aumentar zoom (+)" aria-label="Aumentar zoom">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 rounded-lg hover:bg-white/10 transition" title="Rotacionar (R)" aria-label="Rotacionar">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={resetView} className="p-2 rounded-lg hover:bg-white/10 transition" title="Resetar" aria-label="Resetar">
            <RotateCcw className="w-5 h-5 -rotate-45" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10 transition" title="Tela cheia (F)" aria-label="Tela cheia">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/10 transition" title="Baixar" aria-label="Baixar">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/10 transition" title="Fechar (Esc)" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageSrc}
          alt={currentImage?.fileName || "Imagem"}
          className="max-h-[78vh] max-w-[92vw] object-contain select-none shadow-2xl rounded-lg"
          style={{
            transform:
              "scale(" + zoom + ") rotate(" + rotation + "deg) translate(" + position.x + "px," + position.y + "px)",
            transformOrigin: zoomOrigin.x + "% " + zoomOrigin.y + "%",
            transition: dragging ? "none" : "transform 120ms ease-out",
          }}
          onLoad={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            const el = e.currentTarget as HTMLImageElement;
            el.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==";
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition"
              title="Anterior (←)"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition"
              title="Próxima (→)"
              aria-label="Próxima"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 px-4 pb-3 pt-1">
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full pb-2">
            {images.map((img, i) => (
              <button
                key={String(img.id) + "-" + i}
                onClick={() => setIndex(i)}
                className={
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all " +
                  (i === index ? "border-blue-500 scale-110" : "border-transparent opacity-60 hover:opacity-100")
                }
                aria-label={"Ir para imagem " + String(i + 1)}
              >
                <img src={getImageSrc(img.fileUrl, img.id)} alt={"Miniatura " + String(i + 1)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="text-center text-[11px] text-white/40">
          ← → navegar · roda/+/- zoom · duplo clique ampliar · arrastar mover · R rotacionar · F tela cheia · Esc fechar
        </div>
      </div>
    </div>
  );
}
