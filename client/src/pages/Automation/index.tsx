import { useCallback, useState, useMemo } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Workflow, 
  Zap, 
  Sparkles,
  Search,
  Plus,
  Upload,
  Bot,
  Play,
  ReloadIcon
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FlowEditor } from "./components/FlowEditor";
import { AutomationHeader } from "./components/AutomationHeader";
import { AutomationEmptyState } from "./components/AutomationEmptyState";
import { AutomationStats } from "./components/AutomationStats";
import { TemplateCard } from "./components/TemplateCard";
import { exportFlowsToExcel } from "@/lib/exportExcel";
import { ImportDialog } from "./components/ImportDialog";
import { CreateDialog } from "./components/CreateDialog";
import { ValidationDialog } from "./components/ValidationDialog";
import { flowTemplates } from "./templates-modern";
import type { ModernTemplate } from "./templates-modern";

export default function Automation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  
  // Queries
  const { data, isLoading, refetch } = trpc.automation.list.useQuery({});
  const flows = data?.items || [];
  const totalFlows = data?.total || 0;
  
  const { data: statsData } = trpc.automation.stats.useQuery({ period: "today" }, { enabled: !selectedFlowId });
  
  // Mutations
  const createFlow = trpc.automation.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Fluxo criado com sucesso!");
      setSelectedFlowId(data.id);
      setIsCreating(false);
      setNewFlowName("");
      setNewFlowDescription("");
      refetch();
    },
    onError: (error) => toast.error(`Erro ao criar fluxo: ${error.message}`),
  });

  const updateFlow = trpc.automation.update.useMutation({
    onSuccess: () => {
      toast.success("Fluxo atualizado!");
      refetch();
    },
    onError: (error) => toast.error(`Erro ao atualizar: ${error.message}`),
  });

  const deleteFlow = trpc.automation.delete.useMutation({
    onSuccess: () => {
      toast.success("Fluxo removido!");
      setSelectedFlowId(null);
      refetch();
    },
    onError: (error) => toast.error(`Erro ao deletar: ${error.message}`),
  });

  const toggleFlow = trpc.automation.update.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => toast.error(`Erro ao alterar status: ${error.message}`),
  });

  const testFlow = trpc.automation.testFlow.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Teste iniciado! Execução ID: ${data.executionId}`);
    },
    onError: (error) => toast.error(`Erro no teste: ${error.message}`),
  });

  // Handlers
  const handleCreateFlow = useCallback(() => {
    if (!newFlowName.trim()) {
      toast.error("Nome do fluxo é obrigatório");
      return;
    }
    createFlow.mutate({
      name: newFlowName,
      description: newFlowDescription,
      flowData: { nodes: [], edges: [] },
    });
  }, [newFlowName, newFlowDescription, createFlow]);

  const handleToggleFlow = useCallback((flow: any) => {
    toggleFlow.mutate({ id: flow.id, isActive: !flow.isActive });
  }, [toggleFlow]);

  const handleDeleteFlow = useCallback((flow: any) => {
    if (confirm(`Tem certeza que deseja remover o fluxo "${flow.name}"?`)) {
      deleteFlow.mutate({ id: flow.id });
    }
  }, [deleteFlow]);

  const handleDuplicateFlow = useCallback((flow: any) => {
    createFlow.mutate({
      name: `Cópia de ${flow.name}`,
      description: flow.description,
      flowData: flow.flowData ? JSON.parse(flow.flowData) : { nodes: [], edges: [] },
    });
  }, [createFlow]);

  const handleExportExcel = useCallback(() => {
    if (!flows || flows.length === 0) {
      toast.error("Nenhum fluxo para exportar");
      return;
    }
    exportFlowsToExcel(flows);
    toast.success(`${flows.length} fluxos exportados para Excel!`);
  }, [flows]);

  const handleUseTemplate = useCallback((template: ModernTemplate) => {
    createFlow.mutate({
      name: template.name,
      description: template.description,
      flowData: { nodes: template.nodes, edges: template.edges },
    });
  }, [createFlow]);

  // Filter flows
  const filteredFlows = useMemo(() => {
    if (!flows) return [];
    let result = flows;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(flow => 
        flow.name.toLowerCase().includes(query) ||
        (flow.description && flow.description.toLowerCase().includes(query))
      );
    }
    if (activeTab === "active") {
      result = result.filter(flow => flow.isActive);
    }
    return result;
  }, [flows, searchQuery, activeTab]);

  const activeFlowsCount = flows.filter(f => f.isActive).length || 0;

  // Loading state
  if (isLoading) {
    return (
      <FarmaDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <ReloadIcon className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando automações...</span>
        </div>
      </FarmaDashboardLayout>
    );
  }

  // Selected flow editor
  if (selectedFlowId) {
    const selectedFlow = flows.find(f => f.id === selectedFlowId);
    if (!selectedFlow) {
      setSelectedFlowId(null);
      return null;
    }
    return (
      <FarmaDashboardLayout>
        <FlowEditor
          flow={selectedFlow}
          onBack={() => setSelectedFlowId(null)}
          onSave={(nodes, edges) => {
            updateFlow.mutate({
              id: selectedFlowId,
              flowData: { nodes, edges },
            });
          }}
          onToggle={(isActive) => toggleFlow.mutate({ id: selectedFlowId, isActive })}
          onDelete={() => handleDeleteFlow(selectedFlow)}
          onTest={() => testFlow.mutate({ flowId: selectedFlowId })}
        />
      </FarmaDashboardLayout>
    );
  }

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <AutomationHeader
          totalFlows={totalFlows}
          activeFlows={activeFlowsCount}
          onSearch={setSearchQuery}
          onCreate={() => setIsCreating(true)}
          onImport={() => setIsImporting(true)}
          onExport={handleExportExcel}
          onUseTemplate={() => setActiveTab("templates")}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">
              <Play className="w-4 h-4 mr-2" />
              Ativos
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 m-0 overflow-auto">
            {filteredFlows.length === 0 ? (
              <AutomationEmptyState
                onCreate={() => setIsCreating(true)}
                onUseTemplate={() => setActiveTab("templates")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredFlows.map(flow => (
                  <Card key={flow.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{flow.name}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFlowId(flow.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant={flow.isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleFlow(flow)}
                        >
                          {flow.isActive ? "Ativo" : "Inativo"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{flow.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{flow.isActive ? "Ativo" : "Inativo"}</span>
                      <span>Atualizado: {new Date(flow.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleFlow(flow)}
                      >
                        {flow.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateFlow(flow)}
                      >
                        Duplicar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFlow(flow)}
                      >
                        Remover
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => testFlow.mutate({ flowId: flow.id })}
                        disabled={testFlow.isLoading}
                      >
                        Testar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="flex-1 m-0 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlows.map(flow => (
                <Card key={flow.id} className="p-4">
                  <h3 className="font-semibold">{flow.name}</h3>
                  <p className="text-sm text-gray-600">{flow.description}</p>
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={() => setSelectedFlowId(flow.id)}
                  >
                    Editar
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 m-0 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flowTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleUseTemplate(template)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ImportDialog
        open={isImporting}
        onOpenChange={setIsImporting}
        onImport={() => {
          // Implementar lógica de importação
          toast.info("Funcionalidade de importação em desenvolvimento");
          setIsImporting(false);
        }}
      />

      <CreateDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        name={newFlowName}
        description={newFlowDescription}
        onNameChange={setNewFlowName}
        onDescriptionChange={setNewFlowDescription}
        onCreate={handleCreateFlow}
      />
    </FarmaDashboardLayout>
  );
}
