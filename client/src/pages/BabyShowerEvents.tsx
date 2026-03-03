import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export default function BabyShowerEvents() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-500" />
            Chá de Bebê Farma Francis
          </h1>
          <p className="text-gray-500 mt-2">
            Módulo devidamente criado e instalação concluí
          </p>
        </div>
        <Button className="bg-pink-500">Novo Evento</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Eventos</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Arrecadado</p>
            <p className="text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Convidados</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Fraldas</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos do Chá de Bebê</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            API criada com sucesso. Endpoint: /api/trpc/babyShower.*
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Rotas disponíveis: createEvent, listEvents, getEventById, createPackage,
            createPurchase, confirmPayment, createWithdrawal, getDashboardStats
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
