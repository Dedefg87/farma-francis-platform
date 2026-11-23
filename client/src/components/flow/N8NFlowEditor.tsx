import { useCallback, useState, useRef, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from "reactflow";
import { useAutoscroll } from "@/pages/Automation/hooks/useAutoscroll";
import { EnhancedMinimap } from "@/pages/Automation/components/EnhancedMinimap/EnhancedMinimap";
import "reactflow/dist/style.css";
import N8NNode from "./N8NNode";
import CustomEdge from "./CustomEdge";
import EdgeLabelEditor from "./EdgeLabelEditor";
import { Button } from "@/components/ui/button";
import {
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { convertToReactFlow } from "@/lib/flowConverters";

const nodeTypes = {
  trigger: N8NNode,
  message: N8NNode,
  ai: N8NNode,
  condition: N8NNode,
  transfer: N8NNode,
  wait: N8NNode,
  api: N8NNode,
  function: N8NNode,
  set: N8NNode,
  delay: N8NNode,
  action: N8NNode,
  uraMenu: N8NNode,
  createTicket: N8NNode,
};

const edgeTypes = {
  default: CustomEdge,
};

interface N8NFlowEditorProps {
  flowId: number;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onNodeDoubleClick?: (node: Node) => void;
  onEdgeLabelChange?: (edges: Edge[]) => void;
}

export default function N8NFlowEditor({
  flowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onNodeDoubleClick,
  onEdgeLabelChange,
}: N8NFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEdgeLabelEditorOpen, setIsEdgeLabelEditorOpen] = useState(false);
  const [edgeToEdit, setEdgeToEdit] = useState<Edge | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { scrollToNode } = useAutoscroll({ enabled: true });

  // Sync with initialNodes/initialEdges when they change (e.g., when flow data is refreshed)
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          nodeType: type,
        },
      };

      setNodes(nds => nds.concat(newNode));
      toast.success("Nó adicionado ao canvas");
    },
    [reactFlowInstance, setNodes]
  );

  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
      toast.success("Fluxo salvo com sucesso!");
    }
  };

  const handleExport = () => {
    const flowData = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
    };
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flow-${flowId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Fluxo exportado!");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.ivr";
    input.onchange = (e: unknown) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const content = event.target?.result as string;
          // Usar conversor universal que detecta formato automaticamente
          const { nodes: importedNodes, edges: importedEdges } =
            convertToReactFlow(content);
          setNodes(importedNodes);
          setEdges(importedEdges);
          toast.success(
            `Fluxo importado com sucesso! (${importedNodes.length} nós)`
          );
        } catch (error) {
          console.error("Erro ao importar:", error);
          toast.error("Erro ao importar fluxo: " + (error as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleZoomIn = () => {
    reactFlowInstance?.zoomIn();
  };

  const handleZoomOut = () => {
    reactFlowInstance?.zoomOut();
  };

  const handleFitView = () => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  };

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    // Abrir editor de rótulo para conexões
    setIsEdgeLabelEditorOpen(true);
    setEdgeToEdit(edge);
  }, []);

  const handleDeleteSelectedEdge = () => {
    if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      toast.success("Conexão removida");
    }
  };

  const handleEdgeLabelSave = (edgeId: string, label: string) => {
    setEdges(eds => eds.map(e => (e.id === edgeId ? { ...e, label } : e)));
    toast.success("Rótulo da conexão atualizado!");
    setIsEdgeLabelEditorOpen(false);
    setEdgeToEdit(null);

    // Notify parent about edge changes
    if (onEdgeLabelChange) {
      const updatedEdges = edges.map(e =>
        e.id === edgeId ? { ...e, label } : e
      );
      onEdgeLabelChange(updatedEdges);
    }
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      scrollToNode(node);
    },
    [scrollToNode]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node);
      }
    },
    [onNodeDoubleClick]
  );

  // Dispatch drag events for autoscroll to respect manual drag
  const handleNodeDragStart = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nodeDragStart"));
  }, []);

  const handleNodeDragStop = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nodeDragEnd"));
  }, []);

  // Handle edge deletion from custom event
  useEffect(() => {
    const handleDeleteEdge = (event: CustomEvent) => {
      const { edgeId } = event.detail;
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      toast.success("Conexão removida");
    };

    window.addEventListener("deleteEdge" as any, handleDeleteEdge);
    return () => {
      window.removeEventListener("deleteEdge" as any, handleDeleteEdge);
    };
  }, [setEdges]);

  return (
    <div className="w-full h-full flex" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={["Delete", "Backspace"]}
        fitView
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <Panel position="bottom-left" className="!m-3">
          <EnhancedMinimap
            nodes={nodes}
            selectedNodeId={undefined}
            width={200}
            height={150}
          />
        </Panel>
        <Panel
          position="top-right"
          className="flex gap-2 bg-white p-2 rounded-lg shadow-lg border"
        >
          <Button onClick={handleSave} size="sm" variant="default">
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
          <Button onClick={handleImport} size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-1" />
            Importar
          </Button>
          <div className="w-px bg-gray-300" />
          <Button onClick={handleZoomIn} size="sm" variant="ghost">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={handleZoomOut} size="sm" variant="ghost">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button onClick={handleFitView} size="sm" variant="ghost">
            <Maximize2 className="w-4 h-4" />
          </Button>
          {selectedEdge && (
            <>
              <div className="w-px bg-gray-300" />
              <Button
                onClick={() => {
                  setIsEdgeLabelEditorOpen(true);
                  setEdgeToEdit(selectedEdge);
                }}
                size="sm"
                variant="outline"
                className="animate-in fade-in slide-in-from-right-2"
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar Rótulo
              </Button>
              <Button
                onClick={handleDeleteSelectedEdge}
                size="sm"
                variant="destructive"
                className="animate-in fade-in slide-in-from-right-2"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir Conexão
              </Button>
            </>
          )}
        </Panel>
      </ReactFlow>

      <EdgeLabelEditor
        edge={edgeToEdit}
        open={isEdgeLabelEditorOpen}
        onClose={() => {
          setIsEdgeLabelEditorOpen(false);
          setEdgeToEdit(null);
        }}
        onSave={handleEdgeLabelSave}
      />
    </div>
  );
}
