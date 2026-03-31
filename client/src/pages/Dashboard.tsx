import { useState, useEffect } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  byChannel?: any[];
  byStatus?: any[];
  byHour?: any[];
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Usar tRPC
  const { data, isLoading } = trpc.dashboardStats.getStats.useQuery(
    { period: selectedPeriod },
    {
      onSuccess: (data) => {
        console.log("[Dashboard] Dados recebidos:", data);
        setStats(data as any);
      },
      onError: (error) => {
        console.error("[Dashboard] Erro:", error);
      },
    }
  );

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        )}

        {/* Métricas */}
        {!isLoading && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-6">
                <div className="text-gray-600 text-sm">Total de Atendimentos</div>
                <div className="text-3xl font-bold mt-2">{stats.totalConversations}</div>
              </Card>

              <Card className="p-6">
                <div className="text-gray-600 text-sm">Clientes Únicos</div>
                <div className="text-3xl font-bold mt-2">{stats.uniqueCustomers}</div>
              </Card>

              <Card className="p-6">
                <div className="text-gray-600 text-sm">Mensagens Enviadas</div>
                <div className="text-3xl font-bold mt-2">{stats.messagesSent}</div>
              </Card>

              <Card className="p-6">
                <div className="text-gray-600 text-sm">Mensagens Recebidas</div>
                <div className="text-3xl font-bold mt-2">{stats.messagesReceived}</div>
              </Card>

              <Card className="p-6">
                <div className="text-gray-600 text-sm">Total de Agentes</div>
                <div className="text-3xl font-bold mt-2">{stats.totalAgents || 0}</div>
              </Card>
            </div>

            {/* Dados brutos (debug) */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Dados Brutos (Debug)</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </Card>
          </>
        )}

        {!isLoading && !stats && (
          <Card className="p-6">
            <p className="text-red-500">Nenhum dado disponível</p>
          </Card>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
