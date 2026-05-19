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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Play, Save, Download, Upload, Trash2, X, Search,
  ChevronDown, ChevronRight, GripVertical, ZoomIn, ZoomOut, Maximize2,
  GitBranch, Filter, Send, Brain, Code, Pause, Globe, ArrowRight, Package,
  Phone, Mail, Bot, UserCheck, FileText, CreditCard, Clock, Database,
  Settings, MessageSquare, Zap, AlertTriangle, TestTube, Copy, Undo2, Redo2,
  FileCheck, Heart, ShieldCheck, Calendar, TrendingUp, DollarSign, Truck,
  UserPlus, Thermometer, FileX, CreditCard as CreditCardIcon, Store, Video,
  ShoppingBag, Calculator, Megaphone, Shield, Clipboard, BarChart, Eye,
  Landmark, ShoppingBasket, Building, LineChart, Megaphone as Megaphone2,
  RefreshCw, ClipboardCheck, Hash, StickyNote, Layers,
} from 'lucide-react';
import {
  NODE_TYPES, CATEGORIES, getNodeType, WorkflowNode, ConfigField,
} from './node-types';
import CustomNode from './components/CustomNode/CustomNode';
import CustomEdge from './components/CustomEdge/CustomEdge';
import { SimulationModal } from './components/SimulationModal/SimulationModal';

// ==================== ICON MAPS ====================

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  triggers: Zap,
  logic: GitBranch,
  messages: Send,
  ai: Brain,
  actions: Code,
  wait: Pause,
  integrations: Globe,
  flow: ArrowRight,
  pharmacy: Package,
  core_triggers: Zap,
  core_logic: GitBranch,
  core_actions: Code,
  core_data: Database,
  integrations_br: Landmark,
  delivery_br: ShoppingBasket,
  fiscal_br: Building,
  marketing_br: Megaphone,
  ai_generic: Brain,
  payments: CreditCardIcon,
  entrada: FileCheck,
  ia: Brain,
  saude: Heart,
  erp: Package,
  comunicacao: MessageSquare,
  compliance: ShieldCheck,
  agenda: Calendar,
  marketing: TrendingUp,
  financeiro: DollarSign,
  logistica: Truck,
  crm: UserPlus,
  iot: Thermometer,
  fiscal: FileX,
  beneficios: CreditCardIcon,
  atendimento_ia: Bot,
  estoque_seg: ClipboardCheck,
  automacao_proc: RefreshCw,
  ecommerce: Store,
  telemedicina: Video,
  marketing_ia: ShoppingBag,
  financeiro_erp: Calculator,
  comunicacao_mkt: Megaphone,
  compliance_anvisa: Shield,
  saude_ia: Clipboard,
  analytics: BarChart,
  pagamentos: DollarSign,
  ia_compliance: Eye,
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

const nodeTypes = { customNode: CustomNode };
const edgeTypes = { custom: CustomEdge };

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    // Select edge for deletion
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id,
      }))
    );
  }, [setEdges]);

// ==================== PROPS ====================

interface N8NEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onSimulate?: () => void;
  isFullCanvas?: boolean;
}

// ==================== MAIN COMPONENT ====================

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
      return { ...node, type: mapped };
    }
    return { ...node, type: "customNode" as any };
  });
}

// ==================== SIMPLIFIED CATEGORIES FOR SIDEBAR ====================

const SIDEBAR_CATEGORIES = [
  { id: 'triggers', label: 'Triggers', icon: Zap, color: '#f97316' },
  { id: 'logic', label: 'Logic', icon: GitBranch, color: '#eab308' },
  { id: 'actions', label: 'Actions', icon: Code, color: '#3b82f6' },
  { id: 'integrations', label: 'Integrations', icon: Globe, color: '#10b981' },
  { id: 'ai', label: 'AI', icon: Brain, color: '#a855f7' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Package, color: '#2563eb' },
];

// Map node categories to sidebar categories
const CATEGORY_TO_SIDEBAR: Record<string, string> = {
  core_triggers: 'triggers',
  entrada: 'triggers',
  comunicacao: 'triggers',
  comunicacao_mkt: 'triggers',
  core_logic: 'logic',
  compliance: 'logic',
  compliance_anvisa: 'logic',
  ia_compliance: 'logic',
  estoque_seg: 'logic',
  core_actions: 'actions',
  financeiro: 'actions',
  financeiro_erp: 'actions',
  pagamentos: 'actions',
  beneficios: 'actions',
  erp: 'actions',
  logistica: 'actions',
  ecommerce: 'actions',
  automacao_proc: 'actions',
  core_data: 'actions',
  analytics: 'actions',
  crm: 'actions',
  saude: 'actions',
  saude_ia: 'actions',
  telemedicina: 'actions',
  agenda: 'actions',
  fiscal: 'actions',
  fiscal_br: 'actions',
  iot: 'actions',
  integrations: 'integrations',
  integrations_br: 'integrations',
  delivery_br: 'integrations',
  marketing: 'integrations',
  marketing_br: 'integrations',
  marketing_ia: 'integrations',
  erp_br: 'integrations',
  payments: 'integrations',
  ia: 'ai',
  ai_generic: 'ai',
  atendimento_ia: 'ai',
  pharmacy: 'pharmacy',
};

export function N8NEditor({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onSimulate,
  isFullCanvas = false,
}: N8NEditorProps) {
  const sanitizedNodes = sanitizeNodes(initialNodes);
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(sanitizedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    SIDEBAR_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const [showSimulation, setShowSimulation] = useState(false);
  const [nodeConfigState, setNodeConfigState] = useState<Record<string, any>>({});
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Sync config state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setNodeConfigState(selectedNode.data?.configValues || {});
    }
  }, [selectedNode?.id]);

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

  // Find next available grid position inside workspace
  const findNextPosition = useCallback((existingNodes: Node[]): { x: number; y: number } => {
    const cols = 3;
    const cellW = 220;
    const cellH = 100;
    const startX = 120;
    const startY = 100;

    const occupied = new Set<string>();
    existingNodes.forEach((n) => {
      const col = Math.round((n.position.x - startX) / cellW);
      const row = Math.round((n.position.y - startY) / cellH);
      if (col >= 0 && col < cols && row >= 0) {
        occupied.add(`${col},${row}`);
      }
    });

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
      const targetId = target.id;
      setNodes((nds) => nds.filter((n) => n.id !== targetId));
      setEdges((eds) => eds.filter((e) => e.source !== targetId && e.target !== targetId));
      setSelectedNode(null);
    },
    [selectedNode, setNodes, setEdges]
  );

  // Handle edge deletion via custom event
  useEffect(() => {
    const handleDeleteEdge = (e: CustomEvent) => {
      const edgeId = e.detail?.edgeId;
      if (edgeId) {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      }
    };
    window.addEventListener('delete-edge', handleDeleteEdge as EventListener);
    return () => window.removeEventListener('delete-edge', handleDeleteEdge as EventListener);
  }, [setEdges]);

  const handleDuplicateNode = useCallback(
    (node: Node) => {
      setNodes((nds) => {
        const position = findNextPosition(nds);
        return [...nds, {
          ...node,
          id: `${node.data?.nodeType}-${Date.now()}`,
          position,
          data: { ...node.data },
        }];
      });
    },
    [setNodes, findNextPosition]
  );

  const handleClearFlow = useCallback(() => {
    if (nodes.length === 0) return;
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [nodes, setNodes, setEdges]);

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

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

  const handleSimulate = () => setShowSimulation(true);

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

  // Group nodes by sidebar category
  const nodesBySidebarCategory = useMemo(() => {
    const grouped: Record<string, WorkflowNode[]> = {};
    filteredNodes.forEach((node) => {
      const sidebarCat = CATEGORY_TO_SIDEBAR[node.category] || 'actions';
      if (!grouped[sidebarCat]) grouped[sidebarCat] = [];
      grouped[sidebarCat].push(node);
    });
    return grouped;
  }, [filteredNodes]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // ==================== RENDER ====================

  return (
    <>
    <div className="flex h-full w-full bg-[#0f172a]">
      {/* ============ LEFT SIDEBAR ============ */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0 ${
          sidebarOpen ? 'w-[260px]' : 'w-12'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-800">Nodes</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
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
                  placeholder="Search nodes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs h-8 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto">
              {SIDEBAR_CATEGORIES.map((category) => {
                const catNodes = nodesBySidebarCategory[category.id] || [];
                if (catNodes.length === 0) return null;
                const isExpanded = expandedCategories[category.id];
                const CategoryIcon = category.icon;

                return (
                  <div key={category.id} className="border-b border-gray-50">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: category.color + '20' }}
                        >
                          <CategoryIcon className="w-3 h-3" style={{ color: category.color }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {category.label}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
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
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group active:scale-[0.98]"
                            >
                              <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: node.color }}
                              >
                                <NodeIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-gray-700 truncate leading-tight">
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

      {/* ============ MAIN AREA ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        {!isFullCanvas && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => onSave?.(nodes, edges)} className="h-7 text-xs">
                <Save className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSimulate} className="h-7 text-xs">
                <Play className="w-3.5 h-3.5 mr-1" /> Simulate
              </Button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedNode && handleDeleteNode(selectedNode)}
                disabled={!selectedNode}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFlow}
                disabled={nodes.length === 0}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Export
              </Button>
              <label htmlFor="import-file">
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs cursor-pointer">
                  <span>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Import
                  </span>
                </Button>
              </label>
              <input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {nodes.length} nodes · {edges.length} connections
              </span>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeRaw}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={{ x: -50, y: -30, zoom: 0.9 }}
            minZoom={0.3}
            maxZoom={1.5}
            className="bg-[#f8fafc]"
            proOptions={{ hideAttribution: true }}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'custom',
              animated: false,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
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

            {/* Zoom controls */}
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

        {/* ============ BOTTOM: LOGS & EXECUTION ============ */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0 max-h-[180px] overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-gray-700">Logs & Execution</span>
            </div>
            <Badge variant="outline" className="text-[10px] text-gray-500">
              {nodes.length} nodes active
            </Badge>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-1.5 font-medium">Time</th>
                <th className="text-left px-4 py-1.5 font-medium">Status</th>
                <th className="text-left px-4 py-1.5 font-medium">Type</th>
                <th className="text-left px-4 py-1.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-400">
                    No nodes in workflow. Drag nodes from the sidebar to begin.
                  </td>
                </tr>
              ) : (
                nodes.slice(0, 5).map((node, idx) => (
                  <tr key={node.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-1.5 text-gray-500">—</td>
                    <td className="px-4 py-1.5">
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                        Ready
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5 text-gray-600 font-medium">{node.data?.label || 'Node'}</td>
                    <td className="px-4 py-1.5">
                      <button className="text-gray-400 hover:text-gray-600 text-[10px]">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ RIGHT CONFIG PANEL ============ */}
      {selectedNode && (
        <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Panel Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getNodeType(selectedNode.data?.nodeType)?.color || '#6b7280' }}
              >
                {React.createElement(
                  nodeIconMap[selectedNode.data?.nodeType] || Settings,
                  { className: 'w-4 h-4 text-white' }
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
                onClick={() => selectedNode && handleDuplicateNode(selectedNode)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Duplicate (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteNode()}
                className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                title="Delete (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Close (Esc)"
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
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === selectedNode.id
                      ? { ...n, data: { ...n.data, configValues: { ...n.data.configValues, [key]: value } } }
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
          <div className="p-3 border-t border-gray-100 flex-shrink-0 space-y-2">
            <Button size="sm" className="w-full h-8 text-xs bg-green-600 hover:bg-green-700">
              <TestTube className="w-3.5 h-3.5 mr-1.5" /> Test Node
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => handleDeleteNode()}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Node
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

// ==================== NODE CONFIG PANEL (inline) ====================

interface NodeConfigPanelProps {
  node: Node;
  configState: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  onLabelChange: (newLabel: string) => void;
}

function NodeConfigPanel({ node, configState, onConfigChange, onLabelChange }: NodeConfigPanelProps) {
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return <div className="p-4 text-sm text-gray-500">Node not found</div>;

  const values = configState || node.data?.config || {};

  return (
    <div className="space-y-4">
      {/* Node Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Type</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: nodeDef.color }} />
          <span className="text-sm font-medium text-gray-800">{nodeDef.label}</span>
        </div>
        {nodeDef.description && (
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{nodeDef.description}</p>
        )}
      </div>

      {/* Label */}
      <div>
        <Label className="text-xs text-gray-500 mb-1.5 block">Node Name</Label>
        <Input
          value={node.data?.label || ''}
          onChange={(e) => onLabelChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Ports Info */}
      {(nodeDef.inputs?.length || nodeDef.outputs?.length) && (
        <div>
          <Label className="text-xs text-gray-500 mb-1.5 block">Connections</Label>
          <div className="space-y-1.5">
            {nodeDef.inputs && nodeDef.inputs.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-gray-600">{nodeDef.inputs.length} input(s)</span>
              </div>
            )}
            {nodeDef.outputs && nodeDef.outputs.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-gray-600">{nodeDef.outputs.length} output(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config Fields */}
      {nodeDef.config && nodeDef.config.length > 0 && (
        <div>
          <Label className="text-xs text-gray-500 mb-2 block">Settings</Label>
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
                  <Select
                    value={values[field.key] ?? ''}
                    onValueChange={(val) => onConfigChange(field.key, val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'json' || field.type === 'prompt' ? (
                  <Textarea
                    placeholder={field.placeholder}
                    value={values[field.key] ?? field.defaultValue ?? ''}
                    onChange={(e) => onConfigChange(field.key, e.target.value)}
                    className="text-sm min-h-[80px] resize-y"
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
                      {values[field.key] ? 'Enabled' : 'Disabled'}
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
