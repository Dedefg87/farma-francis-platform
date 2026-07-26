import { useLocation, Link } from "wouter";
import {
  MessageSquare,
  ListOrdered,
  LogOut,
  Bell,
  BellOff,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { hasSession } from "@/lib/auth";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useEffect, useRef, useState } from "react";

export default function AgentTopBar({ compact = false }: { compact?: boolean }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const [notificationsMuted, setNotificationsMuted] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("notificationsMuted") === "true";
    } catch {
      return false;
    }
  });

  // Ref para rastrear mensagens anteriores
  const previousMessagesRef = useRef<Map<number, number>>(new Map());

  const tabs = [
    {
      name: "Filas",
      path: "/agent/queues",
      icon: ListOrdered,
    },
    {
      name: "Mensagens",
      path: "/agent/messages",
      icon: MessageSquare,
    },
  ];

  // Buscar todas as conversas ativas do agente (mesmo sem conversa selecionada)
  const { data: conversations } = trpc.conversations.listActive.useQuery(
    undefined,
    {
      enabled: hasSession(),
      refetchInterval: 1000, // Verificar a cada 1 segundo
      refetchIntervalInBackground: true, // Continuar verificando mesmo em background
    }
  );

  // Efeito para detectar novas mensagens em QUALQUER conversa
  useEffect(() => {
    if (!conversations || notificationsMuted) return;

    let hasNewMessage = false;

    conversations.forEach(conv => {
// @ts-ignore
      const previousCount = previousMessagesRef.current.get(conv.id) || 0;
      const currentCount = conv.unreadCount || 0;

      // Se há mensagens novas e não é a primeira carga
      if (previousCount > 0 && currentCount > previousCount) {
        hasNewMessage = true;
      }

      // Atualizar o ref
// @ts-ignore
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
    localStorage.setItem("notificationsMuted", String(newState));
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className={compact ? "px-3 py-2" : "container mx-auto px-6"}>
        <div className={`
          flex items-center justify-between h-16
          ${compact ? "flex-row-reverse" : ""}
        `}>
          {/* Logo e Nome (escondido em compact) */}
          {!compact && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FF</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Farma Francis
                  </h1>
                  <p className="text-xs text-gray-500">Painel do Agente</p>
                </div>
              </div>

              {/* Tabs de Navegação (apenas desktop) */}
              <nav className="flex gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = location === tab.path;
                  return (
                    <Link key={tab.path} href={tab.path}>
                      <a
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                          ${
                            isActive
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
            </>
          )}

          {/* Info do Usuário + Botão de Som */}
          <div className="flex items-center gap-2">
            {/* Botão de Notificação Sonora */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotifications}
              title={
                notificationsMuted
                  ? "Ativar notificações sonoras"
                  : "Desativar notificações sonoras"
              }
              className={notificationsMuted ? "text-gray-400" : "text-blue-600"}
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
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-gray-50 ${compact ? "px-1" : ""}`}
                >
                  {!compact && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500">Agente</p>
                    </div>
                  )}
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {user?.photo ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.photo} />
                      </Avatar>
                    ) : (
                      <AvatarFallback className="text-white font-semibold text-sm">
                        {(user?.name ?? '').charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    window.location.href = "/login";
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
