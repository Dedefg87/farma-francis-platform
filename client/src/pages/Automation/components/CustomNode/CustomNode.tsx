import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeType } from '../../node-types';
import {
  Zap, MessageSquare, Bot, GitBranch, Users, Clock, Globe, Database,
  Settings, Phone, FileText, Filter, Send, Brain, Code, Pause, ArrowRight,
  Package, AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-3 h-3" />,
  message: <MessageSquare className="w-3 h-3" />,
  ai: <Bot className="w-3 h-3" />,
  condition: <GitBranch className="w-3 h-3" />,
  transfer: <Users className="w-3 h-3" />,
  wait: <Clock className="w-3 h-3" />,
  api: <Globe className="w-3 h-3" />,
  function: <Settings className="w-3 h-3" />,
  set: <Database className="w-3 h-3" />,
  delay: <Clock className="w-3 h-3" />,
  action: <Settings className="w-3 h-3" />,
  uraMenu: <Phone className="w-3 h-3" />,
  createTicket: <FileText className="w-3 h-3" />,
  filter: <Filter className="w-3 h-3" />,
  send: <Send className="w-3 h-3" />,
  brain: <Brain className="w-3 h-3" />,
  code: <Code className="w-3 h-3" />,
  pause: <Pause className="w-3 h-3" />,
  arrowRight: <ArrowRight className="w-3 h-3" />,
  package: <Package className="w-3 h-3" />,
};

const categoryColors: Record<string, { bg: string; border: string; text: string; handle: string }> = {
  triggers:     { bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316' },
  logic:        { bg: '#fefce8', border: '#eab308', text: '#854d0e', handle: '#eab308' },
  messages:     { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', handle: '#3b82f6' },
  ai:           { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', handle: '#a855f7' },
  actions:      { bg: '#f0fdfa', border: '#14b8a6', text: '#115e59', handle: '#14b8a6' },
  wait:         { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', handle: '#ef4444' },
  integrations: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', handle: '#10b981' },
  flow:         { bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316' },
  pharmacy:     { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a', handle: '#2563eb' },
};

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'warning';

interface CustomNodeData {
  label: string;
  nodeType: string;
  status?: NodeStatus;
  inputs?: Array<{ id: string; label: string; type: string }>;
  outputs?: Array<{ id: string; label: string; type: string }>;
  [key: string]: unknown;
}

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const nodeType = data.nodeType || 'action';
  const nodeDef = getNodeType(nodeType);
  const category = nodeDef?.category || 'actions';
  const colors = categoryColors[category] || categoryColors.actions;
  const icon = iconMap[nodeType] || iconMap.action;
  const status: NodeStatus = data.status || 'idle';

  const ringClass = {
    idle: selected ? 'ring-2 ring-blue-400' : '',
    running: 'ring-2 ring-blue-400 animate-pulse',
    success: 'ring-2 ring-green-400',
    error: 'ring-2 ring-red-400',
    warning: 'ring-2 ring-amber-400',
  }[status];

  const statusIcon = {
    idle: null,
    running: <Loader2 className="w-2.5 h-2.5 text-blue-500 animate-spin" />,
    success: <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />,
    error: <XCircle className="w-2.5 h-2.5 text-red-500" />,
    warning: <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />,
  }[status];

  const inputs = data.inputs || nodeDef?.inputs || [];
  const outputs = data.outputs || nodeDef?.outputs || [];

  return (
    <div
      className={`relative rounded-md border shadow-sm transition-all cursor-pointer ${ringClass}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        width: '90px',
        height: '44px',
      }}
    >
      {/* Input Handles — small dots on top edge */}
      {inputs.map((input, idx) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Top}
          id={input.id}
          className="!w-2 !h-2 !border !border-white !shadow-sm"
          style={{
            backgroundColor: colors.handle,
            top: -4,
            left: inputs.length === 1 ? '50%' : `${25 + (idx * 50) / Math.max(inputs.length - 1, 1)}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}

      {/* Node Content — compact */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 h-full">
        <div
          className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
          style={{ backgroundColor: colors.border, color: 'white' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] font-semibold leading-none truncate"
            style={{ color: colors.text }}
            title={data.label}
          >
            {data.label}
          </div>
        </div>
        {statusIcon && (
          <div className="flex-shrink-0">{statusIcon}</div>
        )}
      </div>

      {/* Output Handles — small dots on bottom edge */}
      {outputs.map((output, idx) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Bottom}
          id={output.id}
          className="!w-2 !h-2 !border !border-white !shadow-sm"
          style={{
            backgroundColor: colors.handle,
            bottom: -4,
            left: outputs.length === 1 ? '50%' : `${25 + (idx * 50) / Math.max(outputs.length - 1, 1)}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
    </div>
  );
}

export default memo(CustomNode);
