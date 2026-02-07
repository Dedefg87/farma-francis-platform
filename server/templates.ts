export type TemplateType = 'premium' | 'sales' | 'pharma' | 'scheduling';
export type AutomationType = 'simple' | 'complex';
export type URAVersion = 'main' | 'extended' | 'emergency' | 'custom';

export interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  defaultFlows: FlowConfig[];
  automations: AutomationConfig[];
  ura: URAConfig;
  settings: TemplateSettings;
}

export interface FlowConfig {
  id: string;
  name: string;
  trigger: string;
  steps: FlowStep[];
  conditions?: FlowCondition[];
}

export interface FlowStep {
  id: string;
  type: 'message' | 'ai' | 'condition' | 'action' | 'wait' | 'transfer' | 'notification';
  name: string;
  config: Record<string, unknown>;
  next?: string;
}

export interface FlowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: unknown;
  trueStep: string;
  falseStep: string;
}

export interface AutomationConfig {
  id: string;
  name: string;
  type: AutomationType;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  schedule?: ScheduleConfig;
  enabled: boolean;
}

export interface AutomationTrigger {
  type: 'message' | 'event' | 'schedule' | 'webhook' | 'status_change';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: unknown;
}

export interface AutomationAction {
  type: 'send_message' | 'update_status' | 'add_tag' | 'notify_agent' | 'schedule_followup' | 'transfer' | 'create_task' | 'update_score';
  config: Record<string, unknown>;
}

export interface ScheduleConfig {
  type: 'interval' | 'cron';
  value: string;
  timezone: string;
}

export interface URAConfig {
  id: string;
  name: string;
  version: URAVersion;
  welcomeMessage: string;
  options: URAOption[];
  aiEnabled: boolean;
  escalationTimeout: number;
  fallbackMessage: string;
  emergencyDetection: boolean;
}

export interface URAOption {
  digit: string;
  label: string;
  description: string;
  nextAction: {
    type: 'flow' | 'message' | 'transfer' | 'external';
    target: string;
  };
}

export interface TemplateSettings {
  aiModel: string;
  aiTemperature: number;
  maxResponseTokens: number;
  responseTimeout: number;
  humanEscalationAfter: number;
  autoCloseAfter: number;
  requireHumanOnSentiment: boolean;
  requireHumanOnKeywords: string[];
  workingHoursEnabled: boolean;
  workingHours?: WorkingHours;
}

export interface WorkingHours {
  timezone: string;
  schedule: DaySchedule[];
  holidays: Holiday[];
}

export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start: string;
  end: string;
  enabled: boolean;
}

export interface Holiday {
  date: string;
  name: string;
  enabled: boolean;
}

export const TEMPLATES: Record<TemplateType, Template> = {
  premium: {
    id: 'premium',
    name: 'Atendimento Premium',
    description: 'Template focado em experiência VIP com atendimento altamente personalizado',
    icon: '👑',
    color: 'from-purple-600 to-indigo-700',
    features: [
      'Boas-vindas personalizadas',
      'Prioridade imediata',
      'Histórico completo',
      'Recomendações personalizadas',
      'Follow-up em 2 horas',
      'Avaliação de satisfação'
    ],
    defaultFlows: [
      {
        id: 'welcome-vip',
        name: 'Boas-Vindas VIP',
        trigger: 'new_conversation',
        steps: [
          { id: 'identify', type: 'ai', name: 'Identificar Cliente', config: { action: 'identify_customer' }, next: 'greet' },
          { id: 'greet', type: 'message', name: 'Saudação Personalizada', config: { template: 'welcome_vip' }, next: 'check-history' },
          { id: 'check-history', type: 'condition', name: 'Verificar Histórico', config: { field: 'has_history', operator: 'equals', value: true }, next: 'recommend' },
          { id: 'recommend', type: 'ai', name: 'Recomendar Produtos', config: { action: 'personalized_recommendation' }, next: 'available' },
          { id: 'available', type: 'message', name: 'Verificar Disponibilidade', config: { template: 'agent_available' } }
        ]
      },
      {
        id: 'quick-resolution',
        name: 'Resolução Rápida',
        trigger: 'repeat_customer',
        steps: [
          { id: 'greet-returning', type: 'message', name: 'Saudar Retornando', config: { template: 'welcome_back' }, next: 'check-last' },
          { id: 'check-last', type: 'condition', name: 'Verificar Última Compra', config: { field: 'days_since_last', operator: 'less', value: 30 }, next: 'suggest-refill' },
          { id: 'suggest-refill', type: 'message', name: 'Sugerir Refil', config: { template: 'suggest_refill' }, next: 'offer-help' },
          { id: 'offer-help', type: 'message', name: 'Oferecer Ajuda', config: { template: 'offer_assistance' } }
        ]
      }
    ],
    automations: [
      {
        id: 'vip-followup',
        name: 'Follow-up VIP',
        type: 'simple',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 */2 * * *' } },
        conditions: [{ field: 'is_vip', operator: 'equals', value: true }],
        actions: [
          { type: 'send_message', config: { template: 'vip_checkin' } },
          { type: 'notify_agent', config: { priority: 'high' } }
        ],
        enabled: true
      },
      {
        id: 'priority-transfer',
        name: 'Transferência Prioritária',
        type: 'simple',
        trigger: { type: 'message', config: { contains_keywords: ['urgente', 'emergência', 'problema'] } },
        conditions: [{ field: 'is_vip', operator: 'equals', value: true }],
        actions: [
          { type: 'transfer', config: { queue: 'vip', priority: 'urgent' } },
          { type: 'notify_agent', config: { message: 'Cliente VIP precisa de atenção' } }
        ],
        enabled: true
      }
    ],
    ura: {
      id: 'ura-premium',
      name: 'URA Premium',
      version: 'main',
      welcomeMessage: 'Olá! Você está falando com a Farmácia Francis. Meu nome é Fran, sua assistente VIP.',
      options: [
        { digit: '1', label: 'Falar com Atendente', description: 'Consultar sobre produtos ou fazer pedido', nextAction: { type: 'transfer', target: 'queue-vip' } },
        { digit: '2', label: 'Meus Pedidos', description: 'Rastrear ou verificar status', nextAction: { type: 'flow', target: 'check-orders' } },
        { digit: '3', label: 'Produtos', description: 'Buscar catálogo de produtos', nextAction: { type: 'flow', target: 'product-search' } },
        { digit: '4', label: 'Agendar Consulta', description: 'Marcar horário com farmacêutico', nextAction: { type: 'flow', target: 'scheduling' } },
        { digit: '5', label: 'Falar com Farmacêutico', description: 'Orientação técnica', nextAction: { type: 'transfer', target: 'pharmacist' } }
      ],
      aiEnabled: true,
      escalationTimeout: 30,
      fallbackMessage: 'Deixe-me transferir para um de nossos especialistas.',
      emergencyDetection: true
    },
    settings: {
      aiModel: 'gpt-4',
      aiTemperature: 0.3,
      maxResponseTokens: 500,
      responseTimeout: 10000,
      humanEscalationAfter: 3,
      autoCloseAfter: 60,
      requireHumanOnSentiment: true,
      requireHumanOnKeywords: ['receita', 'controlado', 'interação', 'gravidez'],
      workingHoursEnabled: false
    }
  },
  sales: {
    id: 'sales',
    name: 'Vendas Automatizadas',
    description: 'Template otimizado para maximizar conversões através de automação inteligente',
    icon: '💰',
    color: 'from-green-600 to-emerald-700',
    features: [
      'Triagem automática',
      'Score em tempo real',
      'Ofertas dinâmicas',
      'Carrinho abandonado',
      'Cross-selling',
      'Upselling progressivo'
    ],
    defaultFlows: [
      {
        id: 'qualification',
        name: 'Qualificação de Leads',
        trigger: 'new_lead',
        steps: [
          { id: 'welcome', type: 'message', name: 'Boas-Vindas', config: { template: 'welcome_sales' }, next: 'classify' },
          { id: 'classify', type: 'ai', name: 'Classificar Intenção', config: { action: 'classify_intent' }, next: 'score' },
          { id: 'score', type: 'ai', name: 'Calcular Score', config: { action: 'calculate_rfm_score' }, next: 'route' },
          { id: 'route', type: 'condition', name: 'Roteamento por Score', config: { field: 'score', operator: 'greater', value: 70 }, next: 'hot-path' },
          { id: 'hot-path', type: 'action', name: 'Path Quente', config: { action: 'immediate_offer' }, next: 'offer' },
          { id: 'offer', type: 'ai', name: 'Oferta Personalizada', config: { action: 'personalized_offer' } }
        ]
      },
      {
        id: 'cart-recovery',
        name: 'Recuperação de Carrinho',
        trigger: 'abandoned_cart',
        steps: [
          { id: 'reminder-1h', type: 'wait', name: 'Aguardar 1h', config: { duration: 3600000 }, next: 'first-reminder' },
          { id: 'first-reminder', type: 'message', name: 'Lembrete Leve', config: { template: 'cart_reminder_light' }, next: 'wait-24h' },
          { id: 'wait-24h', type: 'wait', name: 'Aguardar 24h', config: { duration: 86400000 }, next: 'second-reminder' },
          { id: 'second-reminder', type: 'message', name: 'Lembrete Personalizado', config: { template: 'cart_reminder_personal' }, next: 'wait-48h' },
          { id: 'wait-48h', type: 'wait', name: 'Aguardar 48h', config: { duration: 172800000 }, next: 'final-offer' },
          { id: 'final-offer', type: 'message', name: 'Oferta Final', config: { template: 'cart_final_offer' } }
        ]
      },
      {
        id: 'upselling',
        name: 'Upselling Inteligente',
        trigger: 'product_view',
        steps: [
          { id: 'analyze-cart', type: 'ai', name: 'Analisar Carrinho', config: { action: 'analyze_cart_for_upsell' }, next: 'suggest' },
          { id: 'suggest', type: 'ai', name: 'Sugerir Upgrade', config: { action: 'upsell_recommendation' } }
        ]
      }
    ],
    automations: [
      {
        id: 'lead-scoring',
        name: 'Scoring Automático',
        type: 'complex',
        trigger: { type: 'event', config: { events: ['message', 'product_view', 'cart_add', 'checkout_start'] } },
        conditions: [],
        actions: [
          { type: 'update_score', config: { factors: { message: 5, product_view: 3, cart_add: 10, checkout_start: 15 } } },
          { type: 'add_tag', config: { tag: '{{score_category}}' } }
        ],
        enabled: true
      },
      {
        id: 'abandoned-cart-sequence',
        name: 'Sequência Carrinho Abandonado',
        type: 'complex',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 9 * * *' } },
        conditions: [{ field: 'abandoned_cart', operator: 'equals', value: true }],
        actions: [
          { type: 'send_message', config: { template: 'cart_sequence_1' } },
          { type: 'schedule_followup', config: { delay: 86400000, action: 'send_message', template: 'cart_sequence_2' } },
          { type: 'schedule_followup', config: { delay: 172800000, action: 'send_message', template: 'cart_sequence_3' } },
          { type: 'schedule_followup', config: { delay: 259200000, action: 'notify_agent', message: 'Cliente com carrinho abandonado há 3 dias' } }
        ],
        enabled: true
      },
      {
        id: 'cross-sell',
        name: 'Cross-Sell Pós-Compra',
        type: 'simple',
        trigger: { type: 'event', config: { events: ['purchase_completed'] } },
        conditions: [],
        actions: [
          { type: 'send_message', config: { template: 'cross_sell_offer', delay: 86400000 } }
        ],
        enabled: true
      },
      {
        id: 'winback',
        name: 'Winback Campaign',
        type: 'complex',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 10 * * 1' } },
        conditions: [{ field: 'days_since_last_purchase', operator: 'greater', value: 60 }],
        actions: [
          { type: 'send_message', config: { template: 'winback_1' } },
          { type: 'schedule_followup', config: { delay: 604800000, action: 'send_message', template: 'winback_2' } },
          { type: 'schedule_followup', config: { delay: 1209600000, action: 'send_message', template: 'winback_3' } },
          { type: 'notify_agent', config: { message: 'Cliente inativo há 60+ dias - considerar contato humano' } }
        ],
        enabled: true
      }
    ],
    ura: {
      id: 'ura-sales',
      name: 'URA de Vendas',
      version: 'main',
      welcomeMessage: 'Olá! Bem-vindo à Farmácia Francis. Estou aqui para ajudar você a encontrar os melhores produtos com as melhores ofertas!',
      options: [
        { digit: '1', label: 'Buscar Produtos', description: 'Encontre o que precisa com desconto', nextAction: { type: 'flow', target: 'product-search' } },
        { digit: '2', label: 'Ofertas da Semana', description: 'Ver promoções especiais', nextAction: { type: 'flow', target: 'weekly-deals' } },
        { digit: '3', label: 'Meu Carrinho', description: 'Finalizar compra ou ver itens', nextAction: { type: 'flow', target: 'cart-checkout' } },
        { digit: '4', label: 'Status do Pedido', description: 'Rastrear entrega', nextAction: { type: 'flow', target: 'order-status' } },
        { digit: '5', label: 'Falar com Vendedor', description: 'Atendimento personalizado', nextAction: { type: 'transfer', target: 'sales-queue' } }
      ],
      aiEnabled: true,
      escalationTimeout: 60,
      fallbackMessage: 'Vou transferir para nossa equipe de vendas!',
      emergencyDetection: false
    },
    settings: {
      aiModel: 'gpt-3.5-turbo',
      aiTemperature: 0.5,
      maxResponseTokens: 300,
      responseTimeout: 8000,
      humanEscalationAfter: 5,
      autoCloseAfter: 30,
      requireHumanOnSentiment: false,
      requireHumanOnKeywords: ['reclamação', 'problema', 'não funcionou'],
      workingHoursEnabled: false
    }
  },
  pharma: {
    id: 'pharma',
    name: 'Suporte Técnico Pharma',
    description: 'Template especializado para dúvidas sobre medicamentos e suporte pós-venda',
    icon: '💊',
    color: 'from-blue-600 to-cyan-700',
    features: [
      'Classificação de urgência',
      'FAQ farmacêutico',
      'Orientações scriptadas',
      'Alertas de interações',
      'Lembretes de refil',
      'Escalonamento para farmacêutico'
    ],
    defaultFlows: [
      {
        id: 'medication-inquiry',
        name: 'Consulta de Medicamento',
        trigger: 'medication_question',
        steps: [
          { id: 'classify-urgency', type: 'ai', name: 'Classificar Urgência', config: { action: 'classify_urgency' }, next: 'route' },
          { id: 'route', type: 'condition', name: 'Roteamento', config: { field: 'urgency_level', operator: 'equals', value: 'high' }, next: 'escalate-pharma' },
          { id: 'escalate-pharma', type: 'transfer', name: 'Escalonar Farmacêutico', config: { queue: 'pharmacy' }, next: 'notify' },
          { id: 'notify', type: 'notification', name: 'Notificar', config: { message: 'Consulta urgente - farmacêutico necessário' }, next: 'end' },
          { id: 'end', type: 'message', name: 'Aguardar Contato', config: { template: 'pharma_escalation' } }
        ],
        conditions: [
          { id: 'urgency-check', field: 'urgency_level', operator: 'equals', value: 'high', trueStep: 'escalate-pharma', falseStep: 'search-kb' }
        ]
      },
      {
        id: 'drug-interaction',
        name: 'Verificação de Interações',
        trigger: 'drug_interaction_check',
        steps: [
          { id: 'collect-info', type: 'ai', name: 'Coletar Info', config: { action: 'collect_drugs_info' }, next: 'check-interactions' },
          { id: 'check-interactions', type: 'ai', name: 'Verificar Interações', config: { action: 'check_drug_interactions' }, next: 'route-result' },
          { id: 'route-result', type: 'condition', name: 'Resultado', config: { field: 'has_interaction', operator: 'equals', value: true }, next: 'warning' },
          { id: 'warning', type: 'message', name: 'Alerta de Interação', config: { template: 'interaction_warning' }, next: 'recommend' },
          { id: 'recommend', type: 'message', name: 'Recomendar', config: { template: 'interaction_recommend' } }
        ]
      },
      {
        id: 'refill-reminder',
        name: 'Lembrete de Refil',
        trigger: 'refill_due',
        steps: [
          { id: 'check-refills', type: 'action', name: 'Verificar Refis', config: { action: 'check_pending_refills' }, next: 'send-reminder' },
          { id: 'send-reminder', type: 'message', name: 'Enviar Lembrete', config: { template: 'refill_reminder' }, next: 'offer' },
          { id: 'offer', type: 'message', name: 'Oferecer Compra', config: { template: 'refill_purchase_offer' } }
        ]
      }
    ],
    automations: [
      {
        id: 'adherence-reminder',
        name: 'Lembrete de Adesão',
        type: 'simple',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 9 * * *' } },
        conditions: [{ field: 'has_active_prescription', operator: 'equals', value: true }],
        actions: [
          { type: 'send_message', config: { template: 'adherence_reminder' } }
        ],
        enabled: true
      },
      {
        id: 'prescription-expiry',
        name: 'Vencimento de Receita',
        type: 'simple',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 8 * * *' } },
        conditions: [{ field: 'prescription_days_left', operator: 'less', value: 7 }],
        actions: [
          { type: 'send_message', config: { template: 'prescription_expiring' } },
          { type: 'notify_agent', config: { message: 'Receita expirando em breve' } }
        ],
        enabled: true
      },
      {
        id: 'pharma-escalation',
        name: 'Escalonamento Farmacêutico',
        type: 'simple',
        trigger: { type: 'message', config: { contains_keywords: ['receita', 'controlado', 'interação', 'gravidez', 'dosagem'] } },
        conditions: [],
        actions: [
          { type: 'transfer', config: { queue: 'pharmacy', priority: 'high' } },
          { type: 'notify_agent', config: { message: 'Requere atenção farmacêutica' } }
        ],
        enabled: true
      }
    ],
    ura: {
      id: 'ura-pharma',
      name: 'URA Farmacêutica',
      version: 'main',
      welcomeMessage: 'Olá! Sou a Fran, assistente da Farmácia Francis. Posso ajudar com orientações sobre medicamentos, verificar interações e muito mais.',
      options: [
        { digit: '1', label: 'Informação de Medicamento', description: 'Bula, indicações, contraindicações', nextAction: { type: 'flow', target: 'medication-inquiry' } },
        { digit: '2', label: 'Verificar Interações', description: 'Checar compatibilidade de medicamentos', nextAction: { type: 'flow', target: 'drug-interaction' } },
        { digit: '3', label: 'Agendar Consulta', description: 'Marcar horário com farmacêutico', nextAction: { type: 'flow', target: 'scheduling' } },
        { digit: '4', label: 'Meus Remédios', description: 'Verificar refis e lembretes', nextAction: { type: 'flow', target: 'my-medications' } },
        { digit: '5', label: 'Falar com Farmacêutico', description: 'Orientação personalizada', nextAction: { type: 'transfer', target: 'pharmacy' } },
        { digit: '0', label: 'Emergência Médica', description: 'Orientações urgentes', nextAction: { type: 'flow', target: 'emergency' } }
      ],
      aiEnabled: true,
      escalationTimeout: 20,
      fallbackMessage: 'Vou transferir para nosso farmacêutico de plantão.',
      emergencyDetection: true
    },
    settings: {
      aiModel: 'gpt-4',
      aiTemperature: 0.1,
      maxResponseTokens: 400,
      responseTimeout: 15000,
      humanEscalationAfter: 2,
      autoCloseAfter: 0,
      requireHumanOnSentiment: true,
      requireHumanOnKeywords: ['receita', 'controlado', 'interação', 'gravidez', 'pediátrico', 'idoso'],
      workingHoursEnabled: true,
      workingHours: {
        timezone: 'America/Sao_Paulo',
        schedule: [
          { day: 'monday', start: '08:00', end: '20:00', enabled: true },
          { day: 'tuesday', start: '08:00', end: '20:00', enabled: true },
          { day: 'wednesday', start: '08:00', end: '20:00', enabled: true },
          { day: 'thursday', start: '08:00', end: '20:00', enabled: true },
          { day: 'friday', start: '08:00', end: '20:00', enabled: true },
          { day: 'saturday', start: '08:00', end: '18:00', enabled: true },
          { day: 'sunday', start: '00:00', end: '00:00', enabled: false }
        ],
        holidays: []
      }
    }
  },
  scheduling: {
    id: 'scheduling',
    name: 'Agendamento Inteligente',
    description: 'Template focado em otimização de agenda e redução de no-shows',
    icon: '📅',
    color: 'from-orange-600 to-amber-700',
    features: [
      'Verificação de disponibilidade em tempo real',
      'Sugestão de melhores horários',
      'Confirmação instantânea',
      'Lembretes progressivos',
      'Reagendamento fácil',
      'Lista de espera automática'
    ],
    defaultFlows: [
      {
        id: 'smart-scheduling',
        name: 'Agendamento Inteligente',
        trigger: 'schedule_request',
        steps: [
          { id: 'collect-info', type: 'ai', name: 'Coletar Info', config: { action: 'collect_schedule_info' }, next: 'check-avail' },
          { id: 'check-avail', type: 'action', name: 'Verificar Agenda', config: { action: 'check_availability' }, next: 'suggest' },
          { id: 'suggest', type: 'ai', name: 'Sugerir Horários', config: { action: 'suggest_slots' }, next: 'confirm' },
          { id: 'confirm', type: 'ai', name: 'Confirmar Escolha', config: { action: 'confirm_appointment' }, next: 'book' },
          { id: 'book', type: 'action', name: 'Reservar', config: { action: 'book_appointment' }, next: 'confirm-booking' },
          { id: 'confirm-booking', type: 'message', name: 'Confirmar', config: { template: 'appointment_confirmed' }, next: 'schedule-reminders' },
          { id: 'schedule-reminders', type: 'action', name: 'Agendar Lembretes', config: { action: 'schedule_reminders' } }
        ]
      },
      {
        id: 'reminder-sequence',
        name: 'Sequência de Lembretes',
        trigger: 'appointment_confirmed',
        steps: [
          { id: 'reminder-24h', type: 'wait', name: '24h Antes', config: { duration: 82800000 }, next: 'send-24h' },
          { id: 'send-24h', type: 'message', name: 'Lembrete 24h', config: { template: 'reminder_24h' }, next: 'wait-2h' },
          { id: 'wait-2h', type: 'wait', name: '2h Antes', config: { duration: 7200000 }, next: 'send-2h' },
          { id: 'send-2h', type: 'message', name: 'Lembrete 2h', config: { template: 'reminder_2h' }, next: 'wait-15m' },
          { id: 'wait-15m', type: 'wait', name: '15min Antes', config: { duration: 900000 }, next: 'send-15m' },
          { id: 'send-15m', type: 'message', name: 'Lembrete 15min', config: { template: 'reminder_15m' } }
        ]
      },
      {
        id: 'no-show-recovery',
        name: 'Recuperação de No-Show',
        trigger: 'no_show',
        steps: [
          { id: 'immediate-follow', type: 'message', name: 'Seguir', config: { template: 'no_show_message' }, next: 'offer-reschedule' },
          { id: 'offer-reschedule', type: 'ai', name: 'Oferecer Reagendamento', config: { action: 'offer_reschedule' } }
        ]
      }
    ],
    automations: [
      {
        id: 'confirmation-immediate',
        name: 'Confirmação Imediata',
        type: 'simple',
        trigger: { type: 'event', config: { events: ['appointment_booked'] } },
        conditions: [],
        actions: [
          { type: 'send_message', config: { template: 'appointment_confirmation' } },
          { type: 'create_task', config: { type: 'send_reminders', delay: 0 } }
        ],
        enabled: true
      },
      {
        id: 'waitlist-notification',
        name: 'Notificação Lista de Espera',
        type: 'simple',
        trigger: { type: 'event', config: { events: ['appointment_cancelled'] } },
        conditions: [{ field: 'has_waitlist', operator: 'equals', value: true }],
        actions: [
          { type: 'send_message', config: { template: 'waitlist_notification', priority: 'waitlist_order' } }
        ],
        enabled: true
      },
      {
        id: 'waitlist-upgrade',
        name: 'Promoção na Lista de Espera',
        type: 'simple',
        trigger: { type: 'schedule', config: { type: 'cron', value: '0 7 * * *' } },
        conditions: [{ field: 'waitlist_position', operator: 'equals', value: 1 }],
        actions: [
          { type: 'send_message', config: { template: 'waitlist_upgrade' } }
        ],
        enabled: true
      }
    ],
    ura: {
      id: 'ura-scheduling',
      name: 'URA de Agendamento',
      version: 'main',
      welcomeMessage: 'Olá! Bem-vindo ao agendamento da Farmácia Francis. Posso ajudar você a marcar consultas, verificar disponibilidade e gerenciar seus horários.',
      options: [
        { digit: '1', label: 'Agendar Consulta', description: 'Marcar novo horário', nextAction: { type: 'flow', target: 'smart-scheduling' } },
        { digit: '2', label: 'Meus Agendamentos', description: 'Ver ou cancelar horários', nextAction: { type: 'flow', target: 'my-appointments' } },
        { digit: '3', label: 'Reagendar', description: 'Alterar data ou horário', nextAction: { type: 'flow', target: 'reschedule' } },
        { digit: '4', label: 'Lista de Espera', description: 'Solicitar vaga cancelada', nextAction: { type: 'flow', target: 'waitlist' } },
        { digit: '5', label: 'Informações', description: 'Horários e localização', nextAction: { type: 'flow', target: 'clinic-info' } },
        { digit: '0', label: 'Operador', description: 'Falar com atendente', nextAction: { type: 'transfer', target: 'general' } }
      ],
      aiEnabled: true,
      escalationTimeout: 45,
      fallbackMessage: 'Deixe-me transferir para nossa equipe!',
      emergencyDetection: false
    },
    settings: {
      aiModel: 'gpt-3.5-turbo',
      aiTemperature: 0.2,
      maxResponseTokens: 200,
      responseTimeout: 10000,
      humanEscalationAfter: 3,
      autoCloseAfter: 0,
      requireHumanOnSentiment: false,
      requireHumanOnKeywords: [],
      workingHoursEnabled: true,
      workingHours: {
        timezone: 'America/Sao_Paulo',
        schedule: [
          { day: 'monday', start: '08:00', end: '20:00', enabled: true },
          { day: 'tuesday', start: '08:00', end: '20:00', enabled: true },
          { day: 'wednesday', start: '08:00', end: '20:00', enabled: true },
          { day: 'thursday', start: '08:00', end: '20:00', enabled: true },
          { day: 'friday', start: '08:00', end: '20:00', enabled: true },
          { day: 'saturday', start: '08:00', end: '18:00', enabled: true },
          { day: 'sunday', start: '00:00', end: '00:00', enabled: false }
        ],
        holidays: []
      }
    }
  }
};

export function getTemplate(type: TemplateType): Template | undefined {
  return TEMPLATES[type];
}

export function getAllTemplates(): Template[] {
  return Object.values(TEMPLATES);
}

export function getDefaultTemplate(): Template {
  return TEMPLATES.sales;
}