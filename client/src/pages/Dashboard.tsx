import { useState, useEffect } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
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
} from "recharts";
import { trpc } from "@/lib/trpc";

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  byChannel: Array<{ channel: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byHour: Array<{ hour: number; chats: number }>;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"atendimentos" | "integracoes">(
    "atendimentos"
  );
  const [selectedQueue, setSelectedQueue] = useState("todas");
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // ✅ USAR tRPC EM VEZ DE REST
  const { data: statsData, isLoading: loading } = trpc.dashboardStats.getStats.useQuery(
    { period: selectedPeriod },
    {
      onSuccess: (data) => {
        console.log("[Dashboard] Stats received via tRPC:", data);
        setStats(data as any);
      },
      onError: (error) => {
        console.error("[Dashboard] tRPC Error:", error);
      },
    }
  );

  // Dados de métricas com valores reais
  const metricsData = {
    atendimentos: {
      value: stats?.totalConversations || 0,
      change: 0,
      trend: "up" as const,
    },
    clientesUnicos: {
      value: stats?.uniqueCustomers || 0,
      change: 0,
      trend: "up" as const,
    },
    mensagensEnviadas: {
      value: stats?.messagesSent || 0,
      change: 0,
      trend: "up" as const,
    },
    mensagensRecebidas: {
      value: stats?.messagesReceived || 0,
      change: 0,
      trend: "up" as const,
    },
    mediaAtendPorAgente: {
      value: 0,
      change: 0,
      trend: "up" as const,
    },
    tma: "00:00:00",
  };

  // Dados para gráfico de contatos por hora
  const contatosPorHoraData = stats?.byHour?.map((h: any) => ({
    hora: h.hour,
    chats: Number(h.chats) || 0,
    chamadas: 0,
    abandonadas: 0,
  })) || [];

  // Dados de canal
  const atendimentosPorCanalData = stats?.byChannel?.map((c: any) => ({
    name: c.channel?.charAt(0).toUpperCase() + c.channel?.slice(1) || "Desconhecido",
    value: Number(c.count) || 0,
    color: c.channel === "whatsapp" ? "#25D366" : c.channel === "instagram" ? "#E4405F" : "#6B7280",
  })) || [];

  // Dados de status
  const atendimentosPorStatusData = stats?.byStatus?.map((s: any) => {
    const statusLabels: Record<string, string> = {
      open: "Em aberto",
      closed: "Encerrados",
      pending: "Pendentes",
    };

    const statusColors: Record<string, string> = {
      open: "#3B82F6",
      closed: "#10B981",
      pending: "#F59E0B",
    };

    return {
      name: statusLabels[s.status] || s.status || "Desconhecido",
      value: Number(s.count) || 0,
      color: statusColors[s.status] || "#6B7280",
    };
  }) || [];

  const renderMetricCard = (
    label: string,
    value: number | string,
    change?: number,
    trend?: "up" | "down",
    isTime?: boolean
  ) => {
    let progressValue = 0;
    if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
      progressValue = Math.min(Math.max(value, 0), 100);
    }

    return (
      <div className="flex flex-col h-full">
        <div className="text-sm text-gray-600 mb-3">{label}</div>
        <div className="flex items-baseline gap-3 mb-2">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-sm ${trend === "up" ? "text-green-600" : "text-red-600"}`}
            >
              {trend === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {change}%
            </div>
          )}
        </div>
        {!isTime && (
          <div className="mt-auto">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#10b981"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(progressValue / 100) * 125.6} 125.6`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                {Math.round(progressValue)}%
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        )}

        {/* Dashboard content */}
        {!loading && stats && (
          <>
            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-4">
                {renderMetricCard("Total de Atendimentos", metricsData.atendimentos.value)}
              </Card>
              <Card className="p-4">
                {renderMetricCard("Clientes Únicos", metricsData.clientesUnicos.value)}
              </Card>
              <Card className="p-4">
                {renderMetricCard("Mensagens Enviadas", metricsData.mensagensEnviadas.value)}
              </Card>
              <Card className="p-4">
                {renderMetricCard("Mensagens Recebidas", metricsData.mensagensRecebidas.value)}
              </Card>
              <Card className="p-4">
                {renderMetricCard("TMA", metricsData.tma, undefined, undefined, true)}
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contatosPorHoraData.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Contatos por Hora</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contatosPorHoraData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="chats" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {atendimentosPorCanalData.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Atendimentos por Canal</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={atendimentosPorCanalData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {atendimentosPorCanalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {atendimentosPorStatusData.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Atendimentos por Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={atendimentosPorStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {atendimentosPorStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
