import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, Mail, Phone, MapPin, Copy, History, Tag, Paperclip, Plus } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CRM() {
  const utils = trpc.useUtils();
  
  // Buscar TODOS os clientes (não só ativos)
  const { data: clients = [], isLoading: customersLoading } = trpc.clients.list.useQuery({});
  
  // MAPEAR: API retorna { customer: {...}, contacts: [...] } → formato esperado pelo CRM
  const customers = clients;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  
  // Formulário novo cliente
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    status: "active" as "active" | "inactive" | "blocked",
    notes: "",
    instagram: "",
  });

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate().catch(() => {});
      toast.success("Cliente criado com sucesso!");
      setIsCustomerDialogOpen(false);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        status: "active",
        notes: "",
        instagram: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    createCustomer.mutate(newCustomer);
  };

  // Filtrar clientes (busca por nome, email, telefone)
  const filteredCustomers = customers?.filter((c: any) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  // Abrir detalhes do cliente
  const openCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Copiar telefone
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).catch(() => {});
    toast.success("Telefone copiado!");
  };

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM - Gestão de Clientes</h1>
            <p className="text-gray-500 mt-1">
              Base completa de clientes (todos os contatos)
            </p>
          </div>
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo cliente
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    placeholder="Ex: Maria Silva"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="maria@exemplo.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    placeholder="@usuario"
                    value={newCustomer.instagram}
                    onChange={(e) => setNewCustomer({ ...newCustomer, instagram: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Rua, número, complemento"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    placeholder="Ex: SP"
                    maxLength={2}
                    value={newCustomer.state}
                    onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Notas sobre o cliente..."
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCustomer} disabled={createCustomer.isPending}>
                  {createCustomer.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Base de Clientes ({filteredCustomers.length})</CardTitle>
            <CardDescription>
              Todos os clientes cadastrados (não só em atendimento)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Interações</TableHead>
                    <TableHead>Última Interação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead> Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{customer.name}</div>
                          {customer.notes && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {customer.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div 
                              className="flex items-center text-sm text-gray-600 cursor-pointer hover:text-indigo-600"
                              onClick={() => copyPhone(customer.phone)}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              {customer.phone}
                              <Copy className="w-3 h-3 ml-1 opacity-50" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.instagram ? (
                          <Badge variant="outline" className="text-pink-600">
                            {customer.instagram}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <History className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{customer.interactionsCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <History className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {customer.lastInteraction 
                              ? new Date(customer.lastInteraction).toLocaleDateString("pt-BR")
                              : 'Sem interações'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          customer.status === 'active' ? "bg-green-100 text-green-800" :
                          customer.status === 'inactive' ? "bg-gray-100 text-gray-800" :
                          "bg-red-100 text-red-800"
                        }>
                          {customer.status === 'active' ? 'Ativo' :
                           customer.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("pt-BR") : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCustomerDetails(customer)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Customer Details Modal */}
        <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
              <DialogDescription>
                {selectedCustomer?.name} - Histórico completo e dados cadastrais
              </DialogDescription>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Dados Cadastrais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <div className="mt-1 text-sm font-medium">{selectedCustomer.name}</div>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <div className="mt-1 text-sm flex items-center gap-2">
                      {selectedCustomer.phone || '-'}
                      {selectedCustomer.phone && (
                        <Copy className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-600" 
                             onClick={() => copyPhone(selectedCustomer.phone)} />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="mt-1 text-sm">{selectedCustomer.email || '-'}</div>
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <div className="mt-1 text-sm">{selectedCustomer.instagram || '-'}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <Badge className={
                        selectedCustomer.status === 'active' ? "bg-green-100 text-green-800" :
                        selectedCustomer.status === 'inactive' ? "bg-gray-100 text-gray-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {selectedCustomer.status === 'active' ? 'Ativo' :
                         selectedCustomer.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label> Cadastro</Label>
                    <div className="mt-1 text-sm">
                      {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString("pt-BR") : '-'}
                    </div>
                  </div>
                </div>

                {/* Histórico de Interações */}
                <div>
                  <Label className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Interações ({selectedCustomer.interactionsCount || 0})
                  </Label>
                  <div className="mt-2 space-y-2">
                    {selectedCustomer.history && selectedCustomer.history.length > 0 ? (
                      selectedCustomer.history.map((interaction: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                interaction.status === 'open' ? "bg-blue-100 text-blue-800" :
                                interaction.status === 'assigned' ? "bg-yellow-100 text-yellow-800" :
                                interaction.status === 'closed' ? "bg-green-100 text-green-800" :
                                "bg-gray-100 text-gray-800"
                              }>
                                {interaction.status === 'open' ? 'Aberto' :
                                 interaction.status === 'assigned' ? 'Em Atendimento' :
                                 interaction.status === 'closed' ? 'Finalizado' : interaction.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {interaction.date ? new Date(interaction.date).toLocaleDateString("pt-BR") : '-'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {interaction.messagesCount || 0} mensagens
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">Nenhuma interação registrada</div>
                    )}
                  </div>
                </div>

                {/* Documentos Anexados (TODO) */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Documentos Anexados
                  </Label>
                  <div className="mt-2 text-sm text-gray-500">
                    Funcionalidade em desenvolvimento
                  </div>
                </div>

                {/* Segmentação / Etiquetas (TODO) */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Segmentação / Etiquetas
                  </Label>
                  <div className="mt-2 text-sm text-gray-500">
                    Funcionalidade em desenvolvimento
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomerDetails(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FarmaDashboardLayout>
  );
}
