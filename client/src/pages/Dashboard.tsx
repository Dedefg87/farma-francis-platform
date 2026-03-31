import React, { useState, useEffect } from 'react';
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  totalAgents?: number;
  byChannel?: Array<{ channel: string; count: number }>;
  byStatus?: Array<{ status: string; count: number }>;
  byHour?: Array<{ hour: number; chats: number }>;
  byAgent?: Array<{
    name: string;
    conversations: number;
    days: number;
    avgPerDay: number;
    messagesSent: number;
    messagesReceived: number;
    tma: string;
  }>;
  tma?: string; // TMA geral
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Usar tRPC para puxar dados REAIS
  const { data, isLoading, refetch } = trpc.dashboardStats.getStats.useQuery(
    { period: selectedPeriod },
    {
      onSuccess: (data) => {
        console.log("[Dashboard] Dados REAIS recebidos:", data);
        setStats(data as any);
        setLoading(false);
      },
      onError: (error) => {
        console.error("[Dashboard] Erro ao buscar dados:", error);
        setLoading(false);
      },
    }
  );

  // Preparar dados para gráficos
  const channelData = stats?.byChannel?.map((c: any) => ({
    name: c.channel?.charAt(0).toUpperCase() + c.channel?.slice(1) || "Desconhecido",
    value: Number(c.count) || 0,
    color:
      c.channel === "whatsapp" ? "#25D366" :
      c.channel === "instagram" ? "#E4405F" :
      c.channel === "facebook" ? "#1877F2" : "#6B7280",
  })) || [];

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

  const hourData = stats?.byHour?.map((h: any) => ({
    hora: `${String(h.hour).padStart(2, '0')}h`,
    chats: Number(h.chats) || 0,
  })) || [];

  const agentData = stats?.byAgent || [];

  // Calcular TMA total (média dos TMAs dos agentes)
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
    const seconds = avgSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const renderMetricCard = (label: string, value: number | string, change?: number) => (
    <Card className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="text-gray-600 text-xs font-semibold uppercase">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-2xl font-bold text-gray-900">{value.toString().includes(':') ? value : value.toLocaleString('pt-BR')}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            {change}%
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-3">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
            </select>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              ↻ Atualizar
            </button>
          </div>
        </div>

        {/* Loading State */}
        {(isLoading || loading) && (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        )}

        {!isLoading && !loading && stats && (
          <>
            {/* 6 Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {renderMetricCard("Atendimentos", stats.totalConversations)}
              {renderMetricCard("Clientes Únicos", stats.uniqueCustomers)}
              {renderMetricCard("Mensagens Enviadas", stats.messagesSent)}
              {renderMetricCard("Mensagens Recebidas", stats.messagesReceived)}
              {renderMetricCard("Méd. Atend/Agente", Math.round(stats.totalConversations / (stats.totalAgents || 1)))}
              {renderMetricCard("TMA", calculateTMA())}
            </div>

            {/* Gráficos - Layout conforme imagem */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico de Barras - 2/3 da largura */}
              {hourData.length > 0 && (
                <Card className="lg:col-span-2 p-6 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Contatos por hora</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hora" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="chats" fill="#1e3a8a" name="Chats" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Gráfico de Pizza - 1/3 da largura */}
              {channelData.length > 0 && (
                <Card className="p-6 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Atendimentos por fila</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#1e3a8a"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>

            {/* Segundo Gráfico de Pizza */}
            {statusData.length > 0 && (
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Atend. por fechamento</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#1e3a8a"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Tabela de Desempenho por Agente */}
            {agentData.length > 0 && (
              <Card className="p-6 bg-white overflow-x-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Desempenho por Agente</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Agente</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Atendimentos</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Dias</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Méd. Atend./Dia</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Msg. Enviadas</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Msg. Recebidas</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">TMA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentData.map((agent, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{agent.name}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.conversations}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.days}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.avgPerDay.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.messagesSent}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.messagesReceived}</td>
                        <td className="px-4 py-3 text-center text-gray-900">{agent.tma}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
