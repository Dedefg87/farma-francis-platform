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
exports.getReceivedMessages = getReceivedMessages;
exports.getReceivedMessageById = getReceivedMessageById;
exports.getReceivedMessageByExternalId = getReceivedMessageByExternalId;
exports.markMessageAsProcessed = markMessageAsProcessed;
exports.getConversationHistory = getConversationHistory;
exports.findOrCreateCustomerByPhone = findOrCreateCustomerByPhone;
exports.ingestInboundConversationMessage = ingestInboundConversationMessage;
exports.listReceivedMessages = listReceivedMessages;
var db_1 = require("./db");
var schema_1 = require("../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
var sse_1 = require("./_core/sse");
var phone_1 = require("./utils/phone");
// Cache para evitar queries repetitivas de agent assignment
var agentAssignmentCache = new Map();
var CACHE_TTL_MS = 30 * 1000; // 30 segundos
function pickLeastLoadedOnlineAgent(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, cacheKey, cached, connected, offlineResult, offlineRows, fallbackId, rows, minLoad_1, minRows, chosenId;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _g.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    cacheKey = params.provider;
                    cached = agentAssignmentCache.get(cacheKey);
                    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
                        return [2 /*return*/, cached.agentId ? { userId: cached.agentId, loadCount: 0, lastSignedIn: null } : null];
                    }
                    connected = sse_1.sseManager
                        .getConnectedUsers()
                        .map(function (id) { return Number(id); })
                        .filter(function (id) { return Number.isFinite(id) && id > 0; });
                    if (!(connected.length === 0)) return [3 /*break*/, 3];
                    console.log("[pickAgent] ⚠️ No agents online via SSE — using offline fallback");
                    return [4 /*yield*/, db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT \n        u.id AS userId,\n        COUNT(c.id) AS loadCount\n      FROM users u\n      LEFT JOIN agent_pauses p\n        ON p.agent_id = u.id AND p.status = 'active'\n      LEFT JOIN conversations c\n        ON c.assigned_to = u.id\n       AND c.status IN ('open','assigned')\n      WHERE u.role IN ('user', 'admin')\n        AND p.id IS NULL\n      GROUP BY u.id\n      ORDER BY loadCount ASC, u.id DESC\n      LIMIT 1\n    "], ["\n      SELECT \n        u.id AS userId,\n        COUNT(c.id) AS loadCount\n      FROM users u\n      LEFT JOIN agent_pauses p\n        ON p.agent_id = u.id AND p.status = 'active'\n      LEFT JOIN conversations c\n        ON c.assigned_to = u.id\n       AND c.status IN ('open','assigned')\n      WHERE u.role IN ('user', 'admin')\n        AND p.id IS NULL\n      GROUP BY u.id\n      ORDER BY loadCount ASC, u.id DESC\n      LIMIT 1\n    "]))))];
                case 2:
                    offlineResult = _g.sent();
                    offlineRows = Array.isArray(offlineResult) ? offlineResult[0] : offlineResult;
                    if (Array.isArray(offlineRows) && offlineRows.length > 0) {
                        fallbackId = Number((_a = offlineRows[0]) === null || _a === void 0 ? void 0 : _a.userId);
                        if (Number.isFinite(fallbackId) && fallbackId > 0) {
                            console.log("[pickAgent] 🔄 Offline fallback assigned to agent", fallbackId);
                            agentAssignmentCache.set(cacheKey, { agentId: fallbackId, timestamp: Date.now() });
                            return [2 /*return*/, { userId: fallbackId, loadCount: Number((_c = (_b = offlineRows[0]) === null || _b === void 0 ? void 0 : _b.loadCount) !== null && _c !== void 0 ? _c : 0), lastSignedIn: null }];
                        }
                    }
                    agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
                    return [2 /*return*/, null];
                case 3:
                    if (!(connected.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, db.execute((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n      SELECT \n        u.id AS userId,\n        COUNT(c.id) AS loadCount,\n        MAX(u.lastSignedIn) AS lastSignedIn\n      FROM users u\n      LEFT JOIN agent_pauses p\n        ON p.agent_id = u.id AND p.status = 'active'\n      LEFT JOIN conversations c\n        ON c.assigned_to = u.id\n       AND c.status IN ('open','assigned')\n       AND c.channel = ", "\n      WHERE u.role IN ('user', 'admin')\n        AND u.id IN (", ")\n        AND p.id IS NULL\n      GROUP BY u.id\n      ORDER BY loadCount ASC, u.id DESC\n    "], ["\n      SELECT \n        u.id AS userId,\n        COUNT(c.id) AS loadCount,\n        MAX(u.lastSignedIn) AS lastSignedIn\n      FROM users u\n      LEFT JOIN agent_pauses p\n        ON p.agent_id = u.id AND p.status = 'active'\n      LEFT JOIN conversations c\n        ON c.assigned_to = u.id\n       AND c.status IN ('open','assigned')\n       AND c.channel = ", "\n      WHERE u.role IN ('user', 'admin')\n        AND u.id IN (", ")\n        AND p.id IS NULL\n      GROUP BY u.id\n      ORDER BY loadCount ASC, u.id DESC\n    "])), params.provider, drizzle_orm_1.sql.join(connected.map(function (id) { return (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", ""], ["", ""])), id); }), (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject([", "], [", "]))))))];
                case 4:
                    rows = (_g.sent());
                    if (Array.isArray(rows) && rows.length > 0) {
                        minLoad_1 = Number((_e = (_d = rows[0]) === null || _d === void 0 ? void 0 : _d.loadCount) !== null && _e !== void 0 ? _e : 0);
                        minRows = rows.filter(function (r) { var _a; return Number((_a = r.loadCount) !== null && _a !== void 0 ? _a : 0) === minLoad_1; });
                        chosenId = Number((_f = minRows[0]) === null || _f === void 0 ? void 0 : _f.userId);
                        if (!Number.isFinite(chosenId) || chosenId <= 0) {
                            agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
                            return [2 /*return*/, null];
                        }
                        agentAssignmentCache.set(cacheKey, { agentId: chosenId, timestamp: Date.now() });
                        return [2 /*return*/, {
                                userId: chosenId,
                                candidates: rows.length,
                                minLoad: minLoad_1,
                                source: "sse",
                            }];
                    }
                    _g.label = 5;
                case 5:
                    agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
                    return [2 /*return*/, null];
            }
        });
    });
}
/**
 * Get all received messages with optional filters
 */
function getReceivedMessages(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var db, query, conditions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    query = db.select().from(schema_1.receivedMessages);
                    conditions = [];
                    if (filters === null || filters === void 0 ? void 0 : filters.provider) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.receivedMessages.provider, filters.provider));
                    }
                    if ((filters === null || filters === void 0 ? void 0 : filters.processed) !== undefined) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.receivedMessages.processed, filters.processed ? 1 : 0));
                    }
                    if (filters === null || filters === void 0 ? void 0 : filters.customerId) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.receivedMessages.customerId, filters.customerId));
                    }
                    if (conditions.length > 0) {
                        query = query.where(drizzle_orm_1.and.apply(void 0, conditions));
                    }
                    query = query.orderBy((0, drizzle_orm_1.desc)(schema_1.receivedMessages.createdAt));
                    if (filters === null || filters === void 0 ? void 0 : filters.limit) {
                        query = query.limit(filters.limit);
                    }
                    return [4 /*yield*/, query];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Get a single received message by ID
 */
function getReceivedMessageById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.receivedMessages)
                            .where((0, drizzle_orm_1.eq)(schema_1.receivedMessages.id, id))
                            .limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
/**
 * Get a received message by external ID (from provider)
 */
function getReceivedMessageByExternalId(externalId, provider) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.receivedMessages)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receivedMessages.externalId, externalId), (0, drizzle_orm_1.eq)(schema_1.receivedMessages.provider, provider)))
                            .limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
/**
 * Mark a message as processed
 */
function markMessageAsProcessed(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, db
                            .update(schema_1.receivedMessages)
                            .set(__assign({ processed: 1, processedAt: new Date() }, updates))
                            .where((0, drizzle_orm_1.eq)(schema_1.receivedMessages.id, id))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, getReceivedMessageById(id)];
                case 3: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Get conversation history for a phone number/user ID
 */
function getConversationHistory(fromNumber_1, provider_1) {
    return __awaiter(this, arguments, void 0, function (fromNumber, provider, limit) {
        var db;
        if (limit === void 0) { limit = 50; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.receivedMessages)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.receivedMessages.fromNumber, fromNumber), (0, drizzle_orm_1.eq)(schema_1.receivedMessages.provider, provider)))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.receivedMessages.timestamp))
                            .limit(limit)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Função removida — usar generatePhoneVariants de utils/phone.ts
function findOrCreateCustomerByPhone(phone, name, photoUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var db, normalizedPhone, searchVariants, existing, pushName, finalName, result, rawId, newId, customer;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _b.sent();
                    if (!db)
                        throw new Error("Database not available");
                    normalizedPhone = (0, phone_1.formatPhoneBR)(phone);
                    if (normalizedPhone.length < 10) {
                        throw new Error("N\u00FAmero muito curto ap\u00F3s normaliza\u00E7\u00E3o: ".concat(phone, " \u2192 ").concat(normalizedPhone));
                    }
                    searchVariants = (0, phone_1.generatePhoneVariants)(phone);
                    return [4 /*yield*/, db
                            .select({
                            id: schema_1.customers.id,
                            name: schema_1.customers.name,
                            email: schema_1.customers.email,
                            phone: schema_1.customers.phone,
                            status: schema_1.customers.status,
                            photoUrl: schema_1.customers.photoUrl,
                        })
                            .from(schema_1.customers)
                            .where((0, drizzle_orm_1.inArray)(schema_1.customers.phone, searchVariants))
                            .limit(1)];
                case 2:
                    existing = _b.sent();
                    if (!(!existing || existing.length === 0)) return [3 /*break*/, 4];
                    pushName = name;
                    finalName = (pushName && pushName.trim() !== '')
                        ? pushName
                        : "Cliente ".concat(normalizedPhone.slice(-4));
                    return [4 /*yield*/, db.insert(schema_1.customers).values({
                            name: finalName,
                            phone: normalizedPhone, // Sempre salvo no formato normalizado
                            photoUrl: photoUrl || null,
                            status: "active",
                        })];
                case 3:
                    result = _b.sent();
                    rawId = Array.isArray(result) ? (_a = result[0]) === null || _a === void 0 ? void 0 : _a.insertId : (result === null || result === void 0 ? void 0 : result.insertId) || (result === null || result === void 0 ? void 0 : result.lastInsertRowid);
                    newId = Number(rawId);
                    if (!newId || isNaN(newId)) {
                        throw new Error("Falha ao obter ID do cliente recém-criado");
                    }
                    existing = [{
                            id: newId,
                            name: finalName,
                            email: null,
                            phone: normalizedPhone,
                            status: "active",
                            photoUrl: photoUrl || null,
                        }];
                    _b.label = 4;
                case 4:
                    customer = existing[0];
                    if (!(name && customer.name !== name)) return [3 /*break*/, 6];
                    return [4 /*yield*/, db
                            .update(schema_1.customers)
                            .set({ name: name, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.customers.id, customer.id))];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    if (!(photoUrl && customer.photoUrl !== photoUrl)) return [3 /*break*/, 8];
                    return [4 /*yield*/, db
                            .update(schema_1.customers)
                            .set({ photoUrl: photoUrl, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.eq)(schema_1.customers.id, customer.id))];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [2 /*return*/, customer];
            }
        });
    });
}
function buildInboundContent(message) {
    var _a, _b, _c, _d, _e;
    if ((_a = message.text) === null || _a === void 0 ? void 0 : _a.trim())
        return message.text;
    // PROBLEMA 2: extendedTextMessage (respostas a status)
    if ((_c = (_b = message.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.text) === null || _c === void 0 ? void 0 : _c.trim()) {
        return message.extendedTextMessage.text;
    }
    if ((_d = message.messageText) === null || _d === void 0 ? void 0 : _d.trim())
        return message.messageText;
    if ((_e = message.caption) === null || _e === void 0 ? void 0 : _e.trim())
        return message.caption;
    switch (message.messageType) {
        case "image":
            return "[Imagem]";
        case "audio":
            return "[Audio]";
        case "video":
            return "[Video]";
        case "document":
            return "[Documento]";
        case "location":
            return "[Localizacao]";
        case "sticker":
        case "stickerMessage":
            return ""; // Sticker é renderizado como imagem no frontend
        case "extendedTextMessage":
            return "[Resposta a Status]";
        case "reaction":
            return "[Reacao]";
        case "contact":
            return "[Contato]";
        default:
            return "[Mensagem]";
    }
}
// ==============================================
// Ingest inbound conversation message (WhatsApp/Instagram)
// ==============================================
function ingestInboundConversationMessage(message) {
    return __awaiter(this, void 0, void 0, function () {
        var db, existing, customer, now, picked, assignedUserId, defaultQueue, found, conversationId, existingConversation, newConversation, isReopening, shouldAssign, fileUrlToSave, duplicateCheck, timeWindowMs, now_1, already, insertResult, rawMessageId, messageDbId, needsR2Upload, configRecord, configData, apiUrl, apiKey, instanceName, downloadUrl, response, data, r2Url, error_1, messageContent, sseMessage, sseConvUpdate;
        var _this = this;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("[Ingest] Starting for message from", message.fromNumber, "type:", message.messageType);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _f.sent();
                    if (!db) {
                        console.error("[ingestInbound] Database not available!");
                        return [2 /*return*/, null];
                    }
                    if (!message.externalId) return [3 /*break*/, 4];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.processedWebhookMessages)
                            .where((0, drizzle_orm_1.eq)(schema_1.processedWebhookMessages.id, message.externalId))
                            .limit(1)];
                case 2:
                    existing = _f.sent();
                    if (existing.length > 0) {
                        console.log("[Webhook] Duplicate message ignored: ".concat(message.externalId));
                        return [2 /*return*/, null];
                    }
                    // Marcar como processada
                    return [4 /*yield*/, db.insert(schema_1.processedWebhookMessages).values({ id: message.externalId })];
                case 3:
                    // Marcar como processada
                    _f.sent();
                    console.log("[Webhook] New message registered: ".concat(message.externalId));
                    _f.label = 4;
                case 4: return [4 /*yield*/, findOrCreateCustomerByPhone(message.fromNumber, message.fromName || undefined)];
                case 5:
                    customer = _f.sent();
                    // 2. Fetch profile picture in background (non-blocking)
                    // Download from WhatsApp CDN and upload to R2 (avoids 403 in browser)
                    if (message.provider === "whatsapp" && !(customer === null || customer === void 0 ? void 0 : customer.photoUrl) && (customer === null || customer === void 0 ? void 0 : customer.id)) {
                        setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
                            var downloadAndUploadProfilePic, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./services/profile-pic.js'); })];
                                    case 1:
                                        downloadAndUploadProfilePic = (_a.sent()).downloadAndUploadProfilePic;
                                        return [4 /*yield*/, downloadAndUploadProfilePic(message.fromNumber, customer.id)];
                                    case 2:
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_1 = _a.sent();
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                    }
                    now = (_a = message.createdAt) !== null && _a !== void 0 ? _a : new Date();
                    return [4 /*yield*/, pickLeastLoadedOnlineAgent({ provider: message.provider })];
                case 6:
                    picked = _f.sent();
                    assignedUserId = picked && Number.isFinite(picked.userId) && picked.userId > 0
                        ? picked.userId
                        : null;
                    console.log("[ingestInbound] 🎯 Agent pick result:", { picked: picked === null || picked === void 0 ? void 0 : picked.userId, assignedUserId: assignedUserId, customerPhone: customer.phone });
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.queues)
                            .where((0, drizzle_orm_1.eq)(schema_1.queues.status, "active"))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.queues.priority))
                            .limit(1)];
                case 7:
                    defaultQueue = (_f.sent())[0];
                    return [4 /*yield*/, (0, phone_1.findConversationByPhone)(db, customer.phone, schema_1.conversations, schema_1.customers)];
                case 8:
                    found = _f.sent();
                    conversationId = found === null || found === void 0 ? void 0 : found.conversationId;
                    existingConversation = null;
                    if (!conversationId) return [3 /*break*/, 10];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.conversations)
                            .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversationId))
                            .limit(1)];
                case 9:
                    existingConversation = (_f.sent())[0];
                    conversationId = existingConversation === null || existingConversation === void 0 ? void 0 : existingConversation.id;
                    _f.label = 10;
                case 10:
                    // Se a conversa encontrada pertence a outro customerId, usar o correto
                    if (existingConversation && existingConversation.customerId !== customer.id) {
                        // Usar o customer da conversa existente (para manter consistência)
                        console.log("[ingestInbound] \uD83D\uDD04 Customer ID ajustado: ".concat(customer.id, " \u2192 ").concat(existingConversation.customerId, " (mesmo telefone)"));
                    }
                    if (!!conversationId) return [3 /*break*/, 13];
                    // Create new conversation
                    return [4 /*yield*/, db.insert(schema_1.conversations).values({
                            customerId: customer.id,
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            channel: message.provider || "whatsapp", // fallback para whatsapp se undefined
                            status: assignedUserId ? "assigned" : "open",
                            assignedTo: assignedUserId,
                            queueId: assignedUserId ? null : ((_b = defaultQueue === null || defaultQueue === void 0 ? void 0 : defaultQueue.id) !== null && _b !== void 0 ? _b : null),
                            openedAt: now,
                            lastMessageAt: now,
                            unreadCount: 1,
                        })];
                case 11:
                    // Create new conversation
                    _f.sent();
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.conversations)
                            .where((0, drizzle_orm_1.eq)(schema_1.conversations.customerId, customer.id))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.conversations.id))
                            .limit(1)];
                case 12:
                    newConversation = (_f.sent())[0];
                    conversationId = newConversation === null || newConversation === void 0 ? void 0 : newConversation.id;
                    return [3 /*break*/, 15];
                case 13:
                    isReopening = (existingConversation === null || existingConversation === void 0 ? void 0 : existingConversation.status) === "closed";
                    shouldAssign = !(existingConversation === null || existingConversation === void 0 ? void 0 : existingConversation.assignedTo) && assignedUserId;
                    return [4 /*yield*/, db
                            .update(schema_1.conversations)
                            .set(__assign(__assign({ lastMessageAt: now, unreadCount: isReopening ? 1 : (0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["unread_count + 1"], ["unread_count + 1"]))) }, (isReopening
                            ? {
                                status: assignedUserId ? "assigned" : "open",
                                assignedTo: assignedUserId !== null && assignedUserId !== void 0 ? assignedUserId : null,
                                queueId: assignedUserId ? null : ((_c = defaultQueue === null || defaultQueue === void 0 ? void 0 : defaultQueue.id) !== null && _c !== void 0 ? _c : null),
                                closedAt: null,
                                closeReason: null,
                            }
                            : {})), (shouldAssign && !isReopening
                            ? {
                                assignedTo: assignedUserId,
                                status: "assigned",
                                queueId: null,
                            }
                            : {})))
                            .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversationId))];
                case 14:
                    _f.sent();
                    _f.label = 15;
                case 15:
                    fileUrlToSave = message.mediaUrl || null;
                    if (message.externalId) {
                        duplicateCheck = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversationMessages.externalId, message.externalId), (0, drizzle_orm_1.eq)(schema_1.conversationMessages.senderType, "customer"));
                    }
                    else {
                        timeWindowMs = 5000;
                        now_1 = new Date();
                        duplicateCheck = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversationMessages.conversationId, conversationId), (0, drizzle_orm_1.eq)(schema_1.conversationMessages.senderType, "customer"), (0, drizzle_orm_1.eq)(schema_1.conversationMessages.content, message.messageText || message.caption || ""), (0, drizzle_orm_1.gte)(schema_1.conversationMessages.createdAt, new Date(now_1.getTime() - timeWindowMs)), (0, drizzle_orm_1.lte)(schema_1.conversationMessages.createdAt, new Date(now_1.getTime() + timeWindowMs)));
                    }
                    return [4 /*yield*/, db
                            .select({ id: schema_1.conversationMessages.id })
                            .from(schema_1.conversationMessages)
                            .where(duplicateCheck)
                            .limit(1)];
                case 16:
                    already = (_f.sent())[0];
                    if (already) {
                        console.log("[EvolutionDeduplication] Mensagem j\u00E1 processada, ignorando: ".concat(message.externalId || 'sem externalId'));
                        return [2 /*return*/, null];
                    }
                    console.log("[EvolutionDeduplication] Nova mensagem, processando: ".concat(message.externalId || 'sem externalId'));
                    return [4 /*yield*/, db.insert(schema_1.conversationMessages).values({
                            conversationId: conversationId,
                            externalId: message.externalId || null,
                            senderId: null,
                            senderType: "customer",
                            content: buildInboundContent(message),
                            fileUrl: fileUrlToSave,
                            fileName: message.fileName || null,
                            fileType: message.mimeType || null,
                            fileSize: message.fileSize || null,
                            createdAt: now,
                        })];
                case 17:
                    insertResult = _f.sent();
                    rawMessageId = Array.isArray(insertResult) ? (_d = insertResult[0]) === null || _d === void 0 ? void 0 : _d.insertId : (insertResult === null || insertResult === void 0 ? void 0 : insertResult.insertId) || (insertResult === null || insertResult === void 0 ? void 0 : insertResult.lastInsertRowid);
                    messageDbId = Number(rawMessageId) || undefined;
                    needsR2Upload = message.provider === "whatsapp" &&
                        message.externalId &&
                        (
                        // Case 1: has WhatsApp CDN URL
                        ((fileUrlToSave === null || fileUrlToSave === void 0 ? void 0 : fileUrlToSave.includes("mmg.whatsapp.net")) || (fileUrlToSave === null || fileUrlToSave === void 0 ? void 0 : fileUrlToSave.includes("pps.whatsapp.net"))) ||
                            // Case 2: has media but no URL (stickers, etc.) — mediaId or mimeType indicates media
                            (!fileUrlToSave && (message.mediaId || ["sticker", "stickerMessage", "image", "audio", "video", "document"].includes(message.messageType || ""))));
                    if (!needsR2Upload) return [3 /*break*/, 27];
                    _f.label = 18;
                case 18:
                    _f.trys.push([18, 26, , 27]);
                    console.log("[S3] Triggering Evolution download for R2 upload, messageId:", message.externalId);
                    return [4 /*yield*/, db
                            .select()
                            .from(integrationSettings)
                            .where((0, drizzle_orm_1.eq)(integrationSettings.integrationType, "evolution_api"))
                            .limit(1)];
                case 19:
                    configRecord = (_f.sent())[0];
                    if (!(configRecord === null || configRecord === void 0 ? void 0 : configRecord.config)) return [3 /*break*/, 25];
                    configData = typeof configRecord.config === "string"
                        ? JSON.parse(configRecord.config)
                        : configRecord.config;
                    apiUrl = (_e = configData.apiUrl) === null || _e === void 0 ? void 0 : _e.replace(/\/$/, "");
                    apiKey = configData.apiKey || configData.accessToken;
                    instanceName = configData.instanceName;
                    if (!(apiUrl && apiKey && instanceName)) return [3 /*break*/, 25];
                    downloadUrl = "".concat(apiUrl, "/message/download/").concat(instanceName, "/").concat(message.externalId);
                    console.log("[S3] Calling Evolution download endpoint:", downloadUrl);
                    return [4 /*yield*/, fetch(downloadUrl, {
                            headers: {
                                "apikey": apiKey,
                            },
                            signal: AbortSignal.timeout(15000),
                        })];
                case 20:
                    response = _f.sent();
                    if (!response.ok) return [3 /*break*/, 24];
                    return [4 /*yield*/, response.json()];
                case 21:
                    data = _f.sent();
                    console.log("[S3] Download response:", data);
                    r2Url = (data === null || data === void 0 ? void 0 : data.url) || (data === null || data === void 0 ? void 0 : data.mediaUrl) || null;
                    if (!(r2Url && r2Url.includes("r2.dev"))) return [3 /*break*/, 23];
                    console.log("[S3] ✅ Got R2 URL, updating message:", r2Url);
                    return [4 /*yield*/, db
                            .update(schema_1.conversationMessages)
                            .set({ fileUrl: r2Url })
                            .where((0, drizzle_orm_1.eq)(schema_1.conversationMessages.id, messageDbId))];
                case 22:
                    _f.sent();
                    console.log("[S3] Message updated with R2 URL");
                    _f.label = 23;
                case 23: return [3 /*break*/, 25];
                case 24:
                    console.log("[S3] ❌ Download failed:", response.status, response.statusText);
                    _f.label = 25;
                case 25: return [3 /*break*/, 27];
                case 26:
                    error_1 = _f.sent();
                    console.log("[S3] Error during R2 upload:", error_1);
                    return [3 /*break*/, 27];
                case 27:
                    console.log("[Ingest] ✅ Message ingested successfully:", {
                        conversationId: conversationId,
                        messageDbId: messageDbId,
                        content: buildInboundContent(message).substring(0, 50),
                        assignedUserId: assignedUserId
                    });
                    messageContent = message.messageText || message.caption || "[Mídia]";
                    sseMessage = {
                        type: sse_1.EVENTS.MESSAGE_NEW,
                        data: {
                            conversationId: conversationId,
                            message: {
                                id: messageDbId,
                                content: buildInboundContent(message),
                                senderType: "customer",
                                fileUrl: fileUrlToSave,
                                fileType: message.mimeType || null,
                                createdAt: now.toISOString(),
                            },
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            customerAvatar: customer.photoUrl,
                        },
                        timestamp: Date.now(),
                    };
                    sseConvUpdate = {
                        type: !existingConversation ? sse_1.EVENTS.CONVERSATION_NEW : sse_1.EVENTS.CONVERSATION_UPDATE,
                        data: {
                            id: conversationId,
                            conversationId: conversationId,
                            lastMessageAt: now.toISOString(),
                            lastMessage: messageContent,
                            unreadCount: existingConversation ? (existingConversation.unreadCount + 1) : 1,
                            status: assignedUserId ? "assigned" : "open",
                            assignedTo: assignedUserId,
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            customerAvatar: customer.photoUrl,
                        },
                        timestamp: Date.now(),
                    };
                    // BROADCAST STRATEGY: 
                    // 1. Notify the assigned agent specifically
                    // 2. Notify ALL connected users if it's a NEW conversation or UNASSIGNED
                    if (assignedUserId) {
                        sse_1.sseManager.emitToUser(String(assignedUserId), sseMessage);
                        sse_1.sseManager.emitToUser(String(assignedUserId), sseConvUpdate);
                        // Also notify ALL because admins need to see the update in the list
                        sse_1.sseManager.emitToAll(sseConvUpdate);
                    }
                    else {
                        // No assigned agent — notify all connected users (Admins/Available Agents)
                        sse_1.sseManager.emitToAll(sseMessage);
                        sse_1.sseManager.emitToAll(sseConvUpdate);
                    }
                    return [2 /*return*/, { conversationId: conversationId, customerId: customer.id }];
            }
        });
    });
}
function listReceivedMessages(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var db, conditions, query, messages, stats;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    conditions = [];
                    if (filters === null || filters === void 0 ? void 0 : filters.provider) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.receivedMessages.provider, filters.provider));
                    }
                    query = db.select().from(schema_1.receivedMessages);
                    if (conditions.length > 0) {
                        query = query.where(drizzle_orm_1.and.apply(void 0, conditions));
                    }
                    return [4 /*yield*/, query];
                case 2:
                    messages = _a.sent();
                    stats = {
                        total: messages.length,
                        processed: messages.filter(function (m) { return m.processed === 1; }).length,
                        pending: messages.filter(function (m) { return m.processed === 0; }).length,
                        byType: {},
                        byProvider: {},
                    };
                    messages.forEach(function (msg) {
                        stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
                        stats.byProvider[msg.provider] = (stats.byProvider[msg.provider] || 0) + 1;
                    });
                    return [2 /*return*/, stats];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
