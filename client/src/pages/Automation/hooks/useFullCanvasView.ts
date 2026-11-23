import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "n8n-editor:fullCanvas";

export interface FullCanvasViewState {
  isFullCanvas: boolean;
  toggle: () => void;
  enter: () => void;
  exit: () => void;
}

export function useFullCanvasView(): FullCanvasViewState {
  const [isFullCanvas, setIsFullCanvas] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const enter = useCallback(() => {
    setIsFullCanvas(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // silent
    }
  }, []);

  const exit = useCallback(() => {
    setIsFullCanvas(false);
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // silent
    }
  }, []);

  const toggle = useCallback(() => {
    setIsFullCanvas((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // silent
      }
      return next;
    });
  }, []);

  // Toggle via keyboard shortcut (Escape to exit, F11 to toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullCanvas) {
        e.preventDefault();
        exit();
      } else if (e.key === "F11") {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullCanvas, toggle, exit]);

  return { isFullCanvas, toggle, enter, exit };
}
