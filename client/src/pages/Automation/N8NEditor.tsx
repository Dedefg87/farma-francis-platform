import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

// ==================== NODE TYPE VALIDATION ====================
// Valid node types that the flow engine understands
const VALID_NODE_TYPES = new Set([
  "trigger", "condition", "filter", "switch", "if-else",
  "message", "aiAssistant", "transferHuman", "transfer",
  "createTicket", "wait", "setVariable", "httpRequest", "http-request",
  "uraMenu", "function", "notify", "add_tag", "assign_agent",
  "create_contact", "create_task", "check-prescription",
  "pix-confirmation", "attendance-create", "email-send", "whatsapp-send",
  "customNode",
]);

const NODE_TYPE_MAPPINGS: Record<string, string> = {
  "http_request": "httpRequest",
  "http-request": "httpRequest",
  "set_variable": "setVariable",
  "create_ticket": "createTicket",
  "transfer_human": "transferHuman",
  "ai_assistant": "aiAssistant",
  "ura_menu": "uraMenu",
  "add_tag": "add_tag",
  "assign_agent": "assign_agent",
  "create_contact": "create_contact",
  "create_task": "create_task",
  "whatsapp_send": "whatsapp-send",
  "email_send": "email-send",
  "pix_confirmation": "pix-confirmation",
  "check_prescription": "check-prescription",
  "attendance_create": "attendance-create",
};

function sanitizeNodes(nodes: Node[]): Node[] {
  return nodes.map(node => {
    const rawType = (node.type as string) || "customNode";
    if (VALID_NODE_TYPES.has(rawType)) return node;
    const mapped = NODE_TYPE_MAPPINGS[rawType];
    if (mapped) {
      console.warn(`[N8NEditor] Mapped node type "${rawType}" → "${mapped}" for node "${node.data?.label || node.id}"`);
      return { ...node, type: mapped };
    }
    console.warn(`[N8NEditor] Unknown node type "${rawType}" for node "${node.data?.label || node.id}" — setting to customNode`);
    return { ...node, type: "customNode" as any };
  });
}

export function N8NEditor({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onSimulate,
  isFullCanvas = false,
}: N8NEditorProps) {
  const sanitizedNodes = sanitizeNodes(initialNodes);
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(sanitizedNodes);

  // Wrap onNodesChange to snap positions to grid on drag end
  const onNodesChange = useCallback(
    (changes: any[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging === false && change.position) {
          const snapped = snapToGrid(change.position.x, change.position.y);
          change.position.x = snapped.x;
          change.position.y = snapped.y;
        }
      });
      onNodesChangeRaw(changes);
    },
    [onNodesChangeRaw]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const [showSimulation, setShowSimulation] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Node config local state — synced with selected node
  const [nodeConfigState, setNodeConfigState] = useState<Record<string, any>>({});

  // Workspace area — defined region for placing nodes
  const [showWorkspaceBounds, setShowWorkspaceBounds] = useState(true);
  const WORKSPACE = {
    x: 80,
    y: 60,
    width: 960,
    height: 640,
  };
  const GRID_SIZE = 20;

  // Custom background that shows workspace area with subtle grid
  const BackgroundGrid = useCallback(() => {
    if (!showWorkspaceBounds) {
      return <Background variant={BackgroundVariant.Dots} gap={GRID_SIZE} size={0.5} color="#e2e8f0" />;
    }

    return (
      <svg
        style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {/* Full canvas grid */}
        <defs>
          <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
          <pattern id="workspaceGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <rect width={GRID_SIZE} height={GRID_SIZE} fill="rgba(59,130,246,0.03)" />
            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#smallGrid)" />
        <rect
          x={WORKSPACE.x}
          y={WORKSPACE.y}
          width={WORKSPACE.width}
          height={WORKSPACE.height}
          fill="url(#workspaceGrid)"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="6 3"
          rx="6"
          opacity="0.8"
        />
        <text
          x={WORKSPACE.x + 10}
          y={WORKSPACE.y - 6}
          fill="#3b82f6"
          fontSize="10"
          fontWeight="600"
          opacity="0.5"
        >
          Área de Trabalho
        </text>
      </svg>
    );
  }, [showWorkspaceBounds]);

  // Sync config state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setNodeConfigState(selectedNode.data?.config || {});
    }
  }, [selectedNode?.id, selectedNode?.data?.config]);

  // Sync selectedNode with latest node data from ReactFlow
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find((n) => n.id === selectedNode.id);
      if (updated && updated !== selectedNode) {
        setSelectedNode(updated);
      }
    }
  }, [nodes]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  // Snap a position to the grid
  const snapToGrid = (x: number, y: number): { x: number; y: number } => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  // Always place node inside workspace area
  // If drop is inside workspace, use relative position; if outside, place at center
  const placeInWorkspace = (rawX: number, rawY: number): { x: number; y: number } => {
    const nodeW = 90;
    const nodeH = 44;
    // Check if drop is inside workspace
    const insideX = rawX >= WORKSPACE.x && rawX <= WORKSPACE.x + WORKSPACE.width - nodeW;
    const insideY = rawY >= WORKSPACE.y && rawY <= WORKSPACE.y + WORKSPACE.height - nodeH;

    if (insideX && insideY) {
      // Inside workspace: snap to grid relative to workspace origin
      const relX = rawX - WORKSPACE.x;
      const relY = rawY - WORKSPACE.y;
      return {
        x: WORKSPACE.x + Math.round(relX / GRID_SIZE) * GRID_SIZE,
        y: WORKSPACE.y + Math.round(relY / GRID_SIZE) * GRID_SIZE,
      };
    }

    // Outside workspace: place at a smart default position inside
    // Try to preserve relative offset from workspace center
    const wsCenterX = WORKSPACE.x + WORKSPACE.width / 2;
    const wsCenterY = WORKSPACE.y + WORKSPACE.height / 2;
    const offsetX = rawX - wsCenterX;
    const offsetY = rawY - wsCenterY;

    // Scale offset to fit within workspace (max 40% from center)
    const maxOffsetX = (WORKSPACE.width / 2) * 0.4;
    const maxOffsetY = (WORKSPACE.height / 2) * 0.4;
    const clampedOffsetX = Math.max(-maxOffsetX, Math.min(offsetX, maxOffsetX));
    const clampedOffsetY = Math.max(-maxOffsetY, Math.min(offsetY, maxOffsetY));

    return {
      x: Math.round((wsCenterX + clampedOffsetX) / GRID_SIZE) * GRID_SIZE,
      y: Math.round((wsCenterY + clampedOffsetY) / GRID_SIZE) * GRID_SIZE,
    };
  };

  // Find next available grid position inside workspace
  const findNextPosition = useCallback((existingNodes: Node[]): { x: number; y: number } => {
    const cols = 3;
    const cellW = 220;
    const cellH = 100;
    const startX = WORKSPACE.x + 40;
    const startY = WORKSPACE.y + 40;

    // Build set of occupied grid cells
    const occupied = new Set<string>();
    existingNodes.forEach((n) => {
      const col = Math.round((n.position.x - startX) / cellW);
      const row = Math.round((n.position.y - startY) / cellH);
      occupied.add(`${col},${row}`);
    });

    // Find first free cell
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < cols; col++) {
        if (!occupied.has(`${col},${row}`)) {
          return {
            x: startX + col * cellW,
            y: startY + row * cellH,
          };
        }
      }
    }
    // Fallback: place at end
    return {
      x: startX + (existingNodes.length % cols) * cellW,
      y: startY + Math.floor(existingNodes.length / cols) * cellH,
    };
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow-type');
      const nodeId = event.dataTransfer.getData('application/reactflow-nodeid');
      if (!type || !nodeId) return;

      const nodeDef = getNodeType(nodeId);
      if (!nodeDef) return;

      // Auto-place in next available grid position
      setNodes((nds) => {
        const position = findNextPosition(nds);
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
        return [...nds, newNode];
      });
    },
    [setNodes, findNextPosition]
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

  // ==================== CLEAR FLOW ====================

  const handleClearFlow = useCallback(() => {
    if (nodes.length === 0) return;
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [nodes, edges, setNodes, setEdges]);

  const handleDeleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      handleDeleteNode(selectedNode);
    }
  }, [selectedNode, handleDeleteNode]);

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

  const filteredNodes = useMemo(() => {
    if (!debouncedSearch) return NODE_TYPES;
    const term = debouncedSearch.toLowerCase();
    return NODE_TYPES.filter(
      (node) =>
        node.label.toLowerCase().includes(term) ||
        node.description.toLowerCase().includes(term)
    );
  }, [debouncedSearch]);

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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelectedNode}
                disabled={!selectedNode}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-600"
                title="Excluir nó selecionado (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFlow}
                disabled={nodes.length === 0}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-600"
                title="Limpar todo o fluxo"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
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
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorkspaceBounds(!showWorkspaceBounds)}
                className={`h-7 text-xs ${showWorkspaceBounds ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                title="Mostrar/ocultar área de trabalho"
              >
                <Maximize2 className="w-3.5 h-3.5 mr-1" />
                {showWorkspaceBounds ? 'Área visível' : 'Área oculta'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {nodes.length} nós · {edges.length} conexões
              </span>
              <span className="text-[10px] text-gray-300">
                Grid: {GRID_SIZE}px
              </span>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={false}
            defaultViewport={{ x: -400, y: -200, zoom: 0.85 }}
            minZoom={0.3}
            maxZoom={1.5}
            className="bg-gray-50"
            proOptions={{ hideAttribution: true }}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'custom',
              animated: false,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            }}
          >
            <BackgroundGrid />
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

            {/* Workspace info badge */}
            {showWorkspaceBounds && (
              <Panel position="top-left" className="!m-0 !mt-2">
                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-gray-600 font-medium">
                    Área: {WORKSPACE.width}×{WORKSPACE.height}px · Grid: {GRID_SIZE}px
                  </span>
                  <button
                    onClick={() => setShowWorkspaceBounds(false)}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                    title="Ocultar indicador"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </Panel>
            )}

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
                title="Excluir nó (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                title="Fechar painel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <NodeConfigPanel
              node={selectedNode}
              configState={nodeConfigState}
              onConfigChange={(key, value) => {
                setNodeConfigState(prev => ({ ...prev, [key]: value }));
                // Persist to node data
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } }
                      : n
                  )
                );
              }}
              onLabelChange={(newLabel) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, label: newLabel } }
                      : n
                  )
                );
              }}
            />
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

function NodeConfigPanel({
  node,
  configState,
  onConfigChange,
  onLabelChange,
}: {
  node: Node;
  configState: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  onLabelChange: (label: string) => void;
}) {
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return <div className="text-sm text-gray-500">Nó não encontrado</div>;

  // Use configState as single source of truth for live editing
  const values = configState || node.data?.config || {};

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
        <Input
          value={node.data.label || ''}
          onChange={(e) => onLabelChange(e.target.value)}
          className="h-8 text-sm"
        />
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

      {/* Config Fields — with live state */}
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
                    value={values[field.key] ?? field.defaultValue ?? ''}
                    onChange={(e) => onConfigChange(field.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="w-full h-8 text-sm border rounded px-2 bg-white"
                    value={values[field.key] ?? ''}
                    onChange={(e) => onConfigChange(field.key, e.target.value)}
                  >
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
                    value={values[field.key] ?? field.defaultValue ?? ''}
                    onChange={(e) => onConfigChange(field.key, e.target.value)}
                  />
                ) : field.type === 'number' ? (
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    value={values[field.key] ?? field.defaultValue ?? ''}
                    onChange={(e) => onConfigChange(field.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center gap-2 h-8">
                    <input
                      type="checkbox"
                      checked={!!values[field.key]}
                      onChange={(e) => onConfigChange(field.key, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-500">
                      {values[field.key] ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
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
