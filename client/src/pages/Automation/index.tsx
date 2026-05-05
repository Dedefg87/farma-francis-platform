import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { flowTemplates } from "./templates-modern";
import { AutomationHeader } from "./components/AutomationHeader";
import { FlowCardPro } from "./components/FlowCardPro";
import { TemplateCard } from "./components/TemplateCard";
import { AutomationStats } from "./components/AutomationStats";
import { AutomationEmptyState } from "./components/AutomationEmptyState";
import { CreateDialog } from "./components/CreateDialog";
import { FlowEditor } from "./components/FlowEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import type { FlowTemplate } from "./templates-modern";

type TabType = "all" | "active" | "templates" | "stats";

export default function Automation() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFlow, setEditingFlow] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  // tRPC queries/mutations
  const { data: flowsData, isLoading, refetch } = trpc.automation.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const { data: statsData } = trpc.automation.stats.useQuery(
    { period: "week" },
    { enabled: activeTab === "stats" }
  );

  const createMutation = trpc.automation.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMutation = trpc.automation.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.automation.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const toggleActiveMutation = trpc.automation.update.useMutation({
    onSuccess: () => refetch(),
  });

  // Derived data
  const flows = flowsData?.items || [];
  const activeFlows = flows.filter(f => f.isActive);
  const inactiveFlows = flows.filter(f => !f.isActive);

  // Handlers
  const handleCreateFlow = (name: string, templateType: string, flowData: Record<string, unknown>) => {
    createMutation.mutate({
      name,
      templateType,
      flowData,
      isActive: true,
    });
    setShowCreateDialog(false);
  };

  const handleEditFlow = (flowId: number) => {
    setEditingFlow(flowId);
  };

  const handleUpdateFlow = (flowId: number, data: Parameters<typeof updateMutation.mutate>[0]) => {
    updateMutation.mutate({ id: flowId, ...data });
    setEditingFlow(null);
  };

  const handleDeleteFlow = (flowId: number) => {
    if (confirm("Tem certeza que deseja desativar este fluxo?")) {
      deleteMutation.mutate({ id: flowId });
    }
  };

  const handleToggleActive = (flowId: number, isActive: boolean) => {
    toggleActiveMutation.mutate({
      id: flowId,
      isActive: !isActive,
    });
  };

  const handleUseTemplate = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowCreateDialog(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando automações...</span>
      </div>
    );
  }

  // Editing flow view
  if (editingFlow !== null) {
    const flow = flows.find(f => f.id === editingFlow);
    if (!flow) return <div>Fluxo não encontrado</div>;

    return (
      <FlowEditor
        flow={flow}
        onSave={(data) => handleUpdateFlow(editingFlow, data)}
        onClose={() => setEditingFlow(null)}
        isSaving={updateMutation.isLoading}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <AutomationHeader
        title="Automações"
        description="Gerencie fluxos de automação, templates e estatísticas"
        action={
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Automação
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos ({flows.length})</TabsTrigger>
          <TabsTrigger value="active">Ativos ({activeFlows.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({flowTemplates.length})</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* All Flows Tab */}
        <TabsContent value="all" className="mt-6">
          {flows.length === 0 ? (
            <AutomationEmptyState onCreate={() => setShowCreateDialog(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flows.map(flow => (
                <FlowCardPro
                  key={flow.id}
                  flow={flow}
                  onEdit={() => handleEditFlow(flow.id)}
                  onToggleActive={() => handleToggleActive(flow.id, flow.isActive)}
                  onDelete={() => handleDeleteFlow(flow.id)}
                  isToggling={toggleActiveMutation.isLoading}
                  isDeleting={deleteMutation.isLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Flows Tab */}
        <TabsContent value="active" className="mt-6">
          {activeFlows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum fluxo ativo no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFlows.map(flow => (
                <FlowCardPro
                  key={flow.id}
                  flow={flow}
                  onEdit={() => handleEditFlow(flow.id)}
                  onToggleActive={() => handleToggleActive(flow.id, flow.isActive)}
                  onDelete={() => handleDeleteFlow(flow.id)}
                  isToggling={toggleActiveMutation.isLoading}
                  isDeleting={deleteMutation.isLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Templates Disponíveis</h3>
            <p className="text-gray-600">Use um template para criar um novo fluxo rapidamente</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flowTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => handleUseTemplate(template)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          {statsData ? (
            <AutomationStats stats={statsData} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              Carregando estatísticas...
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateDialog
          templates={flowTemplates}
          selectedTemplate={selectedTemplate}
          onCreate={handleCreateFlow}
          onClose={() => {
            setShowCreateDialog(false);
            setSelectedTemplate(null);
          }}
          isCreating={createMutation.isLoading}
        />
      )}
    </div>
  );
}
