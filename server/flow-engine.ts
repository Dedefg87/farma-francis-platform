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
  sendWhatsAppDocument,
  sendInstagramDocument,
  sendWhatsAppMedia,
} from "./messaging";
import {
  markMessageAsProcessed,
  findOrCreateCustomerByPhone,
} from "./db-messages";
import { invokeLLM } from "./_core/llm";
import { checkBusinessHours } from "./routers-business-hours";

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
async function processMessage(message: unknown) {
  const db = await getDb();
  if (!db) return;

  // Find or create customer
  const customer = await findOrCreateCustomerByPhone(
    message.fromNumber,
    message.fromName
  );

  // Ingest message into conversation_messages (so it appears in the chat)
  try {
    const { ingestInboundConversationMessage } = await import("./db-messages");
    await ingestInboundConversationMessage({
      provider: message.provider,
      fromNumber: message.fromNumber,
      fromName: message.fromName,
      messageType: message.messageType,
      messageText: message.messageText,
      caption: message.caption,
      mediaUrl: message.mediaUrl,
      mimeType: message.mimeType,
      createdAt: message.timestamp ? new Date(message.timestamp * 1000) : new Date(),
    });

  } catch (ingestErr) {
    console.error(`[Flow Engine] Failed to ingest message:`, ingestErr);
    // Continue anyway - will still mark as processed
  }

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
        (n: unknown) => n.type === "trigger"
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

    await markMessageAsProcessed(message.id, {
      customerId: customer.id,
    });
  }
}

/**
 * Check if message matches visual flow trigger node
 */
function matchesVisualFlowTrigger(message: unknown, triggerNode: unknown): boolean {
  const config = triggerNode.data?.config || {};
  const triggerType = config.event || "message_received";
  const messageText = message.messageText?.toLowerCase() || "";

  console.log(`[Flow Engine] Message text: ${messageText?.substring(0, 50)}`);

  // Check if this is a message_received trigger (all messages)
  if (triggerType === "message_received") {

    return true;
  }

  // If no trigger type, match all messages by default
  if (!triggerType) {

    return true;
  }

  // For other trigger types, check conditions
  if (config.condition) {
    try {
      const conditionResult = evaluateTriggerCondition(
        config.condition,
        message
      );

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
function evaluateTriggerCondition(condition: string, message: unknown): boolean {
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
function matchesTrigger(message: unknown, flow: unknown): boolean {
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
async function executeSimpleFlow(message: unknown, flow: unknown, customer: unknown) {
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

}

/**
 * Find and execute active flow for a trigger (typically on new inbound message)
 */
export async function findAndExecuteFlowForTrigger(
  fromNumber: string,
  customer: unknown,
  conversationId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find active (non-archived) flows
  const activeFlows = await db
    .select()
    .from(visualFlows)
    .where(eq(visualFlows.isActive, true))
    .limit(10);

  if (activeFlows.length === 0) {
    console.log("[Flow Engine] No active flows found");
    return;
  }

  for (const flow of activeFlows) {
    try {
      const parsedFlowData = JSON.parse(flow.flowData || "{}");
      const nodes = parsedFlowData.nodes || [];
      const edges = parsedFlowData.edges || [];

      // Build message context - campos que o template espera
      const message = {
        from: fromNumber,
        provider: "whatsapp",
        nome: customer.name,
        mensagem: "",
        origem: "whatsapp",
      };

      // Build customer context
      const customerContext = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      };

      // Execute flow
      await executeFlowFromTrigger(nodes, edges, customerContext, message);
      console.log("[Flow Engine] Flow executed:", flow.id);
    } catch (err) {
      console.error("[Flow Engine] Error executing flow", flow.id, ":", err);
    }
  }
}

/**
 * Execute a visual flow (N8N-style flow) with proper conditional logic
 */
export async function executeVisualFlow(
  message: unknown,
  flowId: number,
  customer: unknown
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
 * Infer node type from label (Portuguese labels to node types)
 * Used for legacy/customNode types that have Portuguese labels like "Gatilho", "Condição", etc.
 */
function inferNodeTypeFromLabel(label: string): string | null {
  if (!label) return null;
  
  const labelLower = label.toLowerCase();
  
  // Trigger/gatilho variations
  if (labelLower.includes("gatilho") || labelLower.includes("trigger") || labelLower.includes("nova mensagem")) {
    return "trigger";
  }
  
  // Condition variations
  if (labelLower.includes("condiçao") || labelLower.includes("condicao") || labelLower.includes("if") || labelLower.includes("se")) {
    return "condition";
  }
  
  // Filter variations
  if (labelLower.includes("filtro") || labelLower.includes("filter")) {
    return "filter";
  }
  
  // Message variations
  if (labelLower.includes("mensagem") || labelLower.includes("message") || labelLower.includes("responder") || labelLower.includes("enviar")) {
    return "message";
  }
  
  // Switch variations
  if (labelLower.includes("switch") || labelLower.includes("casos") || labelLower.includes("cases")) {
    return "switch";
  }
  
  // Wait variations
  if (labelLower.includes("esperar") || labelLower.includes("wait") || labelLower.includes("pausa")) {
    return "wait";
  }
  
  // Set variable variations
  if (labelLower.includes("variavel") || labelLower.includes("set") || labelLower.includes("definir")) {
    return "setVariable";
  }
  
  // HTTP request variations
  if (labelLower.includes("http") || labelLower.includes("api") || labelLower.includes("webhook")) {
    return "httpRequest";
  }
  
  // Transfer human variations
  if (labelLower.includes("transferir") || labelLower.includes("atendente") || labelLower.includes("human")) {
    return "transferHuman";
  }
  
  // Create ticket variations
  if (labelLower.includes("ticket") || labelLower.includes("chamado")) {
    return "createTicket";
  }
  
  // URA menu variations
  if (labelLower.includes("ura") || labelLower.includes("menu") || labelLower.includes("opcoes")) {
    return "uraMenu";
  }
  
  // AI Assistant variations
  if (labelLower.includes("ia") || labelLower.includes("ai") || labelLower.includes("assistente")) {
    return "aiAssistant";
  }
  
  // Function variations
  if (labelLower.includes("funcao") || labelLower.includes("function") || labelLower.includes("acao")) {
    return "function";
  }
  
  // Notify variations
  if (labelLower.includes("notificar") || labelLower.includes("notify") || labelLower.includes("avisar")) {
    return "notify";
  }
  
  // Add tag variations
  if (labelLower.includes("tag") || labelLower.includes("etiqueta")) {
    return "add_tag";
  }
  
  // Assign agent variations
  if (labelLower.includes("atribuir") || labelLower.includes("assign") || labelLower.includes("agente")) {
    return "assign_agent";
  }
  
  // Create contact variations
  if (labelLower.includes("contato") || labelLower.includes("contact")) {
    return "create_contact";
  }
  
  // Create task variations
  if (labelLower.includes("tarefa") || labelLower.includes("task")) {
    return "create_task";
  }
  
  // Email variations
  if (labelLower.includes("email") || labelLower.includes("e-mail")) {
    return "email-send";
  }
  
  // Business hours variations
  if (labelLower.includes("horario") || labelLower.includes("business")) {
    return "if-business-hours";
  }
  
  // Welcome agent variations
  if (labelLower.includes("bem-vindo") || labelLower.includes("welcome")) {
    return "welcome-agent";
  }
  
  // Pharmacy-specific variations
  if (labelLower.includes("receita") || labelLower.includes("prescription")) {
    return "check-prescription";
  }
  
  if (labelLower.includes("pix") || labelLower.includes("pagamento")) {
    return "pix-confirmation";
  }
  
  if (labelLower.includes("atendimento")) {
    return "attendance-create";
  }
  
  return null;
}
/**
 * Execute flow starting from trigger node following edges
 */
async function executeFlowFromTrigger(
  nodes: unknown[],
  edges: unknown[],
  context: unknown,
  message: unknown
): Promise<void> {
  // Try to find trigger node - check type first, then infer from label
  let triggerNode = nodes.find((n: unknown) => n.type === "trigger");
  
  if (!triggerNode) {
    // Try fallback for legacy nodes - infer type from label
    const triggerNodeFallback = nodes.find((n: unknown) => {
      const inferredType = inferNodeTypeFromLabel(n.data?.label);
      if (inferredType === "trigger") {
        n.type = inferredType;
        return true;
      }
      // Also check for explicit trigger/default types
      return n.type === "default" &&
        (n.data?.label?.toLowerCase().includes("nova mensagem") ||
         n.data?.label?.toLowerCase().includes("trigger"));
    });
    
    if (triggerNodeFallback) {
      triggerNodeFallback.type = triggerNodeFallback.type || "trigger";
      triggerNode = triggerNodeFallback;
    }
  }

  if (!triggerNode) {
    console.error(`[Chatbot Flow] No trigger node found`);
    return;
  }

  await executeNodeWithEdges(triggerNode, nodes, edges, context, message);
}

// ==================== VALID NODE TYPES ====================
// Only these node types are recognized by the flow engine.
// Any other type will be skipped with a warning.
const VALID_NODE_TYPES = new Set([
  // Existing core node types
  "trigger",
  "condition",
  "filter",
  "switch",
  "if-else",
  "message",
  "aiAssistant",
  "transferHuman",
  "transfer",
  "createTicket",
  "wait",
  "setVariable",
  "httpRequest",
  "http-request",
  "uraMenu",
  "function",
  "notify",
  "add_tag",
  "assign_agent",
  "create_contact",
  "create_task",
  "check-prescription",
  "pix-confirmation",
  "attendance-create",
  "email-send",
  "whatsapp-send",
  // ===== NEW NODE TYPES FOR VISUAL EDITOR =====
  "if-node",
  "set-node",
  "http-request-node",
  "switch-node",
  "filter-node",
  "merge-node",
  "wait-node",
  "error-handler-node",
  "code-node",
  "split-batches-node",
  "aggregate-node",
  "csv-parse-node",
  "datetime-node",
  "email-send-node",
  "execute-workflow-node",
  "summarize-node",
  "sort-node",
  "limit-node",
  "remove-duplicates-node",
  "sticky-note-node",
  "schedule-trigger",
  "webhook-trigger",
  "if-business-hours",
  "welcome-agent",
]);

function sanitizeNodeType(nodeType: string): string {
  if (VALID_NODE_TYPES.has(nodeType)) return nodeType;
  // Try to map common variations
  const mappings: Record<string, string> = {
    "http_request": "httpRequest",
    "http-request": "httpRequest",
    "set_variable": "setVariable",
    "set-variable": "setVariable",
    "create_ticket": "createTicket",
    "create-ticket": "createTicket",
    "transfer_human": "transferHuman",
    "transfer-human": "transferHuman",
    "ai_assistant": "aiAssistant",
    "ai-assistant": "aiAssistant",
    "ura_menu": "uraMenu",
    "ura-menu": "uraMenu",
    "add_tag": "add_tag",
    "add-tag": "add_tag",
    "assign_agent": "assign_agent",
    "assign-agent": "assign_agent",
    "create_contact": "create_contact",
    "create-contact": "create_contact",
    "create_task": "create_task",
    "create-task": "create_task",
    "whatsapp_send": "whatsapp-send",
    "email_send": "email-send",
    "pix_confirmation": "pix-confirmation",
    "check_prescription": "check-prescription",
    "attendance_create": "attendance-create",
    // Template node types (visual editor) - FIXED MAPPINGS
    "webhook-trigger": "trigger",
    "if-node": "if-else",
    "if-business-hours": "if-business-hours",
    "welcome-agent": "welcome-agent",
    "http-request-node": "httpRequest",
    "set-node": "setVariable",
    "switch-node": "switch",
    "filter-node": "filter",
    "merge-node": "setVariable", // Merge as set variable (combine data)
    "wait-node": "wait",
    "error-handler-node": "customNode", // Visual only, no execution
    "code-node": "function",
    "split-batches-node": "customNode", // Visual only
    "aggregate-node": "setVariable", // Aggregate as set
    "csv-parse-node": "customNode", // Visual only
    "datetime-node": "setVariable", // Set variables with dates
    "email-send-node": "email-send",
    "execute-workflow-node": "customNode", // Visual only
    "summarize-node": "setVariable", // Summarize and set
    "sort-node": "setVariable", // Sort and set
    "limit-node": "setVariable", // Limit and set
    "remove-duplicates-node": "setVariable", // Remove dupes and set
    "sticky-note-node": "customNode", // Visual only
    "schedule-trigger": "trigger",
  };
  return mappings[nodeType] || nodeType;
}

async function executeNodeWithEdges(
  node: unknown,
  nodes: unknown[],
  edges: unknown[],
  context: unknown,
  message: unknown
): Promise<void> {
  // Sanitize node type - check nodeType first, then infer from label for legacy nodes
  const rawType = (node.type as string) || "customNode";
  const nodeType = node.data?.nodeType as string;
  
  // Try to infer node type from label for legacy/customNode/default types
  if (rawType === "customNode" || rawType === "default") {
    const inferredType = inferNodeTypeFromLabel(node.data?.label);
    if (inferredType) {
      node.type = sanitizeNodeType(inferredType);
    } else if (nodeType) {
      node.type = sanitizeNodeType(nodeType);
    } else {
      node.type = sanitizeNodeType(rawType);
    }
  } else {
    node.type = sanitizeNodeType(rawType);
  }

  if (!VALID_NODE_TYPES.has(node.type)) {
    console.warn(
      `[Flow Engine] SKIPPING unknown node type: "${rawType}" (label: ${node.data?.label || node.id}). ` +
      `Valid types: ${Array.from(VALID_NODE_TYPES).join(", ")}`
    );
    // Still try to follow edges so the flow doesn't break
    const outgoingEdges = edges.filter((e: unknown) => e.source === node.id);
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n: unknown) => n.id === edge.target);
      if (nextNode) await executeNodeWithEdges(nextNode, nodes, edges, context, message);
    }
    return;
  }

  console.log(
    `[Chatbot Flow] Executing node: ${node.data?.label || node.id} (${node.type})`
  );

  const config = node.data?.config || {};
  let conditionResult: boolean | null = null;

  switch (node.type) {
    case "trigger":
      break;

    case "condition":
    case "filter":
    case "switch":
    case "if-else":
      conditionResult = evaluateConditionNode(config, context);
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

      }
      break;

    case "aiAssistant":
      await executeAIAssistantNode(config, context, message);
      break;

    case "transfer":
    case "transferHuman":

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

    // ===== BUSINESS HOURS NODE =====
    case "if-business-hours":
      conditionResult = await executeBusinessHoursNode(context, config);
      break;

    // ===== WELCOME AGENT NODE =====
    case "welcome-agent":
      await executeWelcomeAgentNode(config, context, message);
      break;

    // ===== PHARMACY-SPECIFIC NODES =====
    case "check-prescription":
      await executeCheckPrescriptionNode(config, context, message);
      break;

    case "pix-confirmation":
      await executePixConfirmationNode(config, context, message);
      break;
    case "attendance-create":
      await executeAttendanceCreateNode(config, context, message);
      break;

    // ===== ACTION NODES =====
    case "notify":
      await executeNotifyNode(config, context, message);
      break;

    case "add_tag":
      await executeAddTagNode(config, context, message);
      break;

    case "assign_agent":
      await executeAssignAgentNode(config, context, message);
      break;

    case "create_contact":
      await executeCreateContactNode(config, context, message);
      break;

    case "create_task":
      await executeCreateTaskNode(config, context, message);
      break;

    case "http-request":
      await executeHttpRequestNode(config, context);
      break;

    case "email-send":
      // Email sending — log for now, implement with email provider
      console.log(`[Flow Engine] Email to: ${config.to}, subject: ${config.subject}`);
      break;

    case "whatsapp-send":
      const waBody = replaceVariables(config.body || config.message || "", context);
      if (message.provider === "whatsapp") {
        await sendWhatsAppMessage({ to: message.fromNumber, message: waBody });
      } else if (message.provider === "instagram") {
        await sendInstagramMessage({ to: message.fromNumber, message: waBody });
      }
      break;

    // ===== NEW VISUAL EDITOR NODE HANDLERS =====
    case "if-node":
    case "if-else":
      conditionResult = evaluateConditionNode(config, context);
      break;

    case "set-node":
    case "setVariable":
      executeSetVariableNode(config, context);
      break;

    case "http-request-node":
    case "httpRequest":
      await executeHttpRequestNode(config, context, message);
      break;

    case "switch-node":
    case "switch":
      await executeSwitchNode(config, context, edges, node.id, nodes);
      break;

    case "filter-node":
    case "filter":
      conditionResult = evaluateConditionNode(config, context);
      break;

    case "datetime-node":
    case "setVariable":
      executeDatetimeNode(config, context);
      break;

    case "email-send-node":
    case "email-send":
      console.log(`[Flow Engine] Email to: ${config.to}, subject: ${config.subject}`);
      break;

    case "merge-node":
      console.log(`[Flow Engine] Merge node`);
      break;

    case "wait-node":
      const waitDelay = config.delay || config.duration || 1000;
      await new Promise(resolve => setTimeout(resolve, waitDelay));
      break;

    case "error-handler-node":
      console.log(`[Flow Engine] Error handler`);
      context.lastError = config.errorMessage || null;
      break;

    case "code-node":
      console.log(`[Flow Engine] Code node`);
      break;

    case "split-batches-node":
      console.log(`[Flow Engine] Split batches`);
      break;

    case "aggregate-node":
      console.log(`[Flow Engine] Aggregate`);
      break;

    case "csv-parse-node":
      console.log(`[Flow Engine] CSV parse`);
      break;

    case "execute-workflow-node":
      console.log(`[Flow Engine] Execute workflow`);
      break;

    case "summarize-node":
      console.log(`[Flow Engine] Summarize`);
      break;

    case "sort-node":
      console.log(`[Flow Engine] Sort`);
      break;

    case "limit-node":
      console.log(`[Flow Engine] Limit`);
      break;

    case "remove-duplicates-node":
      console.log(`[Flow Engine] Remove duplicates`);
      break;

    case "schedule-trigger":
      console.log(`[Flow Engine] Schedule trigger`);
      break;

    case "webhook-trigger":
      console.log(`[Flow Engine] Webhook trigger`);
      break;

    case "customNode":
      console.warn(`[Flow Engine] customNode has no handler - ensure sanitizeNodeType mapped correctly`);
      break;

    default:
      console.warn(`[Flow Engine] Unknown node type: ${node.type} — skipping`);
  }

  const outgoingEdges = edges.filter((e: unknown) => e.source === node.id);

  if (outgoingEdges.length === 0) {

    return;
  }

  if (node.type === "condition" && conditionResult !== null) {
    const trueEdge = outgoingEdges.find(
      (e: unknown) =>
        e.label?.toLowerCase() === "sim" ||
        e.sourceHandle === "true" ||
        e.sourceHandle === "0"
    );
    const falseEdge = outgoingEdges.find(
      (e: unknown) =>
        e.label?.toLowerCase() === "não" ||
        e.label?.toLowerCase() === "nao" ||
        e.sourceHandle === "false" ||
        e.sourceHandle === "1"
    );

    const nextEdge = conditionResult ? trueEdge : falseEdge;

    if (nextEdge) {
      const nextNode = nodes.find((n: unknown) => n.id === nextEdge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message);
      }
    }
  } else {
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n: unknown) => n.id === edge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message);
      }
    }
  }
}

/**
 * Evaluate a condition node
 */
function evaluateConditionNode(config: unknown, context: unknown): boolean {
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
function checkWorkingHours(schedule?: unknown): boolean {
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
function isTerminalMessage(node: unknown): boolean {
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
function replaceVariables(text: string, context: unknown): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split(".");
    let value: unknown = context;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    return value !== undefined ? String(value) : match;
  });
}

/**
 * Execute Welcome Agent node - sends welcome message with logged-in agent name
 */
async function executeWelcomeAgentNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const useAgentName = config.useAgentName !== false;
  const fallbackName = config.fallbackName || "Assistente Virtual";
  
  // Get agent name from context (set in executeVisualFlow)
  const agentName = context.agent_name || (useAgentName ? fallbackName : null);
  
  // Build message with agent name replacement
  let messageText = config.message || "Olá! Como posso te ajudar?";
  
  // Replace {{agent_name}} placeholder
  if (agentName) {
    messageText = messageText.replace(/\{\{agent_name\}\}/g, agentName);
  }
  
  const finalMessage = replaceVariables(messageText, context);

  console.log(`[Flow Engine] Welcome Agent message: "${finalMessage.substring(0, 80)}..."`);

  if (message.provider === "whatsapp") {
    await sendWhatsAppMessage({ to: message.fromNumber, message: finalMessage });
  } else if (message.provider === "instagram") {
    await sendInstagramMessage({ to: message.fromNumber, message: finalMessage });
  }
}

/**
 * Execute AI Assistant node
 */
async function executeAIAssistantNode(config: unknown, context: unknown, message: unknown) {
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
  config: unknown,
  context: unknown,
  message: unknown
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

  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;

  // Expose ticket in context for later nodes
  context.ticket = {
    id: ticketId ?? null,
    ...ticketData,
  };

  // Best-effort CRM outbox event
  try {
    const { fireAndForget, enqueueCrmOutboxEvent } = await import("./crm-core");
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "TicketCreated",
        entityType: "ticket",
        entityId: ticketId ?? null,
        actorUserId: null,
        payload: {
          source: "flow-engine",
          department,
          channel: message.provider,
          customerId: context.customer?.id ?? null,
          fromNumber: message.fromNumber,
        },
      });
    });
  } catch {
    // ignore
  }

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

}

/**
 * Execute Create Ticket node
 */
async function executeCreateTicketNode(
  config: unknown,
  context: unknown,
  message: unknown
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

  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;
  context.ticket = {
    id: ticketId ?? null,
    ...ticketData,
  };

  // Best-effort CRM outbox event
  try {
    const { fireAndForget, enqueueCrmOutboxEvent } = await import("./crm-core");
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "TicketCreated",
        entityType: "ticket",
        entityId: ticketId ?? null,
        actorUserId: null,
        payload: {
          source: "flow-engine",
          channel: message.provider,
          customerId: context.customer?.id ?? null,
          fromNumber: message.fromNumber,
          subject,
        },
      });
    });
  } catch {
    // ignore
  }
}

/**
 * Execute Set Variable node
 */
function executeSetVariableNode(config: unknown, context: unknown) {
  const variableName = config.variableName || "";
  const variableValue = replaceVariables(config.variableValue || "", context);
  context.variables[variableName] = variableValue;

}

/**
 * Execute URA Menu node
 */
async function executeURAMenuNode(config: unknown, context: unknown, message: unknown) {
  const menuText = replaceVariables(config.menuText || "", context);
  const options = config.options || [];

  let menuMessage = menuText + "\n\n";
  options.forEach((opt: unknown, index: number) => {
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
 * Execute Check Prescription node (pharmacy-specific)
 */
async function executeCheckPrescriptionNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const fileUrl = replaceVariables(config.fileUrl || "", context);
  const aiModel = config.aiModel || "gpt-4";

  console.log(`[Flow Engine] Check Prescription: ${fileUrl}, model: ${aiModel}`);

  // Use AI to analyze prescription
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content: "Você é um farmacêutico especializado. Analise a receita médica e retorne: válida ou inválida, nome do medicamento, dosagem, e observações.",
        },
        {
          role: "user" as const,
          content: `Analise esta receita: ${fileUrl}. Mensagem do cliente: ${message.messageText || ""}`,
        },
      ],
    });

    const result = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : JSON.stringify(response.choices[0].message.content);

    context.variables.prescriptionResult = result;
    context.variables.prescriptionValid = result.toLowerCase().includes("válida");

    // Send result to customer
    const reply = `📋 *Análise da Receita*\n\n${result}\n\nUm farmacêutico irá validar em breve.`;
    if (message.provider === "whatsapp") {
      await sendWhatsAppMessage({ to: message.fromNumber, message: reply });
    } else if (message.provider === "instagram") {
      await sendInstagramMessage({ to: message.fromNumber, message: reply });
    }
  } catch (error) {
    console.error("[Flow Engine] Check Prescription error:", error);
  }
}

/**
 * Execute Pix Confirmation node (pharmacy-specific)
 */
async function executePixConfirmationNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const pixKey = config.pixKey || "";
  const expectedAmount = config.expectedAmount || 0;

  console.log(`[Flow Engine] Pix Confirmation: key=${pixKey}, amount=${expectedAmount}`);

  context.variables.pixKey = pixKey;
  context.variables.pixAmount = expectedAmount;

  const reply = `💳 *Pagamento via Pix*\n\nChave: ${pixKey}\nValor: R$ ${expectedAmount}\n\nEnvie o comprovante após o pagamento.`;
  if (message.provider === "whatsapp") {
    await sendWhatsAppMessage({ to: message.fromNumber, message: reply });
  } else if (message.provider === "instagram") {
    await sendInstagramMessage({ to: message.fromNumber, message: reply });
  }
}

/**
 * Execute Attendance Create node (pharmacy-specific)
 */
async function executeAttendanceCreateNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const db = await getDb();
  if (!db) return;

  const priority = config.priority || "medium";
  const channel = config.channel || message.provider;

  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  const ticketData = {
    ticketNumber,
    customerId: context.customer?.id,
    subject: `Atendimento ${channel}: ${message.fromNumber}`,
    description: message.messageText || "",
    status: "open" as const,
    priority: priority as any,
    channel: channel as any,
  };

  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;

  context.variables.attendanceTicket = { id: ticketId, ...ticketData };

  console.log(`[Flow Engine] Attendance created: ${ticketNumber}`);
}

/**
 * Execute Notify node
 */
async function executeNotifyNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const alert = replaceVariables(config.alert || "", context);
  console.log(`[Flow Engine] NOTIFICATION: ${alert}`);
  // TODO: Implement actual notification (push, email, etc.)
}

/**
 * Execute Add Tag node
 */
async function executeAddTagNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const db = await getDb();
  if (!db) return;

  const tag = config.tag || "";
  const customerId = context.customer?.id;

  if (customerId && tag) {
    try {
      // Get current tags
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (customer) {
        const currentTags = customer.tags ? JSON.parse(customer.tags as string) : [];
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          await db.update(customers).set({ tags: JSON.stringify(currentTags) }).where(eq(customers.id, customerId));
        }
      }
    } catch (error) {
      console.error("[Flow Engine] Add Tag error:", error);
    }
  }

  context.variables[`tag_${tag.replace(/[^a-zA-Z0-9]/g, "_")}`] = true;
}

/**
 * Execute Assign Agent node
 */
async function executeAssignAgentNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const db = await getDb();
  if (!db) return;

  const queue = config.queue || "general";
  const fallback = config.fallback || "";

  // Find available agent
  try {
    const agents = await db.select().from(users).where(and(eq(users.role, "agent"), eq(users.status, "active"))).limit(5);

    if (agents.length > 0) {
      const assignedAgent = agents[Math.floor(Math.random() * agents.length)];
      context.assignedTo = assignedAgent.id;
      context.agent_name = assignedAgent.name;

      // Update conversation assignment
      const [conv] = await db.select().from(conversations).where(and(eq(conversations.customerId, context.customer?.id), eq(conversations.status, "open"))).orderBy(desc(conversations.lastMessageAt)).limit(1);

      if (conv) {
        await db.update(conversations).set({ assignedTo: assignedAgent.id, status: "assigned" }).where(eq(conversations.id, conv.id));
      }

      console.log(`[Flow Engine] Agent assigned: ${assignedAgent.name} (queue: ${queue})`);
    } else if (fallback) {
      console.log(`[Flow Engine] No agents available, using fallback: ${fallback}`);
      context.agent_name = fallback;
    }
  } catch (error) {
    console.error("[Flow Engine] Assign Agent error:", error);
  }
}

/**
 * Execute Create Contact node
 */
async function executeCreateContactNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db.select().from(customers).where(eq(customers.phone, message.fromNumber)).limit(1);

    if (existing.length === 0) {
      const tags = config.tags ? JSON.stringify(config.tags) : "[]";
      await db.insert(customers).values({
        name: message.fromName || "Cliente",
        phone: message.fromNumber,
        tags,
        createdAt: new Date(),
      });
      console.log(`[Flow Engine] Contact created: ${message.fromNumber}`);
    } else {
      console.log(`[Flow Engine] Contact already exists: ${message.fromNumber}`);
    }
  } catch (error) {
    console.error("[Flow Engine] Create Contact error:", error);
  }
}

/**
 * Execute Create Task node
 */
async function executeCreateTaskNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
  const title = replaceVariables(config.title || "Nova tarefa", context);
  const description = replaceVariables(config.description || "", context);
  const priority = config.priority || "medium";
  const assignTo = config.assignTo || config.assignee || null;

  console.log(`[Flow Engine] Task created: ${title} (priority: ${priority}, assignTo: ${assignTo})`);

  context.variables.lastTask = { title, description, priority, assignTo };
}

/**
 * Execute HTTP Request node (with message context)
 */
async function executeHttpRequestNode(
  config: unknown,
  context: unknown,
  message: unknown
) {
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

  } catch (error) {
    console.error(`[Flow Engine] HTTP Request error:`, error);
  }
}

/**
 * Execute Switch node — routes to multiple outputs based on value
 */
async function executeSwitchNode(
  config: unknown,
  context: unknown,
  edges: unknown[],
  nodeId: string,
  nodes: unknown[]
) {
  const value = replaceVariables(config.value || "", context);
  const rules = config.rules || [];

  // Find matching rule
  let matchedEdge = null;
  for (const rule of rules) {
    if (value === rule.value || value.includes(rule.value)) {
      matchedEdge = edges.find((e: unknown) => e.sourceHandle === rule.output);
      break;
    }
  }

  // Default fallback
  if (!matchedEdge) {
    matchedEdge = edges.find((e: unknown) => e.sourceHandle === "default");
  }

  if (matchedEdge) {
    const nextNode = nodes.find((n: unknown) => n.id === matchedEdge.target);
    if (nextNode) {
      console.log(`[Flow Engine] Switch matched: ${matchedEdge.sourceHandle}`);
    }
  }
}

/**
 * Execute Datetime node — sets date/time variables
 */
function executeDatetimeNode(config: unknown, context: unknown) {
  const format = config.format || "iso";
  const now = new Date();

  if (config.variableName) {
    context.variables[config.variableName] = format === "iso" 
      ? now.toISOString() 
      : now.toLocaleString("pt-BR");
  }

  if (config.addDays) {
    const future = new Date(now.getTime() + config.addDays * 24 * 60 * 60 * 1000);
    context.variables.futureDate = future.toISOString();
  }
}

/**
 * Start the flow engine processor
 */
/**
 * Execute Business Hours node - checks if current time is within business hours
 */
async function executeBusinessHoursNode(context: unknown, config: unknown = {}): Promise<boolean> {
  try {
    // Check if this is a holiday check
    const checkType = config.checkType || "business";
    
    const result = await checkBusinessHours(new Date());
    
    context.variables.isBusinessHours = result.isOpen;
    context.variables.businessHoursOpen = result.isOpen;
    context.variables.businessHoursSchedule = result.schedule;
    
    if (result.holidayName) {
      context.variables.isHoliday = true;
      context.variables.holidayName = result.holidayName;
    }
    
    return result.isOpen;
  } catch (error) {
    console.error("[Flow Engine] Business Hours check error:", error);
    return false;
  }
}

/**
 * Start the flow engine processor
 */
export function startFlowEngine() {

  setInterval(() => {
    processPendingMessages().catch(error => {
      console.error("[Flow Engine] Error in processor:", error);
    });
  }, 5000);

}
