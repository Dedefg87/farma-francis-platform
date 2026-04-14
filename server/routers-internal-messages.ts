import { z } from "zod";
import { eq, desc, and, or } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

/**
 * Router: Mensagens Internas (sussurros do Admin para Agentes)
 * 
 * O Admin NÃO envia mensagens ao cliente — ele escreve mensagens internas
 * que aparecem apenas para os agentes daquela conversa.
 * Exemplo: sugestão de venda, orientação, alerta.
 */
export const internalMessagesRouter = router({
  /**
   * Lista mensagens internas de uma conversa.
   * Admin vê todas. Agente vê apenas as dirigidas a ele.
   */
  list: protectedProcedure
    .input(z.object({
      conversation_id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { conversation_id } = input;
      const userId = ctx.user?.id;
      const isAdmin = ctx.user?.role === "admin";

      try {
        // Buscar mensagens internas da conversa
        const [rows] = await db.execute(
          `SELECT 
            im.id,
            im.conversation_id,
            im.sender_id,
            im.recipient_id,
            im.content,
            im.read_at,
            im.created_at,
            sender.name as sender_name
          FROM internal_messages im
          LEFT JOIN users sender ON im.sender_id = sender.id
          WHERE im.conversation_id = ?
          ORDER BY im.created_at ASC`,
          [conversation_id]
        );

        if (!Array.isArray(rows)) return [];

        // Agente só vê mensagens endereçadas a ele; Admin vê todas
        const filtered = isAdmin
          ? rows
          : rows.filter((r: any) => String(r.recipient_id) === String(userId));

        return filtered.map((r: any) => ({
          id: String(r.id),
          conversationId: String(r.conversation_id),
          senderId: String(r.sender_id),
          recipientId: String(r.recipient_id),
          senderName: r.sender_name || "Admin",
          content: r.content,
          readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
          createdAt: new Date(r.created_at).toISOString(),
        }));
      } catch (err: any) {
        console.error("[internalMessages.list] Error:", err.message);
        return [];
      }
    }),

  /**
   * Envia uma mensagem interna (sussurro) do Admin para o agente da conversa.
   * Apenas Admin pode enviar. Agente não precisa dessa funcionalidade.
   */
  send: protectedProcedure
    .input(z.object({
      conversation_id: z.number(),
      recipient_id: z.number(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      // Apenas Admin pode enviar mensagens internas
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem enviar mensagens internas");
      }

      const { conversation_id, recipient_id, content } = input;

      try {
        const [result] = await db.execute(
          `INSERT INTO internal_messages (conversation_id, sender_id, recipient_id, content)
           VALUES (?, ?, ?, ?)`,
          [conversation_id, Number(userId), recipient_id, content]
        );

        const insertId = (result as any)?.insertId;

        return {
          id: String(insertId),
          conversationId: String(conversation_id),
          senderId: String(userId),
          recipientId: String(recipient_id),
          content,
          createdAt: new Date().toISOString(),
        };
      } catch (err: any) {
        console.error("[internalMessages.send] Error:", err.message);
        throw new Error("Erro ao enviar mensagem interna");
      }
    }),

  /**
   * Marca mensagens internas como lidas pelo agente.
   */
  markRead: protectedProcedure
    .input(z.object({
      conversation_id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      const { conversation_id } = input;

      try {
        await db.execute(
          `UPDATE internal_messages 
           SET read_at = NOW() 
           WHERE conversation_id = ? 
             AND recipient_id = ? 
             AND read_at IS NULL`,
          [conversation_id, Number(userId)]
        );

        return { success: true };
      } catch (err: any) {
        console.error("[internalMessages.markRead] Error:", err.message);
        throw new Error("Erro ao marcar como lido");
      }
    }),
});
