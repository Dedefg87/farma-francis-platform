import { sseManager, EVENTS } from "./_core/sse";
import { logger } from "./_core/logger";
import { getDb } from "./db";
import { conversations, conversationMessages } from "../drizzle/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Enhanced Automation Engine with SSE Integration
 * Handles real-time updates to frontend when automation actions are executed
 */

export async function executeAutomationWithSSE(params: {
  automationId: string;
  templateType: string;
  customerId: number;
  conversationId?: number;
  context?: Record<string, unknown>;
}) {
  try {
    const db = await getDb();
    if (!db) {
      logger.error("Database not available for automation");
      return { success: false, error: "Database not available" };
    }

    logger.info("Executing automation with SSE integration", {
      automationId: params.automationId,
      templateType: params.templateType,
      customerId: params.customerId,
    });

    // Find active conversation for this customer if not provided
    let activeConversationId = params.conversationId;
    if (!activeConversationId) {
      const [activeConv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.customerId, params.customerId),
            eq(conversations.status, "assigned")
          )
        )
        .orderBy(conversations.lastMessageAt)
        .limit(1);

      if (activeConv) {
        activeConversationId = activeConv.id;
      }
    }

    // Execute automation actions based on automationId
    switch (params.automationId) {
      case "welcome-message":
        await sendWelcomeMessage(
          db,
          params.customerId,
          activeConversationId,
          params.context || {}
        );
        break;

      case "follow-up-2h":
        await scheduleFollowUp(
          db,
          params.customerId,
          activeConversationId,
          "2h"
        );
        break;

      case "follow-up-24h":
        await scheduleFollowUp(
          db,
          params.customerId,
          activeConversationId,
          "24h"
        );
        break;

      case "urgent-notification":
        await sendUrgentNotification(
          db,
          params.customerId,
          activeConversationId
        );
        break;

      case "offer-reminder":
        await sendOfferReminder(db, params.customerId, activeConversationId);
        break;

      default:
        await sendCustomMessage(
          db,
          params.customerId,
          activeConversationId,
          params.automationId,
          params.context || {}
        );
        break;
    }

    return { success: true };
  } catch (error) {
    logger.error("Error executing automation with SSE", error);
    return { success: false, error: (error as Error).message };
  }
}

async function sendWelcomeMessage(
  db: any,
  customerId: number,
  conversationId: number | undefined,
  context: Record<string, unknown>
) {
  const customerName = context.name || "Cliente";
  const hour = new Date().getHours();
  let greeting = "Bom dia";
  if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else if (hour >= 18) greeting = "Boa noite";

  const message = `${greeting} ${customerName}! Bem-vindo à Farmácia Francis! 😊`;

  await saveMessageAndNotify(
    db,
    conversationId,
    customerId,
    message,
    "welcome"
  );
}

async function scheduleFollowUp(
  db: any,
  customerId: number,
  conversationId: number | undefined,
  delay: string
) {
  const message = `⏰ Lembrete: Seguiremos com você em ${delay} para saber se tudo está certo!`;
  await saveMessageAndNotify(
    db,
    conversationId,
    customerId,
    message,
    "follow-up"
  );
}

async function sendUrgentNotification(
  db: any,
  customerId: number,
  conversationId: number | undefined
) {
  const message =
    "🚨 Detectamos uma situação que pode precisar de atenção especial. Um de nossos farmacêuticos entrará em contato em breve!";
  await saveMessageAndNotify(db, conversationId, customerId, message, "urgent");
}

async function sendOfferReminder(
  db: any,
  customerId: number,
  conversationId: number | undefined
) {
  const message =
    "🎟 Ótima! Aproveite nossas ofertas especiais com até 20% de desconto!";
  await saveMessageAndNotify(db, conversationId, customerId, message, "offer");
}

async function sendCustomMessage(
  db: any,
  customerId: number,
  conversationId: number | undefined,
  automationId: string,
  context: Record<string, unknown>
) {
  const message = `⚙ Automação executada: ${automationId}`;
  await saveMessageAndNotify(
    db,
    conversationId,
    customerId,
    message,
    "automation"
  );
}

export async function saveMessageAndNotify(
  db: any,
  conversationId: number | undefined,
  customerId: number,
  content: string,
  messageType: string
) {
  if (!conversationId) return;

  // Save message to database
  const [messageRecord] = await db
    .insert(conversationMessages)
    .values({
      conversationId,
      senderId: null,
      senderType: "agent", // Automation messages come from agent
      content,
      createdAt: new Date(),
    })
    .$returningId();

  // Emit SSE event for real-time frontend update
  sseManager.emitToUser(String(customerId), {
    type: EVENTS.MESSAGE_NEW,
    data: {
      conversationId,
      message: {
        id: messageRecord.insertId,
        content,
        senderType: "agent",
        createdAt: new Date().toISOString(),
        direction: "outbound",
        messageType,
      },
    },
    timestamp: Date.now(),
  });

  // Also emit conversation update
  sseManager.emitToUser(String(customerId), {
    type: EVENTS.CONVERSATION_UPDATE,
    data: {
      conversationId,
      lastMessageAt: new Date().toISOString(),
      lastMessage: content,
    },
    timestamp: Date.now(),
  });

  logger.info(
    `Message sent via automation: ${messageType} to customer ${customerId}`
  );
}
