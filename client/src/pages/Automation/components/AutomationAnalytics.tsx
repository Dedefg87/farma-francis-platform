import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

// Simple chart component - can be replaced with Recharts or Chart.js
function MiniChart({ data }: { data: { date: string; success: number; failed: number }[] }) {
  const max = Math.max(...data.map(d => d.success + d.failed), 1);
  
  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((day, i) => {
        const total = day.success + day.failed;
        const height = (total / max) * 100;
        const successHeight = day.success > 0 ? (day.success / total) * height : 0;
        
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
            <div 
              className="w-full flex flex-col-reverse rounded-t overflow-hidden"
              style={{ height: `${height}%` }}
            >
              {/* Success portion */}
              <div 
                className="bg-green-500 w-full"
                style={{ height: `${successHeight}%` }}
              />
              {/* Failed portion */}
              <div 
                className="bg-red-500 w-full"
                style={{ height: `${height - successHeight}%` }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground rotate-90">
              {day.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AutomationAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  
  const { data: analytics, isLoading } = trpc.executions.getAnalytics.useQuery({ period });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Sem dados de analytics disponíveis
        </div>
      </Card>
    );
  }

  const { summary, dailyStats } = analytics;

  return (
    <div className="space-y-4">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Executions */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Total Execuções</span>
          </div>
          <div className="text-2xl font-bold">{summary.total.toLocaleString()}</div>
        </Card>

        {/* Success Rate */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {summary.successRate >= 80 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">Taxa de Sucesso</span>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            summary.successRate >= 80 ? "text-green-600" : 
            summary.successRate >= 50 ? "text-yellow-600" : "text-red-600"
          )}>
            {summary.successRate}%
          </div>
        </Card>

        {/* Failed Count */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm">Falhas</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {summary.failed.toLocaleString()}
          </div>
        </Card>

        {/* Avg Time */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Tempo Médio</span>
          </div>
          <div className="text-2xl font-bold">
            {summary.avgTime > 1000 
              ? `${(summary.avgTime / 1000).toFixed(1)}s`
              : `${summary.avgTime}ms`
            }
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-4">Execuções por Dia</h4>
        <MiniChart data={dailyStats} />
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-muted-foreground">Sucesso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-xs text-muted-foreground">Falha</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// cn utility for className
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
