import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baby, Gift, Share2, Users, Wallet, Package, Plus, Copy, Check, Link, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ManageEvent() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  const event = data?.event;
  const publicUrl = event?.publicLink || `${window.location.origin}/cha-de-bebe/${event?.eventCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
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
                      <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{pkg.packageName}</p>
                          <p className="text-sm text-gray-500">R$ {pkg.price}</p>
                        </div>
                        <Badge variant={pkg.isActive ? "default" : "secondary"}>
                          {pkg.isActive ? "Ativo" : "Inativo"}
                        </Badge>
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
      </main>
    </div>
  );
}
