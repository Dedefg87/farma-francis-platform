import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Mail, Phone, Briefcase, ShieldAlert, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Employees() {
  const { user } = useAuth();
  const { data: employees = [], isLoading } = trpc.employees.list.useQuery();

  // Proteção: apenas admins podem acessar
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
            <CardDescription className="text-center">
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar funcionários.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    position: "",
    department: "",
    status: "active",
    role: "user",
    password: "",
    confirmPassword: "",
  });

  const utils = trpc.useUtils();

  const createEmployee = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Funcionário criado com sucesso!");
      utils.employees.list.invalidate();
      setIsDialogOpen(false);
      setNewEmployee({
        name: "",
        email: "",
        cpf: "",
        phone: "",
        position: "",
        department: "",
        status: "active",
        role: "user",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar funcionário: ${error.message}`);
    },
  });

  const deleteEmployee = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("Funcionário excluído com sucesso!");
      utils.employees.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir funcionário: ${error.message}`);
    },
  });

  const updateEmployee = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Funcionário atualizado com sucesso!");
      utils.employees.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar funcionário: ${error.message}`);
    },
  });

  const handleDeleteEmployee = (userId: number, userName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir ${userName}? Esta ação não pode ser desfeita.`)) {
      deleteEmployee.mutate({ userId });
    }
  };

  const handleEditEmployee = (emp: any) => {
    setEditingEmployee({
      userId: emp.user.id,
      name: emp.user.name || "",
      email: emp.user.email || "",
      cpf: emp.employee?.cpf || "",
      phone: emp.employee?.phone || "",
      position: emp.employee?.position || "",
      department: emp.employee?.department || "",
      status: emp.employee?.status || "active",
      role: emp.user.role || "user",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee.name || !editingEmployee.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    updateEmployee.mutate({
      userId: editingEmployee.userId,
      name: editingEmployee.name,
      email: editingEmployee.email,
      cpf: editingEmployee.cpf || undefined,
      phone: editingEmployee.phone || undefined,
      position: editingEmployee.position || undefined,
      department: editingEmployee.department || undefined,
      status: editingEmployee.status as "active" | "inactive" | "vacation",
      role: editingEmployee.role as "admin" | "user",
    });
  };

  const handleCreateEmployee = () => {
    if (!newEmployee.name || !newEmployee.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    if (!newEmployee.password) {
      toast.error("Senha é obrigatória");
      return;
    }
    if (newEmployee.password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newEmployee.password !== newEmployee.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    // Enviar dados sem confirmPassword e com tipos corretos
    const { confirmPassword, ...employeeData } = newEmployee;
    createEmployee.mutate({
      ...employeeData,
      status: employeeData.status as "active" | "inactive" | "vacation",
      role: "user", // Forçar sempre como user
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    const user = emp.user;
    const employee = emp.employee;
    if (!user) return false;
    
    // Filtro de busca
    const matchesSearch = (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Filtro de departamento
    const matchesDepartment = !filterDepartment || employee?.department === filterDepartment;
    
    // Filtro de status
    const matchesStatus = !filterStatus || employee?.status === filterStatus;
    
    // Filtro de cargo
    const matchesPosition = !filterPosition || employee?.position?.toLowerCase().includes(filterPosition.toLowerCase());
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesPosition;
  });

  // Paginação
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Resetar para página 1 quando filtros mudarem
  const resetPagination = () => setCurrentPage(1);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      vacation: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-800",
      user: "bg-blue-100 text-blue-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getUserInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-500 mt-1">Gerenciamento de equipe e permissões</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo funcionário
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome de Usuário * <span className="text-xs text-muted-foreground">(usado para login)</span></Label>
                  <Input
                    placeholder="Ex: joao.silva"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={newEmployee.cpf}
                    onChange={(e) => setNewEmployee({ ...newEmployee, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    placeholder="Ex: Atendente"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={newEmployee.department} onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atendimento">Atendimento</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="suporte">Suporte</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="ti">TI</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newEmployee.status} onValueChange={(value) => setNewEmployee({ ...newEmployee, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="vacation">Férias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Senha *</Label>
                  <Input
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={newEmployee.confirmPassword}
                    onChange={(e) => setNewEmployee({ ...newEmployee, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateEmployee} disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? "Criando..." : "Criar Funcionário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Funcionário</DialogTitle>
                <DialogDescription>
                  Atualize os dados do funcionário
                </DialogDescription>
              </DialogHeader>
              {editingEmployee && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome de Usuário * <span className="text-xs text-muted-foreground">(usado para login)</span></Label>
                    <Input
                      placeholder="Ex: joao.silva"
                      value={editingEmployee.name}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={editingEmployee.email}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={editingEmployee.cpf}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, cpf: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={editingEmployee.phone}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      placeholder="Ex: Atendente"
                      value={editingEmployee.position}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={editingEmployee.department} onValueChange={(value) => setEditingEmployee({ ...editingEmployee, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="atendimento">Atendimento</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="suporte">Suporte</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="ti">TI</SelectItem>
                        <SelectItem value="rh">RH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editingEmployee.status} onValueChange={(value) => setEditingEmployee({ ...editingEmployee, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="vacation">Férias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Select value={editingEmployee.role} onValueChange={(value) => setEditingEmployee({ ...editingEmployee, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateEmployee} disabled={updateEmployee.isPending}>
                  {updateEmployee.isPending ? "Atualizando..." : "Atualizar Funcionário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome, email ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros Avançados */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Departamento</Label>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="suporte">Suporte</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="ti">TI</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="vacation">Férias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cargo</Label>
            <Input
              placeholder="Filtrar por cargo..."
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">&nbsp;</Label>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setFilterDepartment("");
                setFilterStatus("");
                setFilterPosition("");
                setSearchTerm("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter((e) => e.employee?.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {employees.filter((e) => e.user?.role === "admin").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">De Férias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {employees.filter((e) => e.employee?.status === "vacation").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Funcionários</CardTitle>
            <CardDescription>
              {filteredEmployees.length} funcionário(s) encontrado(s) - Página {currentPage} de {totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : paginatedEmployees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum funcionário encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp) => {
                    const user = emp.user;
                    const employee = emp.employee;
                    if (!user) return null;

                    return (
                      <TableRow key={employee?.id || user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-indigo-600 text-white">
                                {getUserInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name || "Sem nome"}</div>
                              <div className="text-sm text-gray-500">{employee?.cpf || "-"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </div>
                            )}
                            {employee?.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-3 h-3 mr-1" />
                                {employee.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee?.position && (
                            <div className="flex items-center text-sm text-gray-700">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {employee.position}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee?.department || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee?.status || "inactive")}>
                            {employee?.status || "inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {employee?.hireDate
                            ? new Date(employee.hireDate).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleEditEmployee(emp)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteEmployee(user.id, user.name || 'este funcionário')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            
            {/* Paginação */}
            {!isLoading && paginatedEmployees.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Itens por página:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEmployees.length)} de {filteredEmployees.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
