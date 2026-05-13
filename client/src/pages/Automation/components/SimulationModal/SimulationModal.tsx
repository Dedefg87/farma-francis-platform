import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { getNodeType } from '../../node-types';
import { Button } from '@/components/ui/button';
import {
  X, Play, CheckCircle2, XCircle, AlertTriangle, Clock,
  Loader2, ChevronRight, Zap, MessageSquare, GitBranch, Brain,
  Globe, Settings, Pause, ArrowRight, Package, Phone, Mail,
  Bot, UserCheck, FileText, CreditCard, Filter, Send, Code,
  Database, RotateCcw, Download, Eye,
} from 'lucide-react';

// ==================== TYPES ====================

interface SimulationStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  duration?: number;
  inputData?: string;
  outputData?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface SimulationResult {
  success: boolean;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  steps: SimulationStep[];
  summary: string;
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

// ==================== SIMULATION ENGINE ====================

function simulateWorkflow(nodes: Node[], edges: Edge[]): SimulationResult {
  const steps: SimulationStep[] = [];
  const startTime = Date.now();

  // Build adjacency map
  const outgoingMap: Record<string, string[]> = {};
  const incomingMap: Record<string, string[]> = {};
  edges.forEach((edge) => {
    if (!outgoingMap[edge.source]) outgoingMap[edge.source] = [];
    outgoingMap[edge.source].push(edge.target);
    if (!incomingMap[edge.target]) incomingMap[edge.target] = [];
    incomingMap[edge.target].push(edge.source);
  });

  // Find trigger nodes (no incoming edges)
  const triggerNodes = nodes.filter(
    (n) => !incomingMap[n.id] || incomingMap[n.id].length === 0
  );

  // If no triggers, start from first node
  const startNodes = triggerNodes.length > 0 ? triggerNodes : nodes.slice(0, 1);

  // BFS traversal
  const visited = new Set<string>();
  const queue: string[] = startNodes.map((n) => n.id);
  const executionOrder: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    executionOrder.push(nodeId);

    const outgoing = outgoingMap[nodeId] || [];
    outgoing.forEach((targetId) => {
      if (!visited.has(targetId)) {
        queue.push(targetId);
      }
    });
  }

  // Also add any unvisited nodes
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      executionOrder.push(n.id);
    }
  });

  // Simulate each step
  let completedSteps = 0;
  let failedSteps = 0;
  let hasError = false;

  executionOrder.forEach((nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const nodeDef = getNodeType(node.data?.nodeType);
    const nodeLabel = node.data?.label || nodeDef?.label || 'Nó desconhecido';
    const nodeType = node.data?.nodeType || 'unknown';

    // Simulate based on node type
    const stepDuration = simulateNodeDuration(nodeType);
    const shouldFail = shouldNodeFail(node);

    let status: SimulationStep['status'] = 'success';
    let error: string | undefined;
    let inputData: string | undefined;
    let outputData: string | undefined;

    if (hasError) {
      status = 'skipped';
      outputData = 'Fluxo interrompido por erro anterior';
    } else if (shouldFail) {
      status = 'error';
      error = getErrorMessage(nodeType);
      failedSteps++;
      hasError = true;
    } else {
      status = 'success';
      completedSteps++;
      inputData = generateInputData(nodeType);
      outputData = generateOutputData(nodeType);
    }

    steps.push({
      nodeId,
      nodeLabel,
      nodeType,
      status,
      duration: stepDuration,
      inputData,
      outputData,
      error,
      startTime: Date.now(),
      endTime: Date.now() + stepDuration,
    });
  });

  const totalDuration = Date.now() - startTime + steps.reduce((acc, s) => acc + (s.duration || 0), 0);

  const success = failedSteps === 0;
  const summary = success
    ? `✅ Fluxo executado com sucesso! ${completedSteps} nós processados em ${totalDuration}ms.`
    : `❌ Fluxo interrompido. ${completedSteps} nós executados, ${failedSteps} erro(s).`;

  return {
    success,
    totalSteps: steps.length,
    completedSteps,
    failedSteps,
    totalDuration,
    steps,
    summary,
  };
}

function simulateNodeDuration(nodeType: string): number {
  const durations: Record<string, [number, number]> = {
    trigger: [50, 150],
    message: [100, 300],
    ai: [500, 2000],
    condition: [30, 100],
    action: [100, 500],
    wait: [1000, 3000],
    api: [200, 800],
    function: [50, 200],
    set: [20, 80],
    delay: [500, 1500],
    transfer: [100, 300],
    filter: [30, 100],
  };
  const [min, max] = durations[nodeType] || [50, 200];
  return Math.floor(Math.random() * (max - min) + min);
}

function shouldNodeFail(node: Node): boolean {
  const nodeDef = getNodeType(node.data?.nodeType);
  // Fail if node has required config fields that are empty
  if (nodeDef?.config) {
    const requiredFields = nodeDef.config.filter(
      (f) => f.type === 'string' && !f.defaultValue
    );
    // 15% chance of failure for nodes with required fields
    if (requiredFields.length > 0 && Math.random() < 0.15) {
      return true;
    }
  }
  // 5% random failure rate
  return Math.random() < 0.05;
}

function getErrorMessage(nodeType: string): string {
  const errors: Record<string, string[]> = {
    trigger: [
      'Webhook URL inválida ou inacessível',
      'Token de autenticação expirado',
      'Timeout ao conectar com serviço externo',
    ],
    message: [
      'Número de telefone inválido',
      'Falha ao enviar mensagem — limite de taxa excedido',
      'Template de mensagem não encontrado',
    ],
    ai: [
      'API Key inválida ou expirada',
      'Timeout na resposta do modelo de IA',
      'Limite de tokens excedido',
      'Modelo indisponível no momento',
    ],
    condition: [
      'Expressão de condição inválida',
      'Variável de referência não encontrada',
    ],
    action: [
      'Endpoint HTTP retornou erro 500',
      'Falha na conexão com banco de dados',
      'Permissão negada para executar ação',
    ],
    api: [
      'Timeout na requisição HTTP',
      'Endpoint retornou status 404',
      'Falha de autenticação na API',
    ],
    wait: [
      'Intervalo de espera inválido',
    ],
  };
  const typeErrors = errors[nodeType] || ['Erro desconhecido na execução'];
  return typeErrors[Math.floor(Math.random() * typeErrors.length)];
}

function generateInputData(nodeType: string): string {
  const data: Record<string, string[]> = {
    trigger: [
      '{ "message": "Olá, preciso de ajuda", "from": "5511999999999", "channel": "whatsapp" }',
      '{ "event": "new_order", "order_id": "12345", "customer": "João" }',
      '{ "type": "schedule", "cron": "0 8 * * 1", "timezone": "America/Sao_Paulo" }',
    ],
    message: [
      '{ "to": "5511999999999", "body": "Olá! Como posso ajudar?" }',
      '{ "template": "welcome", "language": "pt_BR", "params": ["João"] }',
    ],
    ai: [
      '{ "prompt": "Analise a mensagem do cliente e classifique o intent", "model": "gpt-4o" }',
      '{ "messages": [{"role": "user", "content": "Qual o status do meu pedido?"}] }',
    ],
    condition: [
      '{ "input": "urgente", "operator": "contains", "value": "urgente" }',
      '{ "variable": "{{input.message}}", "matches": true }',
    ],
    action: [
      '{ "action": "create_task", "title": "Revisar receita", "assignee": "pharmacist" }',
      '{ "url": "https://api.example.com/orders", "method": "POST" }',
    ],
    api: [
      '{ "url": "https://api.farma.com/orders/123", "method": "GET", "headers": {} }',
      '{ "endpoint": "/webhook", "payload": {"status": "completed"} }',
    ],
  };
  const typeData = data[nodeType] || ['{ "data": "input_data" }'];
  return typeData[Math.floor(Math.random() * typeData.length)];
}

function generateOutputData(nodeType: string): string {
  const data: Record<string, string[]> = {
    trigger: [
      '{ "triggered": true, "timestamp": "2026-05-13T18:00:00Z" }',
      '{ "event": "message_received", "payload": {...} }',
    ],
    message: [
      '{ "message_id": "msg_abc123", "status": "delivered", "timestamp": "2026-05-13T18:00:01Z" }',
      '{ "sent": true, "provider": "whatsapp_business" }',
    ],
    ai: [
      '{ "intent": "order_status", "confidence": 0.95, "response": "Seu pedido está em trânsito" }',
      '{ "classification": "urgent", "entities": {"product": "Dipirona", "qty": "2"} }',
    ],
    condition: [
      '{ "result": true, "branch": "true", "evaluated": "input contains urgente" }',
      '{ "matched": true, "next_node": "urgency-handler" }',
    ],
    action: [
      '{ "task_id": "task_789", "status": "created", "assignee": "pharmacist" }',
      '{ "executed": true, "result": "success" }',
    ],
    api: [
      '{ "status": 200, "data": {"order": {"id": "123", "status": "shipped"}} }',
      '{ "response": "ok", "latency": "245ms" }',
    ],
    wait: [
      '{ "waited": "2000ms", "resumed": true }',
    ],
  };
  const typeData = data[nodeType] || ['{ "result": "success" }'];
  return typeData[Math.floor(Math.random() * typeData.length)];
}

// ==================== ICON MAP ====================

const stepIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-4 h-4" />,
  message: <MessageSquare className="w-4 h-4" />,
  ai: <Brain className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  action: <Settings className="w-4 h-4" />,
  wait: <Pause className="w-4 h-4" />,
  api: <Globe className="w-4 h-4" />,
  function: <Code className="w-4 h-4" />,
  set: <Database className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
  transfer: <ArrowRight className="w-4 h-4" />,
  filter: <Filter className="w-4 h-4" />,
  send: <Send className="w-4 h-4" />,
  brain: <Brain className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  pause: <Pause className="w-4 h-4" />,
  arrowRight: <ArrowRight className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
};

// ==================== COMPONENT ====================

export function SimulationModal({ isOpen, onClose, nodes, edges }: SimulationModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const runSimulation = useCallback(() => {
    if (nodes.length === 0) return;

    setIsRunning(true);
    setResult(null);
    setCurrentStep(0);

    // Simulate step-by-step with delays
    const simResult = simulateWorkflow(nodes, edges);
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex < simResult.steps.length) {
        setCurrentStep(stepIndex + 1);
        stepIndex++;
      } else {
        clearInterval(interval);
        setResult(simResult);
        setIsRunning(false);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [nodes, edges]);

  const handleClose = () => {
    setIsRunning(false);
    setResult(null);
    setCurrentStep(0);
    setExpandedStep(null);
    onClose();
  };

  const handleExportLog = () => {
    if (!result) return;
    const log = result.steps
      .map((s, i) => {
        const status = s.status === 'success' ? '✅' : s.status === 'error' ? '❌' : s.status === 'skipped' ? '⏭️' : '⏳';
        return `[${i + 1}] ${status} ${s.nodeLabel} (${s.nodeType}) - ${s.duration}ms${s.error ? `\n    ERRO: ${s.error}` : ''}`;
      })
      .join('\n');
    const content = `SIMULAÇÃO DE FLUXO - ${new Date().toLocaleString('pt-BR')}\n${'='.repeat(50)}\nNós: ${nodes.length} | Conexões: ${edges.length}\n${'='.repeat(50)}\n\n${log}\n\n${'='.repeat(50)}\n${result.summary}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacao-fluxo-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Simulação de Fluxo</h2>
              <p className="text-xs text-gray-500">
                {nodes.length} nós · {edges.length} conexões
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={handleExportLog} className="h-7 text-xs">
                <Download className="w-3 h-3 mr-1" /> Exportar Log
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={runSimulation} disabled={isRunning || nodes.length === 0} className="h-7 text-xs">
              {isRunning ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executando...</>
              ) : (
                <><RotateCcw className="w-3 h-3 mr-1" /> {result ? 'Re-executar' : 'Simular'}</>
              )}
            </Button>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Eye className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Nenhum nó no canvas</p>
              <p className="text-xs mt-1">Adicione nós ao fluxo para simular</p>
            </div>
          ) : !result && !isRunning ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Pronto para simular</h3>
              <p className="text-xs text-gray-500 text-center max-w-xs mb-4">
                A simulação percorrerá todos os nós do fluxo, executando cada um sequencialmente e mostrando o resultado.
              </p>
              <Button onClick={runSimulation} size="sm">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Iniciar Simulação
              </Button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              {(isRunning || result) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>
                      {isRunning
                        ? `Executando passo ${currentStep} de ${result?.steps.length || '...'}`
                        : result?.summary}
                    </span>
                    {result && (
                      <span className="flex items-center gap-2">
                        <span className="text-green-600">{result.completedSteps} ok</span>
                        {result.failedSteps > 0 && (
                          <span className="text-red-600">{result.failedSteps} erro(s)</span>
                        )}
                        <span className="text-gray-400">{result.totalDuration}ms</span>
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        result?.success ? 'bg-green-500' : result ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: result
                          ? `${(result.completedSteps / result.totalSteps) * 100}%`
                          : isRunning
                          ? `${(currentStep / (result?.steps.length || nodes.length)) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2">
                {(result?.steps || []).slice(0, isRunning ? currentStep : undefined).map((step, index) => {
                  const isExpanded = expandedStep === step.nodeId;
                  const icon = stepIcons[step.nodeType] || <Settings className="w-4 h-4" />;

                  return (
                    <div
                      key={step.nodeId}
                      className={`border rounded-lg transition-all ${
                        step.status === 'success'
                          ? 'border-green-200 bg-green-50/50'
                          : step.status === 'error'
                          ? 'border-red-200 bg-red-50/50'
                          : step.status === 'skipped'
                          ? 'border-gray-200 bg-gray-50/50'
                          : 'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.nodeId)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                      >
                        {/* Step number */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            step.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : step.status === 'error'
                              ? 'bg-red-100 text-red-700'
                              : step.status === 'skipped'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {step.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : step.status === 'error' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : step.status === 'skipped' ? (
                            <span className="text-[10px]">—</span>
                          ) : (
                            index + 1
                          )}
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0 text-gray-500">{icon}</div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">
                            {step.nodeLabel}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {step.nodeType} · {step.duration}ms
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {step.status === 'error' && (
                            <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                              Erro
                            </span>
                          )}
                          {step.status === 'skipped' && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              Pulado
                            </span>
                          )}
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-0">
                          <div className="mt-2 space-y-2">
                            {step.inputData && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                                  Entrada
                                </div>
                                <pre className="text-[10px] bg-gray-800 text-green-400 rounded p-2 overflow-x-auto font-mono">
                                  {step.inputData}
                                </pre>
                              </div>
                            )}
                            {step.outputData && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                                  Saída
                                </div>
                                <pre className="text-[10px] bg-gray-800 text-blue-400 rounded p-2 overflow-x-auto font-mono">
                                  {step.outputData}
                                </pre>
                              </div>
                            )}
                            {step.error && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                                  Erro
                                </div>
                                <div className="text-[10px] bg-red-50 text-red-700 rounded p-2 border border-red-200">
                                  ⚠️ {step.error}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Running indicator */}
                {isRunning && (
                  <div className="flex items-center gap-3 px-3 py-2.5 border border-blue-200 bg-blue-50/50 rounded-lg animate-pulse">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600 font-medium">Executando próximo nó...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[10px] text-gray-400">
            {result
              ? `Simulação concluída em ${result.totalDuration}ms`
              : isRunning
              ? 'Simulação em andamento...'
              : 'Clique em Simular para iniciar'}
          </div>
          <Button variant="outline" size="sm" onClick={handleClose} className="h-7 text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
