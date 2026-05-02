import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Activity,
  Webhook,
  Zap,
  Settings,
  Phone,
  MessageSquare,
} from "lucide-react";

interface DiagnosticData {
  evolutionApi: {
    configured: boolean;
    settings: unknown;
    hasApiKey: boolean;
    hasApiUrl: boolean;
    hasInstanceName: boolean;
    isActive: boolean;
  };
  flows: {
    automation: {
      active: number;
      total: number;
    };
    visual: {
      active: number;
      total: number;
      details: unknown[];
    };
  };
  messages: {
    totalRecent: number;
    last24h: number;
    pending: number;
    lastMessage: unknown;
    timeSinceLastMessage: number | null;
  };
  status: {
    webhooksReceiving: boolean;
    flowsActive: boolean;
    engineRunning: boolean;
    overall: string;
  };
}

export default function DiagnosticPanel() {
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(
    null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("5511999999999");

  const fetchDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/diagnostic/overview");
      const data = await response.json();
      setDiagnosticData(data);
    } catch (error) {
      console.error("Erro ao buscar diagnósticos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/diagnostic/messages?limit=20");
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await fetch("/api/diagnostic/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();
      alert(
        `Teste de webhook:\n${data.success ? data.test.result : data.error}`
      );
      await Promise.all([fetchDiagnostic(), fetchMessages()]);
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      alert("Erro ao testar webhook");
    }
  };

  const activateFlow = async (
    flowId: number,
    type: "automation" | "visual"
  ) => {
    try {
      const response = await fetch(`/api/test/activate/${flowId}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(`Fluxo ativado com sucesso!`);
        await fetchDiagnostic();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error("Erro ao ativar fluxo:", error);
      alert("Erro ao ativar fluxo");
    }
  };

  useEffect(() => {
    fetchDiagnostic();
    fetchMessages();
    const interval = setInterval(() => {
      fetchDiagnostic();
    }, 10000); // Atualizar a cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  if (loading || !diagnosticData) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin inline-block mr-2">⏳</div>
          Carregando diagnósticos...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Painel de Diagnóstico</h1>

      {/* Status Geral */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {diagnosticData.status.overall === "healthy" ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          )}
          <div>
            <h2 className="text-2xl font-bold">
              Status: {diagnosticData.status.overall}
            </h2>
            <p className="text-muted-foreground">
              Última verificação: {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Webhooks Recebendo
              </p>
              <p className="font-bold">
                {diagnosticData.status.webhooksReceiving ? "✅ Sim" : "❌ Não"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <div>
              <p className="text-sm text-muted-foreground">Fluxos Ativos</p>
              <p className="font-bold">
                {diagnosticData.status.flowsActive ? "✅ Sim" : "❌ Não"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <div>
              <p className="text-sm text-muted-foreground">Engine Rodando</p>
              <p className="font-bold">
                {diagnosticData.status.engineRunning ? "✅ Sim" : "❌ Não"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <div>
              <p className="text-sm text-muted-foreground">Última Mensagem</p>
              <p className="font-bold">
                {diagnosticData.messages.timeSinceLastMessage
                  ? `${diagnosticData.messages.timeSinceLastMessage} min atrás`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Evolution API */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Phone className="w-6 h-6" />
          Evolution API Configuration
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Configurado:</span>
            <span
              className={`font-bold ${diagnosticData.evolutionApi.configured ? "text-green-500" : "text-red-500"}`}
            >
              {diagnosticData.evolutionApi.configured ? "✅ Sim" : "❌ Não"}
            </span>
          </div>

          {diagnosticData.evolutionApi.settings ? (
            <>
              <div className="flex justify-between">
                <span>API Key:</span>
                <span
                  className={`font-bold ${diagnosticData.evolutionApi.hasApiKey ? "text-green-500" : "text-red-500"}`}
                >
                  {diagnosticData.evolutionApi.hasApiKey
                    ? "✅ Presente"
                    : "❌ Ausente"}
                </span>
              </div>

              <div className="flex justify-between">
                <span>API URL:</span>
                <span
                  className={`font-bold ${diagnosticData.evolutionApi.hasApiUrl ? "text-green-500" : "text-red-500"}`}
                >
                  {diagnosticData.evolutionApi.hasApiUrl
                    ? "✅ Presente"
                    : "❌ Ausente"}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Instance Name:</span>
                <span
                  className={`font-bold ${diagnosticData.evolutionApi.hasInstanceName ? "text-green-500" : "text-red-500"}`}
                >
                  {diagnosticData.evolutionApi.hasInstanceName
                    ? "✅ Presente"
                    : "❌ Ausente"}
                </span>
              </div>

              {diagnosticData.evolutionApi.settings.apiUrl && (
                <div className="mt-4 p-3 bg-muted rounded">
                  <p className="text-sm font-mono">
                    {diagnosticData.evolutionApi.settings.apiUrl}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-yellow-600">Configuração não encontrada</p>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="flows">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flows" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Fluxos
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Status dos Fluxos</h2>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Fluxos de Automação</h3>
                <p>
                  Ativos: {diagnosticData.flows.automation.active} /{" "}
                  {diagnosticData.flows.automation.total}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Fluxos Visuais (N8N)</h3>
                <p>
                  Ativos: {diagnosticData.flows.visual.active} /{" "}
                  {diagnosticData.flows.visual.total}
                </p>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Fluxos Visuais Importados</h3>
            <div className="space-y-3">
              {diagnosticData.flows.visual.details.map((flow: unknown) => (
                <Card
                  key={flow.id}
                  className="p-4 border-l-4"
                  style={{
                    borderLeftColor: flow.isActive ? "#22c55e" : "#ef4444",
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{flow.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {flow.nodesCount} nós, {flow.edgesCount} conexões
                      </p>
                      {flow.hasTrigger ? (
                        <p className="text-sm text-green-600">
                          ✅ Possui Trigger
                        </p>
                      ) : (
                        <p className="text-sm text-yellow-600">
                          ⚠️ Sem Trigger
                        </p>
                      )}
                    </div>

                    {!flow.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateFlow(flow.id, "visual")}
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Mensagens Recentes</h2>
              <Button onClick={fetchMessages} variant="outline" size="sm">
                Atualizar
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {diagnosticData.messages.totalRecent}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {diagnosticData.messages.last24h}
                </p>
                <p className="text-sm text-muted-foreground">Últimas 24h</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {diagnosticData.messages.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {messages.filter(m => m.processed).length}
                </p>
                <p className="text-sm text-muted-foreground">Processadas</p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((msg: unknown) => (
                <Card key={msg.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{msg.fromNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        msg.processed
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {msg.processed ? "Processada" : "Pendente"}
                    </span>
                  </div>

                  {msg.messageText && (
                    <p className="text-sm bg-muted p-2 rounded">
                      {msg.messageText}
                    </p>
                  )}

                  {msg.automationFlowId && (
                    <p className="text-xs text-blue-600">
                      Processado pelo fluxo #{msg.automationFlowId}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="webhook">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Webhook Status</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  URL do Webhook
                </h3>
                <p className="bg-muted p-3 rounded font-mono text-sm break-all">
                  {window.location.origin}/api/webhooks/evolution
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuração Necessária
                </h3>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <ol className="space-y-3 list-decimal">
                    <li>
                      <strong>Acesse seu painel Evolution API</strong>
                    </li>
                    <li>
                      <strong>Vá em Settings {">"} Webhooks</strong>
                    </li>
                    <li>
                      <strong>Adicione a URL:</strong>
                      <p className="mt-1 bg-white p-2 rounded font-mono text-sm">
                        {window.location.origin}/api/webhooks/evolution
                      </p>
                    </li>
                    <li>
                      <strong>Configure a API Key</strong>
                      <p className="text-sm text-muted-foreground">
                        Use a mesma API Key configurada na plataforma
                      </p>
                    </li>
                    <li>
                      <strong>Salve as configurações</strong>
                    </li>
                  </ol>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Testar Recebimento
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="5511999999999"
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <Button onClick={testWebhook}>Testar Webhook</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Isso simulará uma mensagem e verificará se o flow-engine
                    processou corretamente
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={fetchDiagnostic} variant="outline">
                  Atualizar Diagnóstico
                </Button>
                <a
                  href="/api/diagnostic/webhook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">Ver Configuração Webhook</Button>
                </a>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
