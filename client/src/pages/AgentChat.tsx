import { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import QuickRepliesModal from '@/components/QuickRepliesModal';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Search,
  Phone,
  Video,
  Info,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mensagens prontas/respostas rápidas
const quickReplies = [
  "Olá! Como posso ajudar você hoje?",
  "Obrigado por entrar em contato!",
  "Vou verificar isso para você.",
  "Mais alguma coisa em que posso ajudar?",
  "Tenha um ótimo dia!",
];

export default function AgentChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickRepliesModal, setShowQuickRepliesModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, isLoading: conversationsLoading } = trpc.conversations.listActive.useQuery(undefined, {
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const { data: messages, isLoading: messagesLoading } = trpc.messages.list.useQuery(
    { conversation_id: selectedConversation! },
    { 
      enabled: !!selectedConversation,
      refetchInterval: 3000, // Atualizar mensagens a cada 3 segundos
    }
  );

  // Mutations
  const utils = trpc.useUtils();
  
  const uploadFile = trpc.messages.uploadFile.useMutation({
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao fazer upload: ${error.message}`,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: async () => {
      setMessageText('');
      // Invalidar queries para atualizar lista de mensagens e conversas
      await utils.messages.list.invalidate();
      await utils.conversations.listActive.invalidate();
      scrollToBottom();
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao enviar mensagem: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 16MB)
    if (file.size > 16 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Tamanho máximo: 16MB",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não suportado. Use imagens ou documentos PDF/DOCX.",
        variant: "destructive",
      });
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

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleQuickReplySelect = (content: string) => {
    setMessageText(content);
  };

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedConversation) return;

    setIsUploading(true);

    try {
      let fileData = undefined;

      // Se houver arquivo, fazer upload primeiro
      if (selectedFile) {
        // Converter arquivo para base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(selectedFile);
        });

        const base64Data = await base64Promise;

        // Upload do arquivo
        const uploadResult = await uploadFile.mutateAsync({
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
      }

      // Enviar mensagem
      sendMessage.mutate({
        conversation_id: selectedConversation,
        content: messageText.trim() || '(arquivo anexado)',
        ...fileData,
      });

      // Limpar estados
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations?.filter(conv =>
    conv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customerPhone?.includes(searchQuery)
  );

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Lista de Conversas - Sidebar Esquerda */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header da Lista */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversas Ativas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">Carregando...</div>
          ) : filteredConversations && filteredConversations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {conversation.customerName?.charAt(0).toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.customerName || conversation.customerPhone}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMessageAt || conversation.openedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage || 'Sem mensagens'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Nenhuma conversa ativa no momento</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de Chat - Direita */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            {/* Header do Chat */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-500 text-white">
                    {selectedConv.customerName?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConv.customerName || selectedConv.customerPhone}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConv.channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} • {selectedConv.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Transferir conversa</DropdownMenuItem>
                    <DropdownMenuItem>Encerrar atendimento</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Bloquear usuário</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Carregando mensagens...</p>
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isAgent = message.senderType === 'agent';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isAgent
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          {/* Arquivo anexado */}
                          {message.fileUrl && (
                            <div className="mb-2">
                              {message.fileType?.startsWith('image/') ? (
                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={message.fileUrl} 
                                    alt={message.fileName || 'Imagem'}
                                    className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ maxHeight: '300px' }}
                                  />
                                </a>
                              ) : (
                                <a 
                                  href={message.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded border ${
                                    isAgent 
                                      ? 'bg-blue-600 border-blue-400' 
                                      : 'bg-gray-50 border-gray-300'
                                  } hover:opacity-90 transition-opacity`}
                                >
                                  <FileText className="w-5 h-5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{message.fileName}</p>
                                    {message.fileSize && (
                                      <p className={`text-xs ${
                                        isAgent ? 'text-blue-100' : 'text-gray-500'
                                      }`}>
                                        {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    )}
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                          
                          {/* Texto da mensagem */}
                          {message.content && (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                          
                          <span className={`text-xs mt-1 block ${isAgent ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Nenhuma mensagem ainda</p>
                </div>
              )}
            </ScrollArea>

            {/* Respostas Rápidas */}
            {showQuickReplies && (
              <div className="bg-white border-t border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Respostas Rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMessageText(reply);
                        setShowQuickReplies(false);
                      }}
                      className="text-xs"
                    >
                      {reply}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input de Mensagem */}
            <div className="bg-white border-t border-gray-200 p-4">
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

              <div className="flex items-end gap-2">
                <input
                  type="file"
                  id="file-upload-agent"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickRepliesModal(true)}
                  className="mb-1"
                  disabled={isUploading}
                  title="Respostas Rápidas"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mb-1"
                  onClick={() => document.getElementById('file-upload-agent')?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="resize-none"
                    disabled={sendMessage.isPending || isUploading}
                  />
                </div>
                <div className="relative" ref={emojiPickerRef}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mb-1" 
                    disabled={isUploading}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
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
                <Button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !selectedFile) || sendMessage.isPending || isUploading}
                  className="bg-blue-500 hover:bg-blue-600 mb-1"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Modal de Respostas Rápidas */}
            <QuickRepliesModal
              open={showQuickRepliesModal}
              onClose={() => setShowQuickRepliesModal(false)}
              onSelect={handleQuickReplySelect}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500">
                Escolha uma conversa da lista para começar a atender
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
