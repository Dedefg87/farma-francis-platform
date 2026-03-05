import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baby, Heart, Gift, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EventPage() {
  const { code } = useParams();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const { data: events, isLoading } = trpc.babyShower.listEvents.useQuery({ limit: 50 });

  const purchaseMutation = trpc.babyShower.createPurchase.useMutation({
    onSuccess: () => {
      toast.success("Presente registrado!");
      setShowSuccess(true);
      setShowBuyModal(false);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleBuy = () => {
    if (!guestName) {
      toast.error("Informe seu nome");
      return;
    }
    
    purchaseMutation.mutate({
      eventId: events?.[0]?.event?.id || 1,
      packageId: selectedPackage?.id || 1,
      guestName,
      guestPhone: guestPhone || undefined,
      amountPaid: parseFloat(selectedPackage?.price || "50"),
      messageToParents: message || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <header className="bg-white shadow-sm py-4">
          <div className="container mx-auto px-4 text-center">
            <Baby className="w-8 h-8 text-pink-500 mx-auto" />
            <span className="text-xl font-bold text-pink-600">Farma Francis</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-md">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
              <p className="text-gray-600 mb-4">Seu presente foi registrado.</p>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                Os pais receberao a notificacao.
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const products = [
    { id: 1, name: "Pacote Fraldas P", desc: "20 unidades - Tam P", price: "85.00", icon: "Baby", color: "blue" },
    { id: 2, name: "Pacote Fraldas M", desc: "20 unidades - Tam M", price: "95.00", icon: "Baby", color: "purple" },
    { id: 3, name: "Pacote Fraldas G", desc: "20 unidades - Tam G", price: "105.00", icon: "Baby", color: "orange" },
    { id: 4, name: "Lenços Umedecidos", desc: "Pacote com 6 rolos", price: "45.00", icon: "Heart", color: "green" },
    { id: 5, name: "Contribuicao Livre", desc: "Ajude com qualquer valor", price: "50.00", icon: "Heart", color: "pink" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 text-center">
          <Baby className="w-6 h-6 text-pink-500 mx-auto" />
          <span className="text-xl font-bold text-pink-600">Farma Francis</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            Cha de Bebe
          </h1>
          <p className="text-gray-600">Ajude os papais a prepararem a chegada do bebe!</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Escolha seu Presente
          </h2>

          {products.map((p) => (
            <Card key={p.id} className="cursor-pointer" onClick={() => { setSelectedPackage(p); setShowBuyModal(true); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-${p.color}-100 rounded-lg flex items-center justify-center`}>
                    {p.icon === "Baby" ? (
                      <Baby className={`w-7 h-7 text-${p.color}-600`} />
                    ) : (
                      <Heart className={`w-7 h-7 text-${p.color}-600`} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.desc}</p>
                    <span className="text-green-600 font-semibold">R$ {p.price}</span>
                  </div>
                </div>
                <Button size="sm" className="bg-pink-500 hover:bg-pink-600">Presentear</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Presente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPackage && (
              <div className="bg-pink-50 p-3 rounded-lg">
                <p className="font-semibold">{selectedPackage.name}</p>
                <p className="text-lg font-bold text-green-600">R$ {selectedPackage.price}</p>
              </div>
            )}
            <div>
              <Label>Seu Nome *</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="(11) 98765-4321" />
            </div>
            <div>
              <Label>Mensagem para os Pais</Label>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva uma mensagem carinhosa..." />
            </div>
            <Button 
              className="w-full bg-pink-500 hover:bg-pink-600" 
              onClick={handleBuy}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? "Processando..." : "Confirmar Presente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
