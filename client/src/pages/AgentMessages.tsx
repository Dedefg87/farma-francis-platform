import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import AgentTopBar from "@/components/AgentTopBar";
import { PDFPreview } from "@/components/PDFPreview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

function getImageSrc(
  url: string | null | undefined,
  messageId?: number
): string {
  if (!url) return "";
  // If it's a data URL, return it directly
  if (url.startsWith("data:")) {
    return url;
  }
  // If it's a WhatsApp URL (temporary), use our media endpoint
  if (url.includes("whatsapp.net") || url.includes("whatsapp.com")) {
    return `/api/media/${messageId}`;
  }
  return url;
}

/**
 * Extrai o MIME type real de um arquivo.
 * Prioriza o MIME type do data URL (mais confiável) sobre o fileType do banco.
 */
function getMimeType(
  fileUrl: string | null | undefined,
  fileType: string | null | undefined
): string {
  // Se tem data URL, extrair MIME type dele (mais confiável)
  if (fileUrl?.startsWith("data:")) {
    const mimeMatch = fileUrl.match(/^data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      return mimeMatch[1];
    }
  }
  // Fallback para o fileType do banco
  return fileType || "";
}

function handleImageClick(url: string | null | undefined, messageId?: number) {
  const src = getImageSrc(url, messageId);
  if (!src) return;

  if (src.startsWith("data:")) {
    // Open data URL in a new window with HTML that displays the image
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
import {
  MessageSquare,
  Clock,
  User,
  Send,
  Paperclip,
  Smile,
  ArrowDownUp,
  Plus,
  Inbox,
  BellOff,
  Bell,
  Search,
  Image as ImageIcon,
  Users,
  ArrowRightLeft,
  XCircle,
  Video,
  Tag,
  FileText,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmojiPicker from "emoji-picker-react";
import QuickRepliesModal from "@/components/QuickRepliesModal";
import NewConversationModal from "@/components/NewConversationModal";
import PullConversationModal from "@/components/PullConversationModal";
import CRMPanel from "@/components/CRMPanel";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { applyQuickReplyVariables } from "@/lib/quickReplyVariables";

export default function AgentMessages() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [crmCustomerId, setCrmCustomerId] = useState<number | null>(null);
  const [crmCustomerName, setCrmCustomerName] = useState<string>("");
  const [crmCustomerPhone, setCrmCustomerPhone] = useState<string>("");
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>(() => {
    return localStorage.getItem("conversationSortOrder") || "newest_last";
  });
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(() => {
    return localStorage.getItem("notificationsMuted") === "true";
  });
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showPullConversation, setShowPullConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    open: boolean;
    url: string | null;
    fileName?: string;
    messageId?: number;
  }>({ open: false, url: null });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showConferenceDialog, setShowConferenceDialog] = useState(false);
  const [transferAgentId, setTransferAgentId] = useState<string>("");
  const [closeReason, setCloseReason] = useState("conversa_anterior");
  const [conferenceLink, setConferenceLink] = useState("");
  const [showCRMPanel, setShowCRMPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesCountRef = useRef<number>(0);
  const previousConversationsRef = useRef<number[]>([]);
  const previousTotalUnreadRef = useRef<number>(0);
  const { playNotificationSound } = useNotificationSound();
  const queryClient = useQueryClient();

  // === SSE Connection for Real-time Messages ===
  useEffect(() => {
    if (!user?.id) return;

    const userId = String(user.id);
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectAttempt = 0;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/sse?userId=${userId}`);

        eventSource.onopen = () => {
          console.log("[AgentSSE] Connected for user:", userId);
          reconnectAttempt = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[AgentSSE] Event received:", data);

            if (data.type === "message:new" || data.type === "MESSAGE_NEW") {
              // Play notification sound if not muted
              if (!notificationsMuted) {
                playNotificationSound();
              }

              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              queryClient.invalidateQueries({ queryKey: ["messages"] });
            }
          } catch (e) {
            console.error("[AgentSSE] Parse error:", e);
          }
        };

        eventSource.onerror = () => {
          console.error("[AgentSSE] Connection error");
          eventSource?.close();
          setIsConnected(false);

          // Reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempt++;
            connect();
          }, delay);
        };
      } catch (e) {
        console.error("[AgentSSE] Connection failed:", e);
      }
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [user?.id, notificationsMuted, playNotificationSound, queryClient]);

  // Atualizar localStorage quando ordenação mudar
  useEffect(() => {
    localStorage.setItem("conversationSortOrder", sortOrder);
  }, [sortOrder]);

  // Atualizar localStorage quando notificações mudarem
  useEffect(() => {
    localStorage.setItem("notificationsMuted", String(notificationsMuted));
  }, [notificationsMuted]);

  // Função para calcular badge de tempo
  const getTimeBadge = (lastMessageAt: Date | string | null) => {
    if (!lastMessageAt)
      return { text: "Novo", color: "bg-gray-100 text-gray-600" };

    const now = new Date();
    const lastMessage = new Date(lastMessageAt);
    const diffMinutes = Math.floor(
      (now.getTime() - lastMessage.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 5) {
      return {
        text: `${diffMinutes}min`,
        color: "bg-green-100 text-green-700",
      };
    } else if (diffMinutes < 30) {
      return {
        text: `${diffMinutes}min`,
        color: "bg-yellow-100 text-yellow-700",
      };
    } else if (diffMinutes < 60) {
      return { text: `${diffMinutes}min`, color: "bg-red-100 text-red-700" };
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return { text: `${diffHours}h`, color: "bg-red-100 text-red-700" };
    }
  };

  const sortOptions = [
    {
      value: "newest_last",
      label: "Por ordem de chegada (mais novos ao final)",
    },
    { value: "oldest_first", label: "Há mais tempo aberto primeiro" },
    { value: "newest_first", label: "Há menos tempo aberto primeiro" },
    { value: "recent_message", label: "Última mensagem mais recente primeiro" },
    { value: "unread_first", label: "Mensagens não lidas primeiro" },
  ];

  // Buscar conversas ativas do agente
  const {
    data: conversations,
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = trpc.conversations.listActive.useQuery(undefined, {
    refetchInterval: 2000, // Atualizar a cada 2 segundos
  });

  const { data: loggedAgents } = trpc.conversations.loggedAgents.useQuery(
    undefined,
    {
      enabled: showTransferDialog,
    }
  );

  // Filtrar e ordenar conversas
  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    const sorted = [...conversations];

    switch (sortOrder) {
      case "newest_last":
        return sorted.sort(
          (a, b) =>
            new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
        );
      case "oldest_first":
        return sorted.sort(
          (a, b) =>
            new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
        );
      case "newest_first":
        return sorted.sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
        );
      case "recent_message":
        return sorted.sort((a, b) => {
          const aTime = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const bTime = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return bTime - aTime;
        });
      case "unread_first":
        return sorted.sort((a, b) => {
          if (a.unreadCount && !b.unreadCount) return -1;
          if (!a.unreadCount && b.unreadCount) return 1;
          return 0;
        });
      default:
        return sorted;
    }
  }, [conversations, sortOrder]);

  // Aplicar busca e filtros
  const filteredConversations = useMemo(() => {
    let filtered = sortedConversations;

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        conv =>
          (conv.customerName || "").toLowerCase().includes(query) ||
          conv.customerPhone?.toLowerCase().includes(query) ||
          conv.lastMessage?.toLowerCase().includes(query)
      );
    }

    // Filtro de canal
    if (channelFilter !== "all") {
      filtered = filtered.filter(conv => conv.channel === channelFilter);
    }

    return filtered;
  }, [sortedConversations, searchQuery, channelFilter]);

  // Buscar mensagens da conversa selecionada
  const {
    data: messages,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = trpc.messages.list.useQuery(
    { conversation_id: selectedConversationId! },
    {
      enabled: !!selectedConversationId,
      refetchInterval: selectedConversationId ? 1500 : false, // Atualizar mensagens a cada 1.5 segundos se conversa selecionada
    }
  );

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!messageSearchQuery.trim()) return messages;
    const query = messageSearchQuery.toLowerCase();
    return messages.filter(msg => msg.content?.toLowerCase().includes(query));
  }, [messages, messageSearchQuery]);

  const mediaItems = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => msg.fileUrl);
  }, [messages]);

  // Mutation para enviar mensagem
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      refetchConversations();
    },
    onError: error => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  const handleCreateConference = () => {
    if (!selectedConversationId) return;
    const roomId = `farma-francis-${selectedConversationId}-${Date.now()}`;
    const link = `https://meet.jit.si/${roomId}`;
    setConferenceLink(link);
    setShowConferenceDialog(true);
  };

  const transferConversationMutation = trpc.conversations.transfer.useMutation({
    onSuccess: () => {
      toast.success("Conversa transferida com sucesso");
      setShowTransferDialog(false);
      setTransferAgentId("");
      refetchConversations();
      setSelectedConversationId(null);
    },
    onError: error => {
      toast.error(`Erro ao transferir: ${error.message}`);
    },
  });

  const closeConversationMutation = trpc.conversations.close.useMutation({
    onSuccess: () => {
      toast.success("Conversa encerrada");
      setShowCloseDialog(false);
      setSelectedConversationId(null);
      refetchConversations();
    },
    onError: error => {
      toast.error(`Erro ao encerrar: ${error.message}`);
    },
  });

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Detectar novas mensagens e tocar som de notificação
  useEffect(() => {
    if (!messages || messages.length === 0) {
      previousMessagesCountRef.current = 0;
      return;
    }

    const currentCount = messages.length;
    const previousCount = previousMessagesCountRef.current;

    // Se há novas mensagens e não é a primeira carga
    if (previousCount > 0 && currentCount > previousCount) {
      // Verificar se a última mensagem é do cliente (não do agente)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderType === "customer" && !notificationsMuted) {
        playNotificationSound();
      }
    }

    // Atualizar contador
    previousMessagesCountRef.current = currentCount;
  }, [messages, notificationsMuted, playNotificationSound]);

  // Detectar novas conversas com mensagens não lidas
  useEffect(() => {
    if (!conversations || conversations.length === 0) {
      previousConversationsRef.current = conversations?.map(c => c.id) || [];
      previousTotalUnreadRef.current = 0;
      return;
    }

    // Calcular total de mensagens não lidas
    const currentTotalUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
    const previousTotalUnread = previousTotalUnreadRef.current;

    // Se o número de não lidas aumentou, tocar som
    if (currentTotalUnread > previousTotalUnread && !notificationsMuted) {
      console.log(
        `[AgentMessages] Novas mensagens não lidas: ${previousTotalUnread} -> ${currentTotalUnread}`
      );
      playNotificationSound();
    }

    // Atualizar referências
    previousTotalUnreadRef.current = currentTotalUnread;
    previousConversationsRef.current = conversations.map(c => c.id);
  }, [conversations, notificationsMuted, playNotificationSound]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 16MB)
    if (file.size > 16 * 1024 * 1024) {
      alert("Arquivo muito grande. Tamanho máximo: 16MB");
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      // Criar thumbnail para vídeos
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFilePreview(canvas.toDataURL("image/jpeg"));
        URL.revokeObjectURL(video.src);
      };
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = () => {
    if ((!message.trim() && !selectedFile) || !selectedConversationId) return;

    // Se tem arquivo, converter para base64 e enviar
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessageMutation.mutate({
          conversation_id: selectedConversationId,
          content: message.trim() || "",
          fileUrl: reader.result as string,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        setSelectedFile(null);
        setFilePreview(null);
        setMessage("");
      };
      reader.readAsDataURL(selectedFile);
    } else {
      sendMessageMutation.mutate({
        conversation_id: selectedConversationId,
        content: message,
      });
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(applyQuickReplyVariables(content, { agentName: user?.name }));
    setShowQuickReplies(false);
  };

  const selectedConversation = conversations?.find(
    c => c.id === selectedConversationId
  );

  // Ensure we don't leak customerId across conversations
  useEffect(() => {
    setCrmCustomerId(null);
    setCrmCustomerName("");
    setCrmCustomerPhone("");
  }, [selectedConversationId]);

  const ensureCustomerMutation = (
    trpc as any
  ).crm.createIfNotExists.useMutation();

  const linkCustomerMutation = (
    trpc as any
  ).conversations.linkCustomer.useMutation();

  const handleOpenCRM = async () => {
    if (!selectedConversation) return;

    if (selectedConversation.customerId) {
      setCrmCustomerId(Number(selectedConversation.customerId));
      setCrmCustomerName(selectedConversation.customerName || "");
      setCrmCustomerPhone(selectedConversation.customerPhone || "");
      setShowCRMPanel(true);
      return;
    }

    if (!selectedConversation.customerPhone) {
      toast.error("Telefone do cliente nao encontrado");
      return;
    }

    try {
      const result = await ensureCustomerMutation.mutateAsync({
        phone: selectedConversation.customerPhone,
        name: selectedConversation.customerName || undefined,
      });

      const id = Number((result as any)?.id ?? (result as any)?.customer?.id);
      if (!Number.isFinite(id) || id <= 0) {
        toast.error("Nao foi possivel vincular o cliente ao CRM");
        return;
      }

      setCrmCustomerId(id);
      setCrmCustomerName(selectedConversation.customerName || "");
      setCrmCustomerPhone(selectedConversation.customerPhone || "");

      // Persist link on conversation so it stays after refresh
      try {
        await linkCustomerMutation.mutateAsync({
          conversationId: selectedConversation.id,
          customerId: id,
          customerName: selectedConversation.customerName || undefined,
          customerPhone: selectedConversation.customerPhone || undefined,
        });
        refetchConversations();
      } catch {
        // ignore
      }

      setShowCRMPanel(true);
    } catch (e: any) {
      toast.error(e?.message || "Nao foi possivel abrir o CRM");
    }
  };

  return (
    <>
      <AgentTopBar />
      <div className="h-[calc(100vh-64px)] bg-gray-50 flex">
        {/* Lista de Conversas */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Conversas Ativas
                </h2>
                <p className="text-sm text-gray-500">
                  {filteredConversations.length} de {conversations?.length || 0}{" "}
                  atendimentos
                </p>
              </div>
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Todos os canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              {/* Ordenação */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ArrowDownUp className="w-4 h-4 mr-2" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  {sortOptions.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortOrder(option.value)}
                      className={
                        sortOrder === option.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }
                    >
                      {sortOrder === option.value && "✓ "}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Nova Conversa */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova
              </Button>

              {/* Puxar Atendimento */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowPullConversation(true)}
              >
                <Inbox className="w-4 h-4 mr-2" />
                Puxar
              </Button>

              {/* Silenciar Notificações */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotificationsMuted(!notificationsMuted)}
                title={
                  notificationsMuted
                    ? "Ativar notificações"
                    : "Silenciar notificações"
                }
              >
                {notificationsMuted ? (
                  <BellOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Bell className="w-4 h-4 text-blue-600" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversationId === conv.id
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {conv.customerAvatar ? (
                        <AvatarImage
                          src={conv.customerAvatar}
                          alt={conv.customerName || "Contato"}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.customerName}
                        </h3>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Badge de tempo */}
                        {(() => {
                          const badge = getTimeBadge(conv.lastMessageAt);
                          return (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}
                            >
                              {badge.text}
                            </span>
                          );
                        })()}

                        {/* Badge de canal */}
                        <span className="text-xs text-gray-500">
                          {conv.channel === "whatsapp"
                            ? "📱 WhatsApp"
                            : "📷 Instagram"}
                        </span>
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma conversa ativa</p>
              </div>
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header do Chat */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {selectedConversation?.customerAvatar ? (
                        <AvatarImage
                          src={selectedConversation.customerAvatar}
                          alt={selectedConversation.customerName || "Contato"}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.customerName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.customerPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Buscar mensagens"
                      onClick={() => setShowMessageSearch(prev => !prev)}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Midias"
                      onClick={() => setShowMediaDialog(true)}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Convidados"
                      onClick={handleCreateConference}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Transferir chat"
                      onClick={() => setShowTransferDialog(true)}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="CRM"
                      onClick={handleOpenCRM}
                      disabled={ensureCustomerMutation.isPending}
                    >
                      <Tag className="w-4 h-4 text-purple-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Encerrar chat"
                      onClick={() => setShowCloseDialog(true)}
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {showMessageSearch ? (
                  <div className="mt-3">
                    <Input
                      placeholder="Buscar nas mensagens..."
                      value={messageSearchQuery}
                      onChange={e => setMessageSearchQuery(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="text-center text-gray-500">
                    Carregando mensagens...
                  </div>
                ) : filteredMessages && filteredMessages.length > 0 ? (
                  filteredMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === "agent" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === "agent"
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        {msg.content && msg.content !== "null" && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        {msg.fileUrl && (
                          <div className="mt-2">
                            {getMimeType(msg.fileUrl, msg.fileType).startsWith(
                              "image/"
                            ) ? (
                              <img
                                src={getImageSrc(msg.fileUrl, msg.id)}
                                alt={msg.fileName || "Imagem"}
                                className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer"
                                onClick={() =>
                                  handleImageClick(msg.fileUrl, msg.id)
                                }
                                onError={e => {
                                  const el =
                                    e.currentTarget as HTMLImageElement;
                                  el.src =
                                    "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==";
                                  el.alt = "Imagem indisponível";
                                }}
                              />
                            ) : getMimeType(
                                msg.fileUrl,
                                msg.fileType
                              ).startsWith("video/") ? (
                              <video
                                src={getImageSrc(msg.fileUrl, msg.id)}
                                controls
                                className="max-w-full rounded-lg max-h-64"
                              />
                            ) : getMimeType(msg.fileUrl, msg.fileType) ===
                              "application/pdf" ? (
                              // PDF - mostrar preview inline
                              <div className="rounded-lg overflow-hidden border bg-white max-w-xs">
                                <div
                                  className="h-32 overflow-hidden cursor-pointer"
                                  onClick={() =>
                                    setPdfPreview({
                                      open: true,
                                      url: msg.fileUrl,
                                      fileName: msg.fileName || undefined,
                                      messageId: msg.id,
                                    })
                                  }
                                >
                                  <iframe
                                    src={getImageSrc(msg.fileUrl, msg.id)}
                                    className="w-full h-full pointer-events-none"
                                    title={msg.fileName || "PDF"}
                                  />
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 border-t">
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className="w-4 h-4 text-red-500"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <span className="text-xs font-medium truncate max-w-[100px]">
                                      {msg.fileName || "PDF"}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setPdfPreview({
                                        open: true,
                                        url: msg.fileUrl,
                                        fileName: msg.fileName || undefined,
                                        messageId: msg.id,
                                      })
                                    }
                                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                  >
                                    Ampliar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  setPdfPreview({
                                    open: true,
                                    url: msg.fileUrl,
                                    fileName: msg.fileName || undefined,
                                    messageId: msg.id,
                                  })
                                }
                                className="flex items-center gap-2 text-xs underline cursor-pointer hover:opacity-80"
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
                              </div>
                            )}
                          </div>
                        )}
                        <span
                          className={`text-xs mt-1 block ${
                            msg.senderType === "agent"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatDistanceToNow(new Date(msg.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : messageSearchQuery ? (
                  <div className="text-center text-gray-500">
                    Nenhuma mensagem encontrada
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    Nenhuma mensagem ainda
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className="bg-white border-t border-gray-200 p-4">
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
                      ) : selectedFile.type.startsWith("video/") ? (
                        <div className="w-16 h-16 bg-purple-100 rounded flex items-center justify-center">
                          <Video className="w-8 h-8 text-purple-500" />
                        </div>
                      ) : selectedFile.type === "application/pdf" ? (
                        <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                          <FileText className="w-8 h-8 text-red-500" />
                        </div>
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
                          {selectedFile.type || "Arquivo"} •{" "}
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

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload-agent"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      document.getElementById("file-upload-agent")?.click()
                    }
                    title="Anexar arquivo (imagens, vídeos, documentos)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickReplies(true)}
                    title="Respostas Rápidas"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>

                  <div className="relative">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Emojis"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0 z-50">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                      </div>
                    )}
                  </div>

                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={e => e.key === "Enter" && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() && !selectedFile}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500">
                  Escolha uma conversa à esquerda para começar a atender
                </p>
              </div>
            </div>
          )}
        </div>

        <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Midias compartilhadas</DialogTitle>
              <DialogDescription>
                Arquivos enviados nesta conversa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {mediaItems.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhuma midia encontrada.
                </div>
              ) : (
                mediaItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getMimeType(item.fileUrl, item.fileType).startsWith(
                        "image/"
                      ) && item.fileUrl ? (
                        <img
                          src={item.fileUrl}
                          alt={item.fileName || "midia"}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {item.fileName || item.content || "Midia"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.fileType || "arquivo"}
                        </p>
                      </div>
                    </div>
                    {item.fileUrl ? (
                      <a
                        className="text-sm text-blue-600 hover:underline"
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showConferenceDialog}
          onOpenChange={setShowConferenceDialog}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Convidados</DialogTitle>
              <DialogDescription>
                Crie uma sala temporaria e compartilhe o link
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={conferenceLink} readOnly />
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(conferenceLink);
                    toast.success("Link copiado");
                  }}
                >
                  Copiar link
                </Button>
                <Button variant="outline" asChild>
                  <a href={conferenceLink} target="_blank" rel="noreferrer">
                    Abrir sala
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transferir chat</DialogTitle>
              <DialogDescription>
                Selecione um agente logado para transferir
              </DialogDescription>
            </DialogHeader>
            <Select value={transferAgentId} onValueChange={setTransferAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                {loggedAgents && loggedAgents.length > 0 ? (
                  loggedAgents.map(agent => (
                    <SelectItem key={agent.id} value={String(agent.id)}>
                      {agent.name || `Agente ${agent.id}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum agente logado
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (
                    !transferAgentId ||
                    transferAgentId === "none" ||
                    !selectedConversationId
                  ) {
                    toast.error("Selecione um agente");
                    return;
                  }
                  transferConversationMutation.mutate({
                    conversationId: selectedConversationId,
                    agentId: Number(transferAgentId),
                  });
                }}
                disabled={transferConversationMutation.isPending}
              >
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Encerrar chat</DialogTitle>
              <DialogDescription>Escolha o motivo e confirme</DialogDescription>
            </DialogHeader>
            <Select value={closeReason} onValueChange={setCloseReason}>
              <SelectTrigger>
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="orcamento">Orcamento</SelectItem>
                <SelectItem value="conversa_anterior">
                  Conversa anterior
                </SelectItem>
                <SelectItem value="engano">Engano</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!selectedConversationId) return;
                  closeConversationMutation.mutate({
                    conversationId: selectedConversationId,
                    reason: closeReason as any,
                  });
                }}
                disabled={closeConversationMutation.isPending}
              >
                Encerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showQuickReplies && (
        <QuickRepliesModal
          open={showQuickReplies}
          onClose={() => setShowQuickReplies(false)}
          onSelect={handleQuickReplySelect}
        />
      )}

      <NewConversationModal
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onSuccess={refetchConversations}
      />

      <PullConversationModal
        open={showPullConversation}
        onOpenChange={setShowPullConversation}
        onSuccess={refetchConversations}
      />

      {showCRMPanel && crmCustomerId ? (
        <CRMPanel
          open={showCRMPanel}
          onOpenChange={setShowCRMPanel}
          customerId={crmCustomerId}
          customerName={crmCustomerName}
          customerPhone={crmCustomerPhone}
        />
      ) : null}

      {/* PDF Preview Modal */}
      <PDFPreview
        open={pdfPreview.open}
        onOpenChange={open => setPdfPreview({ ...pdfPreview, open })}
        url={pdfPreview.url || ""}
        fileName={pdfPreview.fileName}
        messageId={pdfPreview.messageId}
      />
    </>
  );
}
// Build fix Sat Feb 28 11:21:28 -03 2026
