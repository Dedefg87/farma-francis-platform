import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { user, isLoading: loading } = useAuth();
  const isAuthenticated = !!user;

  // Redirect based on role if authenticated
  if (isAuthenticated && user) {
    console.log('[HOME.TSX] Usuário autenticado detectado:', {
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin'
    });
    
    if (user.role === 'admin') {
      console.log('[HOME.TSX] Redirecionando ADMIN para /dashboard');
      window.location.href = "/dashboard";
    } else {
      console.log('[HOME.TSX] Redirecionando USER para /agent/queues');
      window.location.href = "/agent/queues";
    }
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Farma Francis
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Plataforma Completa de Gestão e Atendimento ao Cliente
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Gerencie atendimentos, CRM, automações e muito mais em uma única plataforma robusta e escalável.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Acessar Plataforma
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Analítico</h3>
            <p className="text-gray-600">
              Visualize métricas em tempo real com gráficos interativos e KPIs personalizados.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">CRM Completo</h3>
            <p className="text-gray-600">
              Gerencie clientes, leads e funil de vendas com histórico completo de interações.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎫</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Tickets</h3>
            <p className="text-gray-600">
              Atendimentos organizados com filas, priorização e SLA configurável.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp & Instagram</h3>
            <p className="text-gray-600">
              Integração completa com APIs oficiais para automação de mensagens.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Automação & URA</h3>
            <p className="text-gray-600">
              Fluxos configuráveis com respostas automáticas e direcionamento inteligente.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Assistente IA</h3>
            <p className="text-gray-600">
              Processamento de linguagem natural para análise e sugestões automáticas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
