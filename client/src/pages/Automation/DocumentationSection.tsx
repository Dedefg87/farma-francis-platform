import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, Video, HelpCircle, Lightbulb, 
  ChevronRight, Play, FileText 
} from "lucide-react";

const quickGuide = [
  { title: "O que é automação de atendimento?", content: "São fluxos inteligentes que respondem clientes automaticamente via WhatsApp, chat ou redes sociais, 24/7." },
  { title: "Como criar meu primeiro fluxo?", content: "Clique em 'Criar Novo Fluxo', escolha um template ou comece do zero, arraste os blocos no canvas e conecte-os." },
  { title: "Posso testar antes de publicar?", content: "Sim! Use o botão 'Testar este bloco' na sidebar ou o modo preview no editor visual." },
  { title: "Como conecto meu WhatsApp?", content: "Vá em Configurações > Integrações > WhatsApp Business API e siga o passo a passo de autenticação." },
];

const examples = [
  { 
    title: "Farmácia Popular", 
    description: "Atendimento básico com consulta de preços e envio de bula",
    flow: "Entrada → Consulta Preço → Envio PDF → Pedido"
  },
  { 
    title: "Farmácia de Manipulação", 
    description: "Foco em prescrição médica e validação de receitas",
    flow: "Receita → Validação → Farmacêutico → Orçamento → Pedido"
  },
  { 
    title: "Rede de Farmácias", 
    description: "Múltiplas unidades com localização automática",
    flow: "Entrada → Localização → Unidade Próxima → Atendimento"
  }
];

const faq = [
  { q: "Quanto tempo leva para configurar?", a: "Templates prontos em 5 minutos. Fluxos personalizados em 30-60 minutos." },
  { q: "Funciona com qualquer WhatsApp?", a: "Sim, via WhatsApp Business API ou integração com provedores como Z-API, Twilio, 360Dialog." },
  { q: "Tem limite de mensagens?", a: "Depende do seu plano. O sistema suporta até 10.000 mensagens/mês no plano básico." },
  { q: "Posso integrar meu ERP?", a: "Sim! Suporte nativo para TOTVS, SAP, Senior e APIs REST personalizadas." },
];

const bestPractices = [
  "Sempre teste o fluxo completo antes de publicar",
  "Use horários comerciais para direcionar ao atendimento humano fora do horário",
  "Mantenha mensagens claras e objetivas (máximo 3 opções por menu)",
  "Sempre ofereça a opção de falar com um humano",
  "Use imagens e PDFs para catálogos e bulas de medicamentos",
  "Monitore as conversões semanalmente e ajuste o fluxo",
  "Configure palavras-chave para reconhecimento de intenção automático",
];

interface DocumentationSectionProps {
  darkMode: boolean;
}

export function DocumentationSection({ darkMode }: DocumentationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Central de Ajuda
        </h3>
      </div>

      <Tabs defaultValue="guide" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="guide" className="text-xs">Guia Rápido</TabsTrigger>
          <TabsTrigger value="examples" className="text-xs">Exemplos</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
          <TabsTrigger value="practices" className="text-xs">Boas Práticas</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="space-y-3 mt-4">
          {quickGuide.map((item, idx) => (
            <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full text-xs">
            <Video className="w-3 h-3 mr-2" />
            Ver Tutoriais em Vídeo
            <ChevronRight className="w-3 h-3 ml-2" />
          </Button>
        </TabsContent>

        <TabsContent value="examples" className="space-y-3 mt-4">
          {examples.map((ex, idx) => (
            <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-1">{ex.title}</h4>
                <p className={`text-xs mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {ex.description}
                </p>
                <div className={`p-2 rounded text-xs font-mono ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                  {ex.flow}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 text-xs">
                  <Play className="w-3 h-3 mr-1" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="faq" className="space-y-3 mt-4">
          {faq.map((item, idx) => (
            <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">{item.q}</h4>
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="practices" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {bestPractices.map((practice, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {idx + 1}
                    </Badge>
                    <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                      {practice}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full text-xs">
            <FileText className="w-3 h-3 mr-2" />
            Baixar Guia Completo (PDF)
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
