import { useState } from "react";
import { trpc } from "../../lib/trpc";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Play, Pause, Plus, Upload, Download, Send,
  Activity, MessageSquare, Clock, TrendingUp, Smartphone, Globe, Instagram,
  Settings, HelpCircle, Sun, Moon, Bot, MessageCircle, ShoppingCart
} from "lucide-react";
import { Canvas } from "./Canvas";
import { DashboardCards } from "./DashboardCards";
import { TemplatesSection } from "./TemplatesSection";
import { PropertySidebar } from "./PropertySidebar";
import { ConfigSettings } from "./ConfigSettings";
import { DocumentationSection } from "./DocumentationSection";
import { Footer } from "./Footer";

type TabType = "dashboard" | "editor" | "templates" | "config" | "docs";

export default function Automation() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // tRPC queries/mutations
  const { data: flowsData, isLoading, refetch } = trpc.automation.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.automation.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.automation.delete.useMutation({ onSuccess: () => refetch() });
  const updateMutation = trpc.automation.update.useMutation({ onSuccess: () => refetch() });
  const { data: statsData } = trpc.automation.stats.useQuery(
    { period: "today" },
    { enabled: activeTab === "dashboard" }
  );

  const flows = flowsData?.items || [];
  const isActive = flows.some(f => f.isActive);

  const handleCreateFlow = () => {
    createMutation.mutate({
      name: "Novo Fluxo",
      templateType: "custom",
      flowData: { nodes: [], edges: [] },
      isActive: false,
    });
  };

  const handlePublish = () => {
    if (flows.length === 0) {
      alert("Crie pelo menos um fluxo antes de publicar!");
      return;
    }
    // Ativar todos os fluxos
    flows.forEach(f => {
      if (!f.isActive) {
        updateMutation.mutate({ id: f.id, isActive: true });
      }
    });
    alert("Automação publicada com sucesso! Fluxos ativados.");
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    updateMutation.mutate({ id, isActive: !isActive });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja desativar este fluxo?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleTest = (nodeId: string) => {
    alert(`Testando bloco: ${nodeId}`);
    // TODO: Implementar teste real via tRPC
  };

  const handleSelectTemplate = (templateId: string) => {
    createMutation.mutate({
      name: `Fluxo - ${templateId}`,
      templateType: templateId,
      flowData: { nodes: [], edges: [] },
      isActive: false,
    });
    setActiveTab("editor");
  };

  return (
    <FarmaDashboardLayout>
      <div className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
        {/* Header com botões de ação */}
        <div className={`border-b px-6 py-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Configuração da Automação de Atendimento
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Gerencie fluxos inteligentes para WhatsApp, Chat Online e Redes Sociais
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm" onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Fluxo
              </Button>
              <Button 
                size="sm" 
                onClick={handlePublish} 
                className={`${isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
                disabled={isActive}
              >
                <Send className="w-4 h-4 mr-2" />
                {isActive ? "Publicado" : "Publicar"}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="dashboard" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="editor" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                Editor Visual
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-xs">
                <HelpCircle className="w-3 h-3 mr-1" />
                Documentação
              </TabsTrigger>
            </TabsList>

            {/* Dashboard */}
            <TabsContent value="dashboard" className="space-y-6">
              <DashboardCards darkMode={darkMode} />
              
              {/* Lista de Fluxos Ativos */}
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Fluxos Cadastrados ({flows.length})</span>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Carregando fluxos...</div>
                  ) : flows.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum fluxo criado. Clique em "Criar Fluxo" para começar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flows.map(flow => (
                        <div 
                          key={flow.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${flow.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{flow.name}</p>
                              <p className="text-xs text-gray-500">{flow.templateType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={flow.isActive ? "default" : "secondary"}>
                              {flow.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleActive(flow.id, flow.isActive)}
                            >
                              {flow.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDelete(flow.id)}
                            >
                              Desativar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Editor Visual */}
            <TabsContent value="editor" className="space-y-6">
              <div className="flex gap-4" style={{ height: "calc(100vh - 300px)" }}>
                <div className="flex-1">
                  <Canvas 
                    darkMode={darkMode} 
                    flows={flows}
                    onSelectNode={(nodeId) => {
                      setSelectedNode(nodeId);
                      setShowSidebar(true);
                    }}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                </div>
                {showSidebar && (
                  <PropertySidebar 
                    darkMode={darkMode}
                    selectedNode={selectedNode}
                    onClose={() => {
                      setShowSidebar(false);
                      setSelectedNode(null);
                    }}
                    onTest={handleTest}
                    flows={flows}
                    onUpdateFlow={(id, data) => updateMutation.mutate({ id, ...data })}
                  />
                )}
              </div>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates" className="space-y-6">
              <TemplatesSection 
                darkMode={darkMode}
                onSelectTemplate={handleSelectTemplate}
                onCreateFlow={handleCreateFlow}
              />
            </TabsContent>

            {/* Configurações */}
            <TabsContent value="config" className="space-y-6">
              <ConfigSettings darkMode={darkMode} />
            </TabsContent>

            {/* Documentação */}
            <TabsContent value="docs" className="space-y-6">
              <DocumentationSection darkMode={darkMode} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <Footer 
          darkMode={darkMode}
          version="v2.1.0"
          lastUpdate="05/05/2026 16:30"
        />
      </div>
    </FarmaDashboardLayout>
  );
}
