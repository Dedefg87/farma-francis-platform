import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock, Key, Globe, Webhook, FileText, TestTube,
  Bell, Shield, Database, Link2, Save, CheckCircle2, Loader2
} from "lucide-react";
import { trpc } from "../../lib/trpc";

interface ConfigSettingsProps {
  darkMode: boolean;
}

interface AutomationSettings {
  // Schedule
  autoActive: boolean;
  openTime: string;
  closeTime: string;
  holiday24_7: boolean;
  // Rules
  priorityKeywords: string;
  prioritizeVip: boolean;
  directPrescriptions: boolean;
  // API
  apiUrl: string;
  apiToken: string;
  webhookOrder: string;
  webhookStock: boolean;
  // Logs
  debugLogs: boolean;
  saveConversations: boolean;
}

const DEFAULT_SETTINGS: AutomationSettings = {
  autoActive: true,
  openTime: "08:00",
  closeTime: "22:00",
  holiday24_7: false,
  priorityKeywords: "urgente, dor, emergência, febre",
  prioritizeVip: true,
  directPrescriptions: true,
  apiUrl: "",
  apiToken: "",
  webhookOrder: "",
  webhookStock: true,
  debugLogs: false,
  saveConversations: true,
};

export function ConfigSettings({ darkMode }: ConfigSettingsProps) {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [testConnectionLoading, setTestConnectionLoading] = useState(false);

  // Load settings from backend
  const { data: savedSettings, isLoading } = trpc.automation.get.useQuery(
    { id: 1 }, // Settings stored as flow ID 1 or use a dedicated settings table
    {
      enabled: false, // Disable auto-load; we use local state for now
    }
  );

  // Load from localStorage as fallback
  useEffect(() => {
    try {
      const stored = localStorage.getItem("farma-automation-settings");
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Track changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem("farma-automation-settings");
      const current = JSON.stringify(settings);
      setHasChanges(stored !== current);
    } catch {
      setHasChanges(true);
    }
  }, [settings]);

  const updateSetting = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem("farma-automation-settings", JSON.stringify(settings));
      setHasChanges(false);
      toast.success("Configurações salvas com sucesso");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrlValue()) {
      toast.error("Preencha a URL da API antes de testar");
      return;
    }
    setTestConnectionLoading(true);
    try {
      // Simple connectivity test
      const response = await fetch(apiUrlValue(), { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (response.ok || response.status === 401 || response.status === 403) {
        toast.success("Conexão estabelecida (servidor respondeu)");
      } else {
        toast.warning(`Servidor respondeu com status ${response.status}`);
      }
    } catch (err) {
      if (err instanceof TypeError) {
        toast.error("Falha na conexão. Verifique a URL e sua rede.");
      } else {
        toast.error("Timeout: servidor não respondeu em 5s");
      }
    } finally {
      setTestConnectionLoading(false);
    }
  };

  const apiUrlValue = () => settings.apiUrl.trim();

  const inputClass = `h-8 text-xs mt-1 ${darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : ""}`;
  const labelClass = `text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
            Configurações Avançadas
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              Não salvo
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="h-7 text-xs"
          >
            {hasChanges ? (
              <><Save className="w-3 h-3 mr-1" /> Salvar</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Salvo</>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando configurações...</div>
      ) : (
        <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="text-xs">Horários</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Regras</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API/Webhooks</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atendimento Automático Ativo</Label>
                <Switch
                  checked={settings.autoActive}
                  onCheckedChange={(v) => updateSetting("autoActive", v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>Abertura</Label>
                  <Input
                    type="time"
                    value={settings.openTime}
                    onChange={(e) => updateSetting("openTime", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Fechamento</Label>
                  <Input
                    type="time"
                    value={settings.closeTime}
                    onChange={(e) => updateSetting("closeTime", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atendimento 24/7 (Feriados)</Label>
                <Switch
                  checked={settings.holiday24_7}
                  onCheckedChange={(v) => updateSetting("holiday24_7", v)}
                />
              </div>
              <Badge variant="outline" className="text-xs">
                Fuso: America/Sao_Paulo (GMT-3)
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                Regras de Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>Palavras-chave de Urgência</Label>
                <Input
                  placeholder="Ex: urgente, dor, emergência, febre"
                  value={settings.priorityKeywords}
                  onChange={(e) => updateSetting("priorityKeywords", e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separe por vírgulas. Mensagens com estas palavras terão prioridade máxima.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Priorizar Clientes VIP</Label>
                <Switch
                  checked={settings.prioritizeVip}
                  onCheckedChange={(v) => updateSetting("prioritizeVip", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Direcionar Receitas para Farmacêutico</Label>
                <Switch
                  checked={settings.directPrescriptions}
                  onCheckedChange={(v) => updateSetting("directPrescriptions", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Integração com API Externa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>URL da API</Label>
                <Input
                  placeholder="https://api.exemplo.com"
                  value={settings.apiUrl}
                  onChange={(e) => updateSetting("apiUrl", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Token de Autenticação</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={settings.apiToken}
                  onChange={(e) => updateSetting("apiToken", e.target.value)}
                  className={inputClass}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleTestConnection}
                disabled={testConnectionLoading || !apiUrlValue()}
              >
                {testConnectionLoading ? (
                  <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Testando...</>
                ) : (
                  <><Link2 className="w-3 h-3 mr-2" /> Testar Conexão</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>URL do Webhook (Pedidos)</Label>
                <Input
                  placeholder="https://seu-sistema.com/webhook"
                  value={settings.webhookOrder}
                  onChange={(e) => updateSetting("webhookOrder", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Notificar novo pedido</Label>
                <Switch
                  checked={settings.webhookStock}
                  onCheckedChange={(v) => updateSetting("webhookStock", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Notificar estoque baixo</Label>
                <Switch
                  checked={settings.webhookStock}
                  onCheckedChange={(v) => updateSetting("webhookStock", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Logs e Monitoramento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Ativar Logs de Debug</Label>
                <Switch
                  checked={settings.debugLogs}
                  onCheckedChange={(v) => updateSetting("debugLogs", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Salvar Histórico de Conversas</Label>
                <Switch
                  checked={settings.saveConversations}
                  onCheckedChange={(v) => updateSetting("saveConversations", v)}
                />
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => toast.info("Teste de fluxo em desenvolvimento")}>
                <TestTube className="w-3 h-3 mr-2" />
                Teste de Fluxo em Tempo Real
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
