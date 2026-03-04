import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Plus, Users, Wallet, Calendar, Package } from "lucide-react";
import { toast } from "sonner";

export default function BabyShowerEvents() {
  const [showCreate, setShowCreate] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const handleCreate = () => {
    toast.success("Evento criado com sucesso!");
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Gift className="w-8 h-8 text-pink-500" />
              Chá de Bebê Farma Francis
            </h1>
            <p className="text-gray-500 mt-2">
              Gerencie eventos de arrecadação de fraldas
            </p>
          </div>
          <Button
            className="bg-pink-500 hover:bg-pink-600"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Eventos Ativos</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Arrecadado</p>
                  <p className="text-2xl font-bold">R$ 0,00</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Convidados</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Fraldas</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos do Chá de Bebê</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  Nenhum evento encontrado
                </h3>
                <p className="text-gray-500 mt-2">
                  Clique em "Novo Evento" para criar o primeiro Chá de Bebê
                </p>
                <Button
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">Eventos listados aqui...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Chá de Bebê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Nome da Mãe" />
            <Input placeholder="Nome do Evento (ex: Chá da Maria)" />
            <Input type="date" placeholder="Data Prevista do Parto" />
            <Input type="number" placeholder="Meta em R$" />
            <Button
              className="w-full bg-pink-500 hover:bg-pink-600"
              onClick={handleCreate}
            >
              Criar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
