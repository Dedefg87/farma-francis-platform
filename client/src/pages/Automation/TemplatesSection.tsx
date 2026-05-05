import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Search, FileText, ShoppingCart, Zap, 
  ArrowRight, CheckCircle, Clock 
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
