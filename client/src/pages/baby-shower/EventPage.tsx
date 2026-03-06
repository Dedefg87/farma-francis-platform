import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baby, Heart, Gift, Check, Loader2, MessageCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function EventPage() {
  const { code } = useParams();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const { data: eventData, isLoading } = trpc.babyShower.getEventByCode.useQuery({ code: code || "" });

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

  const handleWhatsAppRedirect = (pkg: any) => {
    const event = eventData?.event;
    const whatsappNumber = event?.whatsappNumber || "5531986337081"; // Default Farma Francis
    const messageText = `Olá! Gostaria de presentear no Chá de Bebê!\n\n` +
      `🎁 Presente: ${pkg.packageName}\n` +
      `💰 Valor: R$ ${pkg.price}\n` +
      `👶 Evento: ${event?.eventName || 'Chá de Bebê'}\n\n` +
      `Como posso finalizar a compra?`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleBuy = () => {
    if (!guestName) {
      toast.error("Informe seu nome");
      return;
    }
    
    purchaseMutation.mutate({
      eventId: eventData?.event?.id || 1,
      packageId: selectedPackage?.id || 1,
      guestName,
      guestPhone: guestPhone || undefined,
      amountPaid: parseFloat(selectedPackage?.price || "50"),
      messageToParents: message || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4ECDC4]" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#F5F9FC]">
        <header className="bg-white shadow-sm py-4 sticky top-0 z-10">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Baby className="w-6 h-6 text-[#4ECDC4]" />
              <span className="text-xl font-bold text-[#2C3E50]">Farma Francis</span>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-md">
          <Card className="text-center border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 bg-[#B2DFDB] rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#4ECDC4]" />
              </div>
              <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Obrigado!</h2>
              <p className="text-[#607D8B] mb-4">Seu presente foi registrado com sucesso.</p>
              <div className="bg-[#B3E5FC] bg-opacity-30 p-4 rounded-lg text-sm text-[#2C3E50]">
                Os pais receberão uma notificação.
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const event = eventData?.event;
  const packages = eventData?.packages || [];

  // Produtos padrão se não houver pacotes cadastrados
  const defaultProducts = [
    { id: 1, packageName: "Pacote Fraldas P", description: "20 unidades - Tam P", price: "85.00", giftType: "diapers", sizeLabel: "P" },
    { id: 2, packageName: "Pacote Fraldas M", description: "20 unidades - Tam M", price: "95.00", giftType: "diapers", sizeLabel: "M" },
    { id: 3, packageName: "Pacote Fraldas G", description: "20 unidades - Tam G", price: "105.00", giftType: "diapers", sizeLabel: "G" },
    { id: 4, packageName: "Lenços Umedecidos", description: "Pacote com 6 rolos", price: "45.00", giftType: "wipes" },
    { id: 5, packageName: "Contribuição Livre", description: "Ajude com qualquer valor", price: "50.00", giftType: "money" },
  ];

  const displayProducts = packages.length > 0 ? packages : defaultProducts;

  return (
    <div className="min-h-screen bg-[#F5F9FC]">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 sticky top-0 z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Baby className="w-6 h-6 text-[#4ECDC4]" />
            <span className="text-xl font-bold text-[#2C3E50]">Farma Francis</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-[#F5F9FC] py-12">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="w-16 h-16 bg-[#E1BEE7] rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-[#F06292] fill-[#F06292]" />
          </div>
          <h1 className="text-3xl font-bold text-[#2C3E50] mb-2">
            {event?.eventName || "Chá de Bebê"}
          </h1>
          <p className="text-[#607D8B]">
            Ajude os papais a prepararem a chegada do bebê!
          </p>
          {event?.expectedDueDate && (
            <p className="text-sm text-[#90A4AE] mt-2">
              Data prevista: {new Date(event.expectedDueDate).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </section>

      {/* Products Section */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#2C3E50] flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#4ECDC4]" />
            Escolha seu Presente
          </h2>

          <div className="grid gap-4">
            {displayProducts.map((pkg: any) => (
              <Card 
                key={pkg.id} 
                className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => { setSelectedPackage(pkg); setShowBuyModal(true); }}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Image Section */}
                    <div className="w-24 h-24 bg-[#B3E5FC] flex items-center justify-center flex-shrink-0">
                      {pkg.imageUrl ? (
                        <img 
                          src={pkg.imageUrl} 
                          alt={pkg.packageName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-[#4ECDC4]" />
                      )}
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-[#2C3E50]">{pkg.packageName}</h3>
                          <p className="text-sm text-[#607D8B]">{pkg.description || pkg.sizeLabel}</p>
                          <span className="text-[#4ECDC4] font-bold text-lg">R$ {pkg.price}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-[#4ECDC4] hover:bg-[#45B7AA] text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppRedirect(pkg);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="mt-8 border-0 shadow-md bg-[#B3E5FC] bg-opacity-20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#B3E5FC] rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-[#4ECDC4]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2C3E50] mb-1">Como funciona?</h3>
                <p className="text-sm text-[#607D8B]">
                  Escolha o presente e clique em <strong>WhatsApp</strong> para finalizar a compra diretamente com a farmácia. 
                  Você também pode registrar seu presente clicando no cartão.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Buy Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Presente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPackage && (
              <div className="bg-[#F5F9FC] p-3 rounded-lg">
                <p className="font-semibold text-[#2C3E50]">{selectedPackage.packageName}</p>
                <p className="text-lg font-bold text-[#4ECDC4]">R$ {selectedPackage.price}</p>
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
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={() => handleWhatsAppRedirect(selectedPackage)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button 
                className="flex-1 bg-[#4ECDC4] hover:bg-[#45B7AA]" 
                onClick={handleBuy}
                disabled={purchaseMutation.isPending}
              >
                {purchaseMutation.isPending ? "Processando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
