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
import { eq, and, desc, sql } from "drizzle-orm";
import {
  sendWhatsAppMessage,
  sendInstagramMessage,
  sendWhatsAppImage,
  sendInstagramImage,
} from "./messaging";
import {
  markMessageAsProcessed,
  findOrCreateCustomerByPhone,
} from "./db-messages";
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
    .where(
      and(
        eq(receivedMessages.processed, 0),
        // Skip survey ratings (1-5) so chatbot can process them
        sql`NOT (
          ${receivedMessages.messageType} = 'text'
          AND TRIM(COALESCE(${receivedMessages.messageText}, '')) IN ('1','2','3','4','5')
        )`
      )
    )
    .limit(10);

  console.log(`[Flow Engine] Found ${pending.length} pending messages`);

  for (const message of pending) {
    try {
      await processMessage(message);
    } catch (error) {
      console.error(
        `[Flow Engine] Error processing message ${message.id}:`,
        error
      );
    }
  }
}

/**
 * Process a single message through automation flows
 */
async function processMessage(message: any) {
  const db = await getDb();
  if (!db) return;

  console.log(
    `[Flow Engine] Processing message ${message.id} from ${message.fromNumber}`
  );

  // Find or create customer
  const customer = await findOrCreateCustomerByPhone(
    message.fromNumber,
    message.fromName
  );

  // PRIORITY 1: Check visual flows (N8N-style flows) first
  const visualFlowsList = await db
    .select()
    .from(visualFlows)
    .where(and(eq(visualFlows.isActive, 1)))
    .orderBy(desc(visualFlows.updatedAt));

  // Check if any visual flow matches
  let matchedVisualFlow = null;
  for (const flow of visualFlowsList) {
    try {
      const flowData = JSON.parse(flow.flowData || "{}");
      const triggerNodes = flowData.nodes?.filter(
        (n: any) => n.type === "trigger"
      );

      if (triggerNodes && triggerNodes.length > 0) {
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
    console.log(
      `[Flow Engine] Message matched visual flow: ${matchedVisualFlow.name}`
    );

    try {
      await executeVisualFlow(message, matchedVisualFlow.id, customer);
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

  let matchedFlow = null;
  for (const flow of flows) {
    if (matchesTrigger(message, flow)) {
      matchedFlow = flow;
      break;
    }
  }

  if (matchedFlow) {
    console.log(
      `[Flow Engine] Message matched flow: ${matchedFlow.name} (ID: ${matchedFlow.id})`
    );

    if (!matchedFlow.id) {
      console.error(`[Flow Engine] Flow ID is invalid, skipping update`);
      return;
    }

    await executeSimpleFlow(message, matchedFlow, customer);
    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
      automationFlowId: matchedFlow.id,
    });
  } else {
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
  const triggerType = config.event || "message_received";
  const messageText = message.messageText?.toLowerCase() || "";

  console.log(`[Flow Engine] Trigger type: ${triggerType}`);
  console.log(`[Flow Engine] Message text: ${messageText?.substring(0, 50)}`);
  console.log(`[Flow Engine] Trigger config:`, config);

  // Check if this is a message_received trigger (all messages)
  if (triggerType === "message_received") {
    console.log(
      `[Flow Engine] Message trigger matched - processing ALL messages`
    );
    return true;
  }

  // If no trigger type, match all messages by default
  if (!triggerType) {
    console.log(
      `[Flow Engine] No trigger type - matching ALL messages by default`
    );
    return true;
  }

  // For other trigger types, check conditions
  if (config.condition) {
    try {
      const conditionResult = evaluateTriggerCondition(
        config.condition,
        message
      );
      console.log(`[Flow Engine] Condition result: ${conditionResult}`);
      return conditionResult;
    } catch (error) {
      console.error(`[Flow Engine] Condition evaluation error:`, error);
      return false;
    }
  }

  return true;
}

/**
 * Evaluate trigger condition expression
 */
function evaluateTriggerCondition(condition: string, message: any): boolean {
  const messageText = message.messageText?.toLowerCase() || "";
  const messageType = message.messageType || "text";

  // Check for call/video
  if (condition.includes("message_type")) {
    if (condition.includes("call") || condition.includes("video")) {
      return messageType === "call" || messageType === "video";
    }
  }

  // Check for close_reason
  if (condition.includes("close_reason")) {
    const expectedReason = condition.split("==")[1]?.trim().replace(/"/g, "");
    const actualReason = message.closeReason || message.close_reason || "";
    return actualReason === expectedReason;
  }

  // Simple text matching
  if (condition.includes("message_text")) {
    const expectedText = condition
      .split("==")[1]
      ?.trim()
      .replace(/"/g, "")
      .replace(/'/g, "");
    return messageText.includes(expectedText.toLowerCase());
  }

  // Default to true for unknown conditions
  return true;
}

/**
 * Check if message matches flow trigger
 */
function matchesTrigger(message: any, flow: any): boolean {
  const trigger = flow.trigger?.toLowerCase() || "";
  const messageText = message.messageText?.toLowerCase() || "";

  if (trigger && messageText.includes(trigger)) {
    return true;
  }

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

  const processedResponse = replaceVariables(response, {
    customer,
    message,
  });

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
 * Execute a visual flow (N8N-style flow) with proper conditional logic
 */
export async function executeVisualFlow(
  message: any,
  flowId: number,
  customer: any
) {
  const db = await getDb();
  if (!db) return;

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

  console.log(
    `[Chatbot Flow] Executing flow "${flow.name}" for ${customer.phone}`
  );

  let agentName = null;

  const [activeConversation] = await db
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

  if (activeConversation?.assignedTo) {
    const [agent] = await db
      .select()
      .from(users)
      .where(eq(users.id, activeConversation.assignedTo))
      .limit(1);
    if (agent) {
      agentName = agent.name;
    }
  }

  const context = {
    message: {
      text: message.messageText || message.caption || "",
      type: message.messageType || "text",
      from: message.fromNumber,
      provider: message.provider,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    },
    agent_name: agentName,
    assignedTo: activeConversation?.assignedTo,
    variables: {} as Record<string, any>,
  };

  await executeFlowFromTrigger(nodes, edges, context, message);
}

/**
 * Execute flow starting from trigger node following edges
 */
async function executeFlowFromTrigger(
  nodes: any[],
  edges: any[],
  context: any,
  message: any
): Promise<void> {
  const triggerNode = nodes.find((n: any) => n.type === "trigger");
  if (!triggerNode) {
    console.error(`[Chatbot Flow] No trigger node found`);
    return;
  }

  console.log(
    `[Chatbot Flow] Starting from trigger: ${triggerNode.data?.label || triggerNode.id}`
  );

  await executeNodeWithEdges(triggerNode, nodes, edges, context, message);
}

/**
 * Execute a single node and follow its outgoing edges
 */
async function executeNodeWithEdges(
  node: any,
  nodes: any[],
  edges: any[],
  context: any,
  message: any
): Promise<void> {
  console.log(
    `[Chatbot Flow] Executing node: ${node.data?.label || node.id} (${node.type})`
  );

  const config = node.data?.config || {};
  let conditionResult: boolean | null = null;

  switch (node.type) {
    case "trigger":
      break;

    case "condition":
      conditionResult = evaluateConditionNode(config, context);
      console.log(
        `[Chatbot Flow] Condition "${node.data?.label}": ${conditionResult ? "TRUE" : "FALSE"}`
      );
      break;

    case "message":
      const messageText = replaceVariables(config.message || "", context);
      console.log(
        `[Chatbot Flow] Sending message: "${messageText.substring(0, 50)}..."`
      );

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

      if (config.terminal || isTerminalMessage(node)) {
        console.log(`[Chatbot Flow] Terminal message sent, stopping flow`);
        return;
      }
      break;

    case "function":
      if (config.function === "get_greeting") {
        const hour = new Date().getHours();
        let greeting = "Bom dia";
        if (hour >= 12 && hour < 18) greeting = "Boa tarde";
        else if (hour >= 18) greeting = "Boa noite";

        context.greeting = greeting;
        context.agent_name = context.agent_name || "Atendente";
        console.log(`[Chatbot Flow] Generated greeting: ${greeting}`);
      }
      break;

    case "aiAssistant":
      await executeAIAssistantNode(config, context, message);
      break;

    case "transfer":
    case "transferHuman":
      console.log(`[Chatbot Flow] Transfer to human`);
      await executeTransferHumanNode(config, context, message);
      return;

    case "createTicket":
      await executeCreateTicketNode(config, context, message);
      break;

    case "wait":
      console.log(`[Flow Engine] Wait node: ${JSON.stringify(config)}`);
      const delay = config.delay || config.duration || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      break;

    case "setVariable":
      executeSetVariableNode(config, context);
      break;

    case "httpRequest":
      await executeHttpRequestNode(config, context);
      break;

    case "uraMenu":
      await executeURAMenuNode(config, context, message);
      return;

    default:
      console.log(`[Chatbot Flow] Unknown node type: ${node.type}`);
  }

  const outgoingEdges = edges.filter((e: any) => e.source === node.id);

  if (outgoingEdges.length === 0) {
    console.log(`[Chatbot Flow] No outgoing edges, flow complete`);
    return;
  }

  if (node.type === "condition" && conditionResult !== null) {
    const trueEdge = outgoingEdges.find(
      (e: any) =>
        e.label?.toLowerCase() === "sim" ||
        e.sourceHandle === "true" ||
        e.sourceHandle === "0"
    );
    const falseEdge = outgoingEdges.find(
      (e: any) =>
        e.label?.toLowerCase() === "não" ||
        e.label?.toLowerCase() === "nao" ||
        e.sourceHandle === "false" ||
        e.sourceHandle === "1"
    );

    const nextEdge = conditionResult ? trueEdge : falseEdge;

    if (nextEdge) {
      const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message);
      }
    }
  } else {
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n: any) => n.id === edge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message);
      }
    }
  }
}

/**
 * Evaluate a condition node
 */
function evaluateConditionNode(config: any, context: any): boolean {
  const condition = config.condition;

  if (!condition) return true;

  if (condition === "working_hours") {
    return checkWorkingHours(config.schedule);
  }

  if (condition === "agent_logged_in") {
    return !!context.agent_name || !!context.assignedTo;
  }

  if (condition.includes("close_reason")) {
    const closeReason = context.close_reason || context.closeReason;
    const expectedReason = condition.split("==")[1]?.trim().replace(/"/g, "");
    return closeReason === expectedReason;
  }

  if (condition.includes("message_type")) {
    const messageType = context.message?.type || "text";
    if (condition.includes("call") || condition.includes("video")) {
      return messageType === "call" || messageType === "video";
    }
  }

  return true;
}

/**
 * Check if current time is within working hours
 */
function checkWorkingHours(schedule?: any): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute;

  const monSatStart = schedule?.mon_sat?.start || "08:00";
  const monSatEnd = schedule?.mon_sat?.end || "19:40";
  const sunHolidayStart = schedule?.sun_holiday?.start || "08:00";
  const sunHolidayEnd = schedule?.sun_holiday?.end || "11:40";

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const isSundayOrHoliday = day === 0;

  if (isSundayOrHoliday) {
    const start = parseTime(sunHolidayStart);
    const end = parseTime(sunHolidayEnd);
    return currentTime >= start && currentTime <= end;
  } else {
    const start = parseTime(monSatStart);
    const end = parseTime(monSatEnd);
    return currentTime >= start && currentTime <= end;
  }
}

/**
 * Check if a message node is terminal (should stop the flow)
 */
function isTerminalMessage(node: any): boolean {
  const label = (node.data?.label || "").toLowerCase();
  const terminalLabels = [
    "fora de horário",
    "fora de horario",
    "recusar",
    "pesquisa",
    "agradecer",
    "não responder",
    "nao responder",
  ];
  return terminalLabels.some(term => label.includes(term));
}

/**
 * Replace variables in text with context values
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
 * Execute AI Assistant node
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

    const aiResponse =
      typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : JSON.stringify(response.choices[0].message.content);

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
 * Execute Transfer Human node
 */
async function executeTransferHumanNode(
  config: any,
  context: any,
  message: any
) {
  const db = await getDb();
  if (!db) return;

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
async function executeCreateTicketNode(
  config: any,
  context: any,
  message: any
) {
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
    console.log(
      `[Flow Engine] HTTP ${method} ${url} - Status: ${response.status}`
    );
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
}

/**
 * Start the flow engine processor
 */
export function startFlowEngine() {
  console.log("[Flow Engine] Starting...");

  setInterval(() => {
    processPendingMessages().catch(error => {
      console.error("[Flow Engine] Error in processor:", error);
    });
  }, 5000);

  console.log(
    "[Flow Engine] Running - checking for new messages every 5 seconds"
  );
}
