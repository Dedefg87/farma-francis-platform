import { useCallback } from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "reactflow";
import { X } from "lucide-react";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback(
    (evt: React.MouseEvent) => {
      evt.stopPropagation();
      // Emit custom event to delete this edge
      window.dispatchEvent(
        new CustomEvent("deleteEdge", { detail: { edgeId: id } })
      );
    },
    [id]
  );

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            fontWeight: 500,
            pointerEvents: "all",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          className="nodrag nopan"
        >
          {label && (
            <span className="bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-700 text-xs">
              {label}
            </span>
          )}
          <button
            onClick={onEdgeClick}
            className="w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-colors cursor-pointer"
            title="Excluir conexão"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
