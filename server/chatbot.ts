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
  surveyResponses,
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
  console.log("[CHATBOT] Type:", message.messageType);
  console.log("[CHATBOT] Text:", message.messageText?.substring(0, 50));
  console.log("==========================================");

  // Handle non-text messages
  if (message.messageType && message.messageType !== "text") {
    console.log("[CHATBOT] Non-text message, skipping auto-response");

    const db = await getDb();
    if (db) {
      await markMessageAsProcessed(message.id, {});
    }
    return;
  }

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

    // Survey response detection (1-5)
    const ratingText = message.messageText?.trim();
    const rating = parseInt(ratingText?.replace(/[^0-9]/g, "") || "0");
    const isSurveyResponse = rating >= 1 && rating <= 5;

    console.log(
      "[CHATBOT] Is survey response:",
      isSurveyResponse,
      "Rating:",
      rating
    );

    if (isSurveyResponse) {
      console.log("[CHATBOT] Handling survey response...");
      await handleSurveyResponse(message, customer);
      return;
    }

    // Non-survey messages are handled by Flow Engine (selected automation flow)
    console.log("[CHATBOT] Non-survey message - leaving for Flow Engine");
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
 * Handle survey response from customer (1-5 rating)
 */
export async function handleSurveyResponse(message: any, customer: any) {
  console.log("==========================================");
  console.log("[CHATBOT] Processing survey response");
  console.log("[CHATBOT] From:", message.fromNumber);
  console.log("[CHATBOT] Rating:", message.messageText);
  console.log("==========================================");

  try {
    const db = await getDb();
    if (!db) return;

    // Parse rating from message
    const ratingText = message.messageText?.trim();
    const rating = parseInt(ratingText?.replace(/[^0-9]/g, "") || "0");

    if (rating < 1 || rating > 5) {
      console.log("[CHATBOT] Invalid rating, ignoring");
      return;
    }

    console.log("[CHATBOT] Valid rating:", rating);

    // Find the most recent closed conversation with this customer
    const [recentConv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.customerId, customer.id),
          eq(conversations.status, "closed")
        )
      )
      .orderBy(desc(conversations.closedAt))
      .limit(1);

    // Save survey response to database
    await db.insert(surveyResponses).values({
      conversationId: recentConv?.id || null,
      customerId: customer.id,
      rating: rating,
      closeReason: recentConv?.closeReason || "venda",
      agentId: recentConv?.assignedTo || null,
    });

    console.log("[CHATBOT] Survey response saved to database!");

    // Send thank you message
    let thankYouMessage = "";
    if (rating >= 4) {
      thankYouMessage =
        "Muito obrigado pela sua avaliação! 😊 Fico feliz em ter ajudado!";
    } else if (rating >= 3) {
      thankYouMessage =
        "Obrigado pela sua avaliação! 🙏 Vamos buscar melhorar cada vez mais!";
    } else {
      thankYouMessage =
        "Sentimos muito por não ter atendido suas expectativas. 😔\n\n" +
        "Já anotamos seu feedback para melhorarmos!";
    }

    if (message.provider === "whatsapp") {
      await sendWhatsAppMessage({
        to: message.fromNumber,
        message: thankYouMessage,
      });
    } else if (message.provider === "instagram") {
      await sendInstagramMessage({
        to: message.fromNumber,
        message: thankYouMessage,
      });
    }

    console.log("[CHATBOT] Thank you message sent!");

    // Mark as processed - survey response is handled, no need to show in UI
    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
    });

    // Delete the original message from receivedMessages to prevent it from showing in UI
    // The survey response is already saved in surveyResponses table
    await db
      .delete(receivedMessages)
      .where(eq(receivedMessages.id, message.id));

    console.log(
      "[CHATBOT] Survey response processed, original message deleted from UI"
    );
  } catch (error) {
    console.error("[CHATBOT] Error handling survey response:", error);
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
      .where(
        and(
          eq(receivedMessages.processed, 0),
          sql`(
            ${receivedMessages.messageType} = 'text'
            AND TRIM(COALESCE(${receivedMessages.messageText}, '')) IN ('1','2','3','4','5')
          )`
        )
      )
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
