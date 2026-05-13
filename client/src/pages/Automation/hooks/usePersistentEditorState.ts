import { useCallback, useEffect, useRef } from "react";
import { Node, Edge, Viewport } from "reactflow";

const STORAGE_PREFIX = "n8n-editor";

function getStorageKey(flowId: string | number, key: string): string {
  return `${STORAGE_PREFIX}:flow-${flowId}:${key}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface PersistentEditorState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  lastModified: number;
}

export interface PersistentEditorActions {
  saveNodes: (flowId: string | number, nodes: Node[]) => void;
  saveEdges: (flowId: string | number, edges: Edge[]) => void;
  saveViewport: (flowId: string | number, viewport: Viewport) => void;
  saveSelectedNode: (flowId: string | number, nodeId: string | null) => void;
  loadState: (
    flowId: string | number
  ) => Pick<PersistentEditorState, "nodes" | "edges" | "viewport" | "selectedNodeId"> | null;
  clearState: (flowId: string | number) => void;
}

export function usePersistentEditorState(
  debounceMs = 500
): PersistentEditorActions {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedSave = useCallback(
    (key: string, value: unknown) => {
      const existing = timersRef.current[key];
      if (existing) clearTimeout(existing);

      timersRef.current[key] = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Storage full or unavailable — silent fail
        }
        delete timersRef.current[key];
      }, debounceMs);
    },
    [debounceMs]
  );

  const saveNodes = useCallback(
    (flowId: string | number, nodes: Node[]) => {
      debouncedSave(getStorageKey(flowId, "nodes"), nodes);
    },
    [debouncedSave]
  );

  const saveEdges = useCallback(
    (flowId: string | number, edges: Edge[]) => {
      debouncedSave(getStorageKey(flowId, "edges"), edges);
    },
    [debouncedSave]
  );

  const saveViewport = useCallback(
    (flowId: string | number, viewport: Viewport) => {
      debouncedSave(getStorageKey(flowId, "viewport"), viewport);
    },
    [debouncedSave]
  );

  const saveSelectedNode = useCallback(
    (flowId: string | number, nodeId: string | null) => {
      try {
        const key = getStorageKey(flowId, "selectedNode");
        if (nodeId) {
          localStorage.setItem(key, JSON.stringify(nodeId));
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // silent
      }
    },
    []
  );

  const loadState = useCallback(
    (
      flowId: string | number
    ): Pick<
      PersistentEditorState,
      "nodes" | "edges" | "viewport" | "selectedNodeId"
    > | null => {
      try {
        const nodes = safeParse<Node[]>(
          localStorage.getItem(getStorageKey(flowId, "nodes")),
          []
        );
        const edges = safeParse<Edge[]>(
          localStorage.getItem(getStorageKey(flowId, "edges")),
          []
        );
        const viewport = safeParse<Viewport>(
          localStorage.getItem(getStorageKey(flowId, "viewport")),
          { x: 0, y: 0, zoom: 1 }
        );
        const selectedNodeId = safeParse<string | null>(
          localStorage.getItem(getStorageKey(flowId, "selectedNode")),
          null
        );

        if (nodes.length === 0 && edges.length === 0) return null;

        return { nodes, edges, viewport, selectedNodeId };
      } catch {
        return null;
      }
    },
    []
  );

  const clearState = useCallback((flowId: string | number) => {
    const keys = ["nodes", "edges", "viewport", "selectedNode"];
    keys.forEach((k) => {
      try {
        localStorage.removeItem(getStorageKey(flowId, k));
      } catch {
        // silent
      }
    });
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return {
    saveNodes,
    saveEdges,
    saveViewport,
    saveSelectedNode,
    loadState,
    clearState,
  };
}
