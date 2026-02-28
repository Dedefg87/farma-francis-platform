import { Button } from "@/components/ui/button";
import N8NFlowEditor from "@/components/flow/N8NFlowEditor";
import N8NSidebar from "@/components/flow/N8NSidebar";
import { Node } from "reactflow";
import { Loader2 } from "lucide-react";
import { VisualFlow } from "../types";

interface FlowEditorProps {
  flow: VisualFlow;
  onBack: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  onSave: (nodes: Node[], edges: any[]) => void;
  onNodeDoubleClick: (node: Node) => void;
  isSaving?: boolean;
}

export function FlowEditor({
  flow,
  onBack,
  onToggle,
  onDelete,
  onSave,
  onNodeDoubleClick,
  isSaving,
}: FlowEditorProps) {
  const flowData = flow.flowData ? JSON.parse(flow.flowData) : { nodes: [], edges: [] };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Voltar
          </Button>
          <div className="text-sm font-medium">{flow.name}</div>
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Salvando...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(!flow.isActive)}
          >
            {flow.isActive ? "Desativar" : "Ativar"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Tem certeza que deseja deletar este fluxo?")) {
                onDelete();
              }
            }}
          >
            Deletar
          </Button>
        </div>
      </div>
      <div className="flex-1 h-[calc(100vh-200px)] flex">
        <N8NSidebar />
        <div className="flex-1">
          <N8NFlowEditor
            flowId={flow.id}
            initialNodes={flowData.nodes}
            initialEdges={flowData.edges}
            onSave={onSave}
            onNodeDoubleClick={onNodeDoubleClick}
          />
        </div>
      </div>
    </div>
  );
}
