import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Search, Phone, Instagram, Settings, Paperclip, X, FileText, Image as ImageIcon, StickyNote, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";



export default function Messages() {
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'notes'>('messages');
  const [internalNote, setInternalNote] = useState("");

  // Buscar conversas reais
  const { data: conversations, isLoading: loadingConversations } = trpc.conversations.listActive.useQuery();
  
  // Buscar mensagens da conversa selecionada
  const { data: messages, isLoading: loadingMessages } = trpc.messages.list.useQuery(
    { conversation_id: selectedConversation || 0 },
    { enabled: selectedConversation !== null }
  );

  const filteredConversations = conversations?.filter((conv) =>
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customerPhone?.includes(searchQuery)
  ) || [];

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

  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      setMessageInput("");
      setSelectedFile(null);
      setFilePreview(null);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversation) {
      toast.error("Selecione uma conversa primeiro");
      return;
    }
    if (!messageInput.trim() && !selectedFile) return;
    
    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      content: messageInput,
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
              <div className="text-2xl font-bold">{conversations?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Não Lidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {conversations?.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Conversas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {conversations?.filter(c => c.status === 'assigned').length || 0}
              </div>
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
                  {loadingConversations ? (
                    <div className="text-center py-4 text-gray-500">Carregando...</div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Nenhuma conversa encontrada</div>
                  ) : (
                    filteredConversations.map((conv) => (
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
                              {(conv.unreadCount || 0) > 0 && (
                                <Badge className="bg-indigo-600 text-white text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              {getChannelIcon(conv.channel as "whatsapp" | "instagram")}
                              <span className="text-xs text-gray-500">
                                {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) : ""}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{conv.lastMessage || "Nova conversa"}</p>
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
                  <CardHeader className="border-b border-gray-200 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-indigo-600 text-white">
                            {conversations
                              ?.find((c) => c.id === selectedConversation)
                              ?.customerName?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {conversations?.find((c) => c.id === selectedConversation)?.customerName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {getChannelBadge(
                              (conversations?.find((c) => c.id === selectedConversation)?.channel as "whatsapp" | "instagram") || "whatsapp"
                            )}
                            <span>{conversations?.find((c) => c.id === selectedConversation)?.customerPhone}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver Perfil
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === 'messages'
                          ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Conversa
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        activeTab === 'notes'
                          ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <StickyNote className="w-4 h-4" />
                      Notas Internas
                    </button>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {activeTab === 'messages' ? (
                      <div className="space-y-4">
                        {loadingMessages ? (
                          <div className="text-center py-4 text-gray-500">Carregando mensagens...</div>
                        ) : messages?.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">Nenhuma mensagem ainda</div>
                        ) : (
                          messages?.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.senderType === 'agent' ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  msg.senderType === 'agent'
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                                {msg.fileUrl && (
                                  <div className="mt-2">
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                      📎 {msg.fileName || 'Arquivo'}
                                    </a>
                                  </div>
                                )}
                                <span
                                  className={`text-xs mt-1 block ${
                                    msg.senderType === 'agent' ? "text-indigo-100" : "text-gray-500"
                                  }`}
                                >
                                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Notas Internas</strong> - Somente você e outros agentes podem ver estas notas. 
                            Elas não são enviadas para o cliente.
                          </p>
                        </div>
                        {/* Aqui você pode listar notas internas se tiver uma tabela para isso */}
                        <div className="text-center py-8 text-gray-500">
                          <StickyNote className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Adicione notas internas para orientação</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    {activeTab === 'messages' ? (
                      <>
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
                            disabled={sendMessageMutation.isPending}
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Textarea
                            placeholder="Digite sua mensagem..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            className="resize-none flex-1"
                            rows={2}
                            disabled={sendMessageMutation.isPending}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            className="self-end" 
                            disabled={sendMessageMutation.isPending || (!messageInput.trim() && !selectedFile)}
                          >
                            {sendMessageMutation.isPending ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Adicione uma nota interna (não será enviada ao cliente)..."
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          className="resize-none flex-1 bg-yellow-50 border-yellow-200"
                          rows={2}
                          onKeyDown={(e) => {
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
              Status das integrações com canais de mensagem. Configure suas credenciais para começar a receber mensagens.
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
                  onClick={() => setLocation('/settings/api')}
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
                  onClick={() => setLocation('/settings/api')}
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
                  onClick={() => setLocation('/agent/messages')}
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
