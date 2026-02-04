import React, { useState } from 'react';
import { Bell, Check, X, AlertCircle, CheckCircle, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { trpc } from '@/lib/trpc';

interface Notification {
  id: number;
  type: 'flow_activated' | 'flow_deactivated' | 'execution_failed' | 'execution_completed' | 'variable_changed' | 'system';
  title: string;
  message: string;
  flowId?: number;
  executionId?: number;
  read: boolean;
  createdAt: Date;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  // Mock data - substituir por trpc query real
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'execution_failed',
      title: 'Execução Falhou',
      message: 'O fluxo "Qualificação de Leads" falhou devido a timeout na API',
      flowId: 2,
      executionId: 123,
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: 2,
      type: 'flow_activated',
      title: 'Fluxo Ativado',
      message: 'O fluxo "Boas-vindas WhatsApp" foi ativado com sucesso',
      flowId: 1,
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: 3,
      type: 'execution_completed',
      title: 'Execução Concluída',
      message: 'O fluxo "FAQ Automático" foi concluído em 2.3s',
      flowId: 3,
      executionId: 122,
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'execution_failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'execution_completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'flow_activated':
      case 'flow_deactivated':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'variable_changed':
        return <Settings className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const markAsRead = (id: number) => {
    // Implementar com trpc mutation
    console.log('Mark as read:', id);
  };

  const markAllAsRead = () => {
    // Implementar com trpc mutation
    console.log('Mark all as read');
  };

  const deleteNotification = (id: number) => {
    // Implementar com trpc mutation
    console.log('Delete notification:', id);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-accent transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.createdAt, { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center">
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Hook para gerenciar notificações
 */
export function useNotifications() {
  // Implementar lógica real com tRPC
  const showNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    console.log('Show notification:', notification);
    // Adicionar notificação via tRPC mutation
  };

  const markAsRead = (id: number) => {
    console.log('Mark as read:', id);
    // Marcar como lida via tRPC mutation
  };

  const deleteNotification = (id: number) => {
    console.log('Delete notification:', id);
    // Deletar via tRPC mutation
  };

  return {
    showNotification,
    markAsRead,
    deleteNotification,
  };
}
