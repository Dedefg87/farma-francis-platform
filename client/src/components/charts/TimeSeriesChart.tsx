/**
 * Componente de gráfico de séries temporais reutilizável
 * Usa Recharts para visualização de dados ao longo do tempo
 */

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  type?: 'line' | 'area';
}

interface TimeSeriesChartProps {
  data: DataPoint[];
  series: SeriesConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  isLoading?: boolean;
}

export function TimeSeriesChart({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  isLoading = false,
}: TimeSeriesChartProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full animate-pulse" style={{ height }}>
        <div className="h-full bg-muted rounded-lg flex items-center justify-center">
          <span className="text-muted-foreground">Carregando gráfico...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full border border-dashed rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-muted-foreground">
          <p className="font-medium">Nenhum dado disponível</p>
          <p className="text-sm">Selecione um período diferente ou aguarde a coleta de dados</p>
        </div>
      </div>
    );
  }

  // Detectar se há alguma série do tipo 'area'
  const hasAreaSeries = series.some(s => s.type === 'area');

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizar gráfico apropriado
  const ChartComponent = hasAreaSeries ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-muted"
          />
        )}
        <XAxis 
          dataKey="date" 
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />
        )}
        {series.map((s) => {
          if (s.type === 'area') {
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            );
          }
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

/**
 * Componente de gráfico de área empilhada
 */
interface StackedAreaChartProps {
  data: DataPoint[];
  series: SeriesConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  isLoading?: boolean;
}

export function StackedAreaChart({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = true,
  isLoading = false,
}: StackedAreaChartProps) {
  if (isLoading) {
    return (
      <div className="w-full animate-pulse" style={{ height }}>
        <div className="h-full bg-muted rounded-lg flex items-center justify-center">
          <span className="text-muted-foreground">Carregando gráfico...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full border border-dashed rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-muted-foreground">
          <p className="font-medium">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip />
        {showLegend && <Legend />}
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stackId="1"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
