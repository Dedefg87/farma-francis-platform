/**
 * @file Componente principal do Dashboard para o SISTEMA FARMA FRANCIS PRO
 * @author OpenClaw
 * @version 2.0.0 (Refatorado)
 * @date 02 de abril de 2026
 * @description Dashboard com estatísticas, gráficos e performance de agentes
 *              com tratamento robusto de erros, skeleton loaders e otimizações
 *              Fix: JSX structure corrected for Railway build (2026-04-02 17:41)
 */

import React, { useState, useMemo, useCallback } from 'react';
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DashboardStatsOutput,
  AgentStatsOutput,
  ContactsByHourOutput,
  ConversationsByChannelOutput,
  ConversationsByStatusOutput,
} from "@/lib/shared-types";


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];





/**
 * SkeletonLoader: Componente de placeholder para carregamento
 */
const SkeletonLoader: React.FC<{ height?: string; width?: string }> = ({ height = 'h-6', width = 'w-full' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${height} ${width}`}></div>
);


export default function Dashboard() {
  // --- ESTADOS ---
  const [selectedPeriod, setSelectedPeriod] = useState<string>("mes");
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(undefined);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<string | undefined>(undefined);

  // --- OPÇÕES DE PERÍODO (MEMOIZADO) ---
  const periodOptions = useMemo(() => [
    { label: "Hoje", value: "hoje" },
    { label: "Ontem", value: "ontem" },
    { label: "Esta semana", value: "semana" },
    { label: "Este mês", value: "mes" },
    { label: "Mês anterior", value: "mes_anterior" },
    { label: "Últimos 30 dias", value: "30d" },
    { label: "Últimos 365 dias", value: "365d" },
    { label: "Personalizado", value: "custom" },
  ], []);

  // --- INPUT PARA QUERIES (MEMOIZADO) ---
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

  // --- CONFIGURAÇÃO DAS QUERIES ---
  const queryConfig = {
    refetchOnWindowFocus: false,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  };

  // --- QUERIES TRPC ---
  const statsQuery = trpc.dashboardStats.getStats.useQuery(queryInput, queryConfig);
  const channelQuery = trpc.dashboardStats.getConversationsByChannel.useQuery(queryInput, queryConfig);
  const statusQuery = trpc.dashboardStats.getConversationsByStatus.useQuery(queryInput, queryConfig);
  
  const hourQuery = trpc.dashboardStats.getContactsByHour.useQuery(queryInput, {
    ...queryConfig,
    select: (data: ContactsByHourOutput | undefined): { hora: string; chats: number }[] => 
      (data ?? []).map((chats: number, hour: number) => ({
        hora: `${String(hour).padStart(2, '0')}h`,
        chats: Number(chats) || 0,
      })),
  });
  
  const agentQuery = trpc.dashboardStats.getAgentStats.useQuery(queryInput, queryConfig);

  // --- DADOS EXTRAÍDOS ---
  const stats = statsQuery.data as DashboardStatsOutput | undefined;
  const channelData = (channelQuery.data ?? []) as ConversationsByChannelOutput[];
  const statusData = (statusQuery.data ?? []) as ConversationsByStatusOutput[];
  const hourData = hourQuery.data ?? [];
  const agentData = ((agentQuery.data ?? []) as AgentStatsOutput[]).filter(Boolean);

  const isLoading = statsQuery.isLoading || channelQuery.isLoading || statusQuery.isLoading || hourQuery.isLoading || agentQuery.isLoading;
  const isError = statsQuery.isError || channelQuery.isError || statusQuery.isError || hourQuery.isError || agentQuery.isError;

  const calculateAverageTMA = useMemo((): string => {
    if (!agentData || agentData.length === 0) return "00:00:00";
    let totalSeconds = 0;
    let validAgents = 0;
    agentData.forEach((agent) => {
      if (agent.tma && agent.tma !== '00:00:00') {
        const [h, m, s] = agent.tma.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
          totalSeconds += (h * 3600) + (m * 60) + s;
          validAgents++;
        }
      }
    });
    if (validAgents === 0) return "00:00:00";
    const avgSeconds = Math.round(totalSeconds / validAgents);
    const hours = Math.floor(avgSeconds / 3600);
    const minutes = Math.floor((avgSeconds % 3600) / 60);
    const seconds = Math.round(avgSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [agentData]);

  // --- FUNÇÕES RENDERIZADORAS (MEMOIZADAS) ---

  const renderMetricCard = useCallback((label: string, value: number | string | undefined): JSX.Element => (
    <Card className="p-3 md:p-2 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="text-gray-600 text-xs font-semibold uppercase truncate">{label}</div>
      <div className="text-lg md:text-xl font-bold text-gray-900 mt-1">
        {value === undefined || value === null ? "—" : (typeof value === 'string' && value.includes(':') ? value : value.toLocaleString('pt-BR'))}
      </div>
    </Card>
  ), []);

  const renderErrorState = useCallback((message: string, onRetry: () => void): JSX.Element => (
    <div className="flex flex-col items-center justify-center h-48 text-red-600 text-center p-4 bg-red-50 rounded-lg border border-red-200">
      <p className="text-sm font-medium mb-2">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors flex items-center mt-2"
      >
        <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
      </button>
    </div>
  ), []);

  const renderEmptyState = useCallback((message: string): JSX.Element => (
    <div className="flex items-center justify-center h-48 text-gray-500 text-sm bg-white rounded-lg shadow-sm border border-gray-100">
      {message}
    </div>
  ), []);

  // --- HANDLERS ---

  const handlePeriodChange = useCallback((periodValue: string): void => {
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
  }, [customStartDate, customEndDate]);

  const handleApplyCustomDates = useCallback((): void => {
    if (tempStartDate && tempEndDate) {
      setCustomStartDate(tempStartDate);
      setCustomEndDate(tempEndDate);
      setShowCustomDatePicker(false);
    }
  }, [tempStartDate, tempEndDate]);

  // --- RENDER ---

  return (
    <FarmaDashboardLayout>
      <div className="w-full bg-gray-50 min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* CABEÇALHO COM FILTROS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePeriodChange(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedPeriod === option.value
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {showCustomDatePicker && (
              <div className="pt-4 border-t border-gray-200 mt-4">
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
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={!tempStartDate || !tempEndDate}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {statsQuery.isLoading ? (
              <>
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
                <SkeletonLoader height="h-24" />
              </>
            ) : statsQuery.isError ? (
              <div className="lg:col-span-7">
                {renderErrorState(`Falha ao carregar KPIs: ${statsQuery.error?.message || 'Erro desconhecido'}`, statsQuery.refetch)}
              </div>
            ) : stats ? (
              <>
                {renderMetricCard("Atendimentos", stats.totalConversations)}
                {renderMetricCard("Clientes Únicos", stats.uniqueCustomers)}
                {renderMetricCard("Msg Enviadas", stats.messagesSent)}
                {renderMetricCard("Msg Recebidas", stats.messagesReceived)}
                {renderMetricCard(
                  "Méd. Atend./Agente",
                  stats.avgPerAgent?.toFixed(1) ?? "0.0"
                )}
                {renderMetricCard("TMA Médio", calculateAverageTMA)}
                {renderMetricCard("% SLA", "—")}
              </>
            ) : (
              <div className="lg:col-span-7 p-4 text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
                Nenhum dado de KPI disponível.
              </div>
            )}
          </div>

          {/* LAYOUT PRINCIPAL - GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* GRÁFICO DE CONTATOS POR HORA */}
            <div className="lg:col-span-2">
              <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Contatos por Hora</h3>
                {hourQuery.isLoading ? (
                  <SkeletonLoader height="h-80" />
                ) : hourQuery.isError ? (
                  renderErrorState(`Falha ao carregar gráfico por hora: ${hourQuery.error?.message || 'Erro desconhecido'}`, hourQuery.refetch)
                ) : hourData.length > 0 && hourData.some(item => item.chats > 0) ? (
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
                  renderEmptyState("Sem dados de contatos por hora neste período.")
                )}
              </Card>
            </div>

            {/* GRÁFICOS DE CANAL E STATUS — abas */}
            <div className="space-y-6">
            <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Distribuição</h3>
            <Tabs defaultValue="canal">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="canal">Canal</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>
            <TabsContent value="canal">
            {channelQuery.isLoading ? (
            <SkeletonLoader height="h-64" />
            ) : channelQuery.isError ? (
            renderErrorState(`Falha ao carregar gráfico por canal: ${channelQuery.error?.message || 'Erro desconhecido'}`, channelQuery.refetch)
            ) : channelData && channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
            <PieChart>
            <Pie
            data={channelData.map(c => ({ name: c.channel, value: c.count }))}
            cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
            {channelData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            </Pie>
            <Tooltip />
            <Legend />
            </PieChart>
            </ResponsiveContainer>
            ) : (
            renderEmptyState("Sem dados de canais neste período.")
            )}
            </TabsContent>
            <TabsContent value="status">
            {statusQuery.isLoading ? (
            <SkeletonLoader height="h-64" />
            ) : statusQuery.isError ? (
            renderErrorState(`Falha ao carregar gráfico por status: ${statusQuery.error?.message || 'Erro desconhecido'}`, statusQuery.refetch)
            ) : statusData && statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
            <PieChart>
            <Pie
            data={statusData.map(s => ({ name: s.status, value: s.count }))}
            cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
            {statusData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            </Pie>
            <Tooltip />
            <Legend />
            </PieChart>
            </ResponsiveContainer>
            ) : (
            renderEmptyState("Sem dados de status neste período.")
            )}
            </TabsContent>
            </Tabs>
            </Card>
            </div>
                )}
              </Card>
            </div>

          </div>

          {/* TABELA DE PERFORMANCE DOS AGENTES */}
          <div className="mt-6">
            <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance dos Agentes</h2>
              {agentQuery.isLoading ? (
                <SkeletonLoader height="h-64" />
              ) : agentQuery.isError ? (
                renderErrorState(`Nao foi possivel carregar a tabela de agentes neste periodo. Clique para tentar novamente.`, agentQuery.refetch)
              ) : agentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Atendimentos</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dias</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Med. Atend./dia</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Msg. Enviadas</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Msg.Recebidas</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TMA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {agentData.map((agent) => (
                        <tr key={agent.agentId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 flex items-center space-x-3">
     {agent.photo ? (
       <img src={agent.photo} alt={agent.agentName} className="h-8 w-8 rounded-full object-cover" />
     ) : (
       <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
         {(agent.agentName || "?").charAt(0).toUpperCase()}
       </div>
     )}
     <span className="font-medium text-gray-900">{agent.agentName}</span>
   </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{agent.totalConversations}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{agent.daysActive}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{(agent.avgPerDay ?? 0).toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{agent.messagesSent}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{agent.messagesReceived}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{agent.tma}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                renderEmptyState("Sem dados de agentes neste período.")
              )}
            </Card>
          </div>

        </div>
      </div>
    </FarmaDashboardLayout>
  );
}
