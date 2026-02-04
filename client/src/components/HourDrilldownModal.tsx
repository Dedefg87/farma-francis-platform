import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, MessageCircle, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HourDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  hour: number;
  date?: string;
}

export function HourDrilldownModal({ isOpen, onClose, hour, date }: HourDrilldownModalProps) {
  const { data, isLoading } = trpc.dashboardDrilldown.getConversationsByHour.useQuery(
    { hour, date, status: 'all' },
    { enabled: isOpen }
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      open: { label: 'Aberto', variant: 'default' },
      assigned: { label: 'Atribuído', variant: 'secondary' },
      closed: { label: 'Fechado', variant: 'outline' },
    };

    const config = variants[status] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'instagram':
        return <MessageCircle className="w-4 h-4 text-pink-600" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Conversas das {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data && data.conversations.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                {data.total} conversa{data.total !== 1 ? 's' : ''} encontrada{data.total !== 1 ? 's' : ''}
              </div>

              <div className="space-y-3">
                {data.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(conversation.channel)}
                          <span className="font-medium">
                            {conversation.customerName || 'Cliente sem nome'}
                          </span>
                          {getStatusBadge(conversation.status)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {conversation.customerPhone || 'Sem telefone'}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(conversation.openedAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>

                          {conversation.assignedTo && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Agente #{conversation.assignedTo}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        ID: {conversation.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conversa encontrada neste horário
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
