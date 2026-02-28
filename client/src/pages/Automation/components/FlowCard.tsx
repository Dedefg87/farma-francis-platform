import { Card } from "@/components/ui/card";
import { Workflow } from "lucide-react";
import { VisualFlow } from "../types";

interface FlowCardProps {
  flow: VisualFlow;
  onClick: () => void;
}

export function FlowCard({ flow, onClick }: FlowCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{flow.name}</h3>
        </div>
        <div
          className={`px-2 py-0.5 rounded text-xs ${
            flow.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {flow.isActive ? "Ativo" : "Inativo"}
        </div>
      </div>
      {flow.description && (
        <p className="text-sm text-muted-foreground mb-3">
          {flow.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{flow.executionCount || 0} execuções</span>
        <span>{new Date(flow.updatedAt).toLocaleDateString("pt-BR")}</span>
      </div>
    </Card>
  );
}
