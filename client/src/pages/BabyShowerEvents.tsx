import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FarmaDashboardLayout } from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, Users, Wallet, Calendar, Package, ExternalLink, Settings, Link, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BabyShowerEvents() {
  const [, navigate] = useLocation();

  const { data, isLoading, refetch } = trpc.babyShower.listEvents.useQuery({ limit: 50 });
  const deleteMutation = trpc.babyShower.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("Evento apagado com sucesso!");
      refetch();
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao apagar evento: ${error.message || "Erro desconhecido"}`);
    },
  });

  const events = data || [];

  const handleDeleteEvent = (eventId: number, eventName: string) => {
    if (!confirm(`Tem certeza que deseja apagar o evento "${eventName}"?\n\nEsta ação não pode ser desfeita e irá remover todos os dados relacionados (pacotes, compras, retiradas).`)) {
      return;
    }
    deleteMutation.mutate({ id: eventId });
  };

  return (
    <FarmaDashboardLayout title="Chá de Bebê">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Eventos de Chá de Bebê</h1>
            <p className="text-gray-500">Gerencie os eventos e acompanhe os presentes</p>
          </div>
          <Button className="bg-pink-500 hover:bg-pink-600" onClick={() => navigate("/baby-shower/create")}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Eventos Ativos</p>
                  <p className="text-2xl font-bold">{events.filter((e: unknown) => e.event.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Arrecadado</p>
                  <p className="text-2xl font-bold">R$ {events.reduce((sum: number, e: unknown) => sum + parseFloat(e.event.walletBalance || 0), 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Convidados</p>
                  <p className="text-2xl font-bold">{events.reduce((sum: number, e: unknown) => sum + (e.event.totalGuests || 0), 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Eventos</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : !events.length ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum evento criado ainda.</p>
                <Button className="mt-4 bg-pink-500" onClick={() => navigate("/baby-shower/create")}>
                  <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Evento
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {events.map((e: unknown) => (
                  <div key={e.event.id} className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{e.event.eventName}</h3>
                      <p className="text-sm text-gray-500">{e.motherName}</p>
                      <div className="flex gap-4 text-sm mt-1">
                        <span className="text-green-600">R$ {parseFloat(e.event.walletBalance || 0).toFixed(2)}</span>
                        <span className="text-blue-600">{e.event.totalGuests} convidados</span>
                        <Badge variant={e.event.status === 'active' ? 'default' : 'secondary'}>
                          {e.event.status === 'active' ? 'Ativo' : e.event.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(e.event.publicLink || `${window.location.origin}/cha-de-bebe/${e.event.eventCode}`).then(() => toast.success("Link copiado!"))}>
                        <Link className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(`/cha-de-bebe/${e.event.eventCode}`, '_blank')}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="default" size="sm" onClick={() => navigate(`/baby-shower/manage/${e.event.id}`)}>
                        <Settings className="w-4 h-4 mr-1" /> Gerenciar
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteEvent(e.event.id, e.event.eventName)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
