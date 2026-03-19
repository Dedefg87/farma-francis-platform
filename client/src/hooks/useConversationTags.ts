import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook para buscar e gerenciar tags de conversas
 * NOTA: Funcionalidade desabilitada temporariamente até implementação do backend
 */
export function useConversationTags(conversations: Array<{ provider: string; fromNumber: string }> | undefined) {
  // TODO: Implement when backend endpoint available
  const [conversationTags, setConversationTags] = useState<Record<string, Array<{id: number, name: string, color: string}>>>({});

  useEffect(() => {
    // Placeholder - no fetch
  }, [conversations]);

  return conversationTags;
}
