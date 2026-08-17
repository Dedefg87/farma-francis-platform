"use client";

import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface GroupedReminders {
  customerId: number;
  customerName: string;
  customerPhone?: string;
  reminders: Array<{
    id: number;
    type: string;
    priority: string;
    title: string;
    description?: string;
    eventDate: string;
    status: string;
    snoozedUntil?: string;
    metadata?: Record<string, any>;
  }>;
}

export function useReminders() {
  const queryClient = useQueryClient();

  // Buscar lembretes pendentes
  const { data: pendingReminders = [], isLoading, refetch } = trpc.reminders.getPending.useQuery(
    { limit: 15 },
    {
      enabled: true, // Sempre buscar ao logar
      refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 min
      staleTime: 1 * 60 * 1000,
    }
  );

  // Estatísticas
  const { data: stats } = trpc.reminders.stats.useQuery(undefined, {
    enabled: true,
    refetchInterval: 60000,
  });

  // Mutations
  const dismissMutation = trpc.reminders.dismiss.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
    },
  });

  const snoozeMutation = trpc.reminders.snooze.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
    },
  });

  const dismiss = useCallback(
    (id: number) => {
      dismissMutation.mutate({ id });
    },
    [dismissMutation]
  );

  const snooze = useCallback(
    (id: number, option: string, customDate?: string) => {
      snoozeMutation.mutate({ id, snoozeOption: option as any, customDate });
    },
    [snoozeMutation]
  );

  // Função para verificar se deve mostrar modal no login
  const shouldShowOnLogin = useCallback(() => {
    return pendingReminders.length > 0;
  }, [pendingReminders]);

  return {
    pendingReminders,
    stats,
    isLoading,
    refetch,
    dismiss,
    snooze,
    shouldShowOnLogin: shouldShowOnLogin(),
    dismissMutation,
    snoozeMutation,
  };
}

// Hook para criar lembrete manual (usado no CRMPanel, etc)
export function useCreateReminder() {
  const queryClient = useQueryClient();

  return trpc.reminders.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
      toast.success("Lembrete criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar lembrete: ${error.message}`);
    },
  });
}