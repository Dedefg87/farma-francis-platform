import React from "react";
import {
  Upload, FileText, Brain, Pill, Package, MessageSquare, ShieldCheck,
  Calendar, Tag, DollarSign, Truck, UserPlus, Award, ScanLine, Thermometer,
  Stethoscope, Search, Bot, Clock, AlertTriangle, CheckCircle, Camera,
  MapPin, Mail, Phone, Wifi, Database, Lock, Globe, Zap, Heart,
  Activity, BarChart3, ClipboardList, FileCheck, QrCode, CreditCard,
  RefreshCw, Settings, Bell, Users, Building2, Archive, TrendingUp,
  ShoppingCart, Receipt, Syringe, Microscope, BookOpen, Cloud, HardDrive
} from "lucide-react";

// ==================== TYPES ====================

export interface NodeError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

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
  errors?: NodeError[];
}

export interface NodePort {
  id: string;
  label: string;
  type: 'data' | 'trigger' | 'error' | 'success';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'prompt' | 'password' | 'file' | 'multiselect';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
  multiline?: boolean;
}

// ==================== CATEGORIES ====================

export const CATEGORIES = [
  { id: 'entrada', label: 'Entrada / Documentos / Compliance', color: 'bg-blue-100 text-blue-800', icon: FileCheck },
  { id: 'ia', label: 'IA / Assistente Clínico', color: 'bg-purple-100 text-purple-800', icon: Brain },
  { id: 'saude', label: 'Saúde / Segurança', color: 'bg-red-100 text-red-800', icon: Heart },
  { id: 'erp', label: 'ERP / Estoque', color: 'bg-orange-100 text-orange-800', icon: Package },
  { id: 'comunicacao', label: 'Comunicação / Automação', color: 'bg-green-100 text-green-800', icon: MessageSquare },
  { id: 'compliance', label: 'Compliance / Validação', color: 'bg-yellow-100 text-yellow-800', icon: ShieldCheck },
  { id: 'agenda', label: 'Agenda / Saúde', color: 'bg-cyan-100 text-cyan-800', icon: Calendar },
  { id: 'marketing', label: 'Marketing / IA', color: 'bg-pink-100 text-pink-800', icon: TrendingUp },
  { id: 'financeiro', label: 'Financeiro / Regulatório', color: 'bg-emerald-100 text-emerald-800', icon: DollarSign },
  { id: 'logistica', label: 'Logística / Delivery', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  { id: 'crm', label: 'CRM / Saúde', color: 'bg-teal-100 text-teal-800', icon: UserPlus },
  { id: 'iot', label: 'IoT / Compliance', color: 'bg-slate-100 text-slate-800', icon: Thermometer },
];

// ==================== NODE DEFINITIONS ====================

export const NODE_TYPES: WorkflowNode[] = [

  // ===== ENTRADA / DOCUMENTOS / COMPLIANCE =====

  {
    id: 'recebimento-receita-digital',
    type: 'trigger',
    label: '📄 Recebimento de Receita Digital',
    description: 'Recebe e processa receitas digitais com OCR e validação',
    icon: FileCheck,
    color: '#2563EB',
    category: 'entrada',
    outputs: [
      { id: 'success', label: 'Receita processada', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'allowedFormats', label: 'Formatos aceitos', type: 'multiselect', options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'jpg', label: 'JPG' },
        { value: 'png', label: 'PNG' },
      ], defaultValue: ['pdf', 'jpg', 'png'] },
      { key: 'ocrEnabled', label: 'OCR ativado', type: 'boolean', defaultValue: true },
      { key: 'ocrLanguage', label: 'Idioma OCR', type: 'select', options: [
        { value: 'por', label: 'Português' },
        { value: 'eng', label: 'Inglês' },
        { value: 'spa', label: 'Espanhol' },
      ], defaultValue: 'por' },
      { key: 'maxFileSize', label: 'Limite tamanho arquivo (MB)', type: 'number', defaultValue: 10 },
      { key: 'autoValidateCrm', label: 'Validação automática CRM/CRO', type: 'boolean', defaultValue: true },
      { key: 'digitalSignature', label: 'Assinatura digital ICP-Brasil', type: 'boolean', defaultValue: true },
      { key: 'anvisaVerification', label: 'Verificação ANVISA', type: 'boolean', defaultValue: true },
      { key: 'extractMedications', label: 'Extração automática de medicamentos', type: 'boolean', defaultValue: true },
      { key: 'whatsappIntegration', label: 'Integração WhatsApp/API', type: 'boolean', defaultValue: false },
      { key: 'encryptedStorage', label: 'Armazenamento criptografado', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== IA / ASSISTENTE CLÍNICO =====

  {
    id: 'ia-farmaceutica',
    type: 'ai',
    label: '🧠 IA Farmacêutica',
    description: 'Assistente IA especializado em farmácia clínica',
    icon: Brain,
    color: '#9333EA',
    category: 'ia',
    inputs: [
      { id: 'in', label: 'Pergunta/Contexto', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Resposta', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'model', label: 'Modelo IA', type: 'select', options: [
        { value: 'gpt-4o', label: 'ChatGPT (OpenAI)' },
        { value: 'claude-3-5-sonnet', label: 'Claude (Anthropic)' },
        { value: 'gemini-pro', label: 'Gemini (Google)' },
        { value: 'deepseek', label: 'DeepSeek' },
        { value: 'mistral', label: 'Mistral' },
      ], defaultValue: 'gpt-4o' },
      { key: 'temperature', label: 'Temperatura (0-2)', type: 'number', defaultValue: 0.3 },
      { key: 'maxTokens', label: 'Limite de tokens', type: 'number', defaultValue: 4096 },
      { key: 'conversationMemory', label: 'Memória de conversa', type: 'boolean', defaultValue: true },
      { key: 'medicalContext', label: 'Contexto médico personalizado', type: 'prompt', multiline: true, placeholder: 'Você é um farmacêutico clínico especializado em...' },
      { key: 'lgpdRestrictions', label: 'Restrições LGPD', type: 'boolean', defaultValue: true },
      { key: 'responseMode', label: 'Tipo de resposta', type: 'select', options: [
        { value: 'technical', label: 'Técnica' },
        { value: 'simplified', label: 'Simplificada' },
      ], defaultValue: 'simplified' },
      { key: 'languageTone', label: 'Tom de linguagem', type: 'select', options: [
        { value: 'formal', label: 'Formal' },
        { value: 'friendly', label: 'Amigável' },
        { value: 'educational', label: 'Educativo' },
      ], defaultValue: 'friendly' },
      { key: 'knowledgeBase', label: 'Base de conhecimento própria', type: 'file', placeholder: 'URL ou arquivo da base' },
      { key: 'sopTraining', label: 'Treinamento com SOP da farmácia', type: 'file', placeholder: 'URL ou arquivo do SOP' },
    ]
  },

  {
    id: 'leitor-ocr-bulas',
    type: 'ai',
    label: '📖 Leitor OCR de Bulas',
    description: 'Extrai e analisa informações de bulas com OCR e IA',
    icon: ScanLine,
    color: '#7C3AED',
    category: 'ia',
    inputs: [
      { id: 'in', label: 'Imagem/PDF da bula', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Dados extraídos', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'ocrMultilingual', label: 'OCR multilíngue', type: 'boolean', defaultValue: true },
      { key: 'extractPosology', label: 'Extração posologia', type: 'boolean', defaultValue: true },
      { key: 'extractContraindications', label: 'Extração contraindicações', type: 'boolean', defaultValue: true },
      { key: 'voiceConversion', label: 'Conversão voz (TTS)', type: 'boolean', defaultValue: false },
      { key: 'aiSummary', label: 'Resumo IA', type: 'boolean', defaultValue: true },
      { key: 'smartSearch', label: 'Busca inteligente', type: 'boolean', defaultValue: true },
      { key: 'highlightRisks', label: 'Destaque riscos', type: 'boolean', defaultValue: true },
      { key: 'autoTranslate', label: 'Tradução automática', type: 'boolean', defaultValue: false },
      { key: 'exportPdf', label: 'Exportação PDF', type: 'boolean', defaultValue: true },
      { key: 'chatbotIntegration', label: 'Integração chatbot', type: 'boolean', defaultValue: false },
    ]
  },

  {
    id: 'prescricao-inteligente-ia',
    type: 'ai',
    label: '💊 Prescrição Inteligente IA',
    description: 'Apoio clínico com IA para sugestão de medicamentos e posologia',
    icon: Stethoscope,
    color: '#A855F7',
    category: 'ia',
    inputs: [
      { id: 'in', label: 'Dados do paciente/sintomas', type: 'data' }
    ],
    outputs: [
      { id: 'success', label: 'Sugestão prescrição', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'medicalModels', label: 'Modelos médicos IA', type: 'multiselect', options: [
        { value: 'gpt-4o', label: 'GPT-4o Medical' },
        { value: 'claude-3-5-sonnet', label: 'Claude Medical' },
        { value: 'meditron', label: 'Meditron (meta)' },
        { value: 'biogpt', label: 'BioGPT' },
      ] },
      { key: 'suggestMedications', label: 'Sugestão medicamentos', type: 'boolean', defaultValue: true },
      { key: 'interactionAlerts', label: 'Alertas interação', type: 'boolean', defaultValue: true },
      { key: 'clinicalProtocols', label: 'Base protocolos clínicos', type: 'file' },
      { key: 'autoCid', label: 'CID automático', type: 'boolean', defaultValue: false },
      { key: 'autoPosology', label: 'Posologia automática', type: 'boolean', defaultValue: true },
      { key: 'generatePdf', label: 'Geração PDF', type: 'boolean', defaultValue: true },
      { key: 'prontuarioIntegration', label: 'Integração prontuário', type: 'boolean', defaultValue: false },
      { key: 'controlledRestriction', label: 'Restrição controlados', type: 'boolean', defaultValue: true },
      { key: 'prescriptionHistory', label: 'Histórico prescrições', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== SAÚDE / SEGURANÇA =====

  {
    id: 'consulta-interacao-medicamentosa',
    type: 'action',
    label: '⚠️ Consulta de Interação Medicamentosa',
    description: 'Verifica interações entre medicamentos com bases oficiais',
    icon: AlertTriangle,
    color: '#DC2626',
    category: 'saude',
    inputs: [
      { id: 'in', label: 'Lista de medicamentos', type: 'data' }
    ],
    outputs: [
      { id: 'safe', label: 'Sem interação', type: 'success' },
      { id: 'warning', label: 'Interação detectada', type: 'data' },
      { id: 'critical', label: 'Interação crítica', type: 'error' }
    ],
    config: [
      { key: 'baseAnvisa', label: 'Base ANVISA', type: 'boolean', defaultValue: true },
      { key: 'baseDrugbank', label: 'Base DrugBank', type: 'boolean', defaultValue: true },
      { key: 'minSeverity', label: 'Severidade mínima', type: 'select', options: [
        { value: 'low', label: 'Baixa' },
        { value: 'moderate', label: 'Moderada' },
        { value: 'high', label: 'Alta' },
        { value: 'critical', label: 'Crítica' },
      ], defaultValue: 'moderate' },
      { key: 'criticalAlerts', label: 'Alertas críticos', type: 'boolean', defaultValue: true },
      { key: 'foodInteraction', label: 'Interações alimento-remédio', type: 'boolean', defaultValue: true },
      { key: 'alcoholInteraction', label: 'Interação álcool', type: 'boolean', defaultValue: true },
      { key: 'autoBula', label: 'Exibir bula automática', type: 'boolean', defaultValue: true },
      { key: 'riskScore', label: 'Score de risco', type: 'boolean', defaultValue: true },
      { key: 'pediatricMode', label: 'Modo pediátrico', type: 'boolean', defaultValue: false },
      { key: 'checkHistory', label: 'Histórico de verificações', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== ERP / ESTOQUE =====

  {
    id: 'controle-estoque-inteligente',
    type: 'action',
    label: '📦 Controle de Estoque Inteligente',
    description: 'Gestão de estoque com IA, alertas e integração ERP',
    icon: Package,
    color: '#EA580C',
    category: 'erp',
    inputs: [
      { id: 'in', label: 'Dados do produto', type: 'data' }
    ],
    outputs: [
      { id: 'ok', label: 'Estoque OK', type: 'success' },
      { id: 'low', label: 'Estoque baixo', type: 'data' },
      { id: 'critical', label: 'Estoque crítico', type: 'error' }
    ],
    config: [
      { key: 'minStock', label: 'Estoque mínimo', type: 'number', defaultValue: 10 },
      { key: 'maxStock', label: 'Estoque máximo', type: 'number', defaultValue: 1000 },
      { key: 'autoAlert', label: 'Alerta automático', type: 'boolean', defaultValue: true },
      { key: 'erpIntegration', label: 'Integração ERP', type: 'boolean', defaultValue: false },
      { key: 'batchControl', label: 'Controle lote', type: 'boolean', defaultValue: true },
      { key: 'expiryControl', label: 'Controle validade', type: 'boolean', defaultValue: true },
      { key: 'branchSeparation', label: 'Separação por filial', type: 'boolean', defaultValue: false },
      { key: 'abcCurve', label: 'Curva ABC', type: 'boolean', defaultValue: true },
      { key: 'aiPurchaseSuggestion', label: 'Sugestão de compra IA', type: 'boolean', defaultValue: true },
      { key: 'realtimeSync', label: 'Sincronização tempo real', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== COMUNICAÇÃO / AUTOMAÇÃO =====

  {
    id: 'atendimento-whatsapp',
    type: 'action',
    label: '💬 Atendimento WhatsApp Farmácia',
    description: 'Automação completa de atendimento via WhatsApp',
    icon: MessageSquare,
    color: '#16A34A',
    category: 'comunicacao',
    inputs: [
      { id: 'in', label: 'Mensagem recebida', type: 'data' }
    ],
    outputs: [
      { id: 'auto', label: 'Resposta automática', type: 'success' },
      { id: 'human', label: 'Encaminhado humano', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'whatsappCloudApi', label: 'API WhatsApp Cloud', type: 'password', placeholder: 'Token da API' },
      { key: 'autoResponse', label: 'Resposta automática', type: 'boolean', defaultValue: true },
      { key: 'interactiveMenu', label: 'Menu interativo', type: 'boolean', defaultValue: true },
      { key: 'forwardHuman', label: 'Encaminhar humano', type: 'boolean', defaultValue: true },
      { key: 'businessHours', label: 'Horário atendimento', type: 'string', placeholder: '08:00-18:00' },
      { key: 'uploadPrescription', label: 'Upload receita', type: 'boolean', defaultValue: true },
      { key: 'medicationCatalog', label: 'Catálogo medicamentos', type: 'boolean', defaultValue: true },
      { key: 'integratedIa', label: 'IA integrada', type: 'boolean', defaultValue: true },
      { key: 'audioToText', label: 'Áudio para texto', type: 'boolean', defaultValue: false },
      { key: 'campaignDispatch', label: 'Disparo de campanhas', type: 'boolean', defaultValue: false },
    ]
  },

  // ===== COMPLIANCE / VALIDAÇÃO =====

  {
    id: 'verificacao-receita-controlada',
    type: 'action',
    label: '🔒 Verificação de Receita Controlada',
    description: 'Validação completa de receitas controladas com auditoria',
    icon: ShieldCheck,
    color: '#CA8A04',
    category: 'compliance',
    inputs: [
      { id: 'in', label: 'Dados da receita', type: 'data' }
    ],
    outputs: [
      { id: 'approved', label: 'Aprovada', type: 'success' },
      { id: 'rejected', label: 'Rejeitada', type: 'error' },
      { id: 'review', label: 'Revisão manual', type: 'data' }
    ],
    config: [
      { key: 'prescriptionType', label: 'Tipo receita', type: 'select', options: [
        { value: 'A', label: 'Tipo A (azul)' },
        { value: 'B', label: 'Tipo B (branca)' },
        { value: 'C', label: 'Tipo C (amarela)' },
        { value: 'all', label: 'Todos' },
      ], defaultValue: 'all' },
      { key: 'signatureCheck', label: 'Conferência assinatura', type: 'boolean', defaultValue: true },
      { key: 'crmCheck', label: 'Conferência CRM', type: 'boolean', defaultValue: true },
      { key: 'expiryDate', label: 'Data validade receita', type: 'boolean', defaultValue: true },
      { key: 'maxQuantity', label: 'Quantidade máxima', type: 'boolean', defaultValue: true },
      { key: 'cpfValidation', label: 'Validação CPF paciente', type: 'boolean', defaultValue: true },
      { key: 'autoRegisterSale', label: 'Registro automático venda', type: 'boolean', defaultValue: true },
      { key: 'geolocation', label: 'Captura geolocalização', type: 'boolean', defaultValue: false },
      { key: 'auditLog', label: 'Registro auditoria', type: 'boolean', defaultValue: true },
      { key: 'sngpcIntegration', label: 'Integração SNGPC', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== AGENDA / SAÚDE =====

  {
    id: 'agendamento-vacinacao',
    type: 'action',
    label: '💉 Agendamento de Vacinação',
    description: 'Sistema completo de agendamento de vacinas',
    icon: Syringe,
    color: '#0891B2',
    category: 'agenda',
    inputs: [
      { id: 'in', label: 'Solicitação agendamento', type: 'data' }
    ],
    outputs: [
      { id: 'scheduled', label: 'Agendado', type: 'success' },
      { id: 'waitlist', label: 'Fila de espera', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'integratedCalendar', label: 'Calendário integrado', type: 'boolean', defaultValue: true },
      { key: 'unitSelection', label: 'Escolha unidade', type: 'boolean', defaultValue: true },
      { key: 'doseControl', label: 'Controle doses', type: 'boolean', defaultValue: true },
      { key: 'whatsappConfirmation', label: 'Confirmação WhatsApp', type: 'boolean', defaultValue: true },
      { key: 'autoReminder', label: 'Lembrete automático', type: 'boolean', defaultValue: true },
      { key: 'patientRegistration', label: 'Cadastro paciente', type: 'boolean', defaultValue: true },
      { key: 'waitlist', label: 'Fila de espera', type: 'boolean', defaultValue: true },
      { key: 'onlinePayment', label: 'Pagamento online', type: 'boolean', defaultValue: false },
      { key: 'qrCheckin', label: 'QR Check-in', type: 'boolean', defaultValue: true },
      { key: 'googleCalendar', label: 'Integração Google Calendar', type: 'boolean', defaultValue: false },
    ]
  },

  // ===== MARKETING / IA =====

  {
    id: 'motor-promocoes-inteligentes',
    type: 'action',
    label: '🏷️ Motor de Promoções Inteligentes',
    description: 'Promoções personalizadas com IA e segmentação',
    icon: Tag,
    color: '#DB2777',
    category: 'marketing',
    inputs: [
      { id: 'in', label: 'Dados do cliente/compra', type: 'data' }
    ],
    outputs: [
      { id: 'promo', label: 'Promoção aplicada', type: 'success' },
      { id: 'none', label: 'Sem promoção', type: 'data' }
    ],
    config: [
      { key: 'cashback', label: 'Cashback', type: 'boolean', defaultValue: true },
      { key: 'progressiveDiscount', label: 'Desconto progressivo', type: 'boolean', defaultValue: true },
      { key: 'aiOffers', label: 'IA para ofertas', type: 'boolean', defaultValue: true },
      { key: 'customerSegmentation', label: 'Segmentação clientes', type: 'boolean', defaultValue: true },
      { key: 'autoCoupon', label: 'Cupom automático', type: 'boolean', defaultValue: true },
      { key: 'timeBasedCampaigns', label: 'Campanhas por horário', type: 'boolean', defaultValue: false },
      { key: 'promoValidity', label: 'Validade promoção', type: 'string', placeholder: '30 dias' },
      { key: 'relatedProducts', label: 'Produtos relacionados', type: 'boolean', defaultValue: true },
      { key: 'conditionalRules', label: 'Regras condicionais', type: 'json', placeholder: '{"minValue": 100, "discount": 10}' },
      { key: 'limitPerCpf', label: 'Limite por CPF', type: 'number', defaultValue: 1 },
    ]
  },

  // ===== FINANCEIRO / REGULATÓRIO =====

  {
    id: 'consulta-preco-cmed',
    type: 'action',
    label: '💰 Consulta de Preço CMED',
    description: 'Consulta e monitoramento de preços CMED',
    icon: DollarSign,
    color: '#059669',
    category: 'financeiro',
    inputs: [
      { id: 'in', label: 'Código medicamento', type: 'data' }
    ],
    outputs: [
      { id: 'found', label: 'Preço encontrado', type: 'success' },
      { id: 'notfound', label: 'Não encontrado', type: 'data' }
    ],
    config: [
      { key: 'autoUpdate', label: 'Atualização automática', type: 'boolean', defaultValue: true },
      { key: 'profitMargin', label: 'Margem lucro (%)', type: 'number', defaultValue: 30 },
      { key: 'competitorComparison', label: 'Comparação concorrência', type: 'boolean', defaultValue: true },
      { key: 'regionalTable', label: 'Tabela regional', type: 'boolean', defaultValue: false },
      { key: 'priceHistory', label: 'Histórico preços', type: 'boolean', defaultValue: true },
      { key: 'changeAlerts', label: 'Alertas alteração', type: 'boolean', defaultValue: true },
      { key: 'erpIntegration', label: 'Integração ERP', type: 'boolean', defaultValue: false },
      { key: 'discountSimulation', label: 'Simulação descontos', type: 'boolean', defaultValue: true },
      { key: 'auditReport', label: 'Relatório auditoria', type: 'boolean', defaultValue: true },
      { key: 'excelExport', label: 'Exportação Excel', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== LOGÍSTICA / DELIVERY =====

  {
    id: 'entrega-delivery-inteligente',
    type: 'action',
    label: '🚚 Entrega Delivery Inteligente',
    description: 'Gestão de entregas com múltiplas integrações',
    icon: Truck,
    color: '#4F46E5',
    category: 'logistica',
    inputs: [
      { id: 'in', label: 'Pedido de entrega', type: 'data' }
    ],
    outputs: [
      { id: 'dispatched', label: 'Despachado', type: 'success' },
      { id: 'tracking', label: 'Rastreamento', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'ifoodIntegration', label: 'Integração iFood', type: 'boolean', defaultValue: false },
      { key: 'uberDirectIntegration', label: 'Integração Uber Direct', type: 'boolean', defaultValue: false },
      { key: 'gpsTracking', label: 'Rastreamento GPS', type: 'boolean', defaultValue: true },
      { key: 'freightCalc', label: 'Cálculo frete', type: 'boolean', defaultValue: true },
      { key: 'expressDelivery', label: 'Entrega expressa', type: 'boolean', defaultValue: true },
      { key: 'deliveryWindow', label: 'Janela entrega', type: 'string', placeholder: '2h' },
      { key: 'digitalSignature', label: 'Assinatura digital recebimento', type: 'boolean', defaultValue: true },
      { key: 'aiRouting', label: 'Roteirização IA', type: 'boolean', defaultValue: true },
      { key: 'realtimeStatus', label: 'Status em tempo real', type: 'boolean', defaultValue: true },
      { key: 'coverageArea', label: 'Área cobertura personalizada', type: 'json', placeholder: '{"radius": 10, "center": [-23.55, -46.63]}' },
    ]
  },

  // ===== CRM / SAÚDE =====

  {
    id: 'cadastro-paciente',
    type: 'action',
    label: '👤 Cadastro de Paciente',
    description: 'Cadastro completo de pacientes com dados clínicos',
    icon: UserPlus,
    color: '#0D9488',
    category: 'crm',
    inputs: [
      { id: 'in', label: 'Dados do paciente', type: 'data' }
    ],
    outputs: [
      { id: 'created', label: 'Cadastrado', type: 'success' },
      { id: 'updated', label: 'Atualizado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'cpfRequired', label: 'CPF obrigatório', type: 'boolean', defaultValue: true },
      { key: 'susCard', label: 'Cartão SUS', type: 'boolean', defaultValue: true },
      { key: 'patientPhoto', label: 'Foto paciente', type: 'boolean', defaultValue: false },
      { key: 'clinicalHistory', label: 'Histórico clínico', type: 'boolean', defaultValue: true },
      { key: 'medicationAllergies', label: 'Alergias medicamentosas', type: 'boolean', defaultValue: true },
      { key: 'lgpdConsent', label: 'Consentimento LGPD', type: 'boolean', defaultValue: true },
      { key: 'multipleAddresses', label: 'Endereços múltiplos', type: 'boolean', defaultValue: true },
      { key: 'dependents', label: 'Dependentes', type: 'boolean', defaultValue: true },
      { key: 'documentUpload', label: 'Upload documentos', type: 'boolean', defaultValue: true },
      { key: 'loyaltyScore', label: 'Score fidelidade', type: 'boolean', defaultValue: true },
    ]
  },

  {
    id: 'programa-fidelidade',
    type: 'action',
    label: '⭐ Programa de Fidelidade',
    description: 'Gestão de pontos, cashback e recompensas',
    icon: Award,
    color: '#0F766E',
    category: 'crm',
    inputs: [
      { id: 'in', label: 'Dados da compra/cliente', type: 'data' }
    ],
    outputs: [
      { id: 'points', label: 'Pontos creditados', type: 'success' },
      { id: 'reward', label: 'Recompensa liberada', type: 'success' }
    ],
    config: [
      { key: 'pointsPerPurchase', label: 'Pontos por compra', type: 'boolean', defaultValue: true },
      { key: 'cashback', label: 'Cashback', type: 'boolean', defaultValue: true },
      { key: 'vipLevels', label: 'Níveis VIP', type: 'boolean', defaultValue: true },
      { key: 'autoRewards', label: 'Recompensas automáticas', type: 'boolean', defaultValue: true },
      { key: 'pointsExpiry', label: 'Expiração pontos', type: 'string', placeholder: '365 dias' },
      { key: 'appIntegration', label: 'Integração app', type: 'boolean', defaultValue: false },
      { key: 'personalizedCoupons', label: 'Cupons personalizados', type: 'boolean', defaultValue: true },
      { key: 'customerRanking', label: 'Ranking clientes', type: 'boolean', defaultValue: true },
      { key: 'monthlyGoal', label: 'Meta mensal', type: 'boolean', defaultValue: false },
      { key: 'autoRedeem', label: 'Resgate automático', type: 'boolean', defaultValue: false },
    ]
  },

  // ===== IoT / COMPLIANCE =====

  {
    id: 'monitoramento-temperatura',
    type: 'action',
    label: '🌡️ Monitoramento de Temperatura',
    description: 'Monitoramento IoT de temperatura para medicamentos',
    icon: Thermometer,
    color: '#64748B',
    category: 'iot',
    inputs: [
      { id: 'in', label: 'Leitura do sensor', type: 'data' }
    ],
    outputs: [
      { id: 'normal', label: 'Temperatura OK', type: 'success' },
      { id: 'alert', label: 'Alerta temperatura', type: 'error' }
    ],
    config: [
      { key: 'iotSensors', label: 'Sensores IoT', type: 'string', placeholder: 'IDs dos sensores' },
      { key: 'smsAlerts', label: 'Alertas SMS', type: 'boolean', defaultValue: true },
      { key: 'tempHistory', label: 'Histórico temperatura', type: 'boolean', defaultValue: true },
      { key: 'minTemp', label: 'Limite mínimo (°C)', type: 'number', defaultValue: 2 },
      { key: 'maxTemp', label: 'Limite máximo (°C)', type: 'number', defaultValue: 8 },
      { key: 'autoReports', label: 'Relatórios automáticos', type: 'boolean', defaultValue: true },
      { key: 'cloudBackup', label: 'Backup nuvem', type: 'boolean', defaultValue: true },
      { key: 'fridgeMonitoring', label: 'Monitoramento geladeiras', type: 'boolean', defaultValue: true },
      { key: 'anvisaAudit', label: 'Auditoria ANVISA', type: 'boolean', defaultValue: true },
      { key: 'realtimeDashboard', label: 'Dashboard tempo real', type: 'boolean', defaultValue: true },
      { key: 'mqttIntegration', label: 'Integração MQTT', type: 'string', placeholder: 'mqtt://broker:1883' },
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
