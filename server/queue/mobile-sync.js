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
exports.enqueueMobileSyncJob = enqueueMobileSyncJob;
exports.startMobileSyncProcessor = startMobileSyncProcessor;
/**
 * Mobile Sync Queue - Sincroniza mensagens enviadas do celular (fromMe)
 *
 * IMPORTANTE: Esta fila processa jobs em background SEM bloquear o webhook
 */
var db_1 = require("../db");
var schema_1 = require("../../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
var phone_1 = require("../utils/phone");
var sse_1 = require("../_core/sse");
// Fila simples em memória (Railway roda instância única)
var queue = [];
var isProcessing = false;
/**
 * Adiciona job na fila
 */
function enqueueMobileSyncJob(job) {
    var jobWithId = __assign(__assign({}, job), { id: "mobile-sync-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9)) });
    queue.push(jobWithId);
    // Log mínimo (apenas em debug, senão count pro CI)
    if (queue.length % 10 === 0) {
        console.log("[MobileSync] Queue size:", queue.length);
    }
    // Processar assíncrono sem await
    if (!isProcessing) {
        setImmediate(processQueue);
    }
}
/**
 * Processador da fila
 */
function processQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var job, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isProcessing || queue.length === 0)
                        return [2 /*return*/];
                    isProcessing = true;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 8, 9]);
                    _a.label = 2;
                case 2:
                    if (!(queue.length > 0)) return [3 /*break*/, 7];
                    job = queue.shift();
                    if (!job)
                        return [3 /*break*/, 2];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, processMobileSyncJob(job)];
                case 4:
                    _a.sent();
                    // Log de sucesso a cada 10 jobs para não sobrecarregar
                    if (Math.random() < 0.1) {
                        console.log("[MobileSync] Job processed:", job.id, "queue remaining:", queue.length);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    // Log mínimo, não quebra
                    console.error("[MobileSync] Job failed:", job.id, error_1.message);
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 2];
                case 7: return [3 /*break*/, 9];
                case 8:
                    isProcessing = false;
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Executa um job de sync
 */
function processMobileSyncJob(job) {
    return __awaiter(this, void 0, void 0, function () {
        var db, customerPhone, phoneVariants, phoneCondition, customer, customerRecord, thirtyDaysAgo, conv, conversationId, insertResult_1, isReopening, existing, content, insertResult, messageDbId, dbForUpload, configRecord, configData, instance, normalizedUrl, downloadUrl, response, data, r2Url, error_2, updatedConv, insertedMessage;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _e.sent();
                    if (!db) {
                        console.error("[MobileSync] DB not available for job:", job.id);
                        return [2 /*return*/];
                    }
                    customerPhone = normalizeInboundNumber(job.remoteJid);
                    if (!customerPhone) {
                        console.error("[MobileSync] Failed to normalize phone from:", job.remoteJid);
                        return [2 /*return*/];
                    }
                    phoneVariants = (0, phone_1.generatePhoneVariants)(customerPhone);
                    phoneCondition = phoneVariants.length > 1
                        ? drizzle_orm_1.or.apply(void 0, phoneVariants.map(function (v) { return (0, drizzle_orm_1.eq)(schema_1.customers.phone, v); })) : (0, drizzle_orm_1.eq)(schema_1.customers.phone, phoneVariants[0]);
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.customers)
                            .where(phoneCondition)
                            .limit(1)];
                case 2:
                    customer = _e.sent();
                    if (!(customer.length === 0)) return [3 /*break*/, 5];
                    // Criar novo cliente
                    return [4 /*yield*/, db.insert(schema_1.customers).values({
                            name: "Cliente ".concat(customerPhone),
                            phone: customerPhone,
                            status: "active",
                        })];
                case 3:
                    // Criar novo cliente
                    _e.sent();
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.customers)
                            .where(phoneCondition)
                            .limit(1)];
                case 4:
                    customer = _e.sent();
                    _e.label = 5;
                case 5:
                    if (customer.length === 0) {
                        console.error("[MobileSync] Failed to create/find customer:", customerPhone);
                        return [2 /*return*/];
                    }
                    customerRecord = customer[0];
                    thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.conversations)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.customerId, customerRecord.id), (0, drizzle_orm_1.eq)(schema_1.conversations.channel, "whatsapp"), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.conversations.status, "open"), (0, drizzle_orm_1.eq)(schema_1.conversations.status, "assigned"), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.status, "closed"), (0, drizzle_orm_1.gte)(schema_1.conversations.closedAt, thirtyDaysAgo)))))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.conversations.lastMessageAt))
                            .limit(1)];
                case 6:
                    conv = (_e.sent())[0];
                    if (!!conv) return [3 /*break*/, 8];
                    return [4 /*yield*/, db.insert(schema_1.conversations).values({
                            customerId: customerRecord.id,
                            customerName: customerRecord.name,
                            customerPhone: customerPhone,
                            channel: "whatsapp",
                            status: "open",
                            assignedTo: null,
                            queueId: null,
                            openedAt: new Date(),
                            lastMessageAt: new Date(),
                            unreadCount: 1,
                        })];
                case 7:
                    insertResult_1 = _e.sent();
                    // Drizzle MySQL retorna [ResultSetHeader, fields] — insertId fica em [0]
                    conversationId = (_b = (_a = insertResult_1 === null || insertResult_1 === void 0 ? void 0 : insertResult_1[0]) === null || _a === void 0 ? void 0 : _a.insertId) !== null && _b !== void 0 ? _b : insertResult_1 === null || insertResult_1 === void 0 ? void 0 : insertResult_1.insertId;
                    if (!conversationId) {
                        console.error("[MobileSync] insertId undefined após insert de conversa!");
                        return [2 /*return*/];
                    }
                    console.log("[MobileSync] Created new conversation:", conversationId, "for phone:", customerPhone);
                    return [3 /*break*/, 10];
                case 8:
                    conversationId = conv.id;
                    isReopening = conv.status === "closed";
                    // Atualizar lastMessageAt, unreadCount e reabrir se fechada
                    return [4 /*yield*/, db
                            .update(schema_1.conversations)
                            .set(__assign({ lastMessageAt: new Date(), unreadCount: isReopening ? 1 : (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["unread_count + 1"], ["unread_count + 1"]))) }, (isReopening ? {
                            status: "open",
                            assignedTo: null,
                            queueId: null,
                            closedAt: null,
                            closeReason: null,
                        } : {})))
                            .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversationId))];
                case 9:
                    // Atualizar lastMessageAt, unreadCount e reabrir se fechada
                    _e.sent();
                    _e.label = 10;
                case 10: return [4 /*yield*/, db
                        .select()
                        .from(schema_1.conversationMessages)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversationMessages.conversationId, conversationId), (0, drizzle_orm_1.eq)(schema_1.conversationMessages.externalId, job.messageId)))
                        .limit(1)];
                case 11:
                    existing = _e.sent();
                    if (existing.length > 0) {
                        console.log("[MobileSync] Duplicate message ignored:", job.messageId);
                        return [2 /*return*/];
                    }
                    console.log("[MobileSync] Processing job:", job.id, "for conversation:", conversationId);
                    content = job.messageText || job.caption || "";
                    return [4 /*yield*/, db.insert(schema_1.conversationMessages).values({
                            conversationId: conversationId,
                            senderId: null, // Mensagem do agente, mas não há user_id no contexto do mobile-sync (será atualizado depois se necessário)
                            senderType: "agent",
                            content: content,
                            fileUrl: job.mediaUrl || null,
                            fileName: null,
                            fileType: job.messageType || null,
                            fileSize: null,
                            externalId: job.messageId,
                            remoteJid: job.remoteJid,
                            createdAt: new Date(job.messageTimestamp * 1000),
                        })];
                case 12:
                    insertResult = _e.sent();
                    messageDbId = insertResult.insertId;
                    if (!(job.mediaUrl &&
                        job.mediaUrl.includes("mmg.whatsapp.net") &&
                        job.messageId)) return [3 /*break*/, 23];
                    _e.label = 13;
                case 13:
                    _e.trys.push([13, 22, , 23]);
                    console.log("[MobileSync][S3] Triggering Evolution download for R2 upload, messageId:", job.messageId);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 14:
                    dbForUpload = _e.sent();
                    if (!dbForUpload)
                        throw new Error("DB not available for S3 upload");
                    return [4 /*yield*/, dbForUpload
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "evolution_api"))
                            .limit(1)];
                case 15:
                    configRecord = (_e.sent())[0];
                    if (!(configRecord === null || configRecord === void 0 ? void 0 : configRecord.config)) return [3 /*break*/, 21];
                    configData = typeof configRecord.config === "string"
                        ? JSON.parse(configRecord.config)
                        : configRecord.config;
                    instance = ((_c = configData.instances) === null || _c === void 0 ? void 0 : _c.find(function (i) { return i.name === "Meu"; })) || ((_d = configData.instances) === null || _d === void 0 ? void 0 : _d[0]);
                    if (!((instance === null || instance === void 0 ? void 0 : instance.url) && (instance === null || instance === void 0 ? void 0 : instance.apiKey))) return [3 /*break*/, 21];
                    normalizedUrl = instance.url.replace(/\/$/, "");
                    downloadUrl = "".concat(normalizedUrl, "/message/download/").concat(job.messageId);
                    console.log("[MobileSync][S3] Calling Evolution download endpoint:", downloadUrl);
                    return [4 /*yield*/, fetch(downloadUrl, {
                            headers: {
                                apikey: instance.apiKey,
                            },
                            signal: AbortSignal.timeout(15000),
                        })];
                case 16:
                    response = _e.sent();
                    if (!response.ok) return [3 /*break*/, 20];
                    return [4 /*yield*/, response.json()];
                case 17:
                    data = _e.sent();
                    r2Url = (data === null || data === void 0 ? void 0 : data.url) || (data === null || data === void 0 ? void 0 : data.mediaUrl) || null;
                    if (!(r2Url && r2Url.includes("r2.dev"))) return [3 /*break*/, 19];
                    console.log("[MobileSync][S3] ✅ Got R2 URL, updating message:", r2Url);
                    return [4 /*yield*/, dbForUpload
                            .update(schema_1.conversationMessages)
                            .set({ fileUrl: r2Url })
                            .where((0, drizzle_orm_1.eq)(schema_1.conversationMessages.id, messageDbId))];
                case 18:
                    _e.sent();
                    console.log("[MobileSync][S3] Message updated with R2 URL");
                    _e.label = 19;
                case 19: return [3 /*break*/, 21];
                case 20:
                    console.log("[MobileSync][S3] ❌ Download failed:", response.status, response.statusText);
                    _e.label = 21;
                case 21: return [3 /*break*/, 23];
                case 22:
                    error_2 = _e.sent();
                    console.log("[MobileSync][S3] Error during R2 upload:", error_2);
                    return [3 /*break*/, 23];
                case 23: return [4 /*yield*/, db
                        .select()
                        .from(schema_1.conversations)
                        .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversationId))
                        .limit(1)];
                case 24:
                    updatedConv = (_e.sent())[0];
                    if (!(updatedConv === null || updatedConv === void 0 ? void 0 : updatedConv.assignedTo)) return [3 /*break*/, 26];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.conversationMessages)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversationMessages.conversationId, conversationId), (0, drizzle_orm_1.eq)(schema_1.conversationMessages.externalId, job.messageId)))
                            .orderBy((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", " DESC"], ["", " DESC"])), schema_1.conversationMessages.id))
                            .limit(1)];
                case 25:
                    insertedMessage = (_e.sent())[0];
                    if (insertedMessage && insertedMessage.id) {
                        sse_1.sseManager.emitToUser(updatedConv.assignedTo, sse_1.EVENTS.MESSAGE_CREATED, {
                            messageId: insertedMessage.id,
                            conversationId: conversationId,
                            senderId: null,
                            senderType: "agent",
                            content: content,
                            fileUrl: job.mediaUrl || null,
                            fileType: job.messageType || null,
                            createdAt: new Date(job.messageTimestamp * 1000).toISOString(),
                        });
                    }
                    _e.label = 26;
                case 26: return [2 /*return*/];
            }
        });
    });
}
/**
 * Normaliza número do WhatsApp para formato interno
 */
function normalizeInboundNumber(remoteJid) {
    // remoteJid é algo como "5511999999999@s.whatsapp.net" ou "+5511999999999@..."
    // Extrair apenas os dígitos
    var digits = remoteJid.replace(/\D/g, "");
    if (digits.length < 10)
        return null;
    // Garantir formato internacional (55 no início)
    var number = digits;
    if (!number.startsWith("55") && number.length === 11) {
        number = "55" + number;
    }
    return number;
}
/**
 * Inicializa o processador da fila (chamar no startup)
 */
function startMobileSyncProcessor() {
    // Processar a cada 100ms se houver jobs
    var interval = setInterval(function () {
        if (queue.length > 0 && !isProcessing) {
            setImmediate(processQueue);
        }
    }, 100);
    // Limpar intervalo ao encerrar (opcional)
    return function () { return clearInterval(interval); };
}
var templateObject_1, templateObject_2;
