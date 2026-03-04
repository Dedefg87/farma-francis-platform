import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift } from "lucide-react";

export default function BabyShowerPublic() {
  const params = useParams();
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white shadow-sm py-6 text-center">
        <h1 className="text-3xl font-bold">Chá de Bebê</h1>
        <p className="text-gray-500 mt-2">Código: {params.code}</p>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-pink-500" />
              Página Pública do Chá de Bebê
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>Módulo ativo!</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
