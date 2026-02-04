import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Não autenticado - redirecionar para login
      setLocation("/login");
      return;
    }

    if (user.role !== "admin") {
      // Autenticado mas não é admin - redirecionar para unauthorized
      setLocation("/unauthorized");
      return;
    }

    // É admin - permitir acesso
    setShouldRender(true);
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}
