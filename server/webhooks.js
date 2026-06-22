"use strict";
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
var express_1 = require("express");
var db_1 = require("./db");
var schema_1 = require("../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
var db_messages_1 = require("./db-messages");
var mobile_sync_1 = require("./queue/mobile-sync");
var crypto_1 = require("crypto");
var phone_1 = require("./utils/phone");
// Import debug module
var debugModule = null;
try {
    debugModule = require("./debug");
}
catch (e) {
    console.error("[Webhooks] Debug module not loaded");
}
var router = (0, express_1.Router)();
var isProduction = process.env.NODE_ENV === "production";
var addDebugLog = (debugModule === null || debugModule === void 0 ? void 0 : debugModule.addLog) ||
    (function (level, category, message, data) {
        console.log("[".concat(level.toUpperCase(), "] [").concat(category, "]"), message, data);
    });
var addDebugLogWebhook = (debugModule === null || debugModule === void 0 ? void 0 : debugModule.webhookLogger) ||
    (function (req, res, next) {
        console.log("[WEBHOOK] ".concat(req.method, " ").concat(req.url));
        next();
    });
/**
 * Normalizar número de telefone brasileiro
 * Remove o 9 do celular se presente (padroniza para DDD + número fixo)
 * Garante que número brasileiro tenha formato correto
 */
function normalizeBrazilianNumber(value) {
    // Remove todos os caracteres não numéricos
    var cleaned = value.replace(/\D/g, "");
    // Se não começar com 55 (Brasil), adiciona
    var normalized = cleaned;
    if (!normalized.startsWith("55")) {
        if (normalized.startsWith("9")) {
            // Número começa com 9, adiciona 55 na frente
            normalized = "55" + normalized;
        }
        // Se não começar com 9 nem 55, adiciona 55
        if (!normalized.startsWith("55") && normalized.length > 0) {
            normalized = "55" + normalized;
        }
    }
    // Agora normaliza para formato brasileiro sem 9
    // Se tem 13 dígitos (55 + DDD + 9 + número), remove o 9
    if (normalized.length === 13 && normalized.startsWith("55")) {
        normalized = normalized.substring(0, 2) + normalized.substring(3);
    }
    return normalized;
}
/**
 * Limpa URL do R2 para obter apenas o caminho relativo dentro do bucket.
 * Remove query string, nome do bucket e deixa o path (ex: evolution-api/.../file.jpg)
 */
function cleanR2Url(url) {
    console.log("[cleanR2Url] Input URL:", url === null || url === void 0 ? void 0 : url.substring(0, 120));
    if (!url)
        return null;
    // Verificar se é URL do R2 (r2.cloudflarestorage.com ou .r2.dev)
    var isR2 = url.includes(".r2.") ||
        url.includes("r2.cloudflarestorage.com") ||
        url.includes(".r2.dev");
    if (!isR2) {
        // Não é URL do R2, ignorar (não salvar)
        console.log("[Webhooks] Non-R2 URL, skipping:", url.substring(0, 80));
        return null;
    }
    try {
        var parsed = new URL(url);
        // pathname exemplo: /bucket-name/evolution-api/xxxx/file.jpg
        var pathname = parsed.pathname;
        // Separar partes e remover o primeiro segmento (bucket name)
        var parts = pathname.split("/").filter(Boolean);
        if (parts.length < 2) {
            console.log("[Webhooks] R2 URL has no bucket+path:", url);
            return null;
        }
        var relativePath = parts.slice(1).join("/");
        console.log("[Webhooks] Cleaned R2 path:", relativePath);
        return relativePath;
    }
    catch (e) {
        console.error("[Webhooks] Failed to parse R2 URL:", url, e);
        return null;
    }
}
/**
 * Get Evolution API configuration
 */
function getEvolutionConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var db, config, configData, apiUrl, apiKey, instanceName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "evolution_api"))
                            .limit(1)];
                case 2:
                    config = (_a.sent())[0];
                    if (!config || !config.isActive)
                        return [2 /*return*/, null];
                    configData = typeof config.config === "string"
                        ? JSON.parse(config.config)
                        : config.config;
                    apiUrl = configData.apiUrl;
                    apiKey = configData.apiKey || configData.accessToken;
                    instanceName = configData.instanceName;
                    if (!apiUrl || !apiKey || !instanceName)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            apiUrl: apiUrl.replace(/\/$/, ""),
                            apiKey: apiKey,
                            instanceName: instanceName,
                        }];
            }
        });
    });
}
/**
 * Evolution API payloads vary a lot. Try to extract the contact JID/phone
 * from multiple possible shapes.
 */
function extractEvolutionRemoteJid(body) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (!body)
        return null;
    var data = (body === null || body === void 0 ? void 0 : body.data) || (body === null || body === void 0 ? void 0 : body.payload) || body;
    var msg0 = ((_a = data === null || data === void 0 ? void 0 : data.messages) === null || _a === void 0 ? void 0 : _a[0]) ||
        (data === null || data === void 0 ? void 0 : data.message) ||
        (body === null || body === void 0 ? void 0 : body.message) ||
        ((_b = body === null || body === void 0 ? void 0 : body.messages) === null || _b === void 0 ? void 0 : _b[0]) ||
        ((_d = (_c = body === null || body === void 0 ? void 0 : body.data) === null || _c === void 0 ? void 0 : _c.messages) === null || _d === void 0 ? void 0 : _d[0]);
    var key = (data === null || data === void 0 ? void 0 : data.key) ||
        ((_e = data === null || data === void 0 ? void 0 : data.data) === null || _e === void 0 ? void 0 : _e.key) ||
        ((_f = data === null || data === void 0 ? void 0 : data.message) === null || _f === void 0 ? void 0 : _f.key) ||
        (msg0 === null || msg0 === void 0 ? void 0 : msg0.key) ||
        ((_g = msg0 === null || msg0 === void 0 ? void 0 : msg0.message) === null || _g === void 0 ? void 0 : _g.key);
    var sender = (data === null || data === void 0 ? void 0 : data.sender) || (body === null || body === void 0 ? void 0 : body.sender);
    var destination = (data === null || data === void 0 ? void 0 : data.destination) || (body === null || body === void 0 ? void 0 : body.destination);
    var senderStr = typeof sender === "string" ? sender : null;
    var destinationStr = typeof destination === "string" ? destination : null;
    var candidates = [
        body === null || body === void 0 ? void 0 : body.remoteJid,
        (_h = body === null || body === void 0 ? void 0 : body.data) === null || _h === void 0 ? void 0 : _h.remoteJid,
        data === null || data === void 0 ? void 0 : data.remoteJid,
        key === null || key === void 0 ? void 0 : key.remoteJid,
        (_j = msg0 === null || msg0 === void 0 ? void 0 : msg0.key) === null || _j === void 0 ? void 0 : _j.remoteJid,
        msg0 === null || msg0 === void 0 ? void 0 : msg0.remoteJid,
        data === null || data === void 0 ? void 0 : data.from,
        data === null || data === void 0 ? void 0 : data.chatId,
        senderStr,
        sender === null || sender === void 0 ? void 0 : sender.remoteJid,
        sender === null || sender === void 0 ? void 0 : sender.jid,
        sender === null || sender === void 0 ? void 0 : sender.id,
        sender === null || sender === void 0 ? void 0 : sender.phone,
        sender === null || sender === void 0 ? void 0 : sender.number,
        destinationStr,
        destination === null || destination === void 0 ? void 0 : destination.remoteJid,
        destination === null || destination === void 0 ? void 0 : destination.jid,
        destination === null || destination === void 0 ? void 0 : destination.id,
        destination === null || destination === void 0 ? void 0 : destination.phone,
        destination === null || destination === void 0 ? void 0 : destination.number,
    ].filter(Boolean);
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var c = candidates_1[_i];
        if (typeof c !== "string")
            continue;
        // Ignore destination URLs that are not JIDs
        if (c.startsWith("http://") || c.startsWith("https://"))
            continue;
        return c;
    }
    return null;
}
/**
 * Normalizar número para busca no banco (sem +)
 * DEPRECATED: Use formatPhoneBR em vez disso
 */
function normalizeForDb(value) {
    return value.replace(/\D/g, "");
}
/**
 * Normalizar número de entrada do webhook (com +)
 * Usa formatPhoneBR internamente e adiciona + se necessário para consistência
 */
function normalizeInboundNumber(value) {
    if (!value)
        return null;
    // Remove sufixo WhatsApp (@s.whatsapp.net) se houver
    var stripped = value.split("@")[0];
    if (!stripped)
        return null;
    // Usar a função de normalização estrita
    var normalized = (0, phone_1.formatPhoneBR)(stripped);
    return normalized; // return without +, as formatPhoneBR does
}
/**
 * Verificar se dois números brasileiros são o mesmo contato
 * Considera números com ou sem 9 como o mesmo contato
 */
function isSameBrazilianNumber(num1, num2) {
    var n1 = normalizeBrazilianNumber(num1);
    var n2 = normalizeBrazilianNumber(num2);
    return n1 === n2;
}
function logWebhookSummary(provider, payload) {
    if (!isProduction) {
        console.log("[".concat(provider, " Webhook] Received payload:"), JSON.stringify(payload, null, 2));
        return;
    }
    var body = payload;
    var entryCount = Array.isArray(body === null || body === void 0 ? void 0 : body.entry) ? body.entry.length : 0;
    console.log("[".concat(provider, " Webhook] Received payload with ").concat(entryCount, " entries"));
}
/**
 * WhatsApp Webhook Verification (GET)
 * Called by Meta when setting up the webhook
 */
router.get("/webhooks/whatsapp", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var mode, token, challenge, db, config, configData, storedToken, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                mode = req.query["hub.mode"];
                token = req.query["hub.verify_token"];
                challenge = req.query["hub.challenge"];
                console.log("[WhatsApp Webhook] Verification request:", {
                    mode: mode,
                    token: token ? "***" : undefined,
                });
                if (!(mode === "subscribe")) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_1.getDb)()];
            case 1:
                db = _a.sent();
                if (!db) {
                    return [2 /*return*/, res.status(500).send("Database not available")];
                }
                return [4 /*yield*/, db
                        .select()
                        .from(schema_1.integrationSettings)
                        .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "whatsapp_business"))
                        .limit(1)];
            case 2:
                config = _a.sent();
                if (config.length === 0) {
                    console.log("[WhatsApp Webhook] No configuration found");
                    return [2 /*return*/, res.status(403).send("No configuration found")];
                }
                configData = typeof config[0].config === "string"
                    ? JSON.parse(config[0].config)
                    : config[0].config;
                storedToken = configData.webhookVerifyToken;
                console.log("[WhatsApp Webhook] Verify token present:", Boolean(token));
                console.log("[WhatsApp Webhook] Stored token present:", Boolean(storedToken));
                if (token === storedToken) {
                    console.log("[WhatsApp Webhook] Verification successful");
                    return [2 /*return*/, res.status(200).send(challenge)];
                }
                else {
                    console.log("[WhatsApp Webhook] Token mismatch");
                    return [2 /*return*/, res.status(403).send("Verification token mismatch")];
                }
                _a.label = 3;
            case 3:
                res.status(400).send("Invalid verification request");
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.error("[WhatsApp Webhook] Verification error:", error_1);
                res.status(500).send("Internal server error");
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * WhatsApp Webhook Message Handler (POST)
 * Receives incoming messages from WhatsApp Business API
 */
router.post("/webhooks/whatsapp", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, signature, isValid, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                body = req.body;
                logWebhookSummary("WhatsApp", body);
                signature = req.headers["x-hub-signature-256"];
                if (!signature && isProduction) {
                    console.error("[WhatsApp Webhook] Missing signature in production");
                    return [2 /*return*/, res.status(403).send("Missing signature")];
                }
                if (!signature) return [3 /*break*/, 2];
                return [4 /*yield*/, validateWhatsAppSignature(req.rawBody, signature)];
            case 1:
                isValid = _a.sent();
                if (!isValid) {
                    console.error("[WhatsApp Webhook] Invalid signature");
                    return [2 /*return*/, res.status(403).send("Invalid signature")];
                }
                console.log("[WhatsApp Webhook] Signature validated successfully");
                _a.label = 2;
            case 2:
                // Acknowledge receipt immediately
                res.status(200).send("EVENT_RECEIVED");
                // Handler antigo desativado — Evolution API usa /evolution
                // processWhatsAppWebhook(body) — DESATIVADO para evitar duplicação
                console.log("[WhatsApp Webhook] ⛔ Handler antigo desativado — usando /evolution");
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error("[WhatsApp Webhook] Handler error:", error_2);
                res.status(500).send("Internal server error");
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Instagram Webhook Verification (GET)
 * Called by Meta when setting up the webhook
 */
router.get("/webhooks/instagram", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var mode, token, challenge, db, config, configData, storedToken, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                mode = req.query["hub.mode"];
                token = req.query["hub.verify_token"];
                challenge = req.query["hub.challenge"];
                console.log("[Instagram Webhook] Verification request:", {
                    mode: mode,
                    token: token ? "***" : undefined,
                });
                if (!(mode === "subscribe")) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, db_1.getDb)()];
            case 1:
                db = _a.sent();
                if (!db) {
                    return [2 /*return*/, res.status(500).send("Database not available")];
                }
                return [4 /*yield*/, db
                        .select()
                        .from(schema_1.integrationSettings)
                        .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "instagram_graph"))
                        .limit(1)];
            case 2:
                config = _a.sent();
                if (config.length === 0) {
                    console.log("[Instagram Webhook] No configuration found");
                    return [2 /*return*/, res.status(403).send("No configuration found")];
                }
                configData = typeof config[0].config === "string"
                    ? JSON.parse(config[0].config)
                    : config[0].config;
                storedToken = configData.webhookVerifyToken;
                if (token === storedToken) {
                    console.log("[Instagram Webhook] Verification successful");
                    return [2 /*return*/, res.status(200).send(challenge)];
                }
                else {
                    console.log("[Instagram Webhook] Token mismatch");
                    return [2 /*return*/, res.status(403).send("Verification token mismatch")];
                }
                _a.label = 3;
            case 3:
                res.status(400).send("Invalid verification request");
                return [3 /*break*/, 5];
            case 4:
                error_3 = _a.sent();
                console.error("[Instagram Webhook] Verification error:", error_3);
                res.status(500).send("Internal server error");
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Instagram Webhook Message Handler (POST)
 * Receives incoming messages from Instagram Graph API
 */
router.post("/webhooks/instagram", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, signature, isValid, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                body = req.body;
                logWebhookSummary("Instagram", body);
                signature = req.headers["x-hub-signature-256"];
                if (!signature && isProduction) {
                    console.error("[Instagram Webhook] Missing signature in production");
                    return [2 /*return*/, res.status(403).send("Missing signature")];
                }
                if (!signature) return [3 /*break*/, 2];
                return [4 /*yield*/, validateInstagramSignature(req.rawBody, signature)];
            case 1:
                isValid = _a.sent();
                if (!isValid) {
                    console.error("[Instagram Webhook] Invalid signature");
                    return [2 /*return*/, res.status(403).send("Invalid signature")];
                }
                console.log("[Instagram Webhook] Signature validated successfully");
                _a.label = 2;
            case 2:
                // Acknowledge receipt immediately
                res.status(200).send("EVENT_RECEIVED");
                // Process the webhook asynchronously
                processInstagramWebhook(body).catch(function (error) {
                    console.error("[Instagram Webhook] Processing error:", error);
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error("[Instagram Webhook] Handler error:", error_4);
                res.status(500).send("Internal server error");
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Evolution API Webhook (POST)
 * Supports both /evolution and /evolution/:event (when webhook_by_events is true)
 */
router.post("/evolution", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, handleEvolutionWebhook(req, res)];
    });
}); });
router.post("/evolution/:event", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, handleEvolutionWebhook(req, res)];
    });
}); });
function handleEvolutionWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var fullUrl;
        return __generator(this, function (_a) {
            try {
                fullUrl = "".concat(req.protocol, "://").concat(req.get("host")).concat(req.originalUrl);
                console.log("[Evolution Handler] 🎯 Received webhook:", {
                    method: req.method,
                    path: req.path,
                    url: fullUrl,
                    query: req.query,
                });
                // RESPOSTA IMEDIATA - não bloquear o Evolution
                res.status(200).send("EVENT_RECEIVED");
                // Processar em background (não usar await para não bloquear)
                setImmediate(function () {
                    processEvolutionWebhookAsync(req).catch(function (err) {
                        console.error("[Evolution Webhook] Background processing error:", err);
                    });
                });
            }
            catch (error) {
                console.error("[Evolution Webhook] Handler error:", error);
                // Já enviamos 200, então só logamos o erro
            }
            return [2 /*return*/];
        });
    });
}
function processEvolutionWebhookAsync(req) {
    return __awaiter(this, void 0, void 0, function () {
        var body, fullUrl, eventName, queryApikeyRaw, apikeyParts, eventFromQuery, urlParts, m, remoteJid, normalizedEvent, allowedEvents, db, configRow, configData, expectedApiKey, queryApikey, cleanApikey, cleanExpected, error_5;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 4, , 5]);
                    body = req.body;
                    fullUrl = "".concat(req.protocol, "://").concat(req.get("host")).concat(req.originalUrl);
                    console.log("1. [Evolution Webhook] 📥 Webhook recebido:", {
                        url: fullUrl,
                        bodyKeys: Object.keys(body || {}),
                        hasData: !!(body === null || body === void 0 ? void 0 : body.data),
                        query: req.query,
                    });
                    if (!body || Object.keys(body).length === 0) {
                        console.log("[Evolution Webhook] Empty body, skipping");
                        return [2 /*return*/];
                    }
                    eventName = (body === null || body === void 0 ? void 0 : body.event) || ((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.event);
                    queryApikeyRaw = req.query["apikey"] || "";
                    apikeyParts = queryApikeyRaw.split("/").filter(Boolean);
                    eventFromQuery = apikeyParts.length > 1 ? apikeyParts.slice(1).join("/") : "";
                    if (!eventName && eventFromQuery) {
                        eventName = eventFromQuery;
                    }
                    if (!eventName) {
                        urlParts = fullUrl.split("/evolution")[1] || "";
                        m = urlParts.match(/\/([a-z0-9_-]+)$/i);
                        if (m === null || m === void 0 ? void 0 : m[1]) {
                            eventName = m[1];
                        }
                    }
                    if (!eventName) {
                        console.log("[Evolution Webhook] Event name not detected, ignoring");
                        return [2 /*return*/];
                    }
                    console.log("[Evolution Webhook] 📥 Received event:", {
                        event: eventName,
                        hasData: !!(body === null || body === void 0 ? void 0 : body.data),
                        bodyKeys: Object.keys(body),
                    });
                    console.log("2. [Evolution Webhook] ✅ Evento detectado:", eventName);
                    remoteJid = ((_c = (_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.key) === null || _c === void 0 ? void 0 : _c.remoteJid) ||
                        ((_d = body === null || body === void 0 ? void 0 : body.data) === null || _d === void 0 ? void 0 : _d.remoteJid) ||
                        (body === null || body === void 0 ? void 0 : body.destination) ||
                        ((_g = (_f = (_e = body === null || body === void 0 ? void 0 : body.data) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.key) === null || _g === void 0 ? void 0 : _g.remoteJid) ||
                        "";
                    if (remoteJid.includes("@g.us")) {
                        console.log("\uD83D\uDEAB [Grupos] Mensagem de grupo ignorada: ".concat(remoteJid));
                        return [2 /*return*/]; // Não processar nada, silenciosamente
                    }
                    normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");
                    allowedEvents = ["messages_upsert", "messages_update"];
                    // Ignorar TUDO que não for mensagem nova
                    if (!allowedEvents.includes(normalizedEvent)) {
                        console.log("[Evolution Webhook] \u23ED\uFE0F Ignoring event type: ".concat(eventName, " (normalized: ").concat(normalizedEvent, ")"));
                        return [2 /*return*/];
                    }
                    console.log("[Evolution Webhook] ✅ Event approved for processing");
                    console.log("3. [Evolution Webhook] ✅ Passou no filtro de eventos permitidos");
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _h.sent();
                    if (!db) {
                        console.error("[Evolution Webhook] ❌ Database not available");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "evolution_api"))
                            .limit(1)];
                case 2:
                    configRow = (_h.sent())[0];
                    if (configRow) {
                        configData = typeof configRow.config === "string"
                            ? JSON.parse(configRow.config)
                            : configRow.config;
                        expectedApiKey = configData.apiKey || configData.accessToken;
                        queryApikey = queryApikeyRaw;
                        cleanApikey = queryApikey.split("/")[0].replace("@", "");
                        cleanExpected = (expectedApiKey === null || expectedApiKey === void 0 ? void 0 : expectedApiKey.replace("@", "")) || "";
                        if (expectedApiKey && cleanApikey !== cleanExpected && cleanExpected && isProduction) {
                            console.log("[Evolution Webhook] 🔐 API key mismatch, ignoring");
                            console.log("  Expected:", cleanExpected.substring(0, 5) + "...");
                            console.log("  Received:", cleanApikey.substring(0, 5) + "...");
                            return [2 /*return*/];
                        }
                    }
                    else {
                        console.warn("[Evolution Webhook] ⚠️ No Evolution API config found in database");
                    }
                    console.log("[Evolution Webhook] 🚀 Starting message processing...");
                    // Processar evento de mensagem
                    return [4 /*yield*/, processEvolutionWebhook(__assign(__assign({}, body), { event: eventName }))];
                case 3:
                    // Processar evento de mensagem
                    _h.sent();
                    console.log("[Evolution Webhook] ✅ Message processing completed");
                    return [3 /*break*/, 5];
                case 4:
                    error_5 = _h.sent();
                    console.error("[Evolution Webhook] 💥 Unhandled error:", error_5);
                    throw error_5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process WhatsApp webhook payload
 * Extracts message data and saves to database
 */
function processWhatsAppWebhook(body) {
    return __awaiter(this, void 0, void 0, function () {
        var db, _i, _a, entry, changes, _b, changes_1, change, value, messages, contacts, _loop_1, _c, messages_1, message, error_6;
        var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
        return __generator(this, function (_7) {
            switch (_7.label) {
                case 0:
                    _7.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _7.sent();
                    if (!db) {
                        throw new Error("Database not available");
                    }
                    // WhatsApp webhook structure:
                    // body.entry[].changes[].value.messages[]
                    if (!body.entry || !Array.isArray(body.entry)) {
                        console.log("[WhatsApp] No entries in payload");
                        return [2 /*return*/];
                    }
                    _i = 0, _a = body.entry;
                    _7.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 9];
                    entry = _a[_i];
                    changes = entry.changes;
                    if (!changes || !Array.isArray(changes))
                        return [3 /*break*/, 8];
                    _b = 0, changes_1 = changes;
                    _7.label = 3;
                case 3:
                    if (!(_b < changes_1.length)) return [3 /*break*/, 8];
                    change = changes_1[_b];
                    value = change.value;
                    if (!value || !value.messages)
                        return [3 /*break*/, 7];
                    messages = value.messages;
                    contacts = value.contacts || [];
                    _loop_1 = function (message) {
                        var messageId, from, timestamp, type, contact, fromName, messageText, mediaUrl, mediaId, mimeType, caption, latitude, longitude, fileName, fileSize, existing, e_1, isPossibleSurveyResponse;
                        return __generator(this, function (_8) {
                            switch (_8.label) {
                                case 0:
                                    messageId = message.id;
                                    from = message.from;
                                    timestamp = parseInt(message.timestamp, 10);
                                    type = message.type;
                                    contact = contacts.find(function (c) { return c.wa_id === from; });
                                    fromName = ((_d = contact === null || contact === void 0 ? void 0 : contact.profile) === null || _d === void 0 ? void 0 : _d.name) || null;
                                    messageText = null;
                                    mediaUrl = null;
                                    mediaId = null;
                                    mimeType = null;
                                    caption = null;
                                    latitude = null;
                                    longitude = null;
                                    fileName = null;
                                    fileSize = null;
                                    switch (type) {
                                        case "text":
                                            messageText = ((_e = message.text) === null || _e === void 0 ? void 0 : _e.body) || null;
                                            break;
                                        case "image":
                                            mediaId = ((_f = message.image) === null || _f === void 0 ? void 0 : _f.id) || null;
                                            caption = ((_g = message.image) === null || _g === void 0 ? void 0 : _g.caption) || null;
                                            mimeType = ((_h = message.image) === null || _h === void 0 ? void 0 : _h.mime_type) || null;
                                            fileName = ((_j = message.image) === null || _j === void 0 ? void 0 : _j.file_name) || null;
                                            fileSize = ((_k = message.image) === null || _k === void 0 ? void 0 : _k.file_size) ? parseInt(message.image.file_size) : null;
                                            break;
                                        case "audio":
                                            mediaId = ((_l = message.audio) === null || _l === void 0 ? void 0 : _l.id) || null;
                                            mimeType = ((_m = message.audio) === null || _m === void 0 ? void 0 : _m.mime_type) || null;
                                            fileName = ((_o = message.audio) === null || _o === void 0 ? void 0 : _o.file_name) || null;
                                            fileSize = ((_p = message.audio) === null || _p === void 0 ? void 0 : _p.file_size) ? parseInt(message.audio.file_size) : null;
                                            break;
                                        case "video":
                                            mediaId = ((_q = message.video) === null || _q === void 0 ? void 0 : _q.id) || null;
                                            caption = ((_r = message.video) === null || _r === void 0 ? void 0 : _r.caption) || null;
                                            mimeType = ((_s = message.video) === null || _s === void 0 ? void 0 : _s.mime_type) || null;
                                            fileName = ((_t = message.video) === null || _t === void 0 ? void 0 : _t.file_name) || null;
                                            fileSize = ((_u = message.video) === null || _u === void 0 ? void 0 : _u.file_size) ? parseInt(message.video.file_size) : null;
                                            break;
                                        case "document":
                                            mediaId = ((_v = message.document) === null || _v === void 0 ? void 0 : _v.id) || null;
                                            caption = ((_w = message.document) === null || _w === void 0 ? void 0 : _w.caption) || null;
                                            mimeType = ((_x = message.document) === null || _x === void 0 ? void 0 : _x.mime_type) || null;
                                            fileName = ((_y = message.document) === null || _y === void 0 ? void 0 : _y.file_name) || null;
                                            fileSize = ((_z = message.document) === null || _z === void 0 ? void 0 : _z.file_size) ? parseInt(message.document.file_size) : null;
                                            break;
                                        case "location":
                                            latitude = ((_0 = message.location) === null || _0 === void 0 ? void 0 : _0.latitude) || null;
                                            longitude = ((_1 = message.location) === null || _1 === void 0 ? void 0 : _1.longitude) || null;
                                            break;
                                        case "sticker":
                                            mediaId = ((_2 = message.sticker) === null || _2 === void 0 ? void 0 : _2.id) || null;
                                            mimeType = ((_3 = message.sticker) === null || _3 === void 0 ? void 0 : _3.mime_type) || null;
                                            fileName = ((_4 = message.sticker) === null || _4 === void 0 ? void 0 : _4.file_name) || null;
                                            fileSize = ((_5 = message.sticker) === null || _5 === void 0 ? void 0 : _5.file_size) ? parseInt(message.sticker.file_size) : null;
                                            break;
                                        case "reaction":
                                            messageText = ((_6 = message.reaction) === null || _6 === void 0 ? void 0 : _6.emoji) || null;
                                            break;
                                        case "contact":
                                            messageText = JSON.stringify(message.contacts || []);
                                            break;
                                        default:
                                            console.log("[WhatsApp] Unknown message type: ".concat(type));
                                    }
                                    return [4 /*yield*/, (0, db_messages_1.getReceivedMessageByExternalId)(messageId, "whatsapp")];
                                case 1:
                                    existing = _8.sent();
                                    if (existing) {
                                        console.log("[WhatsApp] Duplicate message ".concat(messageId, " ignored"));
                                        return [2 /*return*/, "continue"];
                                    }
                                    _8.label = 2;
                                case 2:
                                    _8.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, db.insert(schema_1.receivedMessages).values({
                                            provider: "whatsapp",
                                            externalId: messageId,
                                            fromNumber: from,
                                            fromName: fromName,
                                            messageType: [
                                                "text",
                                                "image",
                                                "audio",
                                                "video",
                                                "document",
                                                "location",
                                                "contact",
                                                "sticker",
                                                "reaction",
                                            ].includes(type)
                                                ? type
                                                : "unknown",
                                            messageText: messageText,
                                            mediaUrl: mediaUrl,
                                            mediaId: mediaId,
                                            mimeType: mimeType,
                                            caption: caption,
                                            latitude: latitude ? latitude.toString() : null,
                                            longitude: longitude ? longitude.toString() : null,
                                            timestamp: timestamp,
                                            rawPayload: JSON.stringify(message),
                                            processed: 0,
                                        }).onConflict({
                                            target: [schema_1.receivedMessages.provider, schema_1.receivedMessages.externalId],
                                        }).doNothing()];
                                case 3:
                                    _8.sent();
                                    return [3 /*break*/, 5];
                                case 4:
                                    e_1 = _8.sent();
                                    if (!e_1.message.includes('Duplicate entry') && !e_1.message.includes('already exists')) {
                                        throw e_1;
                                    }
                                    console.log("[WhatsApp] Duplicate message ".concat(messageId, " ignored (onConflict)"));
                                    return [3 /*break*/, 5];
                                case 5:
                                    isPossibleSurveyResponse = type === "text" &&
                                        messageText &&
                                        /^\s*[1-5]\s*$/.test(messageText.trim());
                                    if (!!isPossibleSurveyResponse) return [3 /*break*/, 7];
                                    // Only insert non-survey messages into conversationMessages
                                    return [4 /*yield*/, (0, db_messages_1.ingestInboundConversationMessage)({
                                            provider: "whatsapp",
                                            fromNumber: from,
                                            fromName: fromName,
                                            messageType: [
                                                "text",
                                                "image",
                                                "audio",
                                                "video",
                                                "document",
                                                "location",
                                                "contact",
                                                "sticker",
                                                "reaction",
                                            ].includes(type)
                                                ? type
                                                : "unknown",
                                            messageText: messageText,
                                            caption: caption,
                                            mediaUrl: mediaUrl,
                                            mediaId: mediaId,
                                            mimeType: mimeType,
                                            fileName: fileName,
                                            fileSize: fileSize,
                                            externalId: messageId, // Add this to trigger S3 download
                                            createdAt: new Date(),
                                        })];
                                case 6:
                                    // Only insert non-survey messages into conversationMessages
                                    _8.sent();
                                    console.log("[WhatsApp] Saved message ".concat(messageId, " from ").concat(from, " to conversation"));
                                    return [3 /*break*/, 8];
                                case 7:
                                    console.log("[WhatsApp] Message ".concat(messageId, " from ").concat(from, " appears to be a survey response, not inserting into conversation"));
                                    _8.label = 8;
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    _c = 0, messages_1 = messages;
                    _7.label = 4;
                case 4:
                    if (!(_c < messages_1.length)) return [3 /*break*/, 7];
                    message = messages_1[_c];
                    return [5 /*yield**/, _loop_1(message)];
                case 5:
                    _7.sent();
                    _7.label = 6;
                case 6:
                    _c++;
                    return [3 /*break*/, 4];
                case 7:
                    _b++;
                    return [3 /*break*/, 3];
                case 8:
                    _i++;
                    return [3 /*break*/, 2];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_6 = _7.sent();
                    console.error("[WhatsApp] Processing error:", error_6);
                    throw error_6;
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process Instagram webhook payload
 * Extracts message data and saves to database
 */
function downloadMediaToBuffer(url) {
    return __awaiter(this, void 0, void 0, function () {
        var response, arrayBuffer, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log("[downloadMediaToBuffer] Downloading:", url.substring(0, 100));
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)",
                            },
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        console.error("[downloadMediaToBuffer] HTTP error:", response.status, response.statusText);
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.arrayBuffer()];
                case 2:
                    arrayBuffer = _a.sent();
                    return [2 /*return*/, Buffer.from(arrayBuffer)];
                case 3:
                    err_1 = _a.sent();
                    console.error("[downloadMediaToBuffer] Download failed:", err_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function processInstagramWebhook(body) {
    return __awaiter(this, void 0, void 0, function () {
        var db, _i, _a, entry, messaging, _b, messaging_1, event_1, sender, recipient, timestamp, message, messageId, text, mediaUrl, mediaId, mimeType, messageType, attachment, type, payload, rawMediaUrl, mediaBuffer, uploadToR2, fileName, uploadResult, downloadErr_1, storyCaption, existing, e_2, isPossibleSurveyResponse, error_7;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 22, , 23]);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _e.sent();
                    if (!db) {
                        throw new Error("Database not available");
                    }
                    // Instagram webhook structure:
                    // body.entry[].messaging[]
                    if (!body.entry || !Array.isArray(body.entry)) {
                        console.log("[Instagram] No entries in payload");
                        return [2 /*return*/];
                    }
                    _i = 0, _a = body.entry;
                    _e.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 21];
                    entry = _a[_i];
                    messaging = entry.messaging;
                    if (!messaging || !Array.isArray(messaging))
                        return [3 /*break*/, 20];
                    _b = 0, messaging_1 = messaging;
                    _e.label = 3;
                case 3:
                    if (!(_b < messaging_1.length)) return [3 /*break*/, 20];
                    event_1 = messaging_1[_b];
                    sender = (_c = event_1.sender) === null || _c === void 0 ? void 0 : _c.id;
                    recipient = (_d = event_1.recipient) === null || _d === void 0 ? void 0 : _d.id;
                    timestamp = event_1.timestamp;
                    message = event_1.message;
                    if (!message || !sender)
                        return [3 /*break*/, 19];
                    messageId = message.mid;
                    text = message.text || null;
                    mediaUrl = null;
                    mediaId = null;
                    mimeType = null;
                    messageType = "text";
                    if (!(message.attachments && Array.isArray(message.attachments))) return [3 /*break*/, 11];
                    attachment = message.attachments[0];
                    type = attachment.type;
                    payload = attachment.payload;
                    messageType =
                        type === "image"
                            ? "image"
                            : type === "video"
                                ? "video"
                                : type === "audio"
                                    ? "audio"
                                    : type === "file"
                                        ? "document"
                                        : type === "story"
                                            ? "image"
                                            : type === "story_template"
                                                ? "image"
                                                : type === "fallback"
                                                    ? "image"
                                                    : "unknown";
                    rawMediaUrl = (payload === null || payload === void 0 ? void 0 : payload.url) || null;
                    if (!(rawMediaUrl && !cleanR2Url(rawMediaUrl))) return [3 /*break*/, 10];
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 9, , 10]);
                    return [4 /*yield*/, downloadMediaToBuffer(rawMediaUrl)];
                case 5:
                    mediaBuffer = _e.sent();
                    if (!mediaBuffer) return [3 /*break*/, 8];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./r2-client"); })];
                case 6:
                    uploadToR2 = (_e.sent()).uploadToR2;
                    fileName = rawMediaUrl.split("/").pop() || "instagram-media";
                    return [4 /*yield*/, uploadToR2(mediaBuffer, fileName, attachment.mime_type || "image/jpeg")];
                case 7:
                    uploadResult = _e.sent();
                    rawMediaUrl = uploadResult.url;
                    console.log("[Instagram] Uploaded media to R2:", rawMediaUrl);
                    _e.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    downloadErr_1 = _e.sent();
                    console.error("[Instagram] Failed to download/upload media:", downloadErr_1);
                    return [3 /*break*/, 10];
                case 10:
                    mediaUrl = cleanR2Url(rawMediaUrl) || rawMediaUrl;
                    storyCaption = attachment.caption || attachment.story_caption || null;
                    if (storyCaption) {
                        text = text || storyCaption;
                    }
                    _e.label = 11;
                case 11: return [4 /*yield*/, (0, db_messages_1.getReceivedMessageByExternalId)(messageId, "instagram")];
                case 12:
                    existing = _e.sent();
                    if (existing) {
                        console.log("[Instagram] Duplicate message ".concat(messageId, " ignored"));
                        return [3 /*break*/, 19];
                    }
                    _e.label = 13;
                case 13:
                    _e.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, db.insert(schema_1.receivedMessages).values({
                            provider: "instagram",
                            externalId: messageId,
                            fromNumber: sender,
                            fromName: null, // Instagram doesn't provide name in webhook
                            messageType: messageType,
                            messageText: text,
                            mediaUrl: mediaUrl,
                            mediaId: mediaId,
                            mimeType: mimeType,
                            caption: null,
                            latitude: null,
                            longitude: null,
                            timestamp: timestamp,
                            rawPayload: JSON.stringify(event_1),
                            processed: 0,
                        }).onConflict({
                            target: [schema_1.receivedMessages.provider, schema_1.receivedMessages.externalId],
                        }).doNothing()];
                case 14:
                    _e.sent();
                    return [3 /*break*/, 16];
                case 15:
                    e_2 = _e.sent();
                    // Se erro de duplicidade e onConflict não suportado ou falhou, ignorar silenciosamente
                    if (!e_2.message.includes('Duplicate entry') && !e_2.message.includes('already exists')) {
                        throw e_2;
                    }
                    console.log("[Instagram] Duplicate message ".concat(messageId, " ignored (onConflict)"));
                    return [3 /*break*/, 16];
                case 16:
                    isPossibleSurveyResponse = messageType === "text" && text && /^\s*[1-5]\s*$/.test(text.trim());
                    if (!!isPossibleSurveyResponse) return [3 /*break*/, 18];
                    return [4 /*yield*/, (0, db_messages_1.ingestInboundConversationMessage)({
                            provider: "instagram",
                            fromNumber: sender,
                            fromName: null,
                            messageType: messageType,
                            messageText: text,
                            caption: null,
                            mediaUrl: mediaUrl,
                            mediaId: null,
                            mimeType: mimeType,
                            externalId: messageId, // Add this to trigger S3 download
                            createdAt: new Date(),
                        })];
                case 17:
                    _e.sent();
                    console.log("[Instagram] Saved message ".concat(messageId, " from ").concat(sender, " to conversation"));
                    return [3 /*break*/, 19];
                case 18:
                    console.log("[Instagram] Message ".concat(messageId, " from ").concat(sender, " appears to be a survey response, not inserting into conversation"));
                    _e.label = 19;
                case 19:
                    _b++;
                    return [3 /*break*/, 3];
                case 20:
                    _i++;
                    return [3 /*break*/, 2];
                case 21: return [3 /*break*/, 23];
                case 22:
                    error_7 = _e.sent();
                    console.error("[Instagram] Processing error:", error_7);
                    throw error_7;
                case 23: return [2 /*return*/];
            }
        });
    });
}
function extractEvolutionMessage(body) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    var payload = (body === null || body === void 0 ? void 0 : body.data) || (body === null || body === void 0 ? void 0 : body.payload) || body;
    var messageEntry = (payload === null || payload === void 0 ? void 0 : payload.message) ||
        ((_a = payload === null || payload === void 0 ? void 0 : payload.messages) === null || _a === void 0 ? void 0 : _a[0]) ||
        ((_c = (_b = payload === null || payload === void 0 ? void 0 : payload.messages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) ||
        ((_e = (_d = payload === null || payload === void 0 ? void 0 : payload.data) === null || _d === void 0 ? void 0 : _d.messages) === null || _e === void 0 ? void 0 : _e[0]) ||
        ((_f = payload === null || payload === void 0 ? void 0 : payload.data) === null || _f === void 0 ? void 0 : _f.message) ||
        (payload === null || payload === void 0 ? void 0 : payload.message) ||
        (body === null || body === void 0 ? void 0 : body.message);
    var key = (payload === null || payload === void 0 ? void 0 : payload.key) ||
        ((_g = payload === null || payload === void 0 ? void 0 : payload.data) === null || _g === void 0 ? void 0 : _g.key) ||
        ((_h = payload === null || payload === void 0 ? void 0 : payload.message) === null || _h === void 0 ? void 0 : _h.key) ||
        (messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.key) ||
        ((_j = messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.message) === null || _j === void 0 ? void 0 : _j.key);
    var fromMe = (_m = (_k = key === null || key === void 0 ? void 0 : key.fromMe) !== null && _k !== void 0 ? _k : (_l = messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.key) === null || _l === void 0 ? void 0 : _l.fromMe) !== null && _m !== void 0 ? _m : payload === null || payload === void 0 ? void 0 : payload.fromMe;
    var remoteJid = (key === null || key === void 0 ? void 0 : key.remoteJid) ||
        ((_o = messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.key) === null || _o === void 0 ? void 0 : _o.remoteJid) ||
        (payload === null || payload === void 0 ? void 0 : payload.remoteJid) ||
        (payload === null || payload === void 0 ? void 0 : payload.from);
    var pushName = (payload === null || payload === void 0 ? void 0 : payload.pushName) ||
        (payload === null || payload === void 0 ? void 0 : payload.senderName) ||
        ((_p = payload === null || payload === void 0 ? void 0 : payload.contact) === null || _p === void 0 ? void 0 : _p.name) ||
        (messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.pushName);
    var message = (messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.message) || messageEntry;
    return {
        message: message,
        remoteJid: remoteJid,
        pushName: pushName,
        fromMe: fromMe,
        messageId: (key === null || key === void 0 ? void 0 : key.id) || (payload === null || payload === void 0 ? void 0 : payload.id) || (messageEntry === null || messageEntry === void 0 ? void 0 : messageEntry.id),
    };
}
function parseEvolutionMessageContent(message, rawMessageType, contextInfoFromData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
    if (!message)
        return {
            type: "unknown",
            text: null,
            caption: null,
            mediaUrl: null,
            mimeType: null,
            fileName: null,
            fileSize: null,
        };
    // ===========================================
    // 🎯 DESEMPACOTAMENTO DE VIEW ONCE E OUTROS WRAPPERS
    // O WhatsApp (Baileys) encapsula mídias em viewOnceMessage, viewOnceMessageV2, etc.
    // Precisamos extrair a mensagem real desses wrappers
    // ===========================================
    var actualMessage = ((_a = message.viewOnceMessage) === null || _a === void 0 ? void 0 : _a.message) ||
        ((_b = message.viewOnceMessageV2) === null || _b === void 0 ? void 0 : _b.message) ||
        ((_c = message.viewOnceMessageV2Extension) === null || _c === void 0 ? void 0 : _c.message) ||
        ((_d = message.documentWithCaptionMessage) === null || _d === void 0 ? void 0 : _d.message) ||
        message;
    // ===========================================
    // 🎯 PRIORIDADE 1: Usar messageType da Evolution API
    // A Evolution envia o tipo exato em payload.data.messageType
    // ===========================================
    var typeToSave = 'text';
    if (rawMessageType) {
        if (rawMessageType === 'imageMessage')
            typeToSave = 'image';
        else if (rawMessageType === 'audioMessage')
            typeToSave = 'audio';
        else if (rawMessageType === 'videoMessage')
            typeToSave = 'video';
        else if (rawMessageType === 'documentMessage')
            typeToSave = 'document';
        else if (rawMessageType === 'conversation')
            typeToSave = 'text';
        else if (rawMessageType === 'stickerMessage')
            typeToSave = 'sticker';
        else if (rawMessageType === 'locationMessage')
            typeToSave = 'location';
        else if (rawMessageType === 'contactMessage')
            typeToSave = 'contact';
        else if (rawMessageType === 'reactionMessage')
            typeToSave = 'reaction';
    }
    // ===========================================
    // 🎯 PRIORIDADE 2: Extrair mimetype específico baseado no tipo
    // ===========================================
    var mimeType = null;
    // Primeiro: tentar mimetype do tipo específico (documentMessage, imageMessage, etc)
    if (typeToSave === 'image' && ((_e = actualMessage.imageMessage) === null || _e === void 0 ? void 0 : _e.mimetype)) {
        mimeType = actualMessage.imageMessage.mimetype || actualMessage.imageMessage.mimeType || null;
    }
    else if (typeToSave === 'video' && ((_f = actualMessage.videoMessage) === null || _f === void 0 ? void 0 : _f.mimetype)) {
        mimeType = actualMessage.videoMessage.mimetype || actualMessage.videoMessage.mimeType || null;
    }
    else if (typeToSave === 'audio' && ((_g = actualMessage.audioMessage) === null || _g === void 0 ? void 0 : _g.mimetype)) {
        mimeType = actualMessage.audioMessage.mimetype || actualMessage.audioMessage.mimeType || null;
    }
    else if (typeToSave === 'document' && ((_h = actualMessage.documentMessage) === null || _h === void 0 ? void 0 : _h.mimetype)) {
        mimeType = actualMessage.documentMessage.mimetype || actualMessage.documentMessage.mimeType || null;
    }
    else if (typeToSave === 'sticker' && ((_j = actualMessage.stickerMessage) === null || _j === void 0 ? void 0 : _j.mimetype)) {
        mimeType = actualMessage.stickerMessage.mimetype || actualMessage.stickerMessage.mimeType || null;
    }
    // Fallback 1: mimetype genérico na mensagem
    if (!mimeType) {
        mimeType = message.mimetype || message.mimeType || message.fileMimeType || null;
    }
    // ===========================================
    // 🎯 PRIORIDADE 2.5: Extrair fileName específico por tipo
    // ===========================================
    var fileName = null;
    // Priorizar fileName do tipo específico (documentMessage, imageMessage, etc)
    if (typeToSave === 'image' && ((_k = actualMessage.imageMessage) === null || _k === void 0 ? void 0 : _k.fileName)) {
        fileName = actualMessage.imageMessage.fileName;
    }
    else if (typeToSave === 'video' && ((_l = actualMessage.videoMessage) === null || _l === void 0 ? void 0 : _l.fileName)) {
        fileName = actualMessage.videoMessage.fileName;
    }
    else if (typeToSave === 'audio' && ((_m = actualMessage.audioMessage) === null || _m === void 0 ? void 0 : _m.fileName)) {
        fileName = actualMessage.audioMessage.fileName;
    }
    else if (typeToSave === 'document' && actualMessage.documentMessage) {
        // Documentos: fileName ou title (title é fallback comum)
        fileName = actualMessage.documentMessage.fileName || actualMessage.documentMessage.title || null;
    }
    else if (typeToSave === 'sticker' && ((_o = actualMessage.stickerMessage) === null || _o === void 0 ? void 0 : _o.fileName)) {
        fileName = actualMessage.stickerMessage.fileName;
    }
    // Fallback: usar message.fileName genérico
    if (!fileName) {
        fileName = message.fileName || null;
    }
    // Se ainda não temos fileName mas temos tipo, gerar nome padrão
    if (!fileName) {
        var typeNames = {
            image: 'imagem',
            video: 'video',
            audio: 'audio',
            document: 'documento',
            sticker: 'sticker',
            location: 'localizacao',
            contact: 'contato',
            reaction: 'reacao'
        };
        fileName = "".concat(typeNames[typeToSave] || 'arquivo', "_").concat(Date.now());
    }
    if (!mimeType && fileName) {
        var ext = (_p = fileName.split('.').pop()) === null || _p === void 0 ? void 0 : _p.toLowerCase();
        var mimeMap = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
            mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
            mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
            pdf: 'application/pdf', doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        mimeType = mimeMap[ext || ''] || null;
    }
    // 🎯 BLINDAGEM PARA DOCUMENTOS ENCAPSULADOS (documentWithCaptionMessage)
    // O WhatsApp às vezes envia documentos com legenda dentro de documentWithCaptionMessage
    // Nesse caso, o documentMessage original fica aninhado: documentWithCaptionMessage.actualMessage.documentMessage
    // Precisamos re-extrair fileName e mimeType diretamente do documento real
    var docWrapper = message.documentWithCaptionMessage;
    if ((_q = docWrapper === null || docWrapper === void 0 ? void 0 : docWrapper.message) === null || _q === void 0 ? void 0 : _q.documentMessage) {
        var realDoc = docWrapper.actualMessage.documentMessage;
        // Sobrescrever fileName e mimeType com os valores reais do documento
        if (realDoc.fileName)
            fileName = realDoc.fileName;
        else if (realDoc.title)
            fileName = realDoc.title;
        // Se o mimeType não foi capturado ou é genérico, tentar do documento real
        if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = realDoc.mimetype || realDoc.mimeType || null;
        }
        console.log("[Blindagem] documentWithCaptionMessage detectado. fileName extraído:", fileName, "mimeType:", mimeType);
    }
    // ===========================================
    // 🎯 PRIORIDADE 3: Extrair URL (sempre usar message.mediaUrl primeiro)
    // ===========================================
    // 🎯 PRIORIDADE 3: Extrair URL (sempre usar message.mediaUrl primeiro)
    // ===========================================
    var rawUrl = null;
    // Primeiro: message.mediaUrl (URL do R2/Cloudflare) - MAIS IMPORTANTE
    if (message.mediaUrl) {
        rawUrl = message.mediaUrl;
    }
    else if (typeToSave === 'image' && actualMessage.imageMessage) {
        rawUrl = actualMessage.imageMessage.url || actualMessage.imageMessage.mediaUrl || null;
    }
    else if (typeToSave === 'video' && actualMessage.videoMessage) {
        rawUrl = actualMessage.videoMessage.url || actualMessage.videoMessage.mediaUrl || null;
    }
    else if (typeToSave === 'audio' && actualMessage.audioMessage) {
        rawUrl = actualMessage.audioMessage.url || actualMessage.audioMessage.mediaUrl || null;
    }
    else if (typeToSave === 'document' && actualMessage.documentMessage) {
        rawUrl = actualMessage.documentMessage.url || actualMessage.documentMessage.mediaUrl || null;
    }
    else if (typeToSave === 'sticker' && actualMessage.stickerMessage) {
        rawUrl = actualMessage.stickerMessage.url || actualMessage.stickerMessage.mediaUrl || null;
    }
    // Limpar URL do R2 para obter apenas o caminho relativo
    var mediaUrl = rawUrl ? cleanR2Url(rawUrl) : null;
    // Se não é R2, retornar rawUrl para download posterior
    var needsDownload = rawUrl && !mediaUrl;
    // ===========================================
    // 🎯 Texto e Caption
    // ===========================================
    var text = null;
    var caption = null;
    if (typeToSave === 'text' || typeToSave === 'unknown') {
        // ===========================================
        // 🎯 FileSize declaration (moved up for story reply)
        // ===========================================
        var fileSize = null;
        text = message.conversation || ((_r = message.extendedTextMessage) === null || _r === void 0 ? void 0 : _r.text) || null;
        // 🎯 STORY REPLY: Check for media in quotedMessage (respostas a stories)
        var quotedMessage = ((_t = (_s = message.extendedTextMessage) === null || _s === void 0 ? void 0 : _s.contextInfo) === null || _t === void 0 ? void 0 : _t.quotedMessage) || (contextInfoFromData === null || contextInfoFromData === void 0 ? void 0 : contextInfoFromData.quotedMessage);
        if (quotedMessage) {
            console.log("[Parse] Detected quotedMessage in extendedTextMessage (story reply)");
            // Detect media type from quoted message
            if (quotedMessage.imageMessage) {
                typeToSave = 'image';
                rawUrl = quotedMessage.imageMessage.url || quotedMessage.imageMessage.mediaUrl || null;
                mimeType = quotedMessage.imageMessage.mimetype || quotedMessage.imageMessage.mimeType || null;
                fileName = quotedMessage.imageMessage.fileName || null;
                fileSize = quotedMessage.imageMessage.fileSize || null;
                caption = quotedMessage.imageMessage.caption || null;
                console.log("[Parse] Story reply with imageMessage detected");
            }
            else if (quotedMessage.videoMessage) {
                typeToSave = 'video';
                rawUrl = quotedMessage.videoMessage.url || quotedMessage.videoMessage.mediaUrl || null;
                mimeType = quotedMessage.videoMessage.mimetype || quotedMessage.videoMessage.mimeType || null;
                fileName = quotedMessage.videoMessage.fileName || null;
                fileSize = quotedMessage.videoMessage.fileSize || null;
                caption = quotedMessage.videoMessage.caption || null;
                console.log("[Parse] Story reply with videoMessage detected");
            }
            else if (quotedMessage.stickerMessage) {
                typeToSave = 'sticker';
                rawUrl = quotedMessage.stickerMessage.url || quotedMessage.stickerMessage.mediaUrl || null;
                mimeType = quotedMessage.stickerMessage.mimetype || quotedMessage.stickerMessage.mimeType || null;
                fileName = quotedMessage.stickerMessage.fileName || null;
                fileSize = quotedMessage.stickerMessage.fileSize || null;
                console.log("[Parse] Story reply with stickerMessage detected");
            }
            else if (quotedMessage.audioMessage) {
                typeToSave = 'audio';
                rawUrl = quotedMessage.audioMessage.url || quotedMessage.audioMessage.mediaUrl || null;
                mimeType = quotedMessage.audioMessage.mimetype || quotedMessage.audioMessage.mimeType || null;
                fileName = quotedMessage.audioMessage.fileName || null;
                fileSize = quotedMessage.audioMessage.fileSize || null;
                caption = quotedMessage.audioMessage.caption || null;
                console.log("[Parse] Story reply with audioMessage detected");
            }
            else if (quotedMessage.documentMessage) {
                typeToSave = 'document';
                rawUrl = quotedMessage.documentMessage.url || quotedMessage.documentMessage.mediaUrl || null;
                mimeType = quotedMessage.documentMessage.mimetype || quotedMessage.documentMessage.mimeType || null;
                fileName = quotedMessage.documentMessage.fileName || quotedMessage.documentMessage.title || null;
                fileSize = quotedMessage.documentMessage.fileSize || null;
                caption = quotedMessage.documentMessage.caption || null;
                console.log("[Parse] Story reply with documentMessage detected");
            }
        }
    }
    else {
        caption = message.caption ||
            ((_u = actualMessage.imageMessage) === null || _u === void 0 ? void 0 : _u.caption) ||
            ((_v = actualMessage.videoMessage) === null || _v === void 0 ? void 0 : _v.caption) ||
            ((_w = actualMessage.documentMessage) === null || _w === void 0 ? void 0 : _w.caption) || null;
    }
    // ===========================================
    // 🎯 TRATAMENTO DE LOCALIZAÇÃO (Transforma em Link)
    // ===========================================
    var locationMsg = (actualMessage === null || actualMessage === void 0 ? void 0 : actualMessage.locationMessage) || (actualMessage === null || actualMessage === void 0 ? void 0 : actualMessage.liveLocationMessage);
    if (locationMsg) {
        var lat = locationMsg.degreesLatitude || locationMsg.latitude;
        var lng = locationMsg.degreesLongitude || locationMsg.longitude;
        if (lat && lng) {
            var mapsUrl = "https://maps.google.com/?q=".concat(lat, ",").concat(lng);
            var locationText = "\uD83D\uDCCD *Localiza\u00E7\u00E3o Recebida:*\n".concat(mapsUrl);
            if (locationMsg.name)
                locationText += "\nLocal: ".concat(locationMsg.name);
            if (locationMsg.address)
                locationText += "\nEndere\u00E7o: ".concat(locationMsg.address);
            text = locationText;
        }
    }
    // ===========================================
    // 🎯 FileSize (tentar de qualquer fonte)
    // ===========================================
    // Base64 (apenas para imagens, se fornecido)
    var base64 = typeToSave === 'image' ? ((_x = actualMessage.imageMessage) === null || _x === void 0 ? void 0 : _x.base64) || null : null;
    var mediaKey = (typeToSave === 'image' && ((_y = actualMessage.imageMessage) === null || _y === void 0 ? void 0 : _y.mediaKey)) ||
        (typeToSave === 'video' && ((_z = actualMessage.videoMessage) === null || _z === void 0 ? void 0 : _z.mediaKey)) ||
        (typeToSave === 'audio' && ((_0 = actualMessage.audioMessage) === null || _0 === void 0 ? void 0 : _0.mediaKey)) ||
        (typeToSave === 'document' && ((_1 = actualMessage.documentMessage) === null || _1 === void 0 ? void 0 : _1.mediaKey)) ||
        null;
    var directPath = (typeToSave === 'image' && ((_2 = actualMessage.imageMessage) === null || _2 === void 0 ? void 0 : _2.directPath)) ||
        (typeToSave === 'video' && ((_3 = actualMessage.videoMessage) === null || _3 === void 0 ? void 0 : _3.directPath)) ||
        (typeToSave === 'audio' && ((_4 = actualMessage.audioMessage) === null || _4 === void 0 ? void 0 : _4.directPath)) ||
        (typeToSave === 'document' && ((_5 = actualMessage.documentMessage) === null || _5 === void 0 ? void 0 : _5.directPath)) ||
        null;
    return __assign(__assign(__assign({ type: typeToSave, text: text, caption: caption, mediaUrl: mediaUrl, rawUrl: rawUrl, needsDownload: needsDownload, mimeType: mimeType, fileName: fileName, fileSize: fileSize }, (base64 && { base64: base64 })), (mediaKey && { mediaKey: mediaKey })), (directPath && { directPath: directPath }));
}
function processEvolutionWebhook(body) {
    return __awaiter(this, void 0, void 0, function () {
        var db, eventName, normalizedEvent, remoteJid, fromNumber, pushName, data, messageData, key, messageContent, messageId, remoteJid, pushName, fromMe, messageTimestamp, rawMessageType, fromNumber, parsed, messageType, messageText, caption, mediaUrl, mimeType, mediaBuffer, isWhatsAppCdn, downloadWhatsAppMediaFromEvolution, messageKey, uploadToR2, fileName, uploadResult, downloadErr_2, mediaKey, directPath, imageBase64, isSentByMe, messageContext, messageStatus, existing, messageValues, isPossibleSurveyResponse, msgError_1, status_1, payload, profileName, profilePicture, error_8;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return __generator(this, function (_s) {
            switch (_s.label) {
                case 0:
                    _s.trys.push([0, 27, , 28]);
                    console.log("4. [Evolution] 🚀 Iniciando processEvolutionWebhook");
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _s.sent();
                    if (!db) {
                        throw new Error("Database not available");
                    }
                    eventName = (body === null || body === void 0 ? void 0 : body.event) || ((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.event) || "";
                    if (!eventName && (body === null || body === void 0 ? void 0 : body.key))
                        eventName = "messages.upsert";
                    else if (!eventName && (body === null || body === void 0 ? void 0 : body.remoteJid))
                        eventName = "messages.upsert";
                    if (!eventName)
                        return [2 /*return*/];
                    normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");
                    if (!(normalizedEvent.includes("contact") || normalizedEvent === "contacts_update")) return [3 /*break*/, 3];
                    remoteJid = ((_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.remoteJid) || (body === null || body === void 0 ? void 0 : body.remoteJid) || extractEvolutionRemoteJid(body);
                    if (!remoteJid && Array.isArray(body))
                        remoteJid = (_c = body[0]) === null || _c === void 0 ? void 0 : _c.remoteJid;
                    fromNumber = normalizeInboundNumber(remoteJid);
                    if (!fromNumber)
                        return [2 /*return*/];
                    pushName = ((_d = body === null || body === void 0 ? void 0 : body.data) === null || _d === void 0 ? void 0 : _d.profileName) || (body === null || body === void 0 ? void 0 : body.profileName) || ((_e = body === null || body === void 0 ? void 0 : body.data) === null || _e === void 0 ? void 0 : _e.name) || (body === null || body === void 0 ? void 0 : body.name) || null;
                    return [4 /*yield*/, (0, db_messages_1.findOrCreateCustomerByPhone)(fromNumber, pushName)];
                case 2:
                    _s.sent();
                    return [2 /*return*/];
                case 3:
                    if (!(normalizedEvent === "messages_upsert" || normalizedEvent === "messages.upsert")) return [3 /*break*/, 26];
                    _s.label = 4;
                case 4:
                    _s.trys.push([4, 24, , 25]);
                    data = (body === null || body === void 0 ? void 0 : body.data) || body;
                    messageData = (data === null || data === void 0 ? void 0 : data.message) || ((_f = data === null || data === void 0 ? void 0 : data.messages) === null || _f === void 0 ? void 0 : _f[0]) || body || {};
                    key = (data === null || data === void 0 ? void 0 : data.key) || (messageData === null || messageData === void 0 ? void 0 : messageData.key) || {};
                    messageContent = (messageData === null || messageData === void 0 ? void 0 : messageData.message) || messageData;
                    messageId = (key === null || key === void 0 ? void 0 : key.id) || (data === null || data === void 0 ? void 0 : data.id) || (messageData === null || messageData === void 0 ? void 0 : messageData.id);
                    if (!messageId) {
                        messageId = "evo-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                        console.warn("[Evolution Webhook] ⚠️ Message ID missing, using generated fallback:", messageId);
                    }
                    remoteJid = (key === null || key === void 0 ? void 0 : key.remoteJid) || (data === null || data === void 0 ? void 0 : data.remoteJid) || (messageData === null || messageData === void 0 ? void 0 : messageData.remoteJid) || (body === null || body === void 0 ? void 0 : body.remoteJid) || extractEvolutionRemoteJid(body);
                    pushName = (data === null || data === void 0 ? void 0 : data.pushName) || (data === null || data === void 0 ? void 0 : data.senderName) || (messageData === null || messageData === void 0 ? void 0 : messageData.pushName) || (body === null || body === void 0 ? void 0 : body.pushName) || ((_g = body === null || body === void 0 ? void 0 : body.sender) === null || _g === void 0 ? void 0 : _g.name) || ((_h = body === null || body === void 0 ? void 0 : body.sender) === null || _h === void 0 ? void 0 : _h.pushName) || ((_k = (_j = body === null || body === void 0 ? void 0 : body.data) === null || _j === void 0 ? void 0 : _j.sender) === null || _k === void 0 ? void 0 : _k.name);
                    fromMe = (_o = (_m = (_l = key === null || key === void 0 ? void 0 : key.fromMe) !== null && _l !== void 0 ? _l : data === null || data === void 0 ? void 0 : data.fromMe) !== null && _m !== void 0 ? _m : messageData === null || messageData === void 0 ? void 0 : messageData.fromMe) !== null && _o !== void 0 ? _o : body === null || body === void 0 ? void 0 : body.fromMe;
                    messageTimestamp = (data === null || data === void 0 ? void 0 : data.messageTimestamp) || (messageData === null || messageData === void 0 ? void 0 : messageData.timestamp) || (messageContent === null || messageContent === void 0 ? void 0 : messageContent.timestamp) || Math.floor(Date.now() / 1000);
                    rawMessageType = (data === null || data === void 0 ? void 0 : data.messageType) || null;
                    // Se não tem remoteJid, não dá pra processar
                    if (!remoteJid) {
                        console.log("[Evolution Webhook] Missing remoteJid, skipping");
                        return [2 /*return*/];
                    }
                    fromNumber = normalizeInboundNumber(remoteJid);
                    if (!fromNumber)
                        return [2 /*return*/];
                    parsed = parseEvolutionMessageContent(messageContent, rawMessageType, data === null || data === void 0 ? void 0 : data.contextInfo);
                    messageType = parsed.type;
                    messageText = parsed.text;
                    caption = parsed.caption;
                    mediaUrl = parsed.mediaUrl;
                    mimeType = parsed.mimeType;
                    if (!(parsed.needsDownload && parsed.rawUrl)) return [3 /*break*/, 15];
                    _s.label = 5;
                case 5:
                    _s.trys.push([5, 14, , 15]);
                    mediaBuffer = null;
                    isWhatsAppCdn = parsed.rawUrl.includes("mmg.whatsapp.net") || parsed.rawUrl.includes("pps.whatsapp.net") || parsed.rawUrl.includes("whatsapp.net") || parsed.rawUrl.includes("whatsapp.com");
                    if (!isWhatsAppCdn) return [3 /*break*/, 8];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./services/evolution-download"); })];
                case 6:
                    downloadWhatsAppMediaFromEvolution = (_s.sent()).downloadWhatsAppMediaFromEvolution;
                    messageKey = messageId;
                    return [4 /*yield*/, downloadWhatsAppMediaFromEvolution(messageKey)];
                case 7:
                    mediaBuffer = _s.sent();
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, downloadMediaToBuffer(parsed.rawUrl)];
                case 9:
                    // Standard download for other URLs
                    mediaBuffer = _s.sent();
                    _s.label = 10;
                case 10:
                    if (!mediaBuffer) return [3 /*break*/, 13];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./r2-client"); })];
                case 11:
                    uploadToR2 = (_s.sent()).uploadToR2;
                    fileName = parsed.fileName || parsed.rawUrl.split("/").pop() || "whatsapp-media";
                    return [4 /*yield*/, uploadToR2(mediaBuffer, fileName, parsed.mimeType || "image/jpeg")];
                case 12:
                    uploadResult = _s.sent();
                    mediaUrl = cleanR2Url(uploadResult.url);
                    console.log("[Evolution] Downloaded WhatsApp CDN media to R2:", mediaUrl);
                    _s.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    downloadErr_2 = _s.sent();
                    console.error("[Evolution] Failed to download WhatsApp CDN media:", downloadErr_2);
                    return [3 /*break*/, 15];
                case 15:
                    mediaKey = parsed.mediaKey;
                    directPath = parsed.directPath;
                    imageBase64 = parsed.base64;
                    isSentByMe = fromMe === true || fromMe === "true" || fromMe === 1;
                    console.log("5. [Evolution] fromMe check:", { isSentByMe: isSentByMe, fromMe: fromMe, fromNumber: fromNumber, messageType: messageType });
                    if (!isSentByMe) {
                        console.log("[Evolution Webhook] Received inbound message from:", fromNumber, "type:", messageType);
                    }
                    if (isSentByMe) {
                        console.log("[Evolution Webhook] Detected fromMe message, enqueuing:", messageId, "to:", fromNumber);
                        // Se for mensagem enviada pelo agente via celular, enfileirar para processamento assíncrono
                        // Enfileirar job em background (fire and forget)
                        try {
                            (0, mobile_sync_1.enqueueMobileSyncJob)({
                                remoteJid: remoteJid,
                                messageId: messageId,
                                messageText: messageText,
                                caption: caption,
                                messageType: messageType,
                                mediaUrl: mediaUrl,
                                mimeType: mimeType,
                                messageTimestamp: messageTimestamp,
                            });
                        }
                        catch (e) {
                            // Erro ao enfileirar (raro), ignora silenciosamente
                        }
                        return [2 /*return*/];
                    }
                    messageContext = (data === null || data === void 0 ? void 0 : data.messageContext) || (data === null || data === void 0 ? void 0 : data.context) || {};
                    messageStatus = (messageContext === null || messageContext === void 0 ? void 0 : messageContext.status) || (data === null || data === void 0 ? void 0 : data.status) || "notify";
                    console.log("[Evolution Webhook] 📊 Message status check:", {
                        messageStatus: messageStatus,
                        messageType: messageType,
                        fromNumber: fromNumber,
                        fromMe: isSentByMe,
                    });
                    console.log("6. [Evolution] 📊 Message status check:", { messageStatus: messageStatus, messageType: messageType, fromNumber: fromNumber });
                    // Removido filtro por messageStatus - processar todas as mensagens
                    console.log("[Evolution Webhook] ✅ Message approved, proceeding to ingest");
                    console.log("7. [Evolution] ✅ Processando mensagem (sem filtro de status)");
                    return [4 /*yield*/, (0, db_messages_1.getReceivedMessageByExternalId)(messageId, "whatsapp")];
                case 16:
                    existing = _s.sent();
                    messageValues = {
                        provider: "whatsapp",
                        externalId: messageId,
                        fromNumber: fromNumber,
                        fromName: pushName || null,
                        messageType: messageType,
                        messageText: messageText,
                        mediaUrl: mediaUrl || null,
                        mimeType: mimeType || null,
                        caption: caption,
                        latitude: null,
                        longitude: null,
                        timestamp: messageTimestamp,
                        rawPayload: JSON.stringify(__assign(__assign({}, body), { mediaDownloaded: !!mediaUrl })),
                        processed: 0,
                        customerId: (existing === null || existing === void 0 ? void 0 : existing.customerId) || null, // Manter customerId se já existir
                    };
                    if (!existing) return [3 /*break*/, 18];
                    // Atualizar apenas campos que podem mudar (nome, foto, etc.)
                    return [4 /*yield*/, db
                            .update(schema_1.receivedMessages)
                            .set({
                            fromName: pushName || null,
                            messageText: messageText || existing.messageText,
                            mediaUrl: mediaUrl || existing.mediaUrl,
                            mimeType: mimeType || existing.mimeType,
                            caption: caption || existing.caption,
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.receivedMessages.id, existing.id))];
                case 17:
                    // Atualizar apenas campos que podem mudar (nome, foto, etc.)
                    _s.sent();
                    console.log("[Evolution Webhook] Updated existing message ".concat(messageId));
                    return [3 /*break*/, 20];
                case 18: 
                // Inserir novo
                return [4 /*yield*/, db.insert(schema_1.receivedMessages).values(messageValues)];
                case 19:
                    // Inserir novo
                    _s.sent();
                    console.log("[Evolution Webhook] Inserted new message ".concat(messageId));
                    _s.label = 20;
                case 20:
                    isPossibleSurveyResponse = messageType === "text" && messageText && /^\s*[1-5]\s*$/.test(messageText.trim());
                    if (!!isPossibleSurveyResponse) return [3 /*break*/, 22];
                    console.log("8. [Evolution] 🎯 Chamando ingestInboundConversationMessage para", { fromNumber: fromNumber, messageType: messageType });
                    return [4 /*yield*/, (0, db_messages_1.ingestInboundConversationMessage)({
                            provider: "whatsapp",
                            fromNumber: fromNumber,
                            fromName: pushName || null,
                            messageType: messageType,
                            messageText: messageText,
                            caption: caption,
                            mediaUrl: mediaUrl || null,
                            mediaId: parsed.mediaId || null,
                            mimeType: mimeType,
                            fileName: parsed.fileName,
                            fileSize: parsed.fileSize,
                            externalId: messageId,
                        })];
                case 21:
                    _s.sent();
                    console.log("9. [Evolution] ✅ ingestInboundConversationMessage concluído");
                    return [3 /*break*/, 23];
                case 22:
                    console.log("[Evolution] Pulando ingest (survey response)");
                    _s.label = 23;
                case 23: return [3 /*break*/, 25];
                case 24:
                    msgError_1 = _s.sent();
                    console.error("[Evolution Webhook] ❌ Error in message processing:", msgError_1);
                    console.error("[Evolution Webhook] Stack:", msgError_1 instanceof Error ? msgError_1.stack : "N/A");
                    return [3 /*break*/, 25];
                case 25: return [2 /*return*/];
                case 26:
                    // Eventos de presença - não precisamos processar
                    if (normalizedEvent.includes("presence") ||
                        normalizedEvent === "status_update") {
                        console.log("[Evolution Webhook] Presence event ignored:", normalizedEvent);
                        return [2 /*return*/];
                    }
                    // Messages update - status updates like READ, DELIVERY_ACK - ignore
                    if (normalizedEvent === "messages_update" ||
                        normalizedEvent === "messages.update") {
                        status_1 = ((_p = body === null || body === void 0 ? void 0 : body.data) === null || _p === void 0 ? void 0 : _p.status) || (body === null || body === void 0 ? void 0 : body.status);
                        console.log("[Evolution Webhook] Message status update ignored:", status_1);
                        return [2 /*return*/];
                    }
                    // Chats update - pode ser útil para atualizar status
                    if (normalizedEvent === "chats_update") {
                        console.log("[Evolution Webhook] Chats update event received");
                        return [2 /*return*/];
                    }
                    // Connection update - quando a conexão é estabelecida
                    if (normalizedEvent === "connection_update") {
                        console.log("[Evolution Webhook] Connection update event received");
                        payload = (body === null || body === void 0 ? void 0 : body.data) || body;
                        profileName = (payload === null || payload === void 0 ? void 0 : payload.profileName) || ((_q = payload === null || payload === void 0 ? void 0 : payload.profile) === null || _q === void 0 ? void 0 : _q.name) || null;
                        profilePicture = (payload === null || payload === void 0 ? void 0 : payload.profilePictureUrl) || ((_r = payload === null || payload === void 0 ? void 0 : payload.profile) === null || _r === void 0 ? void 0 : _r.picture) || null;
                        console.log("[Evolution Webhook] Connection established:", {
                            profileName: profileName,
                            profilePicture: profilePicture,
                        });
                        return [2 /*return*/];
                    }
                    console.log("[Evolution Webhook] Unhandled event type:", eventName);
                    return [3 /*break*/, 28];
                case 27:
                    error_8 = _s.sent();
                    console.error("[Evolution Webhook] Error processing webhook:", error_8);
                    console.error("[Evolution Webhook] Stack:", error_8 instanceof Error ? error_8.stack : "");
                    throw error_8;
                case 28: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validate WhatsApp webhook signature using HMAC SHA256
 */
function validateWhatsAppSignature(rawBody, signature) {
    return __awaiter(this, void 0, void 0, function () {
        var db, config, configData, appSecret, payloadBuffer, expectedSignature, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "whatsapp_business"))
                            .limit(1)];
                case 2:
                    config = _a.sent();
                    if (config.length === 0) {
                        console.log("[WhatsApp Webhook] No configuration found, skipping signature validation");
                        return [2 /*return*/, true];
                    }
                    configData = typeof config[0].config === "string"
                        ? JSON.parse(config[0].config)
                        : config[0].config;
                    appSecret = configData.appSecret;
                    if (!appSecret) {
                        if (isProduction) {
                            console.log("[WhatsApp Webhook] No app secret configured in production");
                            return [2 /*return*/, false];
                        }
                        console.log("[WhatsApp Webhook] No app secret configured, skipping signature validation");
                        return [2 /*return*/, true];
                    }
                    if (!rawBody) {
                        console.log("[WhatsApp Webhook] Missing raw body for signature validation");
                        return [2 /*return*/, false];
                    }
                    payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
                    expectedSignature = "sha256=" +
                        crypto_1.default
                            .createHmac("sha256", appSecret)
                            .update(payloadBuffer)
                            .digest("hex");
                    if (signature.length !== expectedSignature.length) {
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/, crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))];
                case 3:
                    error_9 = _a.sent();
                    console.error("[WhatsApp Webhook] Signature validation error:", error_9);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validate Instagram webhook signature using HMAC SHA256
 */
function validateInstagramSignature(rawBody, signature) {
    return __awaiter(this, void 0, void 0, function () {
        var db, config, configData, appSecret, payloadBuffer, expectedSignature, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, "instagram_graph"))
                            .limit(1)];
                case 2:
                    config = _a.sent();
                    if (config.length === 0) {
                        console.log("[Instagram Webhook] No configuration found, skipping signature validation");
                        return [2 /*return*/, true];
                    }
                    configData = typeof config[0].config === "string"
                        ? JSON.parse(config[0].config)
                        : config[0].config;
                    appSecret = configData.appSecret;
                    if (!appSecret) {
                        if (isProduction) {
                            console.log("[Instagram Webhook] No app secret configured in production");
                            return [2 /*return*/, false];
                        }
                        console.log("[Instagram Webhook] No app secret configured, skipping signature validation");
                        return [2 /*return*/, true];
                    }
                    if (!rawBody) {
                        console.log("[Instagram Webhook] Missing raw body for signature validation");
                        return [2 /*return*/, false];
                    }
                    payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
                    expectedSignature = "sha256=" +
                        crypto_1.default
                            .createHmac("sha256", appSecret)
                            .update(payloadBuffer)
                            .digest("hex");
                    if (signature.length !== expectedSignature.length) {
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/, crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))];
                case 3:
                    error_10 = _a.sent();
                    console.error("[Instagram Webhook] Signature validation error:", error_10);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.default = router;
// Force rebuild Mon Mar  2 15:42:15 -03 2026
