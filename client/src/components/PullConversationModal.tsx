import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

interface PullConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function PullConversationModal({ open, onOpenChange, onSuccess }: PullConversationModalProps) {
  const { data: queues, isLoading } = trpc.queues.listWithCounts.useQuery();

  const pullConversationMutation = trpc.queues.pullConversation.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
  });

  const handlePullFromQueue = (queueId: string) => {
    pullConversationMutation.mutate({ queueId: parseInt(queueId, 10) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Puxar Atendimento</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : queues && queues.length > 0 ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => onOpenChange(false)}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <div className="text-left">
                  <div className="font-medium">Incluir sala de espera</div>
                  <div className="text-sm text-gray-500">Puxar mais antigo</div>
                </div>
              </div>
            </Button>

            {queues.map((queue) => (
              <Button
                key={queue.id}
                variant="outline"
                className="w-full justify-between h-auto py-3"
                onClick={() => handlePullFromQueue(queue.id)}
                disabled={pullConversationMutation.isPending || queue.waitingCount === 0}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="text-left">
                    <div className="font-medium">{queue.name}</div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600">
                  {queue.waitingCount}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Nenhuma fila disponível
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
