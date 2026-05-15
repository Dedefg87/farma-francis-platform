// Templates de fluxos de automação
// Adicione novos templates aqui

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  nodes: any[];
  edges: any[];
}

export const flowTemplates: FlowTemplate[] = [];
