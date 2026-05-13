import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeType, WorkflowNode } from '../../node-types';
import {
  Zap, MessageSquare, Bot, GitBranch, Users, Clock, Globe, Database,
  Settings, Phone, FileText, Filter, Send, Brain, Code, Pause, ArrowRight,
  Package, AlertTriangle, CheckCircle2, XCircle, Loader2
} from 'lucide-react';

// Mapa de ícones por tipo de nó
const iconMap: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-4 h-4" />,
  message: <MessageSquare className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  transfer: <Users className="w-4 h-4" />,
  wait: <Clock className="w-4 h-4" />,
  api: <Globe className="w-4 h-4" />,
  function: <Settings className="w-4 h-4" />,
  set: <Database className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
  action: <Settings className="w-4 h-4" />,
  uraMenu: <Phone className="w-4 h-4" />,
  createTicket: <FileText className="w-4 h-4" />,
  filter: <Filter className="w-4 h-4" />,
  send: <Send className="w-4 h-4" />,
  brain: <Brain className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  pause: <Pause className="w-4 h-4" />,
  arrowRight: <ArrowRight className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
};

// Cores por categoria
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

  // Status styles
  const statusBorder = {
    idle: selected ? 'ring-2 ring-blue-400 ring-offset-1' : '',
    running: 'ring-2 ring-blue-400 ring-offset-1 animate-pulse',
    success: 'ring-2 ring-green-400 ring-offset-1',
    error: 'ring-2 ring-red-400 ring-offset-1',
    warning: 'ring-2 ring-amber-400 ring-offset-1',
  }[status];

  const statusIcon = {
    idle: null,
    running: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />,
    success: <CheckCircle2 className="w-3 h-3 text-green-500" />,
    error: <XCircle className="w-3 h-3 text-red-500" />,
    warning: <AlertTriangle className="w-3 h-3 text-amber-500" />,
  }[status];

  const inputs = data.inputs || nodeDef?.inputs || [];
  const outputs = data.outputs || nodeDef?.outputs || [];

  return (
    <div
      className={`relative rounded-lg border-2 shadow-sm transition-all ${statusBorder}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        minWidth: '140px',
        maxWidth: '180px',
      }}
    >
      {/* Input Handles */}
      {inputs.map((input, idx) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Top}
          id={input.id}
          className="!w-3 !h-3 !border-2 !border-white !shadow-sm"
          style={{
            backgroundColor: colors.handle,
            top: -6,
            left: inputs.length === 1 ? '50%' : `${20 + (idx * 60) / Math.max(inputs.length - 1, 1)}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}

      {/* Node Content */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
            style={{ backgroundColor: colors.border, color: 'white' }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-semibold leading-tight truncate"
              style={{ color: colors.text }}
              title={data.label}
            >
              {data.label}
            </div>
            {nodeDef?.description && (
              <div className="text-[10px] text-gray-500 leading-tight truncate mt-0.5">
                {nodeDef.description}
              </div>
            )}
          </div>
          {statusIcon && (
            <div className="flex-shrink-0">{statusIcon}</div>
          )}
        </div>
      </div>

      {/* Output Handles */}
      {outputs.map((output, idx) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Bottom}
          id={output.id}
          className="!w-3 !h-3 !border-2 !border-white !shadow-sm"
          style={{
            backgroundColor: colors.handle,
            bottom: -6,
            left: outputs.length === 1 ? '50%' : `${20 + (idx * 60) / Math.max(outputs.length - 1, 1)}%`,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
    </div>
  );
}

export default memo(CustomNode);
