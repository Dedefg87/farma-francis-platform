import { Node, Edge } from 'reactflow';

interface IVRNode {
  id: string;
  type: number;
  x: number;
  y: number;
  configured: boolean;
  config: {
    nextElementId?: string;
    text?: string;
    destinationType?: number;
    destinationId?: string;
    options?: Array<{
      id: string;
      nextElementId?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}

interface IVRData {
  name: string;
  options: string; // JSON stringificado
  [key: string]: any;
}

const typeMapping: Record<number, string> = {
  0: 'message',     // Mensagem
  1: 'trigger',     // Gatilho
  2: 'condition',   // Condição
  3: 'action',      // Ação
  4: 'wait',        // Aguardar
  5: 'api',         // API/Transferência
  6: 'delay',       // Delay
  7: 'ai',          // IA
  8: 'condition',   // Horário (tipo de condição)
};

export function convertIVRToReactFlow(ivrData: IVRData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  try {
    // Parse options que está como string JSON
    const ivrNodes: IVRNode[] = JSON.parse(ivrData.options);

    // Converter cada nó IVR para React Flow
    ivrNodes.forEach((ivrNode) => {
      const nodeType = typeMapping[ivrNode.type] || 'action';
      const nodeColor = getNodeColor(nodeType);

      // Criar nó React Flow
      const node: Node = {
        id: ivrNode.id,
        type: 'default', // Usar tipo default do React Flow
        position: { x: ivrNode.x, y: ivrNode.y },
        data: {
          label: getNodeLabel(ivrNode),
          nodeType, // Guardar tipo customizado no data
          config: ivrNode.config,
        },
        style: {
          background: nodeColor,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '500',
        },
      };

      nodes.push(node);

      // Criar edges baseado em nextElementId
      if (ivrNode.config.nextElementId) {
        edges.push({
          id: `${ivrNode.id}-${ivrNode.config.nextElementId}`,
          source: ivrNode.id,
          target: ivrNode.config.nextElementId,
          animated: true,
        });
      }

      // Se tem options (condições múltiplas), criar edge para cada uma
      if (ivrNode.config.options && Array.isArray(ivrNode.config.options)) {
        ivrNode.config.options.forEach((option, index) => {
          if (option.nextElementId) {
            edges.push({
              id: `${ivrNode.id}-${option.nextElementId}-${index}`,
              source: ivrNode.id,
              target: option.nextElementId,
              animated: true,
              label: `Opção ${index + 1}`,
            });
          }
        });
      }
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Erro ao converter IVR:', error);
    throw new Error('Formato IVR inválido');
  }
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    trigger: '#10b981',
    condition: '#f59e0b',
    message: '#3b82f6',
    ai: '#ec4899',
    action: '#8b5cf6',
    wait: '#6b7280',
    api: '#06b6d4',
    delay: '#64748b',
  };
  return colors[type] || '#6b7280';
}

function getNodeLabel(ivrNode: IVRNode): string {
  // Tentar extrair label do texto ou tipo
  if (ivrNode.config.text) {
    const text = ivrNode.config.text;
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  }

  const typeLabels: Record<number, string> = {
    0: 'Mensagem',
    1: 'Início',
    2: 'Condição',
    3: 'Ação',
    4: 'Aguardar',
    5: 'Transferir',
    6: 'Delay',
    7: 'IA',
    8: 'Horário',
  };

  return typeLabels[ivrNode.type] || 'Nó';
}
