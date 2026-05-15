// Templates modernos de automação
// Adicione novos templates aqui

export interface ModernTemplate {
  id: string;
  name: string;
  description: string;
  category: 'whatsapp' | 'crm' | 'ai' | 'integration' | 'notification';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: any[];
  edges: any[];
  tags: string[];
  estimatedTime: string;
  useCase: string;
}

export const flowTemplates: ModernTemplate[] = [];

export default flowTemplates;
