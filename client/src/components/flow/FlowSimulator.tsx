import React, { useState } from 'react';
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
  Save
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
    'mensagem.texto': 'Olá, preciso de ajuda',
  });
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  const startSimulation = () => {
    setIsRunning(true);
    setIsPaused(false);
    setCurrentStep(0);
    setSimulationSteps([]);
    
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
  };

  const simulateFlow = async () => {
    // Encontrar nó inicial
    const startNode = nodes.find(n => n.type === 'start' || !edges.some(e => e.target === n.id));
    if (!startNode) return;

    const steps: SimulationStep[] = [];
    let currentNodeId = startNode.id;
    let context = { ...testContext };

    // Simular execução sequencial
    while (currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      const step: SimulationStep = {
        nodeId: node.id,
        nodeLabel: node.data.label || node.type || 'Nó',
        nodeType: node.type || 'unknown',
        status: 'running',
        input: { ...context },
        output: {},
        duration: Math.random() * 1000 + 500, // Simular duração aleatória
        timestamp: new Date(),
      };

      // Simular processamento do nó
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simular output baseado no tipo de nó
      switch (node.type) {
        case 'aiAgent':
          step.output = {
            ...context,
            'agente.resposta': 'Resposta simulada do agente IA',
          };
          step.status = 'completed';
          break;

        case 'condition':
          // Simular avaliação de condição
          const conditionResult = Math.random() > 0.5;
          step.output = {
            ...context,
            'condicao.resultado': conditionResult,
          };
          step.status = 'completed';
          break;

        case 'sendMessage':
          step.output = {
            ...context,
            'mensagem.enviada': true,
          };
          step.status = 'completed';
          break;

        case 'http':
          // Simular requisição HTTP
          if (Math.random() > 0.2) {
            step.output = {
              ...context,
              'http.status': 200,
              'http.resposta': { success: true },
            };
            step.status = 'completed';
          } else {
            step.error = 'Timeout na requisição HTTP';
            step.status = 'failed';
          }
          break;

        default:
          step.output = { ...context };
          step.status = 'completed';
      }

      context = { ...context, ...step.output };
      steps.push(step);

      // Encontrar próximo nó
      const nextEdge = edges.find(e => e.source === currentNodeId);
      currentNodeId = nextEdge?.target || '';
    }

    setSimulationSteps(steps);
    setIsRunning(false);
  };

  const saveTestCase = () => {
    // Implementar salvamento de caso de teste
    console.log('Save test case:', { context: testContext, steps: simulationSteps });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Simulador de Fluxo</h3>
          {isRunning && (
            <Badge variant="secondary" className="animate-pulse">
              Executando...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRunning && simulationSteps.length === 0 && (
            <Button onClick={startSimulation} size="sm">
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
              <Button onClick={stepForward} size="sm" variant="outline">
                <SkipForward className="h-4 w-4 mr-1" />
                Próximo Passo
              </Button>

              <Button onClick={resetSimulation} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reiniciar
              </Button>

              <Button onClick={saveTestCase} size="sm" variant="outline">
                <Save className="h-4 w-4 mr-1" />
                Salvar Caso de Teste
              </Button>
            </>
          )}

          <Button onClick={onClose} size="sm" variant="ghost">
            Fechar
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Painel de Contexto */}
        <Card className="p-4 flex flex-col">
          <h4 className="font-semibold text-foreground mb-3">Contexto de Teste</h4>
          
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
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Timeline de Execução */}
        <Card className="p-4 flex flex-col">
          <h4 className="font-semibold text-foreground mb-3">Timeline de Execução</h4>
          
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
                    }`}
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
                                <pre className="bg-muted p-2 rounded mt-1 overflow-auto">
                                  {JSON.stringify(step.input, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="font-semibold">Output:</span>
                                <pre className="bg-muted p-2 rounded mt-1 overflow-auto">
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
        <div className="border-t p-4">
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
