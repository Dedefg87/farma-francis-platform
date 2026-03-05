import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Heart, Baby, Check } from "lucide-react";
import { toast } from "sonner";

export default function BabyShowerPublic() {
  const [giftValue, setGiftValue] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleGift = () => {
    if (!guestName || !giftValue) {
      toast.error("Preencha todos os campos");
      return;
    }
    toast.success(`Presente de R$ ${giftValue} registrado!`);
    setShowSuccess(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Baby className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-pink-600">Farma Francis</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Chá de Bebê</h1>
          <p className="text-gray-500 mt-2">Presenteie com carinho</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {!showSuccess ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Heart className="w-6 h-6 text-pink-500" />
                Escolha seu Presente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-pink-50 p-4 rounded-lg text-center">
                <Gift className="w-12 h-12 text-pink-500 mx-auto mb-2" />
                <p className="text-pink-700 font-medium">
                  Contribua para o Chá de Bebê!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Seu Nome</label>
                  <Input
                    placeholder="Digite seu nome"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Valor do Presente (R$)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 50"
                    value={giftValue}
                    onChange={(e) => setGiftValue(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-pink-500 hover:bg-pink-600 h-12 text-lg"
                  onClick={handleGift}
                >
                  Presentear
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Check className="w-6 h-6 text-green-500" />
                Obrigado pelo presente!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-4">
                Sua contribuição de R$ {giftValue} foi registrada.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  Dados para pagamento PIX enviados para confirmação.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
