import React, { useState, useMemo } from 'react';
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";

interface PeriodOption {
  label: string;
  value: string;
}

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  totalAgents?: number;
}

interface AgentPerformance {
  name: string;
  conversations: number;
  days: number;
  avgPerDay: number;
  messagesSent: number;
  messagesReceived: number;
  tma: string;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("mes");
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(undefined);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<string | undefined>(undefined);

  const periodOptions: PeriodOption[] = [
    { label: "Hoje", value: "hoje" },
    { label: "Semana", value: "semana" },
    { label: "Mês", value: "mes" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "Todos", value: "all" },
    { label: "Personalizado", value: "custom" },
  ];

  const queryInput = useMemo(() => {
    if (selectedPeriod === "custom") {
      return {
        period: selectedPeriod,
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }
    return { period: selectedPeriod };
  }, [selectedPeriod, customStartDate, customEndDate]);

  const statsQuery = trpc.dashboardStats.getStats.useQuery(
    queryInput,
    { refetchOnWindowFocus: false }
  );
  const channelQuery = trpc.dashboardStats.getConversationsByChannel.useQuery(
    queryInput,
    { refetchOnWindowFocus: false }
  );
  const statusQuery = trpc.dashboardStats.getConversationsByStatus.useQuery(
    queryInput,
    { refetchOnWindowFocus: false }
  );
  const hourQuery = trpc.dashboardStats.getContactsByHour.useQuery(
    queryInput,
    { refetchOnWindowFocus: false }
  );
  const agentQuery = trpc.dashboardStats.getAgentStats.useQuery(
    queryInput,
    { refetchOnWindowFocus: false }
  );

  const stats = statsQuery.data as DashboardStats | undefined;
  const channelData = channelQuery.data ?? [];
  const statusData = statusQuery.data ?? [];
  const hourData = hourQuery.data?.map((h: any) => ({
    hora: `${String(h.hour).padStart(2, '0')}h`,
    chats: Number(h.chats) || 0,
  })) ?? [];
  const agentData = agentQuery.data as AgentPerformance[] ?? [];

  const isLoading = statsQuery.isLoading || channelQuery.isLoading || statusQuery.isLoading || hourQuery.isLoading || agentQuery.isLoading;
  const isError = statsQuery.isError || channelQuery.isError || statusQuery.isError || hourQuery.isError || agentQuery.isError;

  const hasData = useMemo(() => {
    return (
      (stats?.totalConversations ?? 0) > 0 ||
      channelData.length > 0 ||
      statusData.length > 0 ||
      hourData.some(item => item.chats > 0) ||
      agentData.length > 0
    );
  }, [stats, channelData, statusData, hourData, agentData]);

  const calculateTMA = (): string => {
    if (!agentData || agentData.length === 0) return "00:00:00";
    let totalSeconds = 0;
    agentData.forEach((agent) => {
      if (agent.tma) {
        const [h, m, s] = agent.tma.split(':').map(Number);
        totalSeconds += (h * 3600) + (m * 60) + s;
      }
    });
    const avgSeconds = Math.round(totalSeconds / agentData.length);
    const hours = Math.floor(avgSeconds / 3600);
    const minutes = Math.floor((avgSeconds % 3600) / 60);
    const seconds = Math.round(avgSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const renderMetricCard = (label: string, value: number | string | undefined, change?: number) => (
    <Card className="p-3 md:p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="text-gray-600 text-xs font-semibold uppercase">{label}</div>
      <div className="flex items-baseline gap-2 mt-1 md:mt-2">
        <div className="text-xl md:text-2xl font-bold text-gray-900">
          {value === undefined || value === null ? "—" : (value.toString().includes(':') ? value : value.toLocaleString('pt-BR'))}
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            {change}%
          </div>
        )}
      </div>
    </Card>
  );

  const handlePeriodChange = (periodValue: string) => {
    setSelectedPeriod(periodValue);
    if (periodValue === "custom") {
      setShowCustomDatePicker(true);
      setTempStartDate(customStartDate);
      setTempEndDate(customEndDate);
    } else {
      setShowCustomDatePicker(false);
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  const handleApplyCustomDates = () => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate);
      setCustomEndDate(tempEndDate);
      setShowCustomDatePicker(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

  return (
    <FarmaDashboardLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard de Performance</h1>

        {/* Seleção de Período */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${selectedPeriod === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Seletor de Data Personalizado */}
        {showCustomDatePicker && (
          <Card className="p-4 mb-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col">
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mb-1">Data Início:</label>
                <input
                  type="date"
                  id="startDate"
                  value={tempStartDate || ''}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-1">Data Fim:</label>
                <input
                  type="date"
                  id="endDate"
                  value={tempEndDate || ''}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleApplyCustomDates}
                className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                disabled={!tempStartDate || !tempEndDate}
              >
                Aplicar
              </button>
            </div>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <span className="ml-3 text-lg text-gray-600">Carregando dados...</span>
          </div>
        )}

        {isError && (
          <div className="flex justify-center items-center h-64 text-red-600 text-lg">
            Erro ao carregar dados. Tente novamente.
          </div>
        )}

        {!isLoading && !isError && !hasData && (
          <div className="flex justify-center items-center h-64 text-gray-600 text-lg">
            Sem dados neste período.
          </div>
        )}

        {!isLoading && !isError && hasData && (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {renderMetricCard("Total Conversas", stats?.totalConversations)}
              {renderMetricCard("Clientes Únicos", stats?.uniqueCustomers)}
              {renderMetricCard("Mensagens Enviadas", stats?.messagesSent)}
              {renderMetricCard("Mensagens Recebidas", stats?.messagesReceived)}
              {renderMetricCard("TMA Médio", calculateTMA())}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversas por Canal */}
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Conversas por Canal</h2>
                {channelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        dataKey="count"
                        nameKey="channel"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-gray-500">Sem dados de canal.</div>
                )}
              </Card>

              {/* Conversas por Status */}
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Conversas por Status</h2>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#82ca9d"
                        label
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-gray-500">Sem dados de status.</div>
                )}
              </Card>

              {/* Contatos por Hora */}
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Contatos por Hora</h2>
                {hourData.length > 0 && hourData.some(item => item.chats > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="chats" fill="#8884d8" name="Chats" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-gray-500">Sem dados de contatos por hora.</div>
                )}
              </Card>

              {/* Performance dos Agentes */}
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance dos Agentes</h2>
                {agentData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Msg Enviadas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Msg Recebidas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TMA</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {agentData.map((agent, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.conversations}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.messagesSent}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.messagesReceived}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.tma}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-gray-500">Sem dados de performance de agentes.</div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
