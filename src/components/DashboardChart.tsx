import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalConversations: number;
  uniqueCustomers: number;
  messagesSent: number;
  messagesReceived: number;
  avgPerAgent: number;
  avgHandlingTime: string;
}

interface HourlyData {
  hour: number;
  chats: number;
}

interface AgentStats {
  agentId: string;
  agentName: string;
  totalConversations: number;
  avgHandlingTime: string;
}

export const DashboardChart: React.FC = () => {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [agentData, setAgentData] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('mes');

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  const fetchDashboardData = async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const input = encodeURIComponent(JSON.stringify({ period: selectedPeriod }));
      
      const [statsRes, hourlyRes, agentRes] = await Promise.all([
        fetch(`/api/trpc/dashboardStats.getStats?input=${input}`),
        fetch(`/api/trpc/dashboardStats.getContactsByHour?input=${input}`),
        fetch(`/api/trpc/dashboardStats.getAgentStats?input=${input}`)
      ]);

      const statsData = await statsRes.json();
      const hourlyDataResult = await hourlyRes.json();
      const agentDataResult = await agentRes.json();

      if (statsData.result?.data?.json) {
        setStats(statsData.result.data.json);
      }
      if (hourlyDataResult.result?.data?.json) {
        setHourlyData(hourlyDataResult.result.data.json);
      }
      if (agentDataResult.result?.data?.json) {
        setAgentData(agentDataResult.result.data.json);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando dados...</div>;
  }

  if (!stats) {
    return <div className="p-4 text-center">Nenhum dado disponível</div>;
  }

  const metricsData = [
    { name: 'Conversas', value: stats.totalConversations },
    { name: 'Clientes', value: stats.uniqueCustomers },
    { name: 'Enviadas', value: stats.messagesSent },
    { name: 'Recebidas', value: stats.messagesReceived },
  ];

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Dashboard de Estatísticas</h2>
        
        <div className="flex gap-2 flex-wrap">
          {['hoje', '7d', 'mes', '90d', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded font-semibold transition ${
                period === p
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {p === 'hoje' && 'Hoje'}
              {p === '7d' && '7 dias'}
              {p === 'mes' && 'Mês'}
              {p === '90d' && '90 dias'}
              {p === 'all' && 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm font-semibold">Total de Conversas</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalConversations}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
          <p className="text-gray-600 text-sm font-semibold">Clientes Únicos</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.uniqueCustomers}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
          <p className="text-gray-600 text-sm font-semibold">Mensagens Enviadas</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.messagesSent}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm font-semibold">Mensagens Recebidas</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats.messagesReceived}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumo de Métricas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Contatos por Hora</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="chats" stroke="#10b981" strokeWidth={2} name="Chats" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Desempenho por Agente</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Agente</th>
                <th className="px-4 py-2 text-center">Conversas</th>
                <th className="px-4 py-2 text-center">Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              {agentData.map((agent) => (
                <tr key={agent.agentId} className="border-t hover:bg-gray-100">
                  <td className="px-4 py-2 font-semibold">{agent.agentName}</td>
                  <td className="px-4 py-2 text-center">{agent.totalConversations}</td>
                  <td className="px-4 py-2 text-center">{agent.avgHandlingTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-gray-600 text-sm font-semibold">Média por Agente</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.avgPerAgent}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-gray-600 text-sm font-semibold">Tempo Médio de Atendimento</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.avgHandlingTime}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;
