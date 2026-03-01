import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, Sparkles, ArrowRight } from "lucide-react";

interface AutomationEmptyStateProps {
  onCreateFlow: () => void;
  onUseTemplate?: () => void;
}

export function AutomationEmptyState({ onCreateFlow, onUseTemplate }: AutomationEmptyStateProps) {
  return (
    <Card className="p-12 text-center border-0 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Illustration */}
      <div className="relative w-40 h-40 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full animate-pulse" />
        <div className="absolute inset-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center">
          <Workflow className="h-16 w-16 text-blue-400" />
        </div>
        {/* Decorative nodes */}
        <div className="absolute top-2 right-4 h-6 w-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg animate-bounce" />
        <div className="absolute bottom-4 left-2 h-5 w-5 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 shadow-lg animate-bounce delay-150" />
        <div className="absolute top-1/2 right-0 h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg animate-bounce delay-300" />
      </div>

      {/* Content */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Comece a automatizar!
      </h2>
      <p className="text-gray-600 max-w-md mx-auto mb-8">
        Crie fluxos de automação para economizar tempo, responder clientes automaticamente e escalar seu atendimento.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          size="lg"
          onClick={onCreateFlow}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
        >
          <Workflow className="h-5 w-5 mr-2" />
          Criar Primeiro Fluxo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {onUseTemplate && (
          <Button
            size="lg"
            variant="outline"
            onClick={onUseTemplate}
            className="h-12 px-8"
          >
            <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
            Ver Templates
          </Button>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-200">
        <div className="text-left">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3 shadow">
            <span className="text-white text-xl">⚡</span>
          </div>
          <h3 className="font-semibold text-gray-900">Respostas Automáticas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Responda clientes 24/7 sem intervenção manual
          </p>
        </div>
        <div className="text-left">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-3 shadow">
            <span className="text-white text-xl">🎯</span>
          </div>
          <h3 className="font-semibold text-gray-900">Qualificação de Leads</h3>
          <p className="text-sm text-gray-500 mt-1">
            Identifique clientes potenciais automaticamente
          </p>
        </div>
        <div className="text-left">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow">
            <span className="text-white text-xl">📊</span>
          </div>
          <h3 className="font-semibold text-gray-900">Métricas em Tempo Real</h3>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe performance de cada automação
          </p>
        </div>
      </div>
    </Card>
  );
}
