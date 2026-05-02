import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ScriptRow = {
  code: string;
  name: string;
  template: string;
  variables: string[];
  isActive: number;
};

export default function CrmScriptsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScriptRow | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [variablesCsv, setVariablesCsv] = useState("nome,remedio,data");
  const [isActive, setIsActive] = useState(true);

  const utils = (trpc as any).useUtils?.() as any;

  const { data: scripts = [], isLoading } = (
    trpc as any
  ).crm.scripts.list.useQuery();

  const upsertMutation = (trpc as any).crm.scripts.upsert.useMutation();
  const deleteMutation = (trpc as any).crm.scripts.delete.useMutation();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scripts as ScriptRow[];
    return (scripts as ScriptRow[]).filter(s =>
      `${s.code} ${s.name} ${s.template}`.toLowerCase().includes(q)
    );
  }, [scripts, searchQuery]);

  const resetForm = () => {
    setEditing(null);
    setCode("");
    setName("");
    setTemplate("");
    setVariablesCsv("nome,remedio,data");
    setIsActive(true);
  };

  const refresh = async () => {
    try {
      await utils?.crm?.scripts?.list?.invalidate?.();
      await utils?.crm?.getScripts?.invalidate?.();
    } catch {
      // ignore
    }
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: ScriptRow) => {
    setEditing(row);
    setCode(row.code);
    setName(row.name);
    setTemplate(row.template);
    setVariablesCsv((row.variables || []).join(","));
    setIsActive(row.isActive === 1);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    resetForm();
  };

  const parseVars = (v: string) => {
    return v
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim() || !template.trim()) {
      toast.error("Codigo, nome e template sao obrigatorios");
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        template: template,
        variables: parseVars(variablesCsv),
        isActive: isActive ? 1 : 0,
      });
      toast.success("Script salvo");
      await refresh();
      closeDialog();
    } catch (e: unknown) {
      toast.error(e?.message || "Nao foi possivel salvar");
    }
  };

  const handleDelete = async (row: ScriptRow) => {
    if (!confirm(`Deletar o script "${row.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ code: row.code });
      toast.success("Script deletado");
      await refresh();
    } catch (e: unknown) {
      toast.error(e?.message || "Nao foi possivel deletar");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Pesquisar scripts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Script
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-3">
          Variaveis suportadas no template: {"{nome}"}, {"{remedio}"},{" "}
          {"{data}"}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map(row => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono text-xs">
                    {row.code}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="max-w-xl truncate">
                    {row.template}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.isActive === 1 ? "default" : "secondary"}
                    >
                      {row.isActive === 1 ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(row)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(row)}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  Nenhum script encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open}
        onOpenChange={v => (v ? setOpen(true) : closeDialog())}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Script" : "Novo Script"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Codigo *</label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="ex: alerta_fim"
                disabled={!!editing}
              />
              <div className="text-xs text-muted-foreground">
                Usado como identificador (sem espacos).
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Alerta de Fim de Medicamento"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template *</label>
              <Textarea
                value={template}
                onChange={e => setTemplate(e.target.value)}
                rows={6}
                placeholder="Digite o texto..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Variaveis (CSV)</label>
              <Input
                value={variablesCsv}
                onChange={e => setVariablesCsv(e.target.value)}
                placeholder="nome,remedio,data"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="script-active"
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              <label htmlFor="script-active" className="text-sm">
                Ativo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
