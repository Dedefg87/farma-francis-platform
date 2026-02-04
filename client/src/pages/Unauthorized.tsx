import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Unauthorized() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-6">
            <ShieldX className="h-16 w-16 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="text-lg text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500">
            Esta área é restrita apenas para administradores.
          </p>
        </div>

        <div className="flex gap-4 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
          >
            Voltar para Início
          </Button>
          <Button
            onClick={() => setLocation("/login")}
          >
            Fazer Login
          </Button>
        </div>
      </div>
    </div>
  );
}
