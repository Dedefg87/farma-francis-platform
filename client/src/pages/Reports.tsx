import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Table as TableIcon, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Reports() {
  const { data: tickets = [] } = trpc.tickets.list.useQuery();
  const { data: customers = [] } = trpc.customers.list.useQuery();
  const { data: leads = [] } = trpc.leads.list.useQuery();
  const { data: employees = [] } = trpc.employees.list.useQuery();

  const [reportType, setReportType] = useState<string>("tickets");
  const [period, setPeriod] = useState<string>("month");

  const generateCSV = () => {
    let csvContent = "";
    let filename = "";

    if (reportType === "tickets") {
      filename = `relatorio_atendimentos_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "Número,Assunto,Status,Prioridade,Canal,Criado em\n";
      tickets.forEach((ticket) => {
        csvContent += `"${ticket.ticketNumber}","${ticket.subject}","${ticket.status}","${ticket.priority}","${ticket.channel || "N/A"}","${new Date(ticket.createdAt).toLocaleString("pt-BR")}"\n`;
      });
    } else if (reportType === "customers") {
      filename = `relatorio_clientes_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "Nome,Email,Telefone,Cidade,Estado,Status,Cadastro\n";
      customers.forEach((customer) => {
        csvContent += `"${customer.name}","${customer.email || ""}","${customer.phone || ""}","${customer.city || ""}","${customer.state || ""}","${customer.status}","${new Date(customer.createdAt).toLocaleString("pt-BR")}"\n`;
      });
    } else if (reportType === "leads") {
      filename = `relatorio_leads_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "Nome,Email,Telefone,Origem,Estágio,Valor,Criado em\n";
      leads.forEach((lead) => {
        csvContent += `"${lead.name}","${lead.email || ""}","${lead.phone || ""}","${lead.source || ""}","${lead.stage}","${lead.value || 0}","${new Date(lead.createdAt).toLocaleString("pt-BR")}"\n`;
      });
    } else if (reportType === "employees") {
      filename = `relatorio_funcionarios_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "Nome,Email,Cargo,Departamento,Status,Role\n";
      employees.forEach((emp) => {
        const user = emp.user;
        const employee = emp.employee;
        if (user) {
          csvContent += `"${user.name || ""}","${user.email || ""}","${employee?.position || ""}","${employee?.department || ""}","${employee?.status || ""}","${user.role}"\n`;
        }
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
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

  const getReportStats = () => {
    if (reportType === "tickets") {
      return {
        total: tickets.length,
        open: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
        resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
        avgTime: tickets.length > 0
          ? Math.round(tickets.reduce((acc, t) => acc + (t.timeSpentMinutes || 0), 0) / tickets.length)
          : 0,
      };
    } else if (reportType === "customers") {
      return {
        total: customers.length,
        active: customers.filter((c) => c.status === "active").length,
        inactive: customers.filter((c) => c.status === "inactive").length,
        blocked: customers.filter((c) => c.status === "blocked").length,
      };
    } else if (reportType === "leads") {
      return {
        total: leads.length,
        won: leads.filter((l) => l.stage === "closed_won").length,
        lost: leads.filter((l) => l.stage === "closed_lost").length,
        active: leads.filter((l) => !["closed_won", "closed_lost"].includes(l.stage)).length,
      };
    } else if (reportType === "employees") {
      return {
        total: employees.length,
        active: employees.filter((e) => e.employee?.status === "active").length,
        admins: employees.filter((e) => e.user?.role === "admin").length,
        vacation: employees.filter((e) => e.employee?.status === "vacation").length,
      };
    }
    return {};
  };

  const stats = getReportStats();

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 mt-1">Gere e exporte relatórios personalizados</p>
        </div>

        {/* Report Configuration */}
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tickets">Atendimentos</SelectItem>
                    <SelectItem value="customers">Clientes</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="employees">Funcionários</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={generatePDF} variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 capitalize">
                  {key === "total" ? "Total" :
                   key === "open" ? "Abertos" :
                   key === "resolved" ? "Resolvidos" :
                   key === "avgTime" ? "Tempo Médio" :
                   key === "active" ? "Ativos" :
                   key === "inactive" ? "Inativos" :
                   key === "blocked" ? "Bloqueados" :
                   key === "won" ? "Ganhos" :
                   key === "lost" ? "Perdidos" :
                   key === "admins" ? "Administradores" :
                   key === "vacation" ? "Férias" : key}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {key === "avgTime" ? `${value}min` : value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Available Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TableIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Relatório de Atendimentos</CardTitle>
                  <CardDescription>Análise completa de tickets e chamados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: número do ticket, assunto, status, prioridade, canal, tempo de resolução e histórico.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("tickets");
                  generateCSV();
                }}
              >
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
                  <CardTitle>Relatório de Vendas/Conversão</CardTitle>
                  <CardDescription>Análise de leads e funil de vendas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: leads gerados, taxa de conversão, valor de vendas, origem dos leads e estágios do funil.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("leads");
                  generateCSV();
                }}
              >
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Relatório de Clientes</CardTitle>
                  <CardDescription>Base de clientes e segmentação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: dados cadastrais, status, histórico de compras, segmentação e valor do cliente.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("customers");
                  generateCSV();
                }}
              >
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
                  <CardDescription>Desempenho e produtividade da equipe</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Inclui: atendimentos realizados, tempo médio, taxa de resolução e avaliações.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReportType("employees");
                  generateCSV();
                }}
              >
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </FarmaDashboardLayout>
  );
}
