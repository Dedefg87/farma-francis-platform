import { EventEmitter } from "events";

export interface SseEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

class SseManager extends EventEmitter {
  private clients: Map<string, Set<any>> = new Map();

  addClient(userId: string, res: any): void {
    console.log(`[SSE] Adding client for userId=${userId}`);
    
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);
    
    console.log(`[SSE] Client added. Total clients for userId=${userId}: ${this.clients.get(userId)!.size}`);
    console.log(`[SSE] All connected users: ${this.getConnectedUsers().join(", ")}`);

    res.on("close", () => {
      console.log(`[SSE] Client disconnected for userId=${userId}`);
      this.clients.get(userId)?.delete(res);
      if (this.clients.get(userId)?.size === 0) {
        this.clients.delete(userId);
      }
    });
  }

  emitToUser(userId: string, event: SseEvent): void {
    const clientSet = this.clients.get(userId);
    console.log(`[SSE] emitToUser called for userId=${userId}, connected=${!!clientSet}, clients=${clientSet?.size || 0}`);
    
    if (!clientSet) {
      console.log(`[SSE] No clients connected for userId=${userId}. Connected users: ${this.getConnectedUsers().join(", ")}`);
      return;
    }

    const data = `data: ${JSON.stringify(event)}\n\n`;
    console.log(`[SSE] Sending event to ${clientSet.size} client(s) for userId=${userId}:`, event.type);
    
    for (const res of clientSet) {
      try {
        res.write(data);
        console.log(`[SSE] Event sent successfully to client for userId=${userId}`);
      } catch (e) {
        console.error(`[SSE] Error sending to client for userId=${userId}:`, e);
        clientSet.delete(res);
      }
    }
  }

  emitToAll(event: SseEvent): void {
    for (const [userId] of this.clients) {
      this.emitToUser(userId, event);
    }
  }

  /**
   * Emite evento para todos os usuários que são administradores.
   * Requer que o role do usuário seja passado ou possa ser determinado.
   * Por simplicidade, emite para TODOS os users conectados (mantém compatibilidade).
   * Se for necessário filtrar por admin, pode-se fazer no consumer do evento.
   */
  emitToAdmins(event: SseEvent): void {
    // Por ora, emite para todos os conectados (comportamento anterior era inexistente)
    // TODO: Implementar filtro por admin se necessário
    this.emitToAll(event);
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
  CONVERSATION_READ: "conversation:read",
  AGENT_STATUS: "agent:status",
} as const;
