import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface QuickReply {
  id: number;
  title: string;
  content: string;
  category: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function QuickRepliesManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
  });

  const { data: replies, refetch } = trpc.quickReplies.list.useQuery({
    search: searchQuery || undefined,
  });

  const createMutation = trpc.quickReplies.create.useMutation();
  const updateMutation = trpc.quickReplies.update.useMutation();
  const deleteMutation = trpc.quickReplies.delete.useMutation();

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        title: reply.title,
        content: reply.content,
        category: reply.category || '',
      });
    } else {
      setEditingReply(null);
      setFormData({ title: '', content: '', category: '' });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingReply(null);
    setFormData({ title: '', content: '', category: '' });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e conteúdo são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingReply) {
        await updateMutation.mutateAsync({
          id: editingReply.id,
          title: formData.title,
          content: formData.content,
          category: formData.category || undefined,
        });
        toast({
          title: 'Sucesso',
          description: 'Resposta rápida atualizada com sucesso',
        });
      } else {
        await createMutation.mutateAsync({
          title: formData.title,
          content: formData.content,
          category: formData.category || undefined,
        });
        toast({
          title: 'Sucesso',
          description: 'Resposta rápida criada com sucesso',
        });
      }
      refetch();
      handleCloseDialog();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a resposta',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta resposta rápida?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast({
        title: 'Sucesso',
        description: 'Resposta rápida deletada com sucesso',
      });
      refetch();
    } catch (error: unknown) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar a resposta',
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors: Record<string, string> = {
      'saudacao': 'bg-blue-100 text-blue-800',
      'despedida': 'bg-green-100 text-green-800',
      'informacao': 'bg-purple-100 text-purple-800',
      'pagamento': 'bg-yellow-100 text-yellow-800',
      'endereco': 'bg-orange-100 text-orange-800',
      'produto': 'bg-pink-100 text-pink-800',
    };

    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gerenciar Respostas Rápidas
        </h1>
        <p className="text-gray-600">
          Crie e gerencie mensagens prontas para agilizar o atendimento
        </p>
      </div>

      {/* Barra de Ações */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar respostas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Resposta
          </Button>
        </div>
      </Card>

      {/* Tabela de Respostas */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {replies && replies.length > 0 ? (
              replies.map((reply) => (
                <TableRow key={reply.id}>
                  <TableCell className="font-medium">{reply.title}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {reply.content}
                  </TableCell>
                  <TableCell>
                    {reply.category ? (
                      <Badge className={getCategoryColor(reply.category)}>
                        {reply.category}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(reply)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reply.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Nenhuma resposta rápida encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Título <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ex: Saudação Inicial"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Conteúdo <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Digite o conteúdo da mensagem..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Categoria (opcional)
              </label>
              <Input
                placeholder="Ex: saudacao, despedida, informacao"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Sugestões: saudacao, despedida, informacao, pagamento, endereco, produto
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingReply ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
