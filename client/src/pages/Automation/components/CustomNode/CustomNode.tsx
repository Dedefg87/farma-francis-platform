import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { getNodeType } from '../../node-types';
import {
  Zap, MessageSquare, Bot, GitBranch, Users, Clock, Globe, Database,
  Settings, Phone, FileText, Filter, Send, Brain, Code, Pause, ArrowRight,
  Package, AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

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

const categoryColors: Record<string, { bg: string; border: string; text: string; handle: string; iconBg: string }> = {
  triggers:     { bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316', iconBg: '#f97316' },
  logic:        { bg: '#fefce8', border: '#eab308', text: '#854d0e', handle: '#eab308', iconBg: '#eab308' },
  messages:     { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', handle: '#3b82f6', iconBg: '#3b82f6' },
  ai:           { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', handle: '#a855f7', iconBg: '#a855f7' },
  actions:      { bg: '#f0fdfa', border: '#14b8a6', text: '#115e59', handle: '#14b8a6', iconBg: '#14b8a6' },
  wait:         { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', handle: '#ef4444', iconBg: '#ef4444' },
  integrations: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', handle: '#10b981', iconBg: '#10b981' },
  flow:         { bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316', iconBg: '#f97316' },
  pharmacy:     { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a', handle: '#2563eb', iconBg: '#2563eb' },
  core_triggers:{ bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316', iconBg: '#f97316' },
  core_logic:   { bg: '#fefce8', border: '#eab308', text: '#854d0e', handle: '#eab308', iconBg: '#eab308' },
  core_actions: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', handle: '#3b82f6', iconBg: '#3b82f6' },
  core_data:    { bg: '#eef2ff', border: '#6366f1', text: '#3730a3', handle: '#6366f1', iconBg: '#6366f1' },
  integrations_br: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', handle: '#10b981', iconBg: '#10b981' },
  delivery_br:  { bg: '#fff7ed', border: '#f97316', text: '#9a3412', handle: '#f97316', iconBg: '#f97316' },
  fiscal_br:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', handle: '#3b82f6', iconBg: '#3b82f6' },
  marketing_br: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d', handle: '#ec4899', iconBg: '#ec4899' },
  erp_br:       { bg: '#ecfdf5', border: '#10b981', text: '#065f46', handle: '#10b981', iconBg: '#10b981' },
  ai_generic:   { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', handle: '#a855f7', iconBg: '#a855f7' },
  payments:     { bg: '#f0fdfa', border: '#14b8a6', text: '#115e59', handle: '#14b8a6', iconBg: '#14b8a6' },
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
    idle: selected ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-100' : 'shadow-sm',
    running: 'ring-2 ring-blue-400 animate-pulse shadow-md',
    success: 'ring-2 ring-green-400 shadow-md',
    error: 'ring-2 ring-red-400 shadow-md',
    warning: 'ring-2 ring-amber-400 shadow-md',
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
      className={`relative rounded-lg border-2 transition-all cursor-pointer ${ringClass}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: selected ? '#3b82f6' : colors.border,
        width: '180px',
        minHeight: '56px',
      }}
    >
      {/* Input Handle — left side */}
      {inputs.length > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-3 !h-3 !border-2 !border-white !shadow-md"
          style={{
            backgroundColor: colors.handle,
            left: -7,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* Node Content */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: colors.iconBg }}
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
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {nodeDef.description}
            </div>
          )}
        </div>
        {statusIcon && (
          <div className="flex-shrink-0">{statusIcon}</div>
        )}
      </div>

      {/* Output Handle — right side */}
      {outputs.length > 0 && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-3 !h-3 !border-2 !border-white !shadow-md"
          style={{
            backgroundColor: colors.handle,
            right: -7,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </div>
  );
}

export default memo(CustomNode);
