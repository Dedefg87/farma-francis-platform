import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileJson } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importFile: File | null;
  onFileChange: (file: File | null) => void;
  importLoading: boolean;
  importProgress: number;
  onImport: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  importFile,
  onFileChange,
  importLoading,
  importProgress,
  onImport,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Importar Fluxo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Fluxo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Arquivo do Fluxo</Label>
            <Input
              type="file"
              accept=".json,.ivr,.n8n,.zapier,.make"
              onChange={e => onFileChange(e.target.files?.[0] || null)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Formatos suportados: JSON, IVR, N8N, Zapier, Make
            </p>
          </div>
          {importFile && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileJson className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{importFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(importFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
          {importLoading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          )}
          <Button
            onClick={onImport}
            className="w-full"
            disabled={!importFile || importLoading}
          >
            {importLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processando... {importProgress}%
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
