import { useCallback, useRef } from 'react';
import { Node } from 'reactflow';
import { isFeatureEnabled } from './features';

interface NodeInteractionConfig {
  onSingleClick?: (node: Node) => void;
  onDoubleClick?: (node: Node) => void;
  onHoverStart?: (node: Node) => void;
  onHoverEnd?: (node: Node) => void;
}

/**
 * Hook centralizador de interações com nós.
 * Evita conflito entre click, duplo clique, hover e drag.
 *
 * Uso:
 * const handlers = useNodeInteractionHandler({
 *   onSingleClick: (node) => openFloatingPanel(node),
 *   onDoubleClick: (node) => openFullPanel(node),
 *   onHoverStart: (node) => showPreview(node),
 * });
 * <ReactFlow onNodeClick={handlers.onNodeClick} ... />
 */
export function useNodeInteractionHandler(config: NodeInteractionConfig) {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoveredNode = useRef<string | null>(null);

  // Distingue click simples de duplo clique
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isFeatureEnabled('FLOATING_PANEL')) {
        // Delay para esperar possível duplo clique
        clickTimer.current = setTimeout(() => {
          config.onSingleClick?.(node);
        }, 200);
      } else {
        config.onSingleClick?.(node);
      }
    },
    [config.onSingleClick]
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Cancela o timer do click simples
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      config.onDoubleClick?.(node);
    },
    [config.onDoubleClick]
  );

  // Hover com delay para não atrapalhar drag
  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!isFeatureEnabled('HOVER_PREVIEW')) return;

      lastHoveredNode.current = node.id;
      hoverTimer.current = setTimeout(() => {
        if (lastHoveredNode.current === node.id) {
          config.onHoverStart?.(node);
        }
      }, 300);
    },
    [config.onHoverStart]
  );

  const onNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      lastHoveredNode.current = null;
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      config.onHoverEnd?.(node);
    },
    [config.onHoverEnd]
  );

  return {
    onNodeClick,
    onNodeDoubleClick,
    onNodeMouseEnter,
    onNodeMouseLeave,
  };
}
