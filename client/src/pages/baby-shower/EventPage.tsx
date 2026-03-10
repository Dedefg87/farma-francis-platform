import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Baby, Gift, MessageCircle, Heart, Search, HandPointer, Star, Cloud, X } from "lucide-react";
import { toast } from "sonner";

export default function EventPage() {
  const { code } = useParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");

  const { data: eventData, isLoading } = trpc.babyShower.getEventByCode.useQuery({ code: code || "" });

  const createPurchaseMutation = trpc.babyShower.createPurchase.useMutation({
    onSuccess: () => {
      toast.success("Presente registrado!");
    },
    onError: (err) => {
      toast.error("Erro ao registrar: " + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#E8F4F8] to-[#F0E6F6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B68EE]" />
      </div>
    );
  }

  const event = eventData?.event;
  const packages = eventData?.packages || [];
  const whatsappNumber = event?.whatsappNumber || "5531995657081";

  const handleWhatsAppRedirect = (pkg: any) => {
    setSelectedPackage(pkg);
    setShowMessageModal(true);
    // Limpar campos anteriores
    setGuestName("");
    setGuestMessage("");
  };

  const handleSubmitMessage = () => {
    if (!guestName.trim()) {
      toast.error("Digite seu nome");
      return;
    }
    if (!selectedPackage) return;

    createPurchaseMutation.mutate({
      eventId: event?.id,
      packageId: selectedPackage.id,
      guestName: guestName.trim(),
      amountPaid: parseFloat(selectedPackage.price || "0"),
      paymentStatus: "pending",
      messageToParents: guestMessage.trim() || undefined,
    }, {
      onSuccess: () => {
        setShowMessageModal(false);
        setSelectedPackage(null);
        // Abrir WhatsApp da farmácia
        const eventName = event?.eventName || "Chá de Bebê";
        const babyName = event?.babyName;
        const targetName = babyName || eventName;
        const messageText = `Olá! Gostaria de presentear com ${selectedPackage.packageName}${selectedPackage.description ? ` (Contém: ${selectedPackage.description})` : ''} da lista de chá de fraldas do ${targetName}.`;
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');
        toast.success("Pedido enviado! Complete a compra no WhatsApp.");
      },
    });
  };

  const defaultProducts = [
    { id: 1, packageName: "Fraldas Pampers Premium", description: "Kit Tam. G (48 unidades)", price: "189.90", icon: "fa-baby" },
    { id: 2, packageName: "Fraldas Huggies Ultra", description: "Kit Tam. M (48 unidades)", price: "179.90", icon: "fa-baby" },
    { id: 3, packageName: "Lenços Umedecidos", description: "Pacote com 6 rolos - Huggies", price: "89.90", icon: "fa-hand-holding-water" },
    { id: 4, packageName: "Pomada Preventiva", description: "Bepantol Baby - 30g", price: "45.90", icon: "fa-pump-soap" },
    { id: 5, packageName: "Kit Higiene Baby", description: "(Tesoura, Escova, Cortador)", price: "79.90", icon: "fa-spray-can" },
    { id: 6, packageName: "Shampoo Johnson Baby", description: "200ml (livre de lágrimas)", price: "32.90", icon: "fa-pump-soap" },
    { id: 7, packageName: "Sabonete Líquido Baby", description: "Granado Baby - 200ml", price: "38.90", icon: "fa-soap" },
    { id: 8, packageName: "Kit Mamadeira + Chupeta", description: "(2 mamadeiras + 2 chupetas)", price: "129.90", icon: "fa-baby-carriage" },
  ];

  const displayProducts = packages.length > 0 ? packages : defaultProducts;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <style>{`
        * { font-family: 'Poppins', sans-serif; }

        .product-card { transition: all 0.3s ease; }
        .product-card:active { transform: scale(0.98); }

        @media (hover: hover) {
          .product-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(123, 104, 238, 0.2);
          }
        }

        .btn-presentear {
          background: linear-gradient(135deg, #25D366, #128C7E);
          transition: all 0.3s ease;
        }

        .btn-presentear:active { transform: scale(0.95); }

        @media (hover: hover) {
          .btn-presentear:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 211, 102, 0.4);
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#F8F9FA]">
        {/* Header - Mobile Friendly */}
        <header className="bg-white shadow-sm py-2 md:py-4 sticky top-0 z-50">
          <div className="container mx-auto px-3 md:px-4 flex items-center justify-between">
            <img
              src="/farma-francis-logo.png"
              alt="Farma Francis"
              className="h-8 md:h-12 w-auto object-contain"
            />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#inicio" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Início</a>
              <a href="#como-funciona" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Como Funciona</a>
              <a href="#presentes" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Presentes</a>
              <a href="#contato" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Contato</a>
            </nav>
            <a href="#presentes" className="md:hidden bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA] text-white px-3 py-1.5 rounded-full text-xs font-medium no-underline">
              Presentes
            </a>
          </div>
        </header>

        {/* Hero - Mobile Friendly */}
        <section className="relative py-8 md:py-20 bg-gradient-to-b from-[#E8F4F8] via-[#F0E6F6] to-[#F8F9FA] overflow-hidden" id="inicio">
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="text-4xl md:text-6xl mb-2 md:mb-4">🍼</div>
            <h1 className="text-xl md:text-5xl font-bold text-[#2D3748] mb-2 md:mb-3 px-2 leading-tight">
              {event?.eventName || "Chá de Bebê Farma Francis"}
            </h1>
            <h2 className="text-base md:text-2xl text-[#7B68EE] font-medium mb-3 md:mb-4">
              Presenteie com Amor e Praticidade
            </h2>

            {event?.welcomeMessage && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl mx-auto mb-4 md:mb-8 shadow-lg border-2 border-pink-100">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-xs font-medium text-pink-500 uppercase tracking-wide">Mensagem da Mamãe</span>
                  <Heart className="w-4 h-4 text-pink-400" />
                </div>
                <p className="text-[#4A5568] leading-relaxed text-sm md:text-lg italic text-center">
                  "{event.welcomeMessage}"
                </p>
              </div>
            )}

            {!event?.welcomeMessage && (
              <p className="text-[#4A5568] max-w-2xl mx-auto mb-4 md:mb-8 leading-relaxed text-sm md:text-base px-2">
                Uma seleção especial de produtos para acolher o novo membro da família.
                Escolha seu presente e facilitamos a compra pelo WhatsApp!
              </p>
            )}

            {event?.expectedDueDate && (
              <p className="text-xs md:text-sm text-[#718096] mb-3 md:mb-6">
                Data prevista: {new Date(event.expectedDueDate).toLocaleDateString('pt-BR')}
              </p>
            )}

            <a href="#presentes" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA] text-white px-5 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-lg shadow-lg hover:shadow-xl transition-all no-underline">
              <i className="fas fa-gift"></i> Ver Lista de Presentes
            </a>
          </div>
        </section>

        {/* Como Funciona - Mobile Friendly */}
        <section className="py-8 md:py-16 bg-white" id="como-funciona">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6 md:mb-12">
              <span className="inline-block bg-[#E8F4F8] text-[#7B68EE] px-3 py-1 rounded-full text-xs font-medium mb-2">
                simples e rápido
              </span>
              <h2 className="text-xl md:text-3xl font-bold text-[#2D3748] mb-2">Como Funciona</h2>
              <p className="text-[#4A5568] text-sm">Presentear nunca foi tão fácil!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-search text-xl md:text-3xl text-[#7B68EE]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-1 text-sm md:text-base">1. Escolha o presente</h3>
                <p className="text-[#4A5568] text-xs md:text-sm">Navegue pela lista e encontre o presente perfeito.</p>
              </div>
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-hand-pointer text-xl md:text-3xl text-[#7B68EE]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-1 text-sm md:text-base">2. Clique em Presentear</h3>
                <p className="text-[#4A5568] text-xs md:text-sm">Clique no botão para iniciar a compra.</p>
              </div>
              <div className="text-center bg-gray-50 rounded-xl p-4">
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fab fa-whatsapp text-xl md:text-3xl text-[#25D366]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-1 text-sm md:text-base">3. Finalize no WhatsApp</h3>
                <p className="text-[#4A5568] text-xs md:text-sm">Um atendente vai te ajudar a finalizar.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Lista de Presentes - Mobile Friendly */}
        <section className="py-8 md:py-16 bg-gradient-to-b from-[#F8F9FA] to-[#E8F4F8]" id="presentes">
          <div className="container mx-auto px-3 md:px-4">
            <div className="text-center mb-6 md:mb-12">
              <span className="inline-block bg-[#F0E6F6] text-[#7B68EE] px-3 py-1 rounded-full text-xs font-medium mb-2">
                Para o baby
              </span>
              <h2 className="text-xl md:text-3xl font-bold text-[#2D3748] mb-2">Lista de Presentes</h2>
              <p className="text-[#4A5568] text-sm">Escolha entre nossa seleção de produtos:</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {displayProducts.map((pkg: any) => (
                <div key={pkg.id} className="product-card bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-md md:shadow-lg">
                  <div
                    className={`bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] p-2 md:p-4 flex items-center justify-center aspect-square ${pkg.imageUrl ? 'cursor-pointer' : ''}`}
                    onClick={() => pkg.imageUrl && setSelectedImage({ url: pkg.imageUrl, name: pkg.packageName })}
                  >
                    {pkg.imageUrl ? (
                      <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-contain hover:scale-105 transition-transform p-2" />
                    ) : (
                      <i className={`fas ${pkg.icon || 'fa-gift'} text-3xl md:text-6xl text-[#7B68EE]`}></i>
                    )}
                  </div>
                  <div className="p-2 md:p-4 text-center">
                    <h3 className="font-semibold text-[#2D3748] text-xs md:text-sm mb-0.5 md:mb-1 line-clamp-2">{pkg.packageName}</h3>
                    <p className="text-xs text-[#718096] mb-1 md:mb-2 line-clamp-1">{pkg.description || pkg.sizeLabel}</p>
                    {pkg.price && (
                      <p className="text-sm md:text-lg font-bold text-[#7B68EE] mb-1 md:mb-2">R$ {pkg.price}</p>
                    )}
                    <button
                      onClick={() => handleWhatsAppRedirect(pkg)}
                      className="btn-presentear w-full inline-flex items-center justify-center gap-1 md:gap-2 text-white px-2 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-medium text-xs md:text-sm"
                    >
                      <i className="fab fa-whatsapp text-sm md:text-lg"></i>
                      <span className="hidden sm:inline">Presentear</span>
                      <span className="sm:hidden">Presentear</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 md:py-16 bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA]">
          <div className="container mx-auto px-4 text-center text-white">
            <i className="fas fa-heart text-2xl md:text-4xl mb-3 opacity-80"></i>
            <h2 className="text-xl md:text-3xl font-bold mb-2">Obrigado por presentear com amor!</h2>
            <p className="opacity-90 mb-4 md:mb-6 max-w-xl mx-auto text-sm md:text-base">Cada presente torna a chegada do baby ainda mais especial.</p>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Olá! Gostaria de saber mais sobre a lista de chá de bebé da Farma Francis.`}
              target="_blank"
              className="inline-flex items-center gap-2 bg-white text-[#7B68EE] px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-base shadow-lg hover:shadow-xl transition-all no-underline"
            >
              <i className="fab fa-whatsapp text-lg md:text-xl"></i> Falar com a Farmácia
            </a>
          </div>
        </section>

        {/* Footer - Mobile Friendly */}
        <footer className="bg-[#2D3748] text-white py-8 md:py-12" id="contato">
          <div className="container mx-auto px-4 text-center">
            <img
              src="/farma-francis-logo.png"
              alt="Farma Francis"
              className="h-10 md:h-14 w-auto object-contain bg-white rounded p-1 mx-auto mb-2 md:mb-3"
            />
            <p className="text-[#A0AEC0] mb-4 md:mb-6 text-sm">Cuidando da sua família com amor e dedicação</p>
            <div className="flex justify-center gap-4 md:gap-6 mb-4 md:mb-6">
              <a href="#" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-instagram text-lg md:text-2xl"></i>
              </a>
              <a href="#" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-facebook text-lg md:text-2xl"></i>
              </a>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-whatsapp text-lg md:text-2xl"></i>
              </a>
            </div>
            <p className="text-xs text-[#718096]">
              © 2024 Farma Francis. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] p-6 md:p-10 flex items-center justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
            <div className="p-4 text-center bg-white">
              <h3 className="font-semibold text-[#2D3748] text-base md:text-lg">{selectedImage.name}</h3>
              <p className="text-sm text-[#718096] mt-1">Clique fora para fechar</p>
            </div>
          </div>
        </div>
      )}

      {/* Message to Parents Modal */}
      {showMessageModal && selectedPackage && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[#2D3748] mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Mensagem para os pais
            </h3>
            <p className="text-sm text-[#718096] mb-4">
              Deixe uma mensagem carinhosa para a mamãe e o papai. Ela será enviada após a confirmação do pagamento.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">Seu nome</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B68EE] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">Mensagem (opcional)</label>
                <textarea
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Ex: Que o bebê seja muito abençoado! Estamos felizes em participar desse momento especial."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B68EE] focus:border-transparent min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMessageModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitMessage}
                disabled={createPurchaseMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA] hover:from-[#6B5BC7] hover:to-[#8F6AE6] text-white"
              >
                {createPurchaseMutation.isPending ? "Enviando..." : "Enviar Presente"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
