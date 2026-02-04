import { FlowData, FlowNode, FlowEdge } from '@/types/flowBuilder';

export type ImportFormat = 'json' | 'ivr' | 'n8n' | 'zapier' | 'make';

interface ImportResult {
  success: boolean;
  flowData?: FlowData;
  error?: string;
}

/**
 * Importa fluxos de múltiplos formatos externos e converte para o formato interno
 */
export class FlowImporter {
  /**
   * Detecta automaticamente o formato do arquivo
   */
  static detectFormat(content: string): ImportFormat | null {
    try {
      // Tentar parsear diretamente como JSON
      let data;
      try {
        data = JSON.parse(content);
      } catch {
        // Se falhar, tentar decodificar base64 e parsear
        try {
          const decoded = atob(content.trim());
          data = JSON.parse(decoded);
          // Se conseguiu decodificar base64 e parsear, é IVR
          if (data.type !== undefined || data.options || data.name) {
            return 'ivr';
          }
        } catch {
          return null;
        }
      }
      
      // Detectar N8N
      if (data.nodes && data.connections && data.name) {
        return 'n8n';
      }
      
      // Detectar Zapier
      if (data.steps && data.trigger) {
        return 'zapier';
      }
      
      // Detectar Make (Integromat)
      if (data.flow && data.modules) {
        return 'make';
      }
      
      // Detectar IVR (JSON direto)
      if (data.menu || data.options || data.ivr || data.type === 1) {
        return 'ivr';
      }
      
      // JSON genérico (nosso formato)
      if (data.nodes && data.edges) {
        return 'json';
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Importa fluxo de qualquer formato suportado
   */
  static async importFlow(content: string, format?: ImportFormat): Promise<ImportResult> {
    try {
      const detectedFormat = format || this.detectFormat(content);
      
      if (!detectedFormat) {
        return {
          success: false,
          error: 'Formato não reconhecido. Formatos suportados: JSON, IVR, N8N, Zapier, Make',
        };
      }

      switch (detectedFormat) {
        case 'json':
          return this.importJSON(content);
        case 'ivr':
          return this.importIVR(content);
        case 'n8n':
          return this.importN8N(content);
        case 'zapier':
          return this.importZapier(content);
        case 'make':
          return this.importMake(content);
        default:
          return {
            success: false,
            error: `Formato ${detectedFormat} não implementado`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao importar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa JSON (formato nativo)
   */
  private static importJSON(content: string): ImportResult {
    try {
      const flowData: FlowData = JSON.parse(content);
      
      // Validar estrutura
      if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
        return { success: false, error: 'Estrutura inválida: falta propriedade "nodes"' };
      }
      
      if (!flowData.edges || !Array.isArray(flowData.edges)) {
        return { success: false, error: 'Estrutura inválida: falta propriedade "edges"' };
      }

      return { success: true, flowData };
    } catch (error) {
      return {
        success: false,
        error: `JSON inválido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa formato IVR (URA tradicional - base64-encoded JSON)
   */
  private static importIVR(content: string): ImportResult {
    try {
      // Tentar decodificar base64 primeiro
      let ivr;
      try {
        const decoded = atob(content.trim());
        ivr = JSON.parse(decoded);
      } catch {
        // Se falhar, tentar parsear diretamente como JSON
        ivr = JSON.parse(content);
      }
      
      // Parsear options que pode estar como string JSON
      if (typeof ivr.options === 'string') {
        ivr.options = JSON.parse(ivr.options);
      }
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];
      let nodeIdCounter = 1;
      let edgeIdCounter = 1;

      // Criar nó de trigger inicial
      const triggerId = `node-${nodeIdCounter++}`;
      nodes.push({
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Início',
          type: 'message_received',
          config: {},
        } as any,
      });

      // Processar nós do IVR
      if (ivr.options && Array.isArray(ivr.options)) {
        const typeMap: Record<number, string> = {
          0: 'message',
          5: 'transfer',
          8: 'condition',
          1: 'trigger',
        };

        ivr.options.forEach((opt: any) => {
          const nodeType = typeMap[opt.type] || 'message';
          
          nodes.push({
            id: opt.id,
            type: nodeType as any,
            position: { x: opt.x || 0, y: opt.y || 0 },
            data: {
              label: opt.config?.text?.substring(0, 30) || nodeType,
              ...(opt.config || {}),
            },
          });

          // Criar edges baseado em nextElementId
          if (opt.config?.nextElementId) {
            edges.push({
              id: `edge-${edgeIdCounter++}`,
              source: opt.id,
              target: opt.config.nextElementId,
            });
          }

          // Para condições de horário, criar edges para cada opção
          if (opt.config?.options) {
            opt.config.options.forEach((condOption: any) => {
              if (condOption.nextElementId) {
                edges.push({
                  id: `edge-${edgeIdCounter++}`,
                  source: opt.id,
                  target: condOption.nextElementId,
                });
              }
            });
          }
        });
      }

      return {
        success: true,
        flowData: { nodes, edges },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao importar IVR: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa formato N8N
   */
  private static importN8N(content: string): ImportResult {
    try {
      const n8nFlow = JSON.parse(content);
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];

      // Mapear nós do N8N para nosso formato
      n8nFlow.nodes?.forEach((n8nNode: any, idx: number) => {
        const nodeId = `node-${idx + 1}`;
        let nodeType = 'message';
        let label = n8nNode.name || n8nNode.type;

        // Mapear tipos do N8N para nossos tipos
        if (n8nNode.type === 'n8n-nodes-base.webhook' || n8nNode.type === 'n8n-nodes-base.trigger') {
          nodeType = 'trigger';
        } else if (n8nNode.type === 'n8n-nodes-base.if') {
          nodeType = 'condition';
        } else if (n8nNode.type === 'n8n-nodes-base.httpRequest') {
          nodeType = 'http_request';
        } else if (n8nNode.type === 'n8n-nodes-base.wait') {
          nodeType = 'wait';
        }

        nodes.push({
          id: nodeId,
          type: nodeType as any,
          position: {
            x: n8nNode.position?.[0] || idx * 200,
            y: n8nNode.position?.[1] || 100,
          },
          data: {
            label,
            ...n8nNode.parameters,
          },
        });
      });

      // Mapear conexões
      if (n8nFlow.connections) {
        Object.entries(n8nFlow.connections).forEach(([sourceNode, targets]: [string, any]) => {
          const sourceIdx = n8nFlow.nodes.findIndex((n: any) => n.name === sourceNode);
          if (sourceIdx === -1) return;

          Object.values(targets).forEach((targetList: any) => {
            targetList.forEach((target: any) => {
              const targetIdx = n8nFlow.nodes.findIndex((n: any) => n.name === target.node);
              if (targetIdx === -1) return;

              edges.push({
                id: `edge-${sourceIdx + 1}-${targetIdx + 1}`,
                source: `node-${sourceIdx + 1}`,
                target: `node-${targetIdx + 1}`,
              });
            });
          });
        });
      }

      return {
        success: true,
        flowData: { nodes, edges },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao importar N8N: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa formato Zapier
   */
  private static importZapier(content: string): ImportResult {
    try {
      const zapierZap = JSON.parse(content);
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];
      let nodeIdCounter = 1;
      let edgeIdCounter = 1;

      // Criar trigger
      if (zapierZap.trigger) {
        const triggerId = `node-${nodeIdCounter++}`;
        nodes.push({
          id: triggerId,
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: zapierZap.trigger.title || 'Trigger',
            type: 'message_received',
            config: zapierZap.trigger,
          } as any,
        });
      }

      // Criar steps (ações)
      zapierZap.steps?.forEach((step: any, idx: number) => {
        const nodeId = `node-${nodeIdCounter++}`;
        const prevNodeId = `node-${nodeIdCounter - 2}`;

        nodes.push({
          id: nodeId,
          type: step.type === 'filter' ? 'condition' : 'message',
          position: { x: 100, y: 100 + ((idx + 1) * 150) },
          data: {
            label: step.title || `Step ${idx + 1}`,
            ...step,
          },
        });

        edges.push({
          id: `edge-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
        });
      });

      return {
        success: true,
        flowData: { nodes, edges },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao importar Zapier: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa formato Make (Integromat)
   */
  private static importMake(content: string): ImportResult {
    try {
      const makeScenario = JSON.parse(content);
      const nodes: FlowNode[] = [];
      const edges: FlowEdge[] = [];

      makeScenario.modules?.forEach((module: any, idx: number) => {
        const nodeId = `node-${idx + 1}`;
        
        nodes.push({
          id: nodeId,
          type: module.module.includes('trigger') ? 'trigger' : 'message',
          position: {
            x: module.pos?.x || idx * 200,
            y: module.pos?.y || 100,
          },
          data: {
            label: module.name || module.module,
            ...module.parameters,
          },
        });

        // Conectar com módulo anterior
        if (idx > 0) {
          edges.push({
            id: `edge-${idx}-${idx + 1}`,
            source: `node-${idx}`,
            target: nodeId,
          });
        }
      });

      return {
        success: true,
        flowData: { nodes, edges },
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao importar Make: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }
}
