import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface ErrorNotification {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  source?: string;
  details?: Record<string, unknown>;
}

class ErrorNotificationManager {
  private listeners: Set<(notification: ErrorNotification) => void> = new Set();
  private notifications: ErrorNotification[] = [];
  private maxNotifications = 50;

  subscribe(callback: (notification: ErrorNotification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(notification: Omit<ErrorNotification, "id" | "timestamp">) {
    const fullNotification: ErrorNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.notifications.unshift(fullNotification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.pop();
    }

    this.listeners.forEach(callback => callback(fullNotification));

    // Also show toast
    if (notification.type === "error") {
      toast.error(notification.title, {
        description: notification.message,
      });
    } else if (notification.type === "warning") {
      toast.warning(notification.title, {
        description: notification.message,
      });
    }
  }

  getNotifications(): ErrorNotification[] {
    return this.notifications;
  }

  clear() {
    this.notifications = [];
  }
}

export const errorNotificationManager = new ErrorNotificationManager();

export function useErrorNotifications() {
  const handleError = useCallback((error: Error, context?: string) => {
    errorNotificationManager.notify({
      type: "error",
      title: "Erro no Sistema",
      message: error.message,
      source: context,
    });
  }, []);

  const handleWarning = useCallback((message: string, context?: string) => {
    errorNotificationManager.notify({
      type: "warning",
      title: "Aviso",
      message,
      source: context,
    });
  }, []);

  return { handleError, handleWarning };
}

export function useErrorNotificationSubscriber(
  callback: (notification: ErrorNotification) => void
) {
  useEffect(() => {
    return errorNotificationManager.subscribe(callback);
  }, [callback]);
}
