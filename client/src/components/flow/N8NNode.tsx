import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Zap,
  MessageSquare,
  Bot,
  GitBranch,
  Users,
  Clock,
  Globe,
  Database,
  Settings,
  Phone,
  FileText,
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
};

// Mapa de cores por tipo de nó
const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  message: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  ai: { bg: '#e9d5ff', border: '#a855f7', text: '#6b21a8' },
  condition: { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
  transfer: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  wait: { bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
  api: { bg: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' },
  function: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  set: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  delay: { bg: '#fed7d7', border: '#f56565', text: '#742a2a' },
  action: { bg: '#c7d2fe', border: '#818cf8', text: '#3730a3' },
  uraMenu: { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' },
  createTicket: { bg: '#fef08a', border: '#eab308', text: '#713f12' },
};

interface N8NNodeData {
  label: string;
  nodeType?: string;
  description?: string;
  [key: string]: unknown;
}

function N8NNode({ data, selected }: NodeProps<N8NNodeData>) {
  const nodeType = data.nodeType || 'action';
  const colors = colorMap[nodeType] || colorMap.action;
  const icon = iconMap[nodeType] || iconMap.action;

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[180px] transition-all ${
        selected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
      
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center w-8 h-8 rounded"
          style={{ backgroundColor: colors.border, color: 'white' }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div
            className="font-semibold text-sm leading-tight"
            style={{ color: colors.text }}
          >
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-gray-600 mt-0.5 truncate">
              {data.description}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
    </div>
  );
}

export default memo(N8NNode);
