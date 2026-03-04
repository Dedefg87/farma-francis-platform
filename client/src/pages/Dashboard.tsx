import { useState, useEffect } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
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

interface DashboardStats {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  byChannel: Array<{ channel: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byHour: Array<{ hour: number; chats: number }>;
  agentStats: Array<{
    id: number;
    name: string;
    avatar_url: string | null;
    total_conversations: number;
    closed_conversations: number;
    total_messages: number;
  }>;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats/dashboard?period=${selectedPeriod}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("[Dashboard] Stats received:", data);
      setStats(data);
    } catch (err) {
      console.error("[Dashboard] Error fetching stats:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  // Preparar dados para gráficos
  const contatosPorHoraData = stats?.byHour?.map((h: any) => ({
    hora: h.hour,
    chats: Number(h.chats) || 0,
  })) || [];

  const atendimentosPorCanalData = stats?.byChannel?.map((c: any) => ({
    name: c.channel?.charAt(0).toUpperCase() + c.channel?.slice(1) || "Desconhecido",
    value: Number(c.count) || 0,
    color: c.channel === "whatsapp" ? "#25D366" : c.channel === "instagram" ? "#E4405F" : "#6B7280",
  })) || [];

  const atendimentosPorStatusData = stats?.byStatus?.map((s: any) => {
    const labels: Record<string, string> = {
      open: "Em aberto",
      closed: "Encerrados",
      pending: "Pendentes",
    };
    const colors: Record<string, string> = {
      open: "#3B82F6",
      closed: "#10B981",
      pending: "#F59E0B",
    };
    return {
      name: labels[s.status] || s.status || "Desconhecido",
      value: Number(s.count) || 0,
      color: colors[s.status] || "#6B7280",
    };
  }) || [];

  const agentesData = stats?.agentStats?.map((agent) => ({
    id: agent.id,
    nome: agent.name,
    atendimentos: Number(agent.total_conversations) || 0,
    encerrados: Number(agent.closed_conversations) || 0,
    mensagens: Number(agent.total_messages) || 0,
    taxaConversao:
      agent.total_conversations > 0
        ? Math.round((Number(agent.closed_conversations) / Number(agent.total_conversations)) * 100)
        : 0,
  })) || [];

  return (
    <FarmaDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Visão geral dos atendimentos</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
            </select>
            <Button onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-red-600">Erro ao carregar dados: {error}</p>
          </Card>
        )}

        {/* Loading */}
        {loading && !stats && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Content */}
        {stats && (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-6">
                <p className="text-sm text-gray-500">Total de Atendimentos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalConversations}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-gray-500">Clientes Únicos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.uniqueCustomers}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-gray-500">Mensagens Enviadas</p>
                <p className="text-3xl font-bold text-gray-900">{stats.messagesSent}</p>
              </Card>
              <Card className="p-6">
                <p className="text-sm text-gray-500">Mensagens Recebidas</p>
                <p className="text-3xl font-bold text-gray-900">{stats.messagesReceived}</p>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Contatos por hora */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contatos por Hora</h3>
                {contatosPorHoraData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={contatosPorHoraData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="chats" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-center py-10">Sem dados para exibir</p>
                )}
              </Card>

              {/* Por canal */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Atendimentos por Canal</h3>
                {atendimentosPorCanalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={atendimentosPorCanalData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
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
                ) : (
                  <p className="text-gray-400 text-center py-10">Sem dados para exibir</p>
                )}
              </Card>
            </div>

            {/* Status e Agentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Por status */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Atendimentos</h3>
                {atendimentosPorStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={atendimentosPorStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
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
                ) : (
                  <p className="text-gray-400 text-center py-10">Sem dados para exibir</p>
                )}
              </Card>

              {/* Tabela de agentes */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho dos Agentes</h3>
                {agentesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-sm text-gray-500">Nome</th>
                          <th className="text-center py-2 text-sm text-gray-500">Atendimentos</th>
                          <th className="text-center py-2 text-sm text-gray-500">Encerrados</th>
                          <th className="text-center py-2 text-sm text-gray-500">Taxa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentesData.map((agent) => (
                          <tr key={agent.id} className="border-b">
                            <td className="py-2">{agent.nome}</td>
                            <td className="text-center py-2">{agent.atendimentos}</td>
                            <td className="text-center py-2">{agent.encerrados}</td>
                            <td className="text-center py-2">{agent.taxaConversao}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-10">Sem dados para exibir</p>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
