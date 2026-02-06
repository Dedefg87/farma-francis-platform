import React, { useState, useEffect, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import AgentTopBar from '@/components/AgentTopBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Clock, User, Send, Paperclip, Smile, ArrowDownUp, Plus, Inbox, BellOff, Bell, Search, Image as ImageIcon, Users, ArrowRightLeft, XCircle, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import QuickRepliesModal from '@/components/QuickRepliesModal';
import NewConversationModal from '@/components/NewConversationModal';
import PullConversationModal from '@/components/PullConversationModal';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';

export default function AgentMessages() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>(() => {
    return localStorage.getItem('conversationSortOrder') || 'newest_last';
  });
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(() => {
    return localStorage.getItem('notificationsMuted') === 'true';
  });
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showPullConversation, setShowPullConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showConferenceDialog, setShowConferenceDialog] = useState(false);
  const [transferAgentId, setTransferAgentId] = useState<string>('');
  const [closeReason, setCloseReason] = useState('conversa_anterior');
  const [conferenceLink, setConferenceLink] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesCountRef = useRef<number>(0);
  const { playNotificationSound } = useNotificationSound();

  // Atualizar localStorage quando ordenação mudar
  useEffect(() => {
    localStorage.setItem('conversationSortOrder', sortOrder);
  }, [sortOrder]);

  // Atualizar localStorage quando notificações mudarem
  useEffect(() => {
    localStorage.setItem('notificationsMuted', String(notificationsMuted));
  }, [notificationsMuted]);

  // Função para calcular badge de tempo
  const getTimeBadge = (lastMessageAt: Date | string | null) => {
    if (!lastMessageAt) return { text: 'Novo', color: 'bg-gray-100 text-gray-600' };
    
    const now = new Date();
    const lastMessage = new Date(lastMessageAt);
    const diffMinutes = Math.floor((now.getTime() - lastMessage.getTime()) / (1000 * 60));

    if (diffMinutes < 5) {
      return { text: `${diffMinutes}min`, color: 'bg-green-100 text-green-700' };
    } else if (diffMinutes < 30) {
      return { text: `${diffMinutes}min`, color: 'bg-yellow-100 text-yellow-700' };
    } else if (diffMinutes < 60) {
      return { text: `${diffMinutes}min`, color: 'bg-red-100 text-red-700' };
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return { text: `${diffHours}h`, color: 'bg-red-100 text-red-700' };
    }
  };

  const sortOptions = [
    { value: 'newest_last', label: 'Por ordem de chegada (mais novos ao final)' },
    { value: 'oldest_first', label: 'Há mais tempo aberto primeiro' },
    { value: 'newest_first', label: 'Há menos tempo aberto primeiro' },
    { value: 'recent_message', label: 'Última mensagem mais recente primeiro' },
    { value: 'unread_first', label: 'Mensagens não lidas primeiro' },
  ];

  // Buscar conversas ativas do agente
  const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } =
    trpc.conversations.listActive.useQuery(undefined, {
      refetchInterval: 2000, // Atualizar a cada 2 segundos
    });

  const { data: loggedAgents } = trpc.conversations.loggedAgents.useQuery(undefined, {
    enabled: showTransferDialog,
  });

  // Filtrar e ordenar conversas
  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    const sorted = [...conversations];

    switch (sortOrder) {
      case 'newest_last':
        return sorted.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
      case 'oldest_first':
        return sorted.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
      case 'newest_first':
        return sorted.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      case 'recent_message':
        return sorted.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
      case 'unread_first':
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
        (conv) =>
          (conv.customerName || '').toLowerCase().includes(query) ||
          conv.customerPhone?.toLowerCase().includes(query) ||
          conv.lastMessage?.toLowerCase().includes(query)
      );
    }

    // Filtro de canal
    if (channelFilter !== 'all') {
      filtered = filtered.filter((conv) => conv.channel === channelFilter);
    }

    return filtered;
  }, [sortedConversations, searchQuery, channelFilter]);

  // Buscar mensagens da conversa selecionada
  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = trpc.messages.list.useQuery(
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
    return messages.filter((msg) => msg.content?.toLowerCase().includes(query));
  }, [messages, messageSearchQuery]);

  const mediaItems = useMemo(() => {
    if (!messages) return [];
    return messages.filter((msg) => msg.fileUrl);
  }, [messages]);

  // Mutation para enviar mensagem
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessage('');
      refetchMessages();
      refetchConversations();
    },
    onError: (error) => {
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
      toast.success('Conversa transferida com sucesso');
      setShowTransferDialog(false);
      setTransferAgentId('');
      refetchConversations();
      setSelectedConversationId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao transferir: ${error.message}`);
    },
  });

  const closeConversationMutation = trpc.conversations.close.useMutation({
    onSuccess: () => {
      toast.success('Conversa encerrada');
      setShowCloseDialog(false);
      setSelectedConversationId(null);
      refetchConversations();
    },
    onError: (error) => {
      toast.error(`Erro ao encerrar: ${error.message}`);
    },
  });

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      if (lastMessage.senderType === 'customer' && !notificationsMuted) {
        playNotificationSound();
      }
    }

    // Atualizar contador
    previousMessagesCountRef.current = currentCount;
  }, [messages, notificationsMuted, playNotificationSound]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversationId) return;

    sendMessageMutation.mutate({
      conversation_id: selectedConversationId,
      content: message,
    });
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
    setShowQuickReplies(false);
  };

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId);

  return (
    <>
      <AgentTopBar />
      <div className="h-[calc(100vh-64px)] bg-gray-50 flex">
        {/* Lista de Conversas */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Conversas Ativas</h2>
                <p className="text-sm text-gray-500">
                  {filteredConversations.length} de {conversations?.length || 0} atendimentos
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
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
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortOrder(option.value)}
                      className={sortOrder === option.value ? 'bg-blue-50 text-blue-600' : ''}
                    >
                      {sortOrder === option.value && '✓ '}
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
                title={notificationsMuted ? 'Ativar notificações' : 'Silenciar notificações'}
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
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversationId === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {conv.customerAvatar ? (
                        <AvatarImage src={conv.customerAvatar} alt={conv.customerName || 'Contato'} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{conv.customerName}</h3>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Badge de tempo */}
                        {(() => {
                          const badge = getTimeBadge(conv.lastMessageAt);
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                              {badge.text}
                            </span>
                          );
                        })()}
                        
                        {/* Badge de canal */}
                        <span className="text-xs text-gray-500">
                          {conv.channel === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}
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
                        <AvatarImage src={selectedConversation.customerAvatar} alt={selectedConversation.customerName || 'Contato'} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedConversation.customerName}</h3>
                      <p className="text-sm text-gray-500">{selectedConversation.customerPhone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Buscar mensagens"
                      onClick={() => setShowMessageSearch((prev) => !prev)}
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
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="text-center text-gray-500">Carregando mensagens...</div>
                ) : filteredMessages && filteredMessages.length > 0 ? (
                  filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === 'agent'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <span
                          className={`text-xs mt-1 block ${
                            msg.senderType === 'agent' ? 'text-blue-100' : 'text-gray-500'
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
                  <div className="text-center text-gray-500">Nenhuma mensagem encontrada</div>
                ) : (
                  <div className="text-center text-gray-500">Nenhuma mensagem ainda</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de Mensagem */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center gap-2">
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
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />

                  <Button onClick={handleSendMessage} disabled={!message.trim()}>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione uma conversa</h3>
                <p className="text-gray-500">Escolha uma conversa à esquerda para começar a atender</p>
              </div>
            </div>
          )}
        </div>

        <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Midias compartilhadas</DialogTitle>
              <DialogDescription>Arquivos enviados nesta conversa</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {mediaItems.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma midia encontrada.</div>
              ) : (
                mediaItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {item.fileType?.startsWith('image/') && item.fileUrl ? (
                        <img src={item.fileUrl} alt={item.fileName || 'midia'} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.fileName || item.content || 'Midia'}</p>
                        <p className="text-xs text-gray-500">{item.fileType || 'arquivo'}</p>
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

        <Dialog open={showConferenceDialog} onOpenChange={setShowConferenceDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Convidados</DialogTitle>
              <DialogDescription>Crie uma sala temporaria e compartilhe o link</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input value={conferenceLink} readOnly />
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(conferenceLink);
                    toast.success('Link copiado');
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
              <DialogDescription>Selecione um agente logado para transferir</DialogDescription>
            </DialogHeader>
            <Select value={transferAgentId} onValueChange={setTransferAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                {loggedAgents && loggedAgents.length > 0 ? (
                  loggedAgents.map((agent) => (
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
                  if (!transferAgentId || transferAgentId === 'none' || !selectedConversationId) {
                    toast.error('Selecione um agente');
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
                <SelectItem value="conversa_anterior">Conversa anterior</SelectItem>
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
    </>
  );
}
