import React, { useState, useCallback, useRef } from 'react';
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
  Handle,
  Position,
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
  MessageSquare, Webhook, Clock, GitBranch, Filter, Send, Brain, Code, Pause, Globe, ArrowRight, Package, Phone, Instagram, Mail, Bell, Database, GitCompare, Repeat, AlertTriangle, UserCheck, CreditCard, FileText, Bot, GitMerge
} from 'lucide-react';
import { 
  NODE_TYPES, CATEGORIES, getNodeType, WorkflowNode, ConfigField 
} from './node-types';
import NodeConfigPanel from './NodeConfigPanel';

// Node component for React Flow with proper handles
function WorkflowNodeComponent({ data }: any) {
  const nodeDef = getNodeType(data.nodeType);
  const color = nodeDef?.color || '#6b7280';
  const Icon = nodeDef?.icon;  
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'white',
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '180px',
        fontSize: '14px',
        cursor: 'grab',
        position: 'relative',
      }}
      onClick={() => data.onClick && data.onClick(data)}
    >
      {/* Input handles (left side) */}
      {data.inputs?.map((input: any) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ background: '#fff', border: `2px solid ${color}` }}
        />
      ))}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        {Icon && <Icon size={16} style={{ color }} />}
        <span style={{ fontWeight: 500, color: '#1f2937' }}>{data.label}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280' }}>{nodeDef?.description}</div>
      
      {/* Output handles (right side) */}
      {data.outputs?.map((output: any) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ background: '#fff', border: `2px solid ${color}` }}
        />
      ))}
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
}

export function N8NEditor({ initialNodes = [], initialEdges = [], onSave, onSimulate }: N8NEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

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

  const handleNodeUpdate = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
        )
      );
    },
    [setNodes]
  );

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Z: Undo (simplified)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        alert('Undo: funcionalidade em desenvolvimento');
      }
      // Del: Delete selected nodes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Simplified: would need to track selected nodes
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);
  const handleSimulate = useCallback(() => {
    if (nodes.length === 0) {
      alert('Nenhum nó para simular!');
      return;
    }
    
    setSimulating(true);
    const steps = nodes.map((node, index) => ({
      nodeId: node.id,
      label: node.data.label,
      status: 'pending', // pending, running, success, error
      input: {},
      output: {},
    }));
    
    setSimulationSteps(steps);
    setCurrentStep(0);
    
    // Simple simulation: iterate through nodes
    const simulateNode = (index: number) => {
      if (index >= steps.length) {
        setSimulating(false);
        return;
      }
      
      // Mark current step as running
      setSimulationSteps(prev => 
        prev.map((step, i) => i === index ? { ...step, status: 'running' } : step)
      );
      
      // Simulate work with timeout
      setTimeout(() => {
        // Mark as success (simplified)
        setSimulationSteps(prev => 
          prev.map((step, i) => i === index ? { ...step, status: 'success' } : step)
        );
        
        // Move to next node
        simulateNode(index + 1);
      }, 1000);
    };
    
    simulateNode(0);
  }, [nodes]);

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
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save size={16} className="mr-1" /> Salvar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSimulate}
              disabled={simulating}
            >
              <Play size={16} className="mr-1" /> {simulating ? 'Simulando...' : 'Simular'}
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
            <Button variant="outline" size="sm" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={16} className="mr-1" /> : <Moon size={16} className="mr-1" />}
              {darkMode ? 'Light' : 'Dark'}
            </Button>
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
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap nodeColor={(node) => {
              const nodeDef = getNodeType(node.data?.nodeType);
              return nodeDef?.color || '#6b7280';
            }} />
          </ReactFlow>
        </div>
        
        {/* Simulation Panel */}
        {simulating && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-h-48 overflow-y-auto shadow-lg z-10">
            <h4 className="text-sm font-medium mb-2">Simulação em Andamento</h4>
            <div className="space-y-2">
              {simulationSteps.map((step, index) => (
                <div 
                  key={step.nodeId} 
                  className={`flex items-center gap-2 text-sm ${
                    index === currentStep ? 'font-bold text-blue-600' : 
                    step.status === 'success' ? 'text-green-600' : 
                    step.status === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    step.status === 'success' ? 'bg-green-500' : 
                    step.status === 'running' ? 'bg-yellow-500 animate-pulse' : 
                    step.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <span>{step.label}</span>
                  <span className="text-xs ml-auto">{step.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Config Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <NodeConfigPanel 
            node={selectedNode} 
            onClose={() => setSelectedNode(null)} 
            onUpdateNode={handleNodeUpdate}
          />
        </div>
      )}
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
