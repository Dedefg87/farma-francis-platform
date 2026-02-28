import { useCallback } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, Zap, Menu as MenuIcon, Sparkles } from "lucide-react";
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
import { FlowCard } from "./components/FlowCard";
import { TemplateCard } from "./components/TemplateCard";
import { ImportDialog } from "./components/ImportDialog";
import { CreateDialog } from "./components/CreateDialog";
import { FlowEditor } from "./components/FlowEditor";
import { ValidationDialog } from "./components/ValidationDialog";
import { flowTemplates } from "./templates";

export default function Automation() {
  const { state, actions } = useFlowState();
  const { validateBeforeSave, validateFlow } = useFlowValidation();

  const { data: visualFlows, refetch: refetchFlows } = trpc.visualFlows.list.useQuery();
  const { data: automationFlows } = trpc.automation.list.useQuery();
  const { data: uraMenus } = trpc.uraMenus.list.useQuery();

  const { parseJSON, convertN8N } = useFlowImportWorker({
    onProgress: actions.setImportProgress,
    onError: error => {
      toast.error(`Erro no processamento: ${error}`);
      actions.setImportLoading(false);
    },
  });

  const createFlow = trpc.visualFlows.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Fluxo criado com sucesso!");
      actions.setSelectedFlowId(data.insertId as number);
      actions.setIsCreating(false);
      actions.setNewFlowName("");
      actions.setNewFlowDescription("");
      refetchFlows();
    },
    onError: () => toast.error("Erro ao criar fluxo"),
  });

  const updateFlow = trpc.visualFlows.update.useMutation({
    onSuccess: () => {
      toast.success("Fluxo atualizado!");
      refetchFlows();
    },
  });

  const deleteFlow = trpc.visualFlows.delete.useMutation({
    onSuccess: () => {
      toast.success("Fluxo deletado!");
      actions.setSelectedFlowId(null);
      refetchFlows();
    },
  });

  const toggleFlow = trpc.visualFlows.toggle.useMutation({
    onSuccess: () => refetchFlows(),
  });

  // Duplicar fluxo
  const handleDuplicateFlow = useCallback((flow: typeof visualFlows extends (infer T)[] ? T : never) => {
    if (!flow) return;
    
    createFlow.mutate({
      name: `Cópia de ${flow.name}`,
      description: flow.description || undefined,
      flowData: flow.flowData,
    });
  }, [createFlow]);

  // Exportar fluxo como JSON
  const handleExportFlow = useCallback((flow: typeof visualFlows extends (infer T)[] ? T : never) => {
    if (!flow) return;
    
    const exportData = {
      name: flow.name,
      description: flow.description,
      flowData: JSON.parse(flow.flowData),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-${flow.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Fluxo exportado com sucesso!");
  }, []);

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

        let parseResult: any;
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
            const result: any = await convertN8N(flowData);
            nodes = result.nodes;
            edges = result.edges;
            toast.success(`Convertido: ${result.stats.totalNodes} nós, ${result.stats.totalEdges} conexões`);
          } catch {
            const converted = convertToReactFlow(content);
            nodes = converted.nodes;
            edges = converted.edges;
          }
        } else if (flowData.options && typeof flowData.options === "string") {
          const converted = convertIVRToReactFlow(flowData);
          nodes = converted.nodes;
          edges = converted.edges;
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

  const handleSaveFlow = useCallback((nodes: Node[], edges: any[]) => {
    if (!state.selectedFlowId) return;

    // Validar fluxo antes de salvar
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

  const handleNodeSave = useCallback((nodeId: string, data: any) => {
    if (!state.selectedFlowId) return;
    const selectedFlow = visualFlows?.find(f => f.id === state.selectedFlowId);
    if (!selectedFlow?.flowData) return;

    const flowData = JSON.parse(selectedFlow.flowData);
    const updatedNodes = flowData.nodes.map((node: Node) =>
      node.id === nodeId ? { ...node, data } : node
    );

    updateFlow.mutate(
      { id: state.selectedFlowId, flowData: JSON.stringify({ ...flowData, nodes: updatedNodes }) },
      {
        onSuccess: () => toast.success("Configuração do nó salva!"),
        onError: () => toast.error("Erro ao salvar configuração do nó"),
      }
    );
  }, [state.selectedFlowId, visualFlows, updateFlow]);

  // Duplicar fluxo
  const handleDuplicateFlow = useCallback((flow: any) => {
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

  // Exportar fluxo
  const handleExportFlow = useCallback((flow: any) => {
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

  const selectedFlow = visualFlows?.find(f => f.id === state.selectedFlowId);

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Automação e Fluxos</h1>
              <p className="text-sm text-muted-foreground">
                Crie fluxos visuais de automação estilo N8N
              </p>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
        </div>

        <Tabs defaultValue="visual" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="visual">
              <Workflow className="w-4 h-4 mr-2" />
              Fluxos Visuais
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="simple">
              <Zap className="w-4 h-4 mr-2" />
              Automações Simples
            </TabsTrigger>
            <TabsTrigger value="ura">
              <MenuIcon className="w-4 h-4 mr-2" />
              URA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 m-0">
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
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visualFlows?.map(flow => (
                    <FlowCard
                      key={flow.id}
                      flow={flow}
                      onClick={() => actions.setSelectedFlowId(flow.id)}
                      onDuplicate={() => handleDuplicateFlow(flow)}
                      onExport={() => handleExportFlow(flow)}
                      isDuplicating={state.duplicatingFlowId === flow.id}
                    />
                  ))}
                  {(!visualFlows || visualFlows.length === 0) && (
                    <Card className="p-8 col-span-full text-center">
                      <Workflow className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">Nenhum fluxo criado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crie seu primeiro fluxo visual de automação
                      </p>
                      <Button onClick={() => actions.setIsCreating(true)}>
                        Criar Primeiro Fluxo
                      </Button>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="p-4">
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

          <TabsContent value="simple" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationFlows?.map(flow => (
                <Card key={flow.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{flow.name}</h3>
                    <div className={`px-2 py-0.5 rounded text-xs ${flow.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {flow.isActive ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                  {flow.description && <p className="text-sm text-muted-foreground mb-2">{flow.description}</p>}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{flow.trigger}</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{flow.channel}</span>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ura" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uraMenus?.map(menu => (
                <Card key={menu.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{menu.name}</h3>
                    <div className={`px-2 py-0.5 rounded text-xs ${menu.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {menu.isActive ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{menu.welcomeMessage}</p>
                  <div className="text-xs text-muted-foreground">
                    Última atualização: {new Date(menu.updatedAt).toLocaleDateString("pt-BR")}
                  </div>
                </Card>
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

      <ValidationDialog
        open={state.showValidationDialog}
        onOpenChange={actions.hideValidation}
        result={state.validationResult}
        onConfirm={confirmSaveFlow}
      />
    </FarmaDashboardLayout>
  );
}
