import {
  Zap,
  MessageSquare,
  Bot,
  GitBranch,
  Users,
  Clock,
  Globe,
  Database,
  Settings,
  Phone,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const nodeCategories = [
  {
    category: "Triggers",
    nodes: [
      {
        type: "trigger",
        label: "Trigger",
        icon: <Zap className="w-5 h-5" />,
        description: "Inicia o fluxo",
        color: "#f59e0b",
      },
    ],
  },
  {
    category: "Mensagens",
    nodes: [
      {
        type: "message",
        label: "Mensagem",
        icon: <MessageSquare className="w-5 h-5" />,
        description: "Envia mensagem",
        color: "#3b82f6",
      },
    ],
  },
  {
    category: "IA e Automação",
    nodes: [
      {
        type: "ai",
        label: "Assistente IA",
        icon: <Bot className="w-5 h-5" />,
        description: "Resposta com IA",
        color: "#a855f7",
      },
    ],
  },
  {
    category: "Lógica",
    nodes: [
      {
        type: "condition",
        label: "Condição",
        icon: <GitBranch className="w-5 h-5" />,
        description: "Ramificação condicional",
        color: "#f97316",
      },
      {
        type: "condition",
        label: "Horário Comercial",
        icon: <Clock className="w-5 h-5" />,
        description: "Verifica horário de funcionamento",
        color: "#f97316",
        defaultConfig: {
          condition: "working_hours",
          schedule: {
            mon_sat: { start: "08:00", end: "19:40" },
            sun_holiday: { start: "08:00", end: "11:40" },
          },
        },
      },
      {
        type: "condition",
        label: "Agente Logado",
        icon: <Users className="w-5 h-5" />,
        description: "Verifica se há agente disponível",
        color: "#f97316",
        defaultConfig: {
          condition: "agent_logged_in",
        },
      },
      {
        type: "function",
        label: "Gerar Saudação",
        icon: <Bot className="w-5 h-5" />,
        description: "Gera saudação baseada no horário",
        color: "#a855f7",
        defaultConfig: {
          function: "get_greeting",
        },
      },
    ],
  },
  {
    category: "Atendimento",
    nodes: [
      {
        type: "transfer",
        label: "Transferir",
        icon: <Users className="w-5 h-5" />,
        description: "Transfere para agente",
        color: "#10b981",
      },
      {
        type: "createTicket",
        label: "Criar Ticket",
        icon: <FileText className="w-5 h-5" />,
        description: "Cria ticket",
        color: "#eab308",
      },
      {
        type: "uraMenu",
        label: "Menu URA",
        icon: <Phone className="w-5 h-5" />,
        description: "Menu de opções",
        color: "#14b8a6",
      },
    ],
  },
  {
    category: "Tempo",
    nodes: [
      {
        type: "wait",
        label: "Aguardar",
        icon: <Clock className="w-5 h-5" />,
        description: "Aguarda resposta",
        color: "#ef4444",
      },
      {
        type: "delay",
        label: "Delay",
        icon: <Clock className="w-5 h-5" />,
        description: "Atraso temporal",
        color: "#f56565",
      },
    ],
  },
  {
    category: "Integrações",
    nodes: [
      {
        type: "api",
        label: "HTTP Request",
        icon: <Globe className="w-5 h-5" />,
        description: "Chamada API",
        color: "#2563eb",
      },
    ],
  },
  {
    category: "Dados",
    nodes: [
      {
        type: "set",
        label: "Definir Variável",
        icon: <Database className="w-5 h-5" />,
        description: "Define variável",
        color: "#ec4899",
      },
      {
        type: "function",
        label: "Função",
        icon: <Settings className="w-5 h-5" />,
        description: "Executa função",
        color: "#6366f1",
      },
    ],
  },
];

export default function N8NSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Nós Disponíveis
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Arraste os nós para o canvas para criar seu fluxo
      </p>

      <div className="space-y-6">
        {nodeCategories.map(category => (
          <div key={category.category}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {category.category}
            </h4>
            <div className="space-y-2">
              {category.nodes.map(node => (
                <Card
                  key={node.type}
                  className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={e => onDragStart(e, node.type)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded"
                      style={{ backgroundColor: node.color, color: "white" }}
                    >
                      {node.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {node.label}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {node.description}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
