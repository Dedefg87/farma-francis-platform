import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { getNodeType, ConfigField } from '../../node-types';
import { Button } from '@/components/ui/button';
import {
  X, Play, CheckCircle2, XCircle, AlertTriangle, Clock,
  Loader2, ChevronRight, Zap, MessageSquare, GitBranch, Brain,
  Globe, Settings, Pause, ArrowRight, Package, Phone, Mail,
  Bot, UserCheck, FileText, CreditCard, Filter, Send, Code,
  Database, RotateCcw, Download, Eye, Wrench, Info,
} from 'lucide-react';

// ==================== TYPES ====================

interface ValidationError {
  field: string;
  message: string;
  suggestion: string;
}

interface SimulationStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'warning';
  duration?: number;
  inputData?: string;
  outputData?: string;
  error?: string;
  suggestion?: string;
  validationErrors?: ValidationError[];
  startTime?: number;
  endTime?: number;
}

interface SimulationResult {
  success: boolean;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  warningSteps: number;
  totalDuration: number;
  steps: SimulationStep[];
  summary: string;
  flowErrors: FlowError[];
}

interface FlowError {
  type: 'connection' | 'config' | 'structure' | 'validation';
  nodeId?: string;
  nodeLabel?: string;
  message: string;
  suggestion: string;
  severity: 'error' | 'warning';
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

// ==================== VALIDATION ENGINE ====================

function validateNode(node: Node, edges: Edge[], allNodes: Node[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeDef = getNodeType(node.data?.nodeType);
  if (!nodeDef) return errors;

  // 1. Check required config fields
  if (nodeDef.config) {
    nodeDef.config.forEach((field: ConfigField) => {
      const value = node.data?.[field.key] || field.defaultValue;
      if (!value && field.type !== 'boolean' && field.type !== 'select') {
        errors.push({
          field: field.label,
          message: `Campo "${field.label}" não está preenchido`,
          suggestion: getSuggestionForField(field),
        });
      }
      // Validate specific field types
      if (value) {
        const typeError = validateFieldType(field, value);
        if (typeError) errors.push(typeError);
      }
    });
  }

  // 2. Check connections
  const hasInput = edges.some((e) => e.target === node.id);
  const hasOutput = edges.some((e) => e.source === node.id);
  const isTrigger = nodeDef.category === 'triggers' || nodeDef.category === 'core_triggers' || nodeDef.type === 'trigger';

  if (!isTrigger && !hasInput) {
    errors.push({
      field: 'Conexão de entrada',
      message: 'Nó não tem nenhuma conexão de entrada',
      suggestion: 'Conecte a saída de outro nó a este nó para que ele receba dados no fluxo.',
    });
  }

  if (!hasOutput && nodeDef.outputs && nodeDef.outputs.length > 0) {
    errors.push({
      field: 'Conexão de saída',
      message: 'Nó não tem nenhuma conexão de saída',
      suggestion: 'Conecte a saída deste nó a outro nó para continuar o fluxo.',
    });
  }

  // 3. Check for self-loops
  const selfLoop = edges.some((e) => e.source === node.id && e.target === node.id);
  if (selfLoop) {
    errors.push({
      field: 'Auto-loop',
      message: 'Nó está conectado a si mesmo',
      suggestion: 'Remova a conexão que vai do nó para ele mesmo. Isso causaria um loop infinito.',
    });
  }

  // 4. Check for disconnected branches
  if (hasOutput) {
    const outgoingEdges = edges.filter((e) => e.source === node.id);
    const uniqueTargets = new Set(outgoingEdges.map((e) => e.target));
    if (uniqueTargets.size < outgoingEdges.length) {
      errors.push({
        field: 'Conexão duplicada',
        message: 'Existem conexões duplicadas para o mesmo nó',
        suggestion: 'Remova as conexões duplicadas entre os mesmos nós.',
      });
    }
  }

  return errors;
}

function validateFieldType(field: ConfigField, value: string): ValidationError | null {
  // URL validation
  if (field.key.toLowerCase().includes('url') || field.key.toLowerCase().includes('endpoint')) {
    try {
      new URL(value);
    } catch {
      return {
        field: field.label,
        message: `URL inválida: "${value}"`,
        suggestion: 'Insira uma URL válida completa, ex: https://api.exemplo.com/webhook',
      };
    }
  }

  // JSON validation
  if (field.type === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return {
        field: field.label,
        message: `JSON inválido no campo "${field.label}"`,
        suggestion: 'Verifique a sintaxe JSON. Use um validador online como jsonlint.com para corrigir.',
      };
    }
  }

  // CRON validation
  if (field.key.toLowerCase().includes('cron') || field.key.toLowerCase().includes('expression')) {
    const parts = value.trim().split(/\s+/);
    if (parts.length < 5) {
      return {
        field: field.label,
        message: `Expressão CRON inválida: "${value}"`,
        suggestion: 'Use o formato: minuto hora dia mês dia-da-semana. Ex: "0 8 * * 1" (segunda às 8h). Use crontab.guru para gerar.',
      };
    }
  }

  // Phone number validation
  if (field.key.toLowerCase().includes('phone') || field.key.toLowerCase().includes('to')) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 13) {
      return {
        field: field.label,
        message: `Número de telefone inválido: "${value}"`,
        suggestion: 'Insira o número com código do país e DDD. Ex: 5511999999999 (55=Brasil, 11=SP, 999999999=número).',
      };
    }
  }

  // Email validation
  if (field.key.toLowerCase().includes('email') || field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field: field.label,
        message: `Email inválido: "${value}"`,
        suggestion: 'Insira um email válido no formato: nome@exemplo.com',
      };
    }
  }

  // API Key validation
  if (field.key.toLowerCase().includes('apikey') || field.key.toLowerCase().includes('api_key')) {
    if (value.length < 10) {
      return {
        field: field.label,
        message: `API Key muito curta (${value.length} caracteres)`,
        suggestion: 'API Keys geralmente têm 20+ caracteres. Verifique se copiou a chave completa do painel do serviço.',
      };
    }
  }

  return null;
}

function getSuggestionForField(field: ConfigField): string {
  const suggestions: Record<string, string> = {
    'URL': 'Insira a URL completa incluindo https://. Ex: https://api.exemplo.com/webhook',
    'API Key': 'Copie a API Key do painel do serviço. Geralmente fica em Configurações > API.',
    'Token': 'Insira o token de autenticação gerado no serviço.',
    'Phone Number ID': 'Encontre no painel do WhatsApp Business API > Configuration.',
    'Verify Token': 'Token de verificação do webhook. Defina um valor seguro.',
    'Access Token': 'Token de acesso gerado no painel do serviço.',
    'Endpoint': 'URL completa da API. Ex: https://api.exemplo.com/v1/resource',
    'Path': 'Caminho do webhook. Ex: /webhook/meu-endpoint',
    'Métodos': 'Selecione os métodos HTTP permitidos (POST, GET, etc).',
    'Expressão CRON': 'Use o formato: minuto hora dia mês dia-da-semana. Ex: "0 8 * * 1" = segunda às 8h.',
    'Timezone': 'Fuso horário. Ex: America/Sao_Paulo, UTC, Europe/London.',
    'Modelo': 'Selecione o modelo de IA disponível.',
    'System Prompt': 'Defina o comportamento da IA. Ex: "Você é um assistente de farmácia..."',
    'User Prompt': 'Prompt do usuário com variáveis. Ex: "Analise: {{input.message}}"',
    'Temperature': 'Valor entre 0 e 2. 0=determinístico, 2=criativo. Recomendado: 0.7.',
    'Max Tokens': 'Limite de tokens na resposta. Ex: 2048.',
    'Condição': 'Expressão de condição. Ex: {{input.message}} contains "urgente"',
    'Padrão (Regex)': 'Expressão regular para filtrar. Ex: \\d{4,5}-\\d{4}',
    'Para (Número)': 'Número de destino com código do país. Ex: 5511999999999.',
    'Mensagem': 'Corpo da mensagem. Use {{variáveis}} para dados dinâmicos.',
    'Assunto': 'Assunto do email.',
    'Corpo (HTML)': 'Corpo do email em HTML.',
    'Título': 'Título da tarefa.',
    'Descrição': 'Descrição detalhada.',
    'Atribuir para': 'ID do usuário ou papel. Ex: "pharmacist".',
    'Prazo (minutos)': 'Tempo limite em minutos.',
    'Método': 'Método HTTP: GET, POST, PUT, DELETE.',
    'Headers (JSON)': 'Headers em JSON. Ex: {"Authorization": "Bearer TOKEN"}.',
    'Product ID': 'ID do produto no sistema.',
    'Limite mínimo': 'Quantidade mínima em estoque.',
    'Notificar (email/phone)': 'Email ou telefone para alertas.',
  };

  // Try exact match first
  if (suggestions[field.label]) return suggestions[field.label];

  // Try partial match
  for (const [key, value] of Object.entries(suggestions)) {
    if (field.label.toLowerCase().includes(key.toLowerCase())) return value;
  }

  // Generic suggestion based on field type
  if (field.placeholder) {
    return `Preencha com: ${field.placeholder}`;
  }
  if (field.defaultValue) {
    return `Valor sugerido: ${field.defaultValue}`;
  }
  return `Preencha o campo "${field.label}" com o valor apropriado para este tipo de nó.`;
}

function validateFlow(nodes: Node[], edges: Edge[]): FlowError[] {
  const errors: FlowError[] = [];

  // Check for trigger nodes
  const triggerNodes = nodes.filter((n) => {
    const def = getNodeType(n.data?.nodeType);
    return def?.category === 'triggers' || def?.category === 'core_triggers' || def?.type === 'trigger';
  });

  if (triggerNodes.length === 0 && nodes.length > 0) {
    errors.push({
      type: 'structure',
      message: 'Fluxo sem nó de trigger (gatilho)',
      suggestion: 'Adicione um nó de trigger (WhatsApp, Webhook, Schedule, etc.) como ponto de entrada do fluxo.',
      severity: 'warning',
    });
  }

  // Check for orphaned nodes (no connections at all)
  const connectedNodeIds = new Set<string>();
  edges.forEach((e) => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  nodes.forEach((n) => {
    if (!connectedNodeIds.has(n.id)) {
      errors.push({
        type: 'connection',
        nodeId: n.id,
        nodeLabel: n.data?.label || 'Nó sem nome',
        message: `Nó "${n.data?.label || 'sem nome'}" está isolado — sem conexões`,
        suggestion: 'Conecte este nó ao fluxo arrastando uma linha de outro nó até ele, ou remova-o se não for necessário.',
        severity: 'warning',
      });
    }
  });

  // Check for dead ends (nodes with input but no output, that aren't terminal)
  const terminalTypes = ['wait', 'delay'];
  nodes.forEach((n) => {
    const hasInput = edges.some((e) => e.target === n.id);
    const hasOutput = edges.some((e) => e.source === n.id);
    const nodeDef = getNodeType(n.data?.nodeType);

    if (hasInput && !hasOutput && !terminalTypes.includes(nodeDef?.type || '')) {
      errors.push({
        type: 'connection',
        nodeId: n.id,
        nodeLabel: n.data?.label || 'Nó sem nome',
        message: `Nó "${n.data?.label || 'sem nome'}" é um beco sem saída — tem entrada mas não tem saída`,
        suggestion: 'Conecte a saída deste nó a outro nó para continuar o fluxo, ou adicione um nó de espera/terminal.',
        severity: 'warning',
      });
    }
  });

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const adjacency: Record<string, string[]> = {};
  edges.forEach((e) => {
    if (!adjacency[e.source]) adjacency[e.source] = [];
    adjacency[e.source].push(e.target);
  });

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push({
          type: 'structure',
          message: 'Fluxo contém loop circular (ciclo infinito)',
          suggestion: 'Revise as conexões entre os nós. Um nó não pode se conectar direta ou indiretamente a si mesmo. Remova a conexão que forma o ciclo.',
          severity: 'error',
        });
        break;
      }
    }
  }

  return errors;
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

  // Find trigger nodes
  const triggerNodes = nodes.filter(
    (n) => !incomingMap[n.id] || incomingMap[n.id].length === 0
  );
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
      if (!visited.has(targetId)) queue.push(targetId);
    });
  }

  nodes.forEach((n) => {
    if (!visited.has(n.id)) executionOrder.push(n.id);
  });

  // Validate flow structure
  const flowErrors = validateFlow(nodes, edges);

  // Simulate each step
  let completedSteps = 0;
  let failedSteps = 0;
  let warningSteps = 0;
  let hasError = false;

  executionOrder.forEach((nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const nodeDef = getNodeType(node.data?.nodeType);
    const nodeLabel = node.data?.label || nodeDef?.label || 'Nó desconhecido';
    const nodeType = node.data?.nodeType || 'unknown';
    const stepDuration = simulateNodeDuration(nodeType);

    // Validate node configuration
    const validationErrors = validateNode(node, edges, nodes);

    let status: SimulationStep['status'] = 'success';
    let error: string | undefined;
    let suggestion: string | undefined;
    let inputData: string | undefined;
    let outputData: string | undefined;

    if (hasError) {
      status = 'skipped';
      outputData = 'Fluxo interrompido por erro anterior';
    } else if (validationErrors.length > 0) {
      // Node has validation errors — fail with specific message
      status = 'error';
      const firstError = validationErrors[0];
      error = firstError.message;
      suggestion = firstError.suggestion;
      failedSteps++;
      hasError = true;
    } else {
      status = 'success';
      completedSteps++;
      inputData = generateInputData(nodeType);
      outputData = generateOutputData(nodeType);
    }

    // Check for warnings (non-critical issues)
    if (status === 'success' && validationErrors.length === 0) {
      const flowWarnings = flowErrors.filter(
        (fe) => fe.nodeId === nodeId && fe.severity === 'warning'
      );
      if (flowWarnings.length > 0) {
        status = 'warning';
        warningSteps++;
        suggestion = flowWarnings[0].suggestion;
      }
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
      suggestion,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      startTime: Date.now(),
      endTime: Date.now() + stepDuration,
    });
  });

  const totalDuration = Date.now() - startTime + steps.reduce((acc, s) => acc + (s.duration || 0), 0);
  const success = failedSteps === 0;

  let summary: string;
  if (success && warningSteps > 0) {
    summary = `⚠️ Fluxo executado com ${warningSteps} aviso(s). ${completedSteps} nós processados em ${totalDuration}ms.`;
  } else if (success) {
    summary = `✅ Fluxo executado com sucesso! ${completedSteps} nós processados em ${totalDuration}ms.`;
  } else {
    summary = `❌ Fluxo interrompido no passo ${completedSteps + 1}. ${completedSteps} nós executados, ${failedSteps} erro(s).`;
  }

  return { success, totalSteps: steps.length, completedSteps, failedSteps, warningSteps, totalDuration, steps, summary, flowErrors };
}

function simulateNodeDuration(nodeType: string): number {
  const durations: Record<string, [number, number]> = {
    trigger: [50, 150], message: [100, 300], ai: [500, 2000],
    condition: [30, 100], action: [100, 500], wait: [1000, 3000],
    api: [200, 800], function: [50, 200], set: [20, 80],
    delay: [500, 1500], transfer: [100, 300], filter: [30, 100],
  };
  const [min, max] = durations[nodeType] || [50, 200];
  return Math.floor(Math.random() * (max - min) + min);
}

function generateInputData(nodeType: string): string {
  const data: Record<string, string[]> = {
    trigger: ['{ "message": "Olá, preciso de ajuda", "from": "5511999999999", "channel": "whatsapp" }'],
    message: ['{ "to": "5511999999999", "body": "Olá! Como posso ajudar?" }'],
    ai: ['{ "prompt": "Analise a mensagem do cliente", "model": "gpt-4o" }'],
    condition: ['{ "input": "urgente", "operator": "contains" }'],
    action: ['{ "action": "create_task", "title": "Revisar receita" }'],
    api: ['{ "url": "https://api.farma.com/orders/123", "method": "GET" }'],
  };
  const typeData = data[nodeType] || ['{ "data": "input_data" }'];
  return typeData[Math.floor(Math.random() * typeData.length)];
}

function generateOutputData(nodeType: string): string {
  const data: Record<string, string[]> = {
    trigger: ['{ "triggered": true, "timestamp": "2026-05-13T18:00:00Z" }'],
    message: ['{ "message_id": "msg_abc123", "status": "delivered" }'],
    ai: ['{ "intent": "order_status", "confidence": 0.95 }'],
    condition: ['{ "result": true, "branch": "true" }'],
    action: ['{ "task_id": "task_789", "status": "created" }'],
    api: ['{ "status": 200, "data": {"order": {"status": "shipped"}} }'],
    wait: ['{ "waited": "2000ms", "resumed": true }'],
  };
  const typeData = data[nodeType] || ['{ "result": "success" }'];
  return typeData[Math.floor(Math.random() * typeData.length)];
}

// ==================== ICON MAP ====================

const stepIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="w-4 h-4" />, message: <MessageSquare className="w-4 h-4" />,
  ai: <Brain className="w-4 h-4" />, condition: <GitBranch className="w-4 h-4" />,
  action: <Settings className="w-4 h-4" />, wait: <Pause className="w-4 h-4" />,
  api: <Globe className="w-4 h-4" />, function: <Code className="w-4 h-4" />,
  set: <Database className="w-4 h-4" />, delay: <Clock className="w-4 h-4" />,
  transfer: <ArrowRight className="w-4 h-4" />, filter: <Filter className="w-4 h-4" />,
  send: <Send className="w-4 h-4" />, brain: <Brain className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />, pause: <Pause className="w-4 h-4" />,
  arrowRight: <ArrowRight className="w-4 h-4" />, package: <Package className="w-4 h-4" />,
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
        const status = s.status === 'success' ? '✅' : s.status === 'error' ? '❌' : s.status === 'warning' ? '⚠️' : '⏭️';
        let line = `[${i + 1}] ${status} ${s.nodeLabel} (${s.nodeType}) - ${s.duration}ms`;
        if (s.error) line += `\n    ERRO: ${s.error}`;
        if (s.suggestion) line += `\n    COMO CORRIGIR: ${s.suggestion}`;
        if (s.validationErrors && s.validationErrors.length > 0) {
          s.validationErrors.forEach((ve) => {
            line += `\n    - ${ve.field}: ${ve.message}`;
            line += `\n      → ${ve.suggestion}`;
          });
        }
        return line;
      })
      .join('\n\n');

    const flowErrors = result.flowErrors
      .map((fe) => {
        const icon = fe.severity === 'error' ? '❌' : '⚠️';
        return `${icon} [${fe.type.toUpperCase()}] ${fe.message}\n   COMO CORRIGIR: ${fe.suggestion}`;
      })
      .join('\n\n');

    const content = `SIMULAÇÃO DE FLUXO - ${new Date().toLocaleString('pt-BR')}\n${'='.repeat(60)}\nNós: ${nodes.length} | Conexões: ${edges.length}\n${'='.repeat(60)}${flowErrors ? `\n\nERROS DE FLUXO:\n${flowErrors}\n${'='.repeat(60)}` : ''}\n\nEXECUÇÃO:\n${log}\n\n${'='.repeat(60)}\n${result.summary}`;

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
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Simulação de Fluxo</h2>
              <p className="text-xs text-gray-500">{nodes.length} nós · {edges.length} conexões</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={handleExportLog} className="h-7 text-xs">
                <Download className="w-3 h-3 mr-1" /> Exportar Log
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={runSimulation} disabled={isRunning || nodes.length === 0} className="h-7 text-xs">
              {isRunning ? (<><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executando...</>) : (<><RotateCcw className="w-3 h-3 mr-1" /> {result ? 'Re-executar' : 'Simular'}</>)}
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
                A simulação valida cada nó, verifica configurações e conexões, e mostra erros com instruções de como corrigir.
              </p>
              <Button onClick={runSimulation} size="sm">
                <Play className="w-3.5 h-3.5 mr-1.5" /> Iniciar Simulação
              </Button>
            </div>
          ) : (
            <>
              {/* Flow Errors (pre-execution) */}
              {result && result.flowErrors.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Problemas encontrados no fluxo
                  </div>
                  {result.flowErrors.map((fe, idx) => (
                    <div key={idx} className={`rounded-lg border p-3 ${fe.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start gap-2">
                        {fe.severity === 'error' ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800">{fe.message}</div>
                          <div className="flex items-start gap-1.5 mt-1.5">
                            <Wrench className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] text-gray-600 leading-relaxed">{fe.suggestion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                        {result.warningSteps > 0 && <span className="text-amber-600">{result.warningSteps} aviso(s)</span>}
                        {result.failedSteps > 0 && <span className="text-red-600">{result.failedSteps} erro(s)</span>}
                        <span className="text-gray-400">{result.totalDuration}ms</span>
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        result ? (result.success ? (result.warningSteps > 0 ? 'bg-amber-500' : 'bg-green-500') : 'bg-red-500') : 'bg-blue-500'
                      }`}
                      style={{ width: result ? `${(result.completedSteps / result.totalSteps) * 100}%` : isRunning ? `${(currentStep / (result?.steps.length || nodes.length)) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2">
                {(result?.steps || []).slice(0, isRunning ? currentStep : undefined).map((step, index) => {
                  const isExpanded = expandedStep === step.nodeId;
                  const icon = stepIcons[step.nodeType] || <Settings className="w-4 h-4" />;
                  const hasDetails = step.error || step.suggestion || (step.validationErrors && step.validationErrors.length > 0) || step.inputData || step.outputData;

                  return (
                    <div
                      key={step.nodeId + index}
                      className={`border rounded-lg transition-all ${
                        step.status === 'success' ? 'border-green-200 bg-green-50/30' :
                        step.status === 'error' ? 'border-red-200 bg-red-50/30' :
                        step.status === 'warning' ? 'border-amber-200 bg-amber-50/30' :
                        step.status === 'skipped' ? 'border-gray-200 bg-gray-50/30' :
                        'border-blue-200 bg-blue-50/30'
                      }`}
                    >
                      <button
                        onClick={() => hasDetails && setExpandedStep(isExpanded ? null : step.nodeId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          step.status === 'success' ? 'bg-green-100 text-green-700' :
                          step.status === 'error' ? 'bg-red-100 text-red-700' :
                          step.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                          step.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {step.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           step.status === 'error' ? <XCircle className="w-3.5 h-3.5" /> :
                           step.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           step.status === 'skipped' ? <span className="text-[10px]">—</span> : index + 1}
                        </div>

                        <div className="flex-shrink-0 text-gray-500">{icon}</div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{step.nodeLabel}</div>
                          <div className="text-[10px] text-gray-400">{step.nodeType} · {step.duration}ms</div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {step.status === 'error' && <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Erro</span>}
                          {step.status === 'warning' && <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Aviso</span>}
                          {step.status === 'skipped' && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Pulado</span>}
                          {hasDetails && <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-100">
                          <div className="mt-2 space-y-2.5">
                            {/* Error + Suggestion */}
                            {step.error && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                                <div className="flex items-start gap-2">
                                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="text-[11px] font-medium text-red-800">{step.error}</div>
                                    {step.suggestion && (
                                      <div className="flex items-start gap-1.5 mt-1.5">
                                        <Wrench className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-[11px] text-red-700 leading-relaxed">{step.suggestion}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Validation Errors */}
                            {step.validationErrors && step.validationErrors.length > 0 && (
                              <div className="space-y-2">
                                {step.validationErrors.map((ve, vi) => (
                                  <div key={vi} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <div className="text-[11px] font-medium text-amber-800">{ve.message}</div>
                                        <div className="flex items-start gap-1.5 mt-1">
                                          <Wrench className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                          <span className="text-[11px] text-amber-700 leading-relaxed">{ve.suggestion}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Warning suggestion */}
                            {step.status === 'warning' && step.suggestion && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                <div className="flex items-start gap-2">
                                  <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-[11px] text-amber-700 leading-relaxed">{step.suggestion}</span>
                                </div>
                              </div>
                            )}

                            {/* Input/Output Data */}
                            {step.inputData && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Entrada</div>
                                <pre className="text-[10px] bg-gray-800 text-green-400 rounded p-2 overflow-x-auto font-mono">{step.inputData}</pre>
                              </div>
                            )}
                            {step.outputData && (
                              <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Saída</div>
                                <pre className="text-[10px] bg-gray-800 text-blue-400 rounded p-2 overflow-x-auto font-mono">{step.outputData}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

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
            {result ? `Simulação concluída em ${result.totalDuration}ms` : isRunning ? 'Simulação em andamento...' : 'Clique em Simular para iniciar'}
          </div>
          <Button variant="outline" size="sm" onClick={handleClose} className="h-7 text-xs">Fechar</Button>
        </div>
      </div>
    </div>
  );
}
