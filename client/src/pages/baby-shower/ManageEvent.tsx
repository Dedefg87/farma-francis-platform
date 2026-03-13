import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FarmaDashboardLayout } from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Share2, Users, Wallet, Package, Plus, Copy, Check, Link, ArrowLeft, MessageCircle, ImageIcon, Trash2, Settings, Heart, GripVertical, Baby, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function ManageEvent() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [babyName, setBabyName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  
  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localPackages, setLocalPackages] = useState<any[]>([]);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  
  const eventId = parseInt(id || "0");

  // Upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setUploadingImage(true);

    try {
      // Converter para base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);

        // Enviar para o servidor
        const response = await fetch('/api/baby-shower/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename: file.name }),
        });

        const data = await response.json();
        if (data.success && data.url) {
          setImageUrl(data.url);
          toast.success("Imagem enviada!");
        } else {
          throw new Error(data.error || "Erro no upload");
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erro ao enviar imagem");
      setUploadingImage(false);
    }
  };

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

  const updatePurchaseMutation = trpc.babyShower.updatePurchase.useMutation({
    onSuccess: () => {
      toast.success("Compra atualizada!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderPackagesMutation = trpc.babyShower.reorderPackages.useMutation({
    onSuccess: () => {
      toast.success("Ordem atualizada!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmPaymentMutation = trpc.babyShower.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado! Mensagem enviada aos pais.");
      refetch();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deletePackageMutation = trpc.babyShower.deletePackage.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetEventMutation = trpc.babyShower.resetEvent.useMutation({
    onSuccess: () => {
      toast.success("Contadores zerados! Recarregando...");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDeletePackage = (pkg: any) => {
    if (confirm(`Tem certeza que deseja excluir "${pkg.packageName}"?`)) {
      deletePackageMutation.mutate({ id: pkg.id });
    }
  };

  const handleResetEvent = () => {
    if (confirm("Tem certeza que deseja zerar todos os contadores? Isso não apagará o histórico de compras, apenas os valores atuais (carteira, convidados, fraldas, vendas).")) {
      resetEventMutation.mutate({ eventId });
    }
  };

  const event = data?.event;
  const publicUrl = event?.publicLink || `${window.location.origin}/cha-de-bebe/${event?.eventCode}`;

  // Atualizar estado quando dados carregarem
  useEffect(() => {
    if (event?.whatsappNumber) {
      setWhatsappNumber(event.whatsappNumber);
    }
    if (event?.babyName) {
      setBabyName(event.babyName);
    }
    if (event?.welcomeMessage) {
      setWelcomeMessage(event.welcomeMessage);
    }
  }, [event?.whatsappNumber, event?.babyName, event?.welcomeMessage]);
  
  // Sincronizar localPackages com dados do servidor
  useEffect(() => {
    if (data?.packages) {
      setLocalPackages(data.packages);
    }
  }, [data?.packages]);

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

  const handleSaveBabyName = () => {
    updateEventMutation.mutate({
      id: eventId,
      babyName: babyName || undefined,
    });
  };

  const handleSaveMessage = () => {
    updateEventMutation.mutate({
      id: eventId,
      welcomeMessage: welcomeMessage || undefined,
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

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Reorder locally for visual feedback
    const newPackages = [...localPackages];
    const draggedItem = newPackages[draggedIndex];
    newPackages.splice(draggedIndex, 1);
    newPackages.splice(index, 0, draggedItem);
    setLocalPackages(newPackages);
    setDraggedIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Save the new order to the server
    const packageIds = localPackages.map(p => p.id);
    reorderPackagesMutation.mutate({
      eventId,
      packageIds,
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
    <FarmaDashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header com botão voltar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/baby-shower")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Baby className="w-6 h-6 text-pink-500" />
              <span className="text-xl font-bold text-pink-600">Gerenciar Chá de Bebê</span>
            </div>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleResetEvent}
            disabled={resetEventMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {resetEventMutation.isPending ? "Zerando..." : "Zerar Contadores"}
          </Button>
        </div>

        <main>
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

        {/* Nome do Bebê */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-pink-500" />
              Nome do Bebê
            </CardTitle>
            <CardDescription>O nome do bebê aparecerá nas mensagens enviadas à farmácia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={babyName} 
                onChange={(e) => setBabyName(e.target.value)} 
                placeholder="Ex: Maria Clara"
                className="flex-1"
              />
              <Button onClick={handleSaveBabyName} disabled={updateEventMutation.isPending}>
                {updateEventMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mensagem para Convidados */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Mensagem para Convidados
            </CardTitle>
            <CardDescription>Uma mensagem carinhosa que aparecerá no topo da página do evento</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={welcomeMessage} 
              onChange={(e) => setWelcomeMessage(e.target.value)} 
              placeholder="Ex: Olá! Estamos muito felizes com a chegada do nosso bebê. Obrigado por fazer parte desse momento especial!"
              className="min-h-[100px]"
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-gray-500">
                {welcomeMessage.length} caracteres
              </p>
              <Button onClick={handleSaveMessage} disabled={updateEventMutation.isPending}>
                {updateEventMutation.isPending ? "Salvando..." : "Salvar Mensagem"}
              </Button>
            </div>
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
                {!localPackages?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto. Clique em "Add Produto" para adicionar.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <GripVertical className="w-3 h-3" />
                      Arraste os produtos para reordenar
                    </p>
                    {localPackages.map((pkg: any, index: number) => (
                      <div 
                        key={pkg.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDrop={handleDrop}
                        className={`flex items-center gap-4 p-3 bg-gray-50 rounded-lg cursor-move transition-all ${
                          draggedIndex === index ? "border-2 border-pink-300 bg-pink-50" : "border-2 border-transparent"
                        }`}
                      >
                        {/* Drag handle */}
                        <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePackage(pkg)}
                            disabled={deletePackageMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
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
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                        <div>
                          <p className="font-medium">{p.guestName}</p>
                          <p className="text-sm text-gray-500">R$ {p.amountPaid}</p>
                          {p.messageToParents && (
                            <p className="text-xs text-gray-400 italic">"{p.messageToParents}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={p.paymentStatus === "paid" ? "default" : "outline"}>
                            {p.paymentStatus === "paid" ? "Pago" : "Pendente"}
                          </Badge>
                          {p.paymentStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => confirmPaymentMutation.mutate({ purchaseId: p.id, paymentStatus: "paid" })}
                                disabled={confirmPaymentMutation.isPending}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (p.confirmationToken) {
                                    const link = `${window.location.origin}/api/confirm-payment/${p.confirmationToken}`;
                                    navigator.clipboard.writeText(link);
                                    toast.success("Link copiado!");
                                  } else {
                                    toast.error("Token não disponível");
                                  }
                                }}
                              >
                                Copiar Link
                              </Button>
                            </>
                          )}
                        </div>
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
                <Label>Imagem do Produto</Label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <p className="text-sm text-blue-500 mt-1">Enviando imagem...</p>}
                  </div>
                  {imagePreview && (
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <Input type="hidden" name="imageUrl" value={imageUrl} />
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
                <Button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600" disabled={createPackageMutation.isPending || uploadingImage}>
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
                <Label>Imagem do Produto</Label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <p className="text-sm text-blue-500 mt-1">Enviando imagem...</p>}
                  </div>
                  {(imagePreview || editingPackage?.imageUrl) && (
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={imagePreview || editingPackage?.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <Input type="hidden" name="imageUrl" value={imageUrl || editingPackage?.imageUrl || ""} />
              </div>
              <div>
                <Label>Preco (R$) *</Label>
                <Input name="price" type="number" step="0.01" defaultValue={editingPackage?.price} required />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingPackage(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-pink-500 hover:bg-pink-600" disabled={updatePackageMutation.isPending || uploadingImage}>
                  {updatePackageMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </main>
      </div>
    </FarmaDashboardLayout>
  );
}
