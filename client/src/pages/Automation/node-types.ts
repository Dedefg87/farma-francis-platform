import { 
  MessageSquare, Webhook, Clock, GitBranch, Filter, GitMerge, Repeat, 
  Send, Mail, Smartphone, Bell, Bot, Brain, GitCompare, 
  Database, Globe, Code, ArrowRight, AlertTriangle, 
  Pause, UserCheck, CreditCard, Package, Phone, Instagram
} from "lucide-react";

// ==================== TYPES ====================

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  category: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  config?: ConfigField[];
}

export interface NodePort {
  id: string;
  label: string;
  type: 'data' | 'trigger' | 'error' | 'success';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'prompt' | 'password' | 'file';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
  multiline?: boolean;
}

// ==================== CATEGORIES ====================

export const CATEGORIES = [
  { id: 'triggers', label: 'Gatilhos', color: 'bg-green-100 text-green-800', icon: GitBranch },
  { id: 'logic', label: 'Condições/Lógica', color: 'bg-yellow-100 text-yellow-800', icon: Filter },
  { id: 'messages', label: 'Mensagens/Comunicação', color: 'bg-blue-100 text-blue-800', icon: Send },
  { id: 'ai', label: 'IA/Inteligência', color: 'bg-purple-100 text-purple-800', icon: Brain },
  { id: 'actions', label: 'Ações/Automação', color: 'bg-teal-100 text-teal-800', icon: Code },
  { id: 'wait', label: 'Aguardar/Tempo', color: 'bg-gray-100 text-gray-800', icon: Pause },
  { id: 'integrations', label: 'API/Integrações', color: 'bg-emerald-100 text-emerald-800', icon: Globe },
  { id: 'flow', label: 'Transferir/Fluxo', color: 'bg-orange-100 text-orange-800', icon: ArrowRight },
  { id: 'pharmacy', label: 'Farmácia-Específico', color: 'bg-blue-100 text-blue-800', icon: Package },
];

// ==================== NODE DEFINITIONS ====================

export const NODE_TYPES: WorkflowNode[] = [
  // ===== TRIGGERS (Verde) =====
  {
    id: 'whatsapp-incoming',
    type: 'trigger',
    label: '📱 WhatsApp Incoming',
    description: 'Recebe mensagens de WhatsApp Business API',
    icon: Phone,
    color: '#25D366',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Mensagem recebida', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'string', placeholder: 'ID do número verificado' },
      { key: 'verifyToken', label: 'Verify Token', type: 'password', placeholder: 'Token de verificação' },
    ]
  },
  {
    id: 'instagram-dm',
    type: 'trigger',
    label: '📸 Instagram DM',
    description: 'Recebe DMs do Instagram',
    icon: Instagram,
    color: '#E4405F',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'DM recebida', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'verifyToken', label: 'Verify Token', type: 'password' },
    ]
  },
  {
    id: 'webhook-trigger',
    type: 'trigger',
    label: '🔗 API Webhook',
    description: 'Recebe chamadas HTTP POST/GET',
    icon: Globe,
    color: '#338AF3',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Payload recebido', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'path', label: 'Caminho', type: 'string', placeholder: '/webhook/meu-endpoint', defaultValue: '/webhook/automation' },
      { key: 'methods', label: 'Métodos', type: 'select', options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'ALL', label: 'Todos' },
      ]}
    ]
  },
  {
    id: 'schedule-trigger',
    type: 'trigger',
    label: '⏰ Schedule (CRON)',
    description: 'Executa em horários agendados',
    icon: Clock,
    color: '#338AF3',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Execução agendada', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'expression', label: 'Expressão CRON', type: 'string', placeholder: '0 * * * *' },
      { key: 'timezone', label: 'Timezone', type: 'select', options: [
        { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
        { value: 'UTC', label: 'UTC' },
      ], defaultValue: 'America/Sao_Paulo' }
    ]
  },

  // ===== LOGIC (Amarelo) =====
  {
    id: 'if-else',
    type: 'logic',
    label: '🔀 If/Else',
    description: 'Condição verdadeiro/falso',
    icon: GitBranch,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'true', label: 'Verdadeiro', type: 'success' },
      { id: 'false', label: 'Falso', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'condition', label: 'Condição', type: 'json', placeholder: 'Ex: {{input.message}} contains "urgente"' },
    ]
  },
  {
    id: 'switch',
    type: 'logic',
    label: '🔀 Switch (Multi-ramificação)',
    description: 'Múltiplos casos de saída',
    icon: GitCompare,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'case1', label: 'Caso 1', type: 'success' },
      { id: 'case2', label: 'Caso 2', type: 'success' },
      { id: 'default', label: 'Padrão', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'cases', label: 'Casos (JSON)', type: 'json', placeholder: '[{"key": "value", "output": "case1"}]' },
    ]
  },
  {
    id: 'filter',
    type: 'logic',
    label: '🔍 Filter (Regex/Dados)',
    description: 'Filtra dados por regex ou condição',
    icon: Filter,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'match', label: 'Filtrado', type: 'success' },
      { id: 'no-match', label: 'Sem match', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'pattern', label: 'Padrão (Regex)', type: 'string', placeholder: 'Ex: \\d{4,5}-\\d{4}' },
      { key: 'flags', label: 'Flags', type: 'string', placeholder: 'gi', defaultValue: 'gi' }
    ]
  },

  // ===== MESSAGES (Azul) =====
  {
    id: 'whatsapp-send',
    type: 'action',
    label: '📱 WhatsApp Send',
    description: 'Envia mensagem via WhatsApp Business',
    icon: Phone,
    color: '#25D366',
    category: 'messages',
    inputs: [
      { id: 'in', label: 'Dados do contato', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Enviado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'to', label: 'Para (Número)', type: 'string', placeholder: '{{contact.phone}} ou 5511999999999' },
      { key: 'body', label: 'Mensagem', type: 'prompt', placeholder: 'Olá {{contact.name}}, sua receita...', multiline: true },
      { key: 'mediaUrl', label: 'Mídia (URL)', type: 'string', placeholder: 'https://exemplo.com/imagem.jpg' },
    ]
  },
  {
    id: 'email-send',
    type: 'action',
    label: '📧 Email (Gmail/Outlook)',
    description: 'Envia email via SMTP',
    icon: Mail,
    color: '#EA4335',
    category: 'messages',
    inputs: [
      { id: 'in', label: 'Dados do email', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Enviado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'to', label: 'Para', type: 'string', placeholder: 'cliente@exemplo.com' },
      { key: 'subject', label: 'Assunto', type: 'string', placeholder: 'Sua compra na Farma Francis' },
      { key: 'body', label: 'Corpo (HTML)', type: 'prompt', multiline: true },
    ]
  },

  // ===== AI (Roxo/Rosa) =====
  {
    id: 'openai-gpt',
    type: 'ai',
    label: '🤖 OpenAI GPT',
    description: 'Executa modelo GPT (4o, 3.5, o1)',
    icon: Brain,
    color: '#10A37F',
    category: 'ai',
    inputs: [
      { id: 'in', label: 'Prompt/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'apiKey', label: 'API Key (OpenAI)', type: 'password', placeholder: 'sk-...' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'o1-preview', label: 'o1 Preview' },
      ], defaultValue: 'gpt-4o' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'prompt', multiline: true, placeholder: 'Você é um assistente da farmácia...' },
      { key: 'userPrompt', label: 'User Prompt', type: 'prompt', multiline: true, placeholder: 'Analise: {{input.message}}' },
      { key: 'temperature', label: 'Temperatura (0-2)', type: 'number', defaultValue: 0.7 },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', defaultValue: 2048 },
    ]
  },
  {
    id: 'claude-anthropic',
    type: 'ai',
    label: '🤖 Claude (Anthropic)',
    description: 'Executa modelo Claude (3.5 Sonnet, Opus)',
    icon: Brain,
    color: '#D4A574',
    category: 'ai',
    inputs: [
      { id: 'in', label: 'Prompt/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'apiKey', label: 'API Key (Anthropic)', type: 'password' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      ], defaultValue: 'claude-3-5-sonnet-20241022' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'prompt', multiline: true },
      { key: 'userPrompt', label: 'User Prompt', type: 'prompt', multiline: true },
    ]
  },

  // ===== ACTIONS (Verde-Azulado) =====
  {
    id: 'create-task',
    type: 'action',
    label: '✅ Create Task',
    description: 'Cria tarefa no sistema (ex: farmacêutico revisa)',
    icon: Code,
    color: '#14B8A6',
    category: 'actions',
    inputs: [
      { id: 'in', label: 'Dados da tarefa', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Criado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'title', label: 'Título', type: 'string', placeholder: 'Revisar receita de {{customer.name}}' },
      { key: 'description', label: 'Descrição', type: 'prompt', multiline: true },
      { key: 'assignTo', label: 'Atribuir para', type: 'string', placeholder: 'ID do usuário ou "pharmacist"' },
      { key: 'dueInMinutes', label: 'Prazo (minutos)', type: 'number', defaultValue: 60 },
    ]
  },
  {
    id: 'http-request',
    type: 'action',
    label: '🌐 HTTP Request',
    description: 'Faz requisição GET/POST/PUT/DELETE',
    icon: Globe,
    color: '#338AF3',
    category: 'integrations',
    inputs: [
      { id: 'in', label: 'Dados para requisição', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'method', label: 'Método', type: 'select', options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
      ], defaultValue: 'POST' },
      { key: 'url', label: 'URL', type: 'string', placeholder: 'https://api.exemplo.com/endpoint' },
      { key: 'headers', label: 'Headers (JSON)', type: 'json', placeholder: '{"Authorization": "Bearer {{token}}"}' },
      { key: 'body', label: 'Body (JSON)', type: 'json', placeholder: '{"key": "value"}' },
      { key: 'authType', label: 'Auth', type: 'select', options: [
        { value: 'none', label: 'Nenhum' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'basic', label: 'Basic Auth' },
      ], defaultValue: 'none' }
    ]
  },

  // ===== WAIT (Cinza) =====
  {
    id: 'wait',
    type: 'wait',
    label: '⏳ Wait (Aguardar)',
    description: 'Aguarda X segundos/minutos',
    icon: Pause,
    color: '#6B7280',
    category: 'wait',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Continuar', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'duration', label: 'Duração', type: 'number', defaultValue: 5 },
      { key: 'unit', label: 'Unidade', type: 'select', options: [
        { value: 'seconds', label: 'Segundos' },
        { value: 'minutes', label: 'Minutos' },
      ], defaultValue: 'seconds' }
    ]
  },
  {
    id: 'human-approval',
    type: 'wait',
    label: '✋ Human Approval',
    description: 'Aguarda aprovação humana (farmacêutico)',
    icon: UserCheck,
    color: '#6B7280',
    category: 'wait',
    inputs: [
      { id: 'in', label: 'Dados para revisão', type: 'data' }
    ],
    outputs: [
      { key: 'approved', label: 'Aprovado', type: 'success' },
      { key: 'rejected', label: 'Rejeitado', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'assignTo', label: 'Atribuir para', type: 'string', placeholder: 'ID do farmacêutico' },
      { key: 'timeoutMinutes', label: 'Timeout (minutos)', type: 'number', defaultValue: 1440 },
      { key: 'message', label: 'Mensagem para revisor', type: 'prompt', multiline: true },
    ]
  },

  // ===== PHARMACY-SPECIFIC (Azul-Marinho) =====
  {
    id: 'check-prescription',
    type: 'pharmacy',
    label: '💊 Check Receita',
    description: 'Analisa receita médica (PDF/imagem) com IA',
    icon: Package,
    color: '#1E40AF',
    category: 'pharmacy',
    inputs: [
      { id: 'in', label: 'Dados da receita', type: 'data' }
    ],
    outputs: [
      { id: 'valid', label: 'Válida', type: 'success' },
      { id: 'invalid', label: 'Inválida', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'fileUrl', label: 'URL do Arquivo (PDF/Imagem)', type: 'string', placeholder: '{{input.fileUrl}}' },
      { key: 'aiModel', label: 'Modelo IA', type: 'select', options: [
        { value: 'gpt-4o-vision-preview', label: 'GPT-4o Vision' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      ], defaultValue: 'gpt-4o-vision-preview' },
      { key: 'validationRules', label: 'Regras de Validação (JSON)', type: 'json' },
    ]
  },
  {
    id: 'pix-confirmation',
    type: 'pharmacy',
    label: '💰 Pix Confirmation',
    description: 'Verifica pagamento Pix (webhook/polling)',
    icon: CreditCard,
    color: '#1E40AF',
    category: 'pharmacy',
    inputs: [
      { id: 'in', label: 'Dados da transação', type: 'data' }
    ],
    outputs: [
      { id: 'confirmed', label: 'Confirmado', type: 'success' },
      { id: 'pending', label: 'Pendente', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'pixKey', label: 'Chave Pix', type: 'string', placeholder: 'exemplo@banco.com' },
      { key: 'expectedAmount', label: 'Valor Esperado (R$)', type: 'number' },
      { key: 'webhookUrl', label: 'Webhook de retorno', type: 'string' },
    ]
  },
  {
    id: 'attendance-create',
    type: 'pharmacy',
    label: '📞 Attendance Create',
    description: 'Cria atendimento no CRM (/api/atendimentos)',
    icon: Phone,
    color: '#1E40AF',
    category: 'pharmacy',
    inputs: [
      { id: 'in', label: 'Dados do cliente', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Criado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'customerId', label: 'Customer ID', type: 'string', placeholder: '{{customer.id}}' },
      { key: 'channel', label: 'Canal', type: 'select', options: [
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'chat', label: 'Chat Online' },
      ], defaultValue: 'whatsapp' },
      { key: 'priority', label: 'Prioridade', type: 'select', options: [
        { value: 'normal', label: 'Normal' },
        { value: 'urgent', label: 'Urgente' },
      ], defaultValue: 'normal' }
    ]
  },
];

// ==================== HELPER FUNCTIONS ====================

export const getNodeType = (type: string): WorkflowNode | undefined => {
  return NODE_TYPES.find(n => n.id === type);
};

export const getNodesByCategory = (categoryId: string): WorkflowNode[] => {
  return NODE_TYPES.filter(n => n.category === categoryId);
};

export const getAllCategories = () => {
  return CATEGORIES;
};
