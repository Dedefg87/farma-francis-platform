import { useLocation, Link } from 'wouter';
import { MessageSquare, ListOrdered } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

export default function AgentTopBar() {
  const [location] = useLocation();
  const { user } = useAuth();

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

          {/* Info do Usuário */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">Agente</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
