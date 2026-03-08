import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Baby, Gift, MessageCircle, Heart, Search, HandPointer, Star, Cloud } from "lucide-react";
import { toast } from "sonner";

export default function EventPage() {
  const { code } = useParams();
  const [showSuccess, setShowSuccess] = useState(false);

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
    // Criar registro de compra automaticamente
    createPurchaseMutation.mutate({
      eventId: event?.id,
      packageId: pkg.id,
      guestName: "Convidado via WhatsApp", // Nome temporário
      amountPaid: parseFloat(pkg.price || "0"),
      paymentStatus: "pending",
    });

    const messageText = `Olá! Gostaria de presentear com ${pkg.packageName}${pkg.description ? ` (${pkg.description})` : ''} da lista de chá de bebé da Farma Francis.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Produtos padrão se não houver pacotes cadastrados
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
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <style>{`
        * { font-family: 'Poppins', sans-serif; }
        
        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 0;
        }
        
        .cloud {
          position: absolute;
          background: rgba(255,255,255,0.9);
          border-radius: 100px;
          animation: float 20s infinite ease-in-out;
        }
        
        .cloud-1 { width: 200px; height: 60px; top: 10%; left: -100px; animation-delay: 0s; }
        .cloud-2 { width: 150px; height: 45px; top: 30%; right: -80px; animation-delay: -10s; }
        
        @keyframes float {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(30px) translateY(-20px); }
        }
        
        .star {
          position: absolute;
          color: #FFD700;
          font-size: 24px;
          animation: twinkle 3s infinite ease-in-out;
        }
        
        .star-1 { top: 15%; left: 20%; animation-delay: 0s; }
        .star-2 { top: 25%; right: 25%; animation-delay: 1s; }
        .star-3 { top: 45%; left: 30%; animation-delay: 2s; }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .product-card {
          transition: all 0.3s ease;
        }
        
        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(123, 104, 238, 0.2);
        }
        
        .btn-presentear {
          background: linear-gradient(135deg, #25D366, #128C7E);
          transition: all 0.3s ease;
        }
        
        .btn-presentear:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 211, 102, 0.4);
        }
      `}</style>

      <div className="min-h-screen bg-[#F8F9FA]">
        {/* Header */}
        <header className="bg-white shadow-sm py-4 sticky top-0 z-50">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <a href="#" className="flex items-center gap-2 no-underline">
              <img 
                src="/farma-francis-logo.png" 
                alt="Farma Francis" 
                className="h-10 md:h-12 w-auto object-contain"
              />
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#inicio" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Início</a>
              <a href="#como-funciona" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Como Funciona</a>
              <a href="#presentes" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Presentes</a>
              <a href="#contato" className="text-[#4A5568] hover:text-[#7B68EE] no-underline font-medium">Contato</a>
            </nav>
            <button className="md:hidden text-[#4A5568]">
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-b from-[#E8F4F8] via-[#F0E6F6] to-[#F8F9FA] overflow-hidden" id="inicio">
          <div className="hero-bg">
            <div className="cloud cloud-1"></div>
            <div className="cloud cloud-2"></div>
            <div className="star star-1">★</div>
            <div className="star star-2">★</div>
            <div className="star star-3">★</div>
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="text-6xl mb-4">🍼</div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#2D3748] mb-3">
              {event?.eventName || "Chá de Bebê Farma Francis"}
            </h1>
            <h2 className="text-xl md:text-2xl text-[#7B68EE] font-medium mb-4">
              Presenteie com Amor e Praticidade
            </h2>
            
            {/* Mensagem personalizada da mamãe */}
            {event?.welcomeMessage && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto mb-8 shadow-lg border-2 border-pink-100">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span className="text-sm font-medium text-pink-500 uppercase tracking-wide">Mensagem da Mamãe</span>
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-[#4A5568] leading-relaxed text-lg italic text-center">
                  "{event.welcomeMessage}"
                </p>
              </div>
            )}
            
            {!event?.welcomeMessage && (
              <p className="text-[#4A5568] max-w-2xl mx-auto mb-8 leading-relaxed">
                Uma seleção especial de produtos para acolher o novo membro da família. 
                Escolha seu presente e facilitamos a compra pelo WhatsApp!
              </p>
            )}
            {event?.expectedDueDate && (
              <p className="text-sm text-[#718096] mb-6">
                Data prevista: {new Date(event.expectedDueDate).toLocaleDateString('pt-BR')}
              </p>
            )}
            <a href="#presentes" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA] text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all no-underline">
              <i className="fas fa-gift"></i> Ver Lista de Presentes
            </a>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-16 bg-white" id="como-funciona">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-[#E8F4F8] text-[#7B68EE] px-4 py-1 rounded-full text-sm font-medium mb-3">
                simples e rápido
              </span>
              <h2 className="text-3xl font-bold text-[#2D3748] mb-3">Como Funciona</h2>
              <p className="text-[#4A5568]">Presentear nunca foi tão fácil! Siga estes 3 passos:</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#7B68EE] text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-3xl text-[#7B68EE]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-2">Escolha o presente</h3>
                <p className="text-[#4A5568] text-sm">Navegue pela nossa lista e encontre o presente perfeito para o baby.</p>
              </div>
              <div className="text-center relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#7B68EE] text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-hand-pointer text-3xl text-[#7B68EE]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-2">Clique em Presentear</h3>
                <p className="text-[#4A5568] text-sm">Selecione o produto desejado e clique no botão para iniciar a compra.</p>
              </div>
              <div className="text-center relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#7B68EE] text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
                <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fab fa-whatsapp text-3xl text-[#25D366]"></i>
                </div>
                <h3 className="font-semibold text-[#2D3748] mb-2">Finalize no WhatsApp</h3>
                <p className="text-[#4A5568] text-sm">Um atendente humano vai te ajudar a finalizar a compra de forma rápida.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Lista de Presentes */}
        <section className="py-16 bg-gradient-to-b from-[#F8F9FA] to-[#E8F4F8]" id="presentes">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-[#F0E6F6] text-[#7B68EE] px-4 py-1 rounded-full text-sm font-medium mb-3">
                Para o baby
              </span>
              <h2 className="text-3xl font-bold text-[#2D3748] mb-3">Lista de Presentes</h2>
              <p className="text-[#4A5568]">Escolha entre nossa seleção de produtos essenciais para o recém-nascido:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayProducts.map((pkg: any) => (
                <div key={pkg.id} className="product-card bg-white rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-gradient-to-br from-[#E8F4F8] to-[#F0E6F6] p-8 flex items-center justify-center">
                    {pkg.imageUrl ? (
                      <img src={pkg.imageUrl} alt={pkg.packageName} className="w-20 h-20 object-contain" />
                    ) : (
                      <i className={`fas ${pkg.icon || 'fa-gift'} text-5xl text-[#7B68EE]`}></i>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="font-semibold text-[#2D3748] mb-1">{pkg.packageName}</h3>
                    <p className="text-sm text-[#718096] mb-3">{pkg.description || pkg.sizeLabel}</p>
                    {pkg.price && (
                      <p className="text-lg font-bold text-[#7B68EE] mb-3">R$ {pkg.price}</p>
                    )}
                    <button 
                      onClick={() => handleWhatsAppRedirect(pkg)}
                      className="btn-presentear w-full inline-flex items-center justify-center gap-2 text-white px-4 py-3 rounded-xl font-medium"
                    >
                      <i className="fab fa-whatsapp text-lg"></i> Presentear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-[#7B68EE] to-[#9F7AEA]">
          <div className="container mx-auto px-4 text-center text-white">
            <i className="fas fa-heart text-4xl mb-4 opacity-80"></i>
            <h2 className="text-3xl font-bold mb-3">Obrigado por presentear com amor!</h2>
            <p className="opacity-90 mb-6 max-w-xl mx-auto">Cada presente torna a chegada do baby ainda mais especial.</p>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=Olá! Gostaria de saber mais sobre a lista de chá de bebé da Farma Francis.`}
              target="_blank"
              className="inline-flex items-center gap-2 bg-white text-[#7B68EE] px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all no-underline"
            >
              <i className="fab fa-whatsapp text-xl"></i> Falar com a Farmácia
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#2D3748] text-white py-12" id="contato">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <img 
                src="/farma-francis-logo.png" 
                alt="Farma Francis" 
                className="h-14 w-auto object-contain bg-white rounded p-1"
              />
            </div>
            <p className="text-[#A0AEC0] mb-6">Cuidando da sua família com amor e dedicação</p>
            <div className="flex justify-center gap-6 mb-6">
              <a href="#" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-instagram text-2xl"></i>
              </a>
              <a href="#" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-facebook text-2xl"></i>
              </a>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" className="text-[#A0AEC0] hover:text-white transition-colors">
                <i className="fab fa-whatsapp text-2xl"></i>
              </a>
            </div>
            <p className="text-sm text-[#718096]">
              © 2024 Farma Francis. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
