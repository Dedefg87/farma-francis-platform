"use client";

import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { ReminderModal } from "@/components/ReminderModal";
import type { GroupedReminders } from "@/components/ReminderModal";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook para gerenciar lembretes no login
 * Busca lembretes pendentes e controla exibicao do modal
 */
export function useRemindersOnLogin() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [reminders, setReminders] = useState<GroupedReminders[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const getPendingQuery = trpc.reminders.getPending.useQuery(
    { limit: 15 },
    {
      enabled: false,
      refetchInterval: false,
    }
  );

  const checkReminders = useCallback(async () => {
    if (hasChecked) return;

    try {
      const result = await getPendingQuery.refetch();
      if (result.data && result.data.length > 0) {
        setReminders(result.data);
        setShowModal(true);
      }
      setHasChecked(true);
    } catch (error) {
      console.error("[Reminders] Erro ao buscar lembretes:", error);
      setHasChecked(true);
    }
  }, [getPendingQuery, hasChecked]);

  const handleAllDismissed = useCallback(() => {
    setShowModal(false);
    setReminders([]);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    reminders,
    onClose: closeModal,
    onAllDismissed: handleAllDismissed,
    checkReminders,
  };
}

/**
 * Componente que envolve a aplicacao e verifica lembretes no login
 * Deve ser colocado dentro do AuthProvider
 */
export function ReminderLoginProvider({ children }: { children: React.ReactNode }) {
  const { showModal, reminders, onClose, onAllDismissed, checkReminders } = useRemindersOnLogin();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      checkReminders();
    }
  }, [isAuthenticated, isLoading, checkReminders]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset state quando desloga
    }
  }, [isAuthenticated]);

  return (
    <>
      {children}
      {showModal && (
        <ReminderModal
          open={showModal}
          onOpenChange={onClose}
          reminders={reminders}
          onAllDismissed={onAllDismissed}
        />
      )}
    </>
  );
}

/**
 * Hook simples para usar em qualquer componente
 */
export function useReminders() {
  const queryClient = useQueryClient();

  const dismiss = trpc.reminders.dismiss.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
    },
  });

  const snooze = trpc.reminders.snooze.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", "stats"] });
    },
  });

  const stats = trpc.reminders.stats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  return {
    dismiss: dismiss.mutate,
    snooze: snooze.mutate,
    isDismissing: dismiss.isPending,
    isSnoozing: snooze.isPending,
    stats: stats.data,
  };
}
