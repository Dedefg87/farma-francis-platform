import { useEffect, useState } from "react";

/**
 * Hook for handling SSE events from automation
 * Provides real-time updates when automation actions are executed
 */
export function useAutomationSSE(customerId?: number) {
  const [messages, setMessages] = useState<any[]>([]);
  const [lastEvent, setLastEvent] = useState<any>(null);

  // Process SSE events
  useEffect(() => {
    if (!customerId) return;

    // EventSource for SSE
    const eventSource = new EventSource(`/api/automation?userId=${customerId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE Event received:", data);
        
        setLastEvent(data);
        
        // Handle automation events
        if (data.type === "MESSAGE_NEW") {
          setMessages(prev => {
            const newMessage = data.data.message;
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            
            if (!messageExists) {
              setMessages(prev => [...prev, newMessage]);
              
              // Play notification for agent messages
              if (newMessage.senderType === "agent") {
                (window as any).playNotificationSound?.();
              }
            }
          }
        }
        
        // Handle conversation updates
        if (data.type === "CONVERSATION_UPDATE") {
          if ("refetchConversations" in window) {
            (window as any).refetchConversations?.();
          }
          }
        
        // Handle agent status updates
        if (data.type === "AGENT_STATUS") {
          console.log("Agent status update:", data.data);
        }
        
        // Handle other events
        if (data.type) {
          setLastEvent(data);
        }
        
        setLastEvent(data);
      } catch (error) {
        console.error("SSE Error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
    };

    eventSource.onopen = () => {
      console.log("SSE Connection opened");
    };

    eventSource.onclose = () => {
      console.log("SSE connection closed");
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [customerId]);

  return { messages, lastEvent };
}
            }
          }
        }
        
        // Handle conversation updates
        if (data.type === "CONVERSATION_UPDATE") {
          if ("refetchConversations" in window) {
            (window as any).refetchConversations?.();
          }
        }
        }
        
        // Handle agent status updates
        if (data.type === "AGENT_STATUS") {
          console.log("Agent status update:", data.data);
          setLastEvent(data);
        }
        
        setLastEvent(data);
      } catch (error) {
        console.error("SSE Error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
    };

    eventSource.onopen = () => {
      console.log("SSE Connection opened");
    };

    eventSource.onclose = () => {
      console.log("SSE Connection closed");
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [customerId]);

  return { messages, lastEvent };
}
            }
          }
        }
        
        // Handle conversation updates
        if (data.type === "CONVERSATION_UPDATE") {
          // Refresh conversations list when conversation is updated
          if ("refetchConversations" in window) {
            (window as any).refetchConversations();
          }
        }
        }
        
        // Handle agent status updates
        if (data.type === "AGENT_STATUS") {
          // Handle agent status changes if needed
          console.log("Agent status update:", data.data);
        }
        
        setLastEvent(data);
      } catch (error) {
        console.error("SSE Error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
    };

    eventSource.onopen = () => {
      console.log("SSE Connection opened");
    };

    eventSource.onclose = () => {
      console.log("SSE Connection closed");
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [customerId]);

  return { messages, lastEvent };
}