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

  // Usar tRPC em vez de fetch REST
  const { data: statsData, isLoading } = trpc.dashboardStats.getStats.useQuery(
    { period: selectedPeriod },
    {
      onSuccess: (data) => {
        console.log("[Dashboard] Stats received via tRPC:", data);
        setStats(data as DashboardStats);
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

  return (
    <FarmaDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header com título e controles */}
        <div className="flex justify-between items-center">
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        )}

        {/* Rest of dashboard content */}
        {!isLoading && stats && (
          <>
            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metricsData).map(([key, value]) => (
                <Card key={key} className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {key === "atendimentos" && "Total de Atendimentos"}
                    {key === "clientesUnicos" && "Clientes Únicos"}
                    {key === "mensagensEnviadas" && "Mensagens Enviadas"}
                    {key === "mensagensRecebidas" && "Mensagens Recebidas"}
                    {key === "mediaAtendPorAgente" && "Média por Agente"}
                    {key === "tma" && "TMA"}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {typeof value === "object" ? value.value : value}
                  </div>
                </Card>
              ))}
            </div>

            {/* Gráficos */}
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
          </>
        )}
      </div>
    </FarmaDashboardLayout>
  );
}
