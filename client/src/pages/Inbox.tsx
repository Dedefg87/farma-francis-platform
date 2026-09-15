import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  MessageSquare,
  Instagram,
  Sparkles,
  Paperclip,
  X,
  Reply,
  Heart,


} from "lucide-react";
import { toast } from "sonner";
import { AudioTranscription } from "@/components/AudioTranscription";
import { AISuggestions } from "@/components/AISuggestions";
import { SentimentBadge } from "@/components/SentimentBadge";
import { TagManager } from "@/components/TagManager";
import { TagFilter } from "@/components/TagFilter";
import { useConversationTags } from "@/hooks/useConversationTags";
import { PDFPreview } from "@/components/PDFPreview";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [provider, setProvider] = useState<"all" | "whatsapp" | "instagram">(
    "all"
  );
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [lastCustomerMessage, setLastCustomerMessage] = useState("");
  const [sentiments, setSentiments] = useState<
    Record<
      string,
      { sentiment: "happy" | "neutral" | "frustrated"; confidence: number }
    >
  >({});
  const [selectedTagFilter, setSelectedTagFilter] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; name: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ externalId: string; content: string } | null>(null); // ✅ Estado: mensagem que está sendo respondida
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations, refetch: refetchConversations } =
    trpc.inbox.getConversations.useQuery({
      provider,
      limit: 50,
      tagIds: selectedTagFilter.length > 0 ? selectedTagFilter : undefined,
    });

  // Buscar tags de todas as conversas usando hook
  const conversationTags = useConversationTags(conversations);

  const { data: history, refetch: refetchHistory } =
    trpc.inbox.getConversationHistory.useQuery(
      {
        fromNumber: selectedConversation?.fromNumber || "",
        provider: selectedConversation?.provider || "whatsapp",
        limit: 100,
      },
      {
        enabled: !!selectedConversation,
      }
    );

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      setMessageText("");
      refetchHistory();
      refetchConversations();
    },
    onError: error => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const markAsRead = trpc.inbox.markAsRead.useMutation({
    onSuccess: () => {
      refetchConversations();
    },
  });

  const replyToMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada!");
      refetchHistory();
      refetchConversations();
    },
    onError: error => {
      toast.error(`Erro ao responder: ${error.message}`);
    },
  });

  const reactToMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
    onError: error => {
      toast.error(`Erro ao reagir: ${error.message}`);
    },
  });

  const handleSelectConversation = (conv: unknown) => {
    setSelectedConversation(conv);
    if (conv.unreadCount > 0) {
      markAsRead.mutate({
        fromNumber: conv.fromNumber,
        provider: conv.provider,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo: 16MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo não suportado",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    if (file.type?.startsWith?.("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = () => {
    if ((!messageText.trim() && !selectedFile) || !selectedConversation) return;

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        sendMessage.mutate({
          to: selectedConversation.fromNumber,
          provider: selectedConversation.provider,
          message: messageText,
          customerId: selectedConversation.customerId,
          fileUrl: base64,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        });
        handleRemoveFile();
      };
      reader.readAsDataURL(selectedFile);
    } else {
      sendMessage.mutate({
        to: selectedConversation.fromNumber,
        provider: selectedConversation.provider,
        message: messageText,
        customerId: selectedConversation.customerId,
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Agora";
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  // Iniciais para o avatar de fallback (estilo WhatsApp)
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-80 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Conversas</h2>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          <Tabs value={provider} onValueChange={v => setProvider(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="instagram">Instagram</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtro por Tags */}
          <TagFilter
            selectedTags={selectedTagFilter}
            onFilterChange={tagIds => setSelectedTagFilter(tagIds)}
          />
        </div>

        <ScrollArea className="flex-1">
          {conversations?.map(conv => (
            <div
              key={`${conv.provider}-${conv.fromNumber}`}
              onClick={() => handleSelectConversation(conv)}
              className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                selectedConversation?.fromNumber === conv.fromNumber &&
                selectedConversation?.provider === conv.provider
                  ? "bg-accent"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {/* Foto do cliente (estilo WhatsApp) com badge do canal */}
                  <div className="relative flex-shrink-0">
                    <Avatar 
                      className={`w-9 h-9 ${conv.fromProfilePic ? "cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200" : ""}`}
                      onClick={(e) => {
                        if (conv.fromProfilePic) {
                          e.stopPropagation();
                          setEnlargedPhoto({
                            url: conv.fromProfilePic,
                            name: conv.fromName || conv.fromNumber,
                          });
                        }
                      }}
                      title={conv.fromProfilePic ? "Clique para ampliar a foto" : undefined}
                    >
                      {conv.fromProfilePic && (
                        <AvatarImage
                          src={conv.fromProfilePic}
                          alt={conv.fromName || conv.fromNumber}
                        />
                      )}
                      <AvatarFallback className="bg-[#3FA9D4] text-white text-xs">
                        {getInitials(conv.fromName || conv.fromNumber)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1px]">
                      {conv.provider === "whatsapp" ? (
                        <MessageSquare className="w-3 h-3 text-green-600" />
                      ) : (
                        <Instagram className="w-3 h-3 text-pink-600" />
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {conv.fromName || conv.fromNumber}
                    </span>
                    {/* Badges de tags aplicadas */}
                    {conversationTags[`${conv.provider}-${conv.fromNumber}`] &&
                      conversationTags[`${conv.provider}-${conv.fromNumber}`]
                        .length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {conversationTags[
                            `${conv.provider}-${conv.fromNumber}`
                          ]
                            .slice(0, 3)
                            .map(tag => (
                              <Badge
                                key={tag.id}
                                style={{ backgroundColor: tag.color }}
                                className="text-[10px] px-1 py-0 h-4 text-white"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          {conversationTags[
                            `${conv.provider}-${conv.fromNumber}`
                          ].length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              +
                              {conversationTags[
                                `${conv.provider}-${conv.fromNumber}`
                              ].length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                  </div>
                  {/* Badge de sentimento */}
                  {sentiments[`${conv.provider}-${conv.fromNumber}`] && (
                    <SentimentBadge
                      sentiment={
                        sentiments[`${conv.provider}-${conv.fromNumber}`]
                          .sentiment
                      }
                      confidence={
                        sentiments[`${conv.provider}-${conv.fromNumber}`]
                          .confidence
                      }
                      size="sm"
                    />
                  )}
                  {/* Botão de Tags */}
                  <TagManager
                    conversationId={`${conv.provider}-${conv.fromNumber}`}
                    selectedTags={
                      conversationTags[
                        `${conv.provider}-${conv.fromNumber}`
                      ]?.map(t => t.id) || []
                    }
                    onTagsChange={tagIds => {
                      // Atualizar tags localmente
                      refetchConversations();
                    }}
                  />
                </div>
                {conv.unreadCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conv.lastMessage || "[Mídia]"}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(conv.lastMessageTime)}
              </span>
            </div>
          ))}

          {conversations?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header - Grande estilo WhatsApp Web */}
            <div className="border-b bg-gradient-to-b from-background to-background/95 shadow-sm">
              <div className="p-6 flex flex-col items-center gap-4">
                {/* Foto grande de perfil */}
                <div className="relative group">
                  <Avatar 
                    className={`w-32 h-32 ring-4 ring-background shadow-xl ${selectedConversation.fromProfilePic ? "cursor-pointer hover:ring-[#3FA9D4] hover:scale-105 active:scale-95 transition-all duration-300" : ""}`}
                    onClick={() => {
                      if (selectedConversation.fromProfilePic) {
                        setEnlargedPhoto({
                          url: selectedConversation.fromProfilePic,
                          name: selectedConversation.fromName || selectedConversation.fromNumber,
                        });
                      }
                    }}
                    title={selectedConversation.fromProfilePic ? "Clique para ampliar a foto" : undefined}
                  >
                    {selectedConversation.fromProfilePic && (
                      <AvatarImage
                        src={selectedConversation.fromProfilePic}
                        alt={selectedConversation.fromName || selectedConversation.fromNumber}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-[#3FA9D4] to-[#2B5876] text-white text-4xl font-semibold">
                      {getInitials(selectedConversation.fromName || selectedConversation.fromNumber)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Badge do canal */}
                  <div className="absolute bottom-1 right-1 bg-white rounded-full p-2 shadow-lg ring-2 ring-background">
                    {selectedConversation.provider === "whatsapp" ? (
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    ) : (
                      <Instagram className="w-5 h-5 text-pink-600" />
                    )}
                  </div>
                  {/* Overlay de hover */}
                  {selectedConversation.fromProfilePic && (
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-100">
                      <div className="bg-white/90 rounded-full p-3 shadow-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nome e informações */}
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold text-foreground">
                    {selectedConversation.fromName || selectedConversation.fromNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedConversation.fromNumber}
                  </p>
                  {/* Status da conversa */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {selectedConversation.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs px-2 py-1">
                        {selectedConversation.unreadCount} não lida{selectedConversation.unreadCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {sentiments[`${selectedConversation.provider}-${selectedConversation.fromNumber}`] && (
                      <SentimentBadge
                        sentiment={sentiments[`${selectedConversation.provider}-${selectedConversation.fromNumber}`].sentiment}
                        confidence={sentiments[`${selectedConversation.provider}-${selectedConversation.fromNumber}`].confidence}
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                {/* Tags */}
                {conversationTags[`${selectedConversation.provider}-${selectedConversation.fromNumber}`] &&
                  conversationTags[`${selectedConversation.provider}-${selectedConversation.fromNumber}`].length > 0 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap max-w-md">
                      {conversationTags[`${selectedConversation.provider}-${selectedConversation.fromNumber}`]
                        .slice(0, 5)
                        .map(tag => (
                          <Badge
                            key={tag.id}
                            style={{ backgroundColor: tag.color }}
                            className="text-xs px-2 py-1 text-white shadow-sm"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      {conversationTags[`${selectedConversation.provider}-${selectedConversation.fromNumber}`].length > 5 && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          +{conversationTags[`${selectedConversation.provider}-${selectedConversation.fromNumber}`].length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {history?.map(msg => {
                  // Atualizar última mensagem do cliente para sugestões IA e analisar sentimento
                  // Só analisar sentimento se for mensagem de texto (não imagem/arquivo)
                  if (msg.direction === "inbound" && msg.content) {
                    const isTextOnly =
                      msg.messageType === "text" || !msg.mediaUrl;

                    if (isTextOnly && msg.content !== lastCustomerMessage) {
                      setLastCustomerMessage(msg.content);

                      // Analisar sentimento da mensagem (apenas texto)
                      const convKey = `${selectedConversation.provider}-${selectedConversation.fromNumber}`;
                      if (!sentiments[convKey]) {
                        trpc.ai.analyzeSentiment
                          .useMutation({
                            onSuccess: data => {
                              setSentiments(prev => ({
                                ...prev,
                                [convKey]: {
                                  sentiment: data.sentiment,
                                  confidence: data.confidence,
                                },
                              }));
                            },
                          })
                          .mutate({ message: msg.content });
                      }
                    }
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[70%]">
                        <Card
                          className={`p-3 ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {/* Media rendering - images/videos */}
                          {msg.mediaUrl && (msg.messageType === "image" || msg.messageType?.startsWith("image")) && (
                            <div className="mb-2">
                              <img
                                src={msg.mediaUrl}
                                alt="Imagem recebida"
                                className="max-w-full max-h-64 object-contain rounded cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl!, '_blank')}
                              />
                            </div>
                          )}
                          {msg.mediaUrl && (msg.messageType === "video" || msg.messageType?.startsWith("video")) && (
                            <div className="mb-2">
                              <video
                                src={msg.mediaUrl}
                                controls
                                className="max-w-full max-h-64 rounded"
                              />
                            </div>
                          )}
                          {msg.mediaUrl && msg.messageType === "document" && (
                            <div className="mb-2 p-2 bg-blue-50 rounded flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-blue-600" />
                              <iframe
                                src={msg.mediaUrl}
                                className="w-full h-64 rounded border border-blue-200"
                                title="Visualizar documento"
                              />
                            </div>
                          )}
  {/* Rótulo Encaminhado (estilo WhatsApp) */}
  {msg.content?.includes("📤") && (
    <div className="flex items-center gap-1 text-[11px] italic text-gray-400 select-none">
      <span>→</span>
      <span>Encaminhado</span>
    </div>
  )}

                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content?.replace(/^[sS]*?encaminhada[^\n]*\n\n/i, "").trim()}
                          </p>
                          {msg.reaction && (
                            <span className="text-base ml-1">{msg.reaction}</span>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1 text-xs"
                              onClick={async () => {
                                // ✅ Validações robustas antes de chamar a API
                                if (!selectedConversation) {
                                  toast.error("Nenhuma conversa selecionada");
                                  return;
                                }
                                if (!msg.externalId) {
                                  toast.error("ID da mensagem indisponível");
                                  return;
                                }

                                const content = await new Promise<string | null>((resolve) => {
                                  const result = window.prompt("💬 Responder mensagem:");
                                  resolve(result ? result.trim() : null);
                                });

                                if (!content) return;

                                try {
                                  await replyToMessage.mutateAsync({
                                    replyToId: msg.externalId,
                                    content: content,
                                    conversation_id: Number(selectedConversation.id), // ✅ Garantir number
                                  });
                                  // onSuccess do hook já refaz o fetch
                                } catch (err: any) {
                                  console.error("[Reply] Erro detalhado:", err);
                                  toast.error(`Erro ao responder: ${err?.data?.message || err.message}`);
                                }
                              }}
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              Responder
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1 text-xs"
                              onClick={() => reactToMessage.mutate({
                                messageId: msg.externalId,
                                emoji: "❤️",
                              })}
                            >
                              <Heart className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                          <span className="text-xs opacity-70 mt-1 block">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </Card>

                        {/* Transcrição de áudio */}
                        {msg.direction === "inbound" &&
                          msg.messageType === "audio" &&
                          msg.mediaUrl && (
                            <AudioTranscription
                              audioUrl={msg.mediaUrl}
                              messageId={parseInt(msg.id) || 0}
                            />
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background space-y-3">
              {/* File Preview */}
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
              />

              {/* Sugestões de IA */}
              {showAISuggestions && lastCustomerMessage && (
                <AISuggestions
                  customerMessage={lastCustomerMessage}
                  customerName={selectedConversation.fromName || "Cliente"}
                  onSelectSuggestion={suggestion => {
                    setMessageText(suggestion);
                    setShowAISuggestions(false);
                  }}
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivo"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  title="Sugestões de IA"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessage.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    (!messageText.trim() && !selectedFile) ||
                    sendMessage.isPending
                  }
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Lightbox para Ampliar Foto do Cliente (Estilo WhatsApp Web) */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div 
            className="relative bg-background rounded-lg border border-border shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg truncate">
                {enlargedPhoto.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 hover:bg-muted"
                onClick={() => setEnlargedPhoto(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950 min-h-[300px]">
              <img
                src={enlargedPhoto.url}
                alt={enlargedPhoto.name}
                className="max-w-full max-h-[50vh] object-contain rounded-md shadow-lg"
              />
            </div>
            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
              <Button
                variant="outline"
                onClick={() => window.open(enlargedPhoto.url, '_blank')}
              >
                Abrir em nova aba
              </Button>
              <Button onClick={() => setEnlargedPhoto(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
