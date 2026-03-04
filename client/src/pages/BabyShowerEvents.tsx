import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export default function BabyShowerEvents() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-500" />
            Chá de Bebê Farma Francis
          </h1>
          <p className="text-gray-500 mt-2">Módulo ativo e funcionando</p>
        </div>
        <Button className="bg-pink-500">Novo Evento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos do Chá de Bebê</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Página carregada com sucesso!</p>
          <p className="text-sm text-gray-500 mt-2">
            API: /api/trpc/babyShower.*
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
