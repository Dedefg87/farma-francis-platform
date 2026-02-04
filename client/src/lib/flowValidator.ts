import { Node, Edge } from 'reactflow';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  nodeId?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    disconnectedNodes: number;
    deadEnds: number;
    possibleLoops: number;
  };
}

/**
 * Valida um fluxo completo e retorna problemas encontrados
 */
export function validateFlow(nodes: Node[], edges: Edge[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    disconnectedNodes: 0,
    deadEnds: 0,
    possibleLoops: 0,
  };

  // 1. Verificar se há nós
  if (nodes.length === 0) {
    issues.push({
      id: 'no-nodes',
      type: 'error',
      message: 'O fluxo não possui nenhum nó',
      suggestion: 'Adicione pelo menos um nó ao fluxo',
    });
    return { valid: false, issues, stats };
  }

  // 2. Verificar nós desconectados
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      stats.disconnectedNodes++;
      issues.push({
        id: `disconnected-${node.id}`,
        type: 'warning',
        nodeId: node.id,
        message: `Nó "${node.data.label || node.type}" está desconectado`,
        suggestion: 'Conecte este nó ao fluxo ou remova-o',
      });
    }
  });

  // 3. Verificar nós sem saída (dead ends) - exceto nós finais
  const nodeOutputs = new Map<string, number>();
  const nodeInputs = new Map<string, number>();
  
  nodes.forEach(node => {
    nodeOutputs.set(node.id, 0);
    nodeInputs.set(node.id, 0);
  });

  edges.forEach(edge => {
    nodeOutputs.set(edge.source, (nodeOutputs.get(edge.source) || 0) + 1);
    nodeInputs.set(edge.target, (nodeInputs.get(edge.target) || 0) + 1);
  });

  nodes.forEach(node => {
    const outputs = nodeOutputs.get(node.id) || 0;
    const inputs = nodeInputs.get(node.id) || 0;

    // Nós que não são finais e não têm saída
    const isFinalNode = node.type === 'end' || node.data.isFinal;
    if (outputs === 0 && !isFinalNode && inputs > 0) {
      stats.deadEnds++;
      issues.push({
        id: `dead-end-${node.id}`,
        type: 'warning',
        nodeId: node.id,
        message: `Nó "${node.data.label || node.type}" não tem conexões de saída`,
        suggestion: 'Adicione uma conexão de saída ou marque como nó final',
      });
    }

    // Nós iniciais sem entrada
    const isStartNode = node.type === 'start' || node.data.isStart;
    if (inputs === 0 && !isStartNode && outputs > 0) {
      issues.push({
        id: `no-input-${node.id}`,
        type: 'info',
        nodeId: node.id,
        message: `Nó "${node.data.label || node.type}" não tem conexões de entrada`,
        suggestion: 'Verifique se este nó deve ser um ponto de início',
      });
    }
  });

  // 4. Detectar possíveis loops infinitos
  const loops = detectLoops(nodes, edges);
  stats.possibleLoops = loops.length;
  
  loops.forEach((loop, index) => {
    issues.push({
      id: `loop-${index}`,
      type: 'warning',
      message: `Possível loop infinito detectado: ${loop.join(' → ')}`,
      suggestion: 'Adicione uma condição de saída ou limite de iterações',
    });
  });

  // 5. Verificar configurações obrigatórias de nós específicos
  nodes.forEach(node => {
    const configIssues = validateNodeConfiguration(node);
    issues.push(...configIssues);
  });

  // 6. Verificar se há pelo menos um nó inicial
  const startNodes = nodes.filter(n => n.type === 'start' || n.data.isStart || (nodeInputs.get(n.id) || 0) === 0);
  if (startNodes.length === 0 && nodes.length > 0) {
    issues.push({
      id: 'no-start',
      type: 'error',
      message: 'O fluxo não possui um nó inicial',
      suggestion: 'Adicione um nó de início ou conecte um nó sem entrada',
    });
  }

  // 7. Verificar se há pelo menos um nó final
  const endNodes = nodes.filter(n => n.type === 'end' || n.data.isFinal || (nodeOutputs.get(n.id) || 0) === 0);
  if (endNodes.length === 0 && nodes.length > 0) {
    issues.push({
      id: 'no-end',
      type: 'warning',
      message: 'O fluxo não possui um nó final',
      suggestion: 'Adicione um nó de fim ou marque um nó como final',
    });
  }

  const hasErrors = issues.some(i => i.type === 'error');
  return {
    valid: !hasErrors,
    issues,
    stats,
  };
}

/**
 * Detecta loops no grafo usando DFS
 */
function detectLoops(nodes: Node[], edges: Edge[]): string[][] {
  const graph = new Map<string, string[]>();
  const loops: string[][] = [];

  // Construir grafo de adjacência
  nodes.forEach(node => graph.set(node.id, []));
  edges.forEach(edge => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
  });

  // DFS para detectar ciclos
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        // Loop detectado
        const loopStart = currentPath.indexOf(neighbor);
        const loop = currentPath.slice(loopStart);
        loop.push(neighbor); // Fechar o loop
        loops.push(loop.map(id => {
          const node = nodes.find(n => n.id === id);
          return node?.data.label || node?.type || id;
        }));
        return true;
      }
    }

    recursionStack.delete(nodeId);
    currentPath.pop();
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return loops;
}

/**
 * Valida configurações específicas de cada tipo de nó
 */
function validateNodeConfiguration(node: Node): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { type, data } = node;

  switch (type) {
    case 'aiAgent':
      if (!data.agentId) {
        issues.push({
          id: `config-${node.id}-agent`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem um agente IA configurado`,
          suggestion: 'Abra as configurações e selecione um agente IA',
        });
      }
      if (!data.prompt || data.prompt.trim() === '') {
        issues.push({
          id: `config-${node.id}-prompt`,
          type: 'warning',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem um prompt configurado`,
          suggestion: 'Adicione um prompt para o agente IA',
        });
      }
      break;

    case 'condition':
      if (!data.conditions || data.conditions.length === 0) {
        issues.push({
          id: `config-${node.id}-conditions`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem condições configuradas`,
          suggestion: 'Adicione pelo menos uma condição',
        });
      }
      break;

    case 'webhook':
      if (!data.webhookUrl) {
        issues.push({
          id: `config-${node.id}-webhook`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem URL de webhook configurada`,
          suggestion: 'Configure a URL do webhook',
        });
      }
      break;

    case 'sendMessage':
      if (!data.message || data.message.trim() === '') {
        issues.push({
          id: `config-${node.id}-message`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem mensagem configurada`,
          suggestion: 'Adicione o conteúdo da mensagem',
        });
      }
      break;

    case 'http':
      if (!data.url) {
        issues.push({
          id: `config-${node.id}-url`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem URL configurada`,
          suggestion: 'Configure a URL da requisição HTTP',
        });
      }
      if (!data.method) {
        issues.push({
          id: `config-${node.id}-method`,
          type: 'error',
          nodeId: node.id,
          message: `Nó "${data.label}" não tem método HTTP configurado`,
          suggestion: 'Selecione o método HTTP (GET, POST, etc.)',
        });
      }
      break;
  }

  return issues;
}

/**
 * Retorna ícone e cor para cada tipo de issue
 */
export function getIssueStyle(type: ValidationIssue['type']) {
  switch (type) {
    case 'error':
      return { icon: '❌', color: '#ef4444', bgColor: '#fee2e2' };
    case 'warning':
      return { icon: '⚠️', color: '#f59e0b', bgColor: '#fef3c7' };
    case 'info':
      return { icon: 'ℹ️', color: '#3b82f6', bgColor: '#dbeafe' };
  }
}
