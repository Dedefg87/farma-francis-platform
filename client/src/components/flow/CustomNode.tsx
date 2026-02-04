import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  nodeType: string;
  color?: string;
}

export function CustomNode({ data }: NodeProps<CustomNodeData>) {
  const nodeColors: Record<string, string> = {
    trigger: '#10b981',
    condition: '#f59e0b',
    message: '#3b82f6',
    ai: '#ec4899',
    action: '#8b5cf6',
    wait: '#6b7280',
    api: '#06b6d4',
    delay: '#64748b',
    function: '#8b5cf6',
    set: '#6366f1',
    transfer: '#f97316',
  };

  const color = data.color || nodeColors[data.nodeType] || '#6b7280';

  return (
    <div
      style={{
        padding: '12px 20px',
        borderRadius: '8px',
        background: color,
        color: 'white',
        border: '2px solid rgba(255,255,255,0.3)',
        minWidth: '150px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
    </div>
  );
}
