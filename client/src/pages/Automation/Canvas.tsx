import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  MessageSquare, Instagram, Facebook, Globe, Bot, Search, Pill, 
  FileText, MapPin, User, MessageCircle, MousePointer, Image, 
  FileDown, ShoppingCart, Package, DollarSign, UserCheck, 
  Clock, AlertTriangle, CheckCircle, Truck, Link, Webhook,
  Sun, Moon, ZoomIn, ZoomOut, Save, Play, Pause
} from "lucide-react";

interface NodeType {
  id: string;
  category: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const nodeCategories = {
  "Entrada de Mensagem": [
    { id: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="w-4 h-4" />, color: "bg-green-100 border-green-500 text-green-700" },
    { id: "chat-site", label: "Chat do Site", icon: <Globe className="w-4 h-4" />, color: "bg-blue-100 border-blue-500 text-blue-700" },
    { id: "instagram", label: "Instagram Direct", icon: <Instagram className="w-4 h-4" />, color: "bg-pink-100 border-pink-500 text-pink-700" },
    { id: "messenger", label: "Facebook Messenger", icon: <Facebook className="w-4 h-4" />, color: "bg-blue-100 border-blue-500 text-blue-700" },
  ],
  "Reconhecimento": [
    { id: "intent", label: "Reconhecimento de Intenção", icon: <Bot className="w-4 h-4" />, color: "bg-purple-100 border-purple-500 text-purple-700" },
    { id: "price-query", label: "Consulta de Preço", icon: <Search className="w-4 h-4" />, color: "bg-yellow-100 border-yellow-500 text-yellow-700" },
    { id: "med-order", label: "Pedido de Medicamento", icon: <Pill className="w-4 h-4" />, color: "bg-red-100 border-red-500 text-red-700" },
    { id: "prescription", label: "Envio de Receita", icon: <FileText className="w-4 h-4" />, color: "bg-orange-100 border-orange-500 text-orange-700" },
    { id: "location", label: "Localização da Farmácia", icon: <MapPin className="w-4 h-4" />, color: "bg-teal-100 border-teal-500 text-teal-700" },
    { id: "human-handoff", label: "Atendimento Humano", icon: <User className="w-4 h-4" />, color: "bg-gray-100 border-gray-500 text-gray-700" },
  ],
  "Respostas Automáticas": [
    { id: "text-msg", label: "Texto", icon: <MessageCircle className="w-4 h-4" />, color: "bg-blue-100 border-blue-500 text-blue-700" },
    { id: "buttons", label: "Botões Interativos", icon: <MousePointer className="w-4 h-4" />, color: "bg-indigo-100 border-indigo-500 text-indigo-700" },
    { id: "carousel", label: "Carrossel de Produtos", icon: <ShoppingCart className="w-4 h-4" />, color: "bg-pink-100 border-pink-500 text-pink-700" },
    { id: "pdf-send", label: "Envio de PDF (Bula)", icon: <FileDown className="w-4 h-4" />, color: "bg-red-100 border-red-500 text-red-700" },
    { id: "image-send", label: "Envio de Imagem (Catálogo)", icon: <Image className="w-4 h-4" />, color: "bg-green-100 border-green-500 text-green-700" },
  ],
  "Ações Internas": [
    { id: "create-order", label: "Criar Pedido", icon: <ShoppingCart className="w-4 h-4" />, color: "bg-emerald-100 border-emerald-500 text-emerald-700" },
    { id: "check-stock", label: "Consultar Estoque", icon: <Package className="w-4 h-4" />, color: "bg-amber-100 border-amber-500 text-amber-700" },
    { id: "check-price", label: "Consultar Preço", icon: <DollarSign className="w-4 h-4" />, color: "bg-lime-100 border-lime-500 text-lime-700" },
    { id: "register-customer", label: "Registrar Cliente", icon: <UserCheck className="w-4 h-4" />, color: "bg-cyan-100 border-cyan-500 text-cyan-700" },
    { id: "forward-human", label: "Enviar p/ Atendente", icon: <User className="w-4 h-4" />, color: "bg-violet-100 border-violet-500 text-violet-700" },
  ],
  "Condições": [
    { id: "business-hours", label: "Se Horário Comercial", icon: <Clock className="w-4 h-4" />, color: "bg-yellow-100 border-yellow-500 text-yellow-700" },
    { id: "controlled-meds", label: "Se Medicamento Controlado", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-orange-100 border-orange-500 text-orange-700" },
    { id: "has-prescription", label: "Se Cliente Enviou Receita", icon: <FileText className="w-4 h-4" />, color: "bg-blue-100 border-blue-500 text-blue-700" },
    { id: "product-available", label: "Se Produto Disponível", icon: <CheckCircle className="w-4 h-4" />, color: "bg-green-100 border-green-500 text-green-700" },
  ],
  "Integrações": [
    { id: "erp", label: "ERP da Farmácia", icon: <Link className="w-4 h-4" />, color: "bg-slate-100 border-slate-500 text-slate-700" },
    { id: "delivery", label: "Sistema de Delivery", icon: <Truck className="w-4 h-4" />, color: "bg-orange-100 border-orange-500 text-orange-700" },
    { id: "stock-api", label: "API de Estoque", icon: <Package className="w-4 h-4" />, color: "bg-teal-100 border-teal-500 text-teal-700" },
    { id: "payment", label: "Pagamento Online", icon: <DollarSign className="w-4 h-4" />, color: "bg-green-100 border-green-500 text-green-700" },
  ],
  "Finalização": [
    { id: "close-chat", label: "Encerrar Atendimento", icon: <MessageCircle className="w-4 h-4" />, color: "bg-gray-100 border-gray-500 text-gray-700" },
    { id: "request-rating", label: "Solicitar Avaliação", icon: <Star className="w-4 h-4" />, color: "bg-yellow-100 border-yellow-500 text-yellow-700" },
    { id: "gen-protocol", label: "Gerar Protocolo", icon: <FileText className="w-4 h-4" />, color: "bg-blue-100 border-blue-500 text-blue-700" },
  ],
};

export function Canvas() {
  const [zoom, setZoom] = useState(100);
  const [darkMode, setDarkMode] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  return (
    <div className={`flex flex-col h-full ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 10))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 10))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Publicar
          </Button>
          <Button variant="outline" size="sm">
            <Pause className="w-4 h-4 mr-2" />
            Pausar
          </Button>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <div className={`w-64 border-r overflow-y-auto ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="p-4">
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
              Blocos de Automação
            </h3>
            {Object.entries(nodeCategories).map(([category, nodes]) => (
              <div key={category} className="mb-4">
                <h4 className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {category}
                </h4>
                <div className="space-y-1">
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-grab hover:shadow-md transition-shadow ${node.color} ${darkMode ? "border-opacity-50" : ""}`}
                      draggable
                    >
                      {node.icon}
                      <span className="text-xs font-medium">{node.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className={`absolute inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Example Flow Nodes */}
            <div className="absolute top-20 left-20">
              <Card className={`p-4 shadow-lg ${darkMode ? "bg-gray-800 border-green-500" : "bg-white border-green-500"} border-2`}>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">WhatsApp</p>
                    <p className="text-xs text-gray-500">Entrada</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Connection line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <path d="M 180 60 Q 250 60, 250 120" stroke="#3B82F6" strokeWidth="2" fill="none" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>

            <div className="absolute top-20 left-[300px]">
              <Card className={`p-4 shadow-lg ${darkMode ? "bg-gray-800 border-purple-500" : "bg-white border-purple-500"} border-2`}>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-sm">Reconhecimento</p>
                    <p className="text-xs text-gray-500">IA Processa</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Minimap */}
        {showMinimap && (
          <div className={`absolute bottom-4 right-4 w-48 h-32 border rounded-lg shadow-lg ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}>
            <div className="p-2">
              <p className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Mini-mapa</p>
              <div className="mt-2 space-y-1">
                <div className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1" />
                <div className="w-3 h-3 bg-purple-500 rounded-full inline-block mr-1" />
                <div className="w-full h-px bg-gray-300 my-1" />
                <p className="text-xs text-gray-400">2 nós ativos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Star icon inline (if not available in lucide)
function Star({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
