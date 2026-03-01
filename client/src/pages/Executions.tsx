import { useState } from "react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Calendar, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Executions() {
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "success" | "error" | "canceled">("all");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const { data: executionsData, isLoading } = trpc.executions.list.useQuery({
    page: 1,
    pageSize: 50,
    status: statusFilter,
  });

  const exportMutation = trpc.executions.export.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success(`Exportação em ${exportFormat.toUpperCase()} realizada com sucesso!`);
      }
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
      setIsExporting(false);
    },
  });

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate({
      format: exportFormat,
      filters: {
        status: statusFilter === "all" ? undefined : statusFilter,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      running: "bg-yellow-100 text-yellow-800 border-yellow-200",
      success: "bg-green-100 text-green-800 border-green-200",
      error: "bg-red-100 text-red-800 border-red-200",
      canceled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      running: "Executando",
      success: "Sucesso",
      error: "Erro",
      canceled: "Cancelado",
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || styles.canceled}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <FarmaDashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Histórico de Execuções
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleExport} 
                disabled={isExporting || isLoading}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Status:</span>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="running">Executando</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fluxo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executionsData?.executions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhuma execução encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    executionsData?.executions?.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="font-mono text-sm">#{execution.id}</TableCell>
                        <TableCell>{execution.workflowName || `Fluxo #${execution.workflowId}`}</TableCell>
                        <TableCell>{getStatusBadge(execution.status)}</TableCell>
                        <TableCell className="capitalize">{execution.mode}</TableCell>
                        <TableCell>
                          {execution.startedAt
                            ? format(new Date(execution.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{formatDuration(execution.executionTime)}</TableCell>
                        <TableCell className="text-red-600 max-w-xs truncate">{execution.error || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
