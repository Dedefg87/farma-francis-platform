import { useCallback, useRef } from "react";
import { getSoundPreference, SoundType } from "@/lib/notificationSound";

/**
 * Hook para reproduzir notificações sonoras
 * Usa Web Audio API para gerar sons sem arquivos externos
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((soundType?: SoundType) => {
    const sound = soundType || getSoundPreference();

    if (sound === "none") {
      return;
    }

    try {
      // Criar AudioContext se não existir
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const audioContext = audioContextRef.current;
      const now = audioContext.currentTime;

      // Criar oscilador para o som
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Conectar oscilador ao gain e ao destino
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar som berdasarkan tipo
      switch (sound) {
        case "ding":
          // Ding clássico - duas frequências
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.setValueAtTime(1000, now + 0.1);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
          gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;

        case "chime":
          // Chime - três notas ascendentes
          oscillator.frequency.setValueAtTime(523, now); // C5
          oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
          oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
          gainNode.gain.linearRampToValueAtTime(0.2, now + 0.25);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;

        case "bell":
          // Bell - frequencies with decay
          oscillator.frequency.setValueAtTime(700, now);
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.6, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;

        case "pop":
          // Pop - quick low to high
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.08);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;

        default:
          // Default ding
          oscillator.frequency.setValueAtTime(800, now);
          oscillator.frequency.setValueAtTime(1000, now + 0.1);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
          gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
      }

      // Limpar após tocar
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error("Erro ao reproduzir som de notificação:", error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    playSound();
  }, [playSound]);

  return { playNotificationSound, playSound };
}
