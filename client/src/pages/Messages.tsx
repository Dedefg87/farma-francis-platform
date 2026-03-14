import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getImageSrc(
  url: string | null | undefined,
  messageId?: number
): string {
  if (!url) return "";

  // Se já for data URL, retornar direto
  if (url.startsWith?.("data:")) {
    return url;
  }

  // Se for URL absoluta (http/https), usar como está
  if (url.startsWith?.("http")) {
    return url;
  }

  // Se for caminho relativo (ex: "whatsapp/imagem123.jpg"), usar PUBLIC_R2_URL
  const r2Base = import.meta.env.VITE_PUBLIC_R2_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev";
  const cleanUrl = url.replace(/^\//, "");
  return `${r2Base.replace(/\/$/, "")}/${cleanUrl}`;
}

function handleImageClick(url: string | null | undefined, messageId?: number) {
  const src = getImageSrc(url, messageId);
  if (!src) return;

  if (src?.startsWith?.("data:")) {
    const win = window.open("", "_blank", "width=800,height=600");
    if (win) {
      win.document.write(
        `<html><head><title>Imagem</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body></html>`
      );
      win.document.close();
    }
  } else {
    window.open(src, "_blank");
  }
}
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Instagram,
  Settings,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  StickyNote,
  User,
  Mail,
  Lightbulb,
  ChevronRight,
  Building,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { SoundSelector } from "@/components/SoundSelector";

export default function Messages() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<
    number | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "notes" | "internal">(
    "messages"
  );
  const [internalNote, setInternalNote] = useState("");
  const [internalMessageInput, setInternalMessageInput] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Buscar conversas reais
  const { data: conversations, isLoading: loadingConversations } =
    trpc.conversations.listActive.useQuery();

  // Buscar mensagens da conversa selecionada
  const { data: messages, isLoading: loadingMessages } =
    trpc.messages.list.useQuery(
      { conversation_id: selectedConversation || 0 },
      { enabled: selectedConversation !== null }
    );

  // Buscar mensagens internas da conversa selecionada
  const { data: internalMessages, isLoading: loadingInternalMessages } =
    trpc.internalMessages.list.useQuery(
      { conversation_id: selectedConversation || 0 },
      { enabled: selectedConversation !== null && activeTab === "internal" }
    );

  // Buscar detalhes do cliente quando uma conversa é selecionada
  const selectedConversationData = conversations?.find(
    c => c.id === selectedConversation
  );

  const { data: customerDetails } = trpc.customers.getById.useQuery(
    { id: selectedConversationData?.customerId || 0 },
    {
      enabled:
        selectedConversation !== null &&
        !!selectedConversationData?.customerId &&
        isProfileOpen,
    }
  );

  const filteredConversations =
    conversations?.filter(
      conv =>
        (conv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false) ||
        (conv.customerPhone?.includes(searchQuery) ?? false)
    ) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 16MB)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 16MB");
      return;
    }
    // Infer MIME type from extension; do not block other types
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    let inferredMime = file.type || "";
    if (!inferredMime) {
      switch (ext) {
        case "jpg":
        case "jpeg":
          inferredMime = "image/jpeg";
          break;
        case "png":
          inferredMime = "image/png";
          break;
        case "gif":
          inferredMime = "image/gif";
          break;
        case "webp":
          inferredMime = "image/webp";
          break;
        case "pdf":
          inferredMime = "application/pdf";
          break;
        case "doc":
          inferredMime = "application/msword";
          break;
        case "docx":
          inferredMime =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case "txt":
          inferredMime = "text/plain";
          break;
        case "mp4":
          inferredMime = "video/mp4";
          break;
        case "mov":
          inferredMime = "video/quicktime";
          break;
        case "webm":
          inferredMime = "video/webm";
          break;
        default:
          inferredMime = "application/octet-stream";
      }
    }
    // Accept any file type up to size limit
    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type?.startsWith?.("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      setMessageInput("");
      setSelectedFile(null);
      setFilePreview(null);
    },
    onError: error => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const uploadFileMutation = trpc.messages.uploadFile.useMutation({
    onError: error => {
      toast.error(`Erro ao fazer upload: ${error.message}`);
    },
  });

  const sendInternalMessageMutation = trpc.internalMessages.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem interna enviada!");
      setInternalMessageInput("");
    },
    onError: error => {
      toast.error(`Erro ao enviar mensagem interna: ${error.message}`);
    },
  });

  const handleSendMessage = async () => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }
    if (!messageInput.trim() && !selectedFile) return;

    let fileData: {
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    } = {};

    if (selectedFile) {
      try {
        setIsUploading(true);
        const base64Promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const base64Data = await base64Promise;

        const uploadResult = await uploadFileMutation.mutateAsync({
          conversation_id: selectedConversation,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileData: base64Data,
        });

        fileData = {
          fileUrl: uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
          fileSize: uploadResult.fileSize,
        };
      } catch (error) {
        console.error("Erro ao fazer upload:", error);
        setIsUploading(false);
        return;
      }
    }

    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      content: messageInput,
      ...fileData,
      viewOnce: isViewOnce && selectedFile ? true : false,
    });

    setIsUploading(false);
  };

  const handleSendInternalMessage = () => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }
    if (!internalMessageInput.trim()) return;
    if (!selectedConversationData?.assignedTo) {
      toast.error("Esta conversa não tem um agente atribuído");
      return;
    }

    sendInternalMessageMutation.mutate({
      conversation_id: selectedConversation,
      recipient_id: selectedConversationData.assignedTo,
      content: internalMessageInput,
    });
  };

  const handleSendInternalNote = () => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }
    if (!internalNote.trim()) return;

    // Notas internas não são enviadas para o cliente
    // Aqui você pode salvar em uma tabela separada se quiser
    toast.success("Nota interna adicionada!");
    setInternalNote("");
  };

  const getChannelIcon = (channel: "whatsapp" | "instagram") => {
    return channel === "whatsapp" ? (
      <Phone className="w-4 h-4 text-green-600" />
    ) : (
      <Instagram className="w-4 h-4 text-pink-600" />
    );
  };

  const getChannelBadge = (channel: "whatsapp" | "instagram") => {
    return channel === "whatsapp" ? (
      <Badge className="bg-green-100 text-green-800">WhatsApp</Badge>
    ) : (
      <Badge className="bg-pink-100 text-pink-800">Instagram</Badge>
    );
  };

  // Sugestões de abordagem baseadas no contexto
  const getApproachSuggestions = () => {
    if (!customerDetails) return [];

    const suggestions = [
      "Saudação personalizada pelo nome do cliente",
      "Mencionar histórico de compras anteriores se houver",
      "Oferecer ajuda com base nos produtos de interesse",
    ];

    if (customerDetails.tags) {
      suggestions.push("Referenciar tags de interesse do cliente");
    }

    if (customerDetails.lastPurchaseAt) {
      suggestions.push("Perguntar sobre a satisfação com a última compra");
    }

    return suggestions;
  };

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mensagens</h1>
          <p className="text-gray-500 mt-1">
            Central de mensagens WhatsApp e Instagram
          </p>
        </div>

        {/* Sound Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <SoundSelector />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Conversas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversations?.length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Não Lidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {conversations?.reduce(
                  (acc, conv) => acc + (conv.unreadCount || 0),
                  0
                ) || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Conversas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {conversations?.filter(c => c.status === "assigned").length ||
                  0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages Interface */}
        <Card className="h-[calc(100vh-280px)] min-h-[500px] overflow-hidden">
          <div className="grid grid-cols-12 h-full">
            {/* Conversations List */}
            <div className="col-span-4 border-r border-gray-200 flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg">Conversas</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar conversa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="space-y-1 p-4 pt-0">
                  {loadingConversations ? (
                    <div className="text-center py-4 text-gray-500">
                      Carregando...
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Nenhuma conversa encontrada
                    </div>
                  ) : (
                    filteredConversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedConversation === conv.id
                            ? "bg-indigo-50 border border-indigo-200"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            {conv.customerAvatar ? (
                              <AvatarImage
                                src={getImageSrc(conv.customerAvatar)}
                                alt={conv.customerName ?? "Cliente"}
                              />
                            ) : (
                              <AvatarFallback className="bg-indigo-600 text-white">
                                {(conv.customerName ?? "??")
                                  .split(" ")
                                  .map(n => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">
                                {conv.customerName || "Cliente"}
                              </span>
                              {(conv.unreadCount || 0) > 0 && (
                                <Badge className="bg-indigo-600 text-white text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              {getChannelIcon(
                                conv.channel as "whatsapp" | "instagram"
                              )}
                              <span className="text-xs text-gray-500">
                                {conv.lastMessageAt
                                  ? new Date(
                                      conv.lastMessageAt
                                    ).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {conv.lastMessage || "Nova conversa"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-8 flex flex-col h-full">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200 py-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {selectedConversationData?.customerAvatar ? (
                            <AvatarImage
                              src={getImageSrc(selectedConversationData.customerAvatar)}
                              alt={String(
                                selectedConversationData.customerName ??
                                  "Cliente"
                              )}
                            />
                          ) : (
                            <AvatarFallback className="bg-indigo-600 text-white">
                              {selectedConversationData?.customerName
                                ?.split(" ")
                                .map(n => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "??"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {selectedConversationData?.customerName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {getChannelBadge(
                              (selectedConversationData?.channel as
                                | "whatsapp"
                                | "instagram") || "whatsapp"
                            )}
                            <span>
                              {selectedConversationData?.customerPhone}
                            </span>
                          </div>
                          {selectedConversationData?.assignedAgentName && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-green-600 font-medium">
                                Atendente: {selectedConversationData.assignedAgentName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Sheet
                        open={isProfileOpen}
                        onOpenChange={setIsProfileOpen}
                      >
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <User className="w-4 h-4 mr-2" />
                            Ver Perfil
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Perfil do Cliente</SheetTitle>
                            <SheetDescription>
                              Informações detalhadas do cliente
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-6">
                            {/* Customer Header */}
                            <div className="flex items-center gap-4">
                              <Avatar className="w-20 h-20">
                                {customerDetails?.photoUrl ? (
                                  <AvatarImage
                                    src={getImageSrc(customerDetails.photoUrl)}
                                    alt={customerDetails.name}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-indigo-600 text-white text-2xl">
                                    {customerDetails?.name
                                      ?.split(" ")
                                      .map(n => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2) ||
                                      selectedConversationData?.customerName
                                        ?.split(" ")
                                        .map(n => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2) ||
                                      "??"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h3 className="text-xl font-semibold">
                                  {customerDetails?.name ||
                                    selectedConversationData?.customerName}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Cliente desde{" "}
                                  {customerDetails?.createdAt
                                    ? new Date(
                                        customerDetails.createdAt
                                      ).toLocaleDateString("pt-BR")
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            <Separator />

                            {/* Contact Info */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Informações de Contato
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    Telefone
                                  </Label>
                                  <p className="text-sm">
                                    {customerDetails?.phone ||
                                      selectedConversationData?.customerPhone ||
                                      "Não informado"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    Email
                                  </Label>
                                  <p className="text-sm">
                                    {customerDetails?.email || "Não informado"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Address Info */}
                            {(customerDetails?.address ||
                              customerDetails?.city) && (
                              <>
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <Building className="w-4 h-4" />
                                    Endereço
                                  </h4>
                                  <div className="space-y-3">
                                    {customerDetails?.address && (
                                      <div>
                                        <Label className="text-xs text-gray-500">
                                          Logradouro
                                        </Label>
                                        <p className="text-sm">
                                          {customerDetails.address}
                                        </p>
                                      </div>
                                    )}
                                    {(customerDetails?.city ||
                                      customerDetails?.state) && (
                                      <div>
                                        <Label className="text-xs text-gray-500">
                                          Cidade/Estado
                                        </Label>
                                        <p className="text-sm">
                                          {customerDetails?.city}
                                          {customerDetails?.state &&
                                            `, ${customerDetails.state}`}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Separator />
                              </>
                            )}

                            {/* Status */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-gray-900">
                                Status
                              </h4>
                              <Badge
                                variant={
                                  customerDetails?.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {customerDetails?.status === "active"
                                  ? "Ativo"
                                  : customerDetails?.status === "blocked"
                                    ? "Bloqueado"
                                    : "Inativo"}
                              </Badge>
                              {customerDetails?.lastPurchaseAt && (
                                <div className="mt-2">
                                  <Label className="text-xs text-gray-500">
                                    Última Compra
                                  </Label>
                                  <p className="text-sm">
                                    {new Date(
                                      customerDetails.lastPurchaseAt
                                    ).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Approach Suggestions */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                Sugestões de Abordagem
                              </h4>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {getApproachSuggestions().map(
                                    (suggestion, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start gap-2 text-sm text-yellow-800"
                                      >
                                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{suggestion}</span>
                                      </li>
                                    )
                                  )}
                                  {getApproachSuggestions().length === 0 && (
                                    <li className="text-sm text-yellow-800">
                                      Inicie com uma saudação amigável e
                                      pergunte como pode ajudar.
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {/* Notes */}
                            {customerDetails?.notes && (
                              <>
                                <Separator />
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    Observações
                                  </h4>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    {customerDetails.notes}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardHeader>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 flex-shrink-0">
                    <button
                      onClick={() => setActiveTab("messages")}
                      className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === "messages"
                          ? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Conversa
                    </button>
                    <button
                      onClick={() => setActiveTab("notes")}
                      className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === "notes"
                          ? "border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <StickyNote className="w-4 h-4" />
                      Notas Internas
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setActiveTab("internal")}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                          activeTab === "internal"
                            ? "border-b-2 border-purple-600 text-purple-700 bg-purple-50"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        Mensagens Internas
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {activeTab === "messages" ? (
                      <div className="space-y-4">
                        {loadingMessages ? (
                          <div className="text-center py-4 text-gray-500">
                            Carregando mensagens...
                          </div>
                        ) : messages?.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            Nenhuma mensagem ainda
                          </div>
                        ) : (
                          messages?.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.senderType === "agent" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  msg.senderType === "agent"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {/* DEBUG: Agent name display */}
                                <p className="text-xs font-medium mb-1 opacity-75" data-testid="sender-name">
                                  {msg.senderName || (msg.senderType === "agent" ? "Atendente" : "Cliente")}
                                </p>
                                {msg.content && msg.content !== "null" && (
                                  <p className="text-sm">{renderContentWithLinks(msg.content)}</p>
                                )}
                                {msg.fileUrl && (
                                  <div className="mt-2">
                                    {msg.fileType?.startsWith("image/") ? (
                                      <div className="relative group">
                                        <img
                                          src={getImageSrc(msg.fileUrl, msg.id)}
                                          alt={msg.fileName || "Imagem"}
                                          className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer"
                                          onClick={() =>
                                            handleImageClick(
                                              msg.fileUrl,
                                              msg.id
                                            )
                                          }
                                          onError={e => {
                                            const el =
                                              e.currentTarget as HTMLImageElement;
                                            // Fallback simples: substitui pela menor placeholder
                                            el.src =
                                              "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==";
                                            el.alt = "Imagem indisponível";
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
                                      </div>
                                    ) : msg.fileType?.startsWith("video/") ? (
                                      <div className="relative">
                                        <video
                                          src={getImageSrc(msg.fileUrl, msg.id)}
                                          controls
                                          className="max-w-full rounded-lg max-h-64"
                                        />
                                      </div>
                                    ) : (
                                      <a
                                        href={getImageSrc(msg.fileUrl, msg.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs underline"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                          />
                                        </svg>
                                        {msg.fileName || "Arquivo"}
                                      </a>
                                    )}
                                  </div>
                                )}
                                <span
                                  className={`text-xs mt-1 block ${
                                    msg.senderType === "agent"
                                      ? "text-indigo-100"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {new Date(msg.createdAt).toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : activeTab === "notes" ? (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Notas Internas</strong> - Somente você e
                            outros agentes podem ver estas notas. Elas não são
                            enviadas para o cliente.
                          </p>
                        </div>
                        {/* Aqui você pode listar notas internas se tiver uma tabela para isso */}
                        <div className="text-center py-8 text-gray-500">
                          <StickyNote className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">
                            Adicione notas internas para orientação
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-purple-800">
                            <strong>Mensagens Internas</strong> - Comunicação
                            entre Admin e Agentes. Estas mensagens aparecem como
                            notificações para o agente responsável.
                          </p>
                        </div>
                        {loadingInternalMessages ? (
                          <div className="text-center py-4 text-gray-500">
                            Carregando mensagens internas...
                          </div>
                        ) : internalMessages?.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">
                              Nenhuma mensagem interna ainda
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {internalMessages?.map(msg => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-lg p-3 ${
                                    msg.senderId === user?.id
                                      ? "bg-purple-600 text-white"
                                      : "bg-gray-100 text-gray-900"
                                  }`}
                                >
                                  <p className="text-xs font-medium mb-1 opacity-75">
                                    {msg.senderName || "Usuário"}
                                  </p>
                                  <p className="text-sm">{msg.content}</p>
                                  <span
                                    className={`text-xs mt-1 block ${
                                      msg.senderId === user?.id
                                        ? "text-purple-100"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString(
                                      "pt-BR",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 flex-shrink-0">
                    {activeTab === "messages" ? (
                      <>
                        {/* File Preview */}
                        {selectedFile && (
                          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              {filePreview ? (
                                <img
                                  src={filePreview}
                                  alt="Preview"
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-gray-500" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                  MB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveFile}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileSelect}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="self-end flex-shrink-0"
                            onClick={() =>
                              document.getElementById("file-upload")?.click()
                            }
                            disabled={sendMessageMutation.isPending}
                            title="Anexar imagem ou arquivo"
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          {(selectedFile?.type.startsWith("image/") ||
                            selectedFile?.type.startsWith("video/")) && (
                            <Button
                              variant={isViewOnce ? "default" : "outline"}
                              size="icon"
                              className={`self-end ${isViewOnce ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                              onClick={() => setIsViewOnce(!isViewOnce)}
                              disabled={sendMessageMutation.isPending}
                              title="Enviar como visualização única (desaparece após visualização)"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Button>
                          )}
                          <Textarea
                            placeholder="Digite sua mensagem..."
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            className="resize-none flex-1"
                            rows={2}
                            disabled={sendMessageMutation.isPending}
                            onKeyDown={e => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <Button
                            onClick={handleSendMessage}
                            className="self-end"
                            disabled={
                              sendMessageMutation.isPending ||
                              (!messageInput.trim() && !selectedFile)
                            }
                          >
                            {sendMessageMutation.isPending ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </>
                    ) : activeTab === "notes" ? (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Adicione uma nota interna (não será enviada ao cliente)..."
                          value={internalNote}
                          onChange={e => setInternalNote(e.target.value)}
                          className="resize-none flex-1 bg-yellow-50 border-yellow-200"
                          rows={2}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendInternalNote();
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendInternalNote}
                          className="self-end bg-yellow-500 hover:bg-yellow-600 text-white"
                          disabled={!internalNote.trim()}
                        >
                          <StickyNote className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Digite uma mensagem interna para o agente..."
                          value={internalMessageInput}
                          onChange={e =>
                            setInternalMessageInput(e.target.value)
                          }
                          className="resize-none flex-1 bg-purple-50 border-purple-200"
                          rows={2}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendInternalMessage();
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendInternalMessage}
                          className="self-end bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={
                            sendInternalMessageMutation.isPending ||
                            !internalMessageInput.trim()
                          }
                        >
                          {sendInternalMessageMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Enviar
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Integration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Integrações Configuradas
            </CardTitle>
            <CardDescription>
              Status das integrações com canais de mensagem. Configure suas
              credenciais para começar a receber mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">WhatsApp</h4>
                  <p className="text-sm text-gray-500">Evolution API</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/settings/api")}
                  className="shrink-0"
                >
                  Configurar
                </Button>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-pink-300 transition-colors">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
                  <Instagram className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">Instagram</h4>
                  <p className="text-sm text-gray-500">Graph API</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/settings/api")}
                  className="shrink-0"
                >
                  Configurar
                </Button>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">Nova Conversa</h4>
                  <p className="text-sm text-gray-500">Iniciar manualmente</p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation("/agent/messages")}
                  className="shrink-0"
                >
                  Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
