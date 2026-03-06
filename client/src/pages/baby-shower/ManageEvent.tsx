import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baby, Gift, Share2, Users, Wallet, Package, Plus, Copy, Check, Link, ArrowLeft, MessageCircle, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ManageEvent() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");
  
  const eventId = parseInt(id || "0");

  const { data, refetch } = trpc.babyShower.getEventById.useQuery(
    { id: eventId },
    { enabled: eventId > 0 }
  );

  const createPackageMutation = trpc.babyShower.createPackage.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado!");
      setShowAddProduct(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateEventMutation = trpc.babyShower.updateEvent.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp atualizado!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePackageMutation = trpc.babyShower.updatePackage.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado!");
      setEditingPackage(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const event = data?.event;
  const publicUrl = event?.publicLink || `${window.location.origin}/cha-de-bebe/${event?.eventCode}`;

  // Atualizar estado quando dados carregarem
  useEffect(() => {
    if (event?.whatsappNumber) {
      setWhatsappNumber(event.whatsappNumber);
    }
  }, [event?.whatsappNumber]);

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWhatsapp = () => {
    updateEventMutation.mutate({
      id: eventId,
      whatsappNumber: whatsappNumber || undefined,
    });
  };

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPackageMutation.mutate({
      eventId,
      packageName: formData.get("name") as string,
      description: formData.get("description") as string,
      giftType: "diapers",
      price: parseFloat(formData.get("price") as string),
      quantityRepresented: parseInt(formData.get("quantity") as string) || 1,
      stockLimit: parseInt(formData.get("stock") as string) || undefined,
      imageUrl: formData.get("imageUrl") as string || undefined,
    });
  };

  const handleUpdateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updatePackageMutation.mutate({
      id: editingPackage.id,
      packageName: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseFloat(formData.get("price") as string),
      imageUrl: formData.get("imageUrl") as string || undefined,
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Baby className="w-6 h-6 text-pink-500" />
              <span className="text-xl font-bold text-pink-600">Gerenciar Cha de Bebe</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Arrecadado</p>
                  <p className="text-2xl font-bold">R$ {event?.walletBalance || "0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Presentes</p>
                  <p className="text-2xl font-bold">{event?.totalGuests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Fraldas</p>
                  <p className="text-2xl font-bold">{event?.totalDiapersCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Disponiveis</p>
                  <p className="text-2xl font-bold">{event?.availableDiapersCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Link de Compartilhamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Link para Convidados
            </CardTitle>
            <CardDescription>Compartilhe este link com seus convidados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="flex-1" />
              <Button onClick={copyLink} variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp para Contato
            </CardTitle>
            <CardDescription>Este número receberá as mensagens dos convidados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={whatsappNumber} 
                onChange={(e) => setWhatsappNumber(e.target.value)} 
                placeholder="Ex: 5531986337081"
                className="flex-1"
              />
              <Button onClick={handleSaveWhatsapp} disabled={updateEventMutation.isPending}>
                {updateEventMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Digite o número com código do país (55) e DDD, sem espaços ou caracteres especiais.
            </p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="gifts">Presentes</TabsTrigger>
            <TabsTrigger value="withdrawals">Retiradas</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Produtos do Evento</CardTitle>
                <Button size="sm" onClick={() => setShowAddProduct(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Produto
                </Button>
              </CardHeader>
              <CardContent>
                {!data.packages?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto. Clique em "Add Produto" para adicionar.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.packages.map((pkg: any) => (
                      <div key={pkg.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {/* Imagem do produto */}
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {pkg.imageUrl ? (
                            <img src={pkg.imageUrl} alt={pkg.packageName} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{pkg.packageName}</p>
                          <p className="text-sm text-gray-500">R$ {pkg.price}</p>
                          {pkg.imageUrl && (
                            <p className="text-xs text-gray-400 truncate">{pkg.imageUrl.substring(0, 40)}...</p>
                          )}
                        </div>
                        {/* Status e ações */}
                        <div className="flex items-center gap-2">
                          <Badge variant={pkg.isActive ? "default" : "secondary"}>
                            {pkg.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingPackage(pkg)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gifts">
            <Card>
              <CardHeader>
                <CardTitle>Presentes Recebidos</CardTitle>
              </CardHeader>
              <CardContent>
                {!data.purchases?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum presente recebido ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.purchases.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{p.guestName}</p>
                          <p className="text-sm text-gray-500">R$ {p.amountPaid}</p>
                          {p.messageToParents && (
                            <p className="text-xs text-gray-400 italic">"{p.messageToParents}"</p>
                          )}
                        </div>
                        <Badge variant={p.paymentStatus === "paid" ? "default" : "outline"}>
                          {p.paymentStatus === "paid" ? "Pago" : "Pendente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Retiradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Funcionalidade em desenvolvimento.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Add Product */}
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4 pt-4">
              <div>
                <Label>Nome do Produto *</Label>
                <Input name="name" placeholder="Ex: Pacote Fraldas P" required />
              </div>
              <div>
                <Label>Descricao</Label>
                <Input name="description" placeholder="Ex: 20 unidades tamanho P" />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input name="imageUrl" placeholder="https://exemplo.com/imagem.jpg" />
                <p className="text-xs text-gray-500 mt-1">Cole a URL de uma imagem ou faça upload em um serviço como Imgur</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preco (R$) *</Label>
                  <Input name="price" type="number" step="0.01" placeholder="85.00" required />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input name="quantity" type="number" placeholder="20" />
                </div>
              </div>
              <div>
                <Label>Limite de Estoque</Label>
                <Input name="stock" type="number" placeholder="Ilimitado" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddProduct(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600" disabled={createPackageMutation.isPending}>
                  {createPackageMutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Product */}
        <Dialog open={!!editingPackage} onOpenChange={() => setEditingPackage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProduct} className="space-y-4 pt-4">
              <div>
                <Label>Nome do Produto *</Label>
                <Input name="name" defaultValue={editingPackage?.packageName} required />
              </div>
              <div>
                <Label>Descricao</Label>
                <Input name="description" defaultValue={editingPackage?.description} />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input name="imageUrl" defaultValue={editingPackage?.imageUrl} placeholder="https://exemplo.com/imagem.jpg" />
                {editingPackage?.imageUrl && (
                  <div className="mt-2 w-20 h-20 bg-gray-100 rounded overflow-hidden">
                    <img src={editingPackage.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <Label>Preco (R$) *</Label>
                <Input name="price" type="number" step="0.01" defaultValue={editingPackage?.price} required />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingPackage(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600" disabled={updatePackageMutation.isPending}>
                  {updatePackageMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
