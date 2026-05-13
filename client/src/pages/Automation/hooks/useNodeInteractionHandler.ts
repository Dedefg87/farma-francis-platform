import { useCallback, useRef } from "react";
import { Node, useReactFlow } from "reactflow";

export interface NodeInteractionState {
  hoveredNode: Node | null;
  selectedNode: Node | null;
  previewNode: Node | null;
}

export interface NodeInteractionActions {
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
  handleNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  handleNodeMouseEnter: (event: React.MouseEvent, node: Node) => void;
  handleNodeMouseLeave: (event: React.MouseEvent, node: Node) => void;
  handlePaneClick: () => void;
  setSelectedNode: (node: Node | null) => void;
  clearHoveredNode: () => void;
}

export function useNodeInteractionHandler(
  onNodeSelect?: (node: Node | null) => void,
  onNodeDoubleClick?: (node: Node) => void,
  hoverDelayMs = 300
): NodeInteractionActions {
  const { getNode } = useReactFlow();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTimeRef = useRef(0);
  const pendingClickNodeRef = useRef<Node | null>(null);

  const clearTimers = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 350) {
        return;
      }

      pendingClickNodeRef.current = node;

      clickTimerRef.current = setTimeout(() => {
        const freshNode = getNode(node.id);
        if (freshNode) {
          onNodeSelect?.(freshNode);
        }
        clickTimerRef.current = null;
        pendingClickNodeRef.current = null;
      }, 250);
    },
    [getNode, onNodeSelect]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      lastClickTimeRef.current = Date.now();

      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      pendingClickNodeRef.current = null;

      const freshNode = getNode(node.id);
      if (freshNode) {
        onNodeDoubleClick?.(freshNode);
      }
    },
    [getNode, onNodeDoubleClick]
  );

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      hoverTimerRef.current = setTimeout(() => {
        const freshNode = getNode(node.id);
        if (freshNode) {
          onNodeSelect?.(freshNode);
        }
      }, hoverDelayMs);
    },
    [getNode, onNodeSelect, hoverDelayMs]
  );

  const handleNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingClickNodeRef.current = null;
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const setSelectedNode = useCallback(
    (node: Node | null) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const clearHoveredNode = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  return {
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handlePaneClick,
    setSelectedNode,
    clearHoveredNode,
  };
}
