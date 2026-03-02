import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMessageSound } from "@/hooks/useMessageSound";

export function NotificationSound() {
  const [enabled, setEnabled] = useState(true);
  const { playSound } = useMessageSound({ enabled });

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleSound = useCallback(() => {
    setEnabled(prev => !prev);
    if (!enabled) {
      // Test sound when enabling
      playSound();
    }
  }, [enabled, playSound]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className={`h-9 w-9 ${enabled ? "text-green-600" : "text-gray-400"}`}
          >
            {enabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{enabled ? "Som ativado" : "Som desativado"}</p>
          <p className="text-xs text-gray-400">
            {enabled ? "Clique para desativar" : "Clique para ativar"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Global function to play notification sound
let globalPlaySound: (() => void) | null = null;

export function setGlobalPlaySound(fn: () => void) {
  globalPlaySound = fn;
}

export function playNotificationSound() {
  if (globalPlaySound) {
    globalPlaySound();
  }
}
