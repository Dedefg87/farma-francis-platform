import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, MessageSquare, Clock, TrendingUp, Smartphone, Globe, 
  Instagram, MessageCircle, Zap
} from "lucide-react";
import { trpc } from "../../lib/trpc";
import { DashboardSkeleton } from "./DashboardSkeleton";

interface DashboardCardsProps {
  darkMode: boolean;
}

export function DashboardCards({ darkMode }: DashboardCardsProps) {
  const { data: stats, isLoading: statsLoading } = trpc.automation.stats.useQuery(
    { period: "today" },
    { refetchInterval: 30000 }
  );
  const { data: flowsData } = trpc.automation.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchInterval: 30000 }
  );

  if (statsLoading) {
    return <DashboardSkeleton darkMode={darkMode} />;
  }

  const flows = flowsData?.items || [];
  const activeFlows = flows.filter(f => f.isActive);
  const totalFlows = flows.length;

  // Dados reais do backend com fallback
  const automationActive = activeFlows.length > 0;
  const todayCount = stats?.totalExecutions ?? 0;
  const avgResponseTime = stats?.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : "—";
  const conversionCount = stats?.conversions ?? 0;
  const conversionRate = stats?.totalExecutions && stats.totalExecutions > 0
    ? `${((stats.conversions / stats.totalExecutions) * 100).toFixed(1)}%`
    : "—";

  const cards = [
    {
      title: "Status da Automação",
      value: automationActive ? "Ativa" : "Inativa",
      icon: <Activity className={`w-5 h-5 ${automationActive ? "text-green-600" : "text-gray-400"}`} />,
      badge: automationActive ? "Online" : "Offline",
      badgeColor: automationActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600",
      subtext: totalFlows > 0
        ? `${activeFlows.length} de ${totalFlows} fluxos ativos`
        : "Nenhum fluxo criado ainda"
    },
    {
      title: "Execuções Hoje",
      value: statsLoading ? "…" : String(todayCount),
      icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
      badge: stats?.executionsChange ? `${stats.executionsChange > 0 ? "+" : ""}${stats.executionsChange}%` : "—",
      badgeColor: "bg-blue-100 text-blue-800",
      subtext: stats?.avgPerMinute ? `Média: ${stats.avgPerMinute}/min` : "Dados em tempo real"
    },
    {
      title: "Tempo Médio de Resposta",
      value: statsLoading ? "…" : avgResponseTime,
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      badge: "Meta: <2s",
      badgeColor: "bg-purple-100 text-purple-800",
      subtext: stats?.avgResponseTime && stats.avgResponseTime < 2000 ? "Dentro da meta ✓" : "Monitorando"
    },
    {
      title: "Conversões",
      value: statsLoading ? "…" : String(conversionCount),
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      badge: conversionRate,
      badgeColor: "bg-emerald-100 text-emerald-800",
      subtext: "Pedidos convertidos via automação"
    }
  ];

  const channels = [
    { name: "WhatsApp", icon: <MessageSquare className="w-4 h-4" />, status: "Conectado", color: "text-green-600" },
    { name: "Instagram", icon: <Instagram className="w-4 h-4" />, status: "Conectado", color: "text-pink-600" },
    { name: "Site", icon: <Globe className="w-4 h-4" />, status: "Conectado", color: "text-blue-600" },
    { name: "App", icon: <Smartphone className="w-4 h-4" />, status: "Conectado", color: "text-gray-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{card.value}</span>
                <Badge className={card.badgeColor}>{card.badge}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">{card.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channels */}
      <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
        <CardHeader>
          <CardTitle className="text-base">Canais Conectados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {channels.map((ch, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <div className={ch.color}>{ch.icon}</div>
                <div>
                  <p className="font-medium text-sm">{ch.name}</p>
                  <p className="text-xs text-green-600">{ch.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
