import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

function TriggerNode({ data, selected }: NodeProps) {
  return (
    <Card
      className={`min-w-[200px] ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚡</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Trigger</div>
            <div className="text-xs text-muted-foreground">
              Inicia o fluxo
            </div>
          </div>
          <Badge className="bg-green-600">Início</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Acionado quando uma mensagem é recebida
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-600" />
    </Card>
  );
}

export default memo(TriggerNode);
