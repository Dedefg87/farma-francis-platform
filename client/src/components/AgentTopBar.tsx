import { useLocation, Link } from 'wouter';
import { MessageSquare, ListOrdered, LogOut, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useEffect, useRef, useState } from 'react';

export default function AgentTopBar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(() => {
    return localStorage.getItem('notificationsMuted') === 'true';
  });
  
  // Ref para rastrear mensagens anteriores
  const previousMessagesRef = useRef<Map<number, number>>(new Map());

  const tabs = [
    {
      name: 'Filas',
      path: '/agent/queues',
      icon: ListOrdered,
    },
    {
      name: 'Mensagens',
      path: '/agent/messages',
      icon: MessageSquare,
    },
  ];

  // Buscar todas as conversas ativas do agente (mesmo sem conversa selecionada)
  const { data: conversations } = trpc.conversations.listActive.useQuery(
    undefined,
    {
      refetchInterval: 2000, // Verificar a cada 2 segundos
      refetchIntervalInBackground: true, // Continuar verificando mesmo em background
    }
  );

  // Efeito para detectar novas mensagens em QUALQUER conversa
  useEffect(() => {
    if (!conversations || notificationsMuted) return;

    let hasNewMessage = false;

    conversations.forEach((conv) => {
      const previousCount = previousMessagesRef.current.get(conv.id) || 0;
      const currentCount = conv.messageCount || conv.unreadCount || 0;

      // Se há mensagens novas e não é a primeira carga
      if (previousCount > 0 && currentCount > previousCount) {
        hasNewMessage = true;
      }

      // Atualizar o ref
      previousMessagesRef.current.set(conv.id, currentCount);
    });

    // Tocar som se há nova mensagem
    if (hasNewMessage) {
      playNotificationSound();
    }
  }, [conversations, notificationsMuted, playNotificationSound]);

  // Salvar preferência no localStorage
  const toggleNotifications = () => {
    const newState = !notificationsMuted;
    setNotificationsMuted(newState);
    localStorage.setItem('notificationsMuted', String(newState));
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Nome */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Farma Francis</h1>
              <p className="text-xs text-gray-500">Painel do Agente</p>
            </div>
          </div>

          {/* Tabs de Navegação */}
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location === tab.path;
              return (
                <Link key={tab.path} href={tab.path}>
                  <a
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Info do Usuário + Botão de Som */}
          <div className="flex items-center gap-2">
            {/* Botão de Notificação Sonora */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotifications}
              title={notificationsMuted ? 'Ativar notificações sonoras' : 'Desativar notificações sonoras'}
              className={notificationsMuted ? 'text-gray-400' : 'text-blue-600'}
            >
              {notificationsMuted ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-gray-50"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">Agente</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
