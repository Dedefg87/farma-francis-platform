"use client";

import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Clock,
  Pill,
  Calendar,
  Timer,
  X,
  ChevronDown,
  User,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Reminder {
  id: number;
  type: "aniversario" | "medicamento_vencendo" | "follow_up" | "renovacao" | "custom";
  priority: "critica" | "alta" | "media" | "baixa";
  title: string;
  description?: string;
  eventDate: string;
  status: "pendente" | "dispensado" | "adiado" | "expirado";
  snoozedUntil?: string;
  metadata?: Record<string, any>;
}

interface GroupedReminders {
  customerId: number;
  customerName: string;
  customerPhone?: string;
  reminders: Reminder[];
}

interface ReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminders: GroupedReminders[];
  onAllDismissed: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  aniversario: <Calendar className="w-4 h-4" />,
  medicamento_vencendo: <Pill className="w-4 h-4" />,
  follow_up: <Clock className="w-4 h-4" />,
  renovacao: <Calendar className="w-4 h-4" />,
  custom: <AlertCircle className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  aniversario: "Aniversário",
  medicamento_vencendo: "Medicamento",
  follow_up: "Follow-up",
  renovacao: "Renovação",
  custom: "Outro",
};

const PRIORITY_COLORS: Record<string, string> = {
  critica: "bg-red-100 text-red-700 border-red-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  media: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baixa: "bg-gray-100 text-gray-700 border-gray-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const SNOOZE_OPTIONS: Array<{ value: "1dia" | "3dias" | "1semana" | "custom"; label: string }> = [
  { value: "1dia", label: "1 dia" },
  { value: "3dias", label: "3 dias" },
  { value: "1semana", label: "1 semana" },
  { value: "custom", label: "Outra data..." },
];

export function ReminderModal({
  open,
  onOpenChange,
  reminders,
  onAllDismissed,
}: ReminderModalProps) {
  const queryClient = useQueryClient();
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [snoozeState, setSnoozeState] = useState<{
    open: boolean;
    reminderId: number | null;
    customDate: string;
  }>({ open: false, reminderId: null, customDate: "" });

  const dismissMutation = trpc.reminders.dismiss.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
      toast.success("Lembrete dispensado");
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const snoozeMutation = trpc.reminders.snooze.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
      setSnoozeState({ open: false, reminderId: null, customDate: "" });
      toast.success("Lembrete adiado com sucesso");
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const handleDismiss = (id: number) => {
    dismissMutation.mutate({ id });
  };

  const handleSnooze = (id: number, option: "1dia" | "3dias" | "1semana" | "custom") => {
    if (option === "custom") {
      setSnoozeState({ open: true, reminderId: id, customDate: "" });
    } else {
      snoozeMutation.mutate({ id, snoozeOption: option });
    }
  };

  const handleCustomSnooze = () => {
    if (snoozeState.reminderId && snoozeState.customDate) {
      snoozeMutation.mutate({
        id: snoozeState.reminderId,
        snoozeOption: "custom",
        customDate: snoozeState.customDate,
      });
    }
  };

  const handleDismissAll = () => {
    reminders.flatMap((c) => c.reminders).forEach((r) => handleDismiss(r.id));
    onAllDismissed();
  };

  const toggleClient = (customerId: number) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(date);
    eventDay.setHours(0, 0, 0, 0);

    const diff = Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    if (diff === -1) return "Ontem";
    if (diff > 0) return `Em ${diff} dia${diff > 1 ? "s" : ""}`;
    return `Há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? "s" : ""}`;
  };

  const getMetadataDisplay = (reminder: Reminder) => {
    if (!reminder.metadata) return null;

    const meta = reminder.metadata;
    const parts: string[] = [];

    if (meta.medicamento) parts.push(`💊 ${meta.medicamento}`);
    if (meta.posologia) parts.push(`${meta.posologia}x/dia`);
    if (meta.quantidade) parts.push(`Qtd: ${meta.quantidade}`);

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  useEffect(() => {
    const criticalClients = reminders
      .filter((c) => c.reminders.some((r) => r.priority === "critica"))
      .map((c) => c.customerId);

    setExpandedClients((prev) => new Set([...prev, ...criticalClients]));
  }, [reminders]);

  if (!open || reminders.length === 0) return null;

  const totalReminders = reminders.reduce((sum, c) => sum + c.reminders.length, 0);
  const criticalCount = reminders.reduce(
    (sum, c) => sum + c.reminders.filter((r) => r.priority === "critica").length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Lembretes do Dia
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Badge variant="outline" className="gap-1">
                {criticalCount > 0 && (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                {totalReminders} lembrete{totalReminders > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            {criticalCount > 0 && (
              <span className="text-red-600 font-medium">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </span>
            )}
            Revise e tome ação nos lembretes abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 py-2">
          {reminders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum lembrete pendente</p>
            </div>
          ) : (
            reminders.map((client) => (
              <ClientCard
                key={client.customerId}
                client={client}
                isExpanded={expandedClients.has(client.customerId)}
                onToggle={() => toggleClient(client.customerId)}
                onDismiss={handleDismiss}
                onSnooze={handleSnooze}
                formatEventDate={formatEventDate}
                getMetadataDisplay={getMetadataDisplay}
              />
            ))
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end border-t pt-4">
          <Button
            variant="outline"
            onClick={handleDismissAll}
            disabled={dismissMutation.isPending}
            className="flex-1 sm:flex-none"
          >
            {dismissMutation.isPending ? "Dispensando..." : "Dispensar todos"}
          </Button>
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Snooze Custom Date Modal */}
      {snoozeState.open && (
        <Dialog open={true} onOpenChange={() => setSnoozeState({ ...snoozeState, open: false })}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Adiar lembrete</DialogTitle>
              <DialogDescription>Escolha quando deseja ser lembrado novamente</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {SNOOZE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (opt.value === "custom") {
                      setSnoozeState({ ...snoozeState, customDate: "" });
                    } else {
                      handleSnooze(snoozeState.reminderId!, opt.value);
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
              {snoozeState.customDate !== undefined && (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={snoozeState.customDate}
                    onChange={(e) => setSnoozeState({ ...snoozeState, customDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <Button
                    onClick={handleCustomSnooze}
                    disabled={!snoozeState.customDate}
                    className="w-full"
                  >
                    Confirmar data personalizada
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

interface ClientCardProps {
  client: GroupedReminders;
  isExpanded: boolean;
  onToggle: () => void;
  onDismiss: (id: number) => void;
  onSnooze: (id: number, option: "1dia" | "3dias" | "1semana" | "custom") => void;
  formatEventDate: (date: string) => string;
  getMetadataDisplay: (r: Reminder) => string | null;
}

function ClientCard({
  client,
  isExpanded,
  onToggle,
  onDismiss,
  onSnooze,
  formatEventDate,
  getMetadataDisplay,
}: ClientCardProps) {
  const criticalReminders = client.reminders.filter((r) => r.priority === "critica");
  const hasCritical = criticalReminders.length > 0;

  return (
    <Card className={`overflow-hidden transition-all ${hasCritical ? "border-red-200 bg-red-50" : ""}`}>
      <Button
        onClick={onToggle}
        variant="ghost"
        className="w-full justify-between p-3 text-left hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {client.customerName?.charAt(0)?.toUpperCase() || "C"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{client.customerName}</p>
            {client.customerPhone && (
              <p className="text-sm text-gray-500 truncate">{client.customerPhone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{client.reminders.length} lembrete{client.reminders.length > 1 ? "s" : ""}</span>
          {hasCritical && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </Button>

      {isExpanded && (
        <CardContent className="pb-3 pt-0 space-y-3">
          {client.reminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              formatEventDate={formatEventDate}
              getMetadataDisplay={getMetadataDisplay}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface ReminderItemProps {
  reminder: Reminder;
  onDismiss: (id: number) => void;
  onSnooze: (id: number, option: "1dia" | "3dias" | "1semana" | "custom") => void;
  formatEventDate: (date: string) => string;
  getMetadataDisplay: (r: Reminder) => string | null;
}

function ReminderItem({
  reminder,
  onDismiss,
  onSnooze,
  formatEventDate,
  getMetadataDisplay,
}: ReminderItemProps) {
  const metadata = getMetadataDisplay(reminder);
  const isSnoozed = reminder.status === "adiado";

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border transition-colors ${
        reminder.priority === "critica"
          ? "border-red-200 bg-red-50"
          : reminder.priority === "alta"
          ? "border-orange-200 bg-orange-50"
          : reminder.priority === "media"
          ? "border-yellow-200 bg-yellow-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
        style={{
          backgroundColor:
            reminder.priority === "critica"
              ? "#ef4444"
              : reminder.priority === "alta"
              ? "#f97316"
              : reminder.priority === "media"
              ? "#eab308"
              : "#6b7280",
        }}
      >
        {TYPE_ICONS[reminder.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{reminder.title}</span>
              <Badge
                variant="outline"
                className={`text-xs ${PRIORITY_COLORS[reminder.priority]}`}
              >
                {PRIORITY_LABELS[reminder.priority]}
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                {TYPE_LABELS[reminder.type]}
              </Badge>
            </div>

            {reminder.description && (
              <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
            )}

            {metadata && (
              <p className="text-xs text-gray-500 mt-1 font-mono">{metadata}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatEventDate(reminder.eventDate)}
              </span>
              {isSnoozed && reminder.snoozedUntil && (
                <span className="flex items-center gap-1 text-orange-600">
                  <Timer className="w-3 h-3" />
                  Reativado em {format(new Date(reminder.snoozedUntil), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-500 hover:bg-orange-50"
              onClick={() => onSnooze(reminder.id, "1dia")}
              title="Adiar 1 dia"
            >
              <Timer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-50"
              onClick={() => onDismiss(reminder.id)}
              title="Dispensar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { GroupedReminders, Reminder };