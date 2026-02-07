import { Node, Edge } from 'reactflow';

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

// Mapa de tipos N8N para React Flow
const n8nTypeMap: Record<string, string> = {
  'n8n-nodes-base.webhook': 'trigger',
  'n8n-nodes-base.scheduleTrigger': 'trigger',
  'n8n-nodes-base.if': 'condition',
  'n8n-nodes-base.switch': 'condition',
  'n8n-nodes-base.httpRequest': 'api',
  'n8n-nodes-base.function': 'function',
  'n8n-nodes-base.set': 'set',
  'n8n-nodes-base.wait': 'wait',
  'n8n-nodes-base.delay': 'delay',
  'n8n-nodes-base.splitInBatches': 'action',
  'n8n-nodes-base.stickyNote': 'stickyNote',
  'n8n-nodes-base.code': 'function',
  '@n8n/n8n-nodes-langchain.lmChatOpenAi': 'ai',
  '@n8n/n8n-nodes-langchain.agent': 'ai',
  'n8n-nodes-base.zendesk': 'api',
  'n8n-nodes-base.supabase': 'api',
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
        node.type.startsWith('n8n-nodes-') || 
        node.type.startsWith('@n8n/')
      )
    );
  }
  return false;
}

/**
 * Converte formato N8N para React Flow
 */
function convertN8NToReactFlow(data: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Formato N8N inválido: nodes não encontrado');
  }

  // Converter nós N8N para React Flow
  data.nodes.forEach((n8nNode: any) => {
    // Ignorar sticky notes
    if (n8nNode.type === 'n8n-nodes-base.stickyNote') {
      return;
    }

    const nodeType = n8nTypeMap[n8nNode.type] || 'action';
    
    // Posição no N8N é array [x, y], no React Flow é objeto {x, y}
    const position = Array.isArray(n8nNode.position) 
      ? { x: n8nNode.position[0], y: n8nNode.position[1] }
      : { x: 0, y: 0 };

    nodes.push({
      id: n8nNode.id,
      type: nodeType,
      position,
      data: {
        label: n8nNode.name || n8nNode.id,
        description: n8nNode.type,
        nodeType,
        config: n8nNode.parameters || {},
        n8nType: n8nNode.type,
      },
    });
  });

  // Converter conexões N8N para edges React Flow
  if (data.connections) {
    Object.entries(data.connections).forEach(([sourceId, connection]: [string, any]) => {
      // connection pode ter múltiplos outputs (main, etc)
      Object.entries(connection).forEach(([outputType, outputConnections]: [string, any]) => {
        if (Array.isArray(outputConnections)) {
          outputConnections.forEach((connArray: any[]) => {
            if (Array.isArray(connArray)) {
              connArray.forEach((conn: any) => {
                if (conn && conn.node) {
                  edges.push({
                    id: `e-${sourceId}-${conn.node}`,
                    source: sourceId,
                    target: conn.node,
                    sourceHandle: outputType,
                    targetHandle: conn.input || 'main',
                    animated: true,
                  });
                }
              });
            }
          });
        }
      });
    });
  }

  return { nodes, edges };
}
