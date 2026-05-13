import React from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface FullCanvasToggleProps {
  isFullCanvas: boolean;
  onToggle: () => void;
}

export function FullCanvasToggle({ isFullCanvas, onToggle }: FullCanvasToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        fixed z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
        transition-all duration-200 font-medium text-sm
        ${
          isFullCanvas
            ? "bottom-4 right-4 bg-gray-900 text-white hover:bg-gray-800"
            : "top-20 right-4 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        }
      `}
      title={isFullCanvas ? "Sair do modo tela cheia (Esc)" : "Tela cheia (F11)"}
    >
      {isFullCanvas ? (
        <>
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Sair</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Tela Cheia</span>
        </>
      )}
    </button>
  );
}

export default FullCanvasToggle;
