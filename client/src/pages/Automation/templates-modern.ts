// Templates modernos e profissionais para Farma Francis
// Baseado nas top automation skills: n8n, agentic-workflow, ai-automation

export interface ModernTemplate {
  id: string;
  name: string;
  description: string;
  category: 'whatsapp' | 'crm' | 'ai' | 'integration' | 'notification';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: any[];
  edges: any[];
  tags: string[];
  estimatedTime: string;
  useCase: string;
}

export const flowTemplates: ModernTemplate[] = [
  // 1. WhatsApp Bot Inteligente (n8n-style)
  {
    id: 'wa-smart-bot-v2',
    name: '🤖 WhatsApp Bot Inteligente v2',
    description: 'Bot avançado com IA (OpenAI/Anthropic), fallback para humano, e aprendizado contínuo',
    category: 'whatsapp',
    difficulty: 'advanced',
    estimatedTime: '30 min',
    useCase: 'Atendimento automatizado com IA que escala para humanos quando necessário',
    tags: ['whatsapp', 'ai', 'openai', 'anthropic', 'fallback', 'learning'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'n8nWebhook',
        position: { x: 100, y: 100 },
        data: { 
          label: 'WhatsApp Message',
          config: { webhookUrl: '', event: 'message.received' }
        }
      },
      {
        id: 'ai-analyze-1',
        type: 'n8nAiNode',
        position: { x: 300, y: 100 },
        data: {
          label: 'Analisar com IA',
          config: {
            provider: 'openai',
            model: 'gpt-4',
            prompt: 'Analise a intenção do cliente e classifique: vendas, suporte, dúvida, reclamação, outros',
            temperature: 0.3
          }
        }
      },
      {
        id: 'condition-1',
        type: 'n8nIfNode',
        position: { x: 500, y: 100 },
        data: {
          label: 'Intenção Clara?',
          config: {
            conditions: [
              { field: 'aiResponse.intention', operator: 'exists', value: true }
            ]
          }
        }
      },
      {
        id: 'respond-ai-1',
        type: 'n8nSendMessage',
        position: { x: 700, y: 50 },
        data: {
          label: 'Resposta IA',
          config: {
            message: '{{$json.aiResponse.reply}}',
            sendTo: '{{$json.trigger.from}}'
          }
        }
      },
      {
        id: 'human-handoff-1',
        type: 'n8nHttpRequest',
        position: { x: 700, y: 150 },
        data: {
          label: 'Transferir p/ Humano',
          config: {
            url: '{{$env.FARMA_API}}/api/internal-messages',
            method: 'POST',
            body: {
              to: 'support_team',
              message: 'Cliente precisa de atendimento humano: {{$json.trigger.from}}',
              priority: 'high'
            }
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'ai-analyze-1' },
      { id: 'e2', source: 'ai-analyze-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'respond-ai-1', sourceHandle: 'true' },
      { id: 'e4', source: 'condition-1', target: 'human-handoff-1', sourceHandle: 'false' }
    ]
  },

  // 2. CRM Lead Scoring Automático (agentic workflow)
  {
    id: 'crm-lead-scoring-v2',
    name: '🎯 CRM Lead Scoring Automático',
    description: 'Pontua leads automaticamente baseado em interações, histórico e IA',
    category: 'crm',
    difficulty: 'intermediate',
    estimatedTime: '25 min',
    useCase: 'Priorize leads quentes e aumente conversão',
    tags: ['crm', 'leads', 'scoring', 'ai', 'automation'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'n8nWebhook',
        position: { x: 100, y: 100 },
        data: { 
          label: 'Novo Lead/Interação',
          config: { webhookUrl: '', event: 'lead.updated' }
        }
      },
      {
        id: 'get-lead-1',
        type: 'n8nHttpRequest',
        position: { x: 300, y: 100 },
        data: {
          label: 'Buscar Dados Lead',
          config: {
            url: '{{$env.FARMA_API}}/api/customers/{{$json.trigger.customerId}}',
            method: 'GET'
          }
        }
      },
      {
        id: 'ai-scoring-1',
        type: 'n8nAiNode',
        position: { x: 500, y: 100 },
        data: {
          label: 'Calcular Score IA',
          config: {
            provider: 'openai',
            prompt: `Analise este lead e dê um score de 0-100:
            - Interações recentes: {{$json.lead.interactions}}
            - Tempo desde último contato: {{$json.lead.lastContact}}
            - Histórico de compras: {{$json.lead.purchases}}
            - Responda apenas o número.`,
            temperature: 0.1
          }
        }
      },
      {
        id: 'update-crm-1',
        type: 'n8nHttpRequest',
        position: { x: 700, y: 100 },
        data: {
          label: 'Atualizar CRM',
          config: {
            url: '{{$env.FARMA_API}}/api/customers/{{$json.trigger.customerId}}',
            method: 'PATCH',
            body: {
              leadScore: '{{$json.aiScoring.score}}',
              lastScoredAt: '{{$now}}'
            }
          }
        }
      },
      {
        id: 'notify-hot-lead-1',
        type: 'n8nSendMessage',
        position: { x: 900, y: 100 },
        data: {
          label: 'Notificar Lead Quente',
          config: {
            condition: '{{$json.aiScoring.score > 80}}',
            message: '🔥 Lead Quente! Score: {{$json.aiScoring.score}} - {{$json.lead.name}}',
            sendTo: 'sales_team'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'get-lead-1' },
      { id: 'e2', source: 'get-lead-1', target: 'ai-scoring-1' },
      { id: 'e3', source: 'ai-scoring-1', target: 'update-crm-1' },
      { id: 'e4', source: 'update-crm-1', target: 'notify-hot-lead-1' }
    ]
  },

  // 3. Integração n8n + Farma (n8n workflow automation)
  {
    id: 'n8n-farma-sync-v2',
    name: '🔄 Sync n8n ↔ Farma Francis',
    description: 'Sincronização bidirecional em tempo real entre n8n workflows e Farma Francis',
    category: 'integration',
    difficulty: 'advanced',
    estimatedTime: '45 min',
    useCase: 'Use workflows n8n externos com dados do Farma Francis',
    tags: ['n8n', 'sync', 'integration', 'realtime', 'webhook'],
    nodes: [
      {
        id: 'n8n-trigger-1',
        type: 'n8nWebhook',
        position: { x: 100, y: 100 },
        data: { 
          label: 'n8n Workflow Start',
          config: { webhookUrl: 'https://n8n.example.com/webhook/farma-sync' }
        }
      },
      {
        id: 'transform-1',
        type: 'n8nCodeNode',
        position: { x: 300, y: 100 },
        data: {
          label: 'Transformar Dados',
          config: {
            language: 'javascript',
            code: `
// Transforma dados do n8n para formato Farma
const data = items[0].json;
return [{
  json: {
    customerId: data.customer_id || data.customerId,
    action: data.action || 'update',
    payload: data
  }
}];`
          }
        }
      },
      {
        id: 'farma-api-1',
        type: 'n8nHttpRequest',
        position: { x: 500, y: 100 },
        data: {
          label: 'Farma API',
          config: {
            url: '{{$env.FARMA_API}}/api/trpc',
            method: 'POST',
            headers: {
              'Authorization': 'Bearer {{$env.FARMA_TOKEN}}'
            },
            body: '{{$json.transform.payload}}'
          }
        }
      },
      {
        id: 'log-success-1',
        type: 'n8nHttpRequest',
        position: { x: 700, y: 50 },
        data: {
          label: 'Log Sucesso',
          config: {
            url: '{{$env.FARMA_API}}/api/automation-logs',
            method: 'POST',
            body: { status: 'success', workflow: '{{$json.n8nTrigger.workflowId}}' }
          }
        }
      },
      {
        id: 'error-handle-1',
        type: 'n8nIfNode',
        position: { x: 500, y: 200 },
        data: {
          label: 'Erro?',
          config: {
            conditions: [
              { field: 'farmaApi.statusCode', operator: 'not equals', value: 200 }
            ]
          }
        }
      },
      {
        id: 'alert-error-1',
        type: 'n8nSendMessage',
        position: { x: 700, y: 200 },
        data: {
          label: 'Alerta Erro',
          config: {
            message: '❌ Erro na integração n8n: {{$json.farmaApi.error}}',
            sendTo: 'dev_team'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'n8n-trigger-1', target: 'transform-1' },
      { id: 'e2', source: 'transform-1', target: 'farma-api-1' },
      { id: 'e3', source: 'farma-api-1', target: 'log-success-1', sourceHandle: 'success' },
      { id: 'e4', source: 'farma-api-1', target: 'error-handle-1' },
      { id: 'e5', source: 'error-handle-1', target: 'alert-error-1', sourceHandle: 'true' }
    ]
  },

  // 4. Notificação Proativa (AI + Automation)
  {
    id: 'proactive-notification-v2',
    name: '🔔 Notificação Proativa Inteligente',
    description: 'IA analisa contexto e envia notificações proativas antes do cliente pedir',
    category: 'notification',
    difficulty: 'intermediate',
    estimatedTime: '20 min',
    useCase: 'Aumente retenção com lembretes inteligentes',
    tags: ['notification', 'ai', 'proactive', 'retention', 'smart'],
    nodes: [
      {
        id: 'schedule-1',
        type: 'n8nSchedule',
        position: { x: 100, y: 100 },
        data: { 
          label: 'Todo Dia 9h',
          config: { cron: '0 9 * * *' }
        }
      },
      {
        id: 'get-customers-1',
        type: 'n8nHttpRequest',
        position: { x: 300, y: 100 },
        data: {
          label: 'Buscar Clientes',
          config: {
            url: '{{$env.FARMA_API}}/api/customers/list?filter=active',
            method: 'GET'
          }
        }
      },
      {
        id: 'ai-analyze-1',
        type: 'n8nAiNode',
        position: { x: 500, y: 100 },
        data: {
          label: 'Analisar Necessidades',
          config: {
            provider: 'openai',
            prompt: `Para cada cliente, analise:
            - Última compra: {{$json.customer.lastPurchase}}
            - Medicamentos em uso: {{$json.customer.medications}}
            - Padrão de renovação: {{$json.customer.refillPattern}}
            
            Sugira notificação proativa (renovação, check-up, promoção).`,
            temperature: 0.5
          }
        }
      },
      {
        id: 'send-notification-1',
        type: 'n8nSendMessage',
        position: { x: 700, y: 100 },
        data: {
          label: 'Enviar Notificação',
          config: {
            condition: '{{$json.aiAnalysis.shouldNotify === true}}',
            message: '{{$json.aiAnalysis.notificationText}}',
            sendTo: '{{$json.customer.phone}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'schedule-1', target: 'get-customers-1' },
      { id: 'e2', source: 'get-customers-1', target: 'ai-analyze-1' },
      { id: 'e3', source: 'ai-analyze-1', target: 'send-notification-1' }
    ]
  },

  // 5. Workflow de Aprovação Humana (Agentic Workflow)
  {
    id: 'human-approval-v2',
    name: '✋ Aprovação Humana com IA',
    description: 'Fluxo que usa IA para pré-aprovar e humanos apenas validam casos complexos',
    category: 'ai',
    difficulty: 'advanced',
    estimatedTime: '35 min',
    useCase: 'Acelere aprovações com IA filtrando o que realmente precisa de humano',
    tags: ['approval', 'ai', 'human-in-the-loop', 'efficiency'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'n8nWebhook',
        position: { x: 100, y: 100 },
        data: { 
          label: 'Solicitação',
          config: { webhookUrl: '', event: 'approval.requested' }
        }
      },
      {
        id: 'ai-pre-approve-1',
        type: 'n8nAiNode',
        position: { x: 300, y: 100 },
        data: {
          label: 'IA Pré-analisa',
          config: {
            provider: 'anthropic',
            model: 'claude-3',
            prompt: `Analise esta solicitação de aprovação:
            Tipo: {{$json.trigger.type}}
            Valor: {{$json.trigger.amount}}
            Solicitante: {{$json.trigger.requester}}
            Histórico: {{$json.trigger.history}}
            
            Responda JSON: { "approved": boolean, "confidence": 0-1, "reason": "string" }`,
            temperature: 0.2
          }
        }
      },
      {
        id: 'high-confidence-1',
        type: 'n8nIfNode',
        position: { x: 500, y: 100 },
        data: {
          label: 'Confiança > 90%?',
          config: {
            conditions: [
              { field: 'aiPreApprove.confidence', operator: 'larger', value: 0.9 }
            ]
          }
        }
      },
      {
        id: 'auto-approve-1',
        type: 'n8nHttpRequest',
        position: { x: 700, y: 50 },
        data: {
          label: 'Aprovar Automaticamente',
          config: {
            url: '{{$env.FARMA_API}}/api/approvals/{{$json.trigger.id}}/approve',
            method: 'POST',
            body: { approvedBy: 'AI', reason: '{{$json.aiPreApprove.reason}}' }
          }
        }
      },
      {
        id: 'human-review-1',
        type: 'n8nHttpRequest',
        position: { x: 700, y: 150 },
        data: {
          label: 'Enviar p/ Humano',
          config: {
            url: '{{$env.FARMA_API}}/api/internal-messages',
            method: 'POST',
            body: {
              to: 'managers',
              message: 'Aprovação precisa de revisão humana: {{$json.trigger.id}}',
              priority: 'medium',
              context: '{{JSON.stringify($json.aiPreApprove)}}'
            }
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'ai-pre-approve-1' },
      { id: 'e2', source: 'ai-pre-approve-1', target: 'high-confidence-1' },
      { id: 'e3', source: 'high-confidence-1', target: 'auto-approve-1', sourceHandle: 'true' },
      { id: 'e4', source: 'high-confidence-1', target: 'human-review-1', sourceHandle: 'false' }
    ]
  }
];

export default flowTemplates;
