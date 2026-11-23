import { useCallback, useEffect, useRef } from "react";
import { Node, Viewport, useReactFlow } from "reactflow";

interface UseAutoscrollOptions {
  /** Margin around node to consider "in viewport" (px, default 80) */
  margin?: number;
  /** Min zoom before auto-adjusting (default 0.3) */
  minZoom?: number;
  /** Max zoom before auto-fitting (default 2.0) */
  maxZoom?: number;
  /** Whether autoscroll is enabled */
  enabled?: boolean;
  /** Sidebar width offset in px (default 256 = w-64) */
  sidebarOffset?: number;
}

interface UseAutoscrollActions {
  scrollToNode: (node: Node) => void;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useAutoscroll({
  margin = 80,
  minZoom = 0.3,
  maxZoom = 2.0,
  enabled = true,
  sidebarOffset = 0,
}: UseAutoscrollOptions = {}): UseAutoscrollActions {
  const { getViewport, setViewport } = useReactFlow();
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  // Track drag state via global events
  useEffect(() => {
    const handleDragStart = () => {
      isDraggingRef.current = true;
    };
    const handleDragEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("nodeDragStart", handleDragStart);
    window.addEventListener("nodeDragEnd", handleDragEnd);
    return () => {
      window.removeEventListener("nodeDragStart", handleDragStart);
      window.removeEventListener("nodeDragEnd", handleDragEnd);
    };
  }, []);

  // Check if node is within viewport bounds
  const isNodeVisible = useCallback(
    (node: Node, viewport: Viewport): boolean => {
      const canvas = document.querySelector(".react-flow__viewport");
      if (!canvas) return true;

      const container = canvas.closest(".react-flow__container");
      if (!container) return true;

      const rect = container.getBoundingClientRect();
      const effectiveLeft = rect.left + sidebarOffset;
      const effectiveWidth = rect.width - sidebarOffset;

      // Convert node position to screen coordinates
      const nodeScreenX = node.position.x * viewport.zoom + viewport.x;
      const nodeScreenY = node.position.y * viewport.zoom + viewport.y;

      // Estimate node dimensions (min 180px wide, 60px tall as per N8NNode)
      const nodeWidth = 180 * viewport.zoom;
      const nodeHeight = 60 * viewport.zoom;

      const nodeLeft = nodeScreenX;
      const nodeRight = nodeScreenX + nodeWidth;
      const nodeTop = nodeScreenY;
      const nodeBottom = nodeScreenY + nodeHeight;

      const viewLeft = effectiveLeft + margin;
      const viewRight = effectiveLeft + effectiveWidth - margin;
      const viewTop = rect.top + margin;
      const viewBottom = rect.bottom - margin;

      return (
        nodeLeft >= viewLeft &&
        nodeRight <= viewRight &&
        nodeTop >= viewTop &&
        nodeBottom <= viewBottom
      );
    },
    [margin, sidebarOffset]
  );

  // Smooth scroll to center node in viewport
  const scrollToNode = useCallback(
    (node: Node) => {
      if (!enabled || isDraggingRef.current) return;

      // Cancel any in-flight animation
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const viewport = getViewport();
      const currentZoom = viewport.zoom;

      // Don't adjust zoom if within safe bounds
      if (currentZoom < minZoom || currentZoom > maxZoom) return;

      // If node is already centered-enough, skip
      if (isNodeVisible(node, viewport)) return;

      const canvas = document.querySelector(".react-flow__container");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const effectiveWidth = rect.width - sidebarOffset;
      const effectiveHeight = rect.height;

      // Target: center of viewport
      const targetCenterX = effectiveWidth / 2 + sidebarOffset;
      const targetCenterY = effectiveHeight / 2;

      // Node center in flow coordinates
      const nodeCenterX = node.position.x + 90; // half of 180px node width
      const nodeCenterY = node.position.y + 30; // half of ~60px node height

      // Target viewport position so node center = viewport center
      const targetX = -(nodeCenterX * currentZoom) + targetCenterX / currentZoom;
      const targetY = -(nodeCenterY * currentZoom) + targetCenterY / currentZoom;

      // Animate with ease-out
      const startX = viewport.x;
      const startY = viewport.y;
      const startTime = performance.now();
      const duration = 400; // ms

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const newX = startX + (targetX - startX) * eased;
        const newY = startY + (targetY - startY) * eased;

        setViewport(
          { x: newX, y: newY, zoom: currentZoom },
          { duration: 0 } // we handle easing ourselves
        );

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [enabled, getViewport, setViewport, isNodeVisible, minZoom, maxZoom, sidebarOffset]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return { scrollToNode };
}
