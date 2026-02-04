import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function CRM() {
  const { data: customers = [], isLoading: customersLoading } = trpc.customers.list.useQuery();
  const { data: leads = [], isLoading: leadsLoading } = trpc.leads.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    status: "active" as "active" | "inactive" | "blocked",
  });
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    stage: "prospect" as "prospect" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost",
    value: 0,
  });

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
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
        status: "active" as "active" | "inactive" | "blocked",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead criado com sucesso!");
      setIsLeadDialogOpen(false);
      setNewLead({
        name: "",
        email: "",
        phone: "",
        source: "",
        stage: "prospect" as "prospect" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost",
        value: 0,
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar lead: ${error.message}`);
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    createCustomer.mutate(newCustomer);
  };

  const handleCreateLead = () => {
    if (!newLead.name || !newLead.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    createLead.mutate(newLead);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = leads.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      prospect: "bg-gray-100 text-gray-800",
      qualified: "bg-blue-100 text-blue-800",
      proposal: "bg-purple-100 text-purple-800",
      negotiation: "bg-orange-100 text-orange-800",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      blocked: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const isLoading = customersLoading || leadsLoading;

  return (
    <FarmaDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
            <p className="text-gray-500 mt-1">Gerenciamento de clientes e leads</p>
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
                  <Label>Status</Label>
                  <Select value={newCustomer.status} onValueChange={(value) => setNewCustomer({ ...newCustomer, status: value as "active" | "inactive" | "blocked" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    placeholder="00000-000"
                    value={newCustomer.zipCode}
                    onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
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
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="customers">
              Clientes ({customers.length})
            </TabsTrigger>
            <TabsTrigger value="leads">
              Leads ({leads.length})
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  Todos os clientes cadastrados na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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
                        <TableHead>Localização</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.city && customer.state && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-3 h-3 mr-1" />
                                {customer.city}, {customer.state}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(customer.status)}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
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
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Adicionar Lead</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do novo lead
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        placeholder="Ex: Carlos Oliveira"
                        value={newLead.name}
                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="carlos@exemplo.com"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select value={newLead.source} onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="referral">Indicação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estágio</Label>
                      <Select value={newLead.stage} onValueChange={(value) => setNewLead({ ...newLead, stage: value as "prospect" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="qualified">Qualificado</SelectItem>
                          <SelectItem value="proposal">Proposta</SelectItem>
                          <SelectItem value="negotiation">Negociação</SelectItem>
                          <SelectItem value="closed_won">Ganho</SelectItem>
                          <SelectItem value="closed_lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Estimado (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newLead.value}
                        onChange={(e) => setNewLead({ ...newLead, value: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLeadDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateLead} disabled={createLead.isPending}>
                      {createLead.isPending ? "Criando..." : "Criar Lead"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Funil de Vendas</CardTitle>
                <CardDescription>
                  Leads em diferentes estágios do processo de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum lead encontrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {lead.email}
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {lead.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lead.source || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStageColor(lead.stage)}>
                              {lead.stage}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lead.value ? `R$ ${lead.value.toLocaleString("pt-BR")}` : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {lead.followUpDate
                              ? new Date(lead.followUpDate).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
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
          </TabsContent>
        </Tabs>
      </div>
    </FarmaDashboardLayout>
  );
}
