import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CustomerDetail() {
  const [, setLocation] = useLocation();
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setCustomerId(id);
    } else {
      toast.error("ID do cliente não fornecido");
      setLocation("/CustomersPage");
    }
  }, [setLocation]);

  const { data, isLoading, error } = trpc.customers.get.useQuery(
    { id: customerId! },
    { enabled: !!customerId }
  );

  if (!customerId) {
    return (
      <FarmaDashboardLayout>
        <div className="p-6">Carregando...</div>
      </FarmaDashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <FarmaDashboardLayout>
        <div className="p-6">Carregando detalhes...</div>
      </FarmaDashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <FarmaDashboardLayout>
        <div className="p-6 text-red-600">
          Erro ao carregar cliente: {error?.message}
        </div>
      </FarmaDashboardLayout>
    );
  }

  const { customer, contacts } = data;

  const getInitials = (name: string) => {
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
        <Button
          variant="ghost"
          onClick={() => setLocation("/CustomersPage")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={customer.avatarUrl || ""} />
              <AvatarFallback className="text-2xl">
                {getInitials(customer.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{customer.fullName}</CardTitle>
              <CardDescription className="mt-2 flex flex-col gap-1">
                <span className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-2" />
                  {customer.email || "Não informado"}
                </span>
                <span className="flex items-center text-sm">
                  <Phone className="w-4 h-4 mr-2" />
                  {customer.phone || "Não informado"}
                </span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Contatos</h3>
                {contacts && contacts.length > 0 ? (
                  <ul className="space-y-2">
                    {contacts.map((contact) => (
                      <li
                        key={contact.id}
                        className="flex items-center justify-between"
                      >
                        <span className="capitalize">
                          {contact.type}: {contact.value}
                        </span>
                        {contact.isPrimary && (
                          <Badge variant="secondary">Principal</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Nenhum contato adicional</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Informações</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">ID</dt>
                    <dd>{customer.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Data de criação</dt>
                    <dd>
                      {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Última atualização</dt>
                    <dd>
                      {new Date(customer.updatedAt).toLocaleDateString("pt-BR")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Conversas</dt>
                    <dd>{customer.totalConversations}</dd>
                  </div>
                  {customer.satisfactionScore !== null && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Satisfação</dt>
                      <dd>{customer.satisfactionScore.toFixed(1)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
