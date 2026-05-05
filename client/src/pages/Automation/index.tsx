import { useState } from "react";
import { trpc } from "../../lib/trpc";

export default function Automation() {
  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const { data: flowsData, isLoading, refetch } = trpc.automation.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );
  const deleteMutation = trpc.automation.delete.useMutation({ onSuccess: () => refetch() });
  const updateMutation = trpc.automation.update.useMutation({ onSuccess: () => refetch() });

  const flows = flowsData?.items || [];
  const activeFlows = flows.filter(f => f.isActive);
  const displayedFlows = activeTab === "all" ? flows : activeFlows;

  const handleToggleActive = (id: number, isActive: boolean) => {
    updateMutation.mutate({ id, isActive: !isActive });
  };

  const handleDelete = (id: number) => {
    if (confirm("Desativar este fluxo?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Automações</h1>
        <span className="text-gray-600">{flows.length} fluxos</span>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Todos ({flows.length})
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded ${activeTab === "active" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Ativos ({activeFlows.length})
        </button>
      </div>

      {displayedFlows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum fluxo encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedFlows.map(flow => (
            <div key={flow.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{flow.name}</h3>
                <span className={`px-2 py-1 text-xs rounded ${flow.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {flow.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              {flow.description && (
                <p className="text-sm text-gray-600 mb-3">{flow.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(flow.id, flow.isActive)}
                  className={`px-3 py-1 text-sm rounded ${flow.isActive ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}
                >
                  {flow.isActive ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => handleDelete(flow.id)}
                  className="px-3 py-1 text-sm rounded bg-red-100 text-red-800"
                >
                  Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
