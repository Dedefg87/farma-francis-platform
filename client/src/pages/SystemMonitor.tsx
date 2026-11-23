import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  HardDrive,
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock,
  FileText,
  Settings,
} from "lucide-react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";

interface StorageData {
  disk: {
    filesystem: string;
    size: string;
    used: string;
    available: string;
    usePct: string;
    mounted: string;
  };
  appSize: string;
  timestamp: string;
}

interface TableSize {
  table_name: string;
  size_mb: number;
  table_rows: number;
}

interface CleanResult {
  type: string;
  deleted: number;
  message: string;
}

export default function SystemMonitor() {
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [dbSize, setDbSize] = useState(0);
  const [tables, setTables] = useState<TableSize[]>([]);
  const [cleanResults, setCleanResults] = useState<CleanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningDb, setCleaningDb] = useState(false);
  const [dbConfirmOpen, setDbConfirmOpen] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("jti") || sessionStorage.getItem("auth-token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // Buscar informações de armazenamento (público)
      const storageRes = await fetch("/api/system/storage");
      if (storageRes.ok) {
        const storageData = await storageRes.json();
        setStorage(storageData);
      }

      // Buscar tamanho do banco (requer admin)
      const dbSizeRes = await fetch("/api/system/database/size", { headers });
      if (dbSizeRes.ok) {
        const dbSizeData = await dbSizeRes.json();
        const size = Number(dbSizeData.size_mb) || 0;
        setDbSize(size);
      } else if (dbSizeRes.status === 401) {
        console.warn("[System] Não autenticado para buscar size do DB");
      }

      // Buscar estatísticas das tabelas (requer admin)
      const tablesRes = await fetch("/api/system/database/tables", { headers });
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        const normalized = (tablesData.tables || []).map((t: any) => ({
          table_name: t.table_name || "unknown",
          size_mb: Number(t.size_mb) || 0,
          table_rows: Number(t.table_rows) || 0,
        }));
        setTables(normalized);
      } else if (tablesRes.status === 401) {
        console.warn("[System] Não autenticado para buscar tabelas");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados do sistema");
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async (types?: string[]) => {
    setCleaning(true);
    try {
      const token = localStorage.getItem("jti") || sessionStorage.getItem("auth-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/system/clean", {
        method: "POST",
        headers,
        body: JSON.stringify({ types }),
      });

      const data = await response.json();
      if (data.success) {
        setCleanResults(data.results);
        toast.success("Limpeza concluída com sucesso!");
        fetchData();
      } else {
        toast.error("Erro na limpeza");
      }
    } catch (error) {
      console.error("Erro na limpeza:", error);
      toast.error("Erro ao executar limpeza");
    } finally {
      setCleaning(false);
    }
  };

  const handleCleanDatabase = async () => {
    setCleaningDb(true);
    try {
      const token = localStorage.getItem("jti") || sessionStorage.getItem("auth-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/system/clean-database", {
        method: "POST",
        headers,
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Banco de dados limpo com sucesso!");
        setCleanResults(prev => [...prev, ...data.results.map((r: any) => ({
          type: "database." + r.table,
          deleted: r.rows,
          message: `Tabela ${r.table}: ${r.success ? 'limpa' : r.error}`
        }))]);
        fetchData();
      } else {
        toast.error(data.error || "Erro ao limpar banco de dados");
      }
    } catch (error) {
      console.error("Erro ao limpar banco:", error);
      toast.error("Erro ao executar limpeza do banco");
    } finally {
      setCleaningDb(false);
      setDbConfirmOpen(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBytes = (mb: number): string => {
    if (mb < 1) return `${(mb * 1024).toFixed(2)} KB`;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getUsePercentage = (used: string, total: string): number => {
    const usedNum = parseFloat(used) || 0;
    const totalNum = parseFloat(total) || 0;
    if (totalNum === 0) return 0;
    return (usedNum / totalNum) * 100;
  };

  const totalTablesSize = tables.reduce((acc, t) => acc + (t.size_mb || 0), 0);
  const topTables = [...tables].sort((a, b) => (b.size_mb || 0) - (a.size_mb || 0)).slice(0, 10);

  const safeTimestamp = storage?.timestamp ? new Date(storage.timestamp) : new Date();
  const safeDisk = storage?.disk || {};
  const safeAppSize = storage?.appSize || "N/A";

  if (loading) {
    return (
      <FarmaDashboardLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando...</span>
          </div>
        </div>
      </FarmaDashboardLayout>
    );
  }

  return (
    <FarmaDashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Monitor do Sistema
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o uso de recursos e faça limpeza quando necessário
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards de Visão Geral */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disco Total</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeDisk.size || "N/A"}</div>
              <p className="text-xs text-muted-foreground">
                {safeDisk.mounted || "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disco Utilizado</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeDisk.used || "N/A"}</div>
              <Progress 
                value={getUsePercentage(safeDisk.used || "0", safeDisk.size || "0")} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banco de Dados</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(dbSize)}</div>
              <p className="text-xs text-muted-foreground">
                {tables.length} tabelas{tables.length === 0 ? " - faça login como admin para ver dados" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">App Size</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safeAppSize}</div>
              <p className="text-xs text-muted-foreground">
                {safeTimestamp.toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Ações de Limpeza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Limpeza do Sistema
            </CardTitle>
            <CardDescription>
              Remova dados descartáveis para liberar espaço. As ações são seguras e não afetam dados críticos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Alert */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">Atenção</p>
                  <p>A limpeza agora é seletiva e automática: quando o armazenamento atinge 80%, são mantidos sempre os 20% mais recentes de conversas e mídias. Apenas dados descartáveis (logs, sessões, mensagens antigas) são afetados.</p>
                </div>
              </div>

              {/* Botões de Limpeza */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleClean(["logs"])}
                  disabled={cleaning}
                >
                  {cleaning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Limpar Logs Antigos
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleClean(["sessions"])}
                  disabled={cleaning}
                >
                  {cleaning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                  Limpar Sessões Expiradas
                </Button>

                <AlertDialog open={dbConfirmOpen} onOpenChange={setDbConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={cleaningDb}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar Banco de Dados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar limpeza do banco?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá apagar dados das seguintes tabelas descartáveis:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>conversation_messages</li>
                          <li>received_messages</li>
                          <li>system_logs</li>
                          <li>audit_logs</li>
                          <li>notifications</li>
                          <li>sessions</li>
                          <li>flow_executions</li>
                          <li>broadcast_messages</li>
                        </ul>
                        <p className="mt-2 font-semibold text-red-600">
                          Esta ação NÃO pode ser desfeita!
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCleanDatabase}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={cleaningDb}
                      >
                        {cleaningDb ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Limpando...
                          </>
                        ) : (
                          "Confirmar Limpeza"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Resultados da última limpeza */}
              {cleanResults.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3">Resultados da Última Limpeza</h4>
                  <div className="space-y-2">
                    {cleanResults.map((result, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded ${result.deleted > 0 ? 'bg-green-50' : 'bg-muted'}`}>
                        <span className="text-sm capitalize">{result.type.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          {result.deleted > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-mono">
                            {result.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Tamanho das Tabelas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tamanho das Tabelas
            </CardTitle>
            <CardDescription>
              Total: <strong>{formatBytes(totalTablesSize)}</strong> em {tables.length} tabela{tables.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma tabela encontrada ou necessária autenticação de admin.</p>
                <p className="text-xs mt-2">Faça login como administrador para ver estatísticas do banco.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tabela</th>
                      <th className="text-right p-2">Linhas</th>
                      <th className="text-right p-2">Tamanho</th>
                      <th className="text-right p-2">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTables.map((table) => {
                      const size = Number(table.size_mb) || 0;
                      const rows = Number(table.table_rows) || 0;
                      const percent = totalTablesSize > 0 ? ((size / totalTablesSize) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={table.table_name} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{table.table_name}</td>
                          <td className="text-right p-2">{rows.toLocaleString()}</td>
                          <td className="text-right p-2">{formatBytes(size)}</td>
                          <td className="text-right p-2">{percent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {tables.length > 10 && topTables.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando as 10 maiores tabelas de {tables.length} total
              </p>
            )}
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="font-mono">{safeTimestamp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de coleta</span>
                <span>df -h, du -sh, MySQL queries</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ambiente</span>
                <span>{import.meta.env.MODE || "development"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}