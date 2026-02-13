/**
 * AI Agent Types and Interfaces
 *
 * Arquitetura extensível para suportar múltiplos provedores de IA
 * no editor de fluxo de automação.
 */

/**
 * Tipos de parâmetros suportados no formulário dinâmico
 */
export type ParameterType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "slider";

/**
 * Definição de um parâmetro configurável do agente
 */
export interface IAgentParameter {
  /** Identificador único do parâmetro */
  key: string;

  /** Nome exibido no formulário */
  label: string;

  /** Tipo do input a ser renderizado */
  type: ParameterType;

  /** Valor padrão */
  defaultValue: string | number | boolean;

  /** Descrição/tooltip do parâmetro */
  description?: string;

  /** Se o parâmetro é obrigatório */
  required?: boolean;

  /** Opções para tipo 'select' */
  options?: Array<{ value: string; label: string }>;

  /** Valor mínimo (para number/slider) */
  min?: number;

  /** Valor máximo (para number/slider) */
  max?: number;

  /** Incremento (para slider) */
  step?: number;

  /** Placeholder para inputs de texto */
  placeholder?: string;
}

/**
 * Definição completa de um provedor de IA
 */
export interface IAgentDefinition {
  /** Identificador único do provedor */
  id: string;

  /** Nome exibido */
  name: string;

  /** Descrição do modelo */
  description: string;

  /** URL do ícone/logo do provedor */
  icon: string;

  /** Cor tema do provedor (para UI) */
  color: string;

  /** Categoria do modelo */
  category: "chat" | "completion" | "embedding" | "vision";

  /** Parâmetros configuráveis */
  parameters: IAgentParameter[];

  /** Se o modelo está disponível */
  available: boolean;

  // Runtime metadata used by settings panel
  provider?: string;
  model?: string;

  /** Informações de custo (opcional) */
  pricing?: {
    inputTokens: number; // custo por 1M tokens
    outputTokens: number; // custo por 1M tokens
  };
}

/**
 * Dados armazenados no nó do fluxo
 */
export interface INodeData {
  /** ID do agente selecionado */
  agentId: string | null;

  /** Configurações do agente (key-value) */
  configuration: Record<string, any>;

  /** Prompt do usuário (se aplicável) */
  prompt?: string;

  /** Variáveis de contexto */
  variables?: Record<string, string>;

  /** Nome customizado do nó */
  nodeName?: string;
}

/**
 * Estado do nó no canvas
 */
export interface IAINodeState {
  /** Dados do nó */
  data: INodeData;

  /** Se o nó está selecionado */
  selected: boolean;

  /** Se o painel de propriedades está aberto */
  inspectorOpen: boolean;
}
