import { Node, Edge } from 'reactflow';
import { convertN8NNodeType, getN8NNodeInfo } from '@/utils/n8n-node-mapping';

// Mapa de tipos de nós entre formatos
const nodeTypeMap: Record<string, string> = {
  start: 'trigger',
  schedule: 'condition',
  condition: 'condition',
  message: 'message',
  transfer: 'transfer',
  wait: 'wait',
  delay: 'delay',
  api: 'api',
  function: 'function',
  set: 'set',
  uraMenu: 'uraMenu',
  createTicket: 'createTicket',
  ai: 'ai',
};

// Mapeamento de categorias para cores
const categoryColors: Record<string, string> = {
  trigger: '#f59e0b',
  message: '#3b82f6',
  ai: '#a855f7',
  condition: '#f97316',
  transfer: '#10b981',
  wait: '#ef4444',
  delay: '#f56565',
  api: '#2563eb',
  set: '#ec4899',
  function: '#6366f1',
  uraMenu: '#14b8a6',
  createTicket: '#eab308',
  database: '#00758F',
  split: '#EC4899',
  loop: '#06B6D4',
  merge: '#8B5CF6',
  action: '#818cf8',
};

/**
 * Detecta automaticamente o formato do arquivo e converte para React Flow
 */
export function convertToReactFlow(content: string): { nodes: Node[]; edges: Edge[] } {
  try {
    // Tentar decodificar Base64 primeiro (formato .ivr)
    let data: any;
    try {
      const decoded = atob(content);
      data = JSON.parse(decoded);
    } catch {
      // Se falhar, tentar como JSON direto
      data = JSON.parse(content);
    }

    // Detectar formato
    if (data.drawflow) {
      return convertDrawflowToReactFlow(data);
    } else if (data.type && data.vertices) {
      return convertIVRToReactFlow(data);
    } else if (data.nodes && data.edges) {
      // Já está no formato React Flow
      return { nodes: data.nodes, edges: data.edges };
    } else if (isN8NFormat(data)) {
      // Formato N8N
      return convertN8NToReactFlow(data);
    } else {
      throw new Error('Formato não reconhecido');
    }
  } catch (error) {
    console.error('Erro ao converter fluxo:', error);
    throw error;
  }
}

/**
 * Converte formato Drawflow para React Flow
 */
function convertDrawflowToReactFlow(data: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const drawflowData = data.drawflow?.Home?.data || {};

  // Converter nós
  Object.values(drawflowData).forEach((node: any) => {
    const nodeType = nodeTypeMap[node.name] || 'action';
    
    nodes.push({
      id: String(node.id),
      type: nodeType,
      position: { x: node.pos_x || 0, y: node.pos_y || 0 },
      data: {
        label: node.data?.title || node.name || `Node ${node.id}`,
        description: node.data?.desc || '',
        nodeType,
        config: node.data || {},
      },
    });

    // Converter conexões
    if (node.outputs) {
      Object.entries(node.outputs).forEach(([outputKey, output]: [string, any]) => {
        if (output.connections && Array.isArray(output.connections)) {
          output.connections.forEach((conn: any) => {
            edges.push({
              id: `e${node.id}-${conn.node}`,
              source: String(node.id),
              target: String(conn.node),
              sourceHandle: outputKey,
              targetHandle: conn.input,
            });
          });
        }
      });
    }
  });

  return { nodes, edges };
}

/**
 * Converte formato IVR para React Flow
 */
function convertIVRToReactFlow(data: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!data.vertices || !Array.isArray(data.vertices)) {
    throw new Error('Formato IVR inválido: vertices não encontrado');
  }

  // Converter vértices (nós)
  data.vertices.forEach((vertex: any, index: number) => {
    const nodeType = nodeTypeMap[vertex.type] || 'action';
    
    nodes.push({
      id: String(vertex.id || index),
      type: nodeType,
      position: { 
        x: vertex.position?.x || index * 200, 
        y: vertex.position?.y || 100 
      },
      data: {
        label: vertex.label || vertex.name || `Node ${index}`,
        description: vertex.description || '',
        nodeType,
        config: vertex.data || vertex.config || {},
      },
    });
  });

  // Converter arestas (conexões)
  if (data.edges && Array.isArray(data.edges)) {
    data.edges.forEach((edge: any, index: number) => {
      edges.push({
        id: edge.id || `e${index}`,
        source: String(edge.source || edge.from),
        target: String(edge.target || edge.to),
        label: edge.label,
      });
    });
  }

  return { nodes, edges };
}

/**
 * Converte React Flow para formato exportável
 */
export function convertFromReactFlow(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({ nodes, edges }, null, 2);
}

/**
 * Detecta se o formato é N8N
 */
function isN8NFormat(data: any): boolean {
  // N8N tem nodes com propriedade type começando com 'n8n-nodes-' ou '@n8n/'
  if (data.nodes && Array.isArray(data.nodes)) {
    return data.nodes.some((node: any) =>
      node.type && (
        node.type?.startsWith?.('n8n-nodes-') ||
        node.type?.startsWith?.('@n8n/')
      )
    );
  }
  return false;
}

/**
 * Converte formato N8N para React Flow
 */
export function convertN8NToReactFlow(data: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, any>(); // Mapear nome do nó para ID

  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Formato N8N inválido: nodes não encontrado');
  }

  // PRIMEIRO: Criar mapeamento de nome para ID
  data.nodes.forEach((n8nNode: any) => {
    if (n8nNode.name) {
      nodeMap.set(n8nNode.name, n8nNode);
    }
  });

  // SEGUNDO: Converter nós N8N para React Flow
  data.nodes.forEach((n8nNode: any) => {
    // Ignorar sticky notes
    if (n8nNode.type === 'n8n-nodes-base.stickyNote') {
      return;
    }

    const nodeInfo = getN8NNodeInfo(n8nNode.type);
    const nodeType = nodeInfo.internalType;
    const nodeColor = nodeInfo.color || categoryColors[nodeType] || '#818cf8';
    
    // Posição no N8N é array [x, y], no React Flow é objeto {x, y}
    const position = Array.isArray(n8nNode.position) 
      ? { x: n8nNode.position[0], y: n8nNode.position[1] }
      : { x: 0, y: 0 };

    // Extrair configurações relevantes
    const config: any = {
      ...n8nNode.parameters,
      n8nType: n8nNode.type,
      typeVersion: n8nNode.typeVersion,
    };

    // Configurações específicas por tipo
    if (nodeType === 'ai' && n8nNode.parameters) {
      config.model = n8nNode.parameters.model;
      config.options = n8nNode.parameters.options;
    }

    if (nodeType === 'condition' && n8nNode.parameters?.conditions) {
      config.conditions = n8nNode.parameters.conditions;
    }

    nodes.push({
      id: n8nNode.id || n8nNode.name,
      type: nodeType,
      position,
      data: {
        label: n8nNode.name || n8nNode.id,
        description: nodeInfo.label || n8nNode.type,
        nodeType,
        config,
        n8nType: n8nNode.type,
        icon: nodeInfo.icon,
        color: nodeColor,
      },
      style: {
        background: nodeColor,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  });

  // TERCEIRO: Converter conexões N8N para edges React Flow
  if (data.connections) {
    Object.entries(data.connections).forEach(([sourceNodeName, connection]: [string, any]) => {
      // Encontrar o nó de origem pelo nome
      const sourceNode = nodeMap.get(sourceNodeName);
      if (!sourceNode) {
        console.warn(`Nó de origem não encontrado: ${sourceNodeName}`);
        return;
      }

      const sourceId = sourceNode.id || sourceNodeName;

      // connection pode ter múltiplos outputs (main, ai_languageModel, etc)
      Object.entries(connection).forEach(([outputType, outputConnections]: [string, any]) => {
        if (!Array.isArray(outputConnections)) {
          return;
        }

        outputConnections.forEach((branchArray: any[], branchIndex: number) => {
          if (!Array.isArray(branchArray)) {
            return;
          }

          branchArray.forEach((conn: any, connIndex: number) => {
            if (!conn || !conn.node) {
              return;
            }

            // Encontrar o nó de destino pelo nome
            const targetNode = nodeMap.get(conn.node);
            if (!targetNode) {
              console.warn(`Nó de destino não encontrado: ${conn.node}`);
              return;
            }

            const targetId = targetNode.id || conn.node;

            // Criar edge
            edges.push({
              id: `e-${sourceId}-${targetId}-${branchIndex}-${connIndex}`,
              source: sourceId,
              target: targetId,
              sourceHandle: outputType,
              targetHandle: conn.type || 'main',
              animated: true,
              label: getConnectionLabel(outputType, branchIndex, connection),
              style: {
                stroke: getConnectionColor(outputType),
                strokeWidth: 2,
              },
            });
          });
        });
      });
    });
  }

  // QUARTO: Reorganizar posições se necessário
  const { nodes: reorganizedNodes, edges: reorganizedEdges } = reorganizeFlowPositions(nodes, edges);

  return { nodes: reorganizedNodes, edges: reorganizedEdges };
}

/**
 * Obtém label para a conexão baseado no tipo
 */
function getConnectionLabel(outputType: string, branchIndex: number, connection: any): string | undefined {
  // Para condições IF/Switch, identificar true/false
  if (outputType === 'main' && connection.main && connection.main.length > 1) {
    if (branchIndex === 0) return 'true';
    if (branchIndex === 1) return 'false';
  }
  return undefined;
}

/**
 * Obtém cor para a conexão baseado no tipo
 */
function getConnectionColor(outputType: string): string {
  const colors: Record<string, string> = {
    main: '#6b7280',
    ai_languageModel: '#a855f7',
    ai_chatModel: '#10A37F',
  };
  return colors[outputType] || '#6b7280';
}

/**
 * Reorganiza as posições dos nós para melhor visualização
 */
function reorganizeFlowPositions(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Calcular bounds atuais
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y);
  });

  // Se o fluxo já está bem posicionado (range razoável), manter
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  
  if (xRange < 2000 && yRange < 1500 && minX >= 0 && minY >= 0) {
    return { nodes, edges };
  }

  // Normalizar posições para começar em (100, 100)
  const offsetX = minX < 0 ? -minX + 100 : 100 - minX;
  const offsetY = minY < 0 ? -minY + 100 : 100 - minY;

  const normalizedNodes = nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));

  return { nodes: normalizedNodes, edges };
}

/**
 * Valida e corrige conexões de um fluxo
 */
export function validateAndFixFlowConnections(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; issues: string[] } {
  const issues: string[] = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  const validEdges: Edge[] = [];

  // Verificar edges inválidas
  edges.forEach(edge => {
    const sourceExists = nodeIds.has(edge.source);
    const targetExists = nodeIds.has(edge.target);

    if (!sourceExists) {
      issues.push(`Edge ${edge.id}: source node ${edge.source} não existe`);
    }
    if (!targetExists) {
      issues.push(`Edge ${edge.id}: target node ${edge.target} não existe`);
    }

    if (sourceExists && targetExists) {
      validEdges.push(edge);
    }
  });

  // Verificar nós sem conexões (exceto triggers)
  const connectedNodeIds = new Set<string>();
  validEdges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && node.type !== 'trigger') {
      issues.push(`Node ${node.data?.label || node.id}: não está conectado ao fluxo`);
    }
  });

  return { nodes, edges: validEdges, issues };
}

/**
 * Gera um fluxo completo e interligado a partir de dados N8N
 */
export function generateCompleteFlow(n8nData: any): { 
  nodes: Node[]; 
  edges: Edge[]; 
  metadata: { 
    totalNodes: number; 
    totalEdges: number; 
    nodeTypes: Record<string, number>;
    issues: string[];
  } 
} {
  try {
    // Converter para React Flow
    const { nodes, edges } = convertN8NToReactFlow(n8nData);
    
    // Validar e corrigir
    const { nodes: validatedNodes, edges: validatedEdges, issues } = validateAndFixFlowConnections(nodes, edges);
    
    // Contar tipos de nós
    const nodeTypes: Record<string, number> = {};
    validatedNodes.forEach(node => {
      const type = node.type || 'unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    });

    return {
      nodes: validatedNodes,
      edges: validatedEdges,
      metadata: {
        totalNodes: validatedNodes.length,
        totalEdges: validatedEdges.length,
        nodeTypes,
        issues,
      },
    };
  } catch (error) {
    throw new Error(`Erro ao gerar fluxo completo: ${error}`);
  }
}
