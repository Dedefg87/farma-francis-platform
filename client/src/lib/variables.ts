/**
 * Sistema de Variáveis de Contexto
 * Suporta substituição de variáveis em templates usando sintaxe {{variavel.propriedade}}
 */

export interface IContextVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  example: string;
  category: 'cliente' | 'ticket' | 'mensagem' | 'agente' | 'sistema';
  properties?: IContextVariable[];
}

/**
 * Catálogo de variáveis disponíveis
 */
export const CONTEXT_VARIABLES: IContextVariable[] = [
  // Variáveis de Cliente
  {
    name: 'cliente.nome',
    description: 'Nome completo do cliente',
    type: 'string',
    example: 'João Silva',
    category: 'cliente',
  },
  {
    name: 'cliente.email',
    description: 'Email do cliente',
    type: 'string',
    example: 'joao@email.com',
    category: 'cliente',
  },
  {
    name: 'cliente.telefone',
    description: 'Telefone do cliente',
    type: 'string',
    example: '+55 11 98765-4321',
    category: 'cliente',
  },
  {
    name: 'cliente.cidade',
    description: 'Cidade do cliente',
    type: 'string',
    example: 'São Paulo',
    category: 'cliente',
  },
  {
    name: 'cliente.estado',
    description: 'Estado do cliente',
    type: 'string',
    example: 'SP',
    category: 'cliente',
  },
  {
    name: 'cliente.cpf',
    description: 'CPF do cliente',
    type: 'string',
    example: '123.456.789-00',
    category: 'cliente',
  },
  {
    name: 'cliente.data_cadastro',
    description: 'Data de cadastro do cliente',
    type: 'date',
    example: '2024-01-15',
    category: 'cliente',
  },
  
  // Variáveis de Ticket
  {
    name: 'ticket.id',
    description: 'ID único do ticket',
    type: 'number',
    example: '12345',
    category: 'ticket',
  },
  {
    name: 'ticket.assunto',
    description: 'Assunto do ticket',
    type: 'string',
    example: 'Dúvida sobre medicamento',
    category: 'ticket',
  },
  {
    name: 'ticket.status',
    description: 'Status atual do ticket',
    type: 'string',
    example: 'Em andamento',
    category: 'ticket',
  },
  {
    name: 'ticket.prioridade',
    description: 'Prioridade do ticket',
    type: 'string',
    example: 'Alta',
    category: 'ticket',
  },
  {
    name: 'ticket.data_abertura',
    description: 'Data de abertura do ticket',
    type: 'date',
    example: '2024-03-20 14:30',
    category: 'ticket',
  },
  
  // Variáveis de Mensagem
  {
    name: 'mensagem.texto',
    description: 'Conteúdo da mensagem',
    type: 'string',
    example: 'Olá, preciso de ajuda',
    category: 'mensagem',
  },
  {
    name: 'mensagem.data',
    description: 'Data/hora da mensagem',
    type: 'date',
    example: '2024-03-20 14:35',
    category: 'mensagem',
  },
  {
    name: 'mensagem.canal',
    description: 'Canal de origem da mensagem',
    type: 'string',
    example: 'WhatsApp',
    category: 'mensagem',
  },
  
  // Variáveis de Agente
  {
    name: 'agente.nome',
    description: 'Nome do agente atribuído',
    type: 'string',
    example: 'Maria Santos',
    category: 'agente',
  },
  {
    name: 'agente.email',
    description: 'Email do agente',
    type: 'string',
    example: 'maria@farmafrancis.com',
    category: 'agente',
  },
  {
    name: 'agente.departamento',
    description: 'Departamento do agente',
    type: 'string',
    example: 'Atendimento',
    category: 'agente',
  },
  
  // Variáveis de Sistema
  {
    name: 'sistema.data_atual',
    description: 'Data atual do sistema',
    type: 'date',
    example: '2024-03-20',
    category: 'sistema',
  },
  {
    name: 'sistema.hora_atual',
    description: 'Hora atual do sistema',
    type: 'string',
    example: '14:35',
    category: 'sistema',
  },
  {
    name: 'sistema.dia_semana',
    description: 'Dia da semana',
    type: 'string',
    example: 'Quarta-feira',
    category: 'sistema',
  },
];

/**
 * Funções helper disponíveis para transformação de variáveis
 */
export const HELPER_FUNCTIONS = {
  uppercase: (value: string) => value.toUpperCase(),
  lowercase: (value: string) => value.toLowerCase(),
  capitalize: (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  trim: (value: string) => value.trim(),
  substring: (value: string, start: number, end?: number) => value.substring(start, end),
  replace: (value: string, search: string, replace: string) => value.replace(search, replace),
  date_format: (value: Date | string, format: string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    // Formato simples: DD/MM/YYYY HH:MM
    if (format === 'DD/MM/YYYY') {
      return date.toLocaleDateString('pt-BR');
    }
    if (format === 'DD/MM/YYYY HH:MM') {
      return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleString('pt-BR');
  },
};

/**
 * Substitui variáveis em um template
 * Suporta:
 * - Variáveis simples: {{cliente.nome}}
 * - Funções helper: {{cliente.nome|uppercase}}
 * - Variáveis aninhadas: {{cliente.endereco.cidade}}
 */
export function replaceVariables(template: string, context: Record<string, any>): string {
  // Regex para encontrar {{variavel}} ou {{variavel|funcao}}
  const regex = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;
  
  return template.replace(regex, (match, varPath, helperName) => {
    // Navegar pelo caminho da variável (ex: cliente.endereco.cidade)
    const parts = varPath.trim().split('.');
    let value: unknown = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Variável não encontrada, retornar placeholder original
        return match;
      }
    }
    
    // Aplicar função helper se especificada
    if (helperName && helperName.trim() in HELPER_FUNCTIONS) {
      const helper = HELPER_FUNCTIONS[helperName.trim() as keyof typeof HELPER_FUNCTIONS];
      try {
        value = helper(value);
      } catch (error) {
        console.error(`Erro ao aplicar helper ${helperName}:`, error);
      }
    }
    
    return String(value);
  });
}

/**
 * Extrai todas as variáveis usadas em um template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([^}|]+)(?:\|[^}]+)?\}\}/g;
  const matches = template.matchAll(regex);
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(match[1].trim());
  }
  
  return Array.from(variables);
}

/**
 * Valida se todas as variáveis usadas existem no catálogo
 */
export function validateVariables(template: string): { valid: boolean; missing: string[] } {
  const usedVars = extractVariables(template);
  const availableVars = CONTEXT_VARIABLES.map(v => v.name);
  const missing = usedVars.filter(v => !availableVars.includes(v));
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Gera sugestões de autocomplete para variáveis
 */
export function getVariableSuggestions(prefix: string): IContextVariable[] {
  const lowerPrefix = prefix.toLowerCase();
  return CONTEXT_VARIABLES.filter(v => 
    v.name.toLowerCase().includes(lowerPrefix) ||
    v.description.toLowerCase().includes(lowerPrefix)
  );
}
