import { Node, Edge } from "reactflow";
import { FlowTemplate } from "./types";
import { MessageSquare, Sparkles, Activity, Star } from "lucide-react";

export const communicationTemplates: FlowTemplate[] = [
  // ===== TEMPLATE: Boas-Vindas (welcome) =====
  {
    id: "welcome",
    nodeType: "action",
    name: "Boas-vindas Automáticas",
    description: "Mensagem de boas-vindas personalizada para novos contatos",
    icon: MessageSquare,
    color: "bg-blue-600",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "Novo Contato", config: { event: "new_contact" } },
      },
      {
        id: "condition-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "Horário Comercial?", config: { condition: "working_hours" } },
      },
      {
        id: "message-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 50 },
        data: {
          label: "Boas-vindas Imediato",
          config: { message: "Olá! 👋 Bem-vindo(a) à Farma Francis! Como posso ajudar?" },
        },
      },
      {
        id: "message-2",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 150 },
        data: {
          label: "Boas-vindas Fora de Horário",
          config: { message: "Olá! 👋 Estamos fora do horário de atendimento. Retornaremos em breve!" },
        },
      },
      {
        id: "tag-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 50 },
        data: { label: "Adicionar Tag", config: { action: "add_tag", tag: "novo_cliente" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "condition-1" },
      { id: "e2-3", source: "condition-1", target: "message-1", label: "Sim" },
      { id: "e2-4", source: "condition-1", target: "message-2", label: "Não" },
      { id: "e3-5", source: "message-1", target: "tag-1" },
    ],
  },

  // ===== TEMPLATE: FAQ com IA =====
  {
    id: "faq",
    nodeType: "action",
    name: "FAQ com IA",
    description: "Responde perguntas frequentes usando inteligência artificial",
    icon: Sparkles,
    color: "bg-pink-600",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "Mensagem Recebida", config: { event: "message_received" } },
      },
      {
        id: "condition-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "Contém Pergunta?", config: { condition: "contains_question" } },
      },
      {
        id: "ai-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 50 },
        data: {
          label: "Consultar IA",
          config: {
            model: "gpt-4",
            systemPrompt: "Você é um assistente da Farma Francis. Responda perguntas sobre medicamentos, horários e serviços.",
          },
        },
      },
      {
        id: "message-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 50 },
        data: { label: "Enviar Resposta IA", config: { message: "{{ai_response}}" } },
      },
      {
        id: "human-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 150 },
        data: { label: "Transferir Humano", config: { action: "transfer_to_human" } },
      },
      {
        id: "log-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 900, y: 50 },
        data: { label: "Registrar Interação", config: { action: "log", category: "faq_ia" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "condition-1" },
      { id: "e2-3", source: "condition-1", target: "ai-1", label: "Sim" },
      { id: "e2-4", source: "condition-1", target: "human-1", label: "Não" },
      { id: "e3-4", source: "ai-1", target: "message-1" },
      { id: "e4-5", source: "message-1", target: "log-1" },
    ],
  },

  // ===== TEMPLATE 5: Roteamento Inteligente =====
  {
    id: "smart-routing",
    nodeType: "action",
    name: "👤 Roteamento por Especialidade",
    description: "Roteia atendimentos para o departamento correto baseado em palavras-chave",
    icon: Activity,
    color: "bg-purple-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "📩 Nova Mensagem", config: { event: "message_received" } },
      },
      {
        id: "ai-intent",
        nodeType: "action",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "IA Analisa Intent", config: { action: "detect_intent", keywords: { pharmacist: ["receita", "farmácia"], support: ["troca", "cancelar"], sales: ["preço", "orçamento"], admin: ["gerente", "reclamar"] } } },
      },
      {
        id: "action-route",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Roteear para Agente", config: { action: "assign_agent", fallback: "anderson" } },
      },
      {
        id: "message-routing",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 100 },
        data: { label: "Informar Cliente", config: { message: "Vou transferir você para o {{agente}} 🧑‍⚕️\nTempo estimado: {{tempo_fila}}" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "ai-intent" },
      { id: "e2-3", source: "ai-intent", target: "action-route" },
      { id: "e3-4", source: "action-route", target: "message-routing" },
    ],
  },

  // ===== TEMPLATE 6: Follow-up Pós-Venda =====
  {
    id: "post-sale-followup",
    nodeType: "action",
    name: "📋 Follow-up Pós-Venda",
    description: "Envia pesquisa NPS automática e recomenda produtos após atendimento",
    icon: Star,
    color: "bg-orange-700",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 100 },
        data: { label: "🔄 Atendimento Finalizado", config: { event: "ticket_closed", duration: ">2min" } },
      },
      {
        id: "delay-1",
        nodeType: "wait",
        type: "customNode",
        position: { x: 300, y: 100 },
        data: { label: "Aguardar 30min", config: { delay: 1800 } },
      },
      {
        id: "message-nps",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 100 },
        data: { label: "Enviar NPS", config: { message: "👋 {{nome}}, como foi seu atendimento?\nDe 0 a 10, quanto você recomendaria a gente?", buttons: ["😁", "😐", "🙁"] } },
      },
      {
        id: "ai-analyze",
        nodeType: "action",
        type: "customNode",
        position: { x: 700, y: 100 },
        data: { label: "Analisar Resposta", config: { action: "analyze_nps", tags: { promoter: "Cliente Promotor", neutral: "Cliente Neutro", detractor: "Cliente Detrator" } } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "delay-1" },
      { id: "e2-3", source: "delay-1", target: "message-nps" },
      { id: "e3-4", source: "message-nps", target: "ai-analyze" },
    ],
  },

  // ===== TEMPLATE: Pesquisa de Satisfação =====
  {
    id: "satisfaction",
    nodeType: "action",
    name: "Pesquisa de Satisfação",
    description: "Coleta feedback dos clientes após atendimento",
    icon: Star,
    color: "bg-yellow-600",
    nodes: [
      {
        id: "trigger-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 100, y: 150 },
        data: { label: "Atendimento Finalizado", config: { event: "ticket_closed" } },
      },
      {
        id: "delay-1",
        nodeType: "wait",
        type: "customNode",
        position: { x: 300, y: 150 },
        data: { label: "Aguardar 5min", config: { delay: 300 } },
      },
      {
        id: "message-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 500, y: 150 },
        data: {
          label: "Solicitar Avaliação",
          config: {
            message: "Como foi seu atendimento?\n⭐ 1 - Péssimo\n⭐⭐ 2 - Ruim\n⭐⭐⭐ 3 - Regular\n⭐⭐⭐⭐ 4 - Bom\n⭐⭐⭐⭐⭐ 5 - Excelente",
          },
        },
      },
      {
        id: "wait-1",
        nodeType: "wait",
        type: "customNode",
        position: { x: 700, y: 150 },
        data: { label: "Aguardar Resposta", config: { timeout: 600 } },
      },
      {
        id: "condition-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 900, y: 100 },
        data: { label: "Nota >= 4?", config: { condition: "rating >= 4" } },
      },
      {
        id: "message-2",
        nodeType: "action",
        type: "customNode",
        position: { x: 1100, y: 50 },
        data: { label: "Agradecer", config: { message: "🙏 Obrigado pelo feedback positivo!" } },
      },
      {
        id: "message-3",
        nodeType: "action",
        type: "customNode",
        position: { x: 1100, y: 150 },
        data: { label: "Pedir Detalhes", config: { message: "Sentimos muito. Pode nos contar o que aconteceu?" } },
      },
      {
        id: "database-1",
        nodeType: "action",
        type: "customNode",
        position: { x: 1300, y: 100 },
        data: { label: "Salvar Feedback", config: { action: "save_to_database", table: "feedback" } },
      },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "delay-1" },
      { id: "e2-3", source: "delay-1", target: "message-1" },
      { id: "e3-4", source: "message-1", target: "wait-1" },
      { id: "e4-5", source: "wait-1", target: "condition-1" },
      { id: "e5-6", source: "condition-1", target: "message-2", label: "Sim" },
      { id: "e5-7", source: "condition-1", target: "message-3", label: "Não" },
      { id: "e6-8", source: "message-2", target: "database-1" },
      { id: "e7-8", source: "message-3", target: "database-1" },
    ],
  },
];
