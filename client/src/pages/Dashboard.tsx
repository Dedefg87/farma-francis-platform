import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"atendimentos" | "integracoes">(
    "atendimentos"
  );
  const [selectedQueue, setSelectedQueue] = useState("todas");
  const [selectedPeriod, setSelectedPeriod] = useState("hoje");

  // Buscar dados reais do backend com filtro de período
  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = trpc.dashboardStats.getStats.useQuery({ period: selectedPeriod });
  const { data: variations } = trpc.dashboardStats.getVariations.useQuery({
    period: selectedPeriod,
  });
  const { data: contactsByHour } =
    trpc.dashboardStats.getContactsByHour.useQuery({ period: selectedPeriod });
  const { data: conversationsByQueue } =
    trpc.dashboardStats.getConversationsByQueue.useQuery({
      period: selectedPeriod,
    });
  const { data: agentStats, isLoading: loadingAgents } =
    trpc.dashboardStats.getAgentStats.useQuery({ period: selectedPeriod });
  const { data: conversationsByChannel } =
    trpc.dashboardStats.getConversationsByChannel.useQuery({ period: selectedPeriod });
  const { data: conversationsByStatus } =
    trpc.dashboardStats.getConversationsByStatus.useQuery({ period: selectedPeriod });

  // Dados de métricas com valores reais
  const metricsData = {
    atendimentos: {
      value: stats?.totalConversations || 0,
      change: variations?.conversations || 0,
      trend:
        (variations?.conversations || 0) >= 0
          ? ("up" as const)
          : ("down" as const),
    },
    clientesUnicos: {
      value: stats?.uniqueCustomers || 0,
      change: variations?.customers || 0,
      trend:
        (variations?.customers || 0) >= 0 ? ("up" as const) : ("down" as const),
    },
    mensagensEnviadas: {
      value: stats?.messagesSent || 0,
      change: variations?.messagesSent || 0,
      trend:
        (variations?.messagesSent || 0) >= 0
          ? ("up" as const)
          : ("down" as const),
    },
    mensagensRecebidas: {
      value: stats?.messagesReceived || 0,
      change: variations?.messagesReceived || 0,
      trend:
        (variations?.messagesReceived || 0) >= 0
          ? ("up" as const)
          : ("down" as const),
    },
    mediaAtendPorAgente: {
      value: stats?.avgPerAgent || 0,
      change: variations?.avgPerAgent || 0,
      trend:
        (variations?.avgPerAgent || 0) >= 0
          ? ("up" as const)
          : ("down" as const),
    },
    tma: stats?.avgHandlingTime || "00:00:00",
  };

  // Dados reais para gráfico de contatos por hora
  const contatosPorHoraData =
    contactsByHour?.map(h => ({
      hora: h.hour,
      chats: h.chats,
      chamadas: h.calls,
      abandonadas: h.abandoned,
    })) || [];

  // Dados reais para gráfico de pizza (atendimentos por fila)
  const atendimentosPorFilaData = conversationsByQueue || [];

  // Dados reais de canal
  const atendimentosPorCanalData = conversationsByChannel || [];

  // Dados reais de status
  const atendimentosPorStatusData = conversationsByStatus || [];

  // Dados reais da tabela de agentes
  const agentesData = agentStats || [];

  const renderMetricCard = (
    label: string,
    value: number | string,
    change?: number,
    trend?: "up" | "down",
    isTime?: boolean
  ) => {
    // Ensure progressValue is always a valid number between 0-100
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
        {/* Header com Tabs e Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("atendimentos")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "atendimentos"
                  ? "bg-[#1e1b4b] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Atendimentos
            </button>
            <button
              onClick={() => setActiveTab("integracoes")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "integracoes"
                  ? "bg-[#1e1b4b] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Integrações
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Fila</span>
              <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Período</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="ontem">Ontem</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => refetchStats()}
              disabled={loadingStats}
              className="bg-[#1e1b4b] hover:bg-[#2d2a5b] text-white"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loadingStats ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card className="p-6">
            {renderMetricCard(
              "Atendimentos",
              metricsData.atendimentos.value,
              metricsData.atendimentos.change,
              metricsData.atendimentos.trend
            )}
          </Card>
          <Card className="p-6">
            {renderMetricCard(
              "Clientes únicos",
              metricsData.clientesUnicos.value,
              metricsData.clientesUnicos.change,
              metricsData.clientesUnicos.trend
            )}
          </Card>
          <Card className="p-6">
            {renderMetricCard(
              "Mensagens enviadas",
              metricsData.mensagensEnviadas.value,
              metricsData.mensagensEnviadas.change,
              metricsData.mensagensEnviadas.trend
            )}
          </Card>
          <Card className="p-6">
            {renderMetricCard(
              "Mensagens recebidas",
              metricsData.mensagensRecebidas.value,
              metricsData.mensagensRecebidas.change,
              metricsData.mensagensRecebidas.trend
            )}
          </Card>
          <Card className="p-6">
            {renderMetricCard(
              "Méd. atend. / agente",
              metricsData.mediaAtendPorAgente.value,
              metricsData.mediaAtendPorAgente.change,
              metricsData.mediaAtendPorAgente.trend
            )}
          </Card>
          <Card className="p-6">
            {renderMetricCard(
              "TMA",
              metricsData.tma,
              undefined,
              undefined,
              true
            )}
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Contatos por Hora */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Contatos por hora
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#1e1b4b]"></div>
                  Chats
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Chamadas
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                  Abandonadas
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contatosPorHoraData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="chats" fill="#1e1b4b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="chamadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="abandonadas"
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Atendimentos por Fila */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Atendimentos por fila
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={atendimentosPorFilaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {atendimentosPorFilaData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || "#4f46e5"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Atendimentos por Canal */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Atendimentos por canal
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={atendimentosPorCanalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {atendimentosPorCanalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico de Status dos Atendimentos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Status dos Atendimentos
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={atendimentosPorStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {atendimentosPorStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Tabela de Agentes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Desempenho por Agente
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Agente
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Atendimentos
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Dias
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Méd. Atend. / Dia
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Msg. Enviadas
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Msg. Recebidas
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    TMA
                  </th>
                </tr>
              </thead>
              <tbody>
                {agentesData.map((agente, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.nome || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.atendimentos}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.dias}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.mediaAtendPorDia.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.msgEnviadas}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.msgRecebidas}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {agente.tma}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
