import { useState } from 'react';
import FarmaDashboardLayout from '@/components/FarmaDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Workflow, Zap, Menu as MenuIcon, Upload, FileJson, Sparkles, MessageSquare, UserCheck, Calendar, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import N8NFlowEditor from '@/components/flow/N8NFlowEditor';
import N8NSidebar from '@/components/flow/N8NSidebar';
import N8NNodeConfig from '@/components/flow/N8NNodeConfig';
import { Node } from 'reactflow';
import { convertIVRToReactFlow } from '@/lib/ivrConverter';
import { convertToReactFlow, generateCompleteFlow } from '@/lib/flowConverters';
import { fullyInterlinkFlow, validateFlowIntegrity } from '@/lib/flowLinker';

export default function Automation() {
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { data: visualFlows, refetch: refetchFlows } = trpc.visualFlows.list.useQuery();
  const { data: automationFlows } = trpc.automation.list.useQuery();
  const { data: uraMenus } = trpc.uraMenus.list.useQuery();

  const createFlow = trpc.visualFlows.create.useMutation({
    onSuccess: (data) => {
      toast.success('Fluxo criado com sucesso!');
      setSelectedFlowId(data.insertId as number);
      setIsCreating(false);
      setNewFlowName('');
      setNewFlowDescription('');
      refetchFlows();
    },
    onError: () => {
      toast.error('Erro ao criar fluxo');
    },
  });

  const updateFlow = trpc.visualFlows.update.useMutation({
    onSuccess: () => {
      toast.success('Fluxo atualizado!');
      refetchFlows();
    },
  });

  const deleteFlow = trpc.visualFlows.delete.useMutation({
    onSuccess: () => {
      toast.success('Fluxo deletado!');
      setSelectedFlowId(null);
      refetchFlows();
    },
  });

  const toggleFlow = trpc.visualFlows.toggle.useMutation({
    onSuccess: () => {
      refetchFlows();
    },
  });

  const handleCreateFlow = () => {
    if (!newFlowName.trim()) {
      toast.error('Nome do fluxo é obrigatório');
      return;
    }

    createFlow.mutate({
      name: newFlowName,
      description: newFlowDescription,
      flowData: JSON.stringify({ nodes: [], edges: [] }),
    });
  };

  const handleSaveFlow = async (flowData: any) => {
    if (!selectedFlowId) return;

    await updateFlow.mutateAsync({
      id: selectedFlowId,
      flowData: JSON.stringify(flowData),
    });
  };

  const handleExecuteFlow = async (flowData: any) => {
    // TODO: Implement flow execution engine
    toast.info('Execução de fluxos será implementada em breve');
    console.log('Execute flow:', flowData);
  };

  const handleImportFlow = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let content = e.target?.result as string;
        
        // Detectar e decodificar Base64
        if (content.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            content = atob(content);
          } catch (e) {
            // Não é Base64 válido, continuar com conteúdo original
          }
        }
        
        const flowData = JSON.parse(content);
        
        let nodes, edges, flowName;
        let isN8N = false;
        
        // Detectar se é formato N8N
        if (flowData.nodes && Array.isArray(flowData.nodes) && 
            flowData.nodes.some((n: any) => n.type?.startsWith('n8n-') || n.type?.startsWith('@n8n/'))) {
          isN8N = true;
        }
        
        try {
          if (isN8N) {
            // Usar sistema completo de interligação para N8N
            toast.info('Detectado fluxo N8N. Interligando nós automaticamente...');
            console.log('Iniciando conversão N8N:', flowData.name, 'com', flowData.nodes?.length, 'nós');
            
            try {
              const result = fullyInterlinkFlow(flowData);
              nodes = result.nodes;
              edges = result.edges;
              flowName = flowData.name || importFile.name.replace(/\.[^/.]+$/, '');
              
              // Mostrar relatório de interligação
              if (result.report.validation.errors.length > 0) {
                console.warn('Problemas no fluxo:', result.report.validation.errors);
              }
              
              if (result.report.autoConnect.length > 0) {
                toast.success(`Auto-conectados ${result.report.autoConnect.length} nós`);
              }
              
              // Mostrar estatísticas
              const stats = result.report.finalStats;
              toast.info(`Fluxo: ${stats.totalNodes} nós, ${stats.totalEdges} conexões`);
            } catch (n8nError) {
              console.error('Erro no fullyInterlinkFlow:', n8nError);
              toast.error(`Erro ao processar N8N: ${n8nError instanceof Error ? n8nError.message : 'Erro desconhecido'}`);
              
              // Fallback: tentar conversão simples
              try {
                const converted = convertToReactFlow(content);
                nodes = converted.nodes;
                edges = converted.edges;
                flowName = flowData.name || importFile.name.replace(/\.[^/.]+$/, '');
                toast.info('Usando conversão simplificada');
              } catch (fallbackError) {
                throw fallbackError;
              }
            }
          } else {
            // Tentar usar o conversor universal para outros formatos
            const converted = convertToReactFlow(content);
            nodes = converted.nodes;
            edges = converted.edges;
            flowName = flowData.name || importFile.name.replace(/\.[^/.]+$/, '');
          }
        } catch (conversionError) {
          console.error('Erro completo na conversão:', conversionError);
          
          // Se falhar, tentar detectar formato manualmente
          if (flowData.options && typeof flowData.options === 'string') {
            // Formato IVR legado
            try {
              const converted = convertIVRToReactFlow(flowData);
              nodes = converted.nodes;
              edges = converted.edges;
              flowName = flowData.name || importFile.name.replace(/\.[^/.]+$/, '');
            } catch (error) {
              toast.error('Erro ao converter arquivo IVR');
              return;
            }
          } else if (flowData.nodes && flowData.edges) {
            // Formato React Flow nativo
            nodes = flowData.nodes;
            edges = flowData.edges;
            flowName = flowData.name || importFile.name.replace(/\.[^/.]+$/, '');
          } else {
            const errorMsg = conversionError instanceof Error ? conversionError.message : 'Erro desconhecido';
            toast.error(`Erro: ${errorMsg}. Formatos: React Flow, N8N, IVR, Drawflow.`);
            return;
          }
        }
        
        // Validar integridade do fluxo antes de salvar
        const validation = validateFlowIntegrity(nodes, edges);
        if (!validation.isValid) {
          console.error('Problemas de validação:', validation.errors);
          toast.warning('Fluxo importado com problemas. Verifique o console.');
        }
        
        // Criar novo fluxo com dados importados
        createFlow.mutate({
          name: flowName,
          description: flowData.description || 'Fluxo importado',
          flowData: JSON.stringify({ nodes, edges }),
        });

        toast.success('Fluxo importado e interligado com sucesso!');
        setIsImporting(false);
        setImportFile(null);
      } catch (error) {
        console.error('Erro ao importar:', error);
        toast.error('Erro ao processar arquivo. Verifique se é um JSON válido.');
      }
    };
    reader.readAsText(importFile);
  };

  const selectedFlow = visualFlows?.find(f => f.id === selectedFlowId);

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Automação e Fluxos</h1>
              <p className="text-sm text-muted-foreground">
                Crie fluxos visuais de automação estilo N8N
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isImporting} onOpenChange={setIsImporting}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Fluxo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Importar Fluxo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Arquivo do Fluxo</Label>
                      <Input
                        type="file"
                        accept=".json,.ivr,.n8n,.zapier,.make"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Formatos suportados: JSON, IVR, N8N, Zapier, Make
                      </p>
                    </div>
                    {importFile && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <FileJson className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{importFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(importFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    )}
                    <Button onClick={handleImportFlow} className="w-full" disabled={!importFile}>
                      Importar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Fluxo
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Fluxo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nome do Fluxo</Label>
                    <Input
                      value={newFlowName}
                      onChange={(e) => setNewFlowName(e.target.value)}
                      placeholder="Atendimento Automático"
                    />
                  </div>
                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      value={newFlowDescription}
                      onChange={(e) => setNewFlowDescription(e.target.value)}
                      placeholder="Descreva o objetivo deste fluxo..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateFlow} className="w-full">
                    Criar Fluxo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        <Tabs defaultValue="visual" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="visual">
              <Workflow className="w-4 h-4 mr-2" />
              Fluxos Visuais
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="simple">
              <Zap className="w-4 h-4 mr-2" />
              Automações Simples
            </TabsTrigger>
            <TabsTrigger value="ura">
              <MenuIcon className="w-4 h-4 mr-2" />
              URA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 m-0">
            {selectedFlowId && selectedFlow ? (
              <div className="h-full flex flex-col">
                <div className="border-b p-2 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFlowId(null)}
                    >
                      ← Voltar
                    </Button>
                    <div className="text-sm font-medium">{selectedFlow.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFlow.mutate({
                        id: selectedFlowId,
                        isActive: !selectedFlow.isActive,
                      })}
                    >
                      {selectedFlow.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja deletar este fluxo?')) {
                          deleteFlow.mutate({ id: selectedFlowId });
                        }
                      }}
                    >
                      Deletar
                    </Button>
                  </div>
                </div>
                <div className="flex-1 h-[calc(100vh-200px)] flex">
                  <N8NSidebar />
                  <div className="flex-1">
                    <N8NFlowEditor
                      flowId={selectedFlowId}
                      initialNodes={selectedFlow?.flowData ? JSON.parse(selectedFlow.flowData).nodes : []}
                      initialEdges={selectedFlow?.flowData ? JSON.parse(selectedFlow.flowData).edges : []}
                      onSave={(nodes, edges) => {
                        if (selectedFlowId) {
                          updateFlow.mutate({
                            id: selectedFlowId,
                            flowData: JSON.stringify({ nodes, edges }),
                          });
                        }
                      }}
                      onNodeDoubleClick={(node) => {
                        setSelectedNode(node);
                        setIsConfigOpen(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visualFlows?.map((flow) => (
                    <Card
                      key={flow.id}
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedFlowId(flow.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Workflow className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold">{flow.name}</h3>
                        </div>
                        <div
                          className={`px-2 py-0.5 rounded text-xs ${
                            flow.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {flow.isActive ? 'Ativo' : 'Inativo'}
                        </div>
                      </div>
                      {flow.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {flow.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{flow.executionCount || 0} execuções</span>
                        <span>
                          {new Date(flow.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </Card>
                  ))}

                  {(!visualFlows || visualFlows.length === 0) && (
                    <Card className="p-8 col-span-full text-center">
                      <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum fluxo criado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crie seu primeiro fluxo visual de automação
                      </p>
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Fluxo
                      </Button>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: 'welcome',
                  name: 'Boas-vindas Automáticas',
                  description: 'Mensagem de boas-vindas personalizada para novos contatos',
                  icon: MessageSquare,
                  color: 'bg-blue-600',
                  nodes: [
                    { id: 'trigger-1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Novo Contato', config: { event: 'new_contact' } } },
                    { id: 'condition-1', type: 'default', position: { x: 300, y: 100 }, data: { label: 'Horário Comercial?', config: { condition: 'working_hours' } } },
                    { id: 'message-1', type: 'default', position: { x: 500, y: 50 }, data: { label: 'Boas-vindas Imediato', config: { message: 'Olá! 👋 Bem-vindo(a) à Farma Francis! Como posso ajudar?' } } },
                    { id: 'message-2', type: 'default', position: { x: 500, y: 150 }, data: { label: 'Boas-vindas Fora de Horário', config: { message: 'Olá! 👋 Estamos fora do horário de atendimento. Retornaremos em breve!' } } },
                    { id: 'tag-1', type: 'default', position: { x: 700, y: 50 }, data: { label: 'Adicionar Tag', config: { action: 'add_tag', tag: 'novo_cliente' } } },
                  ],
                  edges: [
                    { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
                    { id: 'e2-3', source: 'condition-1', target: 'message-1', label: 'Sim' },
                    { id: 'e2-4', source: 'condition-1', target: 'message-2', label: 'Não' },
                    { id: 'e3-5', source: 'message-1', target: 'tag-1' },
                  ],
                },
                {
                  id: 'faq',
                  name: 'FAQ com IA',
                  description: 'Responde perguntas frequentes usando inteligência artificial',
                  icon: Sparkles,
                  color: 'bg-pink-600',
                  nodes: [
                    { id: 'trigger-1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Mensagem Recebida', config: { event: 'message_received' } } },
                    { id: 'condition-1', type: 'default', position: { x: 300, y: 100 }, data: { label: 'Contém Pergunta?', config: { condition: 'contains_question' } } },
                    { id: 'ai-1', type: 'default', position: { x: 500, y: 50 }, data: { label: 'Consultar IA', config: { model: 'gpt-4', systemPrompt: 'Você é um assistente da Farma Francis. Responda perguntas sobre medicamentos, horários e serviços.' } } },
                    { id: 'message-1', type: 'default', position: { x: 700, y: 50 }, data: { label: 'Enviar Resposta IA', config: { message: '{{ai_response}}' } } },
                    { id: 'human-1', type: 'default', position: { x: 500, y: 150 }, data: { label: 'Transferir Humano', config: { action: 'transfer_to_human' } } },
                    { id: 'log-1', type: 'default', position: { x: 900, y: 50 }, data: { label: 'Registrar Interação', config: { action: 'log', category: 'faq_ia' } } },
                  ],
                  edges: [
                    { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
                    { id: 'e2-3', source: 'condition-1', target: 'ai-1', label: 'Sim' },
                    { id: 'e2-4', source: 'condition-1', target: 'human-1', label: 'Não' },
                    { id: 'e3-4', source: 'ai-1', target: 'message-1' },
                    { id: 'e4-5', source: 'message-1', target: 'log-1' },
                  ],
                },
                {
                  id: 'qualification',
                  name: 'Qualificação de Leads',
                  description: 'Qualifica leads automaticamente com perguntas',
                  icon: UserCheck,
                  color: 'bg-green-600',
                  nodes: [
                    { id: 'trigger-1', type: 'default', position: { x: 100, y: 150 }, data: { label: 'Novo Lead', config: { event: 'new_lead' } } },
                    { id: 'message-1', type: 'default', position: { x: 300, y: 150 }, data: { label: 'Pergunta 1: Interesse', config: { message: 'Qual tipo de produto você procura?\n1️⃣ Medicamentos\n2️⃣ Cosméticos\n3️⃣ Suplementos' } } },
                    { id: 'wait-1', type: 'default', position: { x: 500, y: 150 }, data: { label: 'Aguardar Resposta', config: { timeout: 300 } } },
                    { id: 'message-2', type: 'default', position: { x: 700, y: 150 }, data: { label: 'Pergunta 2: Urgência', config: { message: 'Quando você precisa?\n1️⃣ Hoje\n2️⃣ Esta semana\n3️⃣ Sem pressa' } } },
                    { id: 'condition-1', type: 'default', position: { x: 900, y: 100 }, data: { label: 'Lead Qualificado?', config: { condition: 'score >= 7' } } },
                    { id: 'crm-1', type: 'default', position: { x: 1100, y: 50 }, data: { label: 'Adicionar ao CRM (Quente)', config: { action: 'add_to_crm', status: 'hot' } } },
                    { id: 'crm-2', type: 'default', position: { x: 1100, y: 150 }, data: { label: 'Adicionar ao CRM (Frio)', config: { action: 'add_to_crm', status: 'cold' } } },
                  ],
                  edges: [
                    { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
                    { id: 'e2-3', source: 'message-1', target: 'wait-1' },
                    { id: 'e3-4', source: 'wait-1', target: 'message-2' },
                    { id: 'e4-5', source: 'message-2', target: 'condition-1' },
                    { id: 'e5-6', source: 'condition-1', target: 'crm-1', label: 'Sim' },
                    { id: 'e5-7', source: 'condition-1', target: 'crm-2', label: 'Não' },
                  ],
                },
                {
                  id: 'scheduling',
                  name: 'Agendamento de Consultas',
                  description: 'Permite agendamento automático de consultas',
                  icon: Calendar,
                  color: 'bg-purple-600',
                  nodes: [
                    { id: 'trigger-1', type: 'default', position: { x: 100, y: 150 }, data: { label: 'Solicitar Agendamento', config: { keyword: 'agendar' } } },
                    { id: 'api-1', type: 'default', position: { x: 300, y: 150 }, data: { label: 'Verificar Disponibilidade', config: { endpoint: '/api/availability', method: 'GET' } } },
                    { id: 'message-1', type: 'default', position: { x: 500, y: 150 }, data: { label: 'Mostrar Horários', config: { message: 'Horários disponíveis:\n{{available_slots}}' } } },
                    { id: 'wait-1', type: 'default', position: { x: 700, y: 150 }, data: { label: 'Aguardar Escolha', config: { timeout: 600 } } },
                    { id: 'api-2', type: 'default', position: { x: 900, y: 150 }, data: { label: 'Confirmar Agendamento', config: { endpoint: '/api/appointments', method: 'POST' } } },
                    { id: 'message-2', type: 'default', position: { x: 1100, y: 100 }, data: { label: 'Confirmação', config: { message: '✅ Agendamento confirmado para {{date}} às {{time}}!' } } },
                    { id: 'notification-1', type: 'default', position: { x: 1100, y: 200 }, data: { label: 'Enviar Lembrete', config: { action: 'schedule_reminder', time: '-1 day' } } },
                  ],
                  edges: [
                    { id: 'e1-2', source: 'trigger-1', target: 'api-1' },
                    { id: 'e2-3', source: 'api-1', target: 'message-1' },
                    { id: 'e3-4', source: 'message-1', target: 'wait-1' },
                    { id: 'e4-5', source: 'wait-1', target: 'api-2' },
                    { id: 'e5-6', source: 'api-2', target: 'message-2' },
                    { id: 'e5-7', source: 'api-2', target: 'notification-1' },
                  ],
                },
                {
                  id: 'satisfaction',
                  name: 'Pesquisa de Satisfação',
                  description: 'Coleta feedback dos clientes após atendimento',
                  icon: Star,
                  color: 'bg-yellow-600',
                  nodes: [
                    { id: 'trigger-1', type: 'default', position: { x: 100, y: 150 }, data: { label: 'Atendimento Finalizado', config: { event: 'ticket_closed' } } },
                    { id: 'delay-1', type: 'default', position: { x: 300, y: 150 }, data: { label: 'Aguardar 5min', config: { delay: 300 } } },
                    { id: 'message-1', type: 'default', position: { x: 500, y: 150 }, data: { label: 'Solicitar Avaliação', config: { message: 'Como foi seu atendimento?\n⭐ 1 - Péssimo\n⭐⭐ 2 - Ruim\n⭐⭐⭐ 3 - Regular\n⭐⭐⭐⭐ 4 - Bom\n⭐⭐⭐⭐⭐ 5 - Excelente' } } },
                    { id: 'wait-1', type: 'default', position: { x: 700, y: 150 }, data: { label: 'Aguardar Resposta', config: { timeout: 600 } } },
                    { id: 'condition-1', type: 'default', position: { x: 900, y: 100 }, data: { label: 'Nota >= 4?', config: { condition: 'rating >= 4' } } },
                    { id: 'message-2', type: 'default', position: { x: 1100, y: 50 }, data: { label: 'Agradecer', config: { message: '🙏 Obrigado pelo feedback positivo!' } } },
                    { id: 'message-3', type: 'default', position: { x: 1100, y: 150 }, data: { label: 'Pedir Detalhes', config: { message: 'Sentimos muito. Pode nos contar o que aconteceu?' } } },
                    { id: 'database-1', type: 'default', position: { x: 1300, y: 100 }, data: { label: 'Salvar Feedback', config: { action: 'save_to_database', table: 'feedback' } } },
                  ],
                  edges: [
                    { id: 'e1-2', source: 'trigger-1', target: 'delay-1' },
                    { id: 'e2-3', source: 'delay-1', target: 'message-1' },
                    { id: 'e3-4', source: 'message-1', target: 'wait-1' },
                    { id: 'e4-5', source: 'wait-1', target: 'condition-1' },
                    { id: 'e5-6', source: 'condition-1', target: 'message-2', label: 'Sim' },
                    { id: 'e5-7', source: 'condition-1', target: 'message-3', label: 'Não' },
                    { id: 'e6-8', source: 'message-2', target: 'database-1' },
                    { id: 'e7-8', source: 'message-3', target: 'database-1' },
                  ],
                },
              ].map((template) => {
                const Icon = template.icon;
                return (
                  <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
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
                    <Button
                      className="w-full"
                      onClick={() => {
                        createFlow.mutate({
                          name: template.name,
                          description: template.description,
                          flowData: JSON.stringify({ nodes: template.nodes, edges: template.edges }),
                        });
                      }}
                    >
                      Usar Template
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="simple" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationFlows?.map((flow) => (
                <Card key={flow.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{flow.name}</h3>
                    <div
                      className={`px-2 py-0.5 rounded text-xs ${
                        flow.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {flow.isActive ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  {flow.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {flow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {flow.trigger}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {flow.channel}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ura" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uraMenus?.map((menu) => (
                <Card key={menu.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{menu.name}</h3>
                    <div
                      className={`px-2 py-0.5 rounded text-xs ${
                        menu.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {menu.isActive ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {menu.welcomeMessage}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Última atualização: {new Date(menu.updatedAt).toLocaleDateString('pt-BR')}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <N8NNodeConfig
        node={selectedNode}
        open={isConfigOpen}
        onClose={() => {
          setIsConfigOpen(false);
          setSelectedNode(null);
        }}
        onSave={(nodeId, data) => {
          // Atualizar o nó no fluxo
          if (selectedFlowId && selectedFlow?.flowData) {
            const flowData = JSON.parse(selectedFlow.flowData);
            const updatedNodes = flowData.nodes.map((node: Node) =>
              node.id === nodeId ? { ...node, data } : node
            );
            updateFlow.mutate({
              id: selectedFlowId,
              flowData: JSON.stringify({ ...flowData, nodes: updatedNodes }),
            });
          }
        }}
      />
    </FarmaDashboardLayout>
  );
}
