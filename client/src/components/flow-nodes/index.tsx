import { memo } from "react";
import { Handle, Position, Node } from "@xyflow/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

// Tipos para os dados dos nós - deve corresponder ao FlowNodeData em types/flowBuilder.ts
export interface FlowNodeData {
  label?: string;
  description?: string;
  config?: {
    message?: string;
    condition?: string;
    agentId?: string;
    agentName?: string;
    agentIcon?: string;
    agentColor?: string;
    agentModel?: string;
    method?: string;
    url?: string;
    delay?: number;
    department?: string;
    [key: string]: unknown;
  };
  aiAgent?: {
    agentId?: string;
    agentName?: string;
    agentIcon?: string;
    agentColor?: string;
    agentModel?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Tipo completo do node (com id, position, etc)
export type FlowNode = Node<FlowNodeData>;

// Helper para type assertion nos componentes
const asFlowNodeData = (data: unknown): FlowNodeData => data as FlowNodeData;

// Trigger Node
export const TriggerNode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[200px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚡</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Trigger</div>
            <div className="text-xs text-muted-foreground">
              Inicia o fluxo
            </div>
          </div>
          <Badge className="bg-green-600">Início</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Acionado quando uma mensagem é recebida
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-600" />
    </Card>
  );
});

// Message Node
export const MessageNode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[220px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💬</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Enviar Mensagem</div>
            <div className="text-xs text-muted-foreground">
              {flowData.config?.message || "Configure a mensagem"}
            </div>
          </div>
          <Badge className="bg-blue-600">Ação</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-blue-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-600" />
    </Card>
  );
});

// Condition Node
export const ConditionNode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[220px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔀</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Condição</div>
            <div className="text-xs text-muted-foreground">
              {flowData.config?.condition || "Configure a condição"}
            </div>
          </div>
          <Badge className="bg-amber-600">Lógica</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-amber-600" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "30%" }}
        className="!bg-green-600"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "70%" }}
        className="!bg-red-600"
      />
    </Card>
  );
});

// AI Node - Professional version with agent selection
export const AINode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  // Get agent info from data if configured
  const agentId = flowData.aiAgent?.agentId;
  const agentName = flowData.aiAgent?.agentName || 'AI Assistant';
  const agentIcon = flowData.aiAgent?.agentIcon || '🤖';
  const agentColor = flowData.aiAgent?.agentColor || '#ec4899';
  const isConfigured = !!agentId;

  return (
    <Card 
      className={`min-w-[240px] transition-all ${
        selected ? "ring-2 ring-primary shadow-lg" : "shadow-md"
      }`}
      style={{
        borderLeft: `4px solid ${agentColor}`,
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{agentIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{agentName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {isConfigured ? flowData.aiAgent?.agentModel || 'Configurado' : 'Clique para configurar'}
            </div>
          </div>
          <Badge 
            className="text-xs"
            style={{ 
              backgroundColor: agentColor,
              color: 'white'
            }}
          >
            IA
          </Badge>
        </div>
        
        {/* Status indicator */}
        {isConfigured && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Pronto</span>
          </div>
        )}
        
        {!isConfigured && (
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span>Não configurado</span>
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-pink-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-pink-600" />
    </Card>
  );
});

// API Node
export const APINode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[220px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔌</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Chamada API</div>
            <div className="text-xs text-muted-foreground">
              {flowData.config?.method || "GET"} {flowData.config?.url || "Configure URL"}
            </div>
          </div>
          <Badge className="bg-cyan-600">API</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-cyan-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-600" />
    </Card>
  );
});

// Delay Node
export const DelayNode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[200px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⏱️</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Aguardar</div>
            <div className="text-xs text-muted-foreground">
              {flowData.config?.delay || "5"} segundos
            </div>
          </div>
          <Badge className="bg-purple-600">Tempo</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-purple-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-600" />
    </Card>
  );
});

// Transfer Node
export const TransferNode = memo(({ data, selected }: Node) => {
  const flowData = asFlowNodeData(data);
  return (
    <Card className={`min-w-[220px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👤</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Transferir Humano</div>
            <div className="text-xs text-muted-foreground">
              {flowData.config?.department || "Suporte"}
            </div>
          </div>
          <Badge className="bg-red-600">Humano</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-red-600" />
    </Card>
  );
});
