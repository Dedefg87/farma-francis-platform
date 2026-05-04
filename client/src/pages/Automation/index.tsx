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
  Play
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import N8NNodeConfig from "@/components/flow/N8NNodeConfig";
import { Node } from "reactflow";
import { convertIVRToReactFlow } from "@/lib/ivrConverter";
import { convertToReactFlow } from "@/lib/flowConverters";
import { validateFlowIntegrity } from "@/lib/flowLinker";
import { useFlowImportWorker } from "@/hooks/useFlowImportWorker";
import { useFlowState } from "./hooks/useFlowState";
import { useFlowValidation } from "./hooks/useFlowValidation";
import { FlowCardPro } from "./components/FlowCardPro";
import { AutomationHeader } from "./components/AutomationHeader";
import { AutomationEmptyState } from "./components/AutomationEmptyState";
import { AutomationStats } from "./components/AutomationStats";
import { TemplateCard } from "./components/TemplateCard";
import { exportFlowsToExcel } from "@/lib/exportExcel";
import { ImportDialog } from "./components/ImportDialog";
import { CreateDialog } from "./components/CreateDialog";
import { FlowEditor } from "./components/FlowEditor";
import { ValidationDialog } from "./components/ValidationDialog";
import { flowTemplates } from "./templates-modern";
// import { flowTemplates } from "./templates"; // Old templates

export default function Automation() {
  const [searchQuery, setSearchQuery] = useState("");
  const { state, actions } = useFlowState();
  const { validateBeforeSave, validateFlow } = useFlowValidation();
  
  const { data: visualFlows, refetch: refetchFlows } = trpc.automation.list.useQuery();
  const { data: automationFlows } = trpc.automation.list.useQuery();
  // const { data: uraMenus } = trpc.uraMenus.list.useQuery(); // REMOVIDO: router não existe
  const { data: automationStats } = trpc.automation.stats.useQuery({ period: "today" });

  const { parseJSON, convertN8N } = useFlowImportWorker({
    onProgress: actions.setImportProgress,
    onError: error => {
      toast.error(`Erro no processamento: ${error}`);
      actions.setImportLoading(false);
    },
  });

  const createFlow = trpc.automation.create.useMutation({
    onSuccess: (data: unknown) => {
      const d = data as any;
      toast.success("Fluxo criado com sucesso!");
      actions.setSelectedFlowId(d.id || d.insertId);
      actions.setIsCreating(false);
      actions.setNewFlowName("");
      actions.setNewFlowDescription("");
      refetchFlows();
    },
    onError: () => toast.error("Erro ao criar fluxo"),
  });

  const updateFlow = trpc.automation.update.useMutation({
    onSuccess: () => {
      toast.success("Fluxo atualizado!");
      refetchFlows();
    },
  });

  const deleteFlow = trpc.automation.delete.useMutation({
    onSuccess: () => {
      toast.success("Fluxo deletado!");
      actions.setSelectedFlowId(null);
      refetchFlows();
    },
  });

  const toggleFlow = trpc.automation.update.useMutation({
    onSuccess: () => refetchFlows(),
  });

  const handleCreateFlow = useCallback(() => {
    if (!state.newFlowName.trim()) {
      toast.error("Nome do fluxo é obrigatório");
      return;
    }
    createFlow.mutate({
      name: state.newFlowName,
      description: state.newFlowDescription,
      flowData: JSON.stringify({ nodes: [], edges: [] }),
    });
  }, [state.newFlowName, state.newFlowDescription, createFlow]);

  const handleImportFlow = useCallback(async () => {
    if (!state.importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }
    actions.setImportLoading(true);
    actions.setImportProgress(5);
    
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        let content = e.target?.result as string;
        if (content.match(/^[A-Za-z0-9+/=]+$/)) {
          try { content = atob(content); } catch {}
        }
        
        actions.setImportProgress(10);
        let parseResult: unknown;
        try {
          parseResult = await parseJSON(content);
        } catch {
          parseResult = { parsed: JSON.parse(content), isN8N: false };
        }
        
        const flowData = parseResult.parsed;
        const isN8N = parseResult.isN8N;
        const flowName = flowData.name || state.importFile!.name.replace(/\.[^/.]+$/, "");
        
        let nodes, edges;
        if (isN8N) {
          toast.info(`Processando fluxo N8N (${parseResult.nodeCount} nós)...`);
          try {
            const result: unknown = await convertN8N(flowData);
            nodes = result.nodes;
            edges = result.edges;
            toast.success(`Convertido: ${result.stats.totalNodes} nós, ${result.stats.totalEdges} conexões`);
          } catch {
            const converted = convertToReactFlow(content);
            nodes = converted.nodes;
            edges = converted.edges;
          }
        } else if (flowData.nodes && flowData.edges) {
          nodes = flowData.nodes;
          edges = flowData.edges;
        } else {
          const converted = convertToReactFlow(content);
          nodes = converted.nodes;
          edges = converted.edges;
        }
        
        actions.setImportProgress(90);
        const validation = validateFlowIntegrity(nodes, edges);
        if (!validation.isValid) {
          console.warn("Problemas no fluxo:", validation.errors);
        }
        
        createFlow.mutate({
          name: flowName,
          description: flowData.description || "Fluxo importado",
          flowData: JSON.stringify({ nodes, edges }),
        });
        
        actions.setImportProgress(100);
        toast.success("Fluxo importado com sucesso!");
        actions.resetImport();
      } catch (error) {
        toast.error(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        actions.setImportLoading(false);
        actions.setImportProgress(0);
      }
    };
    reader.readAsText(state.importFile);
  }, [state.importFile, actions, parseJSON, convertN8N, createFlow]);

  const handleSaveFlow = useCallback((nodes: Node[], edges: unknown[]) => {
    if (!state.selectedFlowId) return;
    const result = validateFlow(nodes, edges);
    actions.showValidation(result, { nodes, edges });
  }, [state.selectedFlowId, validateFlow, actions]);

  const confirmSaveFlow = useCallback(() => {
    if (!state.selectedFlowId || !state.pendingSaveData) return;
    actions.setIsSaving(true);
    updateFlow.mutate(
      {
        id: state.selectedFlowId,
        flowData: JSON.stringify(state.pendingSaveData),
      },
      {
        onSuccess: () => {
          toast.success("Fluxo salvo com sucesso!");
        },
        onError: () => {
          toast.error("Erro ao salvar fluxo");
        },
        onSettled: () => {
          actions.setIsSaving(false);
        },
      }
    );
    actions.hideValidation();
    actions.setPendingSaveData(null);
  }, [state.selectedFlowId, state.pendingSaveData, updateFlow, actions]);

  const handleNodeSave = useCallback((nodeId: string, data: unknown) => {
    if (!state.selectedFlowId) return;
    const selectedFlow = visualFlows?.find(f => f.id === state.selectedFlowId);
    if (!selectedFlow?.flowData) return;
    
    const flowData = JSON.parse(selectedFlow.flowData);
    const updatedNodes = flowData.nodes.map((node: Node) =>
      node.id === nodeId ? { ...node, data } : node
    );
    
    updateFlow.mutate(
      {
        id: state.selectedFlowId,
        flowData: JSON.stringify({ ...flowData, nodes: updatedNodes }),
      },
      {
        onSuccess: () => toast.success("Configuração do nó salva!"),
        onError: () => toast.error("Erro ao salvar configuração do nó"),
      }
    );
  }, [state.selectedFlowId, visualFlows, updateFlow]);

  const handleDuplicateFlow = useCallback((flow: unknown) => {
    actions.setDuplicatingFlowId(flow.id);
    createFlow.mutate(
      {
        name: `Cópia de ${flow.name}`,
        description: flow.description,
        flowData: flow.flowData,
      },
      {
        onSuccess: () => {
          toast.success("Fluxo duplicado com sucesso!");
          actions.setDuplicatingFlowId(null);
          refetchFlows();
        },
        onError: () => {
          toast.error("Erro ao duplicar fluxo");
          actions.setDuplicatingFlowId(null);
        },
      }
    );
  }, [createFlow, actions, refetchFlows]);

  const handleExportFlow = useCallback((flow: unknown) => {
    const flowData = flow.flowData ? JSON.parse(flow.flowData) : { nodes: [], edges: [] };
    const exportData = {
      name: flow.name,
      description: flow.description,
      nodes: flowData.nodes,
      edges: flowData.edges,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-${flow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Fluxo exportado!");
  }, []);

  const handleExportExcel = useCallback(() => {
    if (!visualFlows || visualFlows.length === 0) {
      toast.error("Nenhum fluxo para exportar");
      return;
    }

    exportFlowsToExcel(visualFlows);
    toast.success(`${visualFlows.length} fluxos exportados para Excel!`);
  }, [visualFlows]);

  const selectedFlow = visualFlows?.find(f => f.id === state.selectedFlowId);

  // Filtrar fluxos por busca
  const filteredFlows = useMemo(() => {
    if (!visualFlows) return [];
    if (!searchQuery) return visualFlows;
    const query = searchQuery.toLowerCase();
    return visualFlows.filter(flow => 
      flow.name.toLowerCase().includes(query) ||
      flow.description?.toLowerCase().includes(query)
    );
  }, [visualFlows, searchQuery]);

  const activeFlowsCount = visualFlows?.filter(f => f.isActive).length || 0;

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <AutomationHeader
          onSearch={setSearchQuery}
          onCreateFlow={() => actions.setIsCreating(true)}
          onImport={() => actions.setIsImporting(true)}
          onUseTemplate={() => {}}
          onExport={handleExportExcel}
          totalFlows={visualFlows?.length || 0}
          activeFlows={activeFlowsCount}
        />

        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="all">
              Todos
            </TabsTrigger>
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
            {state.selectedFlowId && selectedFlow ? (
              <FlowEditor
                flow={selectedFlow}
                onBack={() => actions.setSelectedFlowId(null)}
                onToggle={(isActive) => toggleFlow.mutate({ id: state.selectedFlowId!, isActive })}
                onDelete={() => deleteFlow.mutate({ id: state.selectedFlowId! })}
                onSave={handleSaveFlow}
                onNodeDoubleClick={actions.openNodeConfig}
                isSaving={state.isSaving}
              />
            ) : filteredFlows.length === 0 ? (
              <div className="p-6">
                <AutomationEmptyState
                  onCreateFlow={() => actions.setIsCreating(true)}
                  onUseTemplate={() => {}}
                />
              </div>
            ) : (
              <div className="p-6">
                {/* Analytics Dashboard */}
                <AutomationStats 
                  stats={automationStats || {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                    avgResponseTime: 0,
                    totalConversations: 0,
                    whatsappExecutions: 0,
                    instagramExecutions: 0,
                    conversions: 0,
                    conversionRate: 0,
                  }} 
                  period="today" 
                />
                
                {/* Flows Grid */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fluxos de Automação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFlows.map(flow => (
                      <FlowCardPro
                        key={flow.id}
                        flow={flow}
                        type="visual"
                        onClick={() => actions.setSelectedFlowId(flow.id)}
                        onToggle={(isActive) => toggleFlow.mutate({ id: flow.id, isActive })}
                        onDuplicate={() => handleDuplicateFlow(flow)}
                        onExport={() => handleExportFlow(flow)}
                        onDelete={() => deleteFlow.mutate({ id: flow.id })}
                        isDuplicating={state.duplicatingFlowId === flow.id}
                        executions={{
                          total: Math.floor(Math.random() * 100),
                          success: Math.floor(Math.random() * 80),
                          failed: Math.floor(Math.random() * 20),
                          lastRun: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="flex-1 m-0 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visualFlows?.filter(f => f.isActive).map(flow => (
                <FlowCardPro
                  key={flow.id}
                  flow={flow}
                  type="visual"
                  onClick={() => actions.setSelectedFlowId(flow.id)}
                  onToggle={(isActive) => toggleFlow.mutate({ id: flow.id, isActive })}
                  onDuplicate={() => handleDuplicateFlow(flow)}
                  onExport={() => handleExportFlow(flow)}
                  isDuplicating={state.duplicatingFlowId === flow.id}
                  executions={{
                    total: Math.floor(Math.random() * 100),
                    success: Math.floor(Math.random() * 80),
                    failed: Math.floor(Math.random() * 20),
                    lastRun: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 m-0 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flowTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => createFlow.mutate({
                    name: template.name,
                    description: template.description,
                    flowData: JSON.stringify({ nodes: template.nodes, edges: template.edges }),
                  })}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <N8NNodeConfig
        node={state.selectedNode}
        open={state.isConfigOpen}
        onClose={actions.closeNodeConfig}
        onSave={handleNodeSave}
      />

      <ImportDialog
        open={state.isImporting}
        onOpenChange={actions.setIsImporting}
        importFile={state.importFile}
        onFileChange={actions.setImportFile}
        importLoading={state.importLoading}
        importProgress={state.importProgress}
        onImport={handleImportFlow}
      />

      <CreateDialog
        open={state.isCreating}
        onOpenChange={actions.setIsCreating}
        name={state.newFlowName}
        description={state.newFlowDescription}
        onNameChange={actions.setNewFlowName}
        onDescriptionChange={actions.setNewFlowDescription}
        onCreate={handleCreateFlow}
      />

      <ValidationDialog
        open={state.showValidationDialog}
        onOpenChange={actions.hideValidation}
        result={state.validationResult}
        onConfirm={confirmSaveFlow}
      />
    </FarmaDashboardLayout>
  );
}