import { useState, useEffect } from "react";
import { Edge } from "reactflow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EdgeLabelEditorProps {
  edge: Edge | null;
  open: boolean;
  onClose: () => void;
  onSave: (edgeId: string, label: string) => void;
}

export default function EdgeLabelEditor({
  edge,
  open,
  onClose,
  onSave,
}: EdgeLabelEditorProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (edge) {
      setLabel(String(edge.label || ""));
    }
  }, [edge]);

  const handleSave = () => {
    if (!edge) return;

    onSave(edge.id, label);
    onClose();
  };

  const quickLabels = ["Sim", "Não", "True", "False", "Yes", "No"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conexão</DialogTitle>
          <DialogDescription>
            Configure o rótulo desta conexão entre os nós
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rótulo da Conexão</Label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Sim, Não, True, False"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-500">Rótulos rápidos:</Label>
            <div className="flex flex-wrap gap-2">
              {quickLabels.map(quickLabel => (
                <button
                  key={quickLabel}
                  onClick={() => setLabel(quickLabel)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  {quickLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
