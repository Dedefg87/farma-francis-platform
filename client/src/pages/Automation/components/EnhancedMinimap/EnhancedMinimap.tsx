import React, { useMemo, useCallback, useState } from "react";
import { Node, useReactFlow, useViewport } from "reactflow";
import { getNodeType } from "../../node-types";
import { ZoomIn, ZoomOut, Maximize2, Map } from "lucide-react";

interface EnhancedMinimapProps {
  nodes: Node[];
  selectedNodeId?: string | null;
  width?: number;
  height?: number;
  nodeColor?: (node: Node) => string;
  bgColor?: string;
  maskColor?: string;
}

const DEFAULT_NODE_COLOR = "#818cf8";
const SELECTED_NODE_COLOR = "#3b82f6";
const VIEWPORT_STROKE_COLOR = "#3b82f6";

// Color map matching node types to their category colors
const TYPE_COLOR_MAP: Record<string, string> = {
  trigger: "#f59e0b",
  message: "#3b82f6",
  ai: "#a855f7",
  condition: "#f97316",
  transfer: "#10b981",
  wait: "#ef4444",
  api: "#2563eb",
  function: "#6366f1",
  set: "#ec4899",
  delay: "#f56565",
  action: "#818cf8",
  uraMenu: "#14b8a6",
  createTicket: "#eab308",
};

function getNodeColor(node: Node): string {
  // Priority: nodeType from data > type fallback > default
  const nodeType = (node.data?.nodeType as string) || node.type || "action";

  // Check node-types.ts definitions first
  const def = getNodeType(nodeType);
  if (def?.color) return def.color;

  return TYPE_COLOR_MAP[nodeType] || DEFAULT_NODE_COLOR;
}

export function EnhancedMinimap({
  nodes,
  selectedNodeId,
  width = 200,
  height = 150,
  bgColor = "#f9fafb",
  maskColor = "rgba(0,0,0,0.08)",
}: EnhancedMinimapProps) {
  const { getViewport, setViewport } = useReactFlow();
  const viewport = useViewport();
  const [isHovered, setIsHovered] = useState(false);

  // Calculate bounding box of all nodes
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      const x = node.position.x;
      const y = node.position.y;
      // Estimate node dimensions (180x60 as per N8NNode)
      const w = 180;
      const h = 60;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    // Add padding
    const padding = 60;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [nodes]);

  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;

  // Scale to fit minimap dimensions
  const scale = Math.min(width / boundsWidth, height / boundsHeight);

  // Convert flow coords to minimap coords
  const toMinimapCoords = useCallback(
    (x: number, y: number) => ({
      x: (x - bounds.minX) * scale,
      y: (y - bounds.minY) * scale,
    }),
    [bounds.minX, bounds.minY, scale]
  );

  // Viewport rectangle in minimap coords
  const viewportRect = useMemo(() => {
    const vp = getViewport();
    const tl = toMinimapCoords(-vp.x / vp.zoom, -vp.y / vp.zoom);
    const vpWidth = (window.innerWidth * 0.7) / vp.zoom * scale; // approximate visible area
    const vpHeight = (window.innerHeight * 0.6) / vp.zoom * scale;

    return {
      x: Math.max(0, tl.x),
      y: Math.max(0, tl.y),
      width: Math.min(vpWidth, width),
      height: Math.min(vpHeight, height),
    };
  }, [getViewport, toMinimapCoords, scale, width, height]);

  // Handle click on minimap to navigate
  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert minimap coords back to flow coords
      const flowX = clickX / scale + bounds.minX;
      const flowY = clickY / scale + bounds.minY;

      // Center viewport on click
      setViewport({
        x: -flowX * viewport.zoom + (window.innerWidth * 0.35) / viewport.zoom,
        y: -flowY * viewport.zoom + (window.innerHeight * 0.3) / viewport.zoom,
        zoom: viewport.zoom,
      });
    },
    [scale, bounds.minX, bounds.minY, setViewport, viewport.zoom]
  );

  const nodeWidth = 6; // px in minimap
  const nodeHeight = 3;

  return (
    <div
      className="relative rounded-lg border border-gray-200 shadow-sm overflow-hidden"
      style={{ width, height, backgroundColor: bgColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={width}
        height={height}
        onClick={handleMinimapClick}
        className="cursor-crosshair"
      >
        {/* Mask outside viewport */}
        <rect x={0} y={0} width={width} height={height} fill={maskColor} opacity={isHovered ? 0.3 : 0} />

        {/* Viewport indicator */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="transparent"
          stroke={VIEWPORT_STROKE_COLOR}
          strokeWidth={1.5}
          rx={2}
          opacity={isHovered ? 0.8 : 0.4}
        />

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = toMinimapCoords(node.position.x, node.position.y);
          const color = getNodeColor(node);
          const isSelected = node.id === selectedNodeId;

          return (
            <rect
              key={node.id}
              x={pos.x}
              y={pos.y}
              width={nodeWidth}
              height={nodeHeight}
              rx={1}
              fill={isSelected ? SELECTED_NODE_COLOR : color}
              opacity={isSelected ? 1 : 0.7}
              stroke={isSelected ? "#1d4ed8" : "none"}
              strokeWidth={isSelected ? 1 : 0}
            />
          );
        })}
      </svg>

      {/* Hover overlay with zoom controls */}
      {isHovered && (
        <div className="absolute bottom-1 right-1 flex gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const vp = getViewport();
              setViewport({ ...vp, zoom: Math.min(vp.zoom + 0.1, 2) });
            }}
            className="p-0.5 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const vp = getViewport();
              setViewport({ ...vp, zoom: Math.max(vp.zoom - 0.1, 0.2) });
            }}
            className="p-0.5 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Fit all nodes
              if (nodes.length === 0) return;
              const centerX = (bounds.minX + bounds.maxX) / 2;
              const centerY = (bounds.minY + bounds.maxY) / 2;
              const fitZoom = Math.min(
                (width * 0.8) / boundsWidth,
                (height * 0.8) / boundsHeight
              );
              setViewport({
                x: -centerX * fitZoom + (window.innerWidth * 0.35) / fitZoom,
                y: -centerY * fitZoom + (window.innerHeight * 0.3) / fitZoom,
                zoom: Math.min(Math.max(fitZoom, 0.2), 1.5),
              });
            }}
            className="p-0.5 bg-white/90 rounded shadow-sm hover:bg-white transition-colors"
            title="Fit view"
          >
            <Maximize2 className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Node count badge */}
      <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-white/80 rounded text-[9px] text-gray-500 font-medium">
        <Map className="w-2.5 h-2.5" />
        {nodes.length}
      </div>
    </div>
  );
}

export default EnhancedMinimap;
