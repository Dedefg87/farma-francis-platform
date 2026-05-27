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
  Bell, Shield, Database, Link2, Save, CheckCircle2, Loader2,
  Search, Calendar, Trash2, Plus
} from "lucide-react";
import { trpc } from "../../lib/trpc";

interface ConfigSettingsProps {
  darkMode: boolean;
}

// Config de horários por dia da semana
interface DaySchedule {
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

interface Holiday {
  date: string;
  name: string;
  type: "national" | "municipal";
  enabled: boolean;
}

interface AutomationSettings {
  // Schedule por dia
  schedules: Record<string, DaySchedule>;
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

const DAYS = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  openTime: "08:00",
  closeTime: "18:00",
};

const DEFAULT_SETTINGS: AutomationSettings = {
  autoActive: true,
  schedules: DAYS.reduce((acc, day) => ({
    ...acc,
    [day.key]: { ...DEFAULT_DAY_SCHEDULE }
  }), {} as Record<string, DaySchedule>),
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

// API de feriados - usando feriados.dev (gratuita)
const HOLIDAYS_API_BASE = "https://feriados.dev";

async function fetchNationalHolidays(year: number): Promise<Holiday[]> {
  try {
    const response = await fetch(`${HOLIDAYS_API_BASE}/${year}`);
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    return (data.feriados || data || []).map((h: any) => ({
      date: h.date || h.data,
      name: h.name || h.nome,
      type: "national",
      enabled: true,
    }));
  } catch {
    // Fallback para feriados nacionais 2026 conhecidos
    return [
      { date: "2026-01-01", name: "Confraternização Universal", type: "national", enabled: true },
      { date: "2026-02-17", name: "Carnaval", type: "national", enabled: true },
      { date: "2026-04-03", name: "Paixão de Cristo", type: "national", enabled: true },
      { date: "2026-04-21", name: "Tiradentes", type: "national", enabled: true },
      { date: "2026-05-01", name: "Dia do Trabalho", type: "national", enabled: true },
      { date: "2026-09-07", name: "Independência do Brasil", type: "national", enabled: true },
      { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", enabled: true },
      { date: "2026-11-02", name: "Finados", type: "national", enabled: true },
      { date: "2026-11-15", name: "Proclamação da República", type: "national", enabled: true },
      { date: "2026-11-20", name: "Dia da Consciência Negra", type: "national", enabled: true },
      { date: "2026-12-25", name: "Natal", type: "national", enabled: true },
    ];
  }
}

async function fetchMunicipalHolidays(ibgeCode: string, year: number): Promise<Holiday[]> {
  try {
    const response = await fetch(`${HOLIDAYS_API_BASE}/${year}/${ibgeCode}`);
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    return (data.feriados_municipais || []).map((h: any) => ({
      date: h.date || h.data,
      name: h.name || h.nome,
      type: "municipal",
      enabled: true,
    }));
  } catch {
    return [];
  }
}

export function ConfigSettings({ darkMode }: ConfigSettingsProps) {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [testConnectionLoading, setTestConnectionLoading] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [ibgeCode, setIbgeCode] = useState("");
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [customHoliday, setCustomHoliday] = useState({ date: "", name: "" });

  const [autoActive, setAutoActive] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("farma-automation-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        setAutoActive(parsed.autoActive ?? true);
      }
      const storedHolidays = localStorage.getItem("farma-pharmacy-holidays");
      if (storedHolidays) {
        setHolidays(JSON.parse(storedHolidays));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("farma-automation-settings");
      setHasChanges(stored === null); // Has changes if nothing stored yet
    } catch {
      setHasChanges(false);
    }
  }, [settings]);

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [day]: { ...prev.schedules[day], [field]: value }
      }
    }));
  };

  const updateSetting = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem("farma-automation-settings", JSON.stringify(settings));
      localStorage.setItem("farma-pharmacy-holidays", JSON.stringify(holidays));
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
      const response = await fetch(apiUrlValue(), { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (response.ok || response.status === 401 || response.status === 403) {
        toast.success("Conexão estabelecida (servidor respondeu)");
      } else {
        toast.warning(`Servidor respondeu com status ${response.status}`);
      }
    } catch {
      toast.error("Falha na conexão");
    } finally {
      setTestConnectionLoading(false);
    }
  };

  const fetchHolidaysForMunicipality = async () => {
    if (!ibgeCode || ibgeCode.length < 7) {
      toast.error("Digite o código IBGE do município (7 dígitos)");
      return;
    }
    setLoadingHolidays(true);
    try {
      const national = await fetchNationalHolidays(2026);
      const municipal = await fetchMunicipalHolidays(ibgeCode, 2026);
      setHolidays([...national, ...municipal]);
      toast.success(`Encontrados ${national.length} feriados nacionais e ${municipal.length} municipais`);
    } catch {
      toast.error("Erro ao buscar feriados");
    } finally {
      setLoadingHolidays(false);
    }
  };

  const toggleHoliday = (date: string) => {
    setHolidays(prev => prev.map(h => 
      h.date === date ? { ...h, enabled: !h.enabled } : h
    ));
  };

  const deleteHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  };

  const addCustomHoliday = () => {
    if (!customHoliday.date || !customHoliday.name) {
      toast.error("Preencha data e nome do feriado");
      return;
    }
    setHolidays(prev => [
      ...prev,
      { ...customHoliday, type: "municipal", enabled: true }
    ]);
    setCustomHoliday({ date: "", name: "" });
    setShowAddHoliday(false);
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

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="text-xs">Horários</TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs">Feriados</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Regras</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API/Webhooks</TabsTrigger>
        </TabsList>

        {/* ABA HORÁRIOS - Por dia da semana */}
        <TabsContent value="schedule" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários por Dia da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.map((day) => {
                const schedule = settings.schedules[day.key];
                return (
                  <div key={day.key} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Switch
                      checked={schedule?.enabled ?? true}
                      onCheckedChange={(v) => updateDaySchedule(day.key, "enabled", v)}
                    />
                    <Label className={`text-xs w-24 ${!schedule?.enabled && "line-through opacity-50"}`}>
                      {day.label}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={schedule?.openTime ?? "08:00"}
                        onChange={(e) => updateDaySchedule(day.key, "openTime", e.target.value)}
                        className={`h-7 w-24 text-xs ${darkMode ? "bg-gray-700" : ""}`}
                        disabled={!schedule?.enabled}
                      />
                      <span className="text-xs text-gray-500">às</span>
                      <Input
                        type="time"
                        value={schedule?.closeTime ?? "18:00"}
                        onChange={(e) => updateDaySchedule(day.key, "closeTime", e.target.value)}
                        className={`h-7 w-24 text-xs ${darkMode ? "bg-gray-700" : ""}`}
                        disabled={!schedule?.enabled}
                      />
                    </div>
                  </div>
                );
              })}
              <Badge variant="outline" className="text-xs mt-2">
                Fuso: America/Sao_Paulo (GMT-3)
              </Badge>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atendimento Automático Ativo</Label>
                <Switch
                  checked={autoActive}
                  onCheckedChange={setAutoActive}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA FERIADOS - Nova aba completa */}
        <TabsContent value="holidays" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Feriados da Farmácia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>Código IBGE do Município</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Ex: 3550308 (São Paulo)"
                    value={ibgeCode}
                    onChange={(e) => setIbgeCode(e.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                    maxLength={7}
                  />
                  <Button
                    size="sm"
                    onClick={fetchHolidaysForMunicipality}
                    disabled={loadingHolidays || ibgeCode.length < 7}
                  >
                    <Search className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Busca feriados nacionais + municipais automaticamente
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atendimento 24/7 nos Feriados</Label>
                <Switch
                  checked={settings.holiday24_7}
                  onCheckedChange={(v) => updateSetting("holiday24_7", v)}
                />
              </div>

              <div className="border-t pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Feriados {holidays.length > 0 && `(${holidays.length})`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => setShowAddHoliday(!showAddHoliday)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar Manual
                  </Button>
                </div>

                {showAddHoliday && (
                  <div className="flex gap-2 mb-2 p-2 border rounded">
                    <Input
                      type="date"
                      value={customHoliday.date}
                      onChange={(e) => setCustomHoliday(p => ({ ...p, date: e.target.value }))}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Nome do feriado"
                      value={customHoliday.name}
                      onChange={(e) => setCustomHoliday(p => ({ ...p, name: e.target.value }))}
                      className="h-7 text-xs flex-1"
                    />
                    <Button size="sm" onClick={addCustomHoliday} className="h-7">
                      OK
                    </Button>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">
                      Nenhum feriado carregado. Digite o código IBGE e clique em buscar.
                    </p>
                  ) : holidays.map((holiday) => (
                    <div key={holiday.date} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={holiday.enabled}
                          onCheckedChange={() => toggleHoliday(holiday.date)}
                        />
                        <span className={`text-xs ${!holiday.enabled && "line-through opacity-50"}`}>
                          {new Date(holiday.date).toLocaleDateString('pt-BR')} - {holiday.name}
                        </span>
                        <Badge variant={holiday.type === "national" ? "default" : "secondary"} className="text-xs">
                          {holiday.type === "national" ? "Nacional" : "Municipal"}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => deleteHoliday(holiday.date)}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}