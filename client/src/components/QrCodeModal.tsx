import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, QrCode, RefreshCw, Link2, Link2Off, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

interface QrResponse {
  success: boolean;
  qrCode?: string | null;
  message: string;
  debug?: string;
  justCreated?: boolean;
  hint?: string;
}

export default function QrCodeModal({ 
  open, 
  onOpenChange, 
  apiUrl, 
  apiKey, 
  instanceName 
}: QrCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const generateQr = trpc.apiConfig.generateQrCode.useMutation({
    onSuccess: (data: QrResponse) => {
      setIsGenerating(false);
      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
        setErrorInfo(null);
        toast.success(data.message);
      } else if (data.success && !data.qrCode && data.message) {
        // Instance was just created, need to retry
        setQrCode(null);
        setErrorInfo(null);
        toast.info(data.message);
      } else {
        // Failed
        setQrCode(null);
        setErrorInfo(data.debug || data.message);
        toast.error(data.message);
      }
    },
    onError: (error) => {
      setIsGenerating(false);
      setErrorInfo(error.message);
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast.error("Preencha a URL, API Key e Instance Name primeiro");
      return;
    }
    
    setIsGenerating(true);
    setErrorInfo(null);
    setQrCode(null);
    generateQr.mutate({
      apiUrl: apiUrl.replace(/\/$/, ""),
      apiKey,
      instanceName,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setQrCode(null);
      setErrorInfo(null);
      handleGenerate();
    } else {
      setQrCode(null);
      setErrorInfo(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com o WhatsApp para conectar sua conta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos...</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={qrCode} 
                  alt="QR Code para conectar WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no seu celular → Configurações → Dispositivos vinculados → 
                Vincular um dispositivo
              </p>
            </div>
          ) : errorInfo ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 w-full">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Erro ao gerar QR Code</span>
                </div>
                <p className="text-sm text-red-700">{errorInfo}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-100 p-8 rounded-lg border flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Clique em "Gerar QR Code" para começar
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar Novamente
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
