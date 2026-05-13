import React, { useMemo } from "react";
import { Node } from "reactflow";
import { getNodeType, WorkflowNode } from "../../node-types";
import {
  Settings,
  GitBranch,
  Send,
  Brain,
  Code,
  Globe,
  ArrowRight,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface HoverPreviewProps {
  node: Node | null;
  position?: { x: number; y: number };
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  triggers: GitBranch,
  logic: Code,
  messages: Send,
  ai: Brain,
  actions: Settings,
  wait: Clock,
  integrations: Globe,
  flow: ArrowRight,
  pharmacy: Package,
};

const statusIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

export function HoverPreview({ node, position }: HoverPreviewProps) {
  const nodeDef = useMemo(
    () => (node?.data?.nodeType ? getNodeType(node.data.nodeType) : null),
    [node?.data?.nodeType]
  );

  if (!node || !nodeDef) return null;

  const CategoryIcon = categoryIcons[nodeDef.category] || Settings;
  const color = nodeDef.color || "#6b7280";

  const style: React.CSSProperties = position
    ? {
        position: "fixed",
        left: position.x + 16,
        top: position.y - 8,
        zIndex: 1000,
      }
    : {
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 8,
        zIndex: 1000,
      };

  return (
    <div
      style={style}
      className="pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-72 overflow-hidden"
        style={{ borderTop: `3px solid ${color}` }}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-white"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {nodeDef.label}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
              {nodeDef.category}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            {nodeDef.description}
          </p>
        </div>

        {/* Ports */}
        {(nodeDef.inputs?.length || nodeDef.outputs?.length) && (
          <div className="px-3 py-2 space-y-1.5">
            {nodeDef.inputs && nodeDef.inputs.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Entradas
                </div>
                {nodeDef.inputs.map((input) => (
                  <div
                    key={input.id}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{input.label}</span>
                    <span className="text-[10px] text-gray-400">
                      ({input.type})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {nodeDef.outputs && nodeDef.outputs.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Saídas
                </div>
                {nodeDef.outputs.map((output) => {
                  const StatusIcon =
                    statusIcons[output.type as keyof typeof statusIcons];
                  return (
                    <div
                      key={output.id}
                      className="flex items-center gap-1.5 text-xs text-gray-600"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            output.type === "success"
                              ? "#10b981"
                              : output.type === "error"
                              ? "#ef4444"
                              : "#60a5fa",
                        }}
                      />
                      <span>{output.label}</span>
                      {StatusIcon && (
                        <StatusIcon className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Config summary */}
        {nodeDef.config && nodeDef.config.length > 0 && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
              Configurações ({nodeDef.config.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {nodeDef.config.slice(0, 4).map((field) => (
                <span
                  key={field.key}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white border border-gray-200 text-gray-600"
                >
                  {field.label}
                </span>
              ))}
              {nodeDef.config.length > 4 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{nodeDef.config.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HoverPreview;
