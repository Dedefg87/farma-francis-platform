import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from 'reactflow';

interface CustomEdgeData {
  animated?: boolean;
  label?: string;
  [key: string]: unknown;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAnimated = data?.animated || false;
  const isSelected = selected;

  return (
    <>
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />

      {/* Base edge line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isSelected ? '#3b82f6' : '#94a3b8',
          strokeWidth: isSelected ? 2.5 : 2,
          transition: 'stroke 0.15s, stroke-width 0.15s',
          pointerEvents: 'none',
        }}
      />

      {/* Animated flow dots */}
      {isAnimated && (
        <>
          <circle r="3" fill="#3b82f6" opacity="0.8">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          <circle r="2" fill="#60a5fa" opacity="0.5">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="0.5s"
              path={edgePath}
            />
          </circle>
        </>
      )}

      {/* Edge label */}
      {data?.label && (
        <foreignObject
          width={100}
          height={20}
          x={(sourceX + targetX) / 2 - 50}
          y={(sourceY + targetY) / 2 - 10}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex items-center justify-center">
            <span className="bg-white px-1.5 py-0.5 rounded text-[10px] text-gray-600 border border-gray-200 shadow-sm">
              {data.label}
            </span>
          </div>
        </foreignObject>
      )}

      {/* Delete button when selected */}
      {isSelected && (
        <foreignObject
          width={24}
          height={24}
          x={(sourceX + targetX) / 2 - 12}
          y={(sourceY + targetY) / 2 - 12}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          style={{ overflow: 'visible' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Dispatch custom event to delete this edge
              window.dispatchEvent(new CustomEvent('delete-edge', { detail: { edgeId: id } }));
            }}
            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white cursor-pointer"
            title="Deletar conexão"
          >
            <span className="text-xs font-bold">×</span>
          </button>
        </foreignObject>
      )}
    </>
  );
}
