import { getDb } from "./db";
import { visualFlows, receivedMessages, automationFlows, customers, tickets } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendWhatsAppMessage, sendInstagramMessage, sendWhatsAppImage, sendInstagramImage } from "./messaging";
import { markMessageAsProcessed, findOrCreateCustomerByPhone } from "./db-messages";
import { invokeLLM } from "./_core/llm";

/**
 * Process pending messages through automation flows
 * This function should be called periodically (e.g., every 5 seconds)
 */
export async function processPendingMessages() {
  const db = await getDb();
  if (!db) return;

  // Get unprocessed messages
  const pending = await db
    .select()
    .from(receivedMessages)
    .where(eq(receivedMessages.processed, 0))
    .limit(10);

  for (const message of pending) {
    try {
      await processMessage(message);
    } catch (error) {
      console.error(`[Flow Engine] Error processing message ${message.id}:`, error);
    }
  }
}

/**
 * Process a single message through automation flows
 */
async function processMessage(message: any) {
  const db = await getDb();
  if (!db) return;

  console.log(`[Flow Engine] Processing message ${message.id} from ${message.fromNumber}`);

  // Find or create customer
  const customer = await findOrCreateCustomerByPhone(message.fromNumber, message.fromName);

  // PRIORITY 1: Check visual flows (N8N-style flows) first - imported flows
  const visualFlowsList = await db
    .select()
    .from(visualFlows)
    .where(
      and(
        eq(visualFlows.isActive, 1)
      )
    );

  // Check if any visual flow matches
  let matchedVisualFlow = null;
  for (const flow of visualFlowsList) {
    // For visual flows, check if it has a trigger node in its data
    try {
      const flowData = JSON.parse(flow.flowData || '{}');
      const triggerNodes = flowData.nodes?.filter((n: any) => n.type === 'trigger');
      
      if (triggerNodes && triggerNodes.length > 0) {
        // Check if message matches any trigger condition
        for (const triggerNode of triggerNodes) {
          if (matchesVisualFlowTrigger(message, triggerNode)) {
            matchedVisualFlow = flow;
            break;
          }
        }
      }
      
      if (matchedVisualFlow) break;
    } catch (e) {
      console.error(`[Flow Engine] Error parsing visual flow ${flow.id}:`, e);
    }
  }

  if (matchedVisualFlow) {
    console.log(`[Flow Engine] Message matched visual flow: ${matchedVisualFlow.name}`);

    try {
      // Execute visual flow
      await executeVisualFlow(message, matchedVisualFlow.id, customer);

      // Mark as processed - Visual flows don't reference automation_flows FK
      await markMessageAsProcessed(message.id, {
        customerId: customer.id,
      });
      return;
    } catch (error) {
      console.error(`[Flow Engine] Error executing visual flow:`, error);
    }
  }

  // PRIORITY 2: Check simple automation flows
  const flows = await db
    .select()
    .from(automationFlows)
    .where(
      and(
        eq(automationFlows.isActive, 1),
        eq(automationFlows.channel, message.provider)
      )
    );

  // Check if message matches any trigger
  let matchedFlow = null;
  for (const flow of flows) {
    if (matchesTrigger(message, flow)) {
      matchedFlow = flow;
      break;
    }
  }

  if (matchedFlow) {
    console.log(`[Flow Engine] Message matched flow: ${matchedFlow.name} (ID: ${matchedFlow.id})`);

    // Verify flow exists in database before updating
    if (!matchedFlow.id) {
      console.error(`[Flow Engine] Flow ID is invalid, skipping update`);
      return;
    }

    // Execute simple automation flow
    await executeSimpleFlow(message, matchedFlow, customer);

    // Mark as processed
    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
      automationFlowId: matchedFlow.id,
    });
  } else {
    // No flow matched - mark as processed but unhandled
    console.log(`[Flow Engine] No flow matched for message ${message.id}`);
    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
    });
  }
}

/**
 * Check if message matches visual flow trigger node
 */
function matchesVisualFlowTrigger(message: any, triggerNode: any): boolean {
  const config = triggerNode.data?.config || {};
  const messageText = message.messageText?.toLowerCase() || "";
  
  // Get trigger type and keywords from node config
  const triggerType = config.type || 'message_received';
  const keywords = config.keywords || [];
  
  // If no specific keywords/trigger configured, match all messages
  if (!keywords || keywords.length === 0) {
    return true;
  }
  
  // Check if message matches any keyword
  for (const keyword of keywords) {
    if (messageText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if message matches flow trigger
 */
function matchesTrigger(message: any, flow: any): boolean {
  const trigger = flow.trigger?.toLowerCase() || "";
  const messageText = message.messageText?.toLowerCase() || "";

  // Simple keyword matching
  if (trigger && messageText.includes(trigger)) {
    return true;
  }

  // Match all messages if no specific trigger
  if (!trigger || trigger === "*" || trigger === "all") {
    return true;
  }

  return false;
}

/**
 * Execute a simple automation flow (from automation_flows table)
 */
async function executeSimpleFlow(message: any, flow: any, customer: any) {
  const response = flow.response || "Obrigado pela sua mensagem!";

  // Replace variables in response
  const processedResponse = replaceVariables(response, {
    customer,
    message,
  });

  // Send response
  if (message.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message.fromNumber,
      message: processedResponse,
      replyToMessageId: message.externalId,
    });
  } else if (message.provider === "instagram") {
    await sendInstagramMessage({
      to: message.fromNumber,
      message: processedResponse,
    });
  }

  console.log(`[Flow Engine] Sent automated response to ${message.fromNumber}`);
}

/**
 * Execute a visual flow (from visual_flows table)
 * This is a more complex execution engine for flows created in the Flow Builder
 */
export async function executeVisualFlow(message: any, flowId: number, customer: any) {
  const db = await getDb();
  if (!db) return;

  // Get flow data
  const flowData = await db
    .select()
    .from(visualFlows)
    .where(eq(visualFlows.id, flowId))
    .limit(1);

  if (flowData.length === 0) {
    console.error(`[Flow Engine] Visual flow ${flowId} not found`);
    return;
  }

  const flow = flowData[0];
  const parsedFlowData = JSON.parse(flow.flowData || "{}");
  const nodes = parsedFlowData.nodes || [];
  const edges = parsedFlowData.edges || [];

  // Find trigger node
  const triggerNode = nodes.find((n: any) => n.type === "trigger");
  if (!triggerNode) {
    console.error(`[Flow Engine] No trigger node found in flow ${flowId}`);
    return;
  }

  // Start execution from trigger
  const context = {
    customer,
    message,
    ticket: null as any,
    variables: {} as Record<string, any>,
  };

  await executeNode(triggerNode, nodes, edges, context, message);
}

/**
 * Execute a single node in the flow
 */
async function executeNode(node: any, nodes: any[], edges: any[], context: any, message: any) {
  console.log(`[Flow Engine] Executing node: ${node.type} (${node.id})`);

  const config = node.data?.config || {};

  switch (node.type) {
    case "trigger":
      // Trigger node just starts the flow
      break;

    case "message":
      await executeMessageNode(config, context, message);
      break;

    case "condition":
      const conditionResult = await executeConditionNode(config, context);
      // Find next node based on condition result
      const nextEdge = edges.find(
        (e: any) => e.source === node.id && e.sourceHandle === (conditionResult ? "true" : "false")
      );
      if (nextEdge) {
        const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
        if (nextNode) {
          await executeNode(nextNode, nodes, edges, context, message);
        }
      }
      return; // Stop here to avoid executing next node twice

    case "aiAssistant":
      await executeAIAssistantNode(config, context, message);
      break;

    case "transferHuman":
      await executeTransferHumanNode(config, context, message);
      return; // Stop automation after transfer

    case "createTicket":
      await executeCreateTicketNode(config, context, message);
      break;

    case "wait":
      await executeWaitNode(config);
      break;

    case "setVariable":
      executeSetVariableNode(config, context);
      break;

    case "httpRequest":
      await executeHttpRequestNode(config, context);
      break;

    case "set":
    case "setVariable":
      executeSetVariableNode(config, context);
      break;

    case "action":
    case "aiAssistant":
      await executeAIAssistantNode(config, context, message);
      break;

    case "uraMenu":
      await executeURAMenuNode(config, context, message);
      return; // Wait for user response

    default:
      console.log(`[Flow Engine] Unknown node type: ${node.type}`);
  }

  // Find and execute next node
  const nextEdge = edges.find((e: any) => e.source === node.id);
  if (nextEdge) {
    const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
    if (nextNode) {
      await executeNode(nextNode, nodes, edges, context, message);
    }
  }
}

/**
 * Execute message node - send a message
 */
async function executeMessageNode(config: any, context: any, message: any) {
  const messageText = replaceVariables(config.message || config.text || "", context);
  const messageType = config.messageType || "text";

  if (messageType === "text") {
    if (message.provider === "whatsapp") {
      await sendWhatsAppMessage({
        to: message.fromNumber,
        message: messageText,
      });
    } else if (message.provider === "instagram") {
      await sendInstagramMessage({
        to: message.fromNumber,
        message: messageText,
      });
    }
  } else if (messageType === "image" && config.imageUrl) {
    const imageUrl = replaceVariables(config.imageUrl, context);
    if (message.provider === "whatsapp") {
      await sendWhatsAppImage({
        to: message.fromNumber,
        imageUrl,
        caption: messageText,
      });
    } else if (message.provider === "instagram") {
      await sendInstagramImage({
        to: message.fromNumber,
        imageUrl,
      });
    }
  }
}

/**
 * Execute condition node - evaluate condition
 */
async function executeConditionNode(config: any, context: any): Promise<boolean> {
  const conditionType = config.conditionType || "text";

  if (conditionType === "text") {
    const value = replaceVariables(config.value || "", context);
    const comparison = config.comparison || "contains";
    const compareWith = config.compareWith || "";

    switch (comparison) {
      case "contains":
        return value.toLowerCase().includes(compareWith.toLowerCase());
      case "equals":
        return value.toLowerCase() === compareWith.toLowerCase();
      case "startsWith":
        return value.toLowerCase().startsWith(compareWith.toLowerCase());
      case "endsWith":
        return value.toLowerCase().endsWith(compareWith.toLowerCase());
      default:
        return false;
    }
  } else if (conditionType === "time") {
    const currentHour = new Date().getHours();
    const startHour = parseInt(config.startHour || "0");
    const endHour = parseInt(config.endHour || "23");
    return currentHour >= startHour && currentHour <= endHour;
  } else if (conditionType === "variable") {
    const variableName = config.variableName || "";
    const variableValue = context.variables[variableName];
    const compareWith = config.compareWith || "";
    return variableValue == compareWith;
  }

  return false;
}

/**
 * Execute AI Assistant node - get response from LLM
 */
async function executeAIAssistantNode(config: any, context: any, message: any) {
  const systemPrompt = replaceVariables(
    config.systemPrompt || "Você é um assistente prestativo.",
    context
  );
  const userMessage = message.messageText || "";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userMessage },
      ],
    });

    const aiResponse = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : JSON.stringify(response.choices[0].message.content);

    // Send AI response
    if (message.provider === "whatsapp") {
      await sendWhatsAppMessage({
        to: message.fromNumber,
        message: aiResponse,
      });
    } else if (message.provider === "instagram") {
      await sendInstagramMessage({
        to: message.fromNumber,
        message: aiResponse,
      });
    }
  } catch (error) {
    console.error("[Flow Engine] AI Assistant error:", error);
  }
}

/**
 * Execute Transfer Human node - transfer to human agent
 */
async function executeTransferHumanNode(config: any, context: any, message: any) {
  const db = await getDb();
  if (!db) return;

  // Create a ticket for human agent
  const department = config.department || "Suporte";
  const priority = config.priority || "medium";

  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  
  const ticketData = {
    ticketNumber,
    customerId: context.customer.id,
    subject: `Transferência de ${message.provider}: ${message.fromNumber}`,
    description: `Mensagem: ${message.messageText}\n\nTransferido automaticamente para ${department}`,
    status: "open" as const,
    priority: priority as any,
    channel: message.provider as any,
  };

  await db.insert(tickets).values(ticketData);

  // Send confirmation message
  const confirmMessage = replaceVariables(
    config.message || "Você será atendido por um de nossos agentes em breve.",
    context
  );

  if (message.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message.fromNumber,
      message: confirmMessage,
    });
  } else if (message.provider === "instagram") {
    await sendInstagramMessage({
      to: message.fromNumber,
      message: confirmMessage,
    });
  }

  console.log(`[Flow Engine] Transferred to human agent: ${department}`);
}

/**
 * Execute Create Ticket node
 */
async function executeCreateTicketNode(config: any, context: any, message: any) {
  const db = await getDb();
  if (!db) return;

  const subject = replaceVariables(config.subject || "Novo ticket", context);
  const description = replaceVariables(
    config.description || message.messageText || "",
    context
  );

  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  
  const ticketData = {
    ticketNumber,
    customerId: context.customer.id,
    subject,
    description,
    status: "open" as const,
    priority: (config.priority || "medium") as any,
    channel: message.provider as any,
  };

  const result = await db.insert(tickets).values(ticketData);
  context.ticket = result;

  console.log(`[Flow Engine] Created ticket: ${subject}`);
}

/**
 * Execute Wait node - delay execution
 */
async function executeWaitNode(config: any) {
  const delay = parseInt(config.delay || "1000");
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Execute Set Variable node
 */
function executeSetVariableNode(config: any, context: any) {
  const variableName = config.variableName || "";
  const variableValue = replaceVariables(config.variableValue || "", context);
  context.variables[variableName] = variableValue;
  console.log(`[Flow Engine] Set variable ${variableName} = ${variableValue}`);
}

/**
 * Execute HTTP Request node
 */
async function executeHttpRequestNode(config: any, context: any) {
  const url = replaceVariables(config.url || "", context);
  const method = config.method || "GET";
  const headers = config.headers || {};
  const body = config.body ? replaceVariables(config.body, context) : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(JSON.parse(body)) : undefined,
    });

    const data = await response.json();
    context.variables.httpResponse = data;
    console.log(`[Flow Engine] HTTP ${method} ${url} - Status: ${response.status}`);
  } catch (error) {
    console.error(`[Flow Engine] HTTP Request error:`, error);
  }
}

/**
 * Execute URA Menu node
 */
async function executeURAMenuNode(config: any, context: any, message: any) {
  const menuText = replaceVariables(config.menuText || "", context);
  const options = config.options || [];

  let menuMessage = menuText + "\n\n";
  options.forEach((opt: any, index: number) => {
    menuMessage += `${index + 1}. ${opt.label}\n`;
  });

  if (message.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message.fromNumber,
      message: menuMessage,
    });
  } else if (message.provider === "instagram") {
    await sendInstagramMessage({
      to: message.fromNumber,
      message: menuMessage,
    });
  }

  // TODO: Store URA state to handle user response in next message
}

/**
 * Replace variables in text with context values
 * Supports: {{customer.name}}, {{customer.phone}}, {{message.text}}, {{ticket.id}}, {{variable.name}}
 */
function replaceVariables(text: string, context: any): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split(".");
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    return value !== undefined ? String(value) : match;
  });
}

/**
 * Start the flow engine processor
 * Call this once when server starts
 */
export function startFlowEngine() {
  console.log("[Flow Engine] Starting...");

  // Process pending messages every 5 seconds
  setInterval(() => {
    processPendingMessages().catch((error) => {
      console.error("[Flow Engine] Error in processor:", error);
    });
  }, 5000);

  console.log("[Flow Engine] Running - checking for new messages every 5 seconds");
}
