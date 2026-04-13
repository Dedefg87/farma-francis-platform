import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Download, FileText, Table as TableIcon, TrendingUp,
  Users, MessageSquare, Clock, CheckCircle, BarChart3,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const periodMap: Record<string, string> = {
  today: "hoje", week: "semana", month: "mes", year: "ano", all: "todos",
};

export default function Reports() {
  const [reportType, setReportType] = useState("conversations");
  const [period, setPeriod] = useState("month");
  const statsPeriod = periodMap[period] || "mes";

  // ── Real data from existing routers ──
  const { data: stats } = (trpc as any).dashboardStats.getStats.useQuery({ period: statsPeriod });
  const { data: channelData = [] } = (trpc as any).dashboardStats.getConversationsByChannel.useQuery({ period: statsPeriod });
  const { data: statusData = [] } = (trpc as any).dashboardStats.getConversationsByStatus.useQuery({ period: statsPeriod });
  const { data: agentStats = [] } = (trpc as any).dashboardStats.getAgentStats.useQuery({ period: statsPeriod });
  const { data: hourlyData = [] } = (trpc as any).dashboardStats.getContactsByHour.useQuery({ period: statsPeriod });
  const { data: employeesResult } = (trpc as any).employees.list.useQuery();

  // Safe extraction — employees.list returns { employees: [...], pagination }
  const employees: any[] = Array.isArray(employeesResult?.employees)
    ? employeesResult.employees : [];

  // ── Computed stats ──
  const totalConversations = stats?.totalConversations ?? 0;
  const uniqueCustomers = stats?.uniqueCustomers ?? 0;
  const messagesSent = stats?.messagesSent ?? 0;
  const messagesReceived = stats?.messagesReceived ?? 0;
  const avgHandlingTime = stats?.avgHandlingTime ?? "00:00:00";
  const activeEmployees = employees.filter((e: any) => e.status === "active").length;

  // ── CSV generation ──
  const generateCSV = () => {
    let csvContent = "";
    let filename = "";
    const today = new Date().toISOString().split("T")[0];
    const suffix = period || "all";

    if (reportType === "conversations") {
      filename = `relatorio_conversas_${suffix}_${today}.csv`;
      csvContent = "Métrica,Valor\n";
      csvContent += `"Total de Conversas","${totalConversations}"\n`;
      csvContent += `"Clientes Únicos","${uniqueCustomers}"\n`;
      csvContent += `"Mensagens Enviadas","${messagesSent}"\n`;
      csvContent += `"Mensagens Recebidas","${messagesReceived}"\n`;
      csvContent += `"Tempo Médio Atendimento","${avgHandlingTime}"\n`;
      csvContent += "\nPor Canal\nCanal,Quantidade\n";
      channelData.forEach((ch: any) => {
        csvContent += `"${ch.name || ch.channel || "N/A"}","${ch.value ?? ch.count ?? 0}"\n`;
      });
      csvContent += "\nPor Status\nStatus,Quantidade\n";
      statusData.forEach((st: any) => {
        csvContent += `"${st.name || st.status || "N/A"}","${st.value ?? st.count ?? 0}"\n`;
      });
    } else if (reportType === "agents") {
      filename = `relatorio_agentes_${suffix}_${today}.csv`;
      csvContent = "Agente,Conversas,Msgs Enviadas,Msgs Recebidas,Dias Ativos,Tempo Médio\n";
      agentStats.forEach((agent: any) => {
        csvContent += `"${agent.agentName || agent.name || "N/A"}","${agent.totalConversations || 0}","${agent.messagesSent || 0}","${agent.messagesReceived || 0}","${agent.daysActive || 0}","${agent.avgHandlingTime || "N/A"}"\n`;
      });
    } else if (reportType === "hourly") {
      filename = `relatorio_horario_${suffix}_${today}.csv`;
      csvContent = "Hora,Contatos\n";
      hourlyData.forEach((h: any) => {
        csvContent += `"${h.hour ?? h.time ?? "N/A"}h","${h.count ?? h.value ?? 0}"\n`;
      });
    } else if (reportType === "employees") {
      filename = `relatorio_funcionarios_${suffix}_${today}.csv`;
      csvContent = "Nome,Email,Role,Status,Departamento,Cargo\n";
      employees.forEach((emp: any) => {
        csvContent += `"${emp.displayName || emp.username || ""}","${emp.email || ""}","${emp.role || ""}","${emp.status || ""}","${emp.department || ""}","${emp.position || ""}"\n`;
      });
    }

    if (!csvContent) { toast.error("Nenhum dado para exportar"); return; }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV exportado com sucesso!");
  };

  const generatePDF = () => {
    toast.info("Exportação em PDF será implementada em breve. Use CSV por enquanto.");
  };

  // ── Stat cards ──
  const statCards = useMemo(() => {
    if (reportType === "conversations") {
      return [
        { label: "Total Conversas", value: totalConversations, icon: MessageSquare, color: "bg-blue-100 text-blue-600" },
        { label: "Clientes Únicos", value: uniqueCustomers, icon: Users, color: "bg-green-100 text-green-600" },
        { label: "Msgs Enviadas", value: messagesSent, icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
        { label: "Tempo Médio", value: avgHandlingTime, icon: Clock, color: "bg-orange-100 text-orange-600" },
      ];
    } else if (reportType === "agents") {
      const tc = agentStats.reduce((a: number, x: any) => a + (x.totalConversations || 0), 0);
      const tm = agentStats.reduce((a: number, x: any) => a + (x.messagesSent || 0), 0);
      return [
        { label: "Agentes Ativos", value: agentStats.length, icon: Users, color: "bg-blue-100 text-blue-600" },
        { label: "Total Conversas", value: tc, icon: MessageSquare, color: "bg-green-100 text-green-600" },
        { label: "Msgs Enviadas", value: tm, icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
        { label: "Tempo Médio", value: avgHandlingTime, icon: Clock, color: "bg-orange-100 text-orange-600" },
      ];
    } else if (reportType === "hourly") {
      const peak = hourlyData.length > 0
        ? hourlyData.reduce((m: any, h: any) => (h.count ?? h.value ?? 0) > (m.count ?? m.value ?? 0) ? h : m)
        : null;
      return [
        { label: "Horário de Pico", value: peak ? `${peak.hour ?? peak.time ?? "?"}h` : "—", icon: Clock, color: "bg-blue-100 text-blue-600" },
        { label: "Total Contatos", value: hourlyData.reduce((a: number, h: any) => a + (h.count ?? h.value ?? 0), 0), icon: MessageSquare, color: "bg-green-100 text-green-600" },
        { label: "Horas Mapeadas", value: hourlyData.length, icon: BarChart3, color: "bg-purple-100 text-purple-600" },
        { label: "Agentes Ativos", value: activeEmployees, icon: Users, color: "bg-orange-100 text-orange-600" },
      ];
    } else if (reportType === "employees") {
      const admins = employees.filter((e: any) => e.role === "admin").length;
      return [
        { label: "Total Funcionários", value: employees.length, icon: Users, color: "bg-blue-100 text-blue-600" },
        { label: "Ativos", value: activeEmployees, icon: CheckCircle, color: "bg-green-100 text-green-600" },
        { label: "Administradores", value: admins, icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
        { label: "Conversas (período)", value: totalConversations, icon: MessageSquare, color: "bg-orange-100 text-orange-600" },
      ];
    }
    return [];
  }, [reportType, stats, agentStats, hourlyData, employees]);

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">Gere e exporte relatórios personalizados</p>
        </div>

        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Relatório</CardTitle>
            <CardDescription>Selecione o tipo de relatório e o período desejado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversations">Conversas & Canais</SelectItem>
                    <SelectItem value="agents">Desempenho Agentes</SelectItem>
                    <SelectItem value="hourly">Contatos por Hora</SelectItem>
                    <SelectItem value="employees">Funcionários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ações</Label>
                <div className="flex gap-2">
                  <Button onClick={generateCSV} className="flex-1">
                    <Download className="w-4 h-4 mr-2" /> CSV
                  </Button>
                  <Button onClick={generatePDF} variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" /> PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{card.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{card.value}</div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Conversas: Canal + Status */}
        {reportType === "conversations" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Conversas por Canal</CardTitle></CardHeader>
              <CardContent>
                {channelData.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum dado no período</p>
                ) : (
                  <div className="space-y-3">
                    {channelData.map((ch: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{ch.name || ch.channel || "N/A"}</span>
                        <span className="text-sm font-semibold">{ch.value ?? ch.count ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Conversas por Status</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum dado no período</p>
                ) : (
                  <div className="space-y-3">
                    {statusData.map((st: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{st.name || st.status || "N/A"}</span>
                        <span className="text-sm font-semibold">{st.value ?? st.count ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agentes */}
        {reportType === "agents" && (
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Agente</CardTitle>
              <CardDescription>Métricas de cada agente no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              {agentStats.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum dado no período</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="pb-2 pr-4">Agente</th>
                        <th className="pb-2 pr-4">Conversas</th>
                        <th className="pb-2 pr-4">Msgs Enviadas</th>
                        <th className="pb-2 pr-4">Msgs Recebidas</th>
                        <th className="pb-2 pr-4">Dias Ativos</th>
                        <th className="pb-2">Tempo Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((agent: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{agent.agentName || agent.name || "N/A"}</td>
                          <td className="py-2 pr-4">{agent.totalConversations ?? 0}</td>
                          <td className="py-2 pr-4">{agent.messagesSent ?? 0}</td>
                          <td className="py-2 pr-4">{agent.messagesReceived ?? 0}</td>
                          <td className="py-2 pr-4">{agent.daysActive ?? 0}</td>
                          <td className="py-2">{agent.avgHandlingTime ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Horário */}
        {reportType === "hourly" && (
          <Card>
            <CardHeader>
              <CardTitle>Contatos por Hora</CardTitle>
              <CardDescription>Distribuição de contatos ao longo do dia</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyData.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum dado no período</p>
              ) : (
                <div className="space-y-2">
                  {hourlyData.map((h: any, i: number) => {
                    const count = h.count ?? h.value ?? 0;
                    const maxCount = Math.max(...hourlyData.map((x: any) => x.count ?? x.value ?? 0), 1);
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-12 text-sm text-gray-600">{h.hour ?? h.time ?? "?"}h</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-sm font-semibold text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Funcionários */}
        {reportType === "employees" && (
          <Card>
            <CardHeader>
              <CardTitle>Funcionários</CardTitle>
              <CardDescription>Lista de funcionários cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum funcionário cadastrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="pb-2 pr-4">Nome</th>
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2 pr-4">Role</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Departamento</th>
                        <th className="pb-2">Cargo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp: any) => (
                        <tr key={emp.userId} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{emp.displayName || emp.username || "—"}</td>
                          <td className="py-2 pr-4">{emp.email || "—"}</td>
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${emp.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${emp.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {emp.status === "active" ? "Ativo" : emp.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{emp.department || "—"}</td>
                          <td className="py-2">{emp.position || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TableIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Relatório de Conversas</CardTitle>
                  <CardDescription>Análise por canal, status e volume</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: total de conversas, canais (WhatsApp/Telegram), status, clientes únicos e tempo médio.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setReportType("conversations"); setTimeout(generateCSV, 100); }}>
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Desempenho dos Agentes</CardTitle>
                  <CardDescription>Produtividade e métricas por agente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: conversas por agente, mensagens enviadas/recebidas, dias ativos e tempo médio.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setReportType("agents"); setTimeout(generateCSV, 100); }}>
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Contatos por Hora</CardTitle>
                  <CardDescription>Distribuição horária de contatos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: horário de pico, distribuição ao longo do dia e volume por hora.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setReportType("hourly"); setTimeout(generateCSV, 100); }}>
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Relatório de Funcionários</CardTitle>
                  <CardDescription>Equipe e estrutura organizacional</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: nome, email, role, status, departamento e cargo de cada funcionário.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setReportType("employees"); setTimeout(generateCSV, 100); }}>
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </FarmaDashboardLayout>
  );
}
