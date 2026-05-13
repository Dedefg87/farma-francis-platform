import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  BackgroundProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Save, Download, Upload, Plus, Trash2, Settings, Eye, 
  GripVertical, Search, ChevronDown, ChevronRight, X, TestTube,
  MessageSquare, Webhook, Clock, GitBranch, Filter, Send, Brain, Code, Pause, Globe, ArrowRight, Package, Phone, Instagram, Mail, Bell, Database, GitCompare, Repeat, AlertTriangle, UserCheck, CreditCard, FileText, Bot, GitMerge, Copy, CheckCircle
} from 'lucide-react';
import { 
  NODE_TYPES, CATEGORIES, getNodeType, WorkflowNode, ConfigField 
} from './node-types';
import { usePersistentEditorState } from './hooks/usePersistentEditorState';
import { useNodeInteractionHandler } from './hooks/useNodeInteractionHandler';
import { NodeErrorBadge, getNodeErrorClasses } from './components/NodeErrorBadge';
import { FloatingPanel } from './components/FloatingPanel';
import { InlineNodeEditor } from './components/InlineNodeEditor';
import { isFeatureEnabled } from './features';

// Node component for React Flow
function WorkflowNodeComponent({ data, id }: any) {
  const nodeDef = getNodeType(data.nodeType);
  const color = nodeDef?.color || '#6b7280';
  const Icon = nodeDef?.icon;
  const hasErrors = nodeDef?.errors?.some((e: any) => e.severity === 'error');
  const hasWarnings = nodeDef?.errors?.some((e: any) => e.severity === 'warning');

  const borderColor = hasErrors ? '#ef4444' : hasWarnings ? '#f59e0b' : color;
  const errorRingClass = hasErrors ? 'ring-2 ring-red-400 ring-offset-1' : hasWarnings ? 'ring-2 ring-amber-400 ring-offset-1' : '';

  return (
    <div
      className={errorRingClass}
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'white',
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '180px',
        fontSize: '14px',
        cursor: 'grab',
        position: 'relative',
      }}
    >
      {/* Error/Warning Badge */}
      {isFeatureEnabled('ERROR_INDICATOR') && nodeDef?.errors && nodeDef.errors.length > 0 && (
        <div
          className={`absolute -top-2 -right-2 z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 border-white text-white text-[10px] font-bold shadow-sm ${
            hasErrors ? 'bg-red-500' : 'bg-amber-500'
          }`}
          title={nodeDef.errors.map((e: any) => e.message).join('\n')}
        >
          {nodeDef.errors.length > 1 ? nodeDef.errors.length : '!'}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        {Icon && <Icon size={16} style={{ color }} />}
        <span style={{ fontWeight: 500, color: '#1f2937' }}>{data.label}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280' }}>{nodeDef?.description}</div>
    </div>
  );
}

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// Map category id to icon
const categoryIcons: Record<string, React.ComponentType> = {
  'triggers': GitBranch,
  'logic': Filter,
  'messages': Send,
  'ai': Brain,
  'actions': Code,
  'wait': Pause,
  'integrations': Globe,
  'flow': ArrowRight,
  'pharmacy': Package,
};

const nodeIconMap: Record<string, React.ComponentType> = {
  'whatsapp-incoming': Phone,
  'instagram-dm': Instagram,
  'webhook-trigger': Globe,
  'schedule-trigger': Clock,
  'if-else': GitBranch,
  'switch': GitCompare,
  'filter': Filter,
  'whatsapp-send': Phone,
  'email-send': Mail,
  'openai-gpt': Brain,
  'claude-anthropic': Bot,
  'create-task': Code,
  'http-request': Globe,
  'wait': Pause,
  'human-approval': UserCheck,
  'check-prescription': FileText,
  'pix-confirmation': CreditCard,
  'attendance-create': Phone,
};

interface N8NEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onSimulate?: () => void;
  isFullCanvas?: boolean;
}

export function N8NEditor({ initialNodes = [], initialEdges = [], onSave, onSimulate, isFullCanvas = false }: N8NEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [floatingPanelNode, setFloatingPanelNode] = useState<Node | null>(null);
  const [inlineEditNode, setInlineEditNode] = useState<Node | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Handlers centralizados de interação
  const interactionHandlers = useNodeInteractionHandler(
    (node) => {
      setSelectedNode(node);
      setFloatingPanelNode(node);
    },
    (node) => {
      setInlineEditNode(node);
    },
    300
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      const nodeId = event.dataTransfer.getData('application/reactflow-nodeid');
      if (!type || !nodeId) return;

      const nodeDef = getNodeType(nodeId);
      if (!nodeDef) return;

      // screenToFlowPosition requires reactflow instance; we'll use clientX/clientY relative to wrapper
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = {
        x: event.clientX - bounds.left - 90, // adjust for node width
        y: event.clientY - bounds.top - 20,
      };

      const newNode: Node = {
        id: `${nodeId}-${Date.now()}`,
        type: 'workflowNode',
        position,
        data: {
          label: nodeDef.label,
          nodeType: nodeDef.id,
          inputs: nodeDef.inputs,
          outputs: nodeDef.outputs,
          config: nodeDef.config,
          onClick: handleNodeClick,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleNodeClick = (nodeData: any) => {
    const node = nodes.find(n => n.data === nodeData);
    setSelectedNode(node || null);
  };

  const handleDragStart = (event: React.DragEvent, nodeDef: WorkflowNode) => {
    event.dataTransfer.setData('application/reactflow-type', 'workflowNode');
    event.dataTransfer.setData('application/reactflow-nodeid', nodeDef.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const filteredNodes = NODE_TYPES.filter(node => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return node.label.toLowerCase().includes(term) || node.description.toLowerCase().includes(term);
  });

  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) acc[node.category] = [];
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, WorkflowNode[]>);

  const handleSave = () => {
    if (onSave) onSave(nodes, edges);
  };

  const handleExport = () => {
    const flowData = { nodes, edges };
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automation-flow.json';
    a.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target?.result as string);
        if (flowData.nodes) setNodes(flowData.nodes);
        if (flowData.edges) setEdges(flowData.edges);
      } catch (err) {
        console.error('Invalid JSON file', err);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteNode = useCallback((nodeToDelete?: Node) => {
    const target = nodeToDelete || selectedNode;
    if (!target) return;
    setNodes((nds) => nds.filter((node) => node.id !== target.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== target.id && edge.target !== target.id));
    setSelectedNode(null);
    setFloatingPanelNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const handleDuplicateNode = useCallback((node: Node) => {
    const newNode: Node = {
      ...node,
      id: `${node.data?.nodeType}-${Date.now()}`,
      position: {
        x: node.position.x + 200,
        y: node.position.y,
      },
      data: {
        ...node.data,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setFloatingPanelNode(null);
  }, [setNodes]);

  const handleInlineEditSave = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label: newLabel } }
          : n
      )
    );
    setInlineEditNode(null);
  }, [setNodes]);

  const handleEditFromFloating = useCallback((node: Node) => {
    setFloatingPanelNode(null);
    setSelectedNode(node);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleDeleteNode]);

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-12'} flex flex-col`}>
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && <h3 className="font-semibold text-gray-800 text-sm">Adicionar Nó</h3>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded">
            {sidebarOpen ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar nó..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-sm"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {filteredNodes.length} nós encontrados
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {CATEGORIES.map(category => {
                const nodes = nodesByCategory[category.id] || [];
                if (nodes.length === 0) return null;
                const isExpanded = expandedCategories[category.id];
                const CategoryIcon = categoryIcons[category.id] || GitBranch;
                return (
                  <div key={category.id} className="border-b border-gray-100">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon size={16} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{category.label}</span>
                        <span className="text-xs text-gray-400">({nodes.length})</span>
                      </div>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {isExpanded && (
                      <div className="pb-2">
                        {nodes.map(node => {
                          const NodeIcon = nodeIconMap[node.id] || GitBranch;
                          return (
                            <div
                              key={node.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, node)}
                              className="flex items-center gap-2 p-2 mx-2 mb-1 rounded-md cursor-grab hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
                              style={{ borderLeft: `4px solid ${node.color}` }}
                            >
                              <GripVertical size={14} className="text-gray-400" />
                              <NodeIcon size={16} style={{ color: node.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{node.label}</div>
                                <div className="text-xs text-gray-500 truncate">{node.description}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar — escondido em full canvas */}
        <div className={`bg-white border-b border-gray-200 p-3 flex items-center justify-between ${isFullCanvas ? "hidden" : ""}`}>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save size={16} className="mr-1" /> Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={onSimulate}>
              <Play size={16} className="mr-1" /> Simular
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={16} className="mr-1" /> Exportar
            </Button>
            <label htmlFor="import-file">
              <Button variant="outline" size="sm" asChild>
                <span><Upload size={16} className="mr-1" /> Importar</span>
              </Button>
            </label>
            <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <div className="text-sm text-gray-600">
            {nodes.length} nós | {edges.length} conexões
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={interactionHandlers.onNodeClick}
            onNodeDoubleClick={interactionHandlers.onNodeDoubleClick}
            onNodeMouseEnter={interactionHandlers.onNodeMouseEnter}
            onNodeMouseLeave={interactionHandlers.onNodeMouseLeave}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const nodeDef = getNodeType(node.data?.nodeType);
                return nodeDef?.color || '#6b7280';
              }}
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              nodeStrokeWidth={2}
            />
          </ReactFlow>

          {/* Floating Panel */}
          {floatingPanelNode && (
            <FloatingPanel
              node={floatingPanelNode}
              position={{
                x: floatingPanelNode.position.x + 90,
                y: floatingPanelNode.position.y,
              }}
              onEdit={handleEditFromFloating}
              onDuplicate={handleDuplicateNode}
              onDelete={handleDeleteNode}
              onClose={() => setFloatingPanelNode(null)}
            />
          )}

          {/* Inline Editor */}
          {inlineEditNode && (
            <InlineNodeEditor
              node={inlineEditNode}
              onSave={handleInlineEditSave}
              onCancel={() => setInlineEditNode(null)}
            />
          )}
        </div>
      </div>

      {/* Right Config Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Configurar Nó</h3>
            <div className="flex items-center gap-1">
              <button onClick={handleDeleteNode} className="p-1 hover:bg-red-100 rounded text-red-600" title="Excluir nó">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Config Panel com suporte a erros
function NodeConfigPanel({ node, onClose }: { node: Node; onClose: () => void }) {
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return <div>Nó não encontrado</div>;

  const errors = nodeDef?.errors || [];
  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-4">
      {/* Error Summary */}
      {isFeatureEnabled('ERROR_INDICATOR') && hasErrors && (
        <div className={`p-3 rounded-lg border ${
          errors.some((e: any) => e.severity === 'error')
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={errors.some((e: any) => e.severity === 'error') ? 'text-red-500' : 'text-amber-500'} />
            <span className="text-sm font-medium">
              {errors.length} {errors.length === 1 ? 'problema encontrado' : 'problemas encontrados'}
            </span>
          </div>
          <ul className="text-xs text-gray-600 space-y-1 ml-5 list-disc">
            {errors.map((err: any, i: number) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Label>Geral</Label>
        <Input defaultValue={node.data.label} className="mt-1" />
      </div>
      <div>
        <Label>Tipo</Label>
        <Badge style={{ background: nodeDef.color }}>{nodeDef.label}</Badge>
      </div>
      <div>
        <Label>Configurações</Label>
        {nodeDef.config?.map((field: ConfigField) => (
          <div key={field.key} className="mt-2">
            <Label className="text-xs">{field.label}</Label>
            {field.type === 'string' || field.type === 'password' ? (
              <Input type={field.type === 'password' ? 'password' : 'text'} placeholder={field.placeholder} defaultValue={field.defaultValue} className="mt-1" />
            ) : field.type === 'select' ? (
              <select className="w-full mt-1 p-2 border rounded">
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'json' || field.type === 'prompt' ? (
              <textarea className="w-full mt-1 p-2 border rounded h-24 text-sm" placeholder={field.placeholder} defaultValue={field.defaultValue} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="pt-4 border-t">
        <Button size="sm" className="w-full">
          <TestTube size={16} className="mr-1" /> Testar Nó
        </Button>
      </div>
    </div>
  );
}

export default function N8NEditorWrapper(props: N8NEditorProps) {
  return (
    <ReactFlowProvider>
      <N8NEditor {...props} />
    </ReactFlowProvider>
  );
}
