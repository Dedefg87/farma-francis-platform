import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Search, FileText, ShoppingCart, Zap, 
  ArrowRight, CheckCircle, Clock,
  AlertTriangle, Shield, Package, BarChart, Bot
} from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  steps: string[];
  conversionRate?: string;
  avgTime?: string;
}

const templates: Template[] = [
  // ===== TEMPLATE 1: Recepcionista Digital =====
  {
    id: "receptionist-ia",
    title: "🤖 Boas-Vindas Omnichannel com IA",
    description: "Recepcionista digital que envia boas-vindas personalizadas, cria contatos e atribui agentes automaticamente",
    icon: <MessageCircle className="w-6 h-6 text-blue-700" />,
    category: "Atendimento",
    steps: ["Nova mensagem (WA/IG)", "Verifica se é novo contato", "Envia boas-vindas", "Cria contato no sistema", "Atribui agente disponível"],
    conversionRate: "85%",
    avgTime: "0.5min"
  },
  // ===== TEMPLATE 2: Triage de Receita =====
  {
    id: "receipt-triage",
    title: "💊 Detector de Receita com IA",
    description: "Classifica receitas médicas, valida documentos e encaminha para farmacêuticos",
    icon: <FileText className="w-6 h-6 text-green-700" />,
    category: "Prescrição",
    steps: ["Documento anexado", "IA classifica tipo", "Valida regras de negócio", "Cria tarefa para farmacêutico", "Responde cliente"],
    conversionRate: "92%",
    avgTime: "2.5min"
  },
  // ===== TEMPLATE 3: Urgência Médica =====
  {
    id: "urgency-detector",
    title: "🚨 Alerta de Urgência Médica",
    description: "Detecta palavras de urgência, prioriza atendimento e notifica agentes instantaneamente",
    icon: <AlertTriangle className="w-6 h-6 text-red-700" />,
    category: "Emergência",
    steps: ["Mensagem recebida", "IA detecta urgência", "Prioriza URGENTE", "Notifica todos agentes", "Responde imediatamente"],
    conversionRate: "98%",
    avgTime: "0.25min"
  },
  // ===== TEMPLATE 4: Lembrete Inteligente =====
  {
    id: "recall-automation",
    title: "🔔 Recall Automático de Clientes",
    description: "Envia lembretes personalizados para clientes inativos com base no histórico de compras",
    icon: <Clock className="w-6 h-6 text-yellow-700" />,
    category: "Retenção",
    steps: ["Agendado diário", "Filtra clientes elegíveis", "IA personaliza mensagem", "Envia lembrete", "Atualiza etiqueta"],
    conversionRate: "45%",
    avgTime: "1.0min"
  },
  // ===== TEMPLATE 5: Roteamento Inteligente =====
  {
    id: "smart-routing",
    title: "👤 Roteamento por Especialidade",
    description: "Roteia atendimentos para o departamento correto baseado em palavras-chave",
    icon: <MessageCircle className="w-6 h-6 text-purple-700" />,
    category: "Atendimento",
    steps: ["Nova mensagem", "IA analisa intent", "Roteia para agente", "Informa cliente", "Notifica agente designado"],
    conversionRate: "78%",
    avgTime: "0.8min"
  },
  // ===== TEMPLATE 6: Follow-up Pós-Venda =====
  {
    id: "post-sale-followup",
    title: "📋 Follow-up Pós-Venda",
    description: "Envia pesquisa NPS automática e recomenda produtos após atendimento",
    icon: <CheckCircle className="w-6 h-6 text-orange-700" />,
    category: "Satisfação",
    steps: ["Atendimento finalizado", "Aguarda 30min", "Envia NPS", "Analisa resposta", "Recomenda produtos"],
    conversionRate: "65%",
    avgTime: "1.5min"
  },
  // ===== TEMPLATE 7: Anti-Fraude =====
  {
    id: "anti-fraud",
    title: "🛡️ Validador de Documentos",
    description: "Valida documentos com IA e detecta possíveis fraudes em cadastros",
    icon: <Shield className="w-6 h-6 text-teal-700" />,
    category: "Segurança",
    steps: ["Documento anexado", "IA analisa documento", "Valida CPF/validade", "Calcula score de risco", "Decide aprovação/manual"],
    conversionRate: "95%",
    avgTime: "3.0min"
  },
  // ===== TEMPLATE 8: Notificação de Estoque =====
  {
    id: "stock-notification",
    title: "📦 Alerta de Estoque",
    description: "Notifica clientes na fila de espera quando medicamento chega no estoque",
    icon: <Package className="w-6 h-6 text-cyan-700" />,
    category: "Estoque",
    steps: ["Webhook estoque", "Busca fila de espera", "Notifica clientes", "Gerencia reservas", "Atualiza estoque"],
    conversionRate: "70%",
    avgTime: "0.5min"
  },
  // ===== TEMPLATE 9: Auditoria =====
  {
    id: "audit-compliance",
    title: "📝 Log de Auditoria",
    description: "Registra todas as ações do sistema para conformidade e detecção de anomalias",
    icon: <FileText className="w-6 h-6 text-gray-700" />,
    category: "Compliance",
    steps: ["Ação no sistema", "Captura metadados", "Estrutura JSON", "Armazena log", "Analisa anomalias"],
    conversionRate: "99%",
    avgTime: "0.1min"
  },
  // ===== TEMPLATE 10: Dashboard de Desempenho =====
  {
    id: "performance-dashboard",
    title: "📊 Dashboard de Desempenho",
    description: "Coleta métricas de automação e gera relatórios em tempo real",
    icon: <BarChart className="w-6 h-6 text-indigo-700" />,
    category: "BI",
    steps: ["Agendado horário", "Coleta métricas", "Calcula KPIs", "Gera relatório", "Notifica admin"],
    conversionRate: "88%",
    avgTime: "0.3min"
  },
  // ===== Templates Originais =====
  {
    id: "initial-care",
    title: "Atendimento Inicial",
    description: "Fluxo completo de saudação, menu de opções e encaminhamento inteligente",
    icon: <MessageCircle className="w-6 h-6 text-blue-600" />,
    category: "Atendimento",
    steps: ["Saudação automática", "Menu com opções", "Encaminhamento para setor"],
    conversionRate: "45%",
    avgTime: "1.2min"
  },
  {
    id: "price-query",
    title: "Consulta de Preço",
    description: "Cliente envia medicamento, sistema consulta estoque e retorna disponibilidade + opção delivery",
    icon: <Search className="w-6 h-6 text-green-600" />,
    category: "Vendas",
    steps: ["Cliente envia nome do medicamento", "Sistema consulta estoque", "Retorna preço + disponibilidade", "Oferece opção de delivery"],
    conversionRate: "62%",
    avgTime: "0.8min"
  },
  {
    id: "prescription-send",
    title: "Envio de Receita",
    description: "Cliente envia foto da receita, sistema valida automaticamente e encaminha para farmacêutico",
    icon: <FileText className="w-6 h-6 text-orange-600" />,
    category: "Prescrição",
    steps: ["Cliente envia foto da receita", "Sistema valida", "Encaminha para farmacêutico", "Retorna orçamento"],
    conversionRate: "78%",
    avgTime: "3.5min"
  },
  {
    id: "quick-order",
    title: "Pedido Rápido",
    description: "Cliente escolhe produto no catálogo, sistema gera pedido e envia link de pagamento automático",
    icon: <ShoppingCart className="w-6 h-6 text-purple-600" />,
    category: "Vendas",
    steps: ["Cliente escolhe produto", "Sistema gera pedido", "Envia link de pagamento", "Confirmação automática"],
    conversionRate: "85%",
    avgTime: "2.1min"
  }
];

interface TemplatesSectionProps {
  darkMode: boolean;
  onSelectTemplate: (id: string) => void;
}

export function TemplatesSection({ darkMode, onSelectTemplate }: TemplatesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Templates Prontos
        </h3>
        <Badge variant="outline" className="text-xs">
          {templates.length} templates disponíveis
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              darkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500" : "bg-white hover:border-blue-300"
            }`}
            onClick={() => onSelectTemplate(template.id)}
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                  {template.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {template.category}
                  </Badge>
                </div>
              </div>
              <Zap className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {template.description}
              </p>
              
              <div className="space-y-1 mb-3">
                {template.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className={darkMode ? "text-gray-300" : "text-gray-600"}>{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-600 font-medium">
                    Conversão: {template.conversionRate}
                  </span>
                  <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {template.avgTime}
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  Usar Template
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
