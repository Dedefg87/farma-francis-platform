import { ReactNode, createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Verificar se há token no localStorage ou cookie
  const hasToken = !!localStorage.getItem("authToken") || document.cookie.includes("session=");

  // IMPORTANTE: enabled: hasToken previne a query de rodar antes do login
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken, // ⭐ SÓ RODA SE HOUVER TOKEN
  });

  const isAuthenticated = !!user && hasToken;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
