import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ValidationResult } from "../hooks/useFlowValidation";

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ValidationResult | null;
  onConfirm: () => void;
}

export function ValidationDialog({
  open,
  onOpenChange,
  result,
  onConfirm,
}: ValidationDialogProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                Erros no Fluxo
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Avisos no Fluxo
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Fluxo Válido
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                Corrija os seguintes erros:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">
                Avisos (opcional):
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasErrors && !hasWarnings && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                O fluxo está válido e pronto para ser salvo.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {hasErrors ? (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Corrigir
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={onConfirm}>
                  {hasWarnings ? "Salvar mesmo assim" : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
