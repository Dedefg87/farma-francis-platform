import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlowTemplate } from "../types";

interface TemplateCardProps {
  template: FlowTemplate;
  onUse: () => void;
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  const Icon = template.icon;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${template.color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{template.name}</h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {template.description}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <span>{template.nodes.length} nós</span>
        <span>•</span>
        <span>{template.edges.length} conexões</span>
      </div>
      <Button className="w-full" onClick={onUse}>
        Usar Template
      </Button>
    </Card>
  );
}
