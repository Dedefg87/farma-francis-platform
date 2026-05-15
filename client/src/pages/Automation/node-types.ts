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
  Receipt as ReceiptIcon, Smartphone, Megaphone, Clipboard, Eye,
  Code, Layers, Archive, Hash, StickyNote, Filter, GitBranch, GitCompare, GitMerge
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
  { id: 'core_triggers', label: 'Core / Triggers', color: 'bg-green-100 text-green-800', icon: Zap },
  { id: 'core_logic', label: 'Core / Lógica', color: 'bg-yellow-100 text-yellow-800', icon: GitBranch },
  { id: 'core_actions', label: 'Core / Ações', color: 'bg-blue-100 text-blue-800', icon: Code },
  { id: 'core_data', label: 'Core / Dados', color: 'bg-indigo-100 text-indigo-800', icon: Database },
  { id: 'integrations', label: 'Integrações / Apps', color: 'bg-cyan-100 text-cyan-800', icon: Globe },
  { id: 'ai_generic', label: 'IA / Genérica', color: 'bg-violet-100 text-violet-800', icon: Brain },
  { id: 'payments', label: 'Pagamentos / Financeiro', color: 'bg-green-100 text-green-800', icon: CreditCardIcon },

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


  // ===== CORE / TRIGGERS =====

  {
    id: 'webhook-trigger',
    type: 'trigger',
    label: '🌐 Webhook',
    description: 'Recebe chamadas HTTP POST/GET para iniciar workflow',
    icon: Globe,
    color: '#10B981',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Payload recebido', type: 'data' }],
    config: [
      { key: 'httpMethod', label: 'Método HTTP', type: 'select', options: [
        { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }, { value: 'ALL', label: 'Todos' },
      ], defaultValue: 'POST' },
      { key: 'path', label: 'Caminho', type: 'string', placeholder: '/webhook/meu-endpoint', defaultValue: '/webhook' },
      { key: 'responseMode', label: 'Modo resposta', type: 'select', options: [
        { value: 'onReceived', label: 'Ao receber' }, { value: 'lastNode', label: 'Último nó' },
      ], defaultValue: 'onReceived' },
      { key: 'responseData', label: 'Dados resposta', type: 'select', options: [
        { value: 'firstEntryJson', label: 'Primeiro item JSON' }, { value: 'noData', label: 'Sem dados' },
      ], defaultValue: 'firstEntryJson' },
    ]
  },

  {
    id: 'schedule-trigger',
    type: 'trigger',
    label: '📅 Schedule (CRON)',
    description: 'Executa workflow em intervalos agendados',
    icon: Clock,
    color: '#059669',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Execução agendada', type: 'data' }],
    config: [
      { key: 'triggerInterval', label: 'Intervalo', type: 'select', options: [
        { value: 'seconds', label: 'Segundos' }, { value: 'minutes', label: 'Minutos' }, { value: 'hours', label: 'Horas' }, { value: 'days', label: 'Dias' }, { value: 'weeks', label: 'Semanas' }, { value: 'months', label: 'Meses' }, { value: 'cron', label: 'Custom (CRON)' },
      ], defaultValue: 'hours' },
      { key: 'intervalValue', label: 'Valor do intervalo', type: 'number', defaultValue: 1 },
      { key: 'cronExpression', label: 'Expressão CRON', type: 'string', placeholder: '0 * * * *' },
      { key: 'timezone', label: 'Timezone', type: 'select', options: [
        { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' }, { value: 'UTC', label: 'UTC' }, { value: 'America/New_York', label: 'New York (EST)' },
      ], defaultValue: 'America/Sao_Paulo' },
    ]
  },

  {
    id: 'email-trigger-imap',
    type: 'trigger',
    label: '📧 Email Trigger (IMAP)',
    description: 'Dispara workflow ao receber email',
    icon: Mail,
    color: '#3B82F6',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Email recebido', type: 'data' }],
    config: [
      { key: 'mailbox', label: 'Caixa de entrada', type: 'string', placeholder: 'INBOX' },
      { key: 'host', label: 'Servidor IMAP', type: 'string', placeholder: 'imap.gmail.com' },
      { key: 'port', label: 'Porta', type: 'number', defaultValue: 993 },
      { key: 'user', label: 'Usuário', type: 'string', placeholder: 'email@gmail.com' },
      { key: 'password', label: 'Senha', type: 'password' },
      { key: 'criteria', label: 'Critério', type: 'select', options: [
        { value: 'ALL', label: 'Todos' }, { value: 'UNSEEN', label: 'Não lidos' }, { value: 'SEEN', label: 'Lidos' },
      ], defaultValue: 'UNSEEN' },
    ]
  },

  {
    id: 'form-trigger',
    type: 'trigger',
    label: '📝 Form Trigger',
    description: 'Dispara workflow ao enviar formulário',
    icon: FileText,
    color: '#8B5CF6',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Dados do formulário', type: 'data' }],
    config: [
      { key: 'formTitle', label: 'Título do formulário', type: 'string', placeholder: 'Meu Formulário' },
      { key: 'formDescription', label: 'Descrição', type: 'string', placeholder: 'Preencha os campos abaixo' },
      { key: 'responseTitle', label: 'Título de resposta', type: 'string', placeholder: 'Obrigado!' },
      { key: 'responseDescription', label: 'Mensagem de resposta', type: 'string', placeholder: 'Seu envio foi recebido.' },
    ]
  },

  {
    id: 'file-trigger',
    type: 'trigger',
    label: '📁 File Trigger',
    description: 'Dispara ao criar/modificar arquivo',
    icon: HardDrive,
    color: '#6366F1',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Arquivo detectado', type: 'data' }],
    config: [
      { key: 'eventType', label: 'Evento', type: 'select', options: [
        { value: 'create', label: 'Criação' }, { value: 'change', label: 'Modificação' }, { value: 'delete', label: 'Exclusão' },
      ], defaultValue: 'create' },
      { key: 'path', label: 'Caminho monitorado', type: 'string', placeholder: '/data/uploads' },
      { key: 'recursive', label: 'Monitorar subpastas', type: 'boolean', defaultValue: false },
    ]
  },

  {
    id: 'rss-trigger',
    type: 'trigger',
    label: '📡 RSS Feed Trigger',
    description: 'Dispara ao atualizar feed RSS',
    icon: Activity,
    color: '#F59E0B',
    category: 'core_triggers',
    outputs: [{ id: 'default', label: 'Novo item RSS', type: 'data' }],
    config: [
      { key: 'feedUrl', label: 'URL do Feed RSS', type: 'string', placeholder: 'https://exemplo.com/feed.xml' },
      { key: 'pollInterval', label: 'Intervalo de verificação (min)', type: 'number', defaultValue: 15 },
    ]
  },

  // ===== CORE / LÓGICA =====

  {
    id: 'if-node',
    type: 'logic',
    label: '🔀 IF',
    description: 'Condicional verdadeiro/falso',
    icon: GitBranch,
    color: '#EAB308',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [
      { id: 'true', label: 'Verdadeiro', type: 'success' },
      { id: 'false', label: 'Falso', type: 'data' },
    ],
    config: [
      { key: 'conditions', label: 'Condições (JSON)', type: 'json', placeholder: '{"conditions": [{"leftValue": "{{$json.status}}", "rightValue": "approved", "operator": "equals"}]}' },
    ]
  },

  {
    id: 'switch-node',
    type: 'logic',
    label: '🔀 Switch',
    description: 'Multi-ramificação por valor',
    icon: GitCompare,
    color: '#F59E0B',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [
      { id: '0', label: 'Caso 1', type: 'success' },
      { id: '1', label: 'Caso 2', type: 'success' },
      { id: '2', label: 'Caso 3', type: 'success' },
      { id: 'default', label: 'Padrão', type: 'data' },
    ],
    config: [
      { key: 'dataType', label: 'Tipo de dado', type: 'select', options: [
        { value: 'string', label: 'Texto' }, { value: 'number', label: 'Número' }, { value: 'boolean', label: 'Booleano' },
      ], defaultValue: 'string' },
      { key: 'outputKey', label: 'Campo de comparação', type: 'string', placeholder: '{{$json.status}}' },
      { key: 'fallbackOutput', label: 'Saída padrão', type: 'select', options: [
        { value: 'none', label: 'Nenhuma' }, { value: 'extra', label: 'Saída extra' },
      ], defaultValue: 'extra' },
    ]
  },

  {
    id: 'filter-node',
    type: 'logic',
    label: '🔍 Filter',
    description: 'Filtra dados por condições',
    icon: Filter,
    color: '#8B5CF6',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [
      { id: 'pass', label: 'Passou', type: 'success' },
      { id: 'fail', label: 'Não passou', type: 'data' },
    ],
    config: [
      { key: 'conditions', label: 'Condições (JSON)', type: 'json', placeholder: '{"conditions": [{"value1": "{{$json.amount}}", "operation": "largerEqual", "value2": 100}]}' },
      { key: 'combineConditions', label: 'Combinar condições', type: 'select', options: [
        { value: 'AND', label: 'E (AND)' }, { value: 'OR', label: 'Ou (OR)' },
      ], defaultValue: 'AND' },
    ]
  },

  {
    id: 'merge-node',
    type: 'logic',
    label: '🔗 Merge',
    description: 'Junta fluxos paralelos',
    icon: GitMerge,
    color: '#06B6D4',
    category: 'core_logic',
    inputs: [{ id: 'in1', label: 'Entrada 1', type: 'data' }, { id: 'in2', label: 'Entrada 2', type: 'data' }],
    outputs: [{ id: 'merged', label: 'Dados mesclados', type: 'success' }],
    config: [
      { key: 'mode', label: 'Modo', type: 'select', options: [
        { value: 'append', label: 'Anexar' }, { value: 'merge', label: 'Mesclar por chave' }, { value: 'multiplex', label: 'Multiplexar' },
      ], defaultValue: 'append' },
      { key: 'join', label: 'Junção', type: 'select', options: [
        { value: 'inner', label: 'Inner Join' }, { value: 'left', label: 'Left Join' }, { value: 'outer', label: 'Outer Join' },
      ], defaultValue: 'inner' },
    ]
  },

  {
    id: 'wait-node',
    type: 'logic',
    label: '⏳ Wait',
    description: 'Pausa o fluxo por tempo definido',
    icon: Clock,
    color: '#64748B',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'out', label: 'Dados de saída', type: 'success' }],
    config: [
      { key: 'amount', label: 'Quantidade', type: 'number', defaultValue: 1 },
      { key: 'unit', label: 'Unidade', type: 'select', options: [
        { value: 'seconds', label: 'Segundos' }, { value: 'minutes', label: 'Minutos' }, { value: 'hours', label: 'Horas' }, { value: 'days', label: 'Dias' },
      ], defaultValue: 'seconds' },
    ]
  },

  {
    id: 'error-handler-node',
    type: 'logic',
    label: '⚠️ Error Handler',
    description: 'Captura e trata erros do fluxo',
    icon: AlertTriangle,
    color: '#EF4444',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Erro recebido', type: 'error' }],
    outputs: [
      { id: 'handled', label: 'Tratado', type: 'success' },
      { id: 'fallback', label: 'Fallback', type: 'data' },
    ],
    config: [
      { key: 'action', label: 'Ação', type: 'select', options: [
        { value: 'continue', label: 'Continuar' }, { value: 'stop', label: 'Parar workflow' }, { value: 'retry', label: 'Tentar novamente' },
      ], defaultValue: 'continue' },
      { key: 'maxRetries', label: 'Máx tentativas', type: 'number', defaultValue: 3 },
    ]
  },

  {
    id: 'stop-error-node',
    type: 'logic',
    label: '🛑 Stop And Error',
    description: 'Para o workflow com erro',
    icon: AlertCircle,
    color: '#DC2626',
    category: 'core_logic',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [],
    config: [
      { key: 'errorMessage', label: 'Mensagem de erro', type: 'string', placeholder: 'Erro no workflow' },
    ]
  },

  // ===== CORE / AÇÕES =====

  {
    id: 'http-request-node',
    type: 'action',
    label: '🔗 HTTP Request',
    description: 'Faz requisições HTTP (GET/POST/PUT/DELETE)',
    icon: Globe,
    color: '#2563EB',
    category: 'core_actions',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resposta', type: 'success' }, { id: 'error', label: 'Erro', type: 'error' }],
    config: [
      { key: 'method', label: 'Método', type: 'select', options: [
        { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }, { value: 'DELETE', label: 'DELETE' },
      ], defaultValue: 'GET' },
      { key: 'url', label: 'URL', type: 'string', placeholder: 'https://api.exemplo.com/endpoint' },
      { key: 'headers', label: 'Headers (JSON)', type: 'json', placeholder: '{"Content-Type": "application/json"}' },
      { key: 'body', label: 'Body (JSON)', type: 'json', placeholder: '{"key": "value"}' },
      { key: 'authType', label: 'Autenticação', type: 'select', options: [
        { value: 'none', label: 'Nenhuma' }, { value: 'basicAuth', label: 'Basic Auth' }, { value: 'headerAuth', label: 'Header Auth' }, { value: 'bearer', label: 'Bearer Token' },
      ], defaultValue: 'none' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 },
      { key: 'followRedirects', label: 'Seguir redirects', type: 'boolean', defaultValue: true },
    ]
  },

  {
    id: 'code-node',
    type: 'action',
    label: '💻 Code',
    description: 'Executa JavaScript/Python customizado',
    icon: Code,
    color: '#7C3AED',
    category: 'core_actions',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resultado', type: 'success' }],
    config: [
      { key: 'language', label: 'Linguagem', type: 'select', options: [
        { value: 'javascript', label: 'JavaScript' }, { value: 'python', label: 'Python' },
      ], defaultValue: 'javascript' },
      { key: 'code', label: 'Código', type: 'prompt', multiline: true, placeholder: 'return items.map(item => ({ json: { ...item.json, processed: true } }));' },
    ]
  },

  {
    id: 'set-node',
    type: 'action',
    label: '📦 Set',
    description: 'Define/manipula valores de dados',
    icon: Settings,
    color: '#0891B2',
    category: 'core_actions',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados modificados', type: 'success' }],
    config: [
      { key: 'mode', label: 'Modo', type: 'select', options: [
        { value: 'manual', label: 'Manual' }, { value: 'expression', label: 'Expressão' },
      ], defaultValue: 'manual' },
      { key: 'fields', label: 'Campos (JSON)', type: 'json', placeholder: '{"nome": "valor", "timestamp": "{{$now}}"}' },
    ]
  },

  {
    id: 'email-send-node',
    type: 'action',
    label: '📧 Email Send',
    description: 'Envia email via SMTP',
    icon: SendIcon,
    color: '#3B82F6',
    category: 'core_actions',
    inputs: [{ id: 'in', label: 'Dados do email', type: 'data' }],
    outputs: [{ id: 'success', label: 'Enviado', type: 'success' }],
    config: [
      { key: 'from', label: 'De', type: 'string', placeholder: 'remetente@email.com' },
      { key: 'to', label: 'Para', type: 'string', placeholder: 'destinatario@email.com' },
      { key: 'subject', label: 'Assunto', type: 'string', placeholder: 'Assunto do email' },
      { key: 'body', label: 'Corpo (HTML)', type: 'prompt', multiline: true, placeholder: '<h1>Olá!</h1>' },
      { key: 'smtpHost', label: 'Servidor SMTP', type: 'string', placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'Porta SMTP', type: 'number', defaultValue: 587 },
      { key: 'smtpUser', label: 'Usuário SMTP', type: 'string' },
      { key: 'smtpPassword', label: 'Senha SMTP', type: 'password' },
    ]
  },

  {
    id: 'execute-workflow-node',
    type: 'action',
    label: '📋 Execute Workflow',
    description: 'Executa outro workflow como sub-fluxo',
    icon: RefreshCw,
    color: '#6366F1',
    category: 'core_actions',
    inputs: [{ id: 'in', label: 'Dados para sub-workflow', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resultado sub-workflow', type: 'success' }],
    config: [
      { key: 'workflowId', label: 'ID do Workflow', type: 'string', placeholder: 'ID do workflow a executar' },
      { key: 'waitForCompletion', label: 'Aguardar conclusão', type: 'boolean', defaultValue: true },
    ]
  },

  // ===== CORE / DADOS =====

  {
    id: 'aggregate-node',
    type: 'action',
    label: '📊 Aggregate',
    description: 'Agrupa dados por campo comum',
    icon: BarChart3,
    color: '#8B5CF6',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados agrupados', type: 'success' }],
    config: [
      { key: 'aggregate', label: 'Agregação', type: 'select', options: [
        { value: 'individualFields', label: 'Campos individuais' }, { value: 'allItemData', label: 'Todos os dados' },
      ], defaultValue: 'individualFields' },
      { key: 'groupByField', label: 'Agrupar por campo', type: 'string', placeholder: '{{$json.category}}' },
    ]
  },

  {
    id: 'split-batches-node',
    type: 'action',
    label: '✂️ Split In Batches',
    description: 'Processa dados em lotes',
    icon: Layers,
    color: '#F59E0B',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'batch', label: 'Lote', type: 'data' }],
    config: [
      { key: 'batchSize', label: 'Tamanho do lote', type: 'number', defaultValue: 10 },
    ]
  },

  {
    id: 'remove-duplicates-node',
    type: 'action',
    label: '🚫 Remove Duplicates',
    description: 'Remove itens duplicados',
    icon: Archive,
    color: '#EF4444',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados únicos', type: 'success' }],
    config: [
      { key: 'compare', label: 'Comparar por', type: 'select', options: [
        { value: 'allFields', label: 'Todos os campos' }, { value: 'selectedFields', label: 'Campos selecionados' },
      ], defaultValue: 'allFields' },
      { key: 'fieldsToCompare', label: 'Campos', type: 'string', placeholder: 'email, nome' },
    ]
  },

  {
    id: 'sort-node',
    type: 'action',
    label: '📋 Sort',
    description: 'Ordena dados por campo',
    icon: TrendingUp,
    color: '#10B981',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados ordenados', type: 'success' }],
    config: [
      { key: 'sortField', label: 'Campo para ordenar', type: 'string', placeholder: '{{$json.date}}' },
      { key: 'sortOrder', label: 'Ordem', type: 'select', options: [
        { value: 'ascending', label: 'Ascendente' }, { value: 'descending', label: 'Descendente' },
      ], defaultValue: 'ascending' },
    ]
  },

  {
    id: 'limit-node',
    type: 'action',
    label: '🔢 Limit',
    description: 'Limita quantidade de itens',
    icon: Hash,
    color: '#64748B',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados limitados', type: 'success' }],
    config: [
      { key: 'maxItems', label: 'Máximo de itens', type: 'number', defaultValue: 10 },
      { key: 'keep', label: 'Manter', type: 'select', options: [
        { value: 'first', label: 'Primeiros' }, { value: 'last', label: 'Últimos' },
      ], defaultValue: 'first' },
    ]
  },

  {
    id: 'summarize-node',
    type: 'action',
    label: '📝 Summarize',
    description: 'Resume dados em estatísticas',
    icon: FileSearch,
    color: '#7C3AED',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resumo', type: 'success' }],
    config: [
      { key: 'fieldsToSummarize', label: 'Campos para resumir', type: 'string', placeholder: 'amount, quantity' },
    ]
  },

  {
    id: 'sticky-note-node',
    type: 'action',
    label: '📌 Sticky Note',
    description: 'Anotação visual no canvas',
    icon: StickyNote,
    color: '#FBBF24',
    category: 'core_data',
    inputs: [],
    outputs: [],
    config: [
      { key: 'content', label: 'Conteúdo', type: 'prompt', multiline: true, placeholder: 'Anotação...' },
      { key: 'color', label: 'Cor', type: 'select', options: [
        { value: 'yellow', label: 'Amarelo' }, { value: 'blue', label: 'Azul' }, { value: 'green', label: 'Verde' }, { value: 'red', label: 'Vermelho' }, { value: 'purple', label: 'Roxo' },
      ], defaultValue: 'yellow' },
    ]
  },

  {
    id: 'merge-by-key-node',
    type: 'action',
    label: '🔑 Merge by Key',
    description: 'Junta dados por chave comum',
    icon: Link2,
    color: '#06B6D4',
    category: 'core_data',
    inputs: [{ id: 'in1', label: 'Entrada 1', type: 'data' }, { id: 'in2', label: 'Entrada 2', type: 'data' }],
    outputs: [{ id: 'merged', label: 'Dados mesclados', type: 'success' }],
    config: [
      { key: 'propertyName', label: 'Nome da chave', type: 'string', placeholder: 'id' },
    ]
  },

  {
    id: 'item-lists-node',
    type: 'action',
    label: '📄 Item Lists',
    description: 'Manipula listas de itens',
    icon: ClipboardList,
    color: '#8B5CF6',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Lista processada', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'concatenate', label: 'Concatenar' }, { value: 'removeDuplicates', label: 'Remover duplicatas' }, { value: 'flatten', label: 'Achatar' },
      ], defaultValue: 'concatenate' },
    ]
  },

  {
    id: 'crypto-node',
    type: 'action',
    label: '🔐 Crypto',
    description: 'Hash, encrypt/decrypt de dados',
    icon: Lock,
    color: '#DC2626',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados processados', type: 'success' }],
    config: [
      { key: 'action', label: 'Ação', type: 'select', options: [
        { value: 'hash', label: 'Hash' }, { value: 'encrypt', label: 'Criptografar' }, { value: 'decrypt', label: 'Descriptografar' }, { value: 'hmac', label: 'HMAC' },
      ], defaultValue: 'hash' },
      { key: 'algorithm', label: 'Algoritmo', type: 'select', options: [
        { value: 'md5', label: 'MD5' }, { value: 'sha256', label: 'SHA-256' }, { value: 'sha512', label: 'SHA-512' }, { value: 'aes-256-cbc', label: 'AES-256-CBC' },
      ], defaultValue: 'sha256' },
      { key: 'field', label: 'Campo', type: 'string', placeholder: 'password' },
    ]
  },

  {
    id: 'datetime-node',
    type: 'action',
    label: '🕐 Date/Time',
    description: 'Manipulação de datas e horários',
    icon: Calendar,
    color: '#0891B2',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Data processada', type: 'success' }],
    config: [
      { key: 'action', label: 'Ação', type: 'select', options: [
        { value: 'format', label: 'Formatar' }, { value: 'add', label: 'Adicionar' }, { value: 'subtract', label: 'Subtrair' }, { value: 'diff', label: 'Diferença' },
      ], defaultValue: 'format' },
      { key: 'field', label: 'Campo de data', type: 'string', placeholder: '{{$json.date}}' },
      { key: 'format', label: 'Formato', type: 'string', placeholder: 'dd/MM/yyyy HH:mm' },
    ]
  },

  {
    id: 'xml-parse-node',
    type: 'action',
    label: '📄 XML Parse',
    description: 'Parse e conversão de XML',
    icon: FileText,
    color: '#7C3AED',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados XML', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados parseados', type: 'success' }],
    config: [
      { key: 'mode', label: 'Modo', type: 'select', options: [
        { value: 'json', label: 'XML para JSON' }, { value: 'xml', label: 'JSON para XML' },
      ], defaultValue: 'json' },
    ]
  },

  {
    id: 'csv-parse-node',
    type: 'action',
    label: '📄 CSV Parse',
    description: 'Parse e conversão de CSV',
    icon: FileSpreadsheet,
    color: '#059669',
    category: 'core_data',
    inputs: [{ id: 'in', label: 'Dados CSV', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados parseados', type: 'success' }],
    config: [
      { key: 'mode', label: 'Modo', type: 'select', options: [
        { value: 'json', label: 'CSV para JSON' }, { value: 'csv', label: 'JSON para CSV' },
      ], defaultValue: 'json' },
      { key: 'delimiter', label: 'Delimitador', type: 'string', placeholder: ',' },
      { key: 'headerRow', label: 'Linha de cabeçalho', type: 'boolean', defaultValue: true },
    ]
  },


  // ===== INTEGRAÇÕES / APPS =====

  {
    id: 'google-sheets',
    type: 'action',
    label: '📊 Google Sheets',
    description: 'Ler e escrever planilhas Google',
    icon: FileSpreadsheet,
    color: '#0F9D58',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados de entrada', type: 'data' }],
    outputs: [{ id: 'success', label: 'Dados da planilha', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'read', label: 'Ler' }, { value: 'write', label: 'Escrever' }, { value: 'append', label: 'Anexar' }, { value: 'delete', label: 'Excluir' },
      ], defaultValue: 'read' },
      { key: 'spreadsheetId', label: 'ID da Planilha', type: 'string', placeholder: 'ID do Google Sheets' },
      { key: 'sheetName', label: 'Nome da Aba', type: 'string', placeholder: 'Sheet1' },
      { key: 'range', label: 'Intervalo', type: 'string', placeholder: 'A1:Z100' },
    ]
  },

  {
    id: 'google-drive',
    type: 'action',
    label: '💾 Google Drive',
    description: 'Upload e download de arquivos',
    icon: HardDrive,
    color: '#4285F4',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados/Arquivo', type: 'data' }],
    outputs: [{ id: 'success', label: 'Arquivo processado', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'upload', label: 'Upload' }, { value: 'download', label: 'Download' }, { value: 'list', label: 'Listar' }, { value: 'delete', label: 'Excluir' },
      ], defaultValue: 'upload' },
      { key: 'fileName', label: 'Nome do arquivo', type: 'string', placeholder: 'arquivo.pdf' },
      { key: 'folderId', label: 'ID da pasta', type: 'string', placeholder: 'ID da pasta no Drive' },
    ]
  },

  {
    id: 'telegram',
    type: 'action',
    label: '💬 Telegram',
    description: 'Envia mensagens via Telegram Bot',
    icon: SendIcon,
    color: '#0088CC',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados da mensagem', type: 'data' }],
    outputs: [{ id: 'success', label: 'Mensagem enviada', type: 'success' }],
    config: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Token do @BotFather' },
      { key: 'chatId', label: 'Chat ID', type: 'string', placeholder: 'ID do chat ou @username' },
      { key: 'text', label: 'Mensagem', type: 'prompt', multiline: true, placeholder: 'Olá! Sua receita está pronta.' },
      { key: 'parseMode', label: 'Formato', type: 'select', options: [
        { value: 'HTML', label: 'HTML' }, { value: 'Markdown', label: 'Markdown' }, { value: 'none', label: 'Texto puro' },
      ], defaultValue: 'HTML' },
    ]
  },

  {
    id: 'discord',
    type: 'action',
    label: '🎮 Discord',
    description: 'Envia mensagens via webhook Discord',
    icon: MessageSquare,
    color: '#5865F2',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados da mensagem', type: 'data' }],
    outputs: [{ id: 'success', label: 'Mensagem enviada', type: 'success' }],
    config: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'string', placeholder: 'https://discord.com/api/webhooks/...' },
      { key: 'content', label: 'Mensagem', type: 'prompt', multiline: true, placeholder: 'Notificação da farmácia' },
      { key: 'username', label: 'Nome do bot', type: 'string', placeholder: 'Farma Bot' },
    ]
  },

  {
    id: 'slack',
    type: 'action',
    label: '💼 Slack',
    description: 'Envia mensagens via Slack API',
    icon: MessageSquare,
    color: '#4A154B',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados da mensagem', type: 'data' }],
    outputs: [{ id: 'success', label: 'Mensagem enviada', type: 'success' }],
    config: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
      { key: 'channel', label: 'Canal', type: 'string', placeholder: '#geral ou C012345' },
      { key: 'text', label: 'Mensagem', type: 'prompt', multiline: true, placeholder: 'Notificação' },
    ]
  },

  {
    id: 'notion',
    type: 'action',
    label: '📝 Notion',
    description: 'Cria e atualiza páginas no Notion',
    icon: FileText,
    color: '#000000',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
    outputs: [{ id: 'success', label: 'Página criada', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'create', label: 'Criar página' }, { value: 'update', label: 'Atualizar' }, { value: 'read', label: 'Ler' }, { value: 'search', label: 'Buscar' },
      ], defaultValue: 'create' },
      { key: 'databaseId', label: 'Database ID', type: 'string', placeholder: 'ID do database' },
      { key: 'title', label: 'Título', type: 'string', placeholder: 'Nova página' },
      { key: 'content', label: 'Conteúdo', type: 'prompt', multiline: true },
    ]
  },

  {
    id: 'airtable',
    type: 'action',
    label: '🗃️ Airtable',
    description: 'CRUD em bases Airtable',
    icon: Database,
    color: '#18BFFF',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
    outputs: [{ id: 'success', label: 'Registro processado', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'create', label: 'Criar' }, { value: 'read', label: 'Ler' }, { value: 'update', label: 'Atualizar' }, { value: 'delete', label: 'Excluir' }, { value: 'list', label: 'Listar' },
      ], defaultValue: 'create' },
      { key: 'baseId', label: 'Base ID', type: 'string', placeholder: 'appXXXXXXXX' },
      { key: 'tableName', label: 'Nome da tabela', type: 'string', placeholder: 'Table 1' },
    ]
  },

  {
    id: 'mysql',
    type: 'action',
    label: '🗄️ MySQL',
    description: 'Queries em banco MySQL',
    icon: Database,
    color: '#4479A1',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resultado da query', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'execute', label: 'Executar query' }, { value: 'insert', label: 'Inserir' }, { value: 'update', label: 'Atualizar' }, { value: 'delete', label: 'Excluir' },
      ], defaultValue: 'execute' },
      { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
      { key: 'port', label: 'Porta', type: 'number', defaultValue: 3306 },
      { key: 'database', label: 'Database', type: 'string', placeholder: 'farma_db' },
      { key: 'user', label: 'Usuário', type: 'string' },
      { key: 'password', label: 'Senha', type: 'password' },
      { key: 'query', label: 'Query SQL', type: 'prompt', multiline: true, placeholder: 'SELECT * FROM products' },
    ]
  },

  {
    id: 'postgresql',
    type: 'action',
    label: '🐘 PostgreSQL',
    description: 'Queries em banco PostgreSQL',
    icon: Database,
    color: '#336791',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resultado da query', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'execute', label: 'Executar query' }, { value: 'insert', label: 'Inserir' }, { value: 'update', label: 'Atualizar' },
      ], defaultValue: 'execute' },
      { key: 'host', label: 'Host', type: 'string', placeholder: 'localhost' },
      { key: 'port', label: 'Porta', type: 'number', defaultValue: 5432 },
      { key: 'database', label: 'Database', type: 'string' },
      { key: 'user', label: 'Usuário', type: 'string' },
      { key: 'password', label: 'Senha', type: 'password' },
      { key: 'query', label: 'Query SQL', type: 'prompt', multiline: true },
    ]
  },

  {
    id: 'github',
    type: 'action',
    label: '🐙 GitHub',
    description: 'Issues, PRs e commits no GitHub',
    icon: GitBranch,
    color: '#333333',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resultado', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'issue', label: 'Criar Issue' }, { value: 'pr', label: 'Criar PR' }, { value: 'commit', label: 'Commit' }, { value: 'read', label: 'Ler' },
      ], defaultValue: 'issue' },
      { key: 'token', label: 'Personal Access Token', type: 'password' },
      { key: 'owner', label: 'Owner', type: 'string', placeholder: 'usuario' },
      { key: 'repo', label: 'Repositório', type: 'string', placeholder: 'repo-name' },
      { key: 'title', label: 'Título', type: 'string' },
      { key: 'body', label: 'Descrição', type: 'prompt', multiline: true },
    ]
  },

  {
    id: 'aws-s3',
    type: 'action',
    label: '☁️ AWS S3',
    description: 'Upload e download de arquivos S3',
    icon: Cloud,
    color: '#FF9900',
    category: 'integrations',
    inputs: [{ id: 'in', label: 'Dados/Arquivo', type: 'data' }],
    outputs: [{ id: 'success', label: 'Arquivo processado', type: 'success' }],
    config: [
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'upload', label: 'Upload' }, { value: 'download', label: 'Download' }, { value: 'list', label: 'Listar' }, { value: 'delete', label: 'Excluir' },
      ], defaultValue: 'upload' },
      { key: 'bucket', label: 'Bucket', type: 'string', placeholder: 'meu-bucket' },
      { key: 'key', label: 'Chave do arquivo', type: 'string', placeholder: 'pasta/arquivo.pdf' },
      { key: 'region', label: 'Região', type: 'string', placeholder: 'us-east-1' },
    ]
  },

  // ===== IA / GENÉRICA =====

  {
    id: 'openai',
    type: 'ai',
    label: '🤖 OpenAI',
    description: 'GPT-4, embeddings, DALL-E via OpenAI API',
    icon: Brain,
    color: '#10A37F',
    category: 'ai_generic',
    inputs: [{ id: 'in', label: 'Prompt/Contexto', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resposta IA', type: 'success' }],
    config: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ], defaultValue: 'gpt-4o' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'prompt', multiline: true, placeholder: 'Você é um assistente útil.' },
      { key: 'userPrompt', label: 'User Prompt', type: 'prompt', multiline: true, placeholder: '{{$json.message}}' },
      { key: 'temperature', label: 'Temperatura (0-2)', type: 'number', defaultValue: 0.7 },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', defaultValue: 2048 },
    ]
  },

  {
    id: 'anthropic',
    type: 'ai',
    label: '🧠 Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Opus via Anthropic API',
    icon: Brain,
    color: '#D4A574',
    category: 'ai_generic',
    inputs: [{ id: 'in', label: 'Prompt/Contexto', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resposta IA', type: 'success' }],
    config: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }, { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      ], defaultValue: 'claude-3-5-sonnet-20241022' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'prompt', multiline: true },
      { key: 'userPrompt', label: 'User Prompt', type: 'prompt', multiline: true },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', defaultValue: 4096 },
    ]
  },

  {
    id: 'google-ai',
    type: 'ai',
    label: '🔮 Google Gemini',
    description: 'Gemini Pro via Google AI API',
    icon: Brain,
    color: '#4285F4',
    category: 'ai_generic',
    inputs: [{ id: 'in', label: 'Prompt/Contexto', type: 'data' }],
    outputs: [{ id: 'success', label: 'Resposta IA', type: 'success' }],
    config: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...' },
      { key: 'model', label: 'Modelo', type: 'select', options: [
        { value: 'gemini-pro', label: 'Gemini Pro' }, { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
      ], defaultValue: 'gemini-pro' },
      { key: 'prompt', label: 'Prompt', type: 'prompt', multiline: true },
    ]
  },

  // ===== PAGAMENTOS / FINANCEIRO =====

  {
    id: 'stripe',
    type: 'action',
    label: '💳 Stripe',
    description: 'Cobranças e assinaturas via Stripe',
    icon: CreditCardIcon,
    color: '#635BFF',
    category: 'payments',
    inputs: [{ id: 'in', label: 'Dados do pagamento', type: 'data' }],
    outputs: [{ id: 'success', label: 'Pagamento processado', type: 'success' }],
    config: [
      { key: 'apiKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'operation', label: 'Operação', type: 'select', options: [
        { value: 'charge', label: 'Cobrar' }, { value: 'refund', label: 'Estornar' }, { value: 'customer', label: 'Criar cliente' }, { value: 'subscription', label: 'Assinatura' },
      ], defaultValue: 'charge' },
      { key: 'amount', label: 'Valor (centavos)', type: 'number', placeholder: '1000' },
      { key: 'currency', label: 'Moeda', type: 'select', options: [
        { value: 'brl', label: 'BRL (Real)' }, { value: 'usd', label: 'USD (Dólar)' },
      ], defaultValue: 'brl' },
      { key: 'description', label: 'Descrição', type: 'string', placeholder: 'Compra na Farmácia' },
    ]
  },

  {
    id: 'twilio',
    type: 'action',
    label: '📱 Twilio',
    description: 'SMS e chamadas via Twilio',
    icon: Phone,
    color: '#F22F46',
    category: 'payments',
    inputs: [{ id: 'in', label: 'Dados da mensagem', type: 'data' }],
    outputs: [{ id: 'success', label: 'SMS enviado', type: 'success' }],
    config: [
      { key: 'accountSid', label: 'Account SID', type: 'string' },
      { key: 'authToken', label: 'Auth Token', type: 'password' },
      { key: 'from', label: 'Número origem', type: 'string', placeholder: '+5511999999999' },
      { key: 'to', label: 'Número destino', type: 'string', placeholder: '+5511999999999' },
      { key: 'message', label: 'Mensagem', type: 'string', placeholder: 'Seu pedido está pronto!' },
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
