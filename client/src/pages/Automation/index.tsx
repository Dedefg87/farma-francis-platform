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
import { FlowBuilder } from "@/components/flow/FlowBuilder";
import { DashboardCards } from "./DashboardCards";
import { TemplatesSection } from "./TemplatesSection";
import { flowTemplates } from "./templates";
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
  const [editingFlow, setEditingFlow] = useState<{ id: number; name: string; flowData: any } | null>(null);

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
    // Após criar, o refetch vai atualizar a lista. Vamos para o editor.
    setEditingFlow(null); // Limpa edição anterior
    setActiveTab("editor");
  };

  const handleEditFlow = (flow: any) => {
    // Carrega o flow para edição
    const flowData = typeof flow.flowData === 'string' ? JSON.parse(flow.flowData) : flow.flowData || { nodes: [], edges: [] };
    setEditingFlow({
      id: flow.id,
      name: flow.name,
      flowData
    });
    setActiveTab("editor");
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
    // Busca o template completo no flowTemplates (templates.ts)
    const template = flowTemplates.find(t => t.id === templateId);
    
    const flowData = template ? {
      nodes: template.nodes || [],
      edges: template.edges || []
    } : { nodes: [], edges: [] };
    
    createMutation.mutate({
      name: template?.name || `Fluxo - ${templateId}`,
      templateType: templateId,
      flowData: flowData,
      isActive: false,
    });
    
    // Define o flow para edição (carrega no editor)
    if (template) {
      setEditingFlow({
        id: Date.now(), // Temporário até o backend retornar o ID
        name: template.name,
        flowData: flowData
      });
    }
    
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
              <Button variant="outline" size="sm" onClick={() => {
                if (editingFlow) {
                  // Dispara import via FlowBuilder (vamos usar ref depois)
                  alert('Use o botão Importar dentro do editor visual!');
                } else {
                  alert('Crie ou edite um fluxo primeiro!');
                }
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (editingFlow) {
                  // Dispara export via FlowBuilder
                  alert('Use o botão Exportar dentro do editor visual!');
                } else {
                  // Exporta todos os fluxos como JSON
                  const allFlows = flows.map(f => ({
                    id: f.id,
                    name: f.name,
                    flowData: typeof f.flowData === 'string' ? JSON.parse(f.flowData) : f.flowData
                  }));
                  const blob = new Blob([JSON.stringify(allFlows, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `todos-fluxos-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}>
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
        <div className="p-6 flex-1 h-full">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full h-full flex flex-col">
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
            <TabsContent value="dashboard" className="flex-1 h-full overflow-auto">
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
                              onClick={() => handleEditFlow(flow)}
                            >
                              Editar
                            </Button>
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
            <TabsContent value="editor" className="flex-1 h-full">
              <div className="flex gap-4 flex-1 min-h-[600px]">
                <div className="flex-1">
                  <FlowBuilder 
                    key={editingFlow?.id || 'novo-' + Date.now()}
                    initialNodes={editingFlow?.flowData?.nodes || []}
                    initialEdges={editingFlow?.flowData?.edges || []}
                    onSave={(nodes, edges) => {
                      const flowData = { nodes, edges };
                      if (editingFlow && editingFlow.id > 0) {
                        // Atualiza flow existente (ID do banco)
                        updateMutation.mutate({ 
                          id: editingFlow.id, 
                          flowData 
                        });
                      } else {
                        // Cria novo flow (ID temporário do estado)
                        createMutation.mutate({
                          name: editingFlow?.name || "Novo Fluxo",
                          templateType: "custom",
                          flowData,
                          isActive: false,
                        });
                      }
                    }}
                    onExport={(nodes, edges) => {
                      const flowData = { nodes, edges };
                      const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `flow-${editingFlow?.id || 'novo'}-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    onImport={(file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const flowData = JSON.parse(e.target?.result as string);
                          if (flowData.nodes && flowData.edges) {
                            // Atualiza o FlowBuilder via props (vai precisar de key pra resetar)
                            setEditingFlow({
                              id: editingFlow?.id || 0,
                              name: editingFlow?.name || 'Importado',
                              flowData
                            });
                          }
                        } catch (err) {
                          console.error('Erro ao importar:', err);
                          alert('Arquivo inválido!');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>
                {/* PropertySidebar pode ser adaptada depois */}
              </div>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates" className="flex-1 h-full overflow-auto">
              <TemplatesSection 
                darkMode={darkMode}
                onSelectTemplate={handleSelectTemplate}
                onCreateFlow={handleCreateFlow}
              />
            </TabsContent>

            {/* Configurações */}
            <TabsContent value="config" className="flex-1 h-full overflow-auto">
              <ConfigSettings darkMode={darkMode} />
            </TabsContent>

            {/* Documentação */}
            <TabsContent value="docs" className="flex-1 h-full overflow-auto">
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
