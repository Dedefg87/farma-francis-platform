import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NOTIFICATION_SOUND_BASE64 } from "@/lib/notificationSound";

interface UseMessageSoundOptions {
  enabled?: boolean;
  volume?: number;
}

export function useMessageSound(options: UseMessageSoundOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();
  const prevMessagesRef = useRef<any[]>([]);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
      audioRef.current.volume = volume;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [volume]);

  // Play sound
  const playSound = useCallback(() => {
    if (!enabled || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log("Could not play notification sound:", err);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, [enabled]);

  // Listen for new messages
  useEffect(() => {
    if (!enabled) return;

    const handleNewMessage = (event: CustomEvent) => {
      const { message, isFromClient } = event.detail;
      
      // Only play sound for client messages
      if (isFromClient) {
        playSound();
      }
    };

    window.addEventListener("newMessage", handleNewMessage as EventListener);
    
    return () => {
      window.removeEventListener("newMessage", handleNewMessage as EventListener);
    };
  }, [enabled, playSound]);

  // Check for new messages in query updates
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();

    const unsubscribe = queryCache.subscribe((event) => {
      if (event?.type === "updated") {
        const query = event.query;
        const queryKey = query.queryKey;

        // Check if this is a messages query
        if (queryKey?.[0] === "messages" || queryKey?.includes("messages")) {
          const newMessages = query.state.data as any[];
          
          if (Array.isArray(newMessages) && prevMessagesRef.current.length > 0) {
            // Check if there are new messages
            if (newMessages.length > prevMessagesRef.current.length) {
              const newMessage = newMessages[newMessages.length - 1];
              
              // Check if it's from a client (not from us)
              if (newMessage && !newMessage.fromMe) {
                playSound();
              }
            }
          }

          prevMessagesRef.current = newMessages || [];
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, playSound, enabled]);

  return { playSound };
}

// Utility to dispatch new message event
export function dispatchNewMessageEvent(message: any, isFromClient: boolean) {
  const event = new CustomEvent("newMessage", {
    detail: { message, isFromClient },
  });
  window.dispatchEvent(event);
}
