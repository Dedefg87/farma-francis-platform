import { createContext, useContext, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'user';
  loginMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
}

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  const value: AuthContextType = {
    user,
    isLoading,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
