import { EventEmitter } from "events";

export interface SseEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

class SseManager extends EventEmitter {
  private clients: Map<string, Set<any>> = new Map();

  addClient(userId: string, res: any): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    res.on("close", () => {
      this.clients.get(userId)?.delete(res);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    });
  }

  emitToUser(userId: string, event: SseEvent): void {
    const clientSet = this.clients.get(userId);
    if (!clientSet) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clientSet) {
      try {
        res.write(data);
      } catch {
        clientSet.delete(res);
      }
    }
  }

  emitToAll(event: SseEvent): void {
    for (const [userId] of this.clients) {
      this.emitToUser(userId, event);
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SseManager();

export const EVENTS = {
  MESSAGE_NEW: "message:new",
  MESSAGE_STATUS: "message:status",
  CONVERSATION_UPDATE: "conversation:update",
  CONVERSATION_NEW: "conversation:new",
  AGENT_STATUS: "agent:status",
} as const;
