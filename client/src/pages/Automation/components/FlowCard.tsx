import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, Copy, Download, Loader2 } from "lucide-react";
import { VisualFlow } from "../types";

interface FlowCardProps {
  flow: VisualFlow;
  onClick: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  isDuplicating?: boolean;
}

export function FlowCard({ flow, onClick, onDuplicate, onExport, isDuplicating }: FlowCardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={onClick}>
          <Workflow className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{flow.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`px-2 py-0.5 rounded text-xs ${
              flow.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {flow.isActive ? "Ativo" : "Inativo"}
          </div>
        </div>
      </div>
      {flow.description && (
        <p className="text-sm text-muted-foreground mb-3 cursor-pointer" onClick={onClick}>
          {flow.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{flow.executionCount || 0} execuções</span>
        <span>{new Date(flow.updatedAt).toLocaleDateString("pt-BR")}</span>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          disabled={isDuplicating}
        >
          {isDuplicating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span className="ml-1">Duplicar</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
        >
          <Download className="w-4 h-4" />
          <span className="ml-1">Exportar</span>
        </Button>
      </div>
    </Card>
  );
}
