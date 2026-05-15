import React from "react";
import {
  Upload, FileText, Brain, Pill, Package, MessageSquare, ShieldCheck,
  Calendar, Tag, DollarSign, Truck, UserPlus, Award, ScanLine, Thermometer,
  Stethoscope, Search, Bot, Clock, AlertTriangle, CheckCircle, Camera,
  MapPin, Mail, Phone, Wifi, Database, Lock, Globe, Zap, Heart,
  Activity, BarChart3, ClipboardList, FileCheck, QrCode, CreditCard,
  RefreshCw, Settings, Bell, Users, Building2, Archive, TrendingUp,
  ShoppingCart, Receipt, Syringe, Microscope, BookOpen, Cloud, HardDrive,
  FileX, CreditCard as CreditCardIcon, Store, Video, ShoppingBag,
  Calculator, Send as SendIcon, Shield, FileSearch, BarChart, DollarSign as DollarIcon,
  Link2, ClipboardCheck, AlertCircle, TrendingDown, UserCheck, FileSpreadsheet,
  Receipt as ReceiptIcon, Smartphone, Megaphone, Clipboard, Eye
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
  { id: 'fiscal', label: 'Fiscal / ERP', color: 'bg-amber-100 text-amber-800', icon: FileX },
  { id: 'beneficios', label: 'Financeiro / Benefícios', color: 'bg-lime-100 text-lime-800', icon: CreditCardIcon },
  { id: 'atendimento_ia', label: 'IA / Atendimento', color: 'bg-fuchsia-100 text-fuchsia-800', icon: Bot },
  { id: 'estoque_seg', label: 'Estoque / Segurança', color: 'bg-orange-100 text-orange-800', icon: ClipboardCheck },
  { id: 'automacao_proc', label: 'Automação / Processos', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
  { id: 'ecommerce', label: 'E-commerce / Integração', color: 'bg-violet-100 text-violet-800', icon: Store },
  { id: 'telemedicina', label: 'Saúde / Atendimento', color: 'bg-sky-100 text-sky-800', icon: Video },
  { id: 'marketing_ia', label: 'IA / Marketing', color: 'bg-pink-100 text-pink-800', icon: ShoppingBag },
  { id: 'financeiro_erp', label: 'Financeiro / ERP', color: 'bg-emerald-100 text-emerald-800', icon: Calculator },
  { id: 'comunicacao_mkt', label: 'Comunicação / Marketing', color: 'bg-green-100 text-green-800', icon: Megaphone },
  { id: 'compliance_anvisa', label: 'Compliance / ANVISA', color: 'bg-yellow-100 text-yellow-800', icon: Shield },
  { id: 'saude_ia', label: 'Saúde / IA', color: 'bg-red-100 text-red-800', icon: Clipboard },
  { id: 'analytics', label: 'BI / Analytics', color: 'bg-rose-100 text-rose-800', icon: BarChart },
  { id: 'pagamentos', label: 'Pagamentos / Financeiro', color: 'bg-teal-100 text-teal-800', icon: DollarIcon },
  { id: 'ia_compliance', label: 'IA / Compliance', color: 'bg-purple-100 text-purple-800', icon: Eye },
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
        { value: 'pdf', label: 'PDF' }, { value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' },
      ], defaultValue: ['pdf', 'jpg', 'png'] },
      { key: 'ocrEnabled', label: 'OCR ativado', type: 'boolean', defaultValue: true },
      { key: 'ocrLanguage', label: 'Idioma OCR', type: 'select', options: [
        { value: 'por', label: 'Português' }, { value: 'eng', label: 'Inglês' }, { value: 'spa', label: 'Espanhol' },
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
    inputs: [{ id: 'in', label: 'Pergunta/Contexto', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resposta', type: 'success' }, { id: 'error', label: 'Erro', type: 'error' }],
    config: [
      { key: 'model', label: 'Modelo IA', type: 'select', options: [
        { value: 'gpt-4o', label: 'ChatGPT (OpenAI)' }, { value: 'claude-3-5-sonnet', label: 'Claude (Anthropic)' },
        { value: 'gemini-pro', label: 'Gemini (Google)' }, { value: 'deepseek', label: 'DeepSeek' }, { value: 'mistral', label: 'Mistral' },
      ], defaultValue: 'gpt-4o' },
      { key: 'temperature', label: 'Temperatura (0-2)', type: 'number', defaultValue: 0.3 },
      { key: 'maxTokens', label: 'Limite de tokens', type: 'number', defaultValue: 4096 },
      { key: 'conversationMemory', label: 'Memória de conversa', type: 'boolean', defaultValue: true },
      { key: 'medicalContext', label: 'Contexto médico personalizado', type: 'prompt', multiline: true, placeholder: 'Você é um farmacêutico clínico especializado em...' },
      { key: 'lgpdRestrictions', label: 'Restrições LGPD', type: 'boolean', defaultValue: true },
      { key: 'responseMode', label: 'Tipo de resposta', type: 'select', options: [
        { value: 'technical', label: 'Técnica' }, { value: 'simplified', label: 'Simplificada' },
      ], defaultValue: 'simplified' },
      { key: 'languageTone', label: 'Tom de linguagem', type: 'select', options: [
        { value: 'formal', label: 'Formal' }, { value: 'friendly', label: 'Amigável' }, { value: 'educational', label: 'Educativo' },
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
    inputs: [{ id: 'in', label: 'Imagem/PDF da bula', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados extraídos', type: 'success' }, { id: 'error', label: 'Erro', type: 'error' }],
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
    inputs: [{ id: 'in', label: 'Dados do paciente/sintomas', type: 'data' }],
    outputs: [{ id: 'success', label: 'Sugestão prescrição', type: 'success' }, { id: 'error', label: 'Erro', type: 'error' }],
    config: [
      { key: 'medicalModels', label: 'Modelos médicos IA', type: 'multiselect', options: [
        { value: 'gpt-4o', label: 'GPT-4o Medical' }, { value: 'claude-3-5-sonnet', label: 'Claude Medical' },
        { value: 'meditron', label: 'Meditron (meta)' }, { value: 'biogpt', label: 'BioGPT' },
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
    inputs: [{ id: 'in', label: 'Lista de medicamentos', type: 'data' }],
    outputs: [
      { id: 'safe', label: 'Sem interação', type: 'success' },
      { id: 'warning', label: 'Interação detectada', type: 'data' },
      { id: 'critical', label: 'Interação crítica', type: 'error' }
    ],
    config: [
      { key: 'baseAnvisa', label: 'Base ANVISA', type: 'boolean', defaultValue: true },
      { key: 'baseDrugbank', label: 'Base DrugBank', type: 'boolean', defaultValue: true },
      { key: 'minSeverity', label: 'Severidade mínima', type: 'select', options: [
        { value: 'low', label: 'Baixa' }, { value: 'moderate', label: 'Moderada' }, { value: 'high', label: 'Alta' }, { value: 'critical', label: 'Crítica' },
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
    inputs: [{ id: 'in', label: 'Dados do produto', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Mensagem recebida', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Dados da receita', type: 'data' }],
    outputs: [
      { id: 'approved', label: 'Aprovada', type: 'success' },
      { id: 'rejected', label: 'Rejeitada', type: 'error' },
      { id: 'review', label: 'Revisão manual', type: 'data' }
    ],
    config: [
      { key: 'prescriptionType', label: 'Tipo receita', type: 'select', options: [
        { value: 'A', label: 'Tipo A (azul)' }, { value: 'B', label: 'Tipo B (branca)' }, { value: 'C', label: 'Tipo C (amarela)' }, { value: 'all', label: 'Todos' },
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
    inputs: [{ id: 'in', label: 'Solicitação agendamento', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Dados do cliente/compra', type: 'data' }],
    outputs: [{ id: 'promo', label: 'Promoção aplicada', type: 'success' }, { id: 'none', label: 'Sem promoção', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Código medicamento', type: 'data' }],
    outputs: [{ id: 'found', label: 'Preço encontrado', type: 'success' }, { id: 'notfound', label: 'Não encontrado', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Pedido de entrega', type: 'data' }],
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
      { key: 'coverageArea', label: 'Área cobertura personalizada', type: 'json', placeholder: '{"radius": 10}' },
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
    inputs: [{ id: 'in', label: 'Dados do paciente', type: 'data' }],
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
    inputs: [{ id: 'in', label: 'Dados da compra/cliente', type: 'data' }],
    outputs: [{ id: 'points', label: 'Pontos creditados', type: 'success' }, { id: 'reward', label: 'Recompensa liberada', type: 'success' }],
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
    inputs: [{ id: 'in', label: 'Leitura do sensor', type: 'data' }],
    outputs: [{ id: 'normal', label: 'Temperatura OK', type: 'success' }, { id: 'alert', label: 'Alerta temperatura', type: 'error' }],
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

  // ===== FISCAL / ERP =====

  {
    id: 'emissao-nota-fiscal',
    type: 'action',
    label: '🧾 Emissão de Nota Fiscal Farmacêutica',
    description: 'Emissão de NF-e/NFC-e com integração SEFAZ',
    icon: ReceiptIcon,
    color: '#D97706',
    category: 'fiscal',
    inputs: [{ id: 'in', label: 'Dados da venda', type: 'data' }],
    outputs: [
      { id: 'authorized', label: 'Nota autorizada', type: 'success' },
      { id: 'rejected', label: 'Rejeitada', type: 'error' },
      { id: 'contingency', label: 'Contingência', type: 'data' }
    ],
    config: [
      { key: 'invoiceType', label: 'Tipo nota', type: 'select', options: [
        { value: 'nfe', label: 'NF-e' }, { value: 'nfce', label: 'NFC-e' },
      ], defaultValue: 'nfce' },
      { key: 'certificateType', label: 'Certificado digital', type: 'select', options: [
        { value: 'A1', label: 'A1' }, { value: 'A3', label: 'A3' },
      ], defaultValue: 'A1' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: [
        { value: 'homologation', label: 'Homologação' }, { value: 'production', label: 'Produção' },
      ], defaultValue: 'homologation' },
      { key: 'fiscalSeries', label: 'Série fiscal', type: 'string', placeholder: '001' },
      { key: 'sefazIntegration', label: 'Integração SEFAZ', type: 'boolean', defaultValue: true },
      { key: 'danfePrint', label: 'Impressão DANFE', type: 'boolean', defaultValue: true },
      { key: 'autoCancel', label: 'Cancelamento automático', type: 'boolean', defaultValue: false },
      { key: 'offlineContingency', label: 'Contingência offline', type: 'boolean', defaultValue: true },
      { key: 'accountantIntegration', label: 'Integração contador', type: 'boolean', defaultValue: false },
      { key: 'autoXmlSend', label: 'Envio XML automático', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== FINANCEIRO / BENEFÍCIOS =====

  {
    id: 'consulta-convenios-pbm',
    type: 'action',
    label: '💳 Consulta de Convênios e PBM',
    description: 'Integração com convênios e PBMs para autorização',
    icon: CreditCardIcon,
    color: '#65A30D',
    category: 'beneficios',
    inputs: [{ id: 'in', label: 'Dados do convênio/beneficiário', type: 'data' }],
    outputs: [
      { id: 'approved', label: 'Autorizado', type: 'success' },
      { id: 'rejected', label: 'Negado', type: 'error' },
      { id: 'review', label: 'Revisão manual', type: 'data' }
    ],
    config: [
      { key: 'vidalinkIntegration', label: 'Integração Vidalink', type: 'boolean', defaultValue: true },
      { key: 'funcionalCard', label: 'Funcional Card', type: 'boolean', defaultValue: true },
      { key: 'ephramaIntegration', label: 'Integração ePharma', type: 'boolean', defaultValue: true },
      { key: 'autoAuthorization', label: 'Autorização automática', type: 'boolean', defaultValue: true },
      { key: 'cpfValidation', label: 'Validação CPF', type: 'boolean', defaultValue: true },
      { key: 'benefitLimit', label: 'Limite benefício', type: 'number', defaultValue: 0 },
      { key: 'usageHistory', label: 'Histórico uso', type: 'boolean', defaultValue: true },
      { key: 'convenioCashback', label: 'Cashback convênio', type: 'boolean', defaultValue: false },
      { key: 'discountTable', label: 'Tabela descontos', type: 'json', placeholder: '{"percent": 20}' },
      { key: 'transactionLogs', label: 'Logs transações', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== IA / ATENDIMENTO =====

  {
    id: 'chatbot-farmaceutico-ia',
    type: 'ai',
    label: '🤖 Chatbot Farmacêutico IA',
    description: 'Chatbot inteligente para atendimento farmacêutico',
    icon: Bot,
    color: '#C026D3',
    category: 'atendimento_ia',
    inputs: [{ id: 'in', label: 'Mensagem do cliente', type: 'data' }],
    outputs: [
      { id: 'response', label: 'Resposta', type: 'success' },
      { id: 'human', label: 'Encaminhar humano', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'aiModel', label: 'Modelo IA', type: 'select', options: [
        { value: 'gpt-4o', label: 'ChatGPT' }, { value: 'claude-3-5-sonnet', label: 'Claude' }, { value: 'gemini-pro', label: 'Gemini' },
      ], defaultValue: 'gpt-4o' },
      { key: 'customFlows', label: 'Fluxos personalizados', type: 'json', placeholder: '{"welcome": "Olá! Como posso ajudar?"}' },
      { key: 'pharmaContext', label: 'Contexto farmacêutico', type: 'prompt', multiline: true, placeholder: 'Você é um farmacêutico atendendo clientes...' },
      { key: 'humanFallback', label: 'Atendimento humano fallback', type: 'boolean', defaultValue: true },
      { key: 'naturalVoice', label: 'Voz natural (TTS)', type: 'boolean', defaultValue: false },
      { key: 'multimediaMessages', label: 'Mensagens multimídia', type: 'boolean', defaultValue: true },
      { key: 'trainableFaq', label: 'FAQ treinável', type: 'file', placeholder: 'Arquivo FAQ' },
      { key: 'clientMemory', label: 'Memória cliente', type: 'boolean', defaultValue: true },
      { key: 'businessHours', label: 'Horário funcionamento', type: 'string', placeholder: '08:00-22:00' },
      { key: 'omnichannel', label: 'Integração omnichannel', type: 'boolean', defaultValue: false },
    ]
  },

  // ===== ESTOQUE / SEGURANÇA =====

  {
    id: 'controle-validade-medicamentos',
    type: 'action',
    label: '📅 Controle de Validade de Medicamentos',
    description: 'Monitoramento de validade com alertas e bloqueio',
    icon: ClipboardCheck,
    color: '#C2410C',
    category: 'estoque_seg',
    inputs: [{ id: 'in', label: 'Dados do lote/produto', type: 'data' }],
    outputs: [
      { id: 'ok', label: 'Validade OK', type: 'success' },
      { id: 'warning', label: 'Próximo do vencimento', type: 'data' },
      { id: 'expired', label: 'Vencido', type: 'error' }
    ],
    config: [
      { key: 'expiryAlert', label: 'Alerta vencimento (dias antes)', type: 'number', defaultValue: 30 },
      { key: 'autoBatchSeparation', label: 'Separação automática lotes', type: 'boolean', defaultValue: true },
      { key: 'fifoMethod', label: 'Método', type: 'select', options: [
        { value: 'FIFO', label: 'FIFO (Primeiro a entrar, primeiro a sair)' },
        { value: 'FEFO', label: 'FEFO (Primeiro a vencer, primeiro a sair)' },
      ], defaultValue: 'FEFO' },
      { key: 'lossReports', label: 'Relatórios perdas', type: 'boolean', defaultValue: true },
      { key: 'qrCodeLabels', label: 'Etiquetas QR Code', type: 'boolean', defaultValue: true },
      { key: 'stockIntegration', label: 'Integração estoque', type: 'boolean', defaultValue: true },
      { key: 'blockExpired', label: 'Bloqueio venda vencidos', type: 'boolean', defaultValue: true },
      { key: 'expiryDashboard', label: 'Dashboard validade', type: 'boolean', defaultValue: true },
      { key: 'promotionSuggestion', label: 'Sugestão promoção estoque', type: 'boolean', defaultValue: true },
      { key: 'csvExport', label: 'Exportação CSV', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== AUTOMAÇÃO / PROCESSOS =====

  {
    id: 'workflow-aprovacao-farmaceutica',
    type: 'action',
    label: '✅ Workflow de Aprovação Farmacêutica',
    description: 'Aprovação em etapas com SLA e auditoria',
    icon: RefreshCw,
    color: '#374151',
    category: 'automacao_proc',
    inputs: [{ id: 'in', label: 'Solicitação de aprovação', type: 'data' }],
    outputs: [
      { id: 'approved', label: 'Aprovado', type: 'success' },
      { id: 'rejected', label: 'Reprovado', type: 'error' },
      { id: 'pending', label: 'Pendente', type: 'data' }
    ],
    config: [
      { key: 'multiStepApproval', label: 'Aprovação em etapas', type: 'boolean', defaultValue: true },
      { key: 'multipleResponsibles', label: 'Responsáveis múltiplos', type: 'string', placeholder: 'IDs separados por vírgula' },
      { key: 'digitalSignature', label: 'Assinatura digital', type: 'boolean', defaultValue: true },
      { key: 'approvalSla', label: 'SLA aprovação (horas)', type: 'number', defaultValue: 24 },
      { key: 'internalComments', label: 'Comentários internos', type: 'boolean', defaultValue: true },
      { key: 'auditLogs', label: 'Logs auditoria', type: 'boolean', defaultValue: true },
      { key: 'autoReject', label: 'Reprovação automática (SLA)', type: 'boolean', defaultValue: false },
      { key: 'emailIntegration', label: 'Integração email', type: 'boolean', defaultValue: true },
      { key: 'pendingAlerts', label: 'Alertas pendência', type: 'boolean', defaultValue: true },
      { key: 'changeHistory', label: 'Histórico alterações', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== E-COMMERCE / INTEGRAÇÃO =====

  {
    id: 'integracao-marketplace',
    type: 'action',
    label: '🛒 Integração Marketplace Farmácia',
    description: 'Sincronização com marketplaces (ML, Amazon, etc)',
    icon: Store,
    color: '#7C3AED',
    category: 'ecommerce',
    inputs: [{ id: 'in', label: 'Dados do pedido/produto', type: 'data' }],
    outputs: [
      { id: 'synced', label: 'Sincronizado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'mercadoLivre', label: 'Mercado Livre', type: 'boolean', defaultValue: false },
      { key: 'amazon', label: 'Amazon', type: 'boolean', defaultValue: false },
      { key: 'magalu', label: 'Magalu', type: 'boolean', defaultValue: false },
      { key: 'shopee', label: 'Shopee', type: 'boolean', defaultValue: false },
      { key: 'stockSync', label: 'Sincronização estoque', type: 'boolean', defaultValue: true },
      { key: 'priceUpdate', label: 'Atualização preços', type: 'boolean', defaultValue: true },
      { key: 'autoOrders', label: 'Pedidos automáticos', type: 'boolean', defaultValue: true },
      { key: 'deliveryTracking', label: 'Rastreamento entrega', type: 'boolean', defaultValue: true },
      { key: 'adManagement', label: 'Gestão anúncios', type: 'boolean', defaultValue: false },
      { key: 'customWebhooks', label: 'Webhooks personalizados', type: 'json', placeholder: '{"url": "https://..."}' },
    ]
  },

  // ===== SAÚDE / ATENDIMENTO (TELEMEDICINA) =====

  {
    id: 'teleconsulta-farmaceutica',
    type: 'action',
    label: '📹 Teleconsulta Farmacêutica',
    description: 'Atendimento remoto com vídeo e prescrição digital',
    icon: Video,
    color: '#0284C7',
    category: 'telemedicina',
    inputs: [{ id: 'in', label: 'Solicitação de consulta', type: 'data' }],
    outputs: [
      { id: 'scheduled', label: 'Agendada', type: 'success' },
      { id: 'completed', label: 'Concluída', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'videoCall', label: 'Vídeo chamada', type: 'boolean', defaultValue: true },
      { key: 'integratedChat', label: 'Chat integrado', type: 'boolean', defaultValue: true },
      { key: 'recordConsultation', label: 'Gravação consulta', type: 'boolean', defaultValue: false },
      { key: 'digitalPrescription', label: 'Prescrição digital', type: 'boolean', defaultValue: true },
      { key: 'documentSharing', label: 'Compartilhar documentos', type: 'boolean', defaultValue: true },
      { key: 'virtualWaitingRoom', label: 'Sala espera virtual', type: 'boolean', defaultValue: true },
      { key: 'agendaIntegration', label: 'Integração agenda', type: 'boolean', defaultValue: true },
      { key: 'aiSummary', label: 'IA resumo consulta', type: 'boolean', defaultValue: true },
      { key: 'electronicSignature', label: 'Assinatura eletrônica', type: 'boolean', defaultValue: true },
      { key: 'endToEndEncryption', label: 'Criptografia ponta a ponta', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== IA / MARKETING =====

  {
    id: 'recomendacao-inteligente-produtos',
    type: 'ai',
    label: '🎯 Recomendação Inteligente de Produtos',
    description: 'Cross-sell e upsell com IA baseada em comportamento',
    icon: ShoppingBag,
    color: '#BE185D',
    category: 'marketing_ia',
    inputs: [{ id: 'in', label: 'Dados do cliente/compra', type: 'data' }],
    outputs: [{ id: 'recommendations', label: 'Recomendações', type: 'success' }],
    config: [
      { key: 'crossSell', label: 'Cross-sell', type: 'boolean', defaultValue: true },
      { key: 'upsell', label: 'Upsell', type: 'boolean', defaultValue: true },
      { key: 'aiBehavior', label: 'IA comportamento compra', type: 'boolean', defaultValue: true },
      { key: 'complementaryProducts', label: 'Produtos complementares', type: 'boolean', defaultValue: true },
      { key: 'ageSegmentation', label: 'Segmentação idade', type: 'boolean', defaultValue: false },
      { key: 'diseaseSegmentation', label: 'Segmentação doenças', type: 'boolean', defaultValue: false },
      { key: 'customRules', label: 'Regras personalizadas', type: 'json', placeholder: '{"minPurchase": 50}' },
      { key: 'autoLearning', label: 'Aprendizado automático', type: 'boolean', defaultValue: true },
      { key: 'crmIntegration', label: 'Integração CRM', type: 'boolean', defaultValue: true },
      { key: 'conversionRanking', label: 'Ranking conversão', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== FINANCEIRO / ERP (CAIXA) =====

  {
    id: 'controle-caixa',
    type: 'action',
    label: '💵 Controle de Caixa',
    description: 'Gestão financeira de caixa com múltiplos operadores',
    icon: Calculator,
    color: '#047857',
    category: 'financeiro_erp',
    inputs: [{ id: 'in', label: 'Transação', type: 'data' }],
    outputs: [
      { id: 'completed', label: 'Concluído', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'openCloseCash', label: 'Abertura/fechamento caixa', type: 'boolean', defaultValue: true },
      { key: 'sangria', label: 'Sangria', type: 'boolean', defaultValue: true },
      { key: 'multiOperators', label: 'Multioperadores', type: 'boolean', defaultValue: true },
      { key: 'pixIntegration', label: 'PIX integrado', type: 'boolean', defaultValue: true },
      { key: 'cardIntegration', label: 'Cartão crédito/débito', type: 'boolean', defaultValue: true },
      { key: 'financialReports', label: 'Relatórios financeiros', type: 'boolean', defaultValue: true },
      { key: 'transactionAudit', label: 'Auditoria transações', type: 'boolean', defaultValue: true },
      { key: 'tefIntegration', label: 'Integração TEF', type: 'boolean', defaultValue: false },
      { key: 'salesDashboard', label: 'Dashboard vendas', type: 'boolean', defaultValue: true },
      { key: 'accountingExport', label: 'Exportação contábil', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== COMUNICAÇÃO / MARKETING =====

  {
    id: 'disparo-sms-notificacoes',
    type: 'action',
    label: '📱 Disparo de SMS e Notificações',
    description: 'Campanhas de SMS, push e WhatsApp em massa',
    icon: Megaphone,
    color: '#15803D',
    category: 'comunicacao_mkt',
    inputs: [{ id: 'in', label: 'Lista de destinatários/mensagem', type: 'data' }],
    outputs: [
      { id: 'sent', label: 'Enviado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'bulkSms', label: 'SMS em massa', type: 'boolean', defaultValue: true },
      { key: 'pushNotifications', label: 'Push notifications', type: 'boolean', defaultValue: true },
      { key: 'whatsappApi', label: 'WhatsApp API', type: 'boolean', defaultValue: true },
      { key: 'customerSegmentation', label: 'Segmentação clientes', type: 'boolean', defaultValue: true },
      { key: 'sendTime', label: 'Horário envio', type: 'string', placeholder: '09:00' },
      { key: 'customTemplates', label: 'Templates personalizados', type: 'json', placeholder: '{"welcome": "Olá {{nome}}!"}' },
      { key: 'openTracking', label: 'Rastreamento abertura', type: 'boolean', defaultValue: true },
      { key: 'shortLinks', label: 'Links curtos', type: 'boolean', defaultValue: true },
      { key: 'autoCampaigns', label: 'Campanhas automáticas', type: 'boolean', defaultValue: true },
      { key: 'dispatchLimit', label: 'Limite disparos', type: 'number', defaultValue: 1000 },
    ]
  },

  // ===== COMPLIANCE / ANVISA (SNGPC) =====

  {
    id: 'controle-sngpc',
    type: 'action',
    label: '📋 Controle SNGPC',
    description: 'Envio automático de dados para ANVISA/SNGPC',
    icon: Shield,
    color: '#A16207',
    category: 'compliance_anvisa',
    inputs: [{ id: 'in', label: 'Dados de movimentação', type: 'data' }],
    outputs: [
      { id: 'sent', label: 'Enviado', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'autoSendAnvisa', label: 'Envio automático ANVISA', type: 'boolean', defaultValue: true },
      { key: 'movementRegistration', label: 'Registro movimentações', type: 'boolean', defaultValue: true },
      { key: 'controlledInventory', label: 'Inventário controlados', type: 'boolean', defaultValue: true },
      { key: 'inconsistencyCorrection', label: 'Correção inconsistências', type: 'boolean', defaultValue: true },
      { key: 'digitalCertificate', label: 'Certificado digital', type: 'password', placeholder: 'Senha do certificado' },
      { key: 'auditLogs', label: 'Logs auditoria', type: 'boolean', defaultValue: true },
      { key: 'officialReports', label: 'Relatórios oficiais', type: 'boolean', defaultValue: true },
      { key: 'autoBackup', label: 'Backup automático', type: 'boolean', defaultValue: true },
      { key: 'rejectionAlerts', label: 'Alertas rejeição', type: 'boolean', defaultValue: true },
      { key: 'dailySync', label: 'Sincronização diária', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== SAÚDE / IA (ANAMNESE) =====

  {
    id: 'formulario-anamnese-inteligente',
    type: 'action',
    label: '📝 Formulário Inteligente de Anamnese',
    description: 'Anamnese dinâmica com IA e fluxos condicionais',
    icon: Clipboard,
    color: '#B91C1C',
    category: 'saude_ia',
    inputs: [{ id: 'in', label: 'Dados do paciente', type: 'data' }],
    outputs: [
      { id: 'completed', label: 'Formulário preenchido', type: 'success' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'dynamicFields', label: 'Campos dinâmicos', type: 'boolean', defaultValue: true },
      { key: 'aiInterpretation', label: 'IA interpretação respostas', type: 'boolean', defaultValue: true },
      { key: 'conditionalFlows', label: 'Fluxos condicionais', type: 'boolean', defaultValue: true },
      { key: 'examUpload', label: 'Upload exames', type: 'boolean', defaultValue: true },
      { key: 'patientSignature', label: 'Assinatura paciente', type: 'boolean', defaultValue: true },
      { key: 'riskScore', label: 'Score risco', type: 'boolean', defaultValue: true },
      { key: 'pdfExport', label: 'Exportação PDF', type: 'boolean', defaultValue: true },
      { key: 'prontuarioIntegration', label: 'Integração prontuário', type: 'boolean', defaultValue: true },
      { key: 'reusableTemplates', label: 'Templates reutilizáveis', type: 'file' },
      { key: 'mobileResponsive', label: 'Modo mobile responsivo', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== BI / ANALYTICS =====

  {
    id: 'dashboard-analitico-farmaceutico',
    type: 'action',
    label: '📊 Dashboard Analítico Farmacêutico',
    description: 'BI com KPIs, gráficos e previsão de demanda',
    icon: BarChart,
    color: '#E11D48',
    category: 'analytics',
    inputs: [{ id: 'in', label: 'Dados para análise', type: 'data' }],
    outputs: [{ id: 'report', label: 'Relatório gerado', type: 'success' }],
    config: [
      { key: 'realtimeCharts', label: 'Gráficos em tempo real', type: 'boolean', defaultValue: true },
      { key: 'salesKpis', label: 'KPIs vendas', type: 'boolean', defaultValue: true },
      { key: 'stockKpis', label: 'KPIs estoque', type: 'boolean', defaultValue: true },
      { key: 'productHeatmap', label: 'Heatmap produtos', type: 'boolean', defaultValue: true },
      { key: 'branchComparison', label: 'Comparação filiais', type: 'boolean', defaultValue: false },
      { key: 'excelPdfExport', label: 'Exportação Excel/PDF', type: 'boolean', defaultValue: true },
      { key: 'advancedFilters', label: 'Filtros avançados', type: 'boolean', defaultValue: true },
      { key: 'aiDemandForecast', label: 'IA previsão demanda', type: 'boolean', defaultValue: true },
      { key: 'autoReports', label: 'Relatórios automáticos', type: 'boolean', defaultValue: true },
      { key: 'darkMode', label: 'Dark mode', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== PAGAMENTOS / FINANCEIRO (PIX) =====

  {
    id: 'integracao-pix-automatico',
    type: 'action',
    label: '🔗 Integração PIX Automático',
    description: 'PIX com QR Code dinâmico, conciliação e split',
    icon: DollarIcon,
    color: '#0F766E',
    category: 'pagamentos',
    inputs: [{ id: 'in', label: 'Dados do pagamento', type: 'data' }],
    outputs: [
      { id: 'paid', label: 'Pago', type: 'success' },
      { id: 'pending', label: 'Pendente', type: 'data' },
      { id: 'error', label: 'Erro', type: 'error' }
    ],
    config: [
      { key: 'bankApi', label: 'Banco integração API', type: 'select', options: [
        { value: 'itau', label: 'Itaú' }, { value: 'bradesco', label: 'Bradesco' },
        { value: 'santander', label: 'Santander' }, { value: 'bb', label: 'Banco do Brasil' },
      ], defaultValue: 'itau' },
      { key: 'dynamicQrCode', label: 'QR Code dinâmico', type: 'boolean', defaultValue: true },
      { key: 'autoReconciliation', label: 'Conciliação automática', type: 'boolean', defaultValue: true },
      { key: 'splitPayment', label: 'Split pagamento', type: 'boolean', defaultValue: false },
      { key: 'webhookConfirmation', label: 'Webhook confirmação', type: 'string', placeholder: 'URL webhook' },
      { key: 'chargeExpiry', label: 'Expiração cobrança (min)', type: 'number', defaultValue: 30 },
      { key: 'autoRefund', label: 'Estorno automático', type: 'boolean', defaultValue: false },
      { key: 'multiAccounts', label: 'Multi contas', type: 'boolean', defaultValue: false },
      { key: 'pixRecurring', label: 'PIX recorrente', type: 'boolean', defaultValue: false },
      { key: 'financialLogs', label: 'Logs financeiros', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== IA / COMPLIANCE (AUDITORIA) =====

  {
    id: 'auditoria-inteligente-ia',
    type: 'ai',
    label: '🔍 Auditoria Inteligente IA',
    description: 'Detecção de fraude e padrões suspeitos com IA',
    icon: Eye,
    color: '#7E22CE',
    category: 'ia_compliance',
    inputs: [{ id: 'in', label: 'Dados para auditoria', type: 'data' }],
    outputs: [
      { id: 'clean', label: 'Sem anomalias', type: 'success' },
      { id: 'alert', label: 'Anomalia detectada', type: 'error' }
    ],
    config: [
      { key: 'fraudDetection', label: 'Detecção fraude', type: 'boolean', defaultValue: true },
      { key: 'suspiciousPatterns', label: 'Verificação padrões suspeitos', type: 'boolean', defaultValue: true },
      { key: 'fullLogs', label: 'Logs completos', type: 'boolean', defaultValue: true },
      { key: 'autoAlerts', label: 'Alertas automáticos', type: 'boolean', defaultValue: true },
      { key: 'aiBehaviorAnalysis', label: 'IA análise comportamento', type: 'boolean', defaultValue: true },
      { key: 'auditReports', label: 'Relatórios auditoria', type: 'boolean', defaultValue: true },
      { key: 'userTracking', label: 'Rastreamento usuário', type: 'boolean', defaultValue: true },
      { key: 'operationRiskScore', label: 'Score risco operação', type: 'boolean', defaultValue: true },
      { key: 'erpIntegration', label: 'Integração ERP', type: 'boolean', defaultValue: false },
      { key: 'complianceExport', label: 'Exportação compliance', type: 'boolean', defaultValue: true },
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
