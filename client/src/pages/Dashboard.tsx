import { useState } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { trpc } from "@/lib/trpc";

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  byChannel?: Array<{ channel: string; count: number }>;
  byStatus?: Array<{ status: string; count: number }>;
  byHour?: Array<{ hour: number; chats: number }>;
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

  // Preparar dados para gráfico de canais
  const channelData = stats?.byChannel?.map((c: any) => ({
    name: c.channel?.charAt(0).toUpperCase() + c.channel?.slice(1) || "Desconhecido",
    value: Number(c.count) || 0,
    color: 
      c.channel === "whatsapp" ? "#25D366" :
      c.channel === "instagram" ? "#E4405F" :
      c.channel === "facebook" ? "#1877F2" :
      "#6B7280",
  })) || [];

  // Preparar dados para gráfico de status
  const statusData = stats?.byStatus?.map((s: any) => {
    const statusLabels: Record<string, string> = {
      open: "Em aberto",
      closed: "Encerrados",
      pending: "Pendentes",
      completed: "Completados",
    };
    const statusColors: Record<string, string> = {
      open: "#3B82F6",
      closed: "#10B981",
      pending: "#F59E0B",
      completed: "#8B5CF6",
    };
    return {
      name: statusLabels[s.status] || s.status || "Desconhecido",
      value: Number(s.count) || 0,
      color: statusColors[s.status] || "#6B7280",
    };
  }) || [];

  // Preparar dados para gráfico de hora
  const hourData = stats?.byHour?.map((h: any) => ({
    hora: `${h.hour}:00`,
    chats: Number(h.chats) || 0,
  })) || [];

  const renderMetricCard = (label: string, value: number, change?: number) => (
    <Card className="p-6 bg-white">
      <div className="text-gray-600 text-sm font-medium">{label}</div>
      <div className="flex items-baseline gap-2 mt-3">
        <div className="text-3xl font-bold text-gray-900">{value.toLocaleString('pt-BR')}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium cursor-pointer hover:border-gray-400"
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            <span className="ml-3 text-gray-600">Carregando dados...</span>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && stats && (
          <>
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard("Total de Atendimentos", stats.totalConversations)}
              {renderMetricCard("Clientes Únicos", stats.uniqueCustomers)}
              {renderMetricCard("Mensagens Enviadas", stats.messagesSent)}
              {renderMetricCard("Mensagens Recebidas", stats.messagesReceived)}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Contatos por Hora */}
              {hourData.length > 0 && (
                <Card className="p-6 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Contatos por Hora</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hora" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        labelStyle={{ color: '#111827' }}
                      />
                      <Bar dataKey="chats" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Gráfico de Canais */}
              {channelData.length > 0 && (
                <Card className="p-6 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Atendimentos por Canal</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        labelStyle={{ color: '#111827' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Gráfico de Status */}
              {statusData.length > 0 && (
                <Card className="p-6 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Atendimentos por Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
                        labelStyle={{ color: '#111827' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>

            {/* Debug - Dados Brutos */}
            <Card className="p-6 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Dados Brutos (Debug)</h3>
              <pre className="bg-white p-4 rounded border border-gray-200 overflow-auto max-h-48 text-sm text-gray-700">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </Card>
          </>
        )}

        {!isLoading && !stats && (
          <Card className="p-6 bg-white text-center">
            <p className="text-red-500 font-medium">Nenhum dado disponível</p>
          </Card>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
