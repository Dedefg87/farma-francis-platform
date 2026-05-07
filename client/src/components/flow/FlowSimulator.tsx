import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  MessageSquare,
  Bot,
  Send
} from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { CONTEXT_VARIABLES } from '@/lib/variables';

interface SimulationStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, any>;
  output: Record<string, any>;
  duration: number;
  timestamp: Date;
  error?: string;
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

export function FlowSimulator({ nodes, edges, onClose }: FlowSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [testContext, setTestContext] = useState<Record<string, any>>({
    'cliente.nome': 'João Silva',
    'cliente.email': 'joao@email.com',
    'cliente.telefone': '+55 11 98765-4321',
    'ticket.id': '12345',
    'mensagem.texto': 'Olá, preciso de ajuda com minha receita',
    'canal': 'WhatsApp',
  });
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{from: 'client' | 'bot', text: string}>>([]);

  // Reset chat when simulation starts
  useEffect(() => {
    if (simulationSteps.length > 0) {
      const initialMessage = chatMessages.find(m => m.from === 'client');
      if (!initialMessage) {
        setChatMessages([{ from: 'client', text: testContext['mensagem.texto'] || 'Iniciando simulação...' }]);
      }
    }
  }, [simulationSteps]);

  const startSimulation = () => {
    setIsRunning(true);
    setIsPaused(false);
    setCurrentStep(0);
    setSimulationSteps([]);
    setChatMessages([{ from: 'client', text: testContext['mensagem.texto'] || 'Iniciando simulação...' }]);
    
    // Iniciar simulação passo a passo
    simulateFlow();
  };

  const pauseSimulation = () => {
    setIsPaused(!isPaused);
  };

  const stepForward = () => {
    if (currentStep < simulationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setHighlightedNode(simulationSteps[currentStep + 1].nodeId);
    }
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    setSimulationSteps([]);
    setHighlightedNode(null);
    setChatMessages([]);
  };

  const simulateFlow = async () => {
    // Encontrar nó inicial (trigger ou default)
    const startNode = nodes.find(n => 
      n.type === 'trigger' || 
      n.type === 'default' || 
      (n.data.label && n.data.label.toLowerCase().includes('gatilho')) ||
      !edges.some(e => e.target === n.id)
    );
    
    if (!startNode) {
      alert('Nenhum nó inicial encontrado (Trigger)');
      setIsRunning(false);
      return;
    }

    const steps: SimulationStep[] = [];
    let context = { ...testContext };
    
    // Função recursiva para suportar branches
    const processNode = async (nodeId: string, depth: number = 0): Promise<void> => {
      if (depth > 50 || isPaused) return; // Segurança
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const step: SimulationStep = {
        nodeId: node.id,
        nodeLabel: node.data.label || node.type || 'Nó',
        nodeType: node.type || 'unknown',
        status: 'running',
        input: { ...context },
        output: {},
        duration: Math.random() * 500 + 200,
        timestamp: new Date(),
      };

      setCurrentStep(steps.length);
      setHighlightedNode(node.id);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 300));

      // Lógica profissional baseada no tipo e config
      const config = node.data.config || {};
      
      try {
        switch (node.type || 'default') {
          case 'trigger':
            step.output = { 
              ...context, 
              'evento': config.event || 'message_received',
              'timestamp': new Date().toISOString() 
            };
            step.status = 'completed';
            break;
            
          case 'condition':
            // Simular avaliação de condição baseada em config
            let result = false;
            const condition = config.condition || '';
            
            if (condition.includes('working_hours')) {
              const hour = new Date().getHours();
              const start = parseInt(config.schedule?.start?.split(':')[0] || '8');
              const end = parseInt(config.schedule?.end?.split(':')[0] || '18');
              result = hour >= start && hour < end;
              step.output = { ...context, 'horário_comercial': result };
            } else if (condition.includes('is_new_contact')) {
              result = true; // Simulado
              step.output = { ...context, 'novo_contato': result };
            } else {
              result = Math.random() > 0.5;
              step.output = { ...context, 'condição_resultado': result };
            }
            
            step.status = 'completed';
            
            // Seguir branch correta
            const trueEdge = edges.find(e => e.source === nodeId && e.label === 'Sim');
            const falseEdge = edges.find(e => e.source === nodeId && e.label === 'Não');
            
            steps.push(step);
            setSimulationSteps([...steps]);
            
            if (result && trueEdge) {
              await processNode(trueEdge.target, depth + 1);
              return;
            } else if (!result && falseEdge) {
              await processNode(falseEdge.target, depth + 1);
              return;
            }
            break;
            
          case 'message':
          case 'default':
            // Simular envio de mensagem baseada em config.message
            let message = config.message || 'Mensagem padrão';
            
            // Substituir variáveis (ex: {{nome}})
            message = message.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
              return context[key] || match;
            });
            
            step.output = { 
              ...context, 
              'mensagem_enviada': true,
              'conteudo': message 
            };
            step.status = 'completed';
            
            // Adicionar ao chat preview
            setChatMessages(prev => [...prev, { from: 'bot', text: message }]);
            break;
            
          case 'ai':
            // Simular resposta da IA
            const aiResponse = `Resposta da IA para: ${context['mensagem.texto'] || 'consulta'}`;
            step.output = { 
              ...context, 
              'ai_resposta': aiResponse,
              'confianca': (Math.random() * 0.5 + 0.5).toFixed(2)
            };
            step.status = 'completed';
            
            setChatMessages(prev => [...prev, { from: 'bot', text: aiResponse }]);
            break;
            
          case 'action':
            // Simular ação (criar contato, atribuir, etc.)
            const action = config.action || '';
            step.output = { 
              ...context, 
              [action]: 'executado_com_sucesso',
              'detalhes': `Ação ${action} realizada no sistema`
            };
            step.status = 'completed';
            break;
            
          default:
            step.output = { ...context, 'processado': true };
            step.status = 'completed';
        }
      } catch (error) {
        step.status = 'failed';
        step.error = (error as Error).message;
      }

      steps.push(step);
      setSimulationSteps([...steps]);
      context = { ...context, ...step.output };
      
      // Próximo nó (primeira conexão)
      const nextEdge = edges.find(e => e.source === nodeId);
      if (nextEdge && !step.error) {
        await processNode(nextEdge.target, depth + 1);
      }
    };

    await processNode(startNode.id);
    
    setSimulationSteps(steps);
    setIsRunning(false);
  };

  const saveTestCase = () => {
    // Implementar salvamento de caso de teste
    console.log('Save test case:', { context: testContext, steps: simulationSteps });
    alert('Caso de teste salvo no console!');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Simulador de Fluxo Profissional</h3>
          {isRunning && (
            <Badge variant="secondary" className="animate-pulse">
              Executando...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRunning && simulationSteps.length === 0 && (
            <Button onClick={startSimulation} size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-1" />
              Iniciar Simulação
            </Button>
          )}

          {isRunning && (
            <Button onClick={pauseSimulation} size="sm" variant="outline">
              <Pause className="h-4 w-4 mr-1" />
              {isPaused ? 'Continuar' : 'Pausar'}
            </Button>
          )}

          {simulationSteps.length > 0 && (
            <>
              <Button onClick={stepForward} size="sm" variant="outline" disabled={isRunning}>
                <SkipForward className="h-4 w-4 mr-1" />
                Próximo Passo
              </Button>

              <Button onClick={resetSimulation} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reiniciar
              </Button>

              <Button onClick={saveTestCase} size="sm" variant="outline">
                <Save className="h-4 w-4 mr-1" />
                Salvar Teste
              </Button>
            </>
          )}

          <Button onClick={onClose} size="sm" variant="ghost">
            Fechar
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Painel de Contexto */}
        <Card className="p-4 flex flex-col">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Contexto de Teste
          </h4>
          
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {CONTEXT_VARIABLES.slice(0, 10).map((variable) => (
                <div key={variable.name} className="space-y-1">
                  <Label className="text-xs">{variable.name}</Label>
                  <Input
                    placeholder={variable.example}
                    value={testContext[variable.name] || ''}
                    onChange={(e) => {
                      setTestContext({
                        ...testContext,
                        [variable.name]: e.target.value,
                      });
                    }}
                    disabled={isRunning}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Preview */}
        <Card className="p-4 flex flex-col bg-gray-900 text-white">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
            <MessageSquare className="h-4 w-4" />
            Pré-visualização Chat
          </h4>
          
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.from === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      msg.from === 'client' 
                        ? 'bg-gray-700 text-white' 
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {msg.from === 'bot' && <Send className="h-3 w-3 inline mr-1" />}
                    {msg.text}
                  </div>
                </div>
              ))}
              {isRunning && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white p-3 rounded-lg text-sm animate-pulse">
                    Digitando...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Timeline de Execução */}
        <Card className="p-4 flex flex-col">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline de Execução
          </h4>
          
          <ScrollArea className="flex-1">
            {simulationSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Configure o contexto e clique em "Iniciar Simulação"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {simulationSteps.map((step, index) => (
                  <Card 
                    key={index}
                    className={`p-3 transition-all ${
                      index === currentStep 
                        ? 'ring-2 ring-primary bg-blue-50' 
                        : index < currentStep 
                        ? 'opacity-60' 
                        : 'opacity-40'
                    } ${highlightedNode === step.nodeId ? 'border-primary' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.status === 'completed' 
                          ? 'bg-green-100 text-green-600' 
                          : step.status === 'failed' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : step.status === 'failed' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-sm text-foreground">
                            {step.nodeLabel}
                          </h5>
                          <Badge variant="outline" className="text-xs">
                            {step.duration.toFixed(0)}ms
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {step.nodeType}
                        </p>

                        {step.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {step.error}
                          </div>
                        )}

                        {index === currentStep && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-primary hover:underline">
                              Ver dados
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div>
                                <span className="font-semibold">Input:</span>
                                <pre className="bg-muted p-2 rounded mt-1 overflow-auto text-xs">
                                  {JSON.stringify(step.input, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="font-semibold">Output:</span>
                                <pre className="bg-muted p-2 rounded mt-1 overflow-auto text-xs">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Footer com estatísticas */}
      {simulationSteps.length > 0 && (
        <div className="border-t p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span>
                <strong>Total de nós:</strong> {simulationSteps.length}
              </span>
              <span>
                <strong>Sucesso:</strong>{' '}
                <span className="text-green-600">
                  {simulationSteps.filter(s => s.status === 'completed').length}
                </span>
              </span>
              <span>
                <strong>Falhas:</strong>{' '}
                <span className="text-red-600">
                  {simulationSteps.filter(s => s.status === 'failed').length}
                </span>
              </span>
              <span>
                <strong>Duração total:</strong>{' '}
                {(simulationSteps.reduce((sum, s) => sum + s.duration, 0) / 1000).toFixed(2)}s
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {simulationSteps.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
