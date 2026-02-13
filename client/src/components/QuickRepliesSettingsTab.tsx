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

type QuickReplyRow = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  createdAt?: string | Date;
};

export default function QuickRepliesSettingsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReplyRow | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const listInput = useMemo(
    () => ({ search: searchQuery.trim() || undefined }),
    [searchQuery]
  );

  const utils = (trpc as any).useUtils?.() as any;

  const { data: replies = [], isLoading } = (
    trpc as any
  ).quickReplies.list.useQuery(listInput);
  const createMutation = (trpc as any).quickReplies.create.useMutation();
  const updateMutation = (trpc as any).quickReplies.update.useMutation();
  const deleteMutation = (trpc as any).quickReplies.delete.useMutation();

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setContent("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: QuickReplyRow) => {
    setEditing(row);
    setTitle(row.title || "");
    setContent(row.content || "");
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    resetForm();
  };

  const refresh = async () => {
    try {
      await utils?.quickReplies?.list?.invalidate?.();
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Titulo e texto sao obrigatorios");
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          title: title.trim(),
          content: content.trim(),
        });
        toast.success("Mensagem rapida atualizada");
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          content: content.trim(),
        });
        toast.success("Mensagem rapida criada");
      }
      await refresh();
      closeDialog();
    } catch (e: any) {
      toast.error(e?.message || "Nao foi possivel salvar");
    }
  };

  const handleDelete = async (row: QuickReplyRow) => {
    if (!confirm(`Deletar a mensagem rapida "${row.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: row.id });
      toast.success("Mensagem rapida deletada");
      await refresh();
    } catch (e: any) {
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
              placeholder="Pesquisar mensagens..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Mensagem
          </Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead className="text-right">Funcoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-gray-500"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : replies && replies.length > 0 ? (
              (replies as QuickReplyRow[]).map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell className="max-w-xl truncate">
                    {row.content}
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
                  colSpan={3}
                  className="text-center py-8 text-gray-500"
                >
                  Nenhuma mensagem rapida encontrada
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
              {editing ? "Editar Mensagem Rapida" : "Nova Mensagem Rapida"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titulo *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Saudacao"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Texto *</label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Digite a mensagem..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
