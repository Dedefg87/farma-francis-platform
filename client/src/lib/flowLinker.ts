import { Node, Edge } from 'reactflow';
import { convertN8NToReactFlow } from './flowConverters';

/**
 * FlowLinker - Utilitário avançado para interligação de nós em fluxos
 * 
 * Este módulo fornece funções para:
 * - Auto-conectar nós desconectados
 * - Organizar layout do fluxo
 * - Validar e corrigir conexões
 * - Otimizar o caminho do fluxo
 */

export interface FlowLinkageResult {
  nodes: Node[];
  edges: Edge[];
  changes: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    connectedNodes: number;
    disconnectedNodes: number;
    orphanedNodes: number;
  };
}

/**
 * Auto-conecta nós desconectados de forma inteligente
 */
export function autoConnectNodes(nodes: Node[], edges: Edge[]): FlowLinkageResult {
  const changes: string[] = [];
  const newEdges: Edge[] = [...edges];
  
  // Identificar nós desconectados
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  const triggerNodes = nodes.filter(node => node.type === 'trigger');
  
  if (disconnectedNodes.length === 0) {
    changes.push('Todos os nós já estão conectados');
    return buildResult(nodes, newEdges, changes);
  }

  // Estratégia 1: Conectar nós desconectados ao último nó do fluxo principal
  const mainFlowEndNodes = findMainFlowEndNodes(nodes, newEdges);
  
  disconnectedNodes.forEach((node, index) => {
    // Se for um trigger, não precisa de entrada
    if (node.type === 'trigger') {
      changes.push(`Trigger "${node.data?.label}" não precisa de conexão de entrada`);
      return;
    }

    // Tentar conectar a um nó final do fluxo principal
    if (mainFlowEndNodes.length > 0) {
      const targetNode = mainFlowEndNodes[index % mainFlowEndNodes.length];
      const newEdge: Edge = {
        id: `auto-${targetNode.id}-${node.id}`,
        source: targetNode.id,
        target: node.id,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      };
      newEdges.push(newEdge);
      changes.push(`Conectado "${node.data?.label}" ao fluxo principal via "${targetNode.data?.label}"`);
    } else if (triggerNodes.length > 0) {
      // Se não houver fluxo principal, conectar ao primeiro trigger
      const newEdge: Edge = {
        id: `auto-${triggerNodes[0].id}-${node.id}`,
        source: triggerNodes[0].id,
        target: node.id,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      };
      newEdges.push(newEdge);
      changes.push(`Conectado "${node.data?.label}" ao trigger "${triggerNodes[0].data?.label}"`);
    }
  });

  return buildResult(nodes, newEdges, changes);
}

/**
 * Organiza o layout do fluxo em uma estrutura hierárquica
 */
export function organizeFlowLayout(nodes: Node[], edges: Edge[]): FlowLinkageResult {
  const changes: string[] = [];
  
  if (nodes.length === 0) {
    return buildResult(nodes, edges, changes);
  }

  // Encontrar nós de início (triggers ou nós sem entrada)
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge.source);
    
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge.target);
  });

  const startNodes = nodes.filter(node => 
    node.type === 'trigger' || !incomingEdges.has(node.id)
  );

  if (startNodes.length === 0 && nodes.length > 0) {
    changes.push('Nenhum nó de início encontrado. Usando primeiro nó.');
    startNodes.push(nodes[0]);
  }

  // Calcular níveis usando BFS
  const nodeLevels = new Map<string, number>();
  const queue: { nodeId: string; level: number }[] = [];
  
  startNodes.forEach(node => {
    nodeLevels.set(node.id, 0);
    queue.push({ nodeId: node.id, level: 0 });
  });

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    const nextLevel = level + 1;
    
    const nextNodes = outgoingEdges.get(nodeId) || [];
    nextNodes.forEach(nextNodeId => {
      const currentLevel = nodeLevels.get(nextNodeId);
      if (currentLevel === undefined || currentLevel < nextLevel) {
        nodeLevels.set(nextNodeId, nextLevel);
        queue.push({ nodeId: nextNodeId, level: nextLevel });
      }
    });
  }

  // Agrupar nós por nível
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = nodeLevels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Reposicionar nós
  const nodeSpacingX = 300;
  const nodeSpacingY = 150;
  const updatedNodes = nodes.map(node => {
    const level = nodeLevels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node);
    const totalInLevel = nodesInLevel.length;
    
    // Centralizar verticalmente
    const startY = -((totalInLevel - 1) * nodeSpacingY) / 2;
    
    return {
      ...node,
      position: {
        x: level * nodeSpacingX + 100,
        y: startY + indexInLevel * nodeSpacingY + 100,
      },
    };
  });

  changes.push(`Layout reorganizado: ${nodesByLevel.size} níveis, ${nodes.length} nós`);

  return buildResult(updatedNodes, edges, changes);
}

/**
 * Valida completamente o fluxo e retorna todos os problemas
 */
export function validateFlowIntegrity(nodes: Node[], edges: Edge[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    triggers: number;
    endNodes: number;
    disconnectedNodes: number;
    orphanedNodes: number;
    loops: string[];
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (nodes.length === 0) {
    errors.push('Fluxo vazio: nenhum nó encontrado');
    return {
      isValid: false,
      errors,
      warnings,
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        triggers: 0,
        endNodes: 0,
        disconnectedNodes: 0,
        orphanedNodes: 0,
        loops: [],
      },
    };
  }

  // Estatísticas
  const triggers = nodes.filter(n => n.type === 'trigger').length;
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // Verificar edges inválidas
  const invalidEdges: string[] = [];
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      invalidEdges.push(`Edge ${edge.id}: source "${edge.source}" não existe`);
    }
    if (!nodeIds.has(edge.target)) {
      invalidEdges.push(`Edge ${edge.id}: target "${edge.target}" não existe`);
    }
  });

  if (invalidEdges.length > 0) {
    errors.push(...invalidEdges);
  }

  // Verificar conectividade
  const incomingEdges = new Map<string, number>();
  const outgoingEdges = new Map<string, number>();
  
  edges.forEach(edge => {
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1);
    outgoingEdges.set(edge.source, (outgoingEdges.get(edge.source) || 0) + 1);
  });

  const disconnectedNodes: string[] = [];
  const orphanedNodes: string[] = [];
  const endNodes: string[] = [];

  nodes.forEach(node => {
    const hasIncoming = incomingEdges.has(node.id);
    const hasOutgoing = outgoingEdges.has(node.id);
    
    if (!hasIncoming && node.type !== 'trigger') {
      disconnectedNodes.push(node.data?.label || node.id);
    }
    
    if (!hasOutgoing && !hasIncoming && node.type !== 'trigger') {
      orphanedNodes.push(node.data?.label || node.id);
    }
    
    if (!hasOutgoing && hasIncoming) {
      endNodes.push(node.data?.label || node.id);
    }
  });

  if (disconnectedNodes.length > 0) {
    warnings.push(`Nós desconectados (sem entrada): ${disconnectedNodes.join(', ')}`);
  }

  if (orphanedNodes.length > 0) {
    errors.push(`Nós órfãos (sem conexões): ${orphanedNodes.join(', ')}`);
  }

  if (triggers === 0) {
    errors.push('Nenhum trigger encontrado. O fluxo precisa de pelo menos um ponto de início.');
  }

  // Detectar loops
  const loops = detectLoops(nodes, edges);
  if (loops.length > 0) {
    warnings.push(`Possíveis loops detectados: ${loops.length}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      triggers,
      endNodes: endNodes.length,
      disconnectedNodes: disconnectedNodes.length,
      orphanedNodes: orphanedNodes.length,
      loops,
    },
  };
}

/**
 * Detecta loops no fluxo usando DFS
 */
function detectLoops(nodes: Node[], edges: Edge[]): string[] {
  const adjacencyList = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  });

  const loops: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, path)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Loop encontrado
        const loopStart = path.indexOf(neighbor);
        const loop = path.slice(loopStart).concat(neighbor);
        loops.push(loop.join(' -> '));
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });

  return loops;
}

/**
 * Encontra nós finais do fluxo principal
 */
function findMainFlowEndNodes(nodes: Node[], edges: Edge[]): Node[] {
  const outgoingEdges = new Map<string, number>();
  edges.forEach(edge => {
    outgoingEdges.set(edge.source, (outgoingEdges.get(edge.source) || 0) + 1);
  });

  // Nós que não têm saída (exceto triggers)
  return nodes.filter(node => 
    !outgoingEdges.has(node.id) && node.type !== 'trigger'
  );
}

/**
 * Constrói o resultado do linkage
 */
function buildResult(nodes: Node[], edges: Edge[], changes: string[]): FlowLinkageResult {
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const orphanedNodes = nodes.filter(node => 
    !connectedNodeIds.has(node.id) && node.type !== 'trigger'
  );

  return {
    nodes,
    edges,
    changes,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      connectedNodes: connectedNodeIds.size,
      disconnectedNodes: nodes.length - connectedNodeIds.size,
      orphanedNodes: orphanedNodes.length,
    },
  };
}

/**
 * Interliga completamente um fluxo N8N importado
 * Executa todas as operações de linkage em sequência
 */
export function fullyInterlinkFlow(n8nData: any): {
  nodes: Node[];
  edges: Edge[];
  report: {
    conversion: string[];
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    autoConnect: string[];
    layout: string[];
    finalStats: {
      totalNodes: number;
      totalEdges: number;
      nodeTypes: Record<string, number>;
    };
  };
} {
  const report = {
    conversion: [] as string[],
    validation: { isValid: false, errors: [] as string[], warnings: [] as string[] },
    autoConnect: [] as string[],
    layout: [] as string[],
    finalStats: { totalNodes: 0, totalEdges: 0, nodeTypes: {} as Record<string, number> },
  };

  // 1. Converter N8N para React Flow
  const result = convertN8NToReactFlow(n8nData);
  let { nodes, edges } = result;
  report.conversion.push(`Convertido ${nodes.length} nós e ${edges.length} edges do N8N`);

  // 2. Validar
  const validation = validateFlowIntegrity(nodes, edges);
  report.validation = validation;

  // 3. Auto-conectar nós desconectados
  if (validation.stats.disconnectedNodes > 0 || validation.stats.orphanedNodes > 0) {
    const autoConnectResult = autoConnectNodes(nodes, edges);
    nodes = autoConnectResult.nodes;
    edges = autoConnectResult.edges;
    report.autoConnect = autoConnectResult.changes;
  }

  // 4. Organizar layout
  const layoutResult = organizeFlowLayout(nodes, edges);
  nodes = layoutResult.nodes;
  edges = layoutResult.edges;
  report.layout = layoutResult.changes;

  // 5. Estatísticas finais
  const nodeTypes: Record<string, number> = {};
  nodes.forEach(node => {
    const type = node.type || 'unknown';
    nodeTypes[type] = (nodeTypes[type] || 0) + 1;
  });

  report.finalStats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeTypes,
  };

  return { nodes, edges, report };
}
