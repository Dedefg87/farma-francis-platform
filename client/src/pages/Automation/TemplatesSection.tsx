import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ArrowRight, CheckCircle, Clock, MessageCircle
} from "lucide-react";
import { flowTemplates } from "./templates";
import type { FlowTemplate } from "./templates/types";

interface TemplatesSectionProps {
  darkMode: boolean;
  onSelectTemplate: (id: string) => void;
}

function getStepSummary(template: FlowTemplate): string[] {
  return template.nodes
    .filter(n => n.data?.label)
    .slice(0, 5)
    .map(n => n.data.label);
}

export function TemplatesSection({ darkMode, onSelectTemplate }: TemplatesSectionProps) {
  const templates = flowTemplates;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Templates Prontos
        </h3>
        <Badge variant="outline" className="text-xs">
          {templates.length} templates disponíveis
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const steps = getStepSummary(template);

          return (
            <Card
              key={template.id}
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                darkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "bg-white hover:border-blue-300"
              }`}
              onClick={() => onSelectTemplate(template.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {template.nodes.length} nós
                    </Badge>
                  </div>
                </div>
                <Zap className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <p className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {template.description}
                </p>

                <div className="space-y-1 mb-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className={`truncate ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-xs">
                    <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                      <MessageCircle className="w-3 h-3 inline mr-1" />
                      {template.edges.length} conexões
                    </span>
                  </div>
                  <Button size="sm" variant="outline">
                    Usar Template
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
