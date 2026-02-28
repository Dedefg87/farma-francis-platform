import { Node, Edge } from "reactflow";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NodeValidation {
  nodeId: string;
  nodeLabel: string;
  errors: string[];
  warnings: string[];
}

export function useFlowValidation() {
  // Validar um único nó
  const validateNode = (node: Node): NodeValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar se tem label
    if (!node.data?.label) {
      errors.push("Nó sem label");
    }

    // Verificar configurações específicas por tipo
    const config = node.data?.config;

    if (node.data?.label?.includes("Mensagem") || node.data?.label?.includes("💬")) {
      if (!config?.message) {
        errors.push("Nó de mensagem sem texto configurado");
      }
    }

    if (node.data?.label?.includes("Condição") || node.data?.label?.includes("❓")) {
      if (!config?.condition) {
        errors.push("Nó de condição sem regra definida");
      }
    }

    if (node.data?.label?.includes("API") || node.data?.label?.includes("🔗")) {
      if (!config?.endpoint) {
        errors.push("Nó de API sem endpoint configurado");
      }
    }

    if (node.data?.label?.includes("Aguardar") || node.data?.label?.includes("⏳")) {
      if (!config?.timeout) {
        warnings.push("Nó de espera sem timeout definido (usará padrão)");
      }
    }

    return {
      nodeId: node.id,
      nodeLabel: node.data?.label || "Sem label",
      errors,
      warnings,
    };
  };

  // Validar conexões do fluxo
  const validateConnections = (nodes: Node[], edges: Edge[]): string[] => {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    // Verificar se todas as conexões apontam para nós existentes
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Conexão ${edge.id} aponta para nó inexistente: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Conexão ${edge.id} vem de nó inexistente: ${edge.target}`);
      }
    });

    // Verificar nós órfãos (sem conexões)
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        // Ignorar nó de trigger (geralmente é o inicial)
        if (!node.data?.label?.toLowerCase().includes("trigger") && 
            !node.data?.label?.includes("📩") &&
            !node.data?.label?.includes("Novo")) {
          // Este é um warning, não erro
        }
      }
    });

    return errors;
  };

  // Validar fluxo completo
  const validateFlow = (nodes: Node[], edges: Edge[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar cada nó
    nodes.forEach(node => {
      const nodeValidation = validateNode(node);
      errors.push(...nodeValidation.errors.map(e => `${nodeValidation.nodeLabel}: ${e}`));
      warnings.push(...nodeValidation.warnings.map(w => `${nodeValidation.nodeLabel}: ${w}`));
    });

    // Validar conexões
    const connectionErrors = validateConnections(nodes, edges);
    errors.push(...connectionErrors);

    // Verificar se tem pelo menos um nó
    if (nodes.length === 0) {
      warnings.push("Fluxo vazio - adicione nós para criar o fluxo");
    }

    // Verificar se tem nó inicial (trigger)
    const hasTrigger = nodes.some(node => 
      node.data?.label?.toLowerCase().includes("trigger") ||
      node.data?.label?.includes("📩") ||
      node.data?.label?.includes("Novo") ||
      node.data?.config?.event
    );

    if (nodes.length > 0 && !hasTrigger) {
      warnings.push("Fluxo sem nó inicial (trigger) - considere adicionar um gatilho");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // Validar antes de salvar
  const validateBeforeSave = (nodes: Node[], edges: Edge[]): { canSave: boolean; message: string } => {
    const result = validateFlow(nodes, edges);

    if (result.errors.length > 0) {
      return {
        canSave: false,
        message: `Erros encontrados:\n${result.errors.map(e => `• ${e}`).join('\n')}`,
      };
    }

    if (result.warnings.length > 0) {
      return {
        canSave: true,
        message: `Avisos:\n${result.warnings.map(w => `• ${w}`).join('\n')}`,
      };
    }

    return {
      canSave: true,
      message: "Fluxo válido!",
    };
  };

  return {
    validateNode,
    validateConnections,
    validateFlow,
    validateBeforeSave,
  };
}
