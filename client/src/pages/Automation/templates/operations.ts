import { Node, Edge } from "reactflow";
import { FlowTemplate } from "./types";
import { FileText, BarChart, Bot } from "lucide-react";

export const operationsTemplates: FlowTemplate[] = [
  // ===== TEMPLATE 9: Auditoria e Compliance =====
  {
    id: "audit-compliance",
    nodeType: "action",
    name: "📝 Log de Auditoria",
    description: "Registra todas as ações do sistema para conformidade e detecção de anomalias",
    icon: FileText,
    color: "bg-gray-700",
    nodes: [
      { id: "trigger-1", nodeType: "trigger", type: "trigger", position: { x: 100, y: 100 }, data: { label: "🎯 Ação no Sistema", config: { event: "any_action", log: true } } },
      { id: "action-capture", nodeType: "action", type: "setVariable", position: { x: 300, y: 100 }, data: { label: "Capturar Metadados", config: { variableName: "audit_meta", variableValue: "{{timestamp}},{{agent}},{{action}}" } } },
      { id: "action-store", nodeType: "action", type: "setVariable", position: { x: 500, y: 100 }, data: { label: "Armazenar Log", config: { variableName: "audit_log", variableValue: "{{audit_meta}}" } } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "action-capture" },
      { id: "e2-3", source: "action-capture", target: "action-store" },
    ],
  },

  // ===== TEMPLATE 10: Dashboard de Desempenho =====
  {
    id: "performance-dashboard",
    nodeType: "action",
    name: "📊 Dashboard de Desempenho",
    description: "Coleta métricas de automação e gera relatórios em tempo real",
    icon: BarChart,
    color: "bg-indigo-700",
    nodes: [
      { id: "trigger-1", nodeType: "trigger", type: "trigger", position: { x: 100, y: 100 }, data: { label: "⏰ Agendado (Hora)", config: { event: "schedule", schedule: "0 * * * *", timezone: "America/Sao_Paulo" } } },
      { id: "action-collect", nodeType: "action", type: "httpRequest", position: { x: 300, y: 100 }, data: { label: "Coletar Métricas", config: { method: "GET", url: "https://api.farmafrancis.com/metrics" } } },
      { id: "action-calculate", nodeType: "ai", type: "aiAssistant", position: { x: 500, y: 100 }, data: { label: "Calcular KPIs", config: { systemPrompt: "Calcule KPIs: taxa_automacao, roi, precisos_ia dos dados: {{httpResponse}}" } } },
      { id: "action-notify-admin", nodeType: "action", type: "notify", position: { x: 700, y: 100 }, data: { label: "Notificar Admin", config: { alert: "Relatório: {{aiResponse}}" } } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "action-collect" },
      { id: "e2-3", source: "action-collect", target: "action-calculate" },
      { id: "e3-4", source: "action-calculate", target: "action-notify-admin" },
    ],
  },

  // ===== TEMPLATE: Chatbot de Atendimento =====
  {
    id: "chatbot-atendimento",
    nodeType: "action",
    name: "Chatbot de Atendimento",
    description: "Fluxo inteligente: Horário → Ligação → Finalização → Saudação",
    icon: Bot,
    color: "bg-indigo-600",
    nodes: [
      { id: "trigger-1", type: "trigger", position: { x: 50, y: 200 }, data: { label: "📩 Nova Mensagem", config: { event: "message_received" } } },
      { id: "condition-horario", type: "condition", position: { x: 250, y: 200 }, data: { label: "🕐 Horário Comercial?", config: { condition: "working_hours", schedule: { mon_sat: { start: "08:00", end: "19:40" }, sun_holiday: { start: "08:00", end: "11:40" } } } } },
      { id: "message-fora-horario", type: "message", position: { x: 450, y: 100 }, data: { label: "⛔ Fora de Horário", config: { message: "Nosso horário de atendimento é de 08h as 20h de Segunda a Sábado\nAos Domingos e Feriados de 8h ás 12h\nRetornaremos no próximo horário disponível." } } },
      { id: "condition-ligacao", type: "condition", position: { x: 450, y: 200 }, data: { label: "📞 É Ligação?", config: { condition: 'message_type == "call" || message_type == "video"' } } },
      { id: "message-ligacao", type: "message", position: { x: 650, y: 100 }, data: { label: "❌ Recusar Ligação", config: { message: "Não atendemos ligações de áudio ou vídeo pelo WhatsApp, por favor envie *UMA MENSAGEM* ou ligue pelo no número de telefone 3180-0030 e 3180-0033." } } },
      { id: "condition-venda", type: "condition", position: { x: 650, y: 200 }, data: { label: "💰 Fechou Venda?", config: { condition: 'close_reason == "venda"' } } },
      { id: "message-venda", type: "message", position: { x: 850, y: 150 }, data: { label: "⭐ Pesquisa Venda", config: { message: "Para aperfeiçoar nosso atendimento, nos diga como foi a sua experiência neste atendimento?\n\nDigite 5️⃣ Muito satisfeito 😍\nDigite 4️⃣ Satisfeito 😀\nDigite 3️⃣ Indiferente 😐\nDigite 2️⃣ Insatisfeito ☹️\nDigite 1️⃣ Muito insatisfeito 😞" } } },
      { id: "condition-orcamento", type: "condition", position: { x: 850, y: 250 }, data: { label: "📋 Foi Orçamento?", config: { condition: 'close_reason == "orcamento"' } } },
      { id: "message-orcamento", type: "message", position: { x: 1050, y: 200 }, data: { label: "✅ Agradecer Orçamento", config: { message: "Agradecemos seu contato, e estaremos sempre à disposição.😉" } } },
      { id: "condition-silencio", type: "condition", position: { x: 1050, y: 300 }, data: { label: "🤫 Silêncio?", config: { condition: 'close_reason == "conversa_anterior" || close_reason == "engano"' } } },
      { id: "action-silencio", nodeType: "action", type: "setVariable", position: { x: 1250, y: 250 }, data: { label: "🔇 Não Responder", config: { variableName: "no_response", variableValue: "true" } } },
      { id: "condition-logado", type: "condition", position: { x: 1250, y: 350 }, data: { label: "👤 Agente Logado?", config: { condition: "agent_logged_in" } } },
      { id: "function-saudacao", type: "function", position: { x: 1450, y: 300 }, data: { label: "🌅 Gerar Saudação", config: { function: "get_greeting", variables: { saudacao: "{{greeting}}", nome: "{{agent_name}}" } } } },
      { id: "message-logado", type: "message", position: { x: 1650, y: 300 }, data: { label: "💬 Saudação Personalizada", config: { message: "{{greeting}} eu sou {{agent_name}}, como posso te ajudar?" } } },
      { id: "message-nao-logado", type: "message", position: { x: 1450, y: 400 }, data: { label: "💬 Saudação Genérica", config: { message: "{{greeting}} um momento que já já vamos te atender!" } } },
    ],
    edges: [
      { id: "e1-horario", source: "trigger-1", target: "condition-horario" },
      { id: "e-hora-nao", source: "condition-horario", target: "message-fora-horario", label: "Não" },
      { id: "e-hora-sim", source: "condition-horario", target: "condition-ligacao", label: "Sim" },
      { id: "e-lig-sim", source: "condition-ligacao", target: "message-ligacao", label: "Sim" },
      { id: "e-lig-nao", source: "condition-ligacao", target: "condition-venda", label: "Não" },
      { id: "e-venda-sim", source: "condition-venda", target: "message-venda", label: "Sim" },
      { id: "e-venda-nao", source: "condition-venda", target: "condition-orcamento", label: "Não" },
      { id: "e-orc-sim", source: "condition-orcamento", target: "message-orcamento", label: "Sim" },
      { id: "e-orc-nao", source: "condition-orcamento", target: "condition-silencio", label: "Não" },
      { id: "e-sil-sim", source: "condition-silencio", target: "action-silencio", label: "Sim" },
      { id: "e-sil-nao", source: "condition-silencio", target: "condition-logado", label: "Não" },
      { id: "e-log-sim", source: "condition-logado", target: "function-saudacao", label: "Sim" },
      { id: "e-func-saud", source: "function-saudacao", target: "message-logado" },
      { id: "e-log-nao", source: "condition-logado", target: "message-nao-logado", label: "Não" },
    ],
  },
];
