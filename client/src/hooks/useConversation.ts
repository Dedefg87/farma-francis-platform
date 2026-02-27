import { useState, useCallback } from 'react';

interface UseConversationStateReturn {
  selectedConversationId: number | null;
  messageInput: string;
  searchQuery: string;
  isUploading: boolean;
  selectConversation: (id: number | null) => void;
  setMessageInput: (message: string) => void;
  setSearchQuery: (query: string) => void;
  setIsUploading: (uploading: boolean) => void;
  reset: () => void;
}

/**
 * Hook para gerenciar estado de conversas
 * Centraliza lógica de seleção, input, busca
 */
export function useConversationState(): UseConversationStateReturn {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const selectConversation = useCallback((id: number | null) => {
    setSelectedConversationId(id);
    setMessageInput(''); // Limpar input ao trocar conversa
  }, []);

  const reset = useCallback(() => {
    setSelectedConversationId(null);
    setMessageInput('');
    setSearchQuery('');
    setIsUploading(false);
  }, []);

  return {
    selectedConversationId,
    messageInput,
    searchQuery,
    isUploading,
    selectConversation,
    setMessageInput,
    setSearchQuery,
    setIsUploading,
    reset,
  };
}
