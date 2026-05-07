import { 
  MessageSquare, Webhook, Clock, GitBranch, Filter, GitMerge, Repeat, 
  Send, Mail, Smartphone, Bell, Bot, Brain, GitCompare, 
  Database, Globe, Code, ArrowRight, AlertTriangle, 
  Pause, UserCheck, CreditCard, Package, Phone, Instagram, FileText
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

  // ===== MORE TRIGGERS =====
  {
    id: 'form-submit',
    type: 'trigger',
    label: '📝 Form Submit',
    description: 'Recebe dados de formulário web',
    icon: MessageSquare,
    color: '#25D366',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Formulário enviado', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'formId', label: 'Form ID', type: 'string' },
      { key: 'webhookPath', label: 'Caminho Webhook', type: 'string', defaultValue: '/webhook/form' }
    ]
  },
  {
    id: 'database-trigger',
    type: 'trigger',
    label: '💾 Database Trigger',
    description: 'Disparo em mudança de BD (PostgreSQL/MySQL)',
    icon: Database,
    color: '#25D366',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Mudança detectada', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'connectionString', label: 'String de Conexão', type: 'password' },
      { key: 'table', label: 'Tabela', type: 'string' },
      { key: 'events', label: 'Eventos', type: 'select', options: [
        { value: 'INSERT', label: 'INSERT' },
        { value: 'UPDATE', label: 'UPDATE' },
        { value: 'DELETE', label: 'DELETE' },
      ]}
    ]
  },
  {
    id: 'file-upload',
    type: 'trigger',
    label: '📎 File Upload',
    description: 'Disparo no upload de arquivo',
    icon: FileText,
    color: '#25D366',
    category: 'triggers',
    outputs: [
      { id: 'default', label: 'Arquivo recebido', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'allowedTypes', label: 'Tipos Permitidos', type: 'string', placeholder: 'pdf, jpg, png' },
      { key: 'maxSizeMB', label: 'Tamanho Máx (MB)', type: 'number', defaultValue: 10 }
    ]
  },

  // ===== MORE LOGIC =====
  {
    id: 'loop',
    type: 'logic',
    label: '🔄 Loop',
    description: 'Itera sobre lista de itens',
    icon: Repeat,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in', label: 'Lista de itens', type: 'data' }
    ],
    outputs: [
      { id: 'item', label: 'Item atual', type: 'data' },
      { id: 'complete', label: 'Concluído', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'collection', label: 'Coleção (JSON)', type: 'json' },
      { key: 'maxIterations', label: 'Máx Iterações', type: 'number', defaultValue: 100 }
    ]
  },
  {
    id: 'merge',
    type: 'logic',
    label: '🔀 Merge (Juntar Fluxos)',
    description: 'Combina múltiplos fluxos num só',
    icon: GitMerge,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in1', label: 'Fluxo 1', type: 'data' },
      { id: 'in2', label: 'Fluxo 2', type: 'data' }
    ],
    outputs: [
      { id: 'merged', label: 'Fluxo combinado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'strategy', label: 'Estratégia', type: 'select', options: [
        { value: 'append', label: 'Anexar' },
        { value: 'merge', label: 'Mesclar' },
      ]}
    ]
  },
  {
    id: 'rate-limit',
    type: 'logic',
    label: '⏱️ Rate Limit',
    description: 'Limita frequência de execução',
    icon: Clock,
    color: '#EAB308',
    category: 'logic',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'allowed', label: 'Permitido', type: 'success' },
      { id: 'blocked', label: 'Bloqueado', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'maxRequests', label: 'Máx Requisições', type: 'number', defaultValue: 100 },
      { key: 'period', label: 'Período (seg)', type: 'number', defaultValue: 60 }
    ]
  },

  // ===== MORE AI =====
  {
    id: 'grok-xai',
    type: 'ai',
    label: '🤖 Grok (xAI)',
    description: 'Executa modelo Grok (2/3)',
    icon: Bot,
    color: '#1DA1F2',
    category: 'ai',
    inputs: [
      { id: 'in', label: 'Prompt/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'apiKey', label: 'API Key (xAI)', type: 'password' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'grok-2', label: 'Grok 2' },
        { value: 'grok-3', label: 'Grok 3' },
      ], defaultValue: 'grok-2' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'prompt', multiline: true },
      { key: 'userPrompt', label: 'User Prompt', type: 'prompt', multiline: true },
    ]
  },
  {
    id: 'gemini-google',
    type: 'ai',
    label: '🤖 Gemini (Google)',
    description: 'Executa modelo Gemini',
    icon: Brain,
    color: '#4285F4',
    category: 'ai',
    inputs: [
      { id: 'in', label: 'Prompt/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'apiKey', label: 'API Key (Google)', type: 'password' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
      ], defaultValue: 'gemini-pro' },
      { key: 'prompt', label: 'Prompt', type: 'prompt', multiline: true },
    ]
  },
  {
    id: 'llama-local',
    type: 'ai',
    label: '🦙 Llama (Local/Ollama)',
    description: 'Executa modelo Llama localmente',
    icon: Brain,
    color: '#FF6B35',
    category: 'ai',
    inputs: [
      { id: 'in', label: 'Prompt/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'endpoint', label: 'Endpoint (Ollama)', type: 'string', defaultValue: 'http://localhost:11434' },
      { key: 'model', label: 'Modelo', type: 'string', defaultValue: 'llama3' },
      { key: 'prompt', label: 'Prompt', type: 'prompt', multiline: true },
    ]
  },

  // ===== MORE ACTIONS =====
  {
    id: 'database-insert',
    type: 'action',
    label: '💾 Database Insert',
    description: 'Insere dados no banco SQL',
    icon: Database,
    color: '#14B8A6',
    category: 'actions',
    inputs: [
      { id: 'in', label: 'Dados para inserção', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Inserido', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'connectionString', label: 'String de Conexão', type: 'password' },
      { key: 'table', label: 'Tabela', type: 'string' },
      { key: 'data', label: 'Dados (JSON)', type: 'json' },
    ]
  },
  {
    id: 'google-sheets',
    type: 'action',
    label: '📊 Google Sheets',
    description: 'Adiciona/editar linha em planilha',
    icon: GitCompare,
    color: '#14B8A6',
    category: 'actions',
    inputs: [
      { id: 'in', label: 'Dados da linha', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Adicionado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string' },
      { key: 'range', label: 'Range (ex: A1:D1)', type: 'string' },
      { key: 'values', label: 'Valores (JSON)', type: 'json' },
    ]
  },
  {
    id: 'sms-send',
    type: 'action',
    label: '📱 SMS (Twilio)',
    description: 'Envia SMS via Twilio',
    icon: Phone,
    color: '#14B8A6',
    category: 'actions',
    inputs: [
      { id: 'in', label: 'Dados do SMS', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Enviado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'accountSid', label: 'Account SID', type: 'password' },
      { key: 'authToken', label: 'Auth Token', type: 'password' },
      { key: 'to', label: 'Para (número)', type: 'string' },
      { key: 'body', label: 'Mensagem', type: 'prompt', multiline: true },
    ]
  },

  // ===== MORE INTEGRATIONS =====
  {
    id: 'graphql-query',
    type: 'integration',
    label: '🔗 GraphQL Query',
    description: 'Executa query GraphQL',
    icon: Globe,
    color: '#06B6D4',
    category: 'integrations',
    inputs: [
      { id: 'in', label: 'Variáveis', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'endpoint', label: 'Endpoint GraphQL', type: 'string' },
      { key: 'query', label: 'Query', type: 'prompt', multiline: true },
      { key: 'headers', label: 'Headers (JSON)', type: 'json' },
    ]
  },
  {
    id: 'websocket',
    type: 'integration',
    label: '🔌 WebSocket',
    description: 'Envia/recebe via WebSocket',
    icon: Globe,
    color: '#06B6D4',
    category: 'integrations',
    inputs: [
      { id: 'in', label: 'Dados para enviar', type: 'data' }
    ],
    outputs: [
      { id: 'message', label: 'Mensagem recebida', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'url', label: 'WebSocket URL', type: 'string', placeholder: 'ws://exemplo.com/socket' },
      { key: 'message', label: 'Mensagem (JSON)', type: 'json' },
    ]
  },

  // ===== MORE FLOW =====
  {
    id: 'jump-to-node',
    type: 'flow',
    label: '↪️ Jump to Node',
    description: 'Pula para outro nó específico',
    icon: ArrowRight,
    color: '#F97316',
    category: 'flow',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'jumped', label: 'Pulado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'targetNodeId', label: 'ID do Nó Destino', type: 'string' },
    ]
  },
  {
    id: 'error-handler',
    type: 'flow',
    label: '⚠️ Error Handler',
    description: 'Captura e trata erros do fluxo',
    icon: AlertTriangle,
    color: '#F97316',
    category: 'flow',
    inputs: [
      { id: 'in', label: 'Erro recebido', type: 'error' }
    ],
    outputs: [
      { id: 'handled', label: 'Tratado', type: 'success' },
      { id: 'fallback', label: 'Fallback', type: 'data' },
    ],
    config: [
      { key: 'action', label: 'Ação', type: 'select', options: [
        { value: 'retry', label: 'Tentar novamente' },
        { value: 'notify', label: 'Notificar' },
        { value: 'ignore', label: 'Ignorar' },
      ]}
    ]
  },
  {
    id: 'parallel-execution',
    type: 'flow',
    label: '🔀 Parallel Execution',
    description: 'Executa múltiplos ramos em paralelo',
    icon: GitBranch,
    color: '#F97316',
    category: 'flow',
    inputs: [
      { id: 'in', label: 'Dados de entrada', type: 'data' }
    ],
    outputs: [
      { id: 'branch1', label: 'Ramo 1', type: 'success' },
      { id: 'branch2', label: 'Ramo 2', type: 'success' },
      { id: 'allComplete', label: 'Todos concluídos', type: 'success' },
    ],
    config: [
      { key: 'maxBranches', label: 'Máx Ramos', type: 'number', defaultValue: 2 },
    ]
  },

  // ===== MORE PHARMACY =====
  {
    id: 'stock-alert',
    type: 'pharmacy',
    label: '📦 Stock Alert',
    description: 'Alerta sobre estoque baixo',
    icon: Package,
    color: '#1E40AF',
    category: 'pharmacy',
    inputs: [
      { id: 'in', label: 'Dados do produto', type: 'data' }
    ],
    outputs: [
      { id: 'low', label: 'Estoque baixo', type: 'data' },
      { id: 'ok', label: 'Estoque OK', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'productId', label: 'Product ID', type: 'string' },
      { key: 'threshold', label: 'Limite mínimo', type: 'number', defaultValue: 10 },
      { key: 'notifyTo', label: 'Notificar (email/phone)', type: 'string' },
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
