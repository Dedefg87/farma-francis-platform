import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { trpc } from "@/lib/trpc";
import type { Conversation } from "@shared/types/conversations";
import AgentTopBar from "@/components/AgentTopBar";
import { PDFPreview } from "@/components/PDFPreview";
import { ImageLightbox } from "@/components/ImageLightbox";
import { BroadcastListManager } from "@/components/BroadcastListManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { renderContentWithLinks } from "@/utils/text-format";
import { hasSession } from "@/lib/auth";

import { getImageSrc } from "@/utils/image-url";


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
  Megaphone,
  Keyboard,
  Trash2,
  Send,
  CornerUpLeft,
} from "lucide-react";
import { MessageMedia } from "@/components/shared/MessageMedia";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import QuickRepliesModal from "@/components/QuickRepliesModal";
import NewConversationModal from "@/components/NewConversationModal";
import PullConversationModal from "@/components/PullConversationModal";
import CRMPanel from "@/components/CRMPanel";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { applyQuickReplyVariables } from "@/lib/quickReplyVariables";

export default function AgentMessages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(() => {
    // Bug 2 fix: Restore selected conversation from sessionStorage
    const saved = sessionStorage.getItem('selectedConversationId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [crmCustomerId, setCrmCustomerId] = useState<number | null>(null);
  const [crmCustomerName, setCrmCustomerName] = useState<string>("");
  const [crmCustomerPhone, setCrmCustomerPhone] = useState<string>("");
  const [message, setMessage] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<string>(() => {
    return localStorage.getItem("conversationSortOrder") || "newest_last";
  });
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(() => {
    return localStorage.getItem("notificationsMuted") === "true";
  });
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showPullConversation, setShowPullConversation] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
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
    fileType?: string;
  }>({ open: false, url: null });
  
  // Image Lightbox state
  const [imageLightbox, setImageLightbox] = useState<{
    open: boolean;
    initialIndex: number;
  }>({ open: false, initialIndex: 0 });
  
  // Prevenir fechamento imediato do modal
  const pdfPreviewJustOpened = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConferenceDialog, setShowConferenceDialog] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<number | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<{ id: number; externalId?: string; content: string } | null>(null);
  const [forwardTargetType, setForwardTargetType] = useState<"agent" | "customer">("agent");
  const [forwardTargetAgentId, setForwardTargetAgentId] = useState<string>("");
  const [forwardTargetCustomerPhone, setForwardTargetCustomerPhone] = useState<string>("");
  const [forwardTargetProvider, setForwardTargetProvider] = useState<"whatsapp" | "instagram">("whatsapp");
  const [manualPhoneInput, setManualPhoneInput] = useState<string>("");
  const [transferAgentId, setTransferAgentId] = useState<string>("");
  const [closeReason, setCloseReason] = useState("conversa_anterior");
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const [closeAllMessage, setCloseAllMessage] = useState("Obrigado pelo contato! Atendimento encerrado.");
  const [closeAllLoading, setCloseAllLoading] = useState(false);
  const [closeAllReason, setCloseAllReason] = useState("conversa_anterior");
  const [conferenceLink, setConferenceLink] = useState("");
  const [showCRMPanel, setShowCRMPanel] = useState(false);
  const [showNewOptionsModal, setShowNewOptionsModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const hasInitiallyScrolledRef = useRef<boolean>(false);
  const previousMessagesCountRef = useRef<number>(0);
  const previousConversationsRef = useRef<number[]>([]);
  const previousTotalUnreadRef = useRef<number>(0);
  const { playNotificationSound } = useNotificationSound();
  const queryClient = useQueryClient();

  // Buscar contatos recentes para o dropdown de encaminhar para cliente
  const { data: recentContacts = [], isLoading: loadingRecentContacts } = trpc.conversations.recentContacts.useQuery(
    { limit: 30 },
    { enabled: true }
  );

  // DEBUG: Log component mount
  useEffect(() => {
  }, []);

  // DEBUG: Log pdfPreview state changes
  useEffect(() => {
  }, [pdfPreview]);

  // === SSE Connection for Real-time Messages ===
  useEffect(() => {
    if (!user?.id) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let reconnectAttempt = 0;

    const connect = () => {
      try {
        // Set JWT token in cookie for SSE authentication
        const token = localStorage.getItem("jti");
        if (token) {
          // Use lax for broader compatibility (works on both HTTP and HTTPS)
          document.cookie = `jti=${token}; path=/; samesite=lax`;
        }

        // withCredentials: true sends cookies automatically
        eventSource = new EventSource("/api/events", { withCredentials: true });

        eventSource.onopen = () => {
          setIsConnected(true);
          reconnectAttempt = 0;
        };

        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);

            if (
              data.type === "message:new" ||
              data.type === "MESSAGE_NEW" ||
              data.type === "conversation:update" ||
              data.type === "conversation:new" ||
              data.type === "conversation:read" ||
              (data.type === "messages.update" && data.data?.fromMe === false)
            ) {
              // Play notification sound if not muted (only for new messages)
              if (!notificationsMuted && (data.type === "message:new" || data.type === "MESSAGE_NEW")) {
                playNotificationSound();
              }

              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["trpc", "conversations", "list"] });

              // Invalidate specific message query for this conversation
              const conversationId = data.data?.conversationId;
              if (conversationId) {
                queryClient.invalidateQueries({
                  queryKey: ["messages", "list", { conversation_id: conversationId }]
                });
              }

              // Fallback: invalidate all messages queries
              queryClient.invalidateQueries({ queryKey: ["messages"] });

              // For conversation:update, also force-refetch current messages
              if (data.type === "conversation:update" && data.data?.conversationId) {
                queryClient.invalidateQueries({
                  queryKey: ["messages", data.data.conversationId],
                });
              }
            }
          } catch (e) {
            console.error("[AgentSSE] Parse error:", e, "Raw data:", event.data);
          }
        };

        eventSource.onerror = err => {
          // ERR_HTTP2_PROTOCOL_ERROR is common on Railway (HTTP/2 proxy doesn't support SSE)
          // Don't log it loudly — it's expected behavior
          if (reconnectAttempt === 0) {
            console.warn("[AgentSSE] Connection failed (Railway HTTP/2 proxy). Polling will handle updates.");
          }
          setIsConnected(false);
          eventSource?.close();

          // Reconnect with exponential backoff (cap at 60s to avoid too many failed connections)
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 60000);
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
  } = trpc.conversations.list.useQuery(
    {},
    {
      enabled: hasSession(),
      refetchInterval: 1000, // Atualizar a cada 1 segundo
    }
  );

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
          (conv.lastMessagePreview || "").toLowerCase().includes(query)
      );
    }

    // Filtro de canal
    if (channelFilter !== "all") {
      filtered = filtered.filter(conv => conv.channel === channelFilter);
    }

    return filtered;
  }, [sortedConversations, searchQuery, channelFilter]);

  // Auto-selecionar primeira conversa se nenhuma estiver selecionada
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      const firstConv = filteredConversations[0];
      const convId = Number(firstConv.id);
      setSelectedConversationId(convId);
      sessionStorage.setItem('selectedConversationId', String(convId));
    }
  }, [filteredConversations, selectedConversationId]);

  // Validar se a conversa selecionada ainda existe na lista
  useEffect(() => {
    if (selectedConversationId && filteredConversations.length > 0) {
      const exists = filteredConversations.find(c => Number(c.id) === selectedConversationId);
      if (!exists) {
        // Conversa não está mais na lista — selecionar a primeira
        const firstConv = filteredConversations[0];
        const convId = Number(firstConv.id);
        setSelectedConversationId(convId);
        sessionStorage.setItem('selectedConversationId', String(convId));
      }
    }
  }, [filteredConversations, selectedConversationId]);

  // Buscar mensagens da conversa selecionada

  const {
    data: messages,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = trpc.messages.list.useQuery(
    { conversation_id: selectedConversationId! },
    {
      enabled: !!selectedConversationId,
      refetchInterval: selectedConversationId ? 800 : false, // Atualizar mensagens a cada 800ms se conversa selecionada
      onSuccess: (data) => {
        if (data && data.length > 0) {
        }
      },
      onError: (error) => {
        console.error(`[AgentMessages] Error loading messages:`, error);
      }
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

  // Lista de imagens para o lightbox
  const imageItems = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter(msg => msg.fileUrl && getMimeType(msg.fileUrl, msg.fileType)?.startsWith?.("image/"))
      .map(msg => ({
        id: msg.id,
        fileUrl: msg.fileUrl!,
        fileName: msg.fileName,
      }));
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
      sessionStorage.removeItem('selectedConversationId');
      queryClient.invalidateQueries({ queryKey: ["trpc", "conversations", "list"] });
      refetchConversations();;
    },
    onError: error => {
      toast.error(`Erro ao encerrar: ${error.message}`);
    },
  });

  const closeAllConversationMutation = {
    mutate: async () => {
      setCloseAllLoading(true);
      try {
        const res = await fetch("/api/system/close-conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`${data.closed || 0} conversas encerradas`);
          queryClient.invalidateQueries({ queryKey: ["trpc", "conversations", "list"] });
          refetchConversations();
          setShowCloseAllDialog(false);
        }
      } catch (err) {
        toast.error("Erro ao encerrar conversas");
      } finally {
        setCloseAllLoading(false);
      }
    },
    isPending: closeAllLoading,
  };

  // Bug 1 fix: Delete message mutation
  const deleteMessageMutation = trpc.messages.delete.useMutation({
    onSuccess: () => {
      toast.success("Mensagem excluída");
      // Force immediate cache invalidation
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["trpc", "messages"] });
      refetchMessages();
    },
    onError: error => {
      toast.error(`Erro ao excluir mensagem: ${error.message}`);
    },
  });

  // Forward message mutation
  const forwardMessageMutation = trpc.messages.forward.useMutation({
    onSuccess: () => {
      toast.success("Mensagem encaminhada com sucesso!");
      setShowForwardDialog(false);
      setForwardMessageId(null);
      setForwardTargetAgentId("");
      setForwardTargetCustomerPhone("");
    },
    onError: error => {
      toast.error(`Erro ao encaminhar: ${error.message}`);
    },
  });

  // Função para selecionar conversa e marcar como lida
  const handleSelectConversation = useCallback(async (conversationId: number) => {
    // Selecionar conversa visualmente
    setSelectedConversationId(conversationId);
    // Bug 2 fix: Persist to sessionStorage
    sessionStorage.setItem('selectedConversationId', String(conversationId));

    // Auto-assign se a conversa não tem agente
    const conv = conversations?.find(c => Number(c.id) === conversationId);
    if (conv && !conv.assignedAgentId) {
      try {
        await trpc.conversations.update.mutate({
          id: String(conversationId),
          assignedTo: String(user?.id),
          status: 'assigned'
        });
        refetchConversations();
      } catch (err) {
        console.error('[AgentMessages] Auto-assign failed:', err);
      }
    }

    // Atualização otimista - zerar contador imediatamente na UI
    queryClient.setQueryData(
      ["trpc", "conversations", "listActive", { input: undefined }],
      (old: unknown) => {
        if (!old) return old;
        return old.map((c: unknown) =>
          Number(c.id) === conversationId ? { ...c, unreadCount: 0 } : c
        );
      }
    );

    // Chamar endpoint REST direto
    try {
      await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[AgentMessages] Erro ao marcar como lida:", error);
    }
  }, [queryClient]);

  // Scroll inteligente: só auto-scroll se estiver no final
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    isAtBottomRef.current = isAtBottom;
  }, []);

  // Resets: when conversation changes, allow scroll to bottom on new conversation
  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    isAtBottomRef.current = true;
  }, [selectedConversationId]);

  // Scroll inicial quando carrega conversa
  useEffect(() => {
    if (!hasInitiallyScrolledRef.current && messages && messages.length > 0) {
      scrollToBottom(true);
      hasInitiallyScrolledRef.current = true;
    }
  }, [messages, scrollToBottom]);

  // Scroll condicional para novas mensagens
  useEffect(() => {
    if (hasInitiallyScrolledRef.current && isAtBottomRef.current && messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages?.length, scrollToBottom]);

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

  // Auto-marcar como lida quando mensagem chega na conversa ativa
  useEffect(() => {
    if (!selectedConversationId || !conversations) return;

    const activeConversation = conversations.find(c => Number(c.id) === selectedConversationId);
    
    // Se a conversa ativa tem mensagens não lidas, marcar como lida
    if (activeConversation && activeConversation.unreadCount > 0) {
      
      // Atualização otimista
      queryClient.setQueryData(
        ["trpc", "conversations", "listActive", { input: undefined }],
        (old: unknown) => {
          if (!old) return old;
          return old.map((c: unknown) =>
            Number(c.id) === selectedConversationId ? { ...c, unreadCount: 0 } : c
          );
        }
      );

      // Chamar endpoint REST
      fetch(`/api/conversations/${selectedConversationId}/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(err => console.error("[AgentMessages] Erro auto-mark:", err));
    }
  }, [conversations, selectedConversationId, queryClient]);

  // Função para abrir lightbox de imagens
  const handleImageClick = useCallback(
    (messageId: number) => {
      const index = imageItems.findIndex((img) => img.id === messageId);
      if (index >= 0) {
        setImageLightbox({ open: true, initialIndex: index });
      }
    },
    [imageItems]
  );

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
    if (file.type?.startsWith?.("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type?.startsWith?.("video/")) {
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

  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      toast.success("Conversa excluida com sucesso");
      setSelectedConversationId(null);
      refetchConversations();
    },
    onError: (err: unknown) => {
      toast.error("Erro ao excluir conversa: " + err.message);
    },
  });

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
          replyToMessageId: replyToMsg?.id ?? undefined,
          replyToExternalId: replyToMsg?.externalId,
        });
        setSelectedFile(null);
        setFilePreview(null);
        setMessage("");
        setReplyToMsg(null);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      sendMessageMutation.mutate({
        conversation_id: selectedConversationId,
        content: message,
        replyToMessageId: replyToMsg?.id,
        replyToExternalId: replyToMsg?.externalId,
      });
      setReplyToMsg(null);
    }
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(applyQuickReplyVariables(content, { agentName: user?.name }));
    setShowQuickReplies(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const selectedConversation = conversations?.find(
    c => Number(c.id) === selectedConversationId
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
    } catch (e: unknown) {
      toast.error(e?.message || "Nao foi possivel abrir o CRM");
    }
  };

  return (
    <>
      {/* PDF Preview Modal - deve estar no topo para z-index correto */}
      <PDFPreview
        open={pdfPreview.open}
        onOpenChange={(open) => {
          // Prevenir fechamento imediato após abrir
          if (!open && pdfPreviewJustOpened.current) {
            pdfPreviewJustOpened.current = false;
            return;
          }
          setPdfPreview({ ...pdfPreview, open });
        }}
        url={pdfPreview.url || ""}
        fileName={pdfPreview.fileName}
        messageId={pdfPreview.messageId}
        fileType={pdfPreview.fileType}
      />

      <AgentTopBar />
      <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col md:flex-row">
        {/* Lista de Conversas */}
        <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div>
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

              {/* Botão Nova que abre modal de opções */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowNewOptionsModal(true)}
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
                  onClick={() => handleSelectConversation(Number(conv.id))}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversationId === Number(conv.id)
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : conv.unreadCount > 0 
                        ? "bg-orange-50 border-l-4 border-l-orange-400"
                        : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {conv.customerAvatar ? (
                        <AvatarImage
                          src={getImageSrc(conv.customerAvatar)}
                          alt={conv.customerName || "Contato"}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                          {conv.customerName}
                        </h3>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full animate-pulse">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conv.lastMessagePreview}
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
                          src={getImageSrc(selectedConversation.customerAvatar)}
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

                  <div className="flex flex-wrap items-center gap-2 md:gap-2">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir tudo"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
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
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
              >
                {loadingMessages ? (
                  <div className="text-center text-gray-500">
                    Carregando mensagens...
                  </div>
                ) : filteredMessages && filteredMessages.length > 0 ? (
                  filteredMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`group flex ${msg.senderType === "agent" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === "agent"
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                      >
                        {/* Bug 1 fix: Delete button - appears on hover */}
                        <button
                          onClick={() => {
                            if (confirm("Excluir esta mensagem?")) {
                              deleteMessageMutation.mutate({ messageId: msg.id });
                            }
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity hover:bg-red-600 z-10"
                          title="Excluir mensagem"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {/* Reply button - appears on hover */}
                        <button
                          onClick={() => {
                              setReplyToMsg({ 
                                id: msg.id, 
                                externalId: msg.externalId || undefined,
                                content: msg.content || "" 
                              });
                          }}
                          className="absolute -top-2 -right-18 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity hover:bg-green-600 z-10"
                          title="Responder mensagem"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                        </button>
                        {/* Forward button - appears on hover */}
                        <button
                          onClick={() => {
                            setForwardMessageId(msg.id);
                            setShowForwardDialog(true);
                          }}
                          className="absolute -top-2 -right-10 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity hover:bg-blue-600 z-10"
                          title="Encaminhar mensagem"
                          disabled={forwardMessageMutation.isPending}
                        >
                          <Send className="w-3 h-3" />
                        </button>
                        {/* Nome do remetente */}
                        <p className="text-xs font-bold mb-1 text-black">
                          {msg.senderName || (msg.senderType === "agent" ? "Atendente" : "Cliente")}
                        </p>
                        {/* Quoted/Reply message indicator */}
                        {(msg as any).replyToExternalId && (
                          <div className="mb-2 p-2 bg-green-50 border-l-3 border-green-500 rounded-r text-sm">
                            <p className="text-xs text-green-700 font-medium mb-0.5">Respondendo a:</p>
                            <p className="text-sm text-gray-700 line-clamp-1">
                              {((msg as any).replyToContent || "").length > 100 
                                ? ((msg as any).replyToContent || "Mensagem citada").substring(0, 100) + "..."
                                : ((msg as any).replyToContent || "Mensagem citada")}
                            </p>
                          </div>
                        )}
                        {msg.content && msg.content !== "null" && (
                          <p className="text-sm">{renderContentWithLinks((msg.content.split(String.fromCharCode(10))[0] && msg.content.startsWith("*") ? msg.content.split(String.fromCharCode(10)).slice(1).join(String.fromCharCode(10)) : msg.content))}</p>
                        )}
                        {msg.reaction && (
                          <div className="mt-1 text-lg leading-none">
                            <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 text-sm">
                              {msg.reaction}
                            </span>
                          </div>
                        )}
                        {msg.fileUrl && (
                          <div className="mt-2">
                            <MessageMedia
                              fileUrl={msg.fileUrl}
                              fileType={msg.fileType}
                              fileName={msg.fileName}
                              fileSize={msg.fileSize}
                              messageId={msg.id}
                              onImageClick={() => handleImageClick(msg.id)}
                              onDocumentClick={() => {
                                setPdfPreview({
                                  open: true,
                                  url: msg.fileUrl,
                                  fileName: msg.fileName || undefined,
                                  messageId: msg.id,
                                  fileType: msg.fileType || undefined,
                                });
                              }}
                              isAgent={msg.senderType === "agent"}
                            />
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
              {replyToMsg && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-l-4 border-green-500 rounded text-sm">
                  <CornerUpLeft className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-green-800 truncate flex-1">Respondendo: {replyToMsg.content}</span>
                  <button
                    onClick={() => setReplyToMsg(null)}
                    className="text-green-600 hover:text-green-800 shrink-0"
                    title="Cancelar resposta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                      ) : selectedFile.type?.startsWith?.("video/") ? (
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

                <div className="flex flex-wrap items-center gap-2 md:gap-2">
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

                  <div className="relative" ref={emojiPickerRef}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Emojis"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 z-50">
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          width={350}
                          height={400}
                        />
                      </div>
                    )}
                  </div>

                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                      // Shift+Enter permite nova linha (comportamento padrão do textarea)
                    }}
                    placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                    className="flex-1 min-h-[44px] max-h-48 resize-none"
                    rows={1}
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
                      {getMimeType(item.fileUrl, item.fileType)?.startsWith?.(
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

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Conversa Permanentemente?</DialogTitle>
              <DialogDescription>
                Esta acao nao pode ser desfeita. Isso removera todas as mensagens, midias e o historico desta conversa do sistema.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (selectedConversationId) {
                    deleteConversationMutation.mutate({ id: selectedConversationId });
                    setShowDeleteDialog(false);
                  }
                }}
                disabled={deleteConversationMutation.isPending}
              >
                {deleteConversationMutation.isPending ? "Excluindo..." : "Excluir Permanentemente"}
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
                disabled={closeConversationMutation.isPending || !closeReason}
              >
                Encerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      
        <Dialog open={showCloseAllDialog} onOpenChange={setShowCloseAllDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Encerrar todas as conversas</DialogTitle>
              <DialogDescription>Tem certeza? Esta ação fechará todas as conversas abertas e atribuídas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={closeAllReason} onValueChange={setCloseAllReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Motivo do enecerramento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                  <SelectItem value="conversa_anterior">Conversa anterior</SelectItem>
                  <SelectItem value="engano">Engano</SelectItem>
                </SelectContent>
              </Select>
              <textarea
                value={closeAllMessage}
                onChange={e => setCloseAllMessage(e.target.value)}
                placeholder="Mensagem de encerramento (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCloseAllDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => closeAllConversationMutation.mutate()}
                disabled={closeAllConversationMutation.isPending || closeAllLoading}
              >
                Encerrar Todas
              </Button>
            </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Encaminhar mensagem</DialogTitle>
                          <DialogDescription>Escolha o destino para encaminhar a mensagem</DialogDescription>
                        </DialogHeader>
                        
                        {/* Tipo de destino */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Encaminhar para</label>
                            <Select value={forwardTargetType} onValueChange={setForwardTargetType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de destino" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agent">👤 Outro atendente (sussurro interno)</SelectItem>
                                <SelectItem value="customer">📱 Cliente (WhatsApp/Instagram)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Destino: Atendente */}
                          {forwardTargetType === "agent" && (
                            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <label className="block text-sm font-medium text-gray-700">Atendente destino</label>
                              <Select value={forwardTargetAgentId} onValueChange={setForwardTargetAgentId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um atendente" />
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
                                      Nenhum atendente logado
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Destino: Cliente */}
                          {forwardTargetType === "customer" && (
                            <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                              <label className="block text-sm font-medium text-gray-700">Selecionar cliente</label>
                              <div className="relative">
                                <Select
                                  value={forwardTargetCustomerPhone}
                                  onValueChange={setForwardTargetCustomerPhone}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Digite para buscar ou selecione um cliente recente..." />
                                  </SelectTrigger>
                                  <SelectContent position="popper">
                                    <SelectGroup>
                                      <label className="px-2 py-1.5 text-xs text-gray-500 font-medium">Clientes recentes (últimas interações)</label>
                                      {loadingRecentContacts ? (
                                        <div className="px-2 py-1.5 text-xs text-gray-500">
                                          Carregando...
                                        </div>
                                      ) : recentContacts.length > 0 ? (
                                        recentContacts.map(contact => (
                                          <SelectItem 
                                            key={contact.customerPhone} 
                                            value={contact.customerPhone}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {contact.customerName?.charAt(0)?.toUpperCase() || 'C'}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{contact.customerName}</div>
                                                <div className="text-xs text-gray-500 truncate">{contact.customerPhone}</div>
                                              </div>
                                              <span className="text-xs text-gray-400">
                                                {contact.channel === 'whatsapp' ? '📱' : '📷'} {contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString('pt-BR') : 'Sem data'}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="px-2 py-1.5 text-xs text-gray-500">
                                          Nenhum cliente recente encontrado
                                        </div>
                                      )}
                                    </SelectGroup>
                                    <SelectSeparator />
                                    <SelectItem value="__manual__">
                                      <div className="flex items-center gap-2 text-blue-600">
                                        <Plus className="w-4 h-4" />
                                        <span>Inserir número manualmente</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Input manual quando selecionado "Inserir número manualmente" */}
                              {forwardTargetCustomerPhone === "__manual__" && (
                                <div className="space-y-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <label className="block text-sm font-medium text-gray-700">Telefone do cliente (com DDD)</label>
                                  <Input
                                    type="tel"
                                    placeholder="Ex: 5511999999999"
                                    value={manualPhoneInput}
                                    onChange={e => setManualPhoneInput(e.target.value)}
                                    className="w-full"
                                  />
                                  <label className="block text-sm font-medium text-gray-700 mt-2">Canal</label>
                                  <Select value={forwardTargetProvider} onValueChange={setForwardTargetProvider}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o canal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                                      <SelectItem value="instagram">📷 Instagram</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (!forwardMessageId) return;
                              
                              if (forwardTargetType === "agent") {
                                if (
                                  !forwardTargetAgentId ||
                                  forwardTargetAgentId === "none"
                                ) {
                                  toast.error("Selecione um atendente");
                                  return;
                                }
                                forwardMessageMutation.mutate({
                                  messageId: forwardMessageId,
                                  targetAgentId: Number(forwardTargetAgentId),
                                });
                              } else if (forwardTargetType === "customer") {
                                if (!forwardTargetCustomerPhone.trim()) {
                                  toast.error("Informe o telefone do cliente");
                                  return;
                                }
                                if (!forwardTargetProvider) {
                                  toast.error("Selecione o canal (WhatsApp/Instagram)");
                                  return;
                                }
                                forwardMessageMutation.mutate({
                                  messageId: forwardMessageId,
                                  targetCustomerPhone: forwardTargetCustomerPhone.replace(/\D/g, ""),
                                  targetProvider: forwardTargetProvider,
                                });
                              }
                            }}
                            disabled={forwardMessageMutation.isPending}
                          >
                            Encaminhar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

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
        onSuccess={(conversationId) => {
          refetchConversations();
          // Selecionar automaticamente a conversa criada/reaberta
          if (conversationId) {
            setSelectedConversationId(conversationId);
            sessionStorage.setItem('selectedConversationId', String(conversationId));
          }
        }}
      />

      <PullConversationModal
        open={showPullConversation}
        onOpenChange={setShowPullConversation}
        onSuccess={refetchConversations}
      />

      {/* Modal de Opções "Nova" */}
      <Dialog open={showNewOptionsModal} onOpenChange={setShowNewOptionsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowNewOptionsModal(false);
                setShowNewConversation(true);
              }}
              className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Digitar número / email</div>
                <div className="text-sm text-gray-500">Iniciar conversa com novo contato</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowNewOptionsModal(false);
                setShowNewConversation(true);
              }}
              className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Buscar nos contatos</div>
                <div className="text-sm text-gray-500">Encontrar cliente existente</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowNewOptionsModal(false);
                setShowBroadcastModal(true);
              }}
              className="flex items-center gap-3 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-left"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-white">Lista de Transmissão</div>
                <div className="text-sm text-blue-100">Enviar mensagem para até 50 contatos</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showCRMPanel && crmCustomerId ? (
        <CRMPanel
          open={showCRMPanel}
          onOpenChange={setShowCRMPanel}
          customerId={crmCustomerId}
          customerName={crmCustomerName}
          customerPhone={crmCustomerPhone}
        />
      ) : null}
      {/* Broadcast List Modal */}
      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lista de Transmissão</DialogTitle>
          </DialogHeader>
          <BroadcastListManager onClose={() => setShowBroadcastModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        open={imageLightbox.open}
        onOpenChange={(open) => setImageLightbox({ ...imageLightbox, open })}
        images={imageItems}
        initialIndex={imageLightbox.initialIndex}
      />
    </>
  );
}
// Build fix Sat Feb 28 11:21:28 -03 2026
// Deploy refresh Mon Mar 2 08:05:00 -03 2026
// Force rebuild Wed Mar  4 10:56:06 -03 2026
// Build timestamp: 20260318-191559

/* Mobile adjustments applied */
