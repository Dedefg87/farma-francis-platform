import { Card } from "@/components/ui/card";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  MessageSquare,
  Instagram,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationStatsProps {
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgResponseTime: number;
    totalConversations: number;
    whatsappExecutions: number;
    instagramExecutions: number;
    conversions: number;
    conversionRate: number;
  };
  period?: "today" | "week" | "month";
}

export function AutomationStats({ stats, period = "today" }: AutomationStatsProps) {
  const successRate = stats.totalExecutions > 0
    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
    : 0;

  const periodLabel = {
    today: "Hoje",
    week: "Esta Semana",
    month: "Este Mês",
  }[period];

  return (
    <div className="space-y-4">
      {/* Period Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Métricas de Automação</h2>
        <span className="text-sm text-gray-500">{periodLabel}</span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Executions */}
        <Card className="p-4 border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalExecutions.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Execuções</div>
            </div>
          </div>
        </Card>

        {/* Success Rate */}
        <Card className="p-4 border-0 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
              <div className="text-xs text-gray-500">Taxa de Sucesso</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                successRate >= 90 ? "bg-green-500" : successRate >= 70 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </Card>

        {/* Avg Response Time */}
        <Card className="p-4 border-0 bg-gradient-to-br from-purple-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.avgResponseTime}s
              </div>
              <div className="text-xs text-gray-500">Tempo Médio</div>
            </div>
          </div>
        </Card>

        {/* Conversions */}
        <Card className="p-4 border-0 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.conversions}
              </div>
              <div className="text-xs text-gray-500">Conversões</div>
            </div>
          </div>
          {stats.conversionRate > 0 && (
            <div className="mt-1 text-xs text-green-600 font-medium">
              +{stats.conversionRate}% taxa
            </div>
          )}
        </Card>
      </div>

      {/* Channel Stats */}
      <Card className="p-4 border-0 bg-gradient-to-br from-slate-50 to-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Canal</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* WhatsApp */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">WhatsApp</div>
              <div className="text-xs text-gray-500">
                {stats.whatsappExecutions.toLocaleString()} execuções
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {stats.totalExecutions > 0
                ? Math.round((stats.whatsappExecutions / stats.totalExecutions) * 100)
                : 0}%
            </div>
          </div>

          {/* Instagram */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Instagram</div>
              <div className="text-xs text-gray-500">
                {stats.instagramExecutions.toLocaleString()} execuções
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {stats.totalExecutions > 0
                ? Math.round((stats.instagramExecutions / stats.totalExecutions) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </Card>

      {/* Success vs Failed */}
      <Card className="p-4 border-0 bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Sucesso vs Falhas</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600 flex-1">Sucesso</span>
            <span className="text-sm font-bold text-gray-900">{stats.successfulExecutions}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              style={{
                width: `${stats.totalExecutions > 0 ? (stats.successfulExecutions / stats.totalExecutions) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600 flex-1">Falhas</span>
            <span className="text-sm font-bold text-gray-900">{stats.failedExecutions}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
              style={{
                width: `${stats.totalExecutions > 0 ? (stats.failedExecutions / stats.totalExecutions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Conversations */}
      <Card className="p-4 border-0 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Clientes Atendidos</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalConversations}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Pela automação</div>
            <div className="text-sm font-medium text-cyan-600">sem intervenção humana</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
