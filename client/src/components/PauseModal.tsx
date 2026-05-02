import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Coffee, Utensils, Clock, AlertCircle } from 'lucide-react';

interface PauseModalProps {
  open: boolean;
  onClose: () => void;
  onPauseStarted: () => void;
}

const pauseTypes = [
  {
    type: 'lunch' as const,
    label: 'Almoço',
    icon: Utensils,
    duration: 60,
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    type: 'snack' as const,
    label: 'Lanche',
    icon: Coffee,
    duration: 15,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    type: 'bathroom' as const,
    label: 'Banheiro',
    icon: Clock,
    duration: 5,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    type: 'other' as const,
    label: 'Outro',
    icon: AlertCircle,
    duration: 10,
    color: 'bg-gray-500 hover:bg-gray-600',
  },
];

export default function PauseModal({ open, onClose, onPauseStarted }: PauseModalProps) {
  const { toast } = useToast();
  const startPause = trpc.pauses.start.useMutation();

  const handleStartPause = async (type: 'lunch' | 'snack' | 'bathroom' | 'other', duration: number) => {
    try {
      await startPause.mutateAsync({
        pauseType: type,
        durationMinutes: duration,
      });

      toast({
        title: 'Pausa iniciada',
        description: `Você está em pausa. Duração estimada: ${duration} minutos.`,
      });

      onPauseStarted();
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Erro ao iniciar pausa',
        description: error.message || 'Não foi possível iniciar a pausa.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Pausa</DialogTitle>
          <DialogDescription>
            Selecione o tipo de pausa. Durante a pausa, você não receberá novos atendimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {pauseTypes.map((pauseType) => {
            const Icon = pauseType.icon;
            return (
              <button
                key={pauseType.type}
                onClick={() => handleStartPause(pauseType.type, pauseType.duration)}
                disabled={startPause.isPending}
                className={`${pauseType.color} text-white p-6 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex flex-col items-center gap-3">
                  <Icon className="w-10 h-10" />
                  <div>
                    <p className="font-semibold text-lg">{pauseType.label}</p>
                    <p className="text-sm opacity-90">{pauseType.duration} min</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Durante a pausa, novas conversas não serão atribuídas a você.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
