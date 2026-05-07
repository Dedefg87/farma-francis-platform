import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Settings,
  Eye
} from 'lucide-react';
import { FlowSimulator } from './FlowSimulator';
import { CustomNode } from './CustomNode';

interface FlowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onExport?: (nodes: Node[], edges: Edge[]) => void;
  onImport?: (file: File) => void;
  readOnly?: boolean;
}

const nodeColors: Record<string, { color: string; label: string }> = {
  // Básicos
  trigger: { color: '#10b981', label: 'Gatilho' },
  condition: { color: '#f59e0b', label: 'Condição' },
  message: { color: '#3b82f6', label: 'Mensagem' },
  ai: { color: '#ec4899', label: 'IA' },
  action: { color: '#8b5cf6', label: 'Ação' },
  wait: { color: '#6b7280', label: 'Aguardar' },
  api: { color: '#06b6d4', label: 'API' },
  delay: { color: '#64748b', label: 'Delay' },
  transfer: { color: '#f97316', label: 'Transferir' },
  // n8n Triggers
  http_trigger: { color: '#0ea5e9', label: 'HTTP Trigger' },
  webhook_trigger: { color: '#8b5cf6', label: 'Webhook' },
  cron_trigger: { color: '#f59e0b', label: 'Cron' },
  interval_trigger: { color: '#f97316', label: 'Interval' },
  // n8n Processing
  function: { color: '#10b981', label: 'Function' },
  function_item: { color: '#34d399', label: 'Function Item' },
  if: { color: '#ef4444', label: 'IF' },
  switch: { color: '#f59e0b', label: 'Switch' },
  set: { color: '#3b82f6', label: 'Set' },
  merge: { color: '#8b5cf6', label: 'Merge' },
  split_in_batches: { color: '#06b6d4', label: 'Split' },
  code: { color: '#ec4899', label: 'Code' },
  // n8n Integrations
  http_request: { color: '#0ea5e9', label: 'HTTP Request' },
  webhook_response: { color: '#8b5cf6', label: 'Webhook Resp.' },
  graphql: { color: '#ff79c6', label: 'GraphQL' },
  // n8n Databases
  mysql: { color: '#00758f', label: 'MySQL' },
  postgresql: { color: '#336791', label: 'PostgreSQL' },
  sqlite: { color: '#003b57', label: 'SQLite' },
  mongodb: { color: '#4db33d', label: 'MongoDB' },
  // Communication
  email_send: { color: '#ea4335', label: 'Email Send' },
  imap_trigger: { color: '#4285f4', label: 'IMAP/POP3' },
  whatsapp: { color: '#25d366', label: 'WhatsApp' },
  telegram: { color: '#0088cc', label: 'Telegram' },
  slack: { color: '#4a154b', label: 'Slack' },
  discord: { color: '#5865f2', label: 'Discord' },
  // Cloud Storage
  google_drive: { color: '#4285f4', label: 'Google Drive' },
  s3: { color: '#ff9900', label: 'S3/MinIO' },
  dropbox: { color: '#0061ff', label: 'Dropbox' },
  // Document Handling
  read_binary: { color: '#fbbf24', label: 'Read Binary' },
  write_binary: { color: '#f59e0b', label: 'Write Binary' },
  convert_binary: { color: '#84cc16', label: 'Convert Binary' },
  // Advanced Logic
  regex: { color: '#ec4899', label: 'Regex' },
  date_time: { color: '#0ea5e9', label: 'Date & Time' },
  math: { color: '#10b981', label: 'Math' },
  // Security
  api_key_vault: { color: '#dc2626', label: 'API Key Vault' },
  credentials: { color: '#f59e0b', label: 'Credentials' },
  // Monitoring
  execution_history: { color: '#8b5cf6', label: 'Execution History' },
  executions_control: { color: '#06b6d4', label: 'Executions Control' },
  // Orchestration
  sub_workflow: { color: '#3b82f6', label: 'Sub-Workflow' },
  error_workflow: { color: '#ef4444', label: 'Error Workflow' },
  // AI
  openai: { color: '#10b981', label: 'OpenAI' },
  huggingface: { color: '#ff9d00', label: 'HuggingFace' },
};

const nodeTypes = {
  // Básicos
  trigger: CustomNode,
  condition: CustomNode,
  message: CustomNode,
  ai: CustomNode,
  action: CustomNode,
  wait: CustomNode,
  api: CustomNode,
  delay: CustomNode,
  transfer: CustomNode,
  // n8n Triggers
  http_trigger: CustomNode,
  webhook_trigger: CustomNode,
  cron_trigger: CustomNode,
  interval_trigger: CustomNode,
  // n8n Processing
  function: CustomNode,
  function_item: CustomNode,
  if: CustomNode,
  switch: CustomNode,
  set: CustomNode,
  merge: CustomNode,
  split_in_batches: CustomNode,
  code: CustomNode,
  // n8n Integrations
  http_request: CustomNode,
  webhook_response: CustomNode,
  graphql: CustomNode,
  // n8n Databases
  mysql: CustomNode,
  postgresql: CustomNode,
  sqlite: CustomNode,
  mongodb: CustomNode,
  // Communication
  email_send: CustomNode,
  imap_trigger: CustomNode,
  whatsapp: CustomNode,
  telegram: CustomNode,
  slack: CustomNode,
  discord: CustomNode,
  // Cloud Storage
  google_drive: CustomNode,
  s3: CustomNode,
  dropbox: CustomNode,
  // Document Handling
  read_binary: CustomNode,
  write_binary: CustomNode,
  convert_binary: CustomNode,
  // Advanced Logic
  regex: CustomNode,
  date_time: CustomNode,
  math: CustomNode,
  // Security
  api_key_vault: CustomNode,
  credentials: CustomNode,
  // Monitoring
  execution_history: CustomNode,
  executions_control: CustomNode,
  // Orchestration
  sub_workflow: CustomNode,
  error_workflow: CustomNode,
  // AI
  openai: CustomNode,
  huggingface: CustomNode,
};

export function FlowBuilder({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExport,
  onImport,
  readOnly = false,
}: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showSimulator, setShowSimulator] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<any>(null);

  // Sincronizar props com estado interno (corrige o problema de editor vazio)
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      // Ajustar view após carregar nós
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ padding: 0.2 });
        }
      }, 100);
    }
  }, [initialNodes, initialEdges]);

  // Capturar instância do ReactFlow via onInit
  const handleInit = (instance: any) => {
    reactFlowInstanceRef.current = instance;
    if (initialNodes.length > 0) {
      setTimeout(() => instance.fitView({ padding: 0.2 }), 100);
    }
  };

  // Ajustar view quando container redimensiona
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ padding: 0.2 });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [readOnly, setEdges]
  );

  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(nodes, edges);
    } else {
      // Export padrão como JSON
      const flowData = {
        nodes,
        edges,
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
        },
      };
      const blob = new Blob([JSON.stringify(flowData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (onImport) {
          onImport(file);
        } else {
          // Import padrão
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const flowData = JSON.parse(event.target?.result as string);
              if (flowData.nodes && flowData.edges) {
                setNodes(flowData.nodes);
                setEdges(flowData.edges);
              }
            } catch (error) {
              console.error('Erro ao importar fluxo:', error);
              alert('Erro ao importar arquivo. Verifique se é um JSON válido.');
            }
          };
          reader.readAsText(file);
        }
      }
    };
    input.click();
  };

  const handleAddNode = (type: keyof typeof nodeColors) => {
    if (readOnly) return;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: nodeColors[type].label,
        config: {},
      },
      style: {
        background: nodeColors[type].color,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleDeleteSelected = () => {
    if (readOnly || !selectedNode) return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  if (showSimulator) {
    return (
      <FlowSimulator
        nodes={nodes}
        edges={edges}
        onClose={() => setShowSimulator(false)}
      />
    );
  }

  return (
    <div className="h-full w-full relative" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView={false}
        onInit={handleInit}
        attributionPosition="bottom-left"
        style={{ width: '100%', height: '100%' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const type = node.type as keyof typeof nodeColors;
            return nodeColors[type]?.color || '#gray';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* Painel de Ferramentas */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {nodes.length} nós
            </Badge>
            <Badge variant="outline" className="text-xs">
              {edges.length} conexões
            </Badge>
          </div>

          {!readOnly && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Adicionar Nó</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(nodeColors).map(([type, config]) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => handleAddNode(type as keyof typeof nodeColors)}
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedNode && !readOnly && (
            <Button
              size="sm"
              variant="destructive"
              className="w-full text-xs"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Deletar Selecionado
            </Button>
          )}
        </Panel>

        {/* Painel de Ações */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
          <Button size="sm" onClick={() => setShowSimulator(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Simular
          </Button>

          {!readOnly && (
            <Button size="sm" onClick={handleSave} variant="default">
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          )}

          <Button size="sm" onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>

          <Button size="sm" onClick={handleImportClick} variant="outline">
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
