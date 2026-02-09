import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, QrCode, RefreshCw } from "lucide-react";
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

export default function QrCodeModal({ 
  open, 
  onOpenChange, 
  apiUrl, 
  apiKey, 
  instanceName 
}: QrCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQr = trpc.apiConfig.generateQrCode.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setIsGenerating(false);
      toast.success(data.message);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast.error("Preencha a URL, API Key e Instance Name primeiro");
      return;
    }
    
    setIsGenerating(true);
    generateQr.mutate({
      apiUrl: apiUrl.replace(/\/$/, ""),
      apiKey,
      instanceName,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      handleGenerate();
    } else {
      setQrCode(null);
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
            O código expira em alguns segundos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
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
