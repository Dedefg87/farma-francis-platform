import { Node, Edge } from "reactflow";
import { FlowTemplate } from "./types";
import { Bot, FileText, AlertTriangle, Shield, Package } from "lucide-react";

export const pharmacyTemplates: FlowTemplate[] = [
  // ===== TEMPLATE 1: Recepcionista Digital Inteligente =====
  {
    id: "receptionist-ia",
    nodeType: "action",
    name: "🤖 Boas-Vindas Omnichannel com IA",
    description: "Recepcionista digital que envia boas-vindas personalizadas, cria contatos e atribui agentes",
    icon: Bot,
    color: "bg-blue-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📩 Nova Mensagem (WA/IG)", config: { event: "message_received", channels: ["whatsapp", "instagram"] } },
      },
      {
        id: "condition-new-contact",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "É Novo Contato?", config: { condition: "is_new_contact" } },
      },
      {
        id: "condition-working-hours",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Horário Comercial?", config: { condition: "working_hours", schedule: { start: "08:00", end: "18:00" } } },
      },
      {
        id: "message-welcome",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 50 },
        data: {
          label: "Enviar Boas-Vindas",
          config: {
            message: "Olá {{nome}}, aqui é da Farma Francis 💊\nEm que posso ajudar?\n1️⃣ Comprar medicamento\n2️⃣ Falar com farmacêutico\n3️⃣ Consultar pedido",
            buttons: ["1", "2", "3"],
          },
        },
      },
      {
        id: "action-create-contact",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 150 },
        data: { label: "Criar Contato", config: { action: "create_contact", tags: ["Novo Cliente"], origin: "{{channel}}" } },
      },
      {
        id: "action-assign-agent",
        nodeType: "action",
        type: "customNode",
        position: { x: 900, y: 100 },
        data: { label: "Atribuir Agente", config: { action: "assign_agent", queue: "general", fallback: "plantao" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "condition-new-contact" },
      { id: "e2-3", source: "condition-new-contact", target: "condition-working-hours", label: "Sim" },
      { id: "e3-4", source: "condition-working-hours", target: "message-welcome", label: "Sim" },
      { id: "e3-5", source: "condition-working-hours", target: "action-assign-agent", label: "Não (Plantão)" },
      { id: "e4-5", source: "message-welcome", target: "action-create-contact" },
      { id: "e5-6", source: "action-create-contact", target: "action-assign-agent" },
    ],
  },

  // ===== TEMPLATE 2: Triage de Receita Médica =====
  {
    id: "receipt-triage",
    nodeType: "action",
    name: "💊 Detector de Receita com IA",
    description: "Classifica receitas médicas, valida documentos e encaminha para farmacêuticos",
    icon: FileText,
    color: "bg-green-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📎 Documento Anexado", config: { event: "document_received", types: ["pdf", "image"] } },
      },
      {
        id: "ai-classify",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "IA Classifica Documento", config: { action: "ai_classify", types: ["receita", "exame", "rg", "comprovante"] } },
      },
      {
        id: "condition-controlled",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 50 },
        data: { label: "Receita Controlada?", config: { condition: "receipt_type == 'controlled'" } },
      },
      {
        id: "action-create-task",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 50 },
        data: { label: "Criar Tarefa Urgente", config: { action: "create_task", priority: "high", assignee: "pharmacist_1", title: "📋 Validar receita de {{nome}}" } },
      },
      {
        id: "action-notify",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 150 },
        data: { label: "Notificar Admin", config: { action: "notify_admin", sound: true } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ai-classify" },
      { id: "e2-3", source: "ai-classify", target: "condition-controlled" },
      { id: "e3-4", source: "condition-controlled", target: "action-create-task", label: "Sim" },
      { id: "e3-5", source: "condition-controlled", target: "action-notify", label: "Sim" },
    ],
  },

  // ===== TEMPLATE 3: Urgência Médica Detector =====
  {
    id: "urgency-detector",
    nodeType: "action",
    name: "🚨 Alerta de Urgência Médica",
    description: "Detecta palavras de urgência, prioriza atendimento e notifica agentes",
    icon: AlertTriangle,
    color: "bg-red-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📩 Mensagem Recebida", config: { event: "message_received" } },
      },
      {
        id: "ai-urgency",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "IA Detecta Urgência", config: { action: "detect_urgency", keywords: ["urgência", "emergência", "dor forte", "sangrando"] } },
      },
      {
        id: "action-prioritize",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Priorizar URGENTE", config: { action: "add_tag", tag: "🚨 URGENTE", color: "#e74c3c" } },
      },
      {
        id: "action-notify-agents",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 100 },
        data: { label: "Notificar Agentes", config: { action: "notify_all_agents", alert: "🔴 URGÊNCIA — {{nome}}", repeat: 30 },
        },
      },
      {
        id: "message-urgency",
        nodeType: "action",
        type: "customNode",
        position: { x: 900, y: 100 },
        data: { label: "Responder Urgência", config: { message: "🔴 Estamos vendo sua mensagem com URGÊNCIA.\nUm farmacêutico vai te responder INSTANTANEAMENTE.\nSe for emergência médica, ligue 192." } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ai-urgency" },
      { id: "e2-3", source: "ai-urgency", target: "action-prioritize", label: "Sim" },
      { id: "e3-4", source: "action-prioritize", target: "action-notify-agents" },
      { id: "e4-5", source: "action-notify-agents", target: "message-urgency" },
    ],
  },

  // ===== TEMPLATE 7: Anti-Fraude =====
  {
    id: "anti-fraud",
    nodeType: "action",
    name: "🛡️ Validador de Documentos",
    description: "Valida documentos com IA e detecta possíveis fraudes",
    icon: Shield,
    color: "bg-teal-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📎 Documento Anexado", config: { event: "document_received", types: ["image/jpeg", "image/png"] } },
      },
      {
        id: "ai-vision",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "IA Analisa Documento", config: { action: "vision_analyze", extract: ["nome", "CPF", "data_nascimento"] } },
      },
      {
        id: "condition-fraud",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Score de Risco", config: { condition: "fraud_score > 60" } },
      },
      {
        id: "action-block",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 50 },
        data: { label: "Bloquear Cadastro", config: { action: "block_account", notify: "anderson" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ai-vision" },
      { id: "e2-3", source: "ai-vision", target: "condition-fraud" },
      { id: "e3-4", source: "condition-fraud", target: "action-block", label: "Alto Risco" },
    ],
  },

  // ===== TEMPLATE 8: Notificação de Estoque =====
  {
    id: "stock-notification",
    nodeType: "action",
    name: "📦 Alerta de Estoque",
    description: "Notifica clientes na fila de espera quando medicamento chega",
    icon: Package,
    color: "bg-cyan-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📡 Webhook Estoque", config: { event: "stock_updated", medicine: "{{medicine}}" } },
      },
      {
        id: "filter-waitlist",
        nodeType: "filter",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "Buscar Fila de Espera", config: { filter: "waiting_for: {{medicine}}", limit: 10 } },
      },
      {
        id: "message-stock",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Notificar Cliente", config: { message: "🎉 {{nome}}, a {{medicine}} chegou!\n📦 {{quantity}} unidades disponíveis.\nQuer reservar o seu? Responda SIM! 👇" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "filter-waitlist" },
      { id: "e2-3", source: "filter-waitlist", target: "message-stock" },
    ],
  },
];
