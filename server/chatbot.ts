import { getDb } from "./db";
import {
  visualFlows,
  receivedMessages,
  automationFlows,
  customers,
  tickets,
  users,
  conversations,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sendWhatsAppMessage, sendInstagramMessage } from "./messaging";
import {
  markMessageAsProcessed,
  findOrCreateCustomerByPhone,
} from "./db-messages";

/**
 * Simple Chatbot Automation - Guaranteed to Work
 */
export async function processIncomingMessage(message: any) {
  console.log("==========================================");
  console.log("[CHATBOT] Processing message:", message.id);
  console.log("[CHATBOT] From:", message.fromNumber);
  console.log("[CHATBOT] Text:", message.messageText);
  console.log("==========================================");

  if (!message.messageText && !message.caption) {
    console.log("[CHATBOT] Message has no text, skipping...");
    await markMessageAsProcessed(message.id, {});
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      console.log("[CHATBOT] No database connection!");
      return;
    }

    // Find or create customer
    const customer = await findOrCreateCustomerByPhone(
      message.fromNumber,
      message.fromName
    );
    console.log("[CHATBOT] Customer:", customer?.name, "ID:", customer?.id);

    // Check if customer has an active conversation with an agent
    let agentName = null;
    let isAgentAvailable = false;

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

    // Check business hours
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
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
    console.log("[CHATBOT] Current time:", now.toLocaleTimeString());

    // Generate greeting based on time
    let greeting = "Bom dia";
    if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    else if (hour >= 18) greeting = "Boa noite";

    // Build response based on conditions
    let response = "";

    if (!isBusinessHours) {
      response =
        `${greeting}!\n\n` +
        `Nosso horário de atendimento é de 08h às 20h de Segunda a Sábado.\n` +
        `Aos Domingos e Feriados de 8h às 12h.\n\n` +
        `Retornaremos no próximo horário disponível.`;
    } else if (isAgentAvailable && agentName) {
      response = `${greeting} eu sou ${agentName}, como posso te ajudar?`;
    } else {
      response = `${greeting}! Um momento que já já vamos te atender!`;
    }

    console.log(
      "[CHATBOT] Sending response:",
      response.substring(0, 50) + "..."
    );

    // Send response
    if (message.provider === "whatsapp") {
      await sendWhatsAppMessage({
        to: message.fromNumber,
        message: response,
      });
    } else if (message.provider === "instagram") {
      await sendInstagramMessage({
        to: message.fromNumber,
        message: response,
      });
    }

    console.log("[CHATBOT] Response sent successfully!");

    // Mark as processed
    await markMessageAsProcessed(message.id, {
      customerId: customer?.id || undefined,
    });

    console.log("[CHATBOT] Message marked as processed");
  } catch (error) {
    console.error("[CHATBOT] Error:", error);
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
  console.log("[CHATBOT] Starting Simple Chatbot Automation");
  console.log("[CHATBOT] Version: 1.0 - Working Version");
  console.log("==========================================");

  // Process immediately
  setTimeout(async () => {
    console.log("[CHATBOT] Running initial check...");
    await processPendingMessages();
  }, 3000);

  // Process every 10 seconds
  setInterval(async () => {
    await processPendingMessages();
  }, 10000);

  console.log("[CHATBOT] Running - checking messages every 10 seconds");
}
