import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, X, Check } from "lucide-react";
import { toast } from "sonner";

export default function QueueManagement() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: queues, isLoading: queuesLoading } = trpc.queues.list.useQuery();
  const { data: myQueues, isLoading: myQueuesLoading, refetch: refetchMyQueues } = trpc.queues.myQueues.useQuery();
  const { data: agentStatuses, refetch: refetchStatus } = trpc.agent.status.get.useQuery();
  const { data: metrics } = trpc.agent.metrics.realtime.useQuery(undefined, {
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const updateStatusMutation = trpc.agent.status.update.useMutation({
    onSuccess: () => {
      refetchStatus();
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const joinQueueMutation = trpc.queues.join.useMutation({
    onSuccess: () => {
      refetchMyQueues();
      toast.success("Entrou na fila com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao entrar na fila: ${error.message}`);
    },
  });

  const leaveQueueMutation = trpc.queues.leave.useMutation({
    onSuccess: () => {
      refetchMyQueues();
      toast.success("Saiu da fila com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao sair da fila: ${error.message}`);
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handleToggleStatus = (channel: "whatsapp" | "instagram", currentStatus: string) => {
    const newStatus = currentStatus === "online" ? "paused" : "online";
    updateStatusMutation.mutate({ channel, status: newStatus });
  };

  const handleLogoutStatus = (channel: "whatsapp" | "instagram") => {
    updateStatusMutation.mutate({ channel, status: "offline" });
  };

  const getStatusInfo = (channel: "whatsapp" | "instagram") => {
    const status = agentStatuses?.find((s) => s.channel === channel);
    return {
      status: status?.status || "offline",
      label: status?.status === "online" ? "Logado - Em atendimento" : status?.status === "paused" ? "Logado - Em pausa" : "Desconectado",
      color: status?.status === "online" ? "bg-green-500" : status?.status === "paused" ? "bg-yellow-500" : "bg-gray-400",
      icon: status?.status === "online" ? Check : status?.status === "paused" ? Pause : X,
    };
  };

  const whatsappInfo = getStatusInfo("whatsapp");
  const instagramInfo = getStatusInfo("instagram");
  const activeChannels = [
    whatsappInfo.status !== "offline" ? "WhatsApp" : null,
    instagramInfo.status !== "offline" ? "Instagram" : null,
  ].filter(Boolean) as string[];

  const statusLabel = (status: string) =>
    status === "online" ? "Logado" : status === "paused" ? "Pausado" : "Deslogado";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com saudação e horário */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getGreeting()} {user?.name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-gray-600 italic mt-1">
              "Não espere por uma crise para descobrir o que é importante em sua vida."
            </p>
            <p className="text-sm text-gray-500 mt-1">- Platão</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-gray-900">
              {currentTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-sm text-gray-600">
              {currentTime.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Métricas em tempo real */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Atendimentos Ativos</p>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics?.activeConversations || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mensagens Não Lidas</p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics?.unreadMessages || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Status de Conexão */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Status de Conexao</h2>
          <span className="text-sm text-gray-600">
            {activeChannels.length > 0
              ? `Canais logados: ${activeChannels.join(", ")}`
              : "Nenhum canal logado"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
            <span className="text-base">📱</span>
            WhatsApp: {statusLabel(whatsappInfo.status)}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-sm text-pink-700">
            <span className="text-base">📷</span>
            Instagram: {statusLabel(instagramInfo.status)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-gray-600">{whatsappInfo.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={whatsappInfo.status === "online" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleStatus("whatsapp", whatsappInfo.status)}
                  disabled={updateStatusMutation.isPending}
                >
                  {whatsappInfo.status === "online" ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Ativar
                    </>
                  )}
                </Button>
                {whatsappInfo.status !== "offline" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLogoutStatus("whatsapp")}
                    disabled={updateStatusMutation.isPending}
                  >
                    Sair
                  </Button>
                )}
              </div>
            </div>
            <div className={`w-full h-2 rounded-full ${whatsappInfo.color}`} />
          </Card>

          {/* Instagram */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Instagram</p>
                  <p className="text-sm text-gray-600">{instagramInfo.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={instagramInfo.status === "online" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleStatus("instagram", instagramInfo.status)}
                  disabled={updateStatusMutation.isPending}
                >
                  {instagramInfo.status === "online" ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Ativar
                    </>
                  )}
                </Button>
                {instagramInfo.status !== "offline" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLogoutStatus("instagram")}
                    disabled={updateStatusMutation.isPending}
                  >
                    Sair
                  </Button>
                )}
              </div>
            </div>
            <div className={`w-full h-2 rounded-full ${instagramInfo.color}`} />
          </Card>
        </div>

        {/* Gerenciar Filas */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Minhas filas</h2>
          {myQueuesLoading ? (
            <p className="text-gray-500">Carregando filas...</p>
          ) : myQueues && myQueues.length > 0 ? (
            <div className="space-y-3">
              {myQueues.map((entry) => (
                <div key={entry.queue.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-semibold">{entry.queue.name}</p>
                    <p className="text-sm text-gray-600">Canal: {entry.queue.channel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.isActive ? "default" : "outline"}>
                      {entry.isActive ? "Logado" : "Deslogado"}
                    </Badge>
                    {entry.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => leaveQueueMutation.mutate({ queueId: entry.queue.id })}
                        disabled={leaveQueueMutation.isPending}
                      >
                        Sair
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinQueueMutation.mutate({ queueId: entry.queue.id })}
                        disabled={joinQueueMutation.isPending}
                      >
                        Entrar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma fila atribuída</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Gerenciar filas</h2>
          <div className="space-y-4">
            {queuesLoading ? (
              <p className="text-gray-500">Carregando filas...</p>
            ) : queues && queues.length > 0 ? (
              queues.map((queue) => (
                <div
                  key={queue.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 rounded flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">{queue.name}</p>
                      <p className="text-sm text-gray-600">
                        Máximo: {queue.maxWaitMinutes} minutos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">00:00:02</p>
                    <Badge variant="outline" className="mt-1">
                      {queue.channel}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Nenhuma fila ativa no momento</p>
            )}
          </div>
        </Card>


        {/* Novidades */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Novidades</h2>
          <p className="text-gray-500">Nenhuma novidade para exibir.</p>
        </Card>
      </div>
    </div>
  );
}
