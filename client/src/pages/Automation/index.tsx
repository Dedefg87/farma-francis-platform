import { useState, useCallback } from "react";
import { trpc } from "../../lib/trpc";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Zap, Play, Pause, Plus, Upload, Download, Send, Trash2,
  Activity, MessageSquare, Clock, TrendingUp, Smartphone, Globe, Instagram,
  Settings, HelpCircle, Sun, Moon, Bot, MessageCircle, ShoppingCart
} from "lucide-react";
import { Canvas } from "./Canvas";
import { DashboardCards } from "./DashboardCards";
import { TemplatesSection } from "./TemplatesSection";
import N8NEditorWrapper from "./N8NEditor";
import { ConfigSettings } from "./ConfigSettings";
import { DocumentationSection } from "./DocumentationSection";
import { Footer } from "./Footer";
import { flowTemplates } from "./templates";
import ErrorBoundary from "@/components/ErrorBoundary";

type TabType = "dashboard" | "editor" | "templates" | "config" | "docs";

export default function Automation() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingFlow, setEditingFlow] = useState<{ id: number; name: string; flowData: any } | null>(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<number | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // tRPC queries/mutations
  const { data: flowsData, isLoading, refetch } = trpc.automation.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.automation.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Fluxo criado com sucesso"); },
    onError: (err) => { toast.error(`Erro ao criar fluxo: ${err.message}`); }
  });
  const deleteMutation = trpc.automation.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Fluxo excluído"); },
    onError: (err) => { toast.error(`Erro ao excluir: ${err.message}`); }
  });
  const updateMutation = trpc.automation.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Fluxo atualizado"); },
    onError: (err) => { toast.error(`Erro ao atualizar: ${err.message}`); }
  });
  const { data: statsData } = trpc.automation.stats.useQuery(
    { period: "today" },
    { enabled: activeTab === "dashboard" }
  );

  const allFlows = flowsData?.items || [];
  const flows = allFlows.filter(f => f.isActive === true);
  const isActive = flows.some(f => f.isActive);

  const handleCreateFlow = () => {
    createMutation.mutate({
      name: "Novo Fluxo",
      templateType: "custom",
      flowData: { nodes: [], edges: [] },
      isActive: false,
    });
    setEditingFlow(null);
    setActiveTab("editor");
  };

  const handleEditFlow = (flow: any) => {
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
      toast.error("Crie pelo menos um fluxo antes de publicar");
      return;
    }
    const inactiveFlows = flows.filter(f => !f.isActive);
    if (inactiveFlows.length === 0) {
      toast.info("Todos os fluxos já estão ativos");
      return;
    }
    inactiveFlows.forEach(f => {
      updateMutation.mutate({ id: f.id, isActive: true });
    });
    toast.success(`${inactiveFlows.length} fluxo(s) ativado(s) com sucesso`);
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    updateMutation.mutate({ id, isActive: !isActive });
  };

  // Delete with confirmation dialog
  const handleDeleteRequest = (id: number) => {
    setFlowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (flowToDelete !== null) {
      deleteMutation.mutate({ id: flowToDelete });
    }
    setDeleteDialogOpen(false);
    setFlowToDelete(null);
  };

  // Clear all with confirmation dialog
  const handleClearAllRequest = () => {
    if (flows.length === 0) return;
    setClearAllDialogOpen(true);
  };

  const handleClearAllConfirm = () => {
    flows.forEach(f => deleteMutation.mutate({ id: f.id }));
    setClearAllDialogOpen(false);
    toast.success("Todos os fluxos foram excluídos");
  };

  const handleTest = (nodeId: string) => {
    toast.info(`Testando bloco: ${nodeId}`);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = flowTemplates.find(t => t.id === templateId);
    if (!template) return;
    createMutation.mutate({
      name: `Fluxo - ${template.name}`,
      templateType: templateId,
      flowData: { nodes: template.nodes, edges: template.edges },
      isActive: false,
    });
    setActiveTab("editor");
    toast.success(`Template "${template.name}" carregado no editor`);
  };

  const handleExportAll = () => {
    if (flows.length === 0) {
      toast.error("Nenhum fluxo para exportar");
      return;
    }
    const allFlows = flows.map(f => ({
      id: f.id,
      name: f.name,
      flowData: typeof f.flowData === 'string' ? JSON.parse(f.flowData) : f.flowData
    }));
    const blob = new Blob([JSON.stringify(allFlows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farma-fluxos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${allFlows.length} fluxo(s) exportado(s)`);
  };

  // Stable key for N8NEditor — only changes when editingFlow.id changes
  const editorKey = editingFlow ? `edit-${editingFlow.id}` : 'new';

  return (
    <ErrorBoundary>
    <FarmaDashboardLayout>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os fluxos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir TODOS os {flows.length} fluxos? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => {
              if (editingFlow) {
                toast.info("Use o botão Importar dentro do editor visual");
              } else {
                toast.info("Crie ou edite um fluxo primeiro");
              }
            }}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm" onClick={handleCreateFlow} className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Criando..." : "Criar Fluxo"}
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              className={`${isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
              disabled={isActive || updateMutation.isPending}
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
      <div className="flex-1 flex flex-col overflow-auto min-h-0 p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full flex flex-col flex-1 min-h-0">
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
                  <div className="flex items-center gap-2">
                    {flows.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAllRequest}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs h-7"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Limpar Todos
                      </Button>
                    )}
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
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
                            disabled={updateMutation.isPending}
                          >
                            {flow.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRequest(flow.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            title="Excluir fluxo"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editor Visual - N8N Style */}
          <TabsContent value="editor" className="flex-1 min-h-0">
            <div className="h-full" style={{ minHeight: '500px' }}>
              <N8NEditorWrapper
                key={editorKey}
                initialNodes={editingFlow?.flowData?.nodes || []}
                initialEdges={editingFlow?.flowData?.edges || []}
                onSave={(nodes, edges) => {
                  const flowData = { nodes, edges };
                  if (editingFlow) {
                    updateMutation.mutate({
                      id: editingFlow.id,
                      flowData
                    });
                  } else {
                    createMutation.mutate({
                      name: "Novo Fluxo",
                      templateType: "custom",
                      flowData,
                      isActive: false,
                    });
                  }
                }}
                onSimulate={() => {
                  toast.info("Simulação de fluxo em desenvolvimento");
                }}
              />
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-6">
            <TemplatesSection
              darkMode={darkMode}
              onSelectTemplate={handleSelectTemplate}
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
        version="v2.2.0"
        lastUpdate={new Date().toLocaleDateString('pt-BR')}
      />
    </FarmaDashboardLayout>
    </ErrorBoundary>
  );
}
