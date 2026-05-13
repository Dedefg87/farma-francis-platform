import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

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
      {/* Base edge line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isSelected ? '#3b82f6' : '#94a3b8',
          strokeWidth: isSelected ? 2.5 : 2,
          transition: 'stroke 0.15s, stroke-width 0.15s',
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
    </>
  );
}
