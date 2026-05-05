import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, Upload, Download, Send, Sun, Moon, 
  Settings, MessageSquare, Bot, HelpCircle 
} from "lucide-react";

// Componentes modulares
import { DashboardCards } from "./DashboardCards";
import { TemplatesSection } from "./TemplatesSection";
import Canvas from "./Canvas";
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
    alert("Automação publicada com sucesso!");
  };

  const handleImport = () => {
    alert("Funcionalidade de importação em breve!");
  };

  const handleExport = () => {
    alert("Funcionalidade de exportação em breve!");
  };

  const handleTest = (nodeId: string) => {
    alert(`Testando bloco: ${nodeId}`);
  };

  const handleSelectTemplate = (templateId: string) => {
    alert(`Template selecionado: ${templateId}. Criando fluxo...`);
    createMutation.mutate({
      name: `Fluxo - ${templateId}`,
      templateType: templateId,
      flowData: { nodes: [], edges: [] },
      isActive: false,
    });
    setActiveTab("editor");
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
      {/* Header - Seção 1 */}
      <header className={`border-b px-6 py-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Configuração da Automação de Atendimento – Farmácia
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Gerencie fluxos inteligentes para WhatsApp, Chat Online e Redes Sociais
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Fluxo
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Fluxo
            </Button>
            <Button size="sm" onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" />
              Criar Novo Fluxo
            </Button>
            <Button size="sm" onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Publicar Automação
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
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

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardCards darkMode={darkMode} />
          </TabsContent>

          {/* Editor Visual Tab */}
          <TabsContent value="editor" className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Canvas darkMode={darkMode} onSelectNode={(nodeId) => {
                  setSelectedNode(nodeId);
                  setShowSidebar(true);
                }} />
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
                />
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <TemplatesSection 
              darkMode={darkMode}
              onSelectTemplate={handleSelectTemplate}
            />
          </TabsContent>

          {/* Configurações Tab */}
          <TabsContent value="config" className="space-y-6">
            <ConfigSettings darkMode={darkMode} />
          </TabsContent>

          {/* Documentação Tab */}
          <TabsContent value="docs" className="space-y-6">
            <DocumentationSection darkMode={darkMode} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer - Seção 10 */}
      <Footer 
        darkMode={darkMode}
        version="v2.1.0"
        lastUpdate="05/05/2026 16:30"
      />
    </div>
  );
}
