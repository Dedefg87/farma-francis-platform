import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook para buscar e gerenciar tags de conversas
 */
export function useConversationTags(conversations: Array<{ provider: string; fromNumber: string }> | undefined) {
  const [conversationTags, setConversationTags] = useState<Record<string, Array<{id: number, name: string, color: string}>>>({});
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!conversations) return;

    // Buscar tags para cada conversa
    const fetchTags = async () => {
      for (const conv of conversations) {
        const convId = `${conv.provider}-${conv.fromNumber}`;
        try {
          const tags = await utils.tags.getConversationTags.fetch({ conversationId: convId });
          setConversationTags(prev => ({ ...prev, [convId]: tags }));
        } catch (error) {
          console.error('Erro ao buscar tags da conversa:', convId, error);
        }
      }
    };

    fetchTags();
  }, [conversations, utils]);

  return conversationTags;
}
