import React, { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Eye,
  Calendar,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Executions() {
  return (
    <>
      <TopBar />
      <ExecutionsContent />
    </>
  );
}

function ExecutionsContent() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'success' | 'error' | 'canceled'>('all');
  const [flowFilter, setFlowFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const pageSize = 10;

  // Buscar execuções reais via tRPC
  const { data, isLoading, refetch } = trpc.executions.list.useQuery({
    page: currentPage,
    pageSize,
    status: statusFilter,
    workflowId: flowFilter,
  });

  const executions = data?.executions || [];
  const pagination = data?.pagination;
  const { toast } = useToast();

  // Mutation para exportação
  const exportMutation = trpc.executions.export.useMutation({
    onSuccess: (result) => {
      // Download do arquivo
      const blob = new Blob([result.data], { 
        type: result.format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/pdf' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `Relatório exportado como ${result.format.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      format: exportFormat,
      status: statusFilter,
      workflowId: flowFilter,
    });
  };

  // Mutation para retry
  const retryMutation = trpc.executions.retry.useMutation({
    onSuccess: () => {
      toast({
        title: 'Execução reiniciada',
        description: 'O fluxo está sendo executado novamente.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao reiniciar',
        description: error.message || 'Não foi possível reiniciar a execução.',
        variant: 'destructive',
      });
    },
  });

  const handleRetry = (executionId: number) => {
    retryMutation.mutate({ id: executionId });
  };

  // Mock data para fallback
  const mockExecutions = [
    {
      id: 1,
      flowId: 1,
      flowName: 'Boas-vindas WhatsApp',
      status: 'completed',
      startedAt: new Date(Date.now() - 1000 * 60 * 5),
      completedAt: new Date(Date.now() - 1000 * 60 * 3),
      duration: 120000,
      totalNodes: 5,
      executedNodes: 5,
      triggeredBy: 'webhook',
    },
    {
      id: 2,
      flowId: 2,
      flowName: 'Qualificação de Leads',
      status: 'failed',
      startedAt: new Date(Date.now() - 1000 * 60 * 15),
      completedAt: new Date(Date.now() - 1000 * 60 * 14),
      duration: 60000,
      totalNodes: 8,
      executedNodes: 3,
      triggeredBy: 'manual',
      error: 'Timeout na requisição HTTP',
    },
    {
      id: 3,
      flowId: 1,
      flowName: 'Boas-vindas WhatsApp',
      status: 'running',
      startedAt: new Date(Date.now() - 1000 * 30),
      totalNodes: 5,
      executedNodes: 2,
      triggeredBy: 'webhook',
    },
  ];

  // Usar dados reais ou mock como fallback
  const displayExecutions = executions.length > 0 ? executions.map(e => ({
    id: e.id,
    flowId: e.workflowId,
    flowName: e.workflowName || 'Fluxo sem nome',
    status: e.status === 'success' ? 'completed' : e.status === 'error' ? 'failed' : e.status,
    startedAt: new Date(e.startedAt),
    completedAt: e.finishedAt ? new Date(e.finishedAt) : undefined,
    duration: e.executionTime || 0,
    totalNodes: 0,
    executedNodes: 0,
    triggeredBy: e.mode,
    error: e.error || undefined,
  })) : mockExecutions;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
    };
    
    const labels: Record<string, string> = {
      completed: 'Concluído',
      failed: 'Falhou',
      running: 'Em andamento',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <div className="container py-8 space-y-6 mt-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Execuções</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as execuções de fluxos em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={exportFormat} onValueChange={(v: 'csv' | 'pdf') => setExportFormat(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou fluxo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="running">Em andamento</SelectItem>
            </SelectContent>
          </Select>

          <Select value={flowFilter?.toString() || 'all'} onValueChange={(val) => setFlowFilter(val === 'all' ? undefined : parseInt(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Fluxo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fluxos</SelectItem>
              <SelectItem value="1">Boas-vindas WhatsApp</SelectItem>
              <SelectItem value="2">Qualificação de Leads</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Mais Filtros
          </Button>
        </div>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Carregando execuções...
        </div>
      )}

      {/* Lista de Execuções */}
      {!isLoading && (
        <div className="space-y-3">
          {displayExecutions.map((execution) => (
          <Card key={execution.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {getStatusIcon(execution.status)}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{execution.flowName}</h3>
                    {getStatusBadge(execution.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(execution.startedAt, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                    
                    {execution.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(execution.duration)}
                      </span>
                    )}
                    
                    <span>
                      Nós: {execution.executedNodes}/{execution.totalNodes}
                    </span>
                    
                    <Badge variant="outline" className="text-xs">
                      {execution.triggeredBy === 'webhook' ? 'Webhook' : 
                       execution.triggeredBy === 'manual' ? 'Manual' : 
                       execution.triggeredBy}
                    </Badge>
                  </div>

                  {execution.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <span className="font-semibold">Erro:</span> {execution.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {execution.status === 'failed' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRetry(execution.id)}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                    {retryMutation.isPending ? 'Reiniciando...' : 'Tentar Novamente'}
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedExecution(execution.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detalhes
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
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} execuções)
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

      {/* Timeline Detalhada (quando uma execução é selecionada) */}
      {selectedExecution && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Timeline de Execução #{selectedExecution}</h2>
            <Button variant="ghost" onClick={() => setSelectedExecution(null)}>
              Fechar
            </Button>
          </div>

          <div className="space-y-4">
            {/* Mock timeline - substituir por dados reais */}
            {[
              { node: 'Webhook Trigger', status: 'completed', duration: 50, order: 1 },
              { node: 'Validar Cliente', status: 'completed', duration: 120, order: 2 },
              { node: 'Enviar Mensagem', status: 'completed', duration: 80, order: 3 },
              { node: 'Aguardar Resposta', status: 'running', duration: null, order: 4 },
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'running' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {step.order}
                  </div>
                  {index < 3 && (
                    <div className="w-0.5 h-12 bg-border" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{step.node}</h4>
                      <p className="text-sm text-muted-foreground">
                        {step.duration ? `Concluído em ${step.duration}ms` : 'Em andamento...'}
                      </p>
                    </div>
                    {getStatusIcon(step.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
