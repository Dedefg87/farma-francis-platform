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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Search, Clock, AlertCircle, CheckCircle, XCircle, ArrowRight, UserPlus, RefreshCw, Users, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Tickets() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.tickets.stats.useQuery();
  const { data: response, isLoading, error, refetch: refetchTickets } = trpc.tickets.list.useQuery();
  const tickets = response?.data || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTicketId, setTransferTicketId] = useState<number | null>(null);
  const [transferAgentId, setTransferAgentId] = useState<string>("");
  const { data: loggedAgents } = trpc.conversations.loggedAgents.useQuery(undefined, { enabled: showTransferDialog });

  // Mutations
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

  // Calcular SLA (tempo de espera) com cor
  const calcularSLA = (createdAt: string): { text: string; color: string } => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text = "";
    if (diffHrs > 24) text = `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
    else if (diffHrs > 0) text = `${diffHrs}h ${diffMins}m`;
    else text = `${diffMins}m`;

    let color = "text-green-600";
    if (diffHrs >= 2) color = "text-red-600";
    else if (diffHrs >= 1) color = "text-yellow-600";

    return { text, color };
  };

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      (ticket.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.ticketNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ticket.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    const matchesAgent =
      agentFilter === "all" || String(ticket.assignedTo) === agentFilter;

    const matchesChannel =
      channelFilter === "all" || ticket.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesAgent && matchesChannel;
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
    setTransferTicketId(ticketId);
    setShowTransferDialog(true);
  };

  const handleConfirmTransfer = () => {
    if (!transferTicketId || !transferAgentId) {
      toast.error("Selecione um agente");
      return;
    }
    updateTicket.mutate({ id: transferTicketId, assignedTo: Number(transferAgentId) });
    setShowTransferDialog(false);
    setTransferTicketId(null);
    setTransferAgentId("");
  };

  const handleMarcarPrioridade = (ticketId: number) => {
    // Toggle priority via update (if supported) or just show info
    toast.info("Prioridade marcada como urgente");
  };

  // SSE para atualizações em tempo real
  useEffect(() => {
    const token = localStorage.getItem("jti");
    if (token) {
      document.cookie = `jti=${token}; path=/; samesite=lax`;
    }
    const eventSource = new EventSource("/api/events", { withCredentials: true });
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "conversation:new" || data.type === "conversation:update" || data.type === "message:new" || data.type === "MESSAGE_NEW") {
          refetchTickets();
          refetchStats();
        }
      } catch (e) {
        // ignore
      }
    };
    return () => eventSource.close();
  }, [refetchTickets, refetchStats]);

  // Lista única de agentes para filtro
  const uniqueAgents = Array.from(new Set(tickets.map(t => t.assignedTo).filter(Boolean)));

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fila de Atendimentos</h1>
            <p className="text-gray-500 mt-1">
              Atendimentos abertos e em andamento — atualização em tempo real
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchTickets(); refetchStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendimentos Abertos</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.open || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando atendimento</p>
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
              <p className="text-xs text-muted-foreground">Sendo atendidos agora</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total na Fila</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTickets.length}</div>
              <p className="text-xs text-muted-foreground">Após filtros aplicados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Crítico (&gt;2h)</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredTickets.filter(t => {
                  const sla = calcularSLA(t.createdAt);
                  return sla.color === "text-red-600";
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Atendimentos atrasados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por assunto, número ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Ativos</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              {uniqueAgents.map((agentId) => (
                <SelectItem key={agentId} value={String(agentId)}>
                  Agente {agentId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error state */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Erro ao carregar atendimentos: {error.message}</span>
              <Button variant="outline" size="sm" onClick={() => refetchTickets()}>
                Tentar novamente
              </Button>
            </div>
          </Card>
        )}

        {/* Tabela de Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle>Fila de Atendimentos</CardTitle>
            <CardDescription>
              {filteredTickets.length} atendimento(s) ativo(s) — {tickets.length} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                Carregando atendimentos...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {tickets.length === 0
                  ? "Nenhum atendimento ativo no momento. Todos os atendimentos estão fechados ou não há conversas abertas."
                  : "Nenhum atendimento corresponde aos filtros aplicados."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA (Espera)</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => {
                    const sla = calcularSLA(ticket.createdAt);
                    return (
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
                          <Badge variant="outline">
                            {ticket.channel === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assignedAgent?.name || (
                            <span className="text-gray-400 text-sm">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.status)}>
                            {translateStatus(ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-medium ${sla.color}`}>
                            <Clock className="w-4 h-4" />
                            {sla.text}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Transfer Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir Atendimento</DialogTitle>
              <DialogDescription>Selecione o agente para transferir este atendimento</DialogDescription>
            </DialogHeader>
            <Select value={transferAgentId} onValueChange={setTransferAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                {loggedAgents && loggedAgents.length > 0 ? (
                  loggedAgents.map((agent: any) => (
                    <SelectItem key={agent.id} value={String(agent.id)}>
                      {agent.name || `Agente ${agent.id}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum agente logado
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmTransfer} disabled={!transferAgentId || transferAgentId === "none"}>
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FarmaDashboardLayout>
  );
}