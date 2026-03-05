import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Heart, Baby, Check, Package, Phone, User, MessageSquare, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  eventId: number;
  productName: string;
  price: string;
  quantity: number;
  status: "available" | "purchased" | "reserved";
  guestName: string | null;
  messageToParents: string | null;
}

interface EventData {
  event: {
    id: number;
    eventName: string;
    eventCode: string;
    slug: string;
    eventDate: string | null;
    expectedDueDate: string | null;
  };
  motherName: string;
  products: Product[];
}

export default function BabyShowerPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [messageToParents, setMessageToParents] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: eventData, isLoading, error } = trpc.babyShower.getEventBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const reserveMutation = trpc.babyShower.reserveProduct.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      toast.success("Presente reservado! Redirecionando para WhatsApp...");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handlePresentear = (product: Product) => {
    if (product.status !== "available") {
      toast.error("Este produto já foi presenteado!");
      return;
    }
    setSelectedProduct(product);
  };

  const handleConfirm = () => {
    if (!selectedProduct || !guestName.trim()) {
      toast.error("Por favor, preencha seu nome");
      return;
    }

    // Criar mensagem para WhatsApp
    const eventName = eventData?.event?.eventName || "Chá de Bebê";
    const message = `Olá! Sou o(a) ${guestName.trim()} e gostaria de presentear com ${selectedProduct.productName} para o ${eventName}.${messageToParents ? `\n\nMensagem: ${messageToParents}` : ""}`;
    
    // URL do WhatsApp da Farma Francis (evolution API)
    const phone = "5531999999999"; // Número da farmácia - será substituído pelo real
    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    setWhatsappLink(waLink);

    // Reservar o produto
    reserveMutation.mutate({
      productId: selectedProduct.id,
      guestName: guestName.trim(),
      guestPhone: guestPhone.replace(/\D/g, "") || undefined,
      messageToParents: messageToParents.trim() || undefined,
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(whatsappLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Baby className="w-16 h-16 text-pink-500 mx-auto animate-bounce" />
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evento não encontrado</h1>
          <p className="text-gray-600">O link que você acessou pode estar incorreto ou o evento foi encerrado.</p>
        </div>
      </div>
    );
  }

  const { event, motherName, products } = eventData as EventData;
  const availableProducts = products?.filter((p: Product) => p.status === "available") || [];
  const purchasedProducts = products?.filter((p: Product) => p.status === "purchased" || p.status === "reserved") || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Baby className="w-8 h-8 text-pink-500" />
            <span className="text-2xl font-bold text-pink-600">Farma Francis</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{event.eventName}</h1>
          <p className="text-gray-500 mt-2">
            Chá de Bebê de {motherName}
            {event.expectedDueDate && (
              <span className="block text-sm text-pink-600 mt-1">
                Previsão: {new Date(event.expectedDueDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-pink-50 border-pink-200">
            <CardContent className="pt-6 text-center">
              <Package className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-pink-700">{availableProducts.length}</p>
              <p className="text-sm text-pink-600">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{purchasedProducts.length}</p>
              <p className="text-sm text-green-600">Presenteados</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Lista de Presentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!products || products.length === 0) ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum produto adicionado à lista ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product: Product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      product.status === "available"
                        ? "border-gray-200 hover:border-pink-300 bg-white cursor-pointer"
                        : product.status === "reserved"