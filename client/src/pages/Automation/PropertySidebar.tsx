import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, Play, Eye, Variable, Code, 
  MessageSquare, Bot, ShoppingCart 
} from "lucide-react";

interface PropertySidebarProps {
  darkMode: boolean;
  selectedNode: string | null;
  onClose: () => void;
  onTest: (nodeId: string) => void;
}

export function PropertySidebar({ 
  darkMode, 
  selectedNode, 
  onClose, 
  onTest 
}: PropertySidebarProps) {
  const [nodeName, setNodeName] = useState(selectedNode || "Novo Bloco");
  const [nodeDescription, setNodeDescription] = useState("");
  const [responseText, setResponseText] = useState("Olá! Bem-vindo à Farmácia Francis. Como posso ajudar?");

  if (!selectedNode) {
    return (
      <div className={`w-80 border-l p-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="text-center py-8">
          <Settings className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">
            Clique em um bloco do canvas para ver suas propriedades
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 border-l flex flex-col ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-100 text-blue-700">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{nodeName}</h3>
            <Badge variant="secondary" className="text-xs">Ativo</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="text-xs">Config</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="vars" className="text-xs">Variáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Nome do Bloco</Label>
              <Input 
                value={nodeName} 
                onChange={(e) => setNodeName(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea 
                value={nodeDescription}
                onChange={(e) => setNodeDescription(e.target.value)}
                placeholder="O que este bloco faz?"
                className="mt-1 text-sm"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Parâmetros Configuráveis</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tempo limite</span>
                  <Input className="w-20 h-8 text-xs" defaultValue="30s" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tentativas</span>
                  <Input className="w-20 h-8 text-xs" defaultValue="3" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Falha retry</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onTest(selectedNode)}
            >
              <Play className="w-4 h-4 mr-2" />
              Testar este bloco
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="space-y-3 mt-3">
            <Card className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Eye className="w-3 h-3" />
                  Pré-visualização da Resposta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-1">Farmácia Francis</p>
                      <p className="text-sm">{responseText}</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
                  <Code className="w-3 h-3 mr-1" />
                  Ver JSON
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vars" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Variable className="w-3 h-3" />
                Variáveis Disponíveis
              </Label>
              <div className="space-y-1 mt-2">
                {[
                  { name: "{{customer_name}}", desc: "Nome do cliente" },
                  { name: "{{medication}}", desc: "Medicamento pesquisado" },
                  { name: "{{price}}", desc: "Preço atual" },
                  { name: "{{stock_status}}", desc: "Status do estoque" },
                  { name: "{{order_id}}", desc: "ID do pedido" },
                ].map((v, idx) => (
                  <div key={idx} className={`p-2 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                    <code className="text-blue-600 font-mono">{v.name}</code>
                    <p className="text-gray-500 mt-0.5">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
