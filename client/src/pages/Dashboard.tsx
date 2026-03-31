import React, { useState, useEffect } from 'react';
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Loader2 } from "lucide-react";
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
  tma?: string;
}

interface AgentStats {
  name: string;
  conversations: number;
  days: number;
  avgPerDay: number;
  messagesSent: number;
  messagesReceived: number;
  tma: string;
}

interface ContactsByHour {
  hour: string;
  chats: number;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [hourData, setHourData] = useState<ContactsByHour[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar dados principais
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.dashboardStats.getStats.useQuery(
    { period: selectedPeriod },
    { onSuccess: (data) => setStats(data as any) }
  );

  // Buscar dados de agentes
  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = trpc.dashboardStats.getAgentStats.useQuery(
    { period: selectedPeriod },
    { onSuccess: (data) => setAgents(data as any) }
  );

  // Buscar dados por hora
  const { data: hourDataResp, isLoading: hourLoading, refetch: refetchHour } = trpc.dashboardStats.getContactsByHour.useQuery(
    { period: selectedPeriod },
    { onSuccess: (data: any) => {
      if (data && Array.isArray(data)) {
        setHourData(data.map((d: any) => ({ hour: d.hour || d.hora, chats: d.chats })));
      }
    } }
  );

  useEffect(() => {
    setLoading(statsLoading || agentsLoading || hourLoading);
  }, [statsLoading, agentsLoading, hourLoading]);

  const handleRefresh = () => {
    refetchStats();
    refetchAgents();
    refetchHour();
  };

  if (loading) {
    return (
      <FarmaDashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      </FarmaDashboardLayout>
    );
  }

  return (
    <FarmaDashboardLayout>
      <div className="p-6 bg-gray-100 min-h-screen">
        {/* TOP BAR */}
        <header className="bg-white p-5 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Atendimentos | Integrações</h1>
              <div className="flex gap-3 mt-3">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  <option value="hoje">Fila: Todas</option>
                  <option value="semana">Fila: Suporte</option>
                </select>
                <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                  <option value="mes">Período: Este Mês</option>
                  <option value="semana">Período: Esta Semana</option>
                  <option value="hoje">Período: Hoje</option>
                </select>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  ↻ Atualizar
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CARDS DE MÉTRICAS */}
        <section className="grid grid-cols-7 gap-4 mb-6">
          {/* Card 1: Atendimentos */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">Atendimentos</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalConversations || 0}</p>
            <span className="text-xs text-green-600 mt-1 inline-block">▲ 33%</span>
          </div>

          {/* Card 2: Clientes Únicos */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">Clientes Únicos</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.uniqueCustomers || 0}</p>
            <span className="text-xs text-green-600 mt-1 inline-block">▲ 9%</span>
          </div>

          {/* Card 3: Progresso Circular */}
          <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center">
              <span className="text-sm font-bold text-green-600">34%</span>
            </div>
          </div>

          {/* Card 4: Mensagens Enviadas */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">Mensagens Enviadas</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.messagesSent || 0}</p>
            <span className="text-xs text-green-600 mt-1 inline-block">▲ 19%</span>
          </div>

          {/* Card 5: Mensagens Recebidas */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">Mensagens Recebidas</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.messagesReceived || 0}</p>
            <span className="text-xs text-green-600 mt-1 inline-block">▲ 44%</span>
          </div>

          {/* Card 6: Méd. Atend/Agente */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">Méd. Atend./Agente</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {stats && stats.totalAgents ? Math.round(stats.totalConversations / stats.totalAgents) : 0}
            </p>
            <span className="text-xs text-green-600 mt-1 inline-block">▲ 33%</span>
          </div>

          {/* Card 7: TMA */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 uppercase">TMA</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.tma || '00:00:00'}</p>
          </div>
        </section>

        {/* GRÁFICOS */}
        <section className="grid grid-cols-5 gap-4 mb-6">
          {/* Gráfico Grande - Contatos por Hora (2/5) */}
          {hourData.length > 0 && (
            <div className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Contatos por hora</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="chats" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico Pequeno - Atendimentos por Canal */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Atendimentos por canal</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
              Gráfico de Pizza
            </div>
          </div>

          {/* Gráfico Pequeno - Atendimentos por Fila */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Atendimentos por fila</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
              Gráfico de Pizza
            </div>
          </div>

          {/* Gráfico Pequeno - Filtro URA */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Atend. por filtro da URA</h3>
            <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
              Gráfico de Pizza
            </div>
          </div>
        </section>

        {/* Gráfico de Fechamento */}
        <section className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Atend. por fechamento</h3>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
            Gráfico de Pizza
          </div>
        </section>

        {/* TABELA DE AGENTES */}
        <section className="bg-white p-6 rounded-lg shadow-sm overflow-x-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Desempenho por Agente</h3>
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
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
              {agents && agents.length > 0 ? (
                agents.map((agent, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{agent.name || '(sem nome)'}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{agent.conversations || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{agent.days || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{(agent.avgPerDay ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{agent.messagesSent || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{agent.messagesReceived || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{agent.tma || '00:00:00'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                    Nenhum agente encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </FarmaDashboardLayout>
  );
}
