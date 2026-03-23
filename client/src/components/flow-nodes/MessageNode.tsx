import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

function MessageNode({ data, selected }: NodeProps) {
  return (
    <Card className={`min-w-[220px] ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💬</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">Enviar Mensagem</div>
            <div className="text-xs text-muted-foreground">
              {data.config?.message || "Configure a mensagem"}
            </div>
          </div>
          <Badge className="bg-blue-600">Ação</Badge>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-blue-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-600" />
    </Card>
  );
}

export default memo(MessageNode);
