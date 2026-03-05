import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Gift, Plus, Users, Wallet, Calendar, Package, ExternalLink, Copy, Check, 
  Search, Trash2, QrCode, CheckCircle, Clock, XCircle, Baby 
} from "lucide-react";
import { toast } from "sonner";

interface EventProduct {
  id: number;
  productName: string;
  price: string;
  quantity: number;
  status: "available" | "purchased" | "reserved";
  guestName: string | null;
  messageToParents: string | null;
  createdAt: string;
}

export default function BabyShowerEvents() {
  const [showCreate, setShowCreate] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showMarkPurchased, setShowMarkPurchased] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EventProduct | null>(null);
  const [formData, setFormData] = useState({
    motherCustomerId: "",
    eventName: "",
    expectedDueDate: "",
    eventDate: "",
    targetAmount: "",
  });
  const [productForm, setProductForm] = useState({
    productName: "",
    price: "",
    quantity: "1",
  });
  const [atendenteName, setAtendenteName] = useState("");

  const { data: events, isLoading, refetch } = trpc.babyShower.listEvents.useQuery(
    { status: "active", limit: 50 },
    { enabled: true }
  );

  const createMutation = trpc.babyShower.createEvent.useMutation({
    onSuccess: (data) => {
      toast.success("Evento criado com sucesso!");
      setShowCreate(false);
      setFormData({ motherCustomerId: "", eventName: "", expectedDueDate: "", eventDate: "", targetAmount: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const addProductMutation = trpc.babyShower.addEventProduct.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado!");
      setProductForm({ productName: "", price: "", quantity: "1" });
      // Refetch products for the selected event
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const markPurchasedMutation = trpc.babyShower.markProductAsPurchased.useMutation({
    onSuccess: () => {
      toast.success("Produto marcado como comprado! Notificação enviada para os pais.");
      setShowMarkPurchased(false);
      setAtendenteName("");
      setSelectedProduct(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.motherCustomerId || !formData.eventName) {
      toast.error("Preencha ID da mãe e nome do evento");
      return;
    }
    createMutation.mutate({
      motherCustomerId: parseInt(formData.motherCustomerId),
      eventName: formData.eventName,
      expectedDueDate: formData.expectedDueDate || undefined,
      eventDate: formData.eventDate || undefined,
      targetAmount: formData.targetAmount ? parseFloat(formData.targetAmount) : undefined,
    });
  };

  const handleAddProduct = () => {
    if (!selectedEvent || !productForm.productName || !productForm.price) {
      toast.error("Preencha nome e preço do produto");
      return;
    }
    addProductMutation.mutate({
      eventId: selectedEvent.event.id,
      productName: productForm.productName,
      price: parseFloat(productForm.price),
      quantity: parseInt(productForm.quantity) || 1,
    });
  };

  const handleMarkPurchased = () => {
    if (!selectedProduct || !atendenteName.trim()) {
      toast.error("Informe seu nome como atendente");
      return;
    }
    markPurchasedMutation.mutate({
      productId: selectedProduct.id,
      purchasedBy: atendenteName.trim(),
    });
  };

  const openProductsModal = (event: any) => {
    setSelectedEvent(event);
    setShowProducts(true);
  };

  const openMarkPurchasedModal = (product: EventProduct) => {
    if (product.status === "purchased") {
      toast.info("Este produto já foi marcado como comprado");
      return;
    }
    setSelectedProduct(product);
    setShowMarkPurchased(true);
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-700">Disponível</Badge>;
      case "reserved":
        return <Badge className="bg-yellow-100 text-yellow-700">Reservado</Badge>;
      case "purchased":
        return <Badge className="bg-blue-100 text-blue-700">Comprado</Badge>;
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <Package className="w-4 h-4 text-green-500" />;
      case "reserved":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "purchased":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Baby className="w-8 h-8 text-pink-500" />
              Chá de Bebê Farma Francis
            </h1>
            <p className="text-gray-500 mt-2">Gerencie eventos de presentes</p>
          </div>
          <Button className="bg-pink-500 hover:bg-pink-600" onClick={() => setShowCreat onclick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2