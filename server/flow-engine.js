"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPendingMessages = processPendingMessages;
exports.findAndExecuteFlowForTrigger = findAndExecuteFlowForTrigger;
exports.executeVisualFlow = executeVisualFlow;
exports.startFlowEngine = startFlowEngine;
var db_1 = require("./db");
var schema_1 = require("../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
var messaging_1 = require("./messaging");
var db_messages_1 = require("./db-messages");
var llm_1 = require("./_core/llm");
var routers_business_hours_1 = require("./routers-business-hours");
/**
 * Process pending messages through automation flows
 * This function should be called periodically (e.g., every 5 seconds)
 */
function processPendingMessages() {
    return __awaiter(this, void 0, void 0, function () {
        var db, pending, _i, pending_1, message, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.receivedMessages)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receivedMessages.processed, 0), (0, 
                        // Skip survey ratings (1-5) so chatbot can process them
                        drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["NOT (\n          ", " = 'text'\n          AND TRIM(COALESCE(", ", '')) IN ('1','2','3','4','5')\n        )"], ["NOT (\n          ", " = 'text'\n          AND TRIM(COALESCE(", ", '')) IN ('1','2','3','4','5')\n        )"])), schema_1.receivedMessages.messageType, schema_1.receivedMessages.messageText)))
                            .limit(10)];
                case 2:
                    pending = _a.sent();
                    _i = 0, pending_1 = pending;
                    _a.label = 3;
                case 3:
                    if (!(_i < pending_1.length)) return [3 /*break*/, 8];
                    message = pending_1[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, processMessage(message)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error("[Flow Engine] Error processing message ".concat(message.id, ":"), error_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process a single message through automation flows
 */
function processMessage(message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, customer, ingestInboundConversationMessage, ingestErr_1, visualFlowsList, matchedVisualFlow, _i, visualFlowsList_1, flow, flowData, triggerNodes, _a, triggerNodes_1, triggerNode, error_2, flows, matchedFlow, _b, flows_1, flow;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _d.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, db_messages_1.findOrCreateCustomerByPhone)(message.fromNumber, message.fromName)];
                case 2:
                    customer = _d.sent();
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 6, , 7]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./db-messages"); })];
                case 4:
                    ingestInboundConversationMessage = (_d.sent()).ingestInboundConversationMessage;
                    return [4 /*yield*/, ingestInboundConversationMessage({
                            provider: message.provider,
                            fromNumber: message.fromNumber,
                            fromName: message.fromName,
                            messageType: message.messageType,
                            messageText: message.messageText,
                            caption: message.caption,
                            mediaUrl: message.mediaUrl,
                            mimeType: message.mimeType,
                            createdAt: message.timestamp ? new Date(message.timestamp * 1000) : new Date(),
                        })];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    ingestErr_1 = _d.sent();
                    console.error("[Flow Engine] Failed to ingest message:", ingestErr_1);
                    return [3 /*break*/, 7];
                case 7: return [4 /*yield*/, db
                        .select()
                        .from(schema_1.visualFlows)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visualFlows.isActive, 1)))
                        .orderBy((0, drizzle_orm_1.desc)(schema_1.visualFlows.updatedAt))];
                case 8:
                    visualFlowsList = _d.sent();
                    matchedVisualFlow = null;
                    for (_i = 0, visualFlowsList_1 = visualFlowsList; _i < visualFlowsList_1.length; _i++) {
                        flow = visualFlowsList_1[_i];
                        try {
                            flowData = JSON.parse(flow.flowData || "{}");
                            triggerNodes = (_c = flowData.nodes) === null || _c === void 0 ? void 0 : _c.filter(function (n) { return n.type === "trigger"; });
                            if (triggerNodes && triggerNodes.length > 0) {
                                for (_a = 0, triggerNodes_1 = triggerNodes; _a < triggerNodes_1.length; _a++) {
                                    triggerNode = triggerNodes_1[_a];
                                    if (matchesVisualFlowTrigger(message, triggerNode)) {
                                        matchedVisualFlow = flow;
                                        break;
                                    }
                                }
                            }
                            if (matchedVisualFlow)
                                break;
                        }
                        catch (e) {
                            console.error("[Flow Engine] Error parsing visual flow ".concat(flow.id, ":"), e);
                        }
                    }
                    if (!matchedVisualFlow) return [3 /*break*/, 13];
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 12, , 13]);
                    return [4 /*yield*/, executeVisualFlow(message, matchedVisualFlow.id, customer)];
                case 10:
                    _d.sent();
                    return [4 /*yield*/, (0, db_messages_1.markMessageAsProcessed)(message.id, {
                            customerId: customer.id,
                        })];
                case 11:
                    _d.sent();
                    return [2 /*return*/];
                case 12:
                    error_2 = _d.sent();
                    console.error("[Flow Engine] Error executing visual flow:", error_2);
                    return [3 /*break*/, 13];
                case 13: return [4 /*yield*/, db
                        .select()
                        .from(schema_1.automationFlows)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.automationFlows.isActive, 1), (0, drizzle_orm_1.eq)(schema_1.automationFlows.channel, message.provider)))];
                case 14:
                    flows = _d.sent();
                    matchedFlow = null;
                    for (_b = 0, flows_1 = flows; _b < flows_1.length; _b++) {
                        flow = flows_1[_b];
                        if (matchesTrigger(message, flow)) {
                            matchedFlow = flow;
                            break;
                        }
                    }
                    if (!matchedFlow) return [3 /*break*/, 17];
                    console.log("[Flow Engine] Message matched flow: ".concat(matchedFlow.name, " (ID: ").concat(matchedFlow.id, ")"));
                    if (!matchedFlow.id) {
                        console.error("[Flow Engine] Flow ID is invalid, skipping update");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, executeSimpleFlow(message, matchedFlow, customer)];
                case 15:
                    _d.sent();
                    return [4 /*yield*/, (0, db_messages_1.markMessageAsProcessed)(message.id, {
                            customerId: customer.id,
                            automationFlowId: matchedFlow.id,
                        })];
                case 16:
                    _d.sent();
                    return [3 /*break*/, 19];
                case 17: return [4 /*yield*/, (0, db_messages_1.markMessageAsProcessed)(message.id, {
                        customerId: customer.id,
                    })];
                case 18:
                    _d.sent();
                    _d.label = 19;
                case 19: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if message matches visual flow trigger node
 */
function matchesVisualFlowTrigger(message, triggerNode) {
    var _a, _b;
    var config = ((_a = triggerNode.data) === null || _a === void 0 ? void 0 : _a.config) || {};
    var triggerType = config.event || "message_received";
    var messageText = ((_b = message.messageText) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
    console.log("[Flow Engine] Message text: ".concat(messageText === null || messageText === void 0 ? void 0 : messageText.substring(0, 50)));
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
            var conditionResult = evaluateTriggerCondition(config.condition, message);
            return conditionResult;
        }
        catch (error) {
            console.error("[Flow Engine] Condition evaluation error:", error);
            return false;
        }
    }
    return true;
}
/**
 * Evaluate trigger condition expression
 */
function evaluateTriggerCondition(condition, message) {
    var _a, _b, _c;
    var messageText = ((_a = message.messageText) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
    var messageType = message.messageType || "text";
    // Check for call/video
    if (condition.includes("message_type")) {
        if (condition.includes("call") || condition.includes("video")) {
            return messageType === "call" || messageType === "video";
        }
    }
    // Check for close_reason
    if (condition.includes("close_reason")) {
        var expectedReason = (_b = condition.split("==")[1]) === null || _b === void 0 ? void 0 : _b.trim().replace(/"/g, "");
        var actualReason = message.closeReason || message.close_reason || "";
        return actualReason === expectedReason;
    }
    // Simple text matching
    if (condition.includes("message_text")) {
        var expectedText = (_c = condition
            .split("==")[1]) === null || _c === void 0 ? void 0 : _c.trim().replace(/"/g, "").replace(/'/g, "");
        return messageText.includes(expectedText.toLowerCase());
    }
    // Default to true for unknown conditions
    return true;
}
/**
 * Check if message matches flow trigger
 */
function matchesTrigger(message, flow) {
    var _a, _b;
    var trigger = ((_a = flow.trigger) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
    var messageText = ((_b = message.messageText) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "";
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
function executeSimpleFlow(message, flow, customer) {
    return __awaiter(this, void 0, void 0, function () {
        var response, processedResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = flow.response || "Obrigado pela sua mensagem!";
                    processedResponse = replaceVariables(response, {
                        customer: customer,
                        message: message,
                    });
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({
                            to: message.fromNumber,
                            message: processedResponse,
                            replyToMessageId: message.externalId,
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({
                            to: message.fromNumber,
                            message: processedResponse,
                        })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Find and execute active flow for a trigger (typically on new inbound message)
 */
function findAndExecuteFlowForTrigger(fromNumber, customer, conversationId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, activeFlows, _i, activeFlows_1, flow, parsedFlowData, nodes, edges, message, customerContext, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.visualFlows)
                            .where((0, drizzle_orm_1.eq)(schema_1.visualFlows.isActive, true))
                            .limit(10)];
                case 2:
                    activeFlows = _a.sent();
                    if (activeFlows.length === 0) {
                        console.log("[Flow Engine] No active flows found");
                        return [2 /*return*/];
                    }
                    _i = 0, activeFlows_1 = activeFlows;
                    _a.label = 3;
                case 3:
                    if (!(_i < activeFlows_1.length)) return [3 /*break*/, 8];
                    flow = activeFlows_1[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    parsedFlowData = JSON.parse(flow.flowData || "{}");
                    nodes = parsedFlowData.nodes || [];
                    edges = parsedFlowData.edges || [];
                    message = {
                        from: fromNumber,
                        provider: "whatsapp",
                        nome: customer.name,
                        mensagem: "",
                        origem: "whatsapp",
                    };
                    customerContext = {
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                    };
                    // Execute flow
                    return [4 /*yield*/, executeFlowFromTrigger(nodes, edges, customerContext, message)];
                case 5:
                    // Execute flow
                    _a.sent();
                    console.log("[Flow Engine] Flow executed:", flow.id);
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    console.error("[Flow Engine] Error executing flow", flow.id, ":", err_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a visual flow (N8N-style flow) with proper conditional logic
 */
function executeVisualFlow(message, flowId, customer) {
    return __awaiter(this, void 0, void 0, function () {
        var db, flowData, flow, parsedFlowData, nodes, edges, agentName, activeConversation, agent, context;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.visualFlows)
                            .where((0, drizzle_orm_1.eq)(schema_1.visualFlows.id, flowId))
                            .limit(1)];
                case 2:
                    flowData = _a.sent();
                    if (flowData.length === 0) {
                        console.error("[Flow Engine] Visual flow ".concat(flowId, " not found"));
                        return [2 /*return*/];
                    }
                    flow = flowData[0];
                    parsedFlowData = JSON.parse(flow.flowData || "{}");
                    nodes = parsedFlowData.nodes || [];
                    edges = parsedFlowData.edges || [];
                    agentName = null;
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.conversations)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.customerId, customer.id), (0, drizzle_orm_1.eq)(schema_1.conversations.status, "assigned")))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.conversations.lastMessageAt))
                            .limit(1)];
                case 3:
                    activeConversation = (_a.sent())[0];
                    if (!(activeConversation === null || activeConversation === void 0 ? void 0 : activeConversation.assignedTo)) return [3 /*break*/, 5];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.users)
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, activeConversation.assignedTo))
                            .limit(1)];
                case 4:
                    agent = (_a.sent())[0];
                    if (agent) {
                        agentName = agent.name;
                    }
                    _a.label = 5;
                case 5:
                    context = {
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
                        assignedTo: activeConversation === null || activeConversation === void 0 ? void 0 : activeConversation.assignedTo,
                        variables: {},
                    };
                    return [4 /*yield*/, executeFlowFromTrigger(nodes, edges, context, message)];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Infer node type from label (Portuguese labels to node types)
 * Used for legacy/customNode types that have Portuguese labels like "Gatilho", "Condição", etc.
 */
function inferNodeTypeFromLabel(label) {
    if (!label)
        return null;
    var labelLower = label.toLowerCase();
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
function executeFlowFromTrigger(nodes, edges, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var triggerNode, triggerNodeFallback;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    triggerNode = nodes.find(function (n) { return n.type === "trigger"; });
                    if (!triggerNode) {
                        triggerNodeFallback = nodes.find(function (n) {
                            var _a, _b, _c, _d, _e;
                            var inferredType = inferNodeTypeFromLabel((_a = n.data) === null || _a === void 0 ? void 0 : _a.label);
                            if (inferredType === "trigger") {
                                n.type = inferredType;
                                return true;
                            }
                            // Also check for explicit trigger/default types
                            return n.type === "default" &&
                                (((_c = (_b = n.data) === null || _b === void 0 ? void 0 : _b.label) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes("nova mensagem")) ||
                                    ((_e = (_d = n.data) === null || _d === void 0 ? void 0 : _d.label) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes("trigger")));
                        });
                        if (triggerNodeFallback) {
                            triggerNodeFallback.type = triggerNodeFallback.type || "trigger";
                            triggerNode = triggerNodeFallback;
                        }
                    }
                    if (!triggerNode) {
                        console.error("[Chatbot Flow] No trigger node found");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, executeNodeWithEdges(triggerNode, nodes, edges, context, message)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ==================== VALID NODE TYPES ====================
// Only these node types are recognized by the flow engine.
// Any other type will be skipped with a warning.
var VALID_NODE_TYPES = new Set([
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
function sanitizeNodeType(nodeType) {
    if (VALID_NODE_TYPES.has(nodeType))
        return nodeType;
    // Try to map common variations
    var mappings = {
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
function executeNodeWithEdges(node, nodes, edges, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var rawType, nodeType, inferredType, outgoingEdges_3, _loop_1, _i, outgoingEdges_1, edge, config, conditionResult, _a, messageText, hour, greeting, delay_1, waBody, waitDelay_1, outgoingEdges, trueEdge, falseEdge, nextEdge_1, nextNode, _loop_2, _b, outgoingEdges_2, edge;
        var _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    rawType = node.type || "customNode";
                    nodeType = (_c = node.data) === null || _c === void 0 ? void 0 : _c.nodeType;
                    // Try to infer node type from label for legacy/customNode/default types
                    if (rawType === "customNode" || rawType === "default") {
                        inferredType = inferNodeTypeFromLabel((_d = node.data) === null || _d === void 0 ? void 0 : _d.label);
                        if (inferredType) {
                            node.type = sanitizeNodeType(inferredType);
                        }
                        else if (nodeType) {
                            node.type = sanitizeNodeType(nodeType);
                        }
                        else {
                            node.type = sanitizeNodeType(rawType);
                        }
                    }
                    else {
                        node.type = sanitizeNodeType(rawType);
                    }
                    if (!!VALID_NODE_TYPES.has(node.type)) return [3 /*break*/, 5];
                    console.warn("[Flow Engine] SKIPPING unknown node type: \"".concat(rawType, "\" (label: ").concat(((_e = node.data) === null || _e === void 0 ? void 0 : _e.label) || node.id, "). ") +
                        "Valid types: ".concat(Array.from(VALID_NODE_TYPES).join(", ")));
                    outgoingEdges_3 = edges.filter(function (e) { return e.source === node.id; });
                    _loop_1 = function (edge) {
                        var nextNode;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0:
                                    nextNode = nodes.find(function (n) { return n.id === edge.target; });
                                    if (!nextNode) return [3 /*break*/, 2];
                                    return [4 /*yield*/, executeNodeWithEdges(nextNode, nodes, edges, context, message)];
                                case 1:
                                    _j.sent();
                                    _j.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, outgoingEdges_1 = outgoingEdges_3;
                    _h.label = 1;
                case 1:
                    if (!(_i < outgoingEdges_1.length)) return [3 /*break*/, 4];
                    edge = outgoingEdges_1[_i];
                    return [5 /*yield**/, _loop_1(edge)];
                case 2:
                    _h.sent();
                    _h.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
                case 5:
                    console.log("[Chatbot Flow] Executing node: ".concat(((_f = node.data) === null || _f === void 0 ? void 0 : _f.label) || node.id, " (").concat(node.type, ")"));
                    config = ((_g = node.data) === null || _g === void 0 ? void 0 : _g.config) || {};
                    conditionResult = null;
                    _a = node.type;
                    switch (_a) {
                        case "trigger": return [3 /*break*/, 6];
                        case "condition": return [3 /*break*/, 7];
                        case "filter": return [3 /*break*/, 7];
                        case "switch": return [3 /*break*/, 7];
                        case "if-else": return [3 /*break*/, 7];
                        case "message": return [3 /*break*/, 8];
                        case "function": return [3 /*break*/, 13];
                        case "aiAssistant": return [3 /*break*/, 14];
                        case "transfer": return [3 /*break*/, 16];
                        case "transferHuman": return [3 /*break*/, 16];
                        case "createTicket": return [3 /*break*/, 18];
                        case "wait": return [3 /*break*/, 20];
                        case "setVariable": return [3 /*break*/, 22];
                        case "httpRequest": return [3 /*break*/, 23];
                        case "uraMenu": return [3 /*break*/, 25];
                        case "if-business-hours": return [3 /*break*/, 27];
                        case "welcome-agent": return [3 /*break*/, 29];
                        case "check-prescription": return [3 /*break*/, 31];
                        case "pix-confirmation": return [3 /*break*/, 33];
                        case "attendance-create": return [3 /*break*/, 35];
                        case "notify": return [3 /*break*/, 37];
                        case "add_tag": return [3 /*break*/, 39];
                        case "assign_agent": return [3 /*break*/, 41];
                        case "create_contact": return [3 /*break*/, 43];
                        case "create_task": return [3 /*break*/, 45];
                        case "http-request": return [3 /*break*/, 47];
                        case "email-send": return [3 /*break*/, 49];
                        case "whatsapp-send": return [3 /*break*/, 50];
                        case "if-node": return [3 /*break*/, 55];
                        case "if-else": return [3 /*break*/, 55];
                        case "set-node": return [3 /*break*/, 56];
                        case "setVariable": return [3 /*break*/, 56];
                        case "http-request-node": return [3 /*break*/, 57];
                        case "httpRequest": return [3 /*break*/, 57];
                        case "switch-node": return [3 /*break*/, 59];
                        case "switch": return [3 /*break*/, 59];
                        case "filter-node": return [3 /*break*/, 61];
                        case "filter": return [3 /*break*/, 61];
                        case "datetime-node": return [3 /*break*/, 62];
                        case "setVariable": return [3 /*break*/, 62];
                        case "email-send-node": return [3 /*break*/, 63];
                        case "email-send": return [3 /*break*/, 63];
                        case "merge-node": return [3 /*break*/, 64];
                        case "wait-node": return [3 /*break*/, 65];
                        case "error-handler-node": return [3 /*break*/, 67];
                        case "code-node": return [3 /*break*/, 68];
                        case "split-batches-node": return [3 /*break*/, 69];
                        case "aggregate-node": return [3 /*break*/, 70];
                        case "csv-parse-node": return [3 /*break*/, 71];
                        case "execute-workflow-node": return [3 /*break*/, 72];
                        case "summarize-node": return [3 /*break*/, 73];
                        case "sort-node": return [3 /*break*/, 74];
                        case "limit-node": return [3 /*break*/, 75];
                        case "remove-duplicates-node": return [3 /*break*/, 76];
                        case "schedule-trigger": return [3 /*break*/, 77];
                        case "webhook-trigger": return [3 /*break*/, 78];
                        case "customNode": return [3 /*break*/, 79];
                    }
                    return [3 /*break*/, 80];
                case 6: return [3 /*break*/, 81];
                case 7:
                    conditionResult = evaluateConditionNode(config, context);
                    return [3 /*break*/, 81];
                case 8:
                    messageText = replaceVariables(config.message || "", context);
                    console.log("[Chatbot Flow] Sending message: \"".concat(messageText.substring(0, 50), "...\""));
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({
                            to: message.fromNumber,
                            message: messageText,
                        })];
                case 9:
                    _h.sent();
                    return [3 /*break*/, 12];
                case 10:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 12];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({
                            to: message.fromNumber,
                            message: messageText,
                        })];
                case 11:
                    _h.sent();
                    _h.label = 12;
                case 12:
                    if (config.terminal || isTerminalMessage(node)) {
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 81];
                case 13:
                    if (config.function === "get_greeting") {
                        hour = new Date().getHours();
                        greeting = "Bom dia";
                        if (hour >= 12 && hour < 18)
                            greeting = "Boa tarde";
                        else if (hour >= 18)
                            greeting = "Boa noite";
                        context.greeting = greeting;
                        context.agent_name = context.agent_name || "Atendente";
                    }
                    return [3 /*break*/, 81];
                case 14: return [4 /*yield*/, executeAIAssistantNode(config, context, message)];
                case 15:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 16: return [4 /*yield*/, executeTransferHumanNode(config, context, message)];
                case 17:
                    _h.sent();
                    return [2 /*return*/];
                case 18: return [4 /*yield*/, executeCreateTicketNode(config, context, message)];
                case 19:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 20:
                    console.log("[Flow Engine] Wait node: ".concat(JSON.stringify(config)));
                    delay_1 = config.delay || config.duration || 1000;
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                case 21:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 22:
                    executeSetVariableNode(config, context);
                    return [3 /*break*/, 81];
                case 23: return [4 /*yield*/, executeHttpRequestNode(config, context)];
                case 24:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 25: return [4 /*yield*/, executeURAMenuNode(config, context, message)];
                case 26:
                    _h.sent();
                    return [2 /*return*/];
                case 27: return [4 /*yield*/, executeBusinessHoursNode(context, config)];
                case 28:
                    conditionResult = _h.sent();
                    return [3 /*break*/, 81];
                case 29: return [4 /*yield*/, executeWelcomeAgentNode(config, context, message)];
                case 30:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 31: return [4 /*yield*/, executeCheckPrescriptionNode(config, context, message)];
                case 32:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 33: return [4 /*yield*/, executePixConfirmationNode(config, context, message)];
                case 34:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 35: return [4 /*yield*/, executeAttendanceCreateNode(config, context, message)];
                case 36:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 37: return [4 /*yield*/, executeNotifyNode(config, context, message)];
                case 38:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 39: return [4 /*yield*/, executeAddTagNode(config, context, message)];
                case 40:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 41: return [4 /*yield*/, executeAssignAgentNode(config, context, message)];
                case 42:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 43: return [4 /*yield*/, executeCreateContactNode(config, context, message)];
                case 44:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 45: return [4 /*yield*/, executeCreateTaskNode(config, context, message)];
                case 46:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 47: return [4 /*yield*/, executeHttpRequestNode(config, context)];
                case 48:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 49:
                    // Email sending — log for now, implement with email provider
                    console.log("[Flow Engine] Email to: ".concat(config.to, ", subject: ").concat(config.subject));
                    return [3 /*break*/, 81];
                case 50:
                    waBody = replaceVariables(config.body || config.message || "", context);
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 52];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({ to: message.fromNumber, message: waBody })];
                case 51:
                    _h.sent();
                    return [3 /*break*/, 54];
                case 52:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 54];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({ to: message.fromNumber, message: waBody })];
                case 53:
                    _h.sent();
                    _h.label = 54;
                case 54: return [3 /*break*/, 81];
                case 55:
                    conditionResult = evaluateConditionNode(config, context);
                    return [3 /*break*/, 81];
                case 56:
                    executeSetVariableNode(config, context);
                    return [3 /*break*/, 81];
                case 57: return [4 /*yield*/, executeHttpRequestNode(config, context, message)];
                case 58:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 59: return [4 /*yield*/, executeSwitchNode(config, context, edges, node.id, nodes)];
                case 60:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 61:
                    conditionResult = evaluateConditionNode(config, context);
                    return [3 /*break*/, 81];
                case 62:
                    executeDatetimeNode(config, context);
                    return [3 /*break*/, 81];
                case 63:
                    console.log("[Flow Engine] Email to: ".concat(config.to, ", subject: ").concat(config.subject));
                    return [3 /*break*/, 81];
                case 64:
                    console.log("[Flow Engine] Merge node");
                    return [3 /*break*/, 81];
                case 65:
                    waitDelay_1 = config.delay || config.duration || 1000;
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitDelay_1); })];
                case 66:
                    _h.sent();
                    return [3 /*break*/, 81];
                case 67:
                    console.log("[Flow Engine] Error handler");
                    context.lastError = config.errorMessage || null;
                    return [3 /*break*/, 81];
                case 68:
                    console.log("[Flow Engine] Code node");
                    return [3 /*break*/, 81];
                case 69:
                    console.log("[Flow Engine] Split batches");
                    return [3 /*break*/, 81];
                case 70:
                    console.log("[Flow Engine] Aggregate");
                    return [3 /*break*/, 81];
                case 71:
                    console.log("[Flow Engine] CSV parse");
                    return [3 /*break*/, 81];
                case 72:
                    console.log("[Flow Engine] Execute workflow");
                    return [3 /*break*/, 81];
                case 73:
                    console.log("[Flow Engine] Summarize");
                    return [3 /*break*/, 81];
                case 74:
                    console.log("[Flow Engine] Sort");
                    return [3 /*break*/, 81];
                case 75:
                    console.log("[Flow Engine] Limit");
                    return [3 /*break*/, 81];
                case 76:
                    console.log("[Flow Engine] Remove duplicates");
                    return [3 /*break*/, 81];
                case 77:
                    console.log("[Flow Engine] Schedule trigger");
                    return [3 /*break*/, 81];
                case 78:
                    console.log("[Flow Engine] Webhook trigger");
                    return [3 /*break*/, 81];
                case 79:
                    console.warn("[Flow Engine] customNode has no handler - ensure sanitizeNodeType mapped correctly");
                    return [3 /*break*/, 81];
                case 80:
                    console.warn("[Flow Engine] Unknown node type: ".concat(node.type, " \u2014 skipping"));
                    _h.label = 81;
                case 81:
                    outgoingEdges = edges.filter(function (e) { return e.source === node.id; });
                    if (outgoingEdges.length === 0) {
                        return [2 /*return*/];
                    }
                    if (!(node.type === "condition" && conditionResult !== null)) return [3 /*break*/, 84];
                    trueEdge = outgoingEdges.find(function (e) {
                        var _a;
                        return ((_a = e.label) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "sim" ||
                            e.sourceHandle === "true" ||
                            e.sourceHandle === "0";
                    });
                    falseEdge = outgoingEdges.find(function (e) {
                        var _a, _b;
                        return ((_a = e.label) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "não" ||
                            ((_b = e.label) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === "nao" ||
                            e.sourceHandle === "false" ||
                            e.sourceHandle === "1";
                    });
                    nextEdge_1 = conditionResult ? trueEdge : falseEdge;
                    if (!nextEdge_1) return [3 /*break*/, 83];
                    nextNode = nodes.find(function (n) { return n.id === nextEdge_1.target; });
                    if (!nextNode) return [3 /*break*/, 83];
                    return [4 /*yield*/, executeNodeWithEdges(nextNode, nodes, edges, context, message)];
                case 82:
                    _h.sent();
                    _h.label = 83;
                case 83: return [3 /*break*/, 88];
                case 84:
                    _loop_2 = function (edge) {
                        var nextNode;
                        return __generator(this, function (_k) {
                            switch (_k.label) {
                                case 0:
                                    nextNode = nodes.find(function (n) { return n.id === edge.target; });
                                    if (!nextNode) return [3 /*break*/, 2];
                                    return [4 /*yield*/, executeNodeWithEdges(nextNode, nodes, edges, context, message)];
                                case 1:
                                    _k.sent();
                                    _k.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _b = 0, outgoingEdges_2 = outgoingEdges;
                    _h.label = 85;
                case 85:
                    if (!(_b < outgoingEdges_2.length)) return [3 /*break*/, 88];
                    edge = outgoingEdges_2[_b];
                    return [5 /*yield**/, _loop_2(edge)];
                case 86:
                    _h.sent();
                    _h.label = 87;
                case 87:
                    _b++;
                    return [3 /*break*/, 85];
                case 88: return [2 /*return*/];
            }
        });
    });
}
/**
 * Evaluate a condition node
 */
function evaluateConditionNode(config, context) {
    var _a, _b;
    var condition = config.condition;
    if (!condition)
        return true;
    if (condition === "working_hours") {
        return checkWorkingHours(config.schedule);
    }
    if (condition === "agent_logged_in") {
        return !!context.agent_name || !!context.assignedTo;
    }
    if (condition.includes("close_reason")) {
        var closeReason = context.close_reason || context.closeReason;
        var expectedReason = (_a = condition.split("==")[1]) === null || _a === void 0 ? void 0 : _a.trim().replace(/"/g, "");
        return closeReason === expectedReason;
    }
    if (condition.includes("message_type")) {
        var messageType = ((_b = context.message) === null || _b === void 0 ? void 0 : _b.type) || "text";
        if (condition.includes("call") || condition.includes("video")) {
            return messageType === "call" || messageType === "video";
        }
    }
    return true;
}
/**
 * Check if current time is within working hours
 */
function checkWorkingHours(schedule) {
    var _a, _b, _c, _d;
    var now = new Date();
    var day = now.getDay();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var currentTime = hour * 60 + minute;
    var monSatStart = ((_a = schedule === null || schedule === void 0 ? void 0 : schedule.mon_sat) === null || _a === void 0 ? void 0 : _a.start) || "08:00";
    var monSatEnd = ((_b = schedule === null || schedule === void 0 ? void 0 : schedule.mon_sat) === null || _b === void 0 ? void 0 : _b.end) || "19:40";
    var sunHolidayStart = ((_c = schedule === null || schedule === void 0 ? void 0 : schedule.sun_holiday) === null || _c === void 0 ? void 0 : _c.start) || "08:00";
    var sunHolidayEnd = ((_d = schedule === null || schedule === void 0 ? void 0 : schedule.sun_holiday) === null || _d === void 0 ? void 0 : _d.end) || "11:40";
    var parseTime = function (timeStr) {
        var _a = timeStr.split(":").map(Number), h = _a[0], m = _a[1];
        return h * 60 + m;
    };
    var isSundayOrHoliday = day === 0;
    if (isSundayOrHoliday) {
        var start = parseTime(sunHolidayStart);
        var end = parseTime(sunHolidayEnd);
        return currentTime >= start && currentTime <= end;
    }
    else {
        var start = parseTime(monSatStart);
        var end = parseTime(monSatEnd);
        return currentTime >= start && currentTime <= end;
    }
}
/**
 * Check if a message node is terminal (should stop the flow)
 */
function isTerminalMessage(node) {
    var _a;
    var label = (((_a = node.data) === null || _a === void 0 ? void 0 : _a.label) || "").toLowerCase();
    var terminalLabels = [
        "fora de horário",
        "fora de horario",
        "recusar",
        "pesquisa",
        "agradecer",
        "não responder",
        "nao responder",
    ];
    return terminalLabels.some(function (term) { return label.includes(term); });
}
/**
 * Replace variables in text with context values
 */
function replaceVariables(text, context) {
    return text.replace(/\{\{([^}]+)\}\}/g, function (match, path) {
        var parts = path.trim().split(".");
        var value = context;
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var part = parts_1[_i];
            value = value === null || value === void 0 ? void 0 : value[part];
            if (value === undefined)
                break;
        }
        return value !== undefined ? String(value) : match;
    });
}
/**
 * Execute Welcome Agent node - sends welcome message with logged-in agent name
 */
function executeWelcomeAgentNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var useAgentName, fallbackName, agentName, messageText, finalMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    useAgentName = config.useAgentName !== false;
                    fallbackName = config.fallbackName || "Assistente Virtual";
                    agentName = context.agent_name || (useAgentName ? fallbackName : null);
                    messageText = config.message || "Olá! Como posso te ajudar?";
                    // Replace {{agent_name}} placeholder
                    if (agentName) {
                        messageText = messageText.replace(/\{\{agent_name\}\}/g, agentName);
                    }
                    finalMessage = replaceVariables(messageText, context);
                    console.log("[Flow Engine] Welcome Agent message: \"".concat(finalMessage.substring(0, 80), "...\""));
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({ to: message.fromNumber, message: finalMessage })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({ to: message.fromNumber, message: finalMessage })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute AI Assistant node
 */
function executeAIAssistantNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var systemPrompt, userMessage, response, aiResponse, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    systemPrompt = replaceVariables(config.systemPrompt || "Você é um assistente prestativo.", context);
                    userMessage = message.messageText || "";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, (0, llm_1.invokeLLM)({
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userMessage },
                            ],
                        })];
                case 2:
                    response = _a.sent();
                    aiResponse = typeof response.choices[0].message.content === "string"
                        ? response.choices[0].message.content
                        : JSON.stringify(response.choices[0].message.content);
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({
                            to: message.fromNumber,
                            message: aiResponse,
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({
                            to: message.fromNumber,
                            message: aiResponse,
                        })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_3 = _a.sent();
                    console.error("[Flow Engine] AI Assistant error:", error_3);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Transfer Human node
 */
function executeTransferHumanNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, department, priority, ticketNumber, ticketData, inserted, ticketId, _a, fireAndForget, enqueueCrmOutboxEvent_1, _b, confirmMessage;
        var _this = this;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _d.sent();
                    if (!db)
                        return [2 /*return*/];
                    department = config.department || "Suporte";
                    priority = config.priority || "medium";
                    ticketNumber = "TK-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 5).toUpperCase());
                    ticketData = {
                        ticketNumber: ticketNumber,
                        customerId: context.customer.id,
                        subject: "Transfer\u00EAncia de ".concat(message.provider, ": ").concat(message.fromNumber),
                        description: "Mensagem: ".concat(message.messageText, "\n\nTransferido automaticamente para ").concat(department),
                        status: "open",
                        priority: priority,
                        channel: message.provider,
                    };
                    return [4 /*yield*/, db.insert(schema_1.tickets).values(ticketData).$returningId()];
                case 2:
                    inserted = _d.sent();
                    ticketId = (_c = inserted === null || inserted === void 0 ? void 0 : inserted[0]) === null || _c === void 0 ? void 0 : _c.id;
                    // Expose ticket in context for later nodes
                    context.ticket = __assign({ id: ticketId !== null && ticketId !== void 0 ? ticketId : null }, ticketData);
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./crm-core"); })];
                case 4:
                    _a = _d.sent(), fireAndForget = _a.fireAndForget, enqueueCrmOutboxEvent_1 = _a.enqueueCrmOutboxEvent;
                    fireAndForget(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, enqueueCrmOutboxEvent_1({
                                        eventName: "TicketCreated",
                                        entityType: "ticket",
                                        entityId: ticketId !== null && ticketId !== void 0 ? ticketId : null,
                                        actorUserId: null,
                                        payload: {
                                            source: "flow-engine",
                                            department: department,
                                            channel: message.provider,
                                            customerId: (_b = (_a = context.customer) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                                            fromNumber: message.fromNumber,
                                        },
                                    })];
                                case 1:
                                    _c.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [3 /*break*/, 6];
                case 5:
                    _b = _d.sent();
                    return [3 /*break*/, 6];
                case 6:
                    confirmMessage = replaceVariables(config.message || "Você será atendido por um de nossos agentes em breve.", context);
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({
                            to: message.fromNumber,
                            message: confirmMessage,
                        })];
                case 7:
                    _d.sent();
                    return [3 /*break*/, 10];
                case 8:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({
                            to: message.fromNumber,
                            message: confirmMessage,
                        })];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Create Ticket node
 */
function executeCreateTicketNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, subject, description, ticketNumber, ticketData, inserted, ticketId, _a, fireAndForget, enqueueCrmOutboxEvent_2, _b;
        var _this = this;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _d.sent();
                    if (!db)
                        return [2 /*return*/];
                    subject = replaceVariables(config.subject || "Novo ticket", context);
                    description = replaceVariables(config.description || message.messageText || "", context);
                    ticketNumber = "TK-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 5).toUpperCase());
                    ticketData = {
                        ticketNumber: ticketNumber,
                        customerId: context.customer.id,
                        subject: subject,
                        description: description,
                        status: "open",
                        priority: (config.priority || "medium"),
                        channel: message.provider,
                    };
                    return [4 /*yield*/, db.insert(schema_1.tickets).values(ticketData).$returningId()];
                case 2:
                    inserted = _d.sent();
                    ticketId = (_c = inserted === null || inserted === void 0 ? void 0 : inserted[0]) === null || _c === void 0 ? void 0 : _c.id;
                    context.ticket = __assign({ id: ticketId !== null && ticketId !== void 0 ? ticketId : null }, ticketData);
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./crm-core"); })];
                case 4:
                    _a = _d.sent(), fireAndForget = _a.fireAndForget, enqueueCrmOutboxEvent_2 = _a.enqueueCrmOutboxEvent;
                    fireAndForget(function () { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, enqueueCrmOutboxEvent_2({
                                        eventName: "TicketCreated",
                                        entityType: "ticket",
                                        entityId: ticketId !== null && ticketId !== void 0 ? ticketId : null,
                                        actorUserId: null,
                                        payload: {
                                            source: "flow-engine",
                                            channel: message.provider,
                                            customerId: (_b = (_a = context.customer) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                                            fromNumber: message.fromNumber,
                                            subject: subject,
                                        },
                                    })];
                                case 1:
                                    _c.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [3 /*break*/, 6];
                case 5:
                    _b = _d.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Set Variable node
 */
function executeSetVariableNode(config, context) {
    var variableName = config.variableName || "";
    var variableValue = replaceVariables(config.variableValue || "", context);
    context.variables[variableName] = variableValue;
}
/**
 * Execute URA Menu node
 */
function executeURAMenuNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var menuText, options, menuMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    menuText = replaceVariables(config.menuText || "", context);
                    options = config.options || [];
                    menuMessage = menuText + "\n\n";
                    options.forEach(function (opt, index) {
                        menuMessage += "".concat(index + 1, ". ").concat(opt.label, "\n");
                    });
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({
                            to: message.fromNumber,
                            message: menuMessage,
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({
                            to: message.fromNumber,
                            message: menuMessage,
                        })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Check Prescription node (pharmacy-specific)
 */
function executeCheckPrescriptionNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var fileUrl, aiModel, response, result, reply, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileUrl = replaceVariables(config.fileUrl || "", context);
                    aiModel = config.aiModel || "gpt-4";
                    console.log("[Flow Engine] Check Prescription: ".concat(fileUrl, ", model: ").concat(aiModel));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, (0, llm_1.invokeLLM)({
                            messages: [
                                {
                                    role: "system",
                                    content: "Você é um farmacêutico especializado. Analise a receita médica e retorne: válida ou inválida, nome do medicamento, dosagem, e observações.",
                                },
                                {
                                    role: "user",
                                    content: "Analise esta receita: ".concat(fileUrl, ". Mensagem do cliente: ").concat(message.messageText || ""),
                                },
                            ],
                        })];
                case 2:
                    response = _a.sent();
                    result = typeof response.choices[0].message.content === "string"
                        ? response.choices[0].message.content
                        : JSON.stringify(response.choices[0].message.content);
                    context.variables.prescriptionResult = result;
                    context.variables.prescriptionValid = result.toLowerCase().includes("válida");
                    reply = "\uD83D\uDCCB *An\u00E1lise da Receita*\n\n".concat(result, "\n\nUm farmac\u00EAutico ir\u00E1 validar em breve.");
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({ to: message.fromNumber, message: reply })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({ to: message.fromNumber, message: reply })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_4 = _a.sent();
                    console.error("[Flow Engine] Check Prescription error:", error_4);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Pix Confirmation node (pharmacy-specific)
 */
function executePixConfirmationNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var pixKey, expectedAmount, reply;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pixKey = config.pixKey || "";
                    expectedAmount = config.expectedAmount || 0;
                    console.log("[Flow Engine] Pix Confirmation: key=".concat(pixKey, ", amount=").concat(expectedAmount));
                    context.variables.pixKey = pixKey;
                    context.variables.pixAmount = expectedAmount;
                    reply = "\uD83D\uDCB3 *Pagamento via Pix*\n\nChave: ".concat(pixKey, "\nValor: R$ ").concat(expectedAmount, "\n\nEnvie o comprovante ap\u00F3s o pagamento.");
                    if (!(message.provider === "whatsapp")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, messaging_1.sendWhatsAppMessage)({ to: message.fromNumber, message: reply })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!(message.provider === "instagram")) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, messaging_1.sendInstagramMessage)({ to: message.fromNumber, message: reply })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Attendance Create node (pharmacy-specific)
 */
function executeAttendanceCreateNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, priority, channel, ticketNumber, ticketData, inserted, ticketId;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _c.sent();
                    if (!db)
                        return [2 /*return*/];
                    priority = config.priority || "medium";
                    channel = config.channel || message.provider;
                    ticketNumber = "TK-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 5).toUpperCase());
                    ticketData = {
                        ticketNumber: ticketNumber,
                        customerId: (_a = context.customer) === null || _a === void 0 ? void 0 : _a.id,
                        subject: "Atendimento ".concat(channel, ": ").concat(message.fromNumber),
                        description: message.messageText || "",
                        status: "open",
                        priority: priority,
                        channel: channel,
                    };
                    return [4 /*yield*/, db.insert(schema_1.tickets).values(ticketData).$returningId()];
                case 2:
                    inserted = _c.sent();
                    ticketId = (_b = inserted === null || inserted === void 0 ? void 0 : inserted[0]) === null || _b === void 0 ? void 0 : _b.id;
                    context.variables.attendanceTicket = __assign({ id: ticketId }, ticketData);
                    console.log("[Flow Engine] Attendance created: ".concat(ticketNumber));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Notify node
 */
function executeNotifyNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var alert;
        return __generator(this, function (_a) {
            alert = replaceVariables(config.alert || "", context);
            console.log("[Flow Engine] NOTIFICATION: ".concat(alert));
            return [2 /*return*/];
        });
    });
}
/**
 * Execute Add Tag node
 */
function executeAddTagNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, tag, customerId, customer, currentTags, error_5;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _b.sent();
                    if (!db)
                        return [2 /*return*/];
                    tag = config.tag || "";
                    customerId = (_a = context.customer) === null || _a === void 0 ? void 0 : _a.id;
                    if (!(customerId && tag)) return [3 /*break*/, 7];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)).limit(1)];
                case 3:
                    customer = (_b.sent())[0];
                    if (!customer) return [3 /*break*/, 5];
                    currentTags = customer.tags ? JSON.parse(customer.tags) : [];
                    if (!!currentTags.includes(tag)) return [3 /*break*/, 5];
                    currentTags.push(tag);
                    return [4 /*yield*/, db.update(schema_1.customers).set({ tags: JSON.stringify(currentTags) }).where((0, drizzle_orm_1.eq)(schema_1.customers.id, customerId))];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_5 = _b.sent();
                    console.error("[Flow Engine] Add Tag error:", error_5);
                    return [3 /*break*/, 7];
                case 7:
                    context.variables["tag_".concat(tag.replace(/[^a-zA-Z0-9]/g, "_"))] = true;
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Assign Agent node
 */
function executeAssignAgentNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, queue, fallback, agents, assignedAgent, conv, error_6;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _b.sent();
                    if (!db)
                        return [2 /*return*/];
                    queue = config.queue || "general";
                    fallback = config.fallback || "";
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 9, , 10]);
                    return [4 /*yield*/, db.select().from(schema_1.users).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, "agent"), (0, drizzle_orm_1.eq)(schema_1.users.status, "active"))).limit(5)];
                case 3:
                    agents = _b.sent();
                    if (!(agents.length > 0)) return [3 /*break*/, 7];
                    assignedAgent = agents[Math.floor(Math.random() * agents.length)];
                    context.assignedTo = assignedAgent.id;
                    context.agent_name = assignedAgent.name;
                    return [4 /*yield*/, db.select().from(schema_1.conversations).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.customerId, (_a = context.customer) === null || _a === void 0 ? void 0 : _a.id), (0, drizzle_orm_1.eq)(schema_1.conversations.status, "open"))).orderBy((0, drizzle_orm_1.desc)(schema_1.conversations.lastMessageAt)).limit(1)];
                case 4:
                    conv = (_b.sent())[0];
                    if (!conv) return [3 /*break*/, 6];
                    return [4 /*yield*/, db.update(schema_1.conversations).set({ assignedTo: assignedAgent.id, status: "assigned" }).where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conv.id))];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    console.log("[Flow Engine] Agent assigned: ".concat(assignedAgent.name, " (queue: ").concat(queue, ")"));
                    return [3 /*break*/, 8];
                case 7:
                    if (fallback) {
                        console.log("[Flow Engine] No agents available, using fallback: ".concat(fallback));
                        context.agent_name = fallback;
                    }
                    _b.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_6 = _b.sent();
                    console.error("[Flow Engine] Assign Agent error:", error_6);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Create Contact node
 */
function executeCreateContactNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, existing, tags, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, , 8]);
                    return [4 /*yield*/, db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.phone, message.fromNumber)).limit(1)];
                case 3:
                    existing = _a.sent();
                    if (!(existing.length === 0)) return [3 /*break*/, 5];
                    tags = config.tags ? JSON.stringify(config.tags) : "[]";
                    return [4 /*yield*/, db.insert(schema_1.customers).values({
                            name: message.fromName || "Cliente",
                            phone: message.fromNumber,
                            tags: tags,
                            createdAt: new Date(),
                        })];
                case 4:
                    _a.sent();
                    console.log("[Flow Engine] Contact created: ".concat(message.fromNumber));
                    return [3 /*break*/, 6];
                case 5:
                    console.log("[Flow Engine] Contact already exists: ".concat(message.fromNumber));
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_7 = _a.sent();
                    console.error("[Flow Engine] Create Contact error:", error_7);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Create Task node
 */
function executeCreateTaskNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var title, description, priority, assignTo;
        return __generator(this, function (_a) {
            title = replaceVariables(config.title || "Nova tarefa", context);
            description = replaceVariables(config.description || "", context);
            priority = config.priority || "medium";
            assignTo = config.assignTo || config.assignee || null;
            console.log("[Flow Engine] Task created: ".concat(title, " (priority: ").concat(priority, ", assignTo: ").concat(assignTo, ")"));
            context.variables.lastTask = { title: title, description: description, priority: priority, assignTo: assignTo };
            return [2 /*return*/];
        });
    });
}
/**
 * Execute HTTP Request node (with message context)
 */
function executeHttpRequestNode(config, context, message) {
    return __awaiter(this, void 0, void 0, function () {
        var url, method, headers, body, response, data, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = replaceVariables(config.url || "", context);
                    method = config.method || "GET";
                    headers = config.headers || {};
                    body = config.body ? replaceVariables(config.body, context) : undefined;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: headers,
                            body: body ? JSON.stringify(JSON.parse(body)) : undefined,
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    context.variables.httpResponse = data;
                    return [3 /*break*/, 5];
                case 4:
                    error_8 = _a.sent();
                    console.error("[Flow Engine] HTTP Request error:", error_8);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute Switch node — routes to multiple outputs based on value
 */
function executeSwitchNode(config, context, edges, nodeId, nodes) {
    return __awaiter(this, void 0, void 0, function () {
        var value, rules, matchedEdge, _loop_3, _i, rules_1, rule, state_1, nextNode;
        return __generator(this, function (_a) {
            value = replaceVariables(config.value || "", context);
            rules = config.rules || [];
            matchedEdge = null;
            _loop_3 = function (rule) {
                if (value === rule.value || value.includes(rule.value)) {
                    matchedEdge = edges.find(function (e) { return e.sourceHandle === rule.output; });
                    return "break";
                }
            };
            for (_i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                rule = rules_1[_i];
                state_1 = _loop_3(rule);
                if (state_1 === "break")
                    break;
            }
            // Default fallback
            if (!matchedEdge) {
                matchedEdge = edges.find(function (e) { return e.sourceHandle === "default"; });
            }
            if (matchedEdge) {
                nextNode = nodes.find(function (n) { return n.id === matchedEdge.target; });
                if (nextNode) {
                    console.log("[Flow Engine] Switch matched: ".concat(matchedEdge.sourceHandle));
                }
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Execute Datetime node — sets date/time variables
 */
function executeDatetimeNode(config, context) {
    var format = config.format || "iso";
    var now = new Date();
    if (config.variableName) {
        context.variables[config.variableName] = format === "iso"
            ? now.toISOString()
            : now.toLocaleString("pt-BR");
    }
    if (config.addDays) {
        var future = new Date(now.getTime() + config.addDays * 24 * 60 * 60 * 1000);
        context.variables.futureDate = future.toISOString();
    }
}
/**
 * Start the flow engine processor
 */
/**
 * Execute Business Hours node - checks if current time is within business hours
 */
function executeBusinessHoursNode(context_1) {
    return __awaiter(this, arguments, void 0, function (context, config) {
        var checkType, result, error_9;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    checkType = config.checkType || "business";
                    return [4 /*yield*/, (0, routers_business_hours_1.checkBusinessHours)(new Date())];
                case 1:
                    result = _a.sent();
                    context.variables.isBusinessHours = result.isOpen;
                    context.variables.businessHoursOpen = result.isOpen;
                    context.variables.businessHoursSchedule = result.schedule;
                    if (result.holidayName) {
                        context.variables.isHoliday = true;
                        context.variables.holidayName = result.holidayName;
                    }
                    return [2 /*return*/, result.isOpen];
                case 2:
                    error_9 = _a.sent();
                    console.error("[Flow Engine] Business Hours check error:", error_9);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Start the flow engine processor
 */
function startFlowEngine() {
    setInterval(function () {
        processPendingMessages().catch(function (error) {
            console.error("[Flow Engine] Error in processor:", error);
        });
    }, 5000);
}
var templateObject_1;
