import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // IMPORTANTE: Só redireciona se realmente não está carregando
    // Isso evita race condition onde o componente monta antes do auth.me responder
    if (!isLoading && !user) {
      // Pequeno delay para garantir que o cookie foi lido
      const timer = setTimeout(() => {
        setLocation("/login");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, setLocation]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A859]"></div>
      </div>
    );
  }

  // Se não há usuário, mostra loading (redirecionamento acontece no useEffect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A859]"></div>
      </div>
    );
  }

  // Se há usuário, renderiza o conteúdo protegido
  return <>{children}</>;
}
