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
export async function processIncomingMessage(message: unknown) {




  console.log("[CHATBOT] Text:", message.messageText?.substring(0, 50));

  // Handle non-text messages
  if (message.messageType && message.messageType !== "text") {

    const db = await getDb();
    if (db) {
      await markMessageAsProcessed(message.id, {});
    }
    return;
  }

  try {
    const db = await getDb();
    if (!db) {

      return;
    }

    const customer = await findOrCreateCustomerByPhone(
      message.fromNumber,
      message.fromName
    );

    if (!customer) {

      return;
    }

    // Survey response detection (1-5)
    const ratingText = message.messageText?.trim();
    const rating = parseInt(ratingText?.replace(/[^0-9]/g, "") || "0");
    const isSurveyResponse = rating >= 1 && rating <= 5;

    if (isSurveyResponse) {

      await handleSurveyResponse(message, customer);
      return;
    }

    // Non-survey messages are handled by Flow Engine (selected automation flow)

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




  try {
    const db = await getDb();
    if (!db) return;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {

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

      return;
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer || !customer.phone) {

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
    } else if (closeReason === "conversa_anterior") {
      // Não enviar mensagem - apenas fechar o atendimento
      console.log("[CHATBOT] Closing without message (conversa_anterior)");
      return;
    } else {
      closingMessage = `Obrigado pelo contato! 😊`;
    }

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

  } catch (error) {
    console.error("[CHATBOT] Error closing conversation:", error);
  }
}

/**
 * Handle survey response from customer (1-5 rating)
 */
export async function handleSurveyResponse(message: unknown, customer: unknown) {





  try {
    const db = await getDb();
    if (!db) return;

    // Parse rating from message
    const ratingText = message.messageText?.trim();
    const rating = parseInt(ratingText?.replace(/[^0-9]/g, "") || "0");

    if (rating < 1 || rating > 5) {

      return;
    }

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

    // Save survey response to database (best-effort; table might not exist yet)
    try {
      await db.insert(surveyResponses).values({
        conversationId: recentConv?.id || null,
        customerId: customer.id,
        rating: rating,
        closeReason: recentConv?.closeReason || "venda",
        agentId: recentConv?.assignedTo || null,
      });

    } catch (e: unknown) {
      const code = e?.cause?.code || e?.code;
      const msg = String(e?.cause?.sqlMessage || e?.message || "");
      if (code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist")) {

      } else {
        console.error("[CHATBOT] Error saving survey response:", e);
      }
    }

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

    // Mark as processed - survey response is handled, no need to show in UI
    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
    });

    // Delete the original message from receivedMessages to prevent it from showing in UI
    // The survey response is already saved in surveyResponses table
    await db
      .delete(receivedMessages)
      .where(eq(receivedMessages.id, message.id));

  } catch (error) {
    // IMPORTANT: if we fail here, message may be re-processed forever.
    // Best-effort: mark processed to prevent loops.
    try {
      await markMessageAsProcessed(message.id, { customerId: customer.id });
    } catch {}
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




  setTimeout(async () => {

    await processPendingMessages();
  }, 3000);

  setInterval(async () => {
    await processPendingMessages();
  }, 10000);

}
