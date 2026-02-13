/**
 * Componente de sugestões de resposta por IA
 * Analisa a pergunta do cliente e sugere 3 opções de resposta
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";

interface AISuggestionsProps {
  customerMessage: string;
  customerName: string;
  onSelectSuggestion: (suggestion: string) => void;
}

export function AISuggestions({
  customerMessage,
  customerName,
  onSelectSuggestion,
}: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const suggestMutation = trpc.ai.suggestResponses.useMutation({
    onSuccess: data => {
      setSuggestions(data.suggestions);
    },
  });

  useEffect(() => {
    if (customerMessage) {
      suggestMutation.mutate({
        customerMessage,
        customerName,
      });
    }
  }, [customerMessage]);

  const handleSelect = (suggestion: string, index: number) => {
    setSelectedIndex(index);
    onSelectSuggestion(suggestion);
  };

  if (suggestMutation.isPending) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Gerando sugestões de resposta...</span>
        </div>
      </Card>
    );
  }

  if (suggestMutation.isError) {
    return (
      <Card className="p-4">
        <div className="text-sm text-destructive">
          Erro ao gerar sugestões: {suggestMutation.error.message}
        </div>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Sugestões de Resposta</h3>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSelect(suggestion, index)}
            className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary hover:bg-primary/5 ${
              selectedIndex === index
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <div className="flex items-start gap-2">
              {selectedIndex === index && (
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm flex-1">{suggestion}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        💡 Clique em uma sugestão para usá-la como base. Você pode editá-la
        antes de enviar.
      </p>
    </Card>
  );
}
