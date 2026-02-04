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
