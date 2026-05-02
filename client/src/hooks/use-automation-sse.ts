import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook for handling SSE events from automation
 * Provides real-time updates when automation actions are executed
 *
 * @param customerId - The customer ID to listen for events
 * @returns Object with messages array and lastEvent
 */
export function useAutomationSSE(customerId?: number) {
  const [messages, setMessages] = useState<any[]>([]);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const queryClient = useQueryClient();

  const handleNewMessage = useCallback((message: unknown) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === message.id);
      if (!messageExists) {
        return [...prev, message];
      }
      return prev;
    });

    // Play notification sound for agent messages
    if (message.senderType === "agent") {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {
        // Ignore audio play errors (e.g., user interaction not triggered)
      });
    }
  }, []);

  const handleConversationUpdate = useCallback(() => {
    // Invalidate conversations query to refresh the list
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);

  useEffect(() => {
    if (!customerId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        // CORRECTED: Use proper SSE endpoint
        eventSource = new EventSource(`/api/sse?userId=${customerId}`);

        eventSource.onopen = () => {
          console.log("[SSE] Connection opened for customer:", customerId);
          setIsConnected(true);
          setReconnectAttempt(0);
        };

        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            console.log("[SSE] Event received:", data);

            setLastEvent(data);

            switch (data.type) {
              case "MESSAGE_NEW": {
                const message = data.data?.message;
                if (message) {
                  handleNewMessage(message);
                }
                break;
              }

              case "CONVERSATION_UPDATE": {
                handleConversationUpdate();
                break;
              }

              case "AGENT_STATUS": {
                console.log("[SSE] Agent status update:", data.data);
                break;
              }

              default:
                console.log("[SSE] Unknown event type:", data.type);
            }
          } catch (error) {
            console.error("[SSE] Error parsing message:", error);
          }
        };

        eventSource.onerror = error => {
          console.error("[SSE] Connection error:", error);
          setIsConnected(false);

          // Attempt reconnection with exponential backoff
          const maxReconnectDelay = 30000; // 30 seconds
          const reconnectDelay = Math.min(
            1000 * Math.pow(2, reconnectAttempt),
            maxReconnectDelay
          );

          console.log(
            `[SSE] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempt + 1})`
          );

          reconnectTimeout = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, reconnectDelay);
        };
      } catch (error) {
        console.error("[SSE] Error creating EventSource:", error);
      }
    };

    connect();

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [
    customerId,
    reconnectAttempt,
    handleNewMessage,
    handleConversationUpdate,
  ]);

  return {
    messages,
    lastEvent,
    isConnected,
    reconnectAttempt,
  };
}

export default useAutomationSSE;
