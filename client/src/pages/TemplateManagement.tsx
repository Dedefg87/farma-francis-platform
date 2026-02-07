import { useState, useEffect } from 'react';
import FarmaDashboardLayout from '@/components/FarmaDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  ShoppingCart, 
  Pill, 
  Calendar, 
  Check, 
  Zap, 
  Users, 
  Clock,
  TrendingUp,
  Brain,
  Settings,
  ArrowRight,
  Play,
  Eye,
  BarChart3,
  Phone,
  MessageSquare
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  automationsCount?: number;
  flowsCount?: number;
}

interface Flow {
  id: string;
  name: string;
  steps: number;
}

interface Automation {
  id: string;
  name: string;
  type: 'simple' | 'complex';
  enabled: boolean;
}

interface URAConfig {
  id: string;
  name: string;
  aiEnabled: boolean;
  optionsCount: number;
}

export default function TemplateManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { data: templates, refetch: refetchTemplates } = trpc.visualFlows.list.useQuery();
  const { data: aiConfig } = trpc.ai.getConfig.useQuery();

  const applyMutation = trpc.ai.applyTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'Template aplicado com sucesso!');
      setIsApplying(false);
      refetchTemplates();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao aplicar template');
      setIsApplying(false);
    }
  });

  const TEMPLATE_CARDS: Template[] = [
    {
      id: 'premium',
      name: 'Atendimento Premium',
      description: 'Template focado em experiência VIP com atendimento altamente personalizado e priorização imediata',
      icon: '👑',
      color: 'from-purple-600 to-indigo-700',
      features: [
        'Boas-vindas personalizadas',
        'Prioridade imediata',
        'Histórico completo',
        'Recomendações personalizadas',
        'Follow-up em 2 horas',
        'Avaliação de satisfação'
      ],
      automationsCount: 2,
      flowsCount: 2
    },
    {
      id: 'sales',
      name: 'Vendas Automatizadas',
      description: 'Template otimizado para maximizar conversões através de automação inteligente',
      icon: '💰',
      color: 'from-green-600 to-emerald-700',
      features: [
        'Triagem automática',
        'Score em tempo real',
        'Ofertas dinâmicas',
        'Carrinho abandonado',
        'Cross-selling',
        'Upselling progressivo'
      ],
      automationsCount: 4,
      flowsCount: 3
    },
    {
      id: 'pharma',
      name: 'Suporte Técnico Pharma',
      description: 'Template especializado para dúvidas sobre medicamentos e suporte pós-venda com compliance',
      icon: '💊',
      color: 'from-blue-600 to-cyan-700',
      features: [
        'Classificação de urgência',
        'FAQ farmacêutico',
        'Orientações scriptadas',
        'Alertas de interações',
        'Lembretes de refil',
        'Escalonamento para farmacêutico'
      ],
      automationsCount: 3,
      flowsCount: 3
    },
    {
      id: 'scheduling',
      name: 'Agendamento Inteligente',
      description: 'Template focado em otimização de agenda e redução de no-shows',
      icon: '📅',
      color: 'from-orange-600 to-amber-700',
      features: [
        'Verificação de disponibilidade',
        'Sugestão de melhores horários',
        'Confirmação instantânea',
        'Lembretes progressivos',
        'Reagendamento fácil',
        'Lista de espera automática'
      ],
      automationsCount: 3,
      flowsCount: 3
    }
  ];

  const getTemplateFlows = (templateId: string): Flow[] => {
    const flows: Record<string, Flow[]> = {
      premium: [
        { id: 'welcome-vip', name: 'Boas-Vindas VIP', steps: 5 },
        { id: 'quick-resolution', name: 'Resolução Rápida', steps: 4 }
      ],
      sales: [
        { id: 'qualification', name: 'Qualificação de Leads', steps: 6 },
        { id: 'cart-recovery', name: 'Recuperação de Carrinho', steps: 6 },
        { id: 'upselling', name: 'Upselling Inteligente', steps: 2 }
      ],
      pharma: [
        { id: 'medication-inquiry', name: 'Consulta de Medicamento', steps: 6 },
        { id: 'drug-interaction', name: 'Verificação de Interações', steps: 5 },
        { id: 'refill-reminder', name: 'Lembrete de Refil', steps: 3 }
      ],
      scheduling: [
        { id: 'smart-scheduling', name: 'Agendamento Inteligente', steps: 7 },
        { id: 'reminder-sequence', name: 'Sequência de Lembretes', steps: 6 },
        { id: 'no-show-recovery', name: 'Recuperação de No-Show', steps: 2 }
      ]
    };

    return flows[templateId] || [];
  };

  const getTemplateAutomations = (templateId: string): Automation[] => {
    const automations: Record<string, Automation[]> = {
      premium: [
        { id: 'vip-followup', name: 'Follow-up VIP', type: 'simple', enabled: true },
        { id: 'priority-transfer', name: 'Transferência Prioritária', type: 'simple', enabled: true }
      ],
      sales: [
        { id: 'lead-scoring', name: 'Scoring Automático', type: 'complex', enabled: true },
        { id: 'abandoned-cart', name: 'Carrinho Abandonado', type: 'complex', enabled: true },
        { id: 'cross-sell', name: 'Cross-Sell Pós-Compra', type: 'simple', enabled: true },
        { id: 'winback', name: 'Campanha Winback', type: 'complex', enabled: true }
      ],
      pharma: [
        { id: 'adherence-reminder', name: 'Lembrete de Adesão', type: 'simple', enabled: true },
        { id: 'prescription-expiry', name: 'Vencimento de Receita', type: 'simple', enabled: true },
        { id: 'pharma-escalation', name: 'Escalonamento Farmacêutico', type: 'simple', enabled: true }
      ],
      scheduling: [
        { id: 'confirmation', name: 'Confirmação Imediata', type: 'simple', enabled: true },
        { id: 'waitlist-notification', name: 'Lista de Espera', type: 'simple', enabled: true },
        { id: 'waitlist-upgrade', name: 'Promoção Lista', type: 'simple', enabled: true }
      ]
    };

    return automations[templateId] || [];
  };

  const getURAConfig = (templateId: string): URAConfig => {
    const configs: Record<string, URAConfig> = {
      premium: { id: 'ura-premium', name: 'URA Premium', aiEnabled: true, optionsCount: 5 },
      sales: { id: 'ura-sales', name: 'URA de Vendas', aiEnabled: true, optionsCount: 5 },
      pharma: { id: 'ura-pharma', name: 'URA Farmacêutica', aiEnabled: true, optionsCount: 6 },
      scheduling: { id: 'ura-scheduling', name: 'URA de Agendamento', aiEnabled: true, optionsCount: 6 }
    };

    return configs[templateId] || { id: '', name: '', aiEnabled: false, optionsCount: 0 };
  };

  const handleApplyTemplate = (templateId: string) => {
    setIsApplying(true);
    applyMutation.mutate({ templateType: templateId, settings: {} });
  };

  const getTemplateIcon = (icon: string) => {
    switch (icon) {
      case '👑': return Crown;
      case '💰': return ShoppingCart;
      case '💊': return Pill;
      case '📅': return Calendar;
      default: return Crown;
    }
  };

  const getTemplateColor = (color: string) => {
    switch (color) {
      case 'from-purple-600 to-indigo-700': return 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50';
      case 'from-green-600 to-emerald-700': return 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50';
      case 'from-blue-600 to-cyan-700': return 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50';
      case 'from-orange-600 to-amber-700': return 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50';
      default: return '';
    }
  };

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Templates de Automação IA
              </h1>
              <p className="text-sm text-muted-foreground">
                Escolha o template ideal para seu negócio e comece a automatizar
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {TEMPLATE_CARDS.length} templates disponíveis
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="templates">
              <Crown className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="automations">
              <Zap className="w-4 h-4 mr-2" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="ura">
              <Phone className="w-4 h-4 mr-2" />
              URA
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {TEMPLATE_CARDS.map((template) => {
                const Icon = getTemplateIcon(template.icon);
                const flows = getTemplateFlows(template.id);
                const automations = getTemplateAutomations(template.id);
                const ura = getURAConfig(template.id);

                return (
                  <Card 
                    key={template.id} 
                      className={`p-6 hover:shadow-xl transition-all duration-300 ${getTemplateColor(template.color)} ${selectedTemplate === template.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${template.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="text-xs font-medium">Selecionado</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-muted-foreground">Recursos:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 4).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {template.features.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.features.length - 4} mais
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{automations.length} automações</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>{flows.length} fluxos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>URA v{ura.optionsCount}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleApplyTemplate(template.id)}
                        disabled={isApplying}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Aplicar
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="automations" className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {TEMPLATE_CARDS.map((template) => {
                const automations = getTemplateAutomations(template.id);
                const Icon = getTemplateIcon(template.icon);

                return (
                  <Card key={`${template.id}-automations`} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold">{template.name}</h3>
                    </div>

                    <div className="space-y-3">
                      {automations.map((automation) => (
                        <div key={automation.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Zap className={`w-4 h-4 ${automation.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                            <div>
                              <p className="text-sm font-medium">{automation.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {automation.type === 'complex' ? 'Complexa' : 'Simples'}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="ura" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATE_CARDS.map((template) => {
                const ura = getURAConfig(template.id);
                const Icon = getTemplateIcon(template.icon);

                return (
                  <Card key={`${template.id}-ura`} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{ura.name}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>IA Habilitada</span>
                        <Badge variant={ura.aiEnabled ? 'default' : 'secondary'}>
                          {ura.aiEnabled ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Opções de Menu</span>
                        <Badge variant="outline">{ura.optionsCount} opções</Badge>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-xs font-medium mb-2">Opções Disponíveis:</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {template.id === 'premium' && (
                          <>
                            <p>1 - Falar com Atendente</p>
                            <p>2 - Meus Pedidos</p>
                            <p>3 - Produtos</p>
                            <p>4 - Agendar Consulta</p>
                            <p>5 - Falar com Farmacêutico</p>
                          </>
                        )}
                        {template.id === 'sales' && (
                          <>
                            <p>1 - Buscar Produtos</p>
                            <p>2 - Ofertas da Semana</p>
                            <p>3 - Meu Carrinho</p>
                            <p>4 - Status do Pedido</p>
                            <p>5 - Falar com Vendedor</p>
                          </>
                        )}
                        {template.id === 'pharma' && (
                          <>
                            <p>1 - Informação de Medicamento</p>
                            <p>2 - Verificar Interações</p>
                            <p>3 - Agendar Consulta</p>
                            <p>4 - Meus Remédios</p>
                            <p>5 - Falar com Farmacêutico</p>
                            <p>0 - Emergência Médica</p>
                          </>
                        )}
                        {template.id === 'scheduling' && (
                          <>
                            <p>1 - Agendar Consulta</p>
                            <p>2 - Meus Agendamentos</p>
                            <p>3 - Reagendar</p>
                            <p>4 - Lista de Espera</p>
                            <p>5 - Informações</p>
                            <p>0 - Operador</p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium">Premium</span>
                </div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-muted-foreground">fluxos ativos</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">Sales</span>
                </div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-xs text-muted-foreground">automações</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Pharma</span>
                </div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-muted-foreground">resolvido por IA</p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium">Scheduling</span>
                </div>
                <p className="text-2xl font-bold">-70%</p>
                <p className="text-xs text-muted-foreground">no-shows</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Comparativo de Templates</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Recurso</th>
                      <th className="text-center py-2">Premium</th>
                      <th className="text-center py-2">Sales</th>
                      <th className="text-center py-2">Pharma</th>
                      <th className="text-center py-2">Scheduling</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">IA Conversacional</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Score Automático</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center">-</td>
                      <td className="text-center">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Alertas Farmacêuticos</td>
                      <td className="text-center">-</td>
                      <td className="text-center">-</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Gestão de Agenda</td>
                      <td className="text-center">-</td>
                      <td className="text-center">-</td>
                      <td className="text-center">-</td>
                      <td className="text-center text-green-500">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2">Lembretes Automáticos</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                      <td className="text-center text-green-500">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {previewTemplate && (
          <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{previewTemplate.icon}</span>
                  {previewTemplate.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground">{previewTemplate.description}</p>
                
                <div>
                  <h4 className="font-medium mb-2">Fluxos Incluídos:</h4>
                  <div className="space-y-2">
                    {getTemplateFlows(previewTemplate.id).map((flow) => (
                      <div key={flow.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{flow.name}</span>
                        <Badge variant="outline">{flow.steps} passos</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Automações:</h4>
                  <div className="space-y-2">
                    {getTemplateAutomations(previewTemplate.id).map((automation) => (
                      <div key={automation.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{automation.name}</span>
                        <Badge variant={automation.enabled ? 'default' : 'secondary'}>
                          {automation.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => {
                  handleApplyTemplate(previewTemplate.id);
                  setPreviewTemplate(null);
                }}>
                  Aplicar este Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}