import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Play, Save, Download, Upload, Trash2, X, Search,
  ChevronDown, ChevronRight, GripVertical, ZoomIn, ZoomOut, Maximize2,
  GitBranch, Filter, Send, Brain, Code, Pause, Globe, ArrowRight, Package,
  Phone, Mail, Bot, UserCheck, FileText, CreditCard, Clock, Database,
  Settings, MessageSquare, Zap, AlertTriangle, TestTube, Copy, Undo2, Redo2,
} from 'lucide-react';
import {
  NODE_TYPES, CATEGORIES, getNodeType, WorkflowNode, ConfigField,
} from './node-types';
import CustomNode from './components/CustomNode/CustomNode';
import CustomEdge from './components/CustomEdge/CustomEdge';
import { SimulationModal } from './components/SimulationModal/SimulationModal';

// ==================== ICON MAPS ====================

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  triggers: GitBranch,
  logic: Filter,
  messages: Send,
  ai: Brain,
  actions: Code,
  wait: Pause,
  integrations: Globe,
  flow: ArrowRight,
  pharmacy: Package,
};

const nodeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'whatsapp-incoming': Phone,
  'instagram-dm': Phone,
  'webhook-trigger': Globe,
  'schedule-trigger': Clock,
  'if-else': GitBranch,
  'switch': GitBranch,
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

// ==================== NODE TYPES ====================

const nodeTypes = {
  customNode: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// ==================== PROPS ====================

interface N8NEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onSimulate?: () => void;
  isFullCanvas?: boolean;
}

// ==================== MAIN COMPONENT ====================

export function N8NEditor({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onSimulate,
  isFullCanvas = false,
}: N8NEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const [showSimulation, setShowSimulation] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // ==================== CONNECTIONS ====================

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'custom',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // ==================== DRAG & DROP ====================

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

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 45,
        y: event.clientY - bounds.top - 22,
      };

      const newNode: Node = {
        id: `${nodeId}-${Date.now()}`,
        type: 'customNode',
        position,
        data: {
          label: nodeDef.label,
          nodeType: nodeDef.id,
          inputs: nodeDef.inputs,
          outputs: nodeDef.outputs,
          config: nodeDef.config,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleDragStart = (event: React.DragEvent, nodeDef: WorkflowNode) => {
    event.dataTransfer.setData('application/reactflow-type', 'customNode');
    event.dataTransfer.setData('application/reactflow-nodeid', nodeDef.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  // ==================== NODE ACTIONS ====================

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleDeleteNode = useCallback(
    (nodeToDelete?: Node) => {
      const target = nodeToDelete || selectedNode;
      if (!target) return;
      setNodes((nds) => nds.filter((n) => n.id !== target.id));
      setEdges((eds) => eds.filter((e) => e.source !== target.id && e.target !== target.id));
      setSelectedNode(null);
    },
    [selectedNode, setNodes, setEdges]
  );

  const handleDuplicateNode = useCallback(
    (node: Node) => {
      const newNode: Node = {
        ...node,
        id: `${node.data?.nodeType}-${Date.now()}`,
        position: { x: node.position.x + 160, y: node.position.y },
        data: { ...node.data },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNode) {
        e.preventDefault();
        handleDuplicateNode(selectedNode);
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleDeleteNode, handleDuplicateNode]);

  // ==================== IMPORT / EXPORT ====================

  const handleSimulate = () => {
    setShowSimulation(true);
  };

  const handleExport = () => {
    const flowData = { nodes, edges };
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  // ==================== FILTERED NODES ====================

  const filteredNodes = NODE_TYPES.filter((node) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      node.label.toLowerCase().includes(term) ||
      node.description.toLowerCase().includes(term)
    );
  });

  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) acc[node.category] = [];
    acc[node.category].push(node);
    return acc;
  }, {} as Record<string, WorkflowNode[]>);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // ==================== RENDER ====================

  return (
    <>
    <div className="flex h-full w-full bg-gray-50">
      {/* ============ LEFT SIDEBAR ============ */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0 ${
          sidebarOpen ? 'w-[280px]' : 'w-12'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-800">Nós</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={sidebarOpen ? 'Recolher' : 'Expandir'}
          >
            {sidebarOpen ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
            )}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Search */}
            <div className="p-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar nó..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs h-8"
                />
              </div>
              <div className="mt-1.5 text-[10px] text-gray-400">
                {filteredNodes.length} nós em {CATEGORIES.length} categorias
              </div>
            </div>

            {/* Node Categories */}
            <div className="flex-1 overflow-y-auto">
              {CATEGORIES.map((category) => {
                const catNodes = nodesByCategory[category.id] || [];
                if (catNodes.length === 0) return null;
                const isExpanded = expandedCategories[category.id];
                const CategoryIcon = categoryIcons[category.id] || GitBranch;

                return (
                  <div key={category.id} className="border-b border-gray-50">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-700">
                          {category.label}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {catNodes.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-2 pb-2 space-y-0.5">
                        {catNodes.map((node) => {
                          const NodeIcon = nodeIconMap[node.id] || Settings;
                          return (
                            <div
                              key={node.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, node)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all group"
                            >
                              <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: node.color }}
                              >
                                <NodeIcon className="w-3 h-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 truncate leading-tight">
                                  {node.label}
                                </div>
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

      {/* ============ MAIN CANVAS ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        {!isFullCanvas && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => onSave?.(nodes, edges)} className="h-7 text-xs">
                <Save className="w-3.5 h-3.5 mr-1" /> Salvar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSimulate} className="h-7 text-xs">
                <Play className="w-3.5 h-3.5 mr-1" /> Simular
              </Button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Exportar
              </Button>
              <label htmlFor="import-file">
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs cursor-pointer">
                  <span>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Importar
                  </span>
                </Button>
              </label>
              <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {nodes.length} nós · {edges.length} conexões
              </span>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-50"
            proOptions={{ hideAttribution: true }}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'custom',
              animated: false,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            <Controls
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              nodeColor={(node) => {
                const def = getNodeType(node.data?.nodeType);
                return def?.color || '#6b7280';
              }}
              maskColor="rgba(0,0,0,0.05)"
              position="bottom-right"
            />

            {/* Canvas Controls Panel */}
            <Panel position="top-right" className="flex gap-1 !m-0">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => zoomIn()} title="Zoom in">
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => zoomOut()} title="Zoom out">
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => fitView()} title="Fit view">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* ============ RIGHT CONFIG PANEL ============ */}
      {selectedNode && (
        <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-200">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getNodeType(selectedNode.data?.nodeType)?.color || '#6b7280' }}
              >
                {React.createElement(
                  nodeIconMap[selectedNode.data?.nodeType] || Settings,
                  { className: 'w-3.5 h-3.5 text-white' }
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {selectedNode.data.label}
                </div>
                <div className="text-[10px] text-gray-400">
                  {getNodeType(selectedNode.data?.nodeType)?.category || 'action'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => handleDuplicateNode(selectedNode)}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                title="Duplicar (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteNode()}
                className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors"
                title="Excluir (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                title="Fechar (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <NodeConfigPanel node={selectedNode} />
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <Button size="sm" className="w-full h-8 text-xs">
              <TestTube className="w-3.5 h-3.5 mr-1.5" /> Testar Nó
            </Button>
          </div>
        </div>
      )}
    </div>

    {/* Simulation Modal */}
    <SimulationModal
      isOpen={showSimulation}
      onClose={() => setShowSimulation(false)}
      nodes={nodes}
      edges={edges}
    />
    </>
  );
}

// ==================== CONFIG PANEL ====================

function NodeConfigPanel({ node }: { node: Node }) {
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return <div className="text-sm text-gray-500">Nó não encontrado</div>;

  return (
    <div className="space-y-4">
      {/* Node Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tipo</div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: nodeDef.color }}
          />
          <span className="text-sm font-medium text-gray-800">{nodeDef.label}</span>
        </div>
        {nodeDef.description && (
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{nodeDef.description}</p>
        )}
      </div>

      {/* Label */}
      <div>
        <Label className="text-xs text-gray-500 mb-1.5 block">Nome</Label>
        <Input defaultValue={node.data.label} className="h-8 text-sm" />
      </div>

      {/* Ports Info */}
      {(nodeDef.inputs?.length || nodeDef.outputs?.length) && (
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Conexões</Label>
          <div className="space-y-1.5">
            {nodeDef.inputs && nodeDef.inputs.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-gray-600">{nodeDef.inputs.length} entrada(s)</span>
              </div>
            )}
            {nodeDef.outputs && nodeDef.outputs.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-600">{nodeDef.outputs.length} saída(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config Fields */}
      {nodeDef.config && nodeDef.config.length > 0 && (
        <div>
          <Label className="text-xs text-gray-500 mb-2 block">Configurações</Label>
          <div className="space-y-3">
            {nodeDef.config.map((field: ConfigField) => (
              <div key={field.key}>
                <Label className="text-xs text-gray-600 mb-1 block">{field.label}</Label>
                {field.type === 'string' || field.type === 'password' ? (
                  <Input
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue}
                    className="h-8 text-sm"
                  />
                ) : field.type === 'select' ? (
                  <select className="w-full h-8 text-sm border rounded px-2 bg-white">
                    <option value="">Selecionar...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'json' || field.type === 'prompt' ? (
                  <textarea
                    className="w-full text-sm border rounded p-2 min-h-[80px] resize-y"
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== WRAPPER ====================

export default function N8NEditorWrapper(props: N8NEditorProps) {
  return (
    <ReactFlowProvider>
      <N8NEditor {...props} />
    </ReactFlowProvider>
  );
}
