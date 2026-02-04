import { useCallback, useRef } from 'react';

/**
 * Hook para reproduzir notificações sonoras
 * Usa Web Audio API para gerar sons sem arquivos externos
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Criar AudioContext se não existir
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const now = audioContext.currentTime;

      // Criar oscilador para o som
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Conectar oscilador ao gain e ao destino
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequências (som agradável de notificação)
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.setValueAtTime(1000, now + 0.1);

      // Configurar envelope de volume (fade in/out)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

      // Tocar som
      oscillator.start(now);
      oscillator.stop(now + 0.3);

      // Limpar após tocar
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('Erro ao reproduzir som de notificação:', error);
    }
  }, []);

  return { playNotificationSound };
}
