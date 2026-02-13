/**
 * Componente de transcrição de áudio usando Whisper API
 * Transcreve áudios do WhatsApp automaticamente
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileAudio, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AudioTranscriptionProps {
  audioUrl: string;
  messageId: number;
  onTranscriptionComplete?: (transcription: string) => void;
}

export function AudioTranscription({
  audioUrl,
  messageId,
  onTranscriptionComplete,
}: AudioTranscriptionProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribeMutation = trpc.ai.transcribeAudio.useMutation({
    onSuccess: data => {
      setTranscription(data.transcription);
      setIsTranscribing(false);
      onTranscriptionComplete?.(data.transcription);
    },
    onError: (err: any) => {
      setError(err.message);
      setIsTranscribing(false);
    },
  });

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    setError(null);
    transcribeMutation.mutate({ audioUrl, messageId });
  };

  return (
    <div className="mt-2 space-y-2">
      {!transcription && !isTranscribing && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTranscribe}
          className="text-xs"
        >
          <FileText className="w-3 h-3 mr-1" />
          Transcrever áudio
        </Button>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Transcrevendo áudio...</span>
        </div>
      )}

      {transcription && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-xs text-muted-foreground mb-1">
                Transcrição:
              </p>
              <p className="text-foreground">{transcription}</p>
            </div>
          </div>
        </div>
      )}

      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
