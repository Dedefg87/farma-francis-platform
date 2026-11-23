import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  Download,
  Trash2,
  ExternalLink,
  FileText,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DataRightsPage() {
  const [identifier, setIdentifier] = useState("");
  const utils = trpc.useContext();

  // 📤 Exportar dados
  const exportMutation = trpc.admin.exportUserData.useMutation({
    onSuccess: (data) => {
      toast.success(`Dados exportados! ${data.totalMessages} mensagens, ${data.totalConversations} conversas`);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // 🗑️ Deletar dados
  const deleteMutation = trpc.admin.deleteUserData.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.message}`);
      utils.users.invalidate();
      utils.customers.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // 🌍 Listar serviços externos
  const { data: services } = trpc.admin.listExternalServices.useQuery();

  const handleExport = () => {
    if (!identifier.trim()) {
      toast.error("Digite um email ou CPF");
      return;
    }
    exportMutation.mutate({ identifier: identifier.trim() });
  };

  const handleDelete = () => {
    if (!identifier.trim()) {
      toast.error("Digite um email ou CPF");
      return;
    }
    if (
      !confirm(
        "⚠️ Isso anonimizará todos os dados pessoais. Mensagens de atendimento serão mantidas. Continuar?"
      )
    )
      return;
    deleteMutation.mutate({ identifier: identifier.trim() });
  };

  return (
    <FarmaDashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Direitos do Titular (LGPD)
        </h1>
        <p className="text-gray-600 mb-6">
          Exportar ou anonimizar dados de clientes/agentes por email ou CPF.
        </p>

        {/* Busca */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Dados</CardTitle>
            <CardDescription>
              Digite email ou CPF para exportar ou deletar dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="exemplo@email.com ou 123.456.789-00"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportMutation.isPending ? "..." : "Exportar"}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? "..." : "Anonimizar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Serviços Externos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Serviços Externos (Internacionalização de Dados)</CardTitle>
            <CardDescription>
              Lista de serviços que recebem dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {services ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Fora do Brasil (International):</h3>
                <ul className="space-y-2 mb-4">
                  {services.services.map((s, i) => (
                    <li key={i} className="border-l-2 border-orange-400 pl-3">
                      <strong>{s.name}</strong>
                      <span className="text-sm text-gray-600 block">
                        {s.country} — {s.purpose}
                      </span>
                      <span className="text-xs text-gray-500">
                        Recebe: {s.receives.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="font-semibold">No Brasil:</h3>
                <ul className="space-y-2">
                  {services.brServices.map((s, i) => (
                    <li key={i} className="border-l-2 border-green-400 pl-3">
                      <strong>{s.name}</strong>
                      <span className="text-sm text-gray-600 block">
                        {s.country} — {s.purpose}
                      </span>
                      <span className="text-xs text-gray-500">
                        Recebe: {s.receives.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>

                {services.note && (
                  <p className="text-sm text-red-600 mt-4">
                    ❗ {services.note}
                  </p>
                )}
              </div>
            ) : (
              <p>Carregando...</p>
            )}
          </CardContent>
        </Card>

        {/* Política de Privacidade */}
        <Card>
          <CardHeader>
            <CardTitle>Política de Privacidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-sm">
              <h3>Finalidade do Tratamento</h3>
              <p>
                Coletamos e tratamos dados exclusivamente para: Autenticar agentes
                no sistema, Gerenciar conversas via WhatsApp, Atender clientes
                farmacêuticos.
              </p>

              <h3>Base Legal</h3>
              <p>
                Art. 7º da LGPD — Consentimento para clientes / Execução de
                contrato para agentes.
              </p>

              <h3>Compartilhamento</h3>
              <p>
                Dados são compartilhados com terceiros para envio/recebimento de
                mensagens, armazenamento e análise de IA.
              </p>

              <h3>Direitos</h3>
              <p>
                Você pode: Acessar, Retificar, Excluir, Portabilidade. Use as
                ferramentas acima.
              </p>

              <h3>Contato</h3>
              <p>
                <strong>privacy@farmafrancis.up.railway.app</strong>
              </p>

              <h3>Conservação</h3>
              <p>
                Mensagens de atendimento são mantidas por 12 meses para
                compliance regulatório.
              </p>

              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  window.open("/privacy-policy", "_blank")
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver política completa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FarmaDashboardLayout>
  );
}
