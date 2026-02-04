import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Search, Phone, Instagram, Settings, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Mock data para demonstração
const mockConversations = [
  {
    id: 1,
    customerName: "João Silva",
    channel: "whatsapp" as const,
    lastMessage: "Obrigado pelo atendimento!",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    unread: 0,
  },
  {
    id: 2,
    customerName: "Maria Santos",
    channel: "instagram" as const,
    lastMessage: "Qual o horário de funcionamento?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    unread: 2,
  },
  {
    id: 3,
    customerName: "Pedro Costa",
    channel: "whatsapp" as const,
    lastMessage: "Preciso de ajuda com meu pedido",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    unread: 1,
  },
];

const mockMessages = [
  {
    id: 1,
    content: "Olá! Preciso de ajuda com meu pedido",
    direction: "inbound" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 125),
  },
  {
    id: 2,
    content: "Olá! Claro, vou te ajudar. Qual o número do seu pedido?",
    direction: "outbound" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 124),
  },
  {
    id: 3,
    content: "É o pedido #12345",
    direction: "inbound" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 123),
  },
  {
    id: 4,
    content: "Deixa eu verificar aqui... Encontrei seu pedido! Está em separação e será enviado hoje.",
    direction: "outbound" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 122),
  },
  {
    id: 5,
    content: "Perfeito! Muito obrigado!",
    direction: "inbound" as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
];

export default function Messages() {
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(mockConversations[0].id);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredConversations = mockConversations.filter((conv) =>
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 16MB)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 16MB");
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use imagens ou documentos PDF/DOCX.");
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith('image/')) {
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

  const handleSendMessage = () => {
    if (!messageInput.trim() && !selectedFile) return;
    
    setIsUploading(true);
    // Simular envio
    setTimeout(() => {
      toast.success("Mensagem enviada!");
      setMessageInput("");
      setSelectedFile(null);
      setFilePreview(null);
      setIsUploading(false);
    }, 500);
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

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mensagens</h1>
          <p className="text-gray-500 mt-1">Central de mensagens WhatsApp e Instagram</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Conversas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockConversations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Não Lidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {mockConversations.reduce((acc, conv) => acc + conv.unread, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">2min</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages Interface */}
        <Card className="h-[600px]">
          <div className="grid grid-cols-12 h-full">
            {/* Conversations List */}
            <div className="col-span-4 border-r border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Conversas</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar conversa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <ScrollArea className="h-[calc(600px-140px)]">
                <div className="space-y-1 p-4 pt-0">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-indigo-50 border-indigo-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-indigo-600 text-white">
                            {conv.customerName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{conv.customerName}</span>
                            {conv.unread > 0 && (
                              <Badge className="bg-indigo-600 text-white text-xs">
                                {conv.unread}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {getChannelIcon(conv.channel)}
                            <span className="text-xs text-gray-500">
                              {conv.timestamp.toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-8 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-indigo-600 text-white">
                            {mockConversations
                              .find((c) => c.id === selectedConversation)
                              ?.customerName.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {mockConversations.find((c) => c.id === selectedConversation)?.customerName}
                          </h3>
                          {getChannelBadge(
                            mockConversations.find((c) => c.id === selectedConversation)?.channel || "whatsapp"
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver Perfil
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {mockMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.direction === "outbound"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <span
                              className={`text-xs mt-1 block ${
                                msg.direction === "outbound" ? "text-indigo-100" : "text-gray-500"
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    {/* File Preview */}
                    {selectedFile && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                        className="self-end"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={isUploading}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="resize-none"
                        rows={2}
                        disabled={isUploading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }} style={{borderRadius: '7px'}}
                      />
                      <Button onClick={handleSendMessage} className="self-end" disabled={isUploading || (!messageInput.trim() && !selectedFile)}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
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
            <CardTitle>Integrações Configuradas</CardTitle>
            <CardDescription>Status das integrações com canais de mensagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">WhatsApp Business API</h4>
                    <p className="text-sm text-gray-500">Clique em configurar para adicionar suas credenciais</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/settings/api')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Instagram Graph API</h4>
                    <p className="text-sm text-gray-500">Clique em configurar para adicionar suas credenciais</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/settings/api')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
