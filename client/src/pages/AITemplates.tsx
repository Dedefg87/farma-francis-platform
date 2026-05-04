import { useState, useEffect } from 'react';
import FarmaDashboardLayout from '@/components/FarmaDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  MessageSquare, 
  ShoppingCart, 
  HelpCircle, 
  Calendar,
  Brain,
  Search,
  Settings,
  Plus,
  Copy,
  Play,
  Edit,
  Trash2,
  ChevronRight,
  FileText,
  Database,
  Zap,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AITemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, unknown>;
  }>;
}

interface NodeType {
  name: string;
  description: string;
  icon: string;
  config: Record<string, {
    type: string;
    required?: boolean;
    options?: string[];
    default?: unknown;
  }>;
}

export default function AITemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);

  const { data: templates, refetch: refetchTemplates } = trpc.automation.list.useQuery();
  const { data: aiConfig } = trpc.ai.getConfig.useQuery();
  
  const createFlow = trpc.automation.create.useMutation({
    onSuccess: () => {
      toast.success('Template de IA criado com sucesso!');
      setIsCreating(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      refetchTemplates();
    },
    onError: () => {
      toast.error('Erro ao criar template');
    },
  });

  const PROFESSIONAL_AI_TEMPLATES: AITemplate[] = [
    {
      id: 'customer-service-ai',
      name: 'Atendimento ao Cliente IA',
      description: 'Template profissional para atendimento automático com classificação de intenções e respostas personalizadas',
      trigger: 'atendimento, ajuda, suporte',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          name: 'Gatilho de Mensagem',
          config: { keywords: ['atendimento', 'ajuda', 'suporte', 'olá', 'bom dia'], channels: ['whatsapp', 'instagram'] }
        },
        {
          id: 'classify-1',
          type: 'ai-classify',
          name: 'Classificar Intenção',
          config: { model: 'gpt-4', prompt: 'Classifique a intenção em: produtos, preços, horários, entrega, devolução, outros', maxTokens: 100 }
        },
        {
          id: 'condition-1',
          type: 'condition',
          name: 'Roteamento Inteligente',
          config: { conditions: [{ field: 'classification', operator: 'equals', value: 'produtos' }] }
        },
        {
          id: 'ai-response-1',
          type: 'ai-response',
          name: 'Consultar Base de Conhecimento',
          config: { model: 'gpt-3.5-turbo', knowledgeBase: 'produtos_farmacia', maxTokens: 300 }
        },
        {
          id: 'human-handoff',
          type: 'transfer',
          name: 'Transferir para Humano',
          config: { priority: 'medium', message: 'Um atendente especializado irá ajudá-lo.' }
        },
        {
          id: 'end-1',
          type: 'end',
          name: 'Finalizar Conversa',
          config: { saveContext: true, followUp: true }
        }
      ]
    },
    {
      id: 'sales-assistant-ai',
      name: 'Assistente de Vendas IA',
      description: 'Template para recomendação de produtos e acompanhamento de vendas com IA',
      trigger: 'comprar, produto, preço, orçamento',
      nodes: [
        {
          id: 'trigger-2',
          type: 'trigger',
          name: 'Gatilho de Interesse',
          config: { keywords: ['comprar', 'produto', 'preço', 'orçamento', 'quanto custa'], channels: ['whatsapp', 'instagram'] }
        },
        {
          id: 'extract-1',
          type: 'ai-extract',
          name: 'Identificar Necessidades',
          config: { model: 'gpt-4', prompt: 'Extraia as necessidades do cliente: tipo de produto, sintomas, orçamento, urgência', maxTokens: 150 }
        },
        {
          id: 'recommend-1',
          type: 'ai-recommendation',
          name: 'Recomendar Produtos',
          config: { model: 'gpt-3.5-turbo', knowledgeBase: 'produtos_farmacia', maxProducts: 3, maxTokens: 400 }
        },
        {
          id: 'show-images',
          type: 'media',
          name: 'Exibir Imagens dos Produtos',
          config: { mediaType: 'image', source: 'recommendations' }
        },
        {
          id: 'checkout-1',
          type: 'ai-checkout',
          name: 'Processar Compra',
          config: { paymentMethods: ['cartão', 'pix', 'dinheiro'], deliveryOptions: ['retirada', 'entrega', 'delivery'] }
        },
        {
          id: 'confirm-order',
          type: 'ai-confirm',
          name: 'Confirmar Pedido',
          config: { prompt: 'Confirme os detalhes do pedido com o cliente' }
        },
        {
          id: 'schedule-followup',
          type: 'schedule',
          name: 'Agendar Follow-up',
          config: { scheduleType: 'cron', cronExpression: '0 9 * * 1', message: 'Olá! Seu pedido está a caminho!' }
        }
      ]
    },
    {
      id: 'faq-assistant-ai',
      name: 'Assistente de FAQ IA',
      description: 'Template para responder perguntas frequentes usando busca semântica em base de conhecimento',
      trigger: 'pergunta, dúvida, como, onde, qual',
      nodes: [
        {
          id: 'trigger-3',
          type: 'trigger',
          name: 'Gatilho de Pergunta',
          config: { keywords: ['pergunta', 'dúvida', 'como', 'onde', 'qual', 'horário'], channels: ['whatsapp', 'instagram'] }
        },
        {
          id: 'extract-question',
          type: 'ai-extract',
          name: 'Extrair Pergunta',
          config: { model: 'gpt-4', prompt: 'Identifique a pergunta principal do cliente e o tópico relacionado', maxTokens: 100 }
        },
        {
          id: 'knowledge-search',
          type: 'knowledge-search',
          name: 'Buscar no Conhecimento',
          config: { knowledgeBase: 'faq_farmacia', searchType: 'semantic', maxResults: 5 }
        },
        {
          id: 'select-best',
          type: 'ai-select',
          name: 'Selecionar Melhor Resposta',
          config: { model: 'gpt-3.5-turbo', prompt: 'Selecione a resposta mais relevante para a pergunta do cliente' }
        },
        {
          id: 'format-response',
          type: 'ai-format',
          name: 'Formatar Resposta',
          config: { model: 'gpt-3.5-turbo', prompt: 'Formate a resposta de forma clara e profissional' }
        },
        {
          id: 'ask-more',
          type: 'ai-prompt',
          name: 'Perguntar se Precisa de Mais Ajuda',
          config: { model: 'gpt-3.5-turbo', prompt: 'Pergunte se o cliente tem mais dúvidas' }
        }
      ]
    },
    {
      id: 'appointment-scheduler-ai',
      name: 'Agendamento de Consultas IA',
      description: 'Template para agendamento automático de consultas com verificação de disponibilidade',
      trigger: 'agendar, marcar, consulta, horário',
      nodes: [
        {
          id: 'trigger-4',
          type: 'trigger',
          name: 'Gatilho de Agendamento',
          config: { keywords: ['agendar', 'marcar', 'consulta', 'horário', 'disponível'], channels: ['whatsapp', 'instagram'] }
        },
        {
          id: 'extract-appointment',
          type: 'ai-extract',
          name: 'Coletar Informações',
          config: { model: 'gpt-4', prompt: 'Identifique: tipo de consulta, data preferida, horário preferido', maxTokens: 150 }
        },
        {
          id: 'check-availability',
          type: 'api-call',
          name: 'Verificar Disponibilidade',
          config: { endpoint: '/api/appointments/availability', method: 'POST', body: { type: '{{type}}', date: '{{date}}' } }
        },
        {
          id: 'show-availability',
          type: 'ai-format',
          name: 'Exibir Horários',
          config: { model: 'gpt-3.5-turbo', prompt: 'Formate os horários disponíveis de forma clara' }
        },
        {
          id: 'select-time',
          type: 'ai-prompt',
          name: 'Confirmar Horário',
          config: { model: 'gpt-3.5-turbo', prompt: 'Peça para o cliente confirmar o horário escolhido' }
        },
        {
          id: 'book-appointment',
          type: 'api-call',
          name: 'Confirmar Agendamento',
          config: { endpoint: '/api/appointments/book', method: 'POST', body: { customerId: '{{customerId}}', dateTime: '{{selectedTime}}' } }
        },
        {
          id: 'send-reminder',
          type: 'schedule',
          name: 'Enviar Lembrete',
          config: { scheduleType: 'cron', cronExpression: '0 9 * * -1', message: 'Lembrete: Você tem consulta hoje!' }
        }
      ]
    }
  ];

  const AI_NODE_TYPES: NodeType[] = [
    {
      name: 'Classificar Intenção',
      description: 'Classifica a intenção do cliente usando IA',
      icon: '🎯',
      config: {
        model: { type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'], required: true },
        prompt: { type: 'textarea', required: true },
        maxTokens: { type: 'number', default: 100 }
      }
    },
    {
      name: 'Responder com IA',
      description: 'Gera resposta usando IA com contexto da conversa',
      icon: '🤖',
      config: {
        model: { type: 'select', options: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'], required: true },
        knowledgeBase: { type: 'select', options: ['produtos_farmacia', 'faq_farmacia', 'politicas_farmacia'] },
        prompt: { type: 'textarea', required: true },
        temperature: { type: 'number', default: 0.3 }
      }
    },
    {
      name: 'Recomendar Produtos',
      description: 'Recomenda produtos baseado nas necessidades',
      icon: '🛍️',
      config: {
        model: { type: 'select', options: ['gpt-4', 'gpt-3.5-turbo'], required: true },
        knowledgeBase: { type: 'select', options: ['produtos_farmacia'], required: true },
        maxProducts: { type: 'number', default: 3 }
      }
    },
    {
      name: 'Buscar no Conhecimento',
      description: 'Busca respostas em base de conhecimento',
      icon: '🔍',
      config: {
        knowledgeBase: { type: 'select', options: ['faq_farmacia', 'produtos_farmacia', 'politicas_farmacia'], required: true },
        searchType: { type: 'select', options: ['semantic', 'keyword'] },
        maxResults: { type: 'number', default: 5 }
      }
    },
    {
      name: 'Extrair Informações',
      description: 'Extrai dados específicos da mensagem',
      icon: '📋',
      config: {
        model: { type: 'select', options: ['gpt-4', 'gpt-3.5-turbo'], required: true },
        prompt: { type: 'textarea', required: true }
      }
    },
    {
      name: 'Confirmar Ação',
      description: 'Confirmações e validações com cliente',
      icon: '✅',
      config: {
        model: { type: 'select', options: ['gpt-3.5-turbo', 'claude-3'], required: true },
        prompt: { type: 'textarea', required: true }
      }
    },
    {
      name: 'Transferir para Humano',
      description: 'Transfere para atendente humano',
      icon: '👤',
      config: {
        priority: { type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
        message: { type: 'textarea' }
      }
    },
    {
      name: 'Chamar API',
      description: 'Integração com APIs externas',
      icon: '⚡',
      config: {
        endpoint: { type: 'text', required: true },
        method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
        body: { type: 'json' }
      }
    },
    {
      name: 'Agendar Tarefa',
      description: 'Agendamento de mensagens e lembretes',
      icon: '⏰',
      config: {
        scheduleType: { type: 'select', options: ['cron', 'interval'] },
        cronExpression: { type: 'text' },
        message: { type: 'textarea', required: true }
      }
    }
  ];

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const useTemplate = (template: AITemplate) => {
    createFlow.mutate({
      name: template.name,
      description: template.description,
      flowData: JSON.stringify({
        nodes: template.nodes.map((node, index) => ({
          id: node.id,
          type: node.type,
          position: { x: 100, y: 100 + (index * 150) },
          data: { label: node.name, config: node.config }
        })),
        edges: template.nodes.slice(0, -1).map((node, index) => ({
          id: `e-${node.id}-${template.nodes[index + 1].id}`,
          source: node.id,
          target: template.nodes[index + 1].id
        }))
      })
    });
    toast.success(`Template "${template.name}" criado com sucesso!`);
  };

  const duplicateTemplate = (template: AITemplate) => {
    createFlow.mutate({
      name: `${template.name} (Cópia)`,
      description: template.description,
      flowData: JSON.stringify({
        nodes: template.nodes.map((node, index) => ({
          id: `${node.id}-copy-${Date.now()}`,
          type: node.type,
          position: { x: 100, y: 100 + (index * 150) },
          data: { label: `${node.name} (Cópia)`, config: node.config }
        })),
        edges: []
      })
    });
    toast.success('Template duplicado com sucesso!');
  };

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Automação IA
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure fluxos de conversa com inteligência artificial
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                <Search className="w-4 h-4 mr-2" />
                {previewMode ? 'Editar' : 'Visualizar'}
              </Button>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Template IA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Template de IA</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Nome do Template</Label>
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Ex: Atendimento Personalizado"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                        placeholder="Descreva o objetivo deste template..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={() => {
                      if (newTemplateName.trim()) {
                        createFlow.mutate({
                          name: newTemplateName,
                          description: newTemplateDescription,
                          flowData: JSON.stringify({ nodes: [], edges: [] })
                        });
                      }
                    }} className="w-full">
                      Criar Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="templates">
                <Sparkles className="w-4 h-4 mr-2" />
                Templates IA
              </TabsTrigger>
              <TabsTrigger value="nodes">
                <Settings className="w-4 h-4 mr-2" />
                Nós de IA
              </TabsTrigger>
              <TabsTrigger value="knowledge">
                <Database className="w-4 h-4 mr-2" />
                Base de Conhecimento
              </TabsTrigger>
              <TabsTrigger value="config">
                <Zap className="w-4 h-4 mr-2" />
                Configuração
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROFESSIONAL_AI_TEMPLATES.map((template) => (
                  <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Brain className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {template.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="w-3 h-3" />
                        <span>Gatilho: {template.trigger}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Settings className="w-3 h-3" />
                        <span>{template.nodes.length} nós configurados</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Button variant="outline" size="sm" className="w-full mb-2" onClick={() => toggleNode(template.id)}>
                        <ChevronRight className={`w-4 h-4 mr-2 transition-transform ${expandedNodes.has(template.id) ? 'rotate-90' : ''}`} />
                        Visualizar Fluxo
                      </Button>
                      
                      {expandedNodes.has(template.id) && (
                        <div className="bg-muted rounded-lg p-3 space-y-2 max-h-48 overflow-auto">
                          {template.nodes.map((node, index) => (
                            <div key={node.id} className="flex items-center gap-2 text-xs">
                              <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <span className="font-medium">{node.name}</span>
                              <span className="text-muted-foreground">({node.type})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="flex-1" onClick={() => useTemplate(template)}>
                        <Play className="w-4 h-4 mr-1" />
                        Usar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateTemplate(template)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                {templates?.filter(t => t.flowData?.includes('ai-') || t.flowData?.includes('AI-')).map((flow) => (
                  <Card key={flow.id} className="p-6 border-dashed">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{flow.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {flow.executionCount || 0} execuções
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs ${flow.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {flow.isActive ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Play className="w-4 h-4 mr-1" />
                        Testar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="nodes">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AI_NODE_TYPES.map((nodeType) => (
                  <Card key={nodeType.name} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{nodeType.icon}</span>
                      <div>
                        <h3 className="font-semibold">{nodeType.name}</h3>
                        <p className="text-xs text-muted-foreground">{nodeType.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(nodeType.config).map(([key, config]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-muted-foreground">
                            {config.type === 'select' ? 'Seleção' : config.type === 'textarea' ? 'Texto' : config.type}
                            {config.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="w-full mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar ao Fluxo
                    </Button>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="knowledge">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">FAQ da Farmácia</h3>
                      <p className="text-xs text-muted-foreground">242 entradas</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Perguntas frequentes sobre horários, formas de pagamento, políticas de entrega e devolução.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-100">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Catálogo de Produtos</h3>
                      <p className="text-xs text-muted-foreground">1.567 produtos</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Informações completas sobre medicamentos, cosméticos, vitaminas e suplementos.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Políticas da Farmácia</h3>
                      <p className="text-xs text-muted-foreground">85 entradas</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Políticas internas, privacidade LGPD, garantias e termos de uso.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 border-dashed">
                  <div className="flex items-center justify-center h-full">
                    <Button variant="outline" className="w-full h-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Base de Conhecimento
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="config">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Provedores de IA
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>OpenAI API Key</Label>
                      <Input type="password" placeholder="sk-..." className="mt-1" />
                    </div>
                    <div>
                      <Label>Anthropic API Key</Label>
                      <Input type="password" placeholder="sk-ant-..." className="mt-1" />
                    </div>
                    <div>
                      <Label>Modelo Padrão</Label>
                      <Select defaultValue="gpt-3.5-turbo">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">Salvar Configurações</Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    Configurações de Segurança
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Validação de Respostas IA</Label>
                      <Button size="sm" variant="outline">Ativar</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Fallback para Humano</Label>
                      <Button size="sm" variant="outline">Ativar</Button>
                    </div>
                    <div>
                      <Label>Tempo Máximo de Resposta (ms)</Label>
                      <Input type="number" defaultValue="10000" className="mt-1" />
                    </div>
                    <div>
                      <Label>Máximo de Tentativas</Label>
                      <Input type="number" defaultValue="3" className="mt-1" />
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FarmaDashboardLayout>
  );
}