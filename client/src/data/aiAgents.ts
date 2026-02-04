import { IAgentDefinition } from '@/types/aiAgent';

/**
 * Configurações dos provedores de IA disponíveis
 * 
 * Para adicionar um novo modelo, basta adicionar um objeto a este array
 * seguindo a interface IAgentDefinition.
 */
export const AI_AGENTS: IAgentDefinition[] = [
  {
    id: 'openai-gpt4o',
    name: 'GPT-4o',
    description: 'Modelo mais avançado da OpenAI com capacidades multimodais',
    icon: '🤖',
    color: '#10a37f',
    category: 'chat',
    available: true,
    pricing: {
      inputTokens: 5.00,
      outputTokens: 15.00,
    },
    parameters: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        defaultValue: 0.7,
        description: 'Controla a aleatoriedade das respostas (0 = determinístico, 1 = criativo)',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
      {
        key: 'max_tokens',
        label: 'Max Tokens',
        type: 'number',
        defaultValue: 1000,
        description: 'Número máximo de tokens na resposta',
        min: 1,
        max: 4096,
        required: false,
      },
      {
        key: 'top_p',
        label: 'Top P',
        type: 'slider',
        defaultValue: 1,
        description: 'Nucleus sampling - alternativa à temperature',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
      {
        key: 'frequency_penalty',
        label: 'Frequency Penalty',
        type: 'slider',
        defaultValue: 0,
        description: 'Penaliza tokens repetidos',
        min: 0,
        max: 2,
        step: 0.1,
        required: false,
      },
      {
        key: 'presence_penalty',
        label: 'Presence Penalty',
        type: 'slider',
        defaultValue: 0,
        description: 'Penaliza tokens já mencionados',
        min: 0,
        max: 2,
        step: 0.1,
        required: false,
      },
    ],
  },
  {
    id: 'anthropic-claude35',
    name: 'Claude 3.5 Sonnet',
    description: 'Modelo equilibrado da Anthropic com excelente raciocínio',
    icon: '🧠',
    color: '#d97757',
    category: 'chat',
    available: true,
    pricing: {
      inputTokens: 3.00,
      outputTokens: 15.00,
    },
    parameters: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        defaultValue: 1.0,
        description: 'Controla a aleatoriedade das respostas',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
      {
        key: 'max_tokens',
        label: 'Max Tokens',
        type: 'number',
        defaultValue: 1024,
        description: 'Número máximo de tokens na resposta',
        min: 1,
        max: 4096,
        required: true,
      },
      {
        key: 'top_k',
        label: 'Top K',
        type: 'number',
        defaultValue: 40,
        description: 'Limita a amostragem aos K tokens mais prováveis',
        min: 1,
        max: 500,
        required: false,
      },
      {
        key: 'top_p',
        label: 'Top P',
        type: 'slider',
        defaultValue: 0.9,
        description: 'Nucleus sampling',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
    ],
  },
  {
    id: 'google-gemini15',
    name: 'Gemini 1.5 Pro',
    description: 'Modelo do Google com contexto de 1M tokens',
    icon: '✨',
    color: '#4285f4',
    category: 'chat',
    available: true,
    pricing: {
      inputTokens: 1.25,
      outputTokens: 5.00,
    },
    parameters: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        defaultValue: 0.9,
        description: 'Controla a criatividade das respostas',
        min: 0,
        max: 2,
        step: 0.1,
        required: false,
      },
      {
        key: 'max_output_tokens',
        label: 'Max Output Tokens',
        type: 'number',
        defaultValue: 2048,
        description: 'Número máximo de tokens na resposta',
        min: 1,
        max: 8192,
        required: false,
      },
      {
        key: 'top_k',
        label: 'Top K',
        type: 'number',
        defaultValue: 40,
        description: 'Amostragem top-k',
        min: 1,
        max: 100,
        required: false,
      },
      {
        key: 'top_p',
        label: 'Top P',
        type: 'slider',
        defaultValue: 0.95,
        description: 'Nucleus sampling',
        min: 0,
        max: 1,
        step: 0.05,
        required: false,
      },
    ],
  },
  {
    id: 'meta-llama3',
    name: 'Llama 3 70B',
    description: 'Modelo open-source da Meta com 70B parâmetros',
    icon: '🦙',
    color: '#0668e1',
    category: 'chat',
    available: true,
    pricing: {
      inputTokens: 0.90,
      outputTokens: 0.90,
    },
    parameters: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        defaultValue: 0.7,
        description: 'Controla a aleatoriedade',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
      {
        key: 'max_tokens',
        label: 'Max Tokens',
        type: 'number',
        defaultValue: 512,
        description: 'Número máximo de tokens',
        min: 1,
        max: 2048,
        required: false,
      },
      {
        key: 'top_p',
        label: 'Top P',
        type: 'slider',
        defaultValue: 0.9,
        description: 'Nucleus sampling',
        min: 0,
        max: 1,
        step: 0.1,
        required: false,
      },
      {
        key: 'repetition_penalty',
        label: 'Repetition Penalty',
        type: 'slider',
        defaultValue: 1.1,
        description: 'Penaliza repetições',
        min: 1,
        max: 2,
        step: 0.1,
        required: false,
      },
    ],
  },
];

/**
 * Busca um agente por ID
 */
export function getAgentById(id: string): IAgentDefinition | undefined {
  return AI_AGENTS.find(agent => agent.id === id);
}

/**
 * Retorna agentes por categoria
 */
export function getAgentsByCategory(category: IAgentDefinition['category']): IAgentDefinition[] {
  return AI_AGENTS.filter(agent => agent.category === category && agent.available);
}
