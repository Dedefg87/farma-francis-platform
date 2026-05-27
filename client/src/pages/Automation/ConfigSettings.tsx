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
  Clock, Key, FileText, TestTube, Shield,
  Save, CheckCircle2, Loader2, Search, Calendar, Trash2, Plus, Globe, Webhook, Link2
} from "lucide-react";
import { trpc } from "../../lib/trpc";
import { APIIntegrationTab } from "./APIIntegrationTab";

interface ConfigSettingsProps {
  darkMode: boolean;
}

interface DaySchedule {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  holidayOpenTime?: string;
  holidayCloseTime?: string;
}

interface Holiday {
  date: string;
  name: string;
  type: "national" | "municipal" | "state";
  enabled: boolean;
}

interface AutomationSettings {
  holiday24_7: boolean;
  priorityKeywords: string;
  prioritizeVip: boolean;
  directPrescriptions: boolean;
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

const DEFAULT_SETTINGS: AutomationSettings = {
  holiday24_7: false,
  priorityKeywords: "urgente, dor, emergência, febre",
  prioritizeVip: true,
  directPrescriptions: true,
  debugLogs: false,
  saveConversations: true,
};

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

export function ConfigSettings({ darkMode }: ConfigSettingsProps) {
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>({});
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [ibgeCode, setIbgeCode] = useState("");
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [customHoliday, setCustomHoliday] = useState({ date: "", name: "" });
  const [autoActive, setAutoActive] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const utils = trpc.useUtils();
  const { data: apiSchedules } = trpc.businessHours.getAll.useQuery();
  const { data: apiHolidays } = trpc.businessHours.getHolidays.useQuery();

  // Load schedules from API
  useEffect(() => {
    if (apiSchedules) {
      const mapped: Record<string, DaySchedule> = {};
      apiSchedules.forEach((s: any) => {
        mapped[s.day] = {
          enabled: s.enabled,
          openTime: s.openTime,
          closeTime: s.closeTime,
          holidayOpenTime: s.holidayOpenTime || "08:00",
          holidayCloseTime: s.holidayCloseTime || "12:00",
        };
      });
      setSchedules(mapped);
    }
  }, [apiSchedules]);

  // Load holidays from API
  useEffect(() => {
    if (apiHolidays) {
      setHolidays(apiHolidays.map((h: any) => ({
        date: h.date,
        name: h.name,
        type: h.type,
        enabled: true,
      })));
    }
  }, [apiHolidays]);

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedules(prev => ({
      ...prev,
      [day]: { ...prev[day] || { enabled: true, openTime: "08:00", closeTime: "18:00" }, [field]: value }
    }));
    setHasChanges(true);
  };

  const updateSetting = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSchedules = async () => {
    setSavingSchedule(true);
    try {
      for (const day of DAYS) {
        const schedule = schedules[day.key];
        if (schedule) {
          await utils.businessHours.update.mutate({
            day: day.key as any,
            enabled: schedule.enabled,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
            holidayOpenTime: schedule.holidayOpenTime,
            holidayCloseTime: schedule.holidayCloseTime,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSave = async () => {
    await handleSaveSchedules();
    localStorage.setItem("farma-automation-settings", JSON.stringify({ ...settings, autoActive }));
    setHasChanges(false);
    toast.success("Configurações salvas com sucesso");
  };

  const fetchHolidaysForMunicipality = async () => {
    if (ibgeCode.length < 7) return toast.error("Código IBGE (7 dígitos)");
    setLoadingHolidays(true);
    try {
      const national = await fetchNationalHolidays(2026);
      const response = await fetch(`${HOLIDAYS_API_BASE}/2026/${ibgeCode}`);
      let municipal: Holiday[] = [];
      if (response.ok) {
        const data = await response.json();
        municipal = (data.feriados_municipais || []).map((h: any) => ({
          date: h.date || h.data,
          name: h.name || h.nome,
          type: "municipal" as const,
          enabled: true,
        }));
      }
      setHolidays([...national, ...municipal]);
      toast.success(`${national.length} nacionais + ${municipal.length} municipais`);
    } catch { toast.error("Erro ao buscar feriados"); }
    finally { setLoadingHolidays(false); }
  };

  const toggleHoliday = (date: string) => setHolidays(prev => prev.map(h => h.date === date ? { ...h, enabled: !h.enabled } : h));
  const deleteHoliday = (date: string) => setHolidays(prev => prev.filter(h => h.date !== date));
  const addCustomHoliday = async () => {
    if (!customHoliday.date || !customHoliday.name) return toast.error("Preencha data e nome");
    try {
      await utils.businessHours.upsertHoliday.mutate({
        date: customHoliday.date,
        name: customHoliday.name,
        type: "municipal",
        enabled: true,
      });
      await utils.businessHours.getHolidays.invalidate();
      setCustomHoliday({ date: "", name: "" });
      setShowAddHoliday(false);
    } catch { toast.error("Erro ao adicionar feriado"); }
  };

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
          {hasChanges && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Não salvo</Badge>}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges} className="h-7 text-xs">
            {hasChanges ? <><Save className="w-3 h-3 mr-1" /> Salvar</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Salvo</>}
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

        <TabsContent value="schedule" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Horários por Dia da Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.map((day) => {
                const schedule = schedules[day.key] || { enabled: true, openTime: "08:00", closeTime: "18:00" };
                return (
                  <div key={day.key} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Switch checked={schedule.enabled} onCheckedChange={(v) => updateDaySchedule(day.key, "enabled", v)} />
                    <Label className={`text-xs w-24 ${!schedule.enabled && "line-through opacity-50"}`}>{day.label}</Label>
                    <div className="flex items-center gap-1">
                      <Input type="time" value={schedule.openTime} onChange={(e) => updateDaySchedule(day.key, "openTime", e.target.value)} className={`h-7 w-20 text-xs ${darkMode ? "bg-gray-700" : ""}`} disabled={!schedule.enabled} />
                      <span className="text-xs text-gray-500">às</span>
                      <Input type="time" value={schedule.closeTime} onChange={(e) => updateDaySchedule(day.key, "closeTime", e.target.value)} className={`h-7 w-20 text-xs ${darkMode ? "bg-gray-700" : ""}`} disabled={!schedule.enabled} />
                    </div>
                  </div>
                );
              })}
              <Badge variant="outline" className="text-xs mt-2">Fuso: America/Sao_Paulo (GMT-3) | Feriados: 8:00-12:00</Badge>
            </CardContent>
          </Card>
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atendimento Automático Ativo</Label>
                <Switch checked={autoActive} onCheckedChange={setAutoActive} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Feriados da Farmácia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>Código IBGE do Município (7 dígitos)</Label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Ex: 3550308 (São Paulo)" value={ibgeCode} onChange={(e) => setIbgeCode(e.target.value.replace(/\D/g, ""))} className={inputClass} maxLength={7} />
                  <Button size="sm" onClick={fetchHolidaysForMunicipality} disabled={loadingHolidays || ibgeCode.length < 7}><Search className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Feriados {holidays.length > 0 && `(${holidays.length})`}
                  </span>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowAddHoliday(!showAddHoliday)}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Manual
                  </Button>
                </div>
                {showAddHoliday && (
                  <div className="flex gap-2 mb-2 p-2 border rounded">
                    <Input type="date" value={customHoliday.date} onChange={(e) => setCustomHoliday(p => ({ ...p, date: e.target.value }))} className="h-7 text-xs" />
                    <Input placeholder="Nome do feriado" value={customHoliday.name} onChange={(e) => setCustomHoliday(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs flex-1" />
                    <Button size="sm" onClick={addCustomHoliday} className="h-7">OK</Button>
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">Nenhum feriado. Digite IBGE e busque.</p>
                  ) : holidays.map((holiday) => (
                    <div key={holiday.date} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <Switch checked={holiday.enabled} onCheckedChange={() => toggleHoliday(holiday.date)} />
                        <span className={`text-xs ${!holiday.enabled && "line-through opacity-50"}`}>
                          {new Date(holiday.date).toLocaleDateString('pt-BR')} - {holiday.name}
                        </span>
                        <Badge variant={holiday.type === "national" ? "default" : "secondary"} className="text-xs">
                          {holiday.type === "national" ? "Nacional" : "Municipal"}
                        </Badge>
                      </div>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => deleteHoliday(holiday.date)}>
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
                <Key className="w-4 h-4" /> Regras de Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className={labelClass}>Palavras-chave de Urgência</Label>
                <Input placeholder="Ex: urgente, dor, emergência, febre" value={settings.priorityKeywords} onChange={(e) => updateSetting("priorityKeywords", e.target.value)} className={inputClass} />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Priorizar Clientes VIP</Label>
                <Switch checked={settings.prioritizeVip} onCheckedChange={(v) => updateSetting("prioritizeVip", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Direcionar Receitas para Farmacêutico</Label>
                <Switch checked={settings.directPrescriptions} onCheckedChange={(v) => updateSetting("directPrescriptions", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-3 mt-4">
          <APIIntegrationTab darkMode={darkMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}