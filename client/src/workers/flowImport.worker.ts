/**
 * FlowImportWorker - Web Worker para processar importação de fluxos em background
 * 
 * Este worker processa arquivos N8N grandes sem bloquear a UI principal
 */

// Tipos de mensagens entre worker e main thread
type WorkerMessage = {
  type: 'parse' | 'convert' | 'validate';
  payload: any;
  id: string;
};

type WorkerResponse = {
  type: 'success' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
};

// Processar mensagens do main thread
self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload, id } = e.data;
  
  try {
    switch (type) {
      case 'parse':
        handleParse(payload, id);
        break;
      case 'convert':
        handleConvert(payload, id);
        break;
      case 'validate':
        handleValidate(payload, id);
        break;
      default:
        sendError(id, `Tipo desconhecido: ${type}`);
    }
  } catch (error) {
    sendError(id, error instanceof Error ? error.message : 'Erro desconhecido');
  }
};

function handleParse(content: string, id: string) {
  sendProgress(id, 10);
  
  // Parse JSON em chunks
  const chunkSize = 10000;
  let parsed: any;
  
  if (content.length > chunkSize) {
    // Para arquivos grandes, usar parse simples
    try {
      parsed = JSON.parse(content);
      sendProgress(id, 50);
    } catch (e) {
      throw new Error('JSON inválido');
    }
  } else {
    parsed = JSON.parse(content);
  }
  
  sendProgress(id, 100);
  sendSuccess(id, { 
    parsed, 
    isN8N: detectN8NFormat(parsed),
    nodeCount: parsed.nodes?.length || 0 
  });
}

function handleConvert(n8nData: any, id: string) {
  sendProgress(id, 10);
  
  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeMap = new Map<string, any>();
  
  // Mapeamento de tipos N8N
  const typeMap: Record<string, string> = {
    'n8n-nodes-base.webhook': 'trigger',
    'n8n-nodes-base.scheduleTrigger': 'trigger',
    'n8n-nodes-base.if': 'condition',
    'n8n-nodes-base.switch': 'condition',
    'n8n-nodes-base.httpRequest': 'api',
    'n8n-nodes-base.function': 'function',
    'n8n-nodes-base.code': 'function',
    'n8n-nodes-base.set': 'set',
    'n8n-nodes-base.wait': 'wait',
    'n8n-nodes-base.delay': 'delay',
    '@n8n/n8n-nodes-langchain.lmChatOpenAi': 'ai',
    '@n8n/n8n-nodes-langchain.agent': 'ai',
    'n8n-nodes-base.splitInBatches': 'action',
  };
  
  const totalNodes = n8nData.nodes?.length || 0;
  let processedNodes = 0;
  
  // Processar nós em batches
  const processBatch = (startIdx: number) => {
    const batchSize = 10;
    const endIdx = Math.min(startIdx + batchSize, totalNodes);
    
    for (let i = startIdx; i < endIdx; i++) {
      const n8nNode = n8nData.nodes[i];
      
      if (n8nNode.name) {
        nodeMap.set(n8nNode.name, n8nNode);
      }
      
      // Ignorar sticky notes
      if (n8nNode.type === 'n8n-nodes-base.stickyNote') {
        processedNodes++;
        continue;
      }
      
      const nodeType = typeMap[n8nNode.type] || 'action';
      const position = Array.isArray(n8nNode.position) 
        ? { x: n8nNode.position[0], y: n8nNode.position[1] }
        : { x: 0, y: 0 };
      
      nodes.push({
        id: n8nNode.id || n8nNode.name,
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
      
      processedNodes++;
    }
    
    const progress = 10 + Math.floor((processedNodes / totalNodes) * 40);
    sendProgress(id, progress);
    
    if (processedNodes < totalNodes) {
      // Continuar no próximo frame
      setTimeout(() => processBatch(endIdx), 0);
    } else {
      // Processar conexões
      processConnections();
    }
  };
  
  const processConnections = () => {
    sendProgress(id, 60);
    
    if (n8nData.connections) {
      let connectionCount = 0;
      const totalConnections = Object.keys(n8nData.connections).length;
      
      Object.entries(n8nData.connections).forEach(([sourceNodeName, connection]: [string, any]) => {
        const sourceNode = nodeMap.get(sourceNodeName);
        if (!sourceNode) return;
        
        const sourceId = sourceNode.id || sourceNodeName;
        
        Object.entries(connection).forEach(([outputType, outputConnections]: [string, any]) => {
          if (!Array.isArray(outputConnections)) return;
          
          outputConnections.forEach((branchArray: any[]) => {
            if (!Array.isArray(branchArray)) return;
            
            branchArray.forEach((conn: any) => {
              if (!conn || !conn.node) return;
              
              const targetNode = nodeMap.get(conn.node);
              if (!targetNode) return;
              
              const targetId = targetNode.id || conn.node;
              
              edges.push({
                id: `e-${sourceId}-${targetId}`,
                source: sourceId,
                target: targetId,
                sourceHandle: outputType,
                targetHandle: conn.type || 'main',
                animated: true,
              });
            });
          });
        });
        
        connectionCount++;
      });
    }
    
    sendProgress(id, 90);
    
    // Reorganizar posições
    const result = reorganizePositions(nodes, edges);
    
    sendProgress(id, 100);
    sendSuccess(id, { 
      nodes: result.nodes, 
      edges: result.edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
      }
    });
  };
  
  // Iniciar processamento
  if (totalNodes > 0) {
    processBatch(0);
  } else {
    sendSuccess(id, { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0 } });
  }
}

function handleValidate(data: { nodes: any[]; edges: any[] }, id: string) {
  sendProgress(id, 50);
  
  const { nodes, edges } = data;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validações básicas
  if (nodes.length === 0) {
    errors.push('Fluxo vazio');
  }
  
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // Verificar edges inválidas
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      warnings.push(`Edge para nó inexistente: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      warnings.push(`Edge para nó inexistente: ${edge.target}`);
    }
  });
  
  sendProgress(id, 100);
  sendSuccess(id, { isValid: errors.length === 0, errors, warnings });
}

function detectN8NFormat(data: any): boolean {
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

function reorganizePositions(nodes: any[], edges: any[]) {
  if (nodes.length === 0) return { nodes, edges };
  
  // Normalizar posições
  let minX = Infinity, minY = Infinity;
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
  });
  
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

// Helpers
function sendSuccess(id: string, data: any) {
  self.postMessage({ type: 'success', id, data } as WorkerResponse);
}

function sendError(id: string, error: string) {
  self.postMessage({ type: 'error', id, error } as WorkerResponse);
}

function sendProgress(id: string, progress: number) {
  self.postMessage({ type: 'progress', id, progress } as WorkerResponse);
}

// Exportar tipos
export type { WorkerMessage, WorkerResponse };
