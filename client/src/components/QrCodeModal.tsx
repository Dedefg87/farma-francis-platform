import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, QrCode, RefreshCw, Link2, Link2Off } from "lucide-react";
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
  const [alreadyConnected, setAlreadyConnected] = useState(false);

  const generateQr = trpc.apiConfig.generateQrCode.useMutation({
    onSuccess: (data) => {
      if (data.alreadyConnected) {
        setQrCode(null);
        setAlreadyConnected(true);
        toast.info(data.message);
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setAlreadyConnected(false);
        toast.success(data.message);
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.message);
    },
  });

  const disconnectMutation = trpc.apiConfig.disconnectInstance.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setAlreadyConnected(false);
      // Automatically generate new QR after disconnect
      handleGenerate();
    },
    onError: (error) => {
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

  const handleDisconnect = () => {
    if (!apiUrl || !apiKey || !instanceName) {
      toast.error("Configuração incompleta");
      return;
    }
    
    disconnectMutation.mutate({
      apiUrl: apiUrl.replace(/\/$/, ""),
      apiKey,
      instanceName,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setQrCode(null);
      setAlreadyConnected(false);
      handleGenerate();
    } else {
      setQrCode(null);
      setAlreadyConnected(false);
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
            {alreadyConnected && " A sessão anterior ainda está ativa."}
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
          ) : alreadyConnected ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
                <Link2Off className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  WhatsApp já conectado!
                </p>
                <p className="text-xs text-yellow-600">
                  Para gerar um novo QR Code, você precisa desconectar a sessão atual primeiro.
                </p>
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
          {alreadyConnected ? (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="flex-1"
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <Link2Off className="mr-2 h-4 w-4" />
                  Desconectar e Gerar Novo QR
                </>
              )}
            </Button>
          ) : (
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
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
