import { getDb } from "./db";
import {
  visualFlows,
  receivedMessages,
  automationFlows,
  customers,
  tickets,
  users,
  conversations,
  customerTreatments,
} from "../drizzle/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { sendWhatsAppMessage, sendInstagramMessage } from "./messaging";
import {
  markMessageAsProcessed,
  findOrCreateCustomerByPhone,
} from "./db-messages";

/**
 * Simple Chatbot Automation - Fixed Version
 */
export async function processIncomingMessage(message: any) {
  console.log("==========================================");
  console.log("[CHATBOT] Processing message:", message.id);
  console.log("[CHATBOT] From:", message.fromNumber);
  console.log("[CHATBOT] Text:", message.messageText?.substring(0, 50));
  console.log("==========================================");

  try {
    const db = await getDb();
    if (!db) {
      console.log("[CHATBOT] No database connection!");
      return;
    }

    const customer = await findOrCreateCustomerByPhone(
      message.fromNumber,
      message.fromName
    );

    if (!customer) {
      console.log("[CHATBOT] Could not find/create customer");
      return;
    }

    console.log("[CHATBOT] Customer:", customer.name, "ID:", customer.id);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [recentMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(receivedMessages)
      .where(
        and(
          eq(receivedMessages.fromNumber, message.fromNumber),
          gte(receivedMessages.createdAt, fiveMinutesAgo)
        )
      );

    const recentMessageCount = Number(recentMessages?.count) || 0;
    console.log("[CHATBOT] Recent messages count:", recentMessageCount);

    const isFirstMessage = recentMessageCount === 0;
    console.log("[CHATBOT] Is first message:", isFirstMessage);

    const [activeConv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.customerId, customer.id),
          eq(conversations.status, "assigned")
        )
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(1);

    let agentName: string | null = null;
    let isAgentAvailable = false;

    if (activeConv?.assignedTo) {
      const [agent] = await db
        .select()
        .from(users)
        .where(eq(users.id, activeConv.assignedTo))
        .limit(1);
      if (agent) {
        agentName = agent.name;
        isAgentAvailable = true;
      }
    }

    const now = new Date();
    const hour = now.getHours();
    let greeting = "Bom dia";
    if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    else if (hour >= 18) greeting = "Boa noite";

    const day = now.getDay();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    const monSatStart = 8 * 60;
    const monSatEnd = 19 * 60 + 40;
    const sunStart = 8 * 60;
    const sunEnd = 11 * 60 + 40;

    const isBusinessHours =
      day === 0
        ? currentTime >= sunStart && currentTime <= sunEnd
        : currentTime >= monSatStart && currentTime <= monSatEnd;

    console.log("[CHATBOT] Business hours:", isBusinessHours);
    console.log("[CHATBOT] Agent available:", isAgentAvailable);

    if (isFirstMessage) {
      let welcomeMessage = "";

      if (!isBusinessHours) {
        welcomeMessage =
          `${greeting}!\n\n` +
          `Nosso horário de atendimento é de 08h às 20h de Segunda a Sábado.\n` +
          `Aos Domingos e Feriados de 8h às 12h.\n\n` +
          `Retornaremos no próximo horário disponível. 😊`;
      } else if (isAgentAvailable && agentName) {
        welcomeMessage = `${greeting} eu sou ${agentName}, como posso te ajudar?`;
      } else {
        welcomeMessage = `${greeting}! Um momento que já já vamos te atender! 🙏`;
      }

      console.log("[CHATBOT] Sending welcome message...");

      if (message.provider === "whatsapp") {
        await sendWhatsAppMessage({
          to: message.fromNumber,
          message: welcomeMessage,
        });
      } else if (message.provider === "instagram") {
        await sendInstagramMessage({
          to: message.fromNumber,
          message: welcomeMessage,
        });
      }

      console.log("[CHATBOT] Welcome message sent!");
    }

    await markMessageAsProcessed(message.id, { customerId: customer.id });
    console.log("[CHATBOT] Message marked as processed");
  } catch (error) {
    console.error("[CHATBOT] Error:", error);
  }
}

/**
 * Close a conversation and send appropriate message
 */
export async function closeConversation(
  conversationId: number,
  closeReason: string
) {
  console.log("==========================================");
  console.log("[CHATBOT] Closing conversation:", conversationId);
  console.log("[CHATBOT] Reason:", closeReason);
  console.log("==========================================");

  try {
    const db = await getDb();
    if (!db) return;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      console.log("[CHATBOT] Conversation not found");
      return;
    }

    await db
      .update(conversations)
      .set({
        status: "closed",
        closedAt: new Date(),
        closeReason: closeReason as any,
      })
      .where(eq(conversations.id, conversationId));

    const customerId = conv.customerId;
    if (!customerId) {
      console.log("[CHATBOT] Customer ID not found");
      return;
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer || !customer.phone) {
      console.log("[CHATBOT] Customer or phone not found");
      return;
    }

    let closingMessage = "";

    if (closeReason === "venda") {
      closingMessage =
        `Para aperfeiçoar nosso atendimento, nos diga como foi a sua experiência neste atendimento?\n\n` +
        `Digite 5️⃣ Muito satisfeito 😍\n` +
        `Digite 4️⃣ Satisfeito 😀\n` +
        `Digite 3️⃣ Indiferente 😐\n` +
        `Digite 2️⃣ Insatisfeito ☹️\n` +
        `Digite 1️⃣ Muito insatisfeito 😞`;
    } else if (closeReason === "orcamento") {
      closingMessage = `Agradecemos seu contato, e estaremos sempre à disposição. 😉`;
    } else {
      closingMessage = `Obrigado pelo contato! 😊`;
    }

    console.log("[CHATBOT] Sending closing message...");

    if (conv.channel === "whatsapp") {
      await sendWhatsAppMessage({
        to: customer.phone,
        message: closingMessage,
      });
    } else if (conv.channel === "instagram") {
      await sendInstagramMessage({
        to: customer.phone,
        message: closingMessage,
      });
    }

    console.log("[CHATBOT] Closing message sent!");
  } catch (error) {
    console.error("[CHATBOT] Error closing conversation:", error);
  }
}

/**
 * Process pending messages from database
 */
export async function processPendingMessages() {
  try {
    const db = await getDb();
    if (!db) return;

    const pending = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.processed, 0))
      .limit(5);

    console.log("[CHATBOT] Found", pending.length, "pending messages");

    for (const msg of pending) {
      await processIncomingMessage(msg);
    }
  } catch (error) {
    console.error("[CHATBOT] Error processing pending:", error);
  }
}

/**
 * Start the chatbot processor
 */
export function startChatbot() {
  console.log("==========================================");
  console.log("[CHATBOT] Starting Simple Chatbot Automation - FIXED");
  console.log("[CHATBOT] Version: 2.0 - With Closing Messages");
  console.log("==========================================");

  setTimeout(async () => {
    console.log("[CHATBOT] Running initial check...");
    await processPendingMessages();
  }, 3000);

  setInterval(async () => {
    await processPendingMessages();
  }, 10000);

  console.log("[CHATBOT] Running - checking messages every 10 seconds");
}
