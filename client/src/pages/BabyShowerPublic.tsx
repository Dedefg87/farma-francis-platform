import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Heart, Baby } from "lucide-react";

export default function BabyShowerPublic() {
  const params = useParams();
  const eventCode = params.code;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Baby className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-pink-600">Farma Francis</span>
          </div>
          <h1 className="text-3xl font-bold">Chá de Bebê</h1>
          <p className="text-gray-500 mt-2">Módulo criado com sucesso</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Página Pública do Chá de Bebê
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Código do evento: <strong>{eventCode}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Esta página será onde os convidados poderão visualizar o evento e
              escolher presentes para o bebê.
            </p>
            <div className="bg-pink-50 p-6 rounded-lg">
              <Gift className="w-12 h-12 text-pink-500 mx-auto mb-4" />
              <p className="text-pink-700 font-medium">
                🎉 API babyShower integrada com sucesso!
              </p>
              <p className="text-sm text-pink-600 mt-2">
                Rotas disponíveis: getEventByCode, createPurchase
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
