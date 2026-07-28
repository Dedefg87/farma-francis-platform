import { useEffect, useState } from 'react';
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
  const [token, setToken] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();

  // Load Turnstile script and site key from environment
  useEffect(() => {
    // Fetch the site key from an endpoint or meta tag
    // For simplicity, we'll assume it's set in a global variable or meta tag
    // In a real app, you might fetch from /api/env or use a build-time env variable
    // Since we don't have that, we'll try to get it from a meta tag or window variable
    const meta = document.querySelector('meta[name="cloudflare-site-key"]');
    if (meta) {
      const key = meta.getAttribute('content');
      if (key) {
        setSiteKey(key);
        // Load the Turnstile script
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  const handleTurnstileCallback = (token: string) => {
    setToken(token);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!username || !password) {
        throw new Error('Por favor, preencha todos os campos');
      }

      // Turnstile é OPCIONAL: só exige o desafio se a chave estiver configurada.
      // Sem siteKey (meta tag ausente), o login prossegue apenas com usuário/senha,
      // que o backend valida de qualquer forma. Evita travar o acesso em produção.
      const isProduction = import.meta.env.MODE === 'production';
      if (isProduction && !siteKey) {
        console.warn('[Login] Turnstile não configurado (sem site key) — prosseguindo sem desafio de segurança');
      }
      if (isProduction && siteKey && !token) {
        throw new Error('Por favor, complete o desafio de segurança');
      }

      // Chamar mutation de login com o token do Turnstile (só quando há siteKey+token)
      const result = await loginMutation.mutateAsync({ 
        username, 
        password,
        ...(isProduction && siteKey && token ? { cfTurnstileToken: token } : {})
      });
      
      // Redirecionar para a página inicial ou painel após login bem-sucedido
      setLocation('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usuário ou senha incorretos');
      // Resetar o token para forçar novo desafio
      setToken(null);
      // Resetar o widget do Turnstile se estiver carregado
      if (window.turnstile) {
        window.turnstile.reset();
      }
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
            src="/logo-farma-francis.jpg" 
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

            {/* Turnstile Widget (se a chave do site estiver disponível) */}
            {siteKey && (
              <div id="turnstile-container" className="mb-4">
                {/* O widget será renderizado aqui pelo script do Turnstile */}
              </div>
            )}

            {/* Botão Entrar */}
            <Button
              type="submit"
              className={`w-full h-12 ${
                isLoading 
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                  : 'bg-[#D32F2F] hover:#B71C1C text-white'
              } font-medium rounded-lg transition-colors`}
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