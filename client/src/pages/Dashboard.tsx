import React, { useState, useMemo } from 'react';
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

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

  const statsQuery = trpc.dashboardStats.getStats.useQuery(queryInput, { refetchOnWindowFocus: false });
  const channelQuery = trpc.dashboardStats.getConversationsByChannel.useQuery(queryInput, { refetchOnWindowFocus: false });
  const statusQuery = trpc.dashboardStats.getConversationsByStatus.useQuery(queryInput, { refetchOnWindowFocus: false });
  const hourQuery = trpc.dashboardStats.getContactsByHour.useQuery(queryInput, { refetchOnWindowFocus: false });
  const agentQuery = trpc.dashboardStats.getAgentStats.useQuery(queryInput, { refetchOnWindowFocus: false });

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
    return `\${String(hours).padStart(2, '0')}:\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}`;
  };

  const renderMetricCard = (label: string, value: number | string | undefined) => (
    <Card className="p-3 md:p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
      <div className="text-gray-600 text-xs font-semibold uppercase truncate">{label}</div>
      <div className="text-lg md:text-xl font-bold text-gray-900 mt-1">
        {value === undefined || value === null ? "—" : (value.toString().includes(':') ? value : value.toLocaleString('pt-BR'))}
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

  const renderEmptyChart = (title: string) => (
    <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="flex items-center justify-center h-48 text-gray-400">
        <span className="text-sm">Sem dados disponíveis</span>
      </div>
    </Card>
  );

  return (
    <FarmaDashboardLayout>
      <div className="w-full bg-gray-50 min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Cabeçalho com Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                      \${selectedPeriod === option.value
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Data Personalizado */}
            {showCustomDatePicker && (
              <div className="mt-4 pt-4 border-t border-gray-200">
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
              </div>
            )}
          </div>

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

          {!isLoading && !isError && (
            <>
              {/* Cards de Métricas - 7 Colunas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {renderMetricCard("Atendimentos", stats?.totalConversations)}
                {renderMetricCard("Clientes Únicos", stats?.uniqueCustomers)}
                {renderMetricCard("Msg Enviadas", stats?.messagesSent)}
                {renderMetricCard("Msg Recebidas", stats?.messagesReceived)}
                {renderMetricCard("Méd. Atend./Agente", stats?.totalAgents ? (stats.totalConversations / stats.totalAgents).toFixed(1) : "—")}
                {renderMetricCard("TMA Médio", calculateTMA())}
                {renderMetricCard("% SLA", "—")}
              </div>

              {/* Layout Principal - Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coluna Esquerda - 2/3 da largura */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Contatos por Hora */}
                  <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="flex gap-2 mb-4">
                      <h3 className="text-sm font-semibold text-gray-800 flex-1">Contatos por Hora</h3>
                      <span className="text-xs text-gray-500">ou por dia do mês</span>
                    </div>
                    {hourData.length > 0 && hourData.some(item => item.chats > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="chats" fill="#0088FE" name="Chats" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-gray-400">
                        <span className="text-sm">Sem dados neste período</span>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Coluna Direita - 1/3 da largura - Grid 2x2 */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-1">
                    {/* Atendimentos por Fila */}
                    {channelData && channelData.length > 0 ? (
                      <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Atendimentos por Fila</h3>
                        <ResponsiveContainer width="100%" height={150}>
                          <PieChart>
                            <Pie
                              data={channelData}
                              dataKey="count"
                              nameKey="channel"
                              cx="50%"
                              cy="50%"
                              outerRadius={50}
                              fill="#8884d8"
                            >
                              {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => value.toString()} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    ) : renderEmptyChart("Atendimentos por Fila")}

                    {/* Atendimentos por Canal */}
                    {statusData && statusData.length > 0 ? (
                      <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Atendimentos por Canal</h3>
                        <ResponsiveContainer width="100%" height={150}>
                          <PieChart>
                            <Pie
                              data={statusData}
                              dataKey="count"
                              nameKey="status"
                              cx="50%"
                              cy="50%"
                              outerRadius={50}
                              fill="#82ca9d"
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => value.toString()} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    ) : renderEmptyChart("Atendimentos por Canal")}
                  </div>

                  {/* Segunda linha - 2x1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-1">
                    {renderEmptyChart("Atend. por Filtro URA")}
                    {renderEmptyChart("Atend. por Fechamento")}
                  </div>
                </div>
              </div>

              {/* Tabela de Agentes - Largura Completa */}
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance dos Agentes</h2>
                {agentData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Conversas</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Msg Enviadas</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Msg Recebidas</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TMA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {agentData.map((agent, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{agent.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{agent.conversations}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{agent.messagesSent}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{agent.messagesReceived}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{agent.tma}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    <span className="text-sm">Sem dados de agentes neste período</span>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </FarmaDashboardLayout>
  );
}
