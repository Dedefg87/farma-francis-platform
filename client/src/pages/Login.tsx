import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username || !password) {
        throw new Error('Por favor, preencha todos os campos');
      }

      // Removida validação de tamanho mínimo da senha
      // if (password.length < 5) { ... }

      // Chamar mutation de login com username (pode ser email ou nome)
      const result = await loginMutation.mutateAsync({ username, password });
      
      console.log('Login bem-sucedido:', result);
      
      // Salvar token no localStorage
      localStorage.setItem('authToken', result.token);
      
      // Invalidar cache do auth.me para forçar recarregamento
      await utils.auth.me.invalidate();
      
      // Aguardar um momento para garantir que o cache foi invalidado
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Buscar dados do usuário para verificar role
      const userData = await utils.auth.me.fetch();
      
      console.log('[LOGIN.TSX] Dados do usuário após login:', {
        name: userData?.name,
        email: userData?.email,
        role: userData?.role,
        isAdmin: userData?.role === 'admin'
      });
      
      // Redirecionar baseado no role
      if (userData?.role === 'admin') {
        console.log('[LOGIN.TSX] Redirecionando ADMIN para /dashboard');
        setLocation('/dashboard');
      } else {
        console.log('[LOGIN.TSX] Redirecionando USER para /agent/queues');
        setLocation('/agent/queues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usuário ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img 
            src="/farma-francis-logo.png" 
            alt="Farma Francis" 
            className="h-20 w-auto"
          />
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Campo Usuário */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Usuário ou E-mail *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin ou admin@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-11 h-12 border-gray-300 focus:border-[#D32F2F] focus:ring-[#D32F2F]"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 border-gray-300 focus:border-[#D32F2F] focus:ring-[#D32F2F]"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Botão Entrar */}
            <Button
              type="submit"
              className="w-full h-12 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Acesso restrito a funcionários autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
