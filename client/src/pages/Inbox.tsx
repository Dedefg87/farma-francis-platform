import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  MessageSquare,
  Instagram,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AudioTranscription } from "@/components/AudioTranscription";
import { AISuggestions } from "@/components/AISuggestions";
import { SentimentBadge } from "@/components/SentimentBadge";
import { TagManager } from "@/components/TagManager";
import { TagFilter } from "@/components/TagFilter";
import { useConversationTags } from "@/hooks/useConversationTags";

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

  const sendMessage = trpc.inbox.sendMessage.useMutation({
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

  const handleSelectConversation = (conv: any) => {
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
                  {conv.provider === "whatsapp" ? (
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  ) : (
                    <Instagram className="w-4 h-4 text-pink-600" />
                  )}
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
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center gap-2">
                {selectedConversation.provider === "whatsapp" ? (
                  <MessageSquare className="w-5 h-5 text-green-600" />
                ) : (
                  <Instagram className="w-5 h-5 text-pink-600" />
                )}
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.fromName ||
                      selectedConversation.fromNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.fromNumber}
                  </p>
                </div>
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
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
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
    </div>
  );
}
