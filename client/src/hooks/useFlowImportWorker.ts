import { useRef, useCallback, useState, useEffect } from 'react';

interface UseFlowImportWorkerOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useFlowImportWorker(options: UseFlowImportWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  // Inicializar worker
  useEffect(() => {
    // Criar worker inline
    const workerCode = `
      // Web Worker para processar importação de fluxos
      self.onmessage = function(e) {
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
              sendError(id, 'Tipo desconhecido: ' + type);
          }
        } catch (error) {
          sendError(id, error.message || 'Erro desconhecido');
        }
      };

      function handleParse(content, id) {
        sendProgress(id, 10);
        
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          throw new Error('JSON inválido');
        }
        
        sendProgress(id, 100);
        sendSuccess(id, { 
          parsed, 
          isN8N: detectN8NFormat(parsed),
          nodeCount: parsed.nodes?.length || 0 
        });
      }

      function handleConvert(n8nData, id) {
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        
        const typeMap = {
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
        };
        
        // Processar nós
        let processedCount = 0;
        const totalNodes = n8nData.nodes?.length || 0;
        
        function processNextBatch(startIdx) {
          const batchSize = 5;
          const endIdx = Math.min(startIdx + batchSize, totalNodes);
          
          for (let i = startIdx; i < endIdx; i++) {
            const n8nNode = n8nData.nodes[i];
            
            if (n8nNode.name) {
              nodeMap.set(n8nNode.name, n8nNode);
            }
            
            if (n8nNode.type === 'n8n-nodes-base.stickyNote') {
              processedCount++;
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
            
            processedCount++;
          }
          
          const progress = 10 + Math.floor((processedCount / totalNodes) * 40);
          sendProgress(id, progress);
          
          if (processedCount < totalNodes) {
            setTimeout(() => processNextBatch(endIdx), 0);
          } else {
            processConnections();
          }
        }
        
        function processConnections() {
          if (n8nData.connections) {
            Object.entries(n8nData.connections).forEach(([sourceNodeName, connection]) => {
              const sourceNode = nodeMap.get(sourceNodeName);
              if (!sourceNode) return;
              
              const sourceId = sourceNode.id || sourceNodeName;
              
              Object.entries(connection).forEach(([outputType, outputConnections]) => {
                if (!Array.isArray(outputConnections)) return;
                
                outputConnections.forEach((branchArray) => {
                  if (!Array.isArray(branchArray)) return;
                  
                  branchArray.forEach((conn) => {
                    if (!conn || !conn.node) return;
                    
                    const targetNode = nodeMap.get(conn.node);
                    if (!targetNode) return;
                    
                    edges.push({
                      id: 'e-' + sourceId + '-' + targetNode.id || conn.node,
                      source: sourceId,
                      target: targetNode.id || conn.node,
                      sourceHandle: outputType,
                      targetHandle: conn.type || 'main',
                      animated: true,
                    });
                  });
                });
              });
            });
          }
          
          sendProgress(id, 100);
          sendSuccess(id, { 
            nodes, 
            edges,
            stats: { totalNodes: nodes.length, totalEdges: edges.length }
          });
        }
        
        if (totalNodes > 0) {
          processNextBatch(0);
        } else {
          sendSuccess(id, { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0 } });
        }
      }

      function handleValidate(data, id) {
        const { nodes, edges } = data;
        const errors = [];
        const warnings = [];
        
        if (nodes.length === 0) {
          errors.push('Fluxo vazio');
        }
        
        sendProgress(id, 100);
        sendSuccess(id, { isValid: errors.length === 0, errors, warnings });
      }

      function detectN8NFormat(data) {
        if (data.nodes && Array.isArray(data.nodes)) {
          return data.nodes.some((node) => 
            node.type && (node.type.startsWith('n8n-nodes-') || node.type.startsWith('@n8n/'))
          );
        }
        return false;
      }

      function sendSuccess(id, data) {
        self.postMessage({ type: 'success', id, data });
      }

      function sendError(id, error) {
        self.postMessage({ type: 'error', id, error });
      }

      function sendProgress(id, progress) {
        self.postMessage({ type: 'progress', id, progress });
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = (e) => {
      const { type, id, data, error, progress: workerProgress } = e.data;
      
      if (type === 'progress') {
        setProgress(workerProgress);
        options.onProgress?.(workerProgress);
      } else if (type === 'success') {
        const pending = pendingRef.current.get(id);
        if (pending) {
          pending.resolve(data);
          pendingRef.current.delete(id);
        }
        options.onSuccess?.(data);
        setIsProcessing(false);
      } else if (type === 'error') {
        const pending = pendingRef.current.get(id);
        if (pending) {
          pending.reject(new Error(error));
          pendingRef.current.delete(id);
        }
        options.onError?.(error);
        setIsProcessing(false);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const sendMessage = useCallback(<T>(type: string, payload: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker não inicializado'));
        return;
      }

      const id = Math.random().toString(36).substring(7);
      pendingRef.current.set(id, { resolve, reject });
      
      setIsProcessing(true);
      setProgress(0);
      
      workerRef.current.postMessage({ type, payload, id });
    });
  }, []);

  const parseJSON = useCallback((content: string) => {
    return sendMessage('parse', content);
  }, [sendMessage]);

  const convertN8N = useCallback((n8nData: any) => {
    return sendMessage('convert', n8nData);
  }, [sendMessage]);

  const validateFlow = useCallback((data: { nodes: any[]; edges: any[] }) => {
    return sendMessage('validate', data);
  }, [sendMessage]);

  return {
    isProcessing,
    progress,
    parseJSON,
    convertN8N,
    validateFlow,
  };
}
