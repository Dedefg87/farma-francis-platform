import { Node, Edge } from "reactflow";
import { FlowTemplate } from "./types";
import { Clock, UserCheck, Calendar } from "lucide-react";

export const schedulingTemplates: FlowTemplate[] = [
  // ===== TEMPLATE: Lembrete Inteligente de Retorno =====
  {
    id: "recall-automation",
    nodeType: "action",
    name: "🔔 Recall Automático de Clientes",
    description: "Envia lembretes personalizados para clientes inativos com base no histórico",
    icon: Clock,
    color: "bg-yellow-700",
    nodes: [
      { id: "trigger-1", nodeType: "trigger", type: "trigger", position: { x: 100, y: 100 }, data: { label: "⏰ Agendado (Diário)", config: { event: "schedule", schedule: "0 9 * * *", timezone: "America/Sao_Paulo" } } },
      { id: "filter-contacts", nodeType: "action", type: "setVariable", position: { x: 300, y: 100 }, data: { label: "Filtrar Clientes", config: { variableName: "filter", variableValue: "status:finalizado,last_interaction>=7d" } } },
      { id: "ai-personalize", nodeType: "ai", type: "aiAssistant", position: { x: 500, y: 100 }, data: { label: "IA Personaliza Mensagem", config: { systemPrompt: "Personalize uma mensagem de recall para um cliente da farmácia que não compra há 7 dias. Use o nome {{customer.name}} e histórico de compras.", userPrompt: "Crie mensagem personalizada" } } },
      { id: "message-recall", nodeType: "message", type: "message", position: { x: 700, y: 100 }, data: { label: "Enviar Lembrete", config: { message: "Olá {{nome}}! Passando pra saber como você está.\n{{personalized_message}}" } } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "filter-contacts" },
      { id: "e2-3", source: "filter-contacts", target: "ai-personalize" },
      { id: "e3-4", source: "ai-personalize", target: "message-recall" },
    ],
  },

  // ===== TEMPLATE: Agendamento de Consultas =====
  {
    id: "scheduling",
    nodeType: "action",
    name: "Agendamento de Consultas",
    description: "Permite agendamento automático de consultas",
    icon: Calendar,
    color: "bg-purple-600",
    nodes: [
      { id: "trigger-1", nodeType: "trigger", type: "trigger", position: { x: 100, y: 150 }, data: { label: "Solicitar Agendamento", config: { event: "message_received" } } },
      { id: "api-1", nodeType: "action", type: "httpRequest", position: { x: 300, y: 150 }, data: { label: "Verificar Disponibilidade", config: { method: "GET", url: "https://api.farmafrancis.com/availability" } } },
      { id: "message-1", nodeType: "message", type: "message", position: { x: 500, y: 150 }, data: { label: "Mostrar Horários", config: { message: "Horários disponíveis:\n{{httpResponse.slots}}" } } },
      { id: "wait-1", nodeType: "wait", type: "wait", position: { x: 700, y: 150 }, data: { label: "Aguardar Escolha", config: { delay: 600 } } },
      { id: "api-2", nodeType: "action", type: "httpRequest", position: { x: 900, y: 150 }, data: { label: "Confirmar Agendamento", config: { method: "POST", url: "https://api.farmafrancis.com/appointments", body: "{\"slot\": \"{{selected_slot}}\"}" } } },
      { id: "message-2", nodeType: "message", type: "message", position: { x: 1100, y: 100 }, data: { label: "Confirmação", config: { message: "✅ Agendamento confirmado para {{date}} às {{time}}!" } } },
      { id: "notification-1", nodeType: "action", type: "notify", position: { x: 1100, y: 200 }, data: { label: "Enviar Lembrete", config: { alert: "Lembrete de agendamento: {{date}} {{time}}" } } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "api-1" },
      { id: "e2-3", source: "api-1", target: "message-1" },
      { id: "e3-4", source: "message-1", target: "wait-1" },
      { id: "e4-5", source: "wait-1", target: "api-2" },
      { id: "e5-6", source: "api-2", target: "message-2" },
      { id: "e5-7", source: "api-2", target: "notification-1" },
    ],
  },

  // ===== TEMPLATE: Qualificação de Leads =====
  {
    id: "qualification",
    nodeType: "action",
    name: "Qualificação de Leads",
    description: "Qualifica leads automaticamente com perguntas",
    icon: UserCheck,
    color: "bg-green-600",
    nodes: [
      { id: "trigger-1", nodeType: "trigger", type: "trigger", position: { x: 100, y: 150 }, data: { label: "Novo Lead", config: { event: "new_lead" } } },
      { id: "message-1", nodeType: "message", type: "message", position: { x: 300, y: 150 }, data: { label: "Pergunta 1: Interesse", config: { message: "Qual tipo de produto você procura?\n1️⃣ Medicamentos\n2️⃣ Cosméticos\n3️⃣ Suplementos" } } },
      { id: "wait-1", nodeType: "wait", type: "wait", position: { x: 500, y: 150 }, data: { label: "Aguardar Resposta", config: { delay: 300 } } },
      { id: "message-2", nodeType: "message", type: "message", position: { x: 700, y: 150 }, data: { label: "Pergunta 2: Urgência", config: { message: "Quando você precisa?\n1️⃣ Hoje\n2️⃣ Esta semana\n3️⃣ Sem pressa" } } },
      { id: "condition-1", nodeType: "condition", type: "condition", position: { x: 900, y: 100 }, data: { label: "Lead Qualificado?", config: { condition: "score >= 7" } } },
      { id: "crm-1", nodeType: "action", type: "createTicket", position: { x: 1100, y: 50 }, data: { label: "Adicionar ao CRM (Quente)", config: { subject: "Lead Quente: {{customer.name}}", priority: "high" } } },
      { id: "crm-2", nodeType: "action", type: "createTicket", position: { x: 1100, y: 150 }, data: { label: "Adicionar ao CRM (Frio)", config: { subject: "Lead Frio: {{customer.name}}", priority: "low" } } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "message-1" },
      { id: "e2-3", source: "message-1", target: "wait-1" },
      { id: "e3-4", source: "wait-1", target: "message-2" },
      { id: "e4-5", source: "message-2", target: "condition-1" },
      { id: "e5-6", source: "condition-1", target: "crm-1", label: "Sim" },
      { id: "e5-7", source: "condition-1", target: "crm-2", label: "Não" },
    ],
  },
];
