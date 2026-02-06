import React, { useState, useEffect, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import AgentTopBar from '@/components/AgentTopBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Clock, User, Send, Paperclip, Smile, ArrowDownUp, Plus, Inbox, BellOff, Bell, Search } from 'lucide-react';
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
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.customerName}</h3>
                    <p className="text-sm text-gray-500">{selectedConversation.customerPhone}</p>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="text-center text-gray-500">Carregando mensagens...</div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg) => (
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
