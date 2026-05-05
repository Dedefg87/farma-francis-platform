import { useState, useCallback } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Sparkles, RotateCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { flowTemplates } from "./templates-modern";

export default function Automation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");

  // Queries
  const { data, isLoading, refetch } = trpc.automation.list.useQuery({});
  const flows = data?.items || [];
  
  // Mutations
  const createFlow = trpc.automation.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Fluxo criado!");
      setIsCreating(false);
      setSelectedFlowId(data.id);
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateFlow = trpc.automation.update.useMutation({
    onSuccess: () => { toast.success("Atualizado!"); refetch(); },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteFlow = trpc.automation.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); setSelectedFlowId(null); refetch(); },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  // Handlers
  const handleCreateFlow = useCallback(() => {
    if (!newFlowName.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    createFlow.mutate({
      name: newFlowName,
      description: newFlowDescription,
      flowData: { nodes: [], edges: [] },
    });
  }, [newFlowName, newFlowDescription, createFlow]);

  const handleToggleFlow = useCallback((flow: any) => {
    updateFlow.mutate({ id: flow.id, isActive: !flow.isActive });
  }, [updateFlow]);

  const handleDeleteFlow = useCallback((flow: any) => {
    if (confirm(`Remover "${flow.name}"?`)) {
      deleteFlow.mutate({ id: flow.id });
    }
  }, [deleteFlow]);

  const handleUseTemplate = useCallback((template: any) => {
    createFlow.mutate({
      name: template.name,
      description: template.description,
      flowData: { nodes: template.nodes || [], edges: template.edges || [] },
    });
  }, [createFlow]);

  // Loading
  if (isLoading) {
    return (
      <FarmaDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <ReloadIcon className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando...</span>
        </div>
      </FarmaDashboardLayout>
    );
  }

  return (
    <FarmaDashboardLayout>
      <div className="h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Automações</h1>
            <p className="text-gray-600">Gerencie fluxos e templates</p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Fluxo
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar fluxos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">Exportar</Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
          >
            Todos ({flows.length})
          </Button>
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
          >
            Ativos ({flows.filter(f => f.isActive).length})
          </Button>
          <Button
            variant={activeTab === "templates" ? "default" : "outline"}
            onClick={() => setActiveTab("templates")}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </div>

        {activeTab === "templates" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flowTemplates.map(template => (
              <Card key={template.id} className="p-4">
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                <Button onClick={() => handleUseTemplate(template)}>
                  Usar Template
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === "active" ? flows.filter(f => f.isActive) : flows)
              .filter(flow => 
                !searchQuery || 
                flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map(flow => (
                <Card key={flow.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{flow.name}</h3>
                    <Button
                      variant={flow.isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFlow(flow)}
                    >
                      {flow.isActive ? "Ativo" : "Inativo"}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{flow.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFlowId(flow.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow)}
                    >
                      Remover
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {isCreating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 w-96">
              <h2 className="text-xl font-bold mb-4">Criar Fluxo</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <Input
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="Nome do fluxo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Input
                    value={newFlowDescription}
                    onChange={(e) => setNewFlowDescription(e.target.value)}
                    placeholder="Descrição (opcional)"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateFlow} disabled={createFlow.isLoading}>
                    {createFlow.isLoading ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
