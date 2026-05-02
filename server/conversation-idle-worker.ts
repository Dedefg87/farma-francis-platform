import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { conversationMessages } from "../drizzle/schema";
import { sendWhatsAppMessage, sendInstagramMessage } from "./messaging";
import { sseManager, EVENTS } from "./_core/sse";

let idleTimer: unknown = null;

export function startConversationIdleWorker(
  intervalMinutes = 2,
  idleMinutes = 30,
  maxBatch = 50
) {
  if (idleTimer) return;

  const runOnce = async () => {
    const db = await getDb();
    if (!db) return;

    const now = new Date();
    const cutoff = new Date(
      now.getTime() - Math.max(1, idleMinutes) * 60 * 1000
    );

    // Candidate = open/assigned conversations where last message was from agent
    // and no customer response happened within the idle window.
    const rows = (await db.execute(sql`
      SELECT c.id AS id,
             c.customer_phone AS customerPhone,
             c.channel AS channel,
             c.assigned_to AS assignedTo
      FROM conversations c
      INNER JOIN (
        SELECT conversation_id, MAX(created_at) AS lastAt
        FROM conversation_messages
        GROUP BY conversation_id
      ) lm ON lm.conversation_id = c.id
      INNER JOIN conversation_messages m
        ON m.conversation_id = c.id AND m.created_at = lm.lastAt
      WHERE c.status IN ('open', 'assigned')
        AND c.last_message_at <= ${cutoff}
        AND m.sender_type = 'agent'
      ORDER BY c.last_message_at ASC
      LIMIT ${maxBatch}
    `)) as any[];

    if (!Array.isArray(rows) || rows.length === 0) return;

    for (const r of rows) {
      const conversationId = Number(r.id);
      const assignedTo = r.assignedTo ? Number(r.assignedTo) : null;
      const channel = String(r.channel || "");
      const customerPhone = String(r.customerPhone || "");

      if (
        !conversationId ||
        !customerPhone ||
        (channel !== "whatsapp" && channel !== "instagram")
      ) {
        continue;
      }

      // Claim the conversation atomically (prevents multi-instance duplicates)
      const result = (await db.execute(sql`
        UPDATE conversations
        SET status = 'closed',
            closed_at = ${now},
            close_reason = 'orcamento',
            last_message_at = ${now}
        WHERE id = ${conversationId}
          AND status IN ('open', 'assigned')
          AND last_message_at <= ${cutoff}
      `)) as any;

      const affected = Number(
        result?.affectedRows ?? result?.[0]?.affectedRows ?? 0
      );
      if (affected <= 0) continue;

      const closingMessage =
        "Agradecemos seu contato, e estaremos sempre a disposicao.";

      try {
        if (channel === "whatsapp") {
          await sendWhatsAppMessage({
            to: customerPhone,
            message: closingMessage,
          });
        } else {
          await sendInstagramMessage({
            to: customerPhone,
            message: closingMessage,
          });
        }
      } catch (e) {
        // Best-effort: conversation still closes even if send fails
        console.error("[IdleClose] Failed to send closing message", e);
      }

      // Persist closing message into conversation history (best-effort)
      try {
        await db.insert(conversationMessages).values({
          conversationId,
          senderId: assignedTo,
          senderType: "agent",
          content: closingMessage,
          fileUrl: null,
          fileName: null,
          fileType: null,
          fileSize: null,
          createdAt: now,
        });
      } catch (e) {
        console.error("[IdleClose] Failed to insert closing message", e);
      }

      if (assignedTo) {
        sseManager.emitToUser(String(assignedTo), {
          type: EVENTS.CONVERSATION_UPDATE,
          data: { conversationId, status: "closed" },
          timestamp: Date.now(),
        });
      }
    }
  };

  runOnce().catch(err => console.error("[IdleClose] Run failed", err));

  idleTimer = setInterval(
    () => {
      runOnce().catch(err => console.error("[IdleClose] Run failed", err));
    },
    Math.max(1, intervalMinutes) * 60 * 1000
  );

  console.log(
    `[IdleClose] worker started (interval=${intervalMinutes}m idle=${idleMinutes}m)`
  );
}
