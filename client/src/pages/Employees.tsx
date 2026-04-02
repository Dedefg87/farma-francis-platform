import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTRPC } from '@/utils/trpc';
import type { RouterOutputs } from '@/server/routers';

type Employee = NonNullable<RouterOutputs['employees']['list']>['employees'][number];

export default function EmployeesPage() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ username: '', displayName: '', password: '', role: 'user' as 'user' | 'admin' });
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useTRPC().employees.list.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Reset form quando dialoga fecha
  useEffect(() => {
    if (!openCreate && !openEdit) {
      setFormData({ username: '', displayName: '', password: '', role: 'user' });
      setSelectedEmployee(null);
    }
  }, [openCreate, openEdit]);

  const createMutation = useTRPC().employees.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Funcionário criado' });
      setOpenCreate(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useTRPC().employees.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Funcionário atualizado' });
      setOpenEdit(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useTRPC().employees.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Funcionário excluído' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.displayName || !formData.password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      username: formData.username,
      displayName: formData.displayName,
      password: formData.password,
      role: formData.role,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    updateMutation.mutate({
      userId: selectedEmployee.userId,
      username: formData.username || undefined,
      displayName: formData.displayName || undefined,
      role: formData.role,
      password: formData.password || undefined,
    });
  };

  const openEditDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      username: emp.username,
      displayName: emp.displayName,
      password: '',
      role: emp.role,
    });
    setOpenEdit(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Funcionário</DialogTitle>
              <DialogDescription>Preencha os dados abaixo. O nome de usuário será usado para login.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username">Usuário (login)</Label>
                  <Input id="username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="displayName">Nome de Exibição</Label>
                  <Input id="displayName" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="col-span-3" required minLength={6} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role">Papel</Label>
                  <select id="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })} className="col-span-3 border rounded p-2">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isLoading}>
                  {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Nome de Exibição</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">Nenhum funcionário encontrado</TableCell>
            </TableRow>
          ) : (
            employees.map(emp => (
              <TableRow key={emp.userId}>
                <TableCell className="font-medium">{emp.username}</TableCell>
                <TableCell>{emp.displayName}</TableCell>
                <TableCell>{emp.role === 'admin' ? 'Administrador' : 'Usuário'}</TableCell>
                <TableCell>{emp.status}</TableCell>
                <TableCell>{emp.department || '-'}</TableCell>
                <TableCell>{emp.position || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEditDialog(emp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => {
                      if (confirm('Excluir este funcionário?')) {
                        deleteMutation.mutate({ userId: emp.userId });
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialog de Edição */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username">Usuário</Label>
                <Input id="edit-username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-displayName">Nome de Exibição</Label>
                <Input id="edit-displayName" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password">Nova Senha (deixe vazio para manter)</Label>
                <Input id="edit-password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="col-span-3" minLength={6} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role">Papel</Label>
                <select id="edit-role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })} className="col-span-3 border rounded p-2">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isLoading}>
                {updateMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
