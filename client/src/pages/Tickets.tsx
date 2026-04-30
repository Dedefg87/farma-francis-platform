import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, Clock, AlertCircle, CheckCircle, XCircle, ArrowRight, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Tickets() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: stats, isLoading: statsLoading } = trpc.tickets.stats.useQuery();
  const { data: response, isLoading } = trpc.tickets.list.useQuery();
  const tickets = response?.data || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mutations para ações rápidas
  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => {
      utils.tickets.list.invalidate().catch(() => {});
      utils.tickets.stats.invalidate().catch(() => {});
      toast.success("Atendimento atualizado!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Calcular SLA (tempo de espera)
  const calcularSLA = (createdAt: string): string => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) return `${Math.floor(diffHrs/24)}d ${diffHrs%24}h`;
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      (ticket.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.ticketNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Cores de status
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      pending: "bg-orange-100 text-orange-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Traduzir status
  const translateStatus = (status: string): string => {
    const map: Record<string, string> = {
      open: "Aberto",
      in_progress: "Em Andamento",
      pending: "Pendente",
      resolved: "Resolvido",
      closed: "Fechado",
    };
    return map[status] || status;
  };

  // Ações rápidas
  const handleFinalizar = (ticketId: number) => {
    updateTicket.mutate({ id: ticketId, status: 'resolved' });
  };

  const handleTransferir = (ticketId: number) => {
    // TODO: Implementar modal de seleção de agente
    toast.info("Transferência: funcionalidade em desenvolvimento");
  };

  const handleMarcarPrioridade = (ticketId: number) => {
    // TODO: Implementar modal de seleção de prioridade
    toast.info("Prioridade: funcionalidade em desenvolvimento");
  };

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Atendimentos Ativos</h1>
          <p className="text-gray-500 mt-1">
            Fila de atendimentos abertos e em andamento
          </p>
        </div>

        {/* Stats Cards - Apenas ativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendimentos Abertos</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.open || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando atendimento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.inProgress || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Sendo atendidos agora
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por assunto, número ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ativos</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle>Fila de Atendimentos</CardTitle>
            <CardDescription>
              {filteredTickets.length} atendimento(s) ativo(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando atendimentos...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum atendimento ativo no momento
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA (Espera)</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setLocation(`/agent/messages?conversationId=${ticket.id}`)}
                    >
                      <TableCell className="font-medium">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ticket.customerName || 'Sem nome'}</div>
                          <div className="text-sm text-gray-500">{ticket.customerPhone || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {ticket.subject || 'Sem assunto'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {translateStatus(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {calcularSLA(ticket.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleFinalizar(ticket.id)}
                              disabled={updateTicket.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => handleTransferir(ticket.id)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Transferir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            onClick={() => handleMarcarPrioridade(ticket.id)}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Prioridade
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
