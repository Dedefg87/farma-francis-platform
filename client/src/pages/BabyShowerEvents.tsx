import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Gift, Plus, Users, Wallet, Calendar, Package, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function BabyShowerEvents() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    motherCustomerId: "",
    eventName: "",
    expectedDueDate: "",
    targetAmount: "",
  });

  const { data: events, isLoading, refetch } = trpc.babyShower.listEvents.useQuery(
    { status: "active", limit: 50 },
    { enabled: true }
  );

  const createMutation = trpc.babyShower.createEvent.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      setShowCreate(false);
      setFormData({ motherCustomerId: "", eventName: "", expectedDueDate: "", targetAmount: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.motherCustomerId || !formData.eventName) {
      toast.error("Preencha ID da mãe e nome do evento");
      return;
    }
    createMutation.mutate({
      motherCustomerId: parseInt(formData.motherCustomerId),
      eventName: formData.eventName,
      expectedDueDate: formData.expectedDueDate || undefined,
      targetAmount: formData.targetAmount ? parseFloat(formData.targetAmount) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gift className="w-8 h-8 text-pink-500" />
              Chá de Bebê Farma Francis
            </h1>
            <p className="text-gray-500 mt-2">Gerencie eventos de arrecadação</p>
          </div>
          <Button className="bg-pink-500" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <div><p className="text-sm text-gray-600">Eventos</p><p className="text-2xl font-bold">{events?.length || 0}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-green-500" />
            <div><p className="text-sm text-gray-600">Arrecadado</p><p className="text-2xl font-bold">R$ {events?.reduce((a, e) => a + parseFloat(e.event?.walletBalance || 0), 0).toFixed(2)}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" />
            <div><p className="text-sm text-gray-600">Convidados</p><p className="text-2xl font-bold">{events?.reduce((a, e) => a + (e.event?.totalGuests || 0), 0)}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-500" />
            <div><p className="text-sm text-gray-600">Fraldas</p><p className="text-2xl font-bold">{events?.reduce((a, e) => a + (e.event?.availableDiapersCount || 0), 0)}</p></div>
          </div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Eventos</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p>Carregando...</p> : !events?.length ? (
              <div className="text-center py-8">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Nenhum evento. Clique em "Novo Evento" para criar.</p>
              </div>
            ) : (
              events.map((e: any) => (
                <div key={e.event.id} className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{e.event.eventName}</h3>
                    <p className="text-sm text-gray-500">{e.motherName}</p>
                    <div className="flex gap-4 text-sm mt-1">
                      <span className="text-green-600">R$ {parseFloat(e.event.walletBalance || 0).toFixed(2)}</span>
                      <span className="text-blue-600">{e.event.totalGuests} convidados</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {navigator.clipboard.writeText(e.event.publicLink);toast.success("Link copiado!");}}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent aria-describedby="dialog-desc">
          <DialogHeader>
            <DialogTitle>Criar Novo Chá de Bebê</DialogTitle>
            <DialogDescription id="dialog-desc">Preencha os dados do evento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>ID da Mãe *</Label><Input type="number" value={formData.motherCustomerId} onChange={(e) => setFormData({...formData, motherCustomerId: e.target.value})} /></div>
            <div><Label>Nome do Evento *</Label><Input value={formData.eventName} onChange={(e) => setFormData({...formData, eventName: e.target.value})} /></div>
            <div><Label>Data Prevista</Label><Input type="date" value={formData.expectedDueDate} onChange={(e) => setFormData({...formData, expectedDueDate: e.target.value})} /></div>
            <div><Label>Meta (R$)</Label><Input type="number" value={formData.targetAmount} onChange={(e) => setFormData({...formData, targetAmount: e.target.value})} /></div>
            <Button className="w-full bg-pink-500" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
