import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import {
  exportToCSV,
  exportToPDF,
  formatNumber,
  formatPercent,
} from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Download,
} from "lucide-react";

interface AgentMetrics {
  id: number;
  name: string;
  avatar: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: number; // em minutos
  avgResolutionTime: number; // em horas
  satisfactionRate: number; // 0-100
  activeTickets: number;
  badges: string[];
  trend: "up" | "down" | "stable";
  trendValue: number;
}

export default function AgentPerformance() {
  return (
    <>
      <TopBar />
      <AgentPerformanceContent />
    </>
  );
}

function AgentPerformanceContent() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );
  const [sortBy, setSortBy] = useState<
    "satisfaction" | "resolved" | "response_time" | "active"
  >("satisfaction");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Buscar dados reais via tRPC
  const { data, isLoading, error } = trpc.agents.list.useQuery(
    {
      page: currentPage,
      pageSize,
      timeRange,
      sortBy,
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Buscar dados do gráfico
  const { data: chartData, isLoading: isChartLoading } =
    trpc.agents.getChartData.useQuery(
      { timeRange },
      { retry: 1, refetchOnWindowFocus: false }
    );

  // Buscar insights reais
  const { data: insights, isLoading: isInsightsLoading } =
    trpc.agents.getInsights.useQuery(
      { timeRange },
      { retry: 1, refetchOnWindowFocus: false }
    );

  // Handle both array and object data formats
  let agentsList: any[] = [];
  if (Array.isArray(data)) {
    agentsList = data;
  } else if (data && Array.isArray(data?.agents)) {
    agentsList = data.agents;
  }

  const agents = agentsList;
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  };
  const { toast } = useToast();

  // Calcular métricas gerais com proteção contra divisão por zero
  const totalTickets = agents.reduce(
    (sum, a) => sum + (a.totalTickets || 0),
    0
  );
  const totalResolved = agents.reduce(
    (sum, a) => sum + (a.resolvedTickets || 0),
    0
  );
  const avgResponseTime =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) /
        agents.length
      : 0;
  const avgSatisfaction =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.satisfactionRate || 0), 0) /
        agents.length
      : 0;

  // Função de exportação
  const handleExport = async (format: "csv" | "pdf") => {
    try {
      // Use real data if available, otherwise empty
      const dataToExport = agents.length > 0 ? agents : [];

      if (dataToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description:
            "Não há dados de agentes disponíveis. Verifique se há agentes com tickets atribuídos.",
          variant: "destructive",
        });
        return;
      }

      const columns = [
        { key: "name", label: "Nome" },
        { key: "totalTickets", label: "Total de Tickets" },
        { key: "resolvedTickets", label: "Tickets Resolvidos" },
        {
          key: "avgResponseTime",
          label: "Tempo Médio de Resposta (min)",
          format: formatNumber,
        },
        {
          key: "avgResolutionTime",
          label: "Tempo Médio de Resolução (h)",
          format: formatNumber,
        },
        {
          key: "satisfactionRate",
          label: "Taxa de Satisfação (%)",
          format: formatPercent,
        },
        { key: "activeTickets", label: "Tickets Ativos" },
      ];

      const filename = `performance-agentes-${new Date().toISOString().split("T")[0]}`;
      const title = "Relatório de Performance de Agentes";
      const subtitle = `Período: ${timeRange === "7d" ? "Últimos 7 dias" : timeRange === "30d" ? "Últimos 30 dias" : timeRange === "90d" ? "Últimos 90 dias" : "Todo período"}`;

      if (format === "csv") {
        exportToCSV({ filename, columns, data: dataToExport, title, subtitle });
        toast({
          title: "Exportação concluída",
          description: "Arquivo CSV baixado com sucesso.",
        });
      } else if (format === "pdf") {
        await exportToPDF({
          filename,
          columns,
          data: dataToExport,
          title,
          subtitle,
        });
        toast({
          title: "Exportação concluída",
          description: "Abrindo visualização para impressão/salvar como PDF.",
        });
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up")
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 bg-green-50";
    if (rate >= 85) return "text-blue-600 bg-blue-50";
    if (rate >= 75) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // Dados para o gráfico - usa dados reais ou array vazio
  const chartSeries =
    chartData && chartData.length > 0
      ? [
          {
            dataKey: "satisfacao",
            name: "Satisfação (%)",
            color: "#10b981",
            type: "line" as const,
          },
          {
            dataKey: "tickets",
            name: "Tickets",
            color: "#3b82f6",
            type: "line" as const,
          },
        ]
      : [];

  return (
    <div className="container py-8 space-y-6 mt-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Performance de Agentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe métricas e rankings da equipe em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={val => setTimeRange(val as typeof timeRange)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Gráfico de Tendência */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Evolução de Performance
        </h2>
        <TimeSeriesChart
          data={chartData || []}
          series={chartSeries}
          height={300}
          isLoading={isChartLoading}
        />
        {(!chartData || chartData.length === 0) && !isChartLoading && (
          <div className="text-center text-muted-foreground py-8">
            Sem dados suficientes para exibir o gráfico no período selecionado.
          </div>
        )}
      </Card>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Tickets</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalTickets}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalTickets > 0
                  ? ((totalResolved / totalTickets) * 100).toFixed(1)
                  : "0.0"}
                %
              </p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Tempo Médio de Resposta
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {avgResponseTime.toFixed(1)}
                min
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Satisfação Média</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {avgSatisfaction.toFixed(1)}%
              </p>
            </div>
            <ThumbsUp className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-foreground">
            Ordenar por:
          </span>
          <div className="flex gap-2">
            {[
              { value: "satisfaction", label: "Satisfação" },
              { value: "resolved", label: "Tickets Resolvidos" },
              { value: "response_time", label: "Tempo de Resposta" },
              { value: "active", label: "Tickets Ativos" },
            ].map(option => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(option.value as typeof sortBy)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Carregando métricas de agentes...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && agents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum agente encontrado
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Não há agentes cadastrados ou nenhum ticket foi atribuído ainda.
            Verifique se os usuários têm a role 'user' e se os tickets estão
            sendo atribuídos corretamente.
          </p>
        </div>
      )}

      {/* Ranking de Agentes */}
      {!isLoading && agents.length > 0 && (
        <div className="space-y-3">
          {agents.map((agent: any, index: number) => (
            <Card
              key={agent.id}
              className="p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-6">
                {/* Posição */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {index === 0
                      ? "🥇"
                      : index === 1
                        ? "🥈"
                        : index === 2
                          ? "🥉"
                          : `#${index + 1}`}
                  </div>
                </div>

                {/* Avatar e Nome */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {agent.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getTrendIcon(agent.trend)}
                        {agent.trend !== "stable" && (
                          <span
                            className={`text-sm ${
                              agent.trend === "up"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {agent.trend === "up" ? "+" : ""}
                            {agent.trendValue}% este mês
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.badges?.map((badge: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tickets Resolvidos
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {agent.resolvedTickets || 0}/{agent.totalTickets || 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tempo de Resposta
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {(agent.avgResponseTime || 0).toFixed(1)}min
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tempo de Resolução
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {(agent.avgResolutionTime || 0).toFixed(1)}h
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Satisfação
                      </p>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-lg font-semibold ${getPerformanceColor(agent.satisfactionRate || 0)}`}
                        >
                          {agent.satisfactionRate || 0}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tickets Ativos
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {agent.activeTickets || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button variant="ghost" size="sm">
                    Feedback
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} (
            {pagination.total} agentes)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Insights e Recomendações - DADOS REAIS */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Insights e Recomendações
            </h4>
            {isInsightsLoading ? (
              <p className="text-sm text-blue-800">Carregando insights...</p>
            ) : insights && insights.length > 0 ? (
              <ul className="space-y-2 text-sm text-blue-800">
                {insights.map((insight: string, index: number) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-800">
                Dados insuficientes para gerar insights no período selecionado.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
