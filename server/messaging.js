"use strict";
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
exports.fetchEvolutionProfile = fetchEvolutionProfile;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.sendWhatsAppImage = sendWhatsAppImage;
exports.sendWhatsAppViewOnceMedia = sendWhatsAppViewOnceMedia;
exports.sendInstagramMessage = sendInstagramMessage;
exports.sendInstagramImage = sendInstagramImage;
exports.sendWhatsAppDocument = sendWhatsAppDocument;
exports.sendInstagramDocument = sendInstagramDocument;
exports.sendWhatsAppMedia = sendWhatsAppMedia;
exports.getSentMessages = getSentMessages;
var db_1 = require("./db");
var schema_1 = require("../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
function normalizeWhatsAppNumber(value) {
    return value.replace(/\D/g, "");
}
function getIntegrationConfig(type) {
    return __awaiter(this, void 0, void 0, function () {
        var db, config, configData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, type))
                            .limit(1)];
                case 2:
                    config = (_a.sent())[0];
                    if (!config || !config.isActive) {
                        throw new Error("".concat(type, " configuration not found or inactive"));
                    }
                    configData = typeof config.config === "string"
                        ? JSON.parse(config.config)
                        : config.config;
                    return [2 /*return*/, { configData: configData, configId: config.id }];
            }
        });
    });
}
function getEvolutionConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var configData, apiUrl, apiKey, instanceName, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getIntegrationConfig("evolution_api")];
                case 1:
                    configData = (_b.sent()).configData;
                    apiUrl = configData.apiUrl;
                    apiKey = configData.apiKey ||
                        configData.accessToken;
                    instanceName = configData.instanceName;
                    if (!apiUrl || !apiKey || !instanceName) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, {
                            apiUrl: apiUrl.replace(/\/$/, ""),
                            apiKey: apiKey,
                            instanceName: instanceName,
                        }];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function sendEvolutionText(params) {
    return __awaiter(this, void 0, void 0, function () {
        var config, response, error, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getEvolutionConfig()];
                case 1:
                    config = _a.sent();
                    if (!config) {
                        throw new Error("Evolution API configuration not found or incomplete");
                    }
                    return [4 /*yield*/, fetch("".concat(config.apiUrl, "/message/sendText/").concat(config.instanceName), {
                            method: "POST",
                            headers: {
                                apikey: config.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                number: normalizeWhatsAppNumber(params.to),
                                text: params.message,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    error = _a.sent();
                    throw new Error("Evolution API error: ".concat(response.status, " - ").concat(error));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Fetch profile info from Evolution API
 */
function fetchEvolutionProfile(phone) {
    return __awaiter(this, void 0, void 0, function () {
        var config, response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getEvolutionConfig()];
                case 1:
                    config = _a.sent();
                    if (!config) {
                        return [2 /*return*/, null];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, fetch("".concat(config.apiUrl, "/chat/fetchProfile/").concat(config.instanceName), {
                            method: "POST",
                            headers: {
                                apikey: config.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                number: normalizeWhatsAppNumber(phone),
                            }),
                        })];
                case 3:
                    response = _a.sent();
                    if (!response.ok) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    return [2 /*return*/, {
                            name: data.name || data.pushname || null,
                            profilePicture: data.picture || data.profilePictureUrl || null,
                            phone: phone,
                        }];
                case 5:
                    error_1 = _a.sent();
                    console.error("[Evolution API] Error fetching profile:", error_1);
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Send a text message via WhatsApp Business API
 */
function sendWhatsAppMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, evolutionConfig, result_1, configData, token, phoneNumberId, body, response, error, result;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _c.sent();
                    if (!db)
                        throw new Error("Database not available");
                    // If mediaUrl is provided, send media message
                    if (params.mediaUrl) {
                        return [2 /*return*/, sendWhatsAppViewOnceMedia({
                                to: params.to,
                                mediaUrl: params.mediaUrl,
                                mediaType: params.mediaUrl.startsWith("data:") ||
                                    params.mediaUrl.includes("base64")
                                    ? "image"
                                    : "image",
                                caption: params.caption || params.message,
                            })];
                    }
                    return [4 /*yield*/, getEvolutionConfig()];
                case 2:
                    evolutionConfig = _c.sent();
                    if (!evolutionConfig) return [3 /*break*/, 5];
                    return [4 /*yield*/, sendEvolutionText({
                            to: params.to,
                            message: params.message,
                        })];
                case 3:
                    result_1 = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.message,
                            messageId: ((_a = result_1 === null || result_1 === void 0 ? void 0 : result_1.key) === null || _a === void 0 ? void 0 : _a.id) || null,
                            status: "sent",
                        })];
                case 4:
                    _c.sent();
                    return [2 /*return*/, { success: true, messageId: ((_b = result_1 === null || result_1 === void 0 ? void 0 : result_1.key) === null || _b === void 0 ? void 0 : _b.id) || null, to: params.to }];
                case 5: return [4 /*yield*/, getIntegrationConfig("whatsapp_business")];
                case 6:
                    configData = (_c.sent()).configData;
                    token = configData.accessToken;
                    phoneNumberId = configData.phoneNumberId;
                    if (!token || !phoneNumberId) {
                        throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
                    }
                    body = {
                        messaging_product: "whatsapp",
                        to: normalizeWhatsAppNumber(params.to),
                        type: "text",
                        text: {
                            body: params.message,
                        },
                    };
                    if (params.replyToMessageId) {
                        body.context = {
                            message_id: params.replyToMessageId,
                        };
                    }
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(phoneNumberId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 7:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, response.text()];
                case 8:
                    error = _c.sent();
                    console.error("[WhatsApp Send] Error:", error);
                    throw new Error("WhatsApp API error: ".concat(response.status, " - ").concat(error));
                case 9: return [4 /*yield*/, response.json()];
                case 10:
                    result = _c.sent();
                    // Save sent message to database
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.message,
                            messageId: result.messages[0].id,
                            status: "sent",
                        })];
                case 11:
                    // Save sent message to database
                    _c.sent();
                    console.log("[WhatsApp Send] Message sent to ".concat(params.to, ": ").concat(result.messages[0].id));
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messages[0].id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send an image via WhatsApp Business API
 */
function sendWhatsAppImage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, evolutionConfig, response_1, error, result_2, configData, token, phoneNumberId, body, response, error, result;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _c.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getEvolutionConfig()];
                case 2:
                    evolutionConfig = _c.sent();
                    if (!evolutionConfig) return [3 /*break*/, 8];
                    return [4 /*yield*/, fetch("".concat(evolutionConfig.apiUrl, "/message/sendMedia/").concat(evolutionConfig.instanceName), {
                            method: "POST",
                            headers: {
                                apikey: evolutionConfig.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                number: normalizeWhatsAppNumber(params.to),
                                mediatype: "image",
                                media: params.imageUrl,
                                caption: params.caption || undefined,
                                mimetype: "image/jpeg",
                            }),
                        })];
                case 3:
                    response_1 = _c.sent();
                    if (!!response_1.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response_1.text()];
                case 4:
                    error = _c.sent();
                    throw new Error("Evolution API error: ".concat(response_1.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response_1.json()];
                case 6:
                    result_2 = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || "[Image]",
                            messageId: ((_a = result_2 === null || result_2 === void 0 ? void 0 : result_2.key) === null || _a === void 0 ? void 0 : _a.id) || null,
                            status: "sent",
                            metadata: JSON.stringify({
                                imageUrl: params.imageUrl,
                                caption: params.caption,
                            }),
                        })];
                case 7:
                    _c.sent();
                    return [2 /*return*/, { success: true, messageId: ((_b = result_2 === null || result_2 === void 0 ? void 0 : result_2.key) === null || _b === void 0 ? void 0 : _b.id) || null, to: params.to }];
                case 8: return [4 /*yield*/, getIntegrationConfig("whatsapp_business")];
                case 9:
                    configData = (_c.sent()).configData;
                    token = configData.accessToken;
                    phoneNumberId = configData.phoneNumberId;
                    if (!token || !phoneNumberId) {
                        throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
                    }
                    body = {
                        messaging_product: "whatsapp",
                        to: normalizeWhatsAppNumber(params.to),
                        type: "image",
                        image: {
                            link: params.imageUrl,
                            caption: params.caption || undefined,
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(phoneNumberId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 10:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 12];
                    return [4 /*yield*/, response.text()];
                case 11:
                    error = _c.sent();
                    throw new Error("WhatsApp API error: ".concat(response.status, " - ").concat(error));
                case 12: return [4 /*yield*/, response.json()];
                case 13:
                    result = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || "[Image]",
                            messageId: result.messages[0].id,
                            status: "sent",
                            metadata: JSON.stringify({
                                imageUrl: params.imageUrl,
                                caption: params.caption,
                            }),
                        })];
                case 14:
                    _c.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messages[0].id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send a view-once (disappearing) image or video via WhatsApp Business API
 */
function sendWhatsAppViewOnceMedia(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, evolutionConfig, response_2, error, result_3, configData, token, phoneNumberId, body, response, error, result;
        var _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _d.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getEvolutionConfig()];
                case 2:
                    evolutionConfig = _d.sent();
                    if (!evolutionConfig) return [3 /*break*/, 8];
                    return [4 /*yield*/, fetch("".concat(evolutionConfig.apiUrl, "/message/sendMedia/").concat(evolutionConfig.instanceName), {
                            method: "POST",
                            headers: {
                                apikey: evolutionConfig.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                number: normalizeWhatsAppNumber(params.to),
                                mediatype: params.mediaType,
                                media: params.mediaUrl,
                                caption: params.caption || undefined,
                                mimetype: params.mediaType === "image" ? "image/jpeg" : "video/mp4",
                            }),
                        })];
                case 3:
                    response_2 = _d.sent();
                    if (!!response_2.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response_2.text()];
                case 4:
                    error = _d.sent();
                    throw new Error("Evolution API error: ".concat(response_2.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response_2.json()];
                case 6:
                    result_3 = _d.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || "[View-once ".concat(params.mediaType, "]"),
                            messageId: ((_b = result_3 === null || result_3 === void 0 ? void 0 : result_3.key) === null || _b === void 0 ? void 0 : _b.id) || null,
                            status: "sent",
                            metadata: JSON.stringify({
                                mediaUrl: params.mediaUrl,
                                mediaType: params.mediaType,
                                caption: params.caption,
                                viewOnce: true,
                            }),
                        })];
                case 7:
                    _d.sent();
                    return [2 /*return*/, { success: true, messageId: ((_c = result_3 === null || result_3 === void 0 ? void 0 : result_3.key) === null || _c === void 0 ? void 0 : _c.id) || null, to: params.to }];
                case 8: return [4 /*yield*/, getIntegrationConfig("whatsapp_business")];
                case 9:
                    configData = (_d.sent()).configData;
                    token = configData.accessToken;
                    phoneNumberId = configData.phoneNumberId;
                    if (!token || !phoneNumberId) {
                        throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
                    }
                    body = (_a = {
                            messaging_product: "whatsapp",
                            to: normalizeWhatsAppNumber(params.to),
                            type: params.mediaType
                        },
                        _a[params.mediaType] = {
                            link: params.mediaUrl,
                            caption: params.caption || undefined,
                            animated: false,
                        },
                        _a.ephemeral = true,
                        _a);
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(phoneNumberId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 10:
                    response = _d.sent();
                    if (!!response.ok) return [3 /*break*/, 12];
                    return [4 /*yield*/, response.text()];
                case 11:
                    error = _d.sent();
                    throw new Error("WhatsApp API error: ".concat(response.status, " - ").concat(error));
                case 12: return [4 /*yield*/, response.json()];
                case 13:
                    result = _d.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || "[View-once ".concat(params.mediaType, "]"),
                            messageId: result.messages[0].id,
                            status: "sent",
                            metadata: JSON.stringify({
                                mediaUrl: params.mediaUrl,
                                mediaType: params.mediaType,
                                caption: params.caption,
                                viewOnce: true,
                            }),
                        })];
                case 14:
                    _d.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messages[0].id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send a text message via Instagram Graph API
 */
function sendInstagramMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, configData, token, pageId, body_1, response_3, data, body, response, error, result;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _b.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getIntegrationConfig("instagram_graph")];
                case 2:
                    configData = (_b.sent()).configData;
                    token = configData.accessToken;
                    pageId = configData.pageId || configData.businessAccountId;
                    if (!token || !pageId) {
                        throw new Error("Instagram configuration missing accessToken or pageId");
                    }
                    if (!params.mediaUrl) return [3 /*break*/, 6];
                    body_1 = {
                        recipient: {
                            id: params.to,
                        },
                        message: {
                            attachment: {
                                type: "image",
                                payload: {
                                    url: params.mediaUrl,
                                    is_reusable: true,
                                },
                            },
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(pageId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body_1),
                        })];
                case 3:
                    response_3 = _b.sent();
                    return [4 /*yield*/, response_3.json()];
                case 4:
                    data = _b.sent();
                    if (!response_3.ok) {
                        console.error("[Instagram] Send media error:", data);
                        throw new Error(((_a = data.error) === null || _a === void 0 ? void 0 : _a.message) || "Failed to send media");
                    }
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "instagram",
                            direction: "outbound",
                            content: params.message || "[Imagem]",
                            messageId: data.message_id || null,
                            status: "sent",
                            metadata: JSON.stringify({ mediaUrl: params.mediaUrl }),
                        })];
                case 5:
                    _b.sent();
                    return [2 /*return*/, { success: true, messageId: data.message_id, to: params.to }];
                case 6:
                    body = {
                        recipient: {
                            id: params.to,
                        },
                        message: {
                            text: params.message,
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(pageId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 7:
                    response = _b.sent();
                    if (!!response.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, response.text()];
                case 8:
                    error = _b.sent();
                    console.error("[Instagram Send] Error:", error);
                    throw new Error("Instagram API error: ".concat(response.status, " - ").concat(error));
                case 9: return [4 /*yield*/, response.json()];
                case 10:
                    result = _b.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "instagram",
                            direction: "outbound",
                            content: params.message,
                            messageId: result.message_id,
                            status: "sent",
                        })];
                case 11:
                    _b.sent();
                    console.log("[Instagram Send] Message sent to ".concat(params.to, ": ").concat(result.message_id));
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.message_id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send an image via Instagram Graph API
 */
function sendInstagramImage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, configData, token, pageId, body, response, error, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getIntegrationConfig("instagram_graph")];
                case 2:
                    configData = (_a.sent()).configData;
                    token = configData.accessToken;
                    pageId = configData.pageId || configData.businessAccountId;
                    if (!token || !pageId) {
                        throw new Error("Instagram configuration missing accessToken or pageId");
                    }
                    body = {
                        recipient: {
                            id: params.to,
                        },
                        message: {
                            attachment: {
                                type: "image",
                                payload: {
                                    url: params.imageUrl,
                                    is_reusable: true,
                                },
                            },
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(pageId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 3:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response.text()];
                case 4:
                    error = _a.sent();
                    throw new Error("Instagram API error: ".concat(response.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response.json()];
                case 6:
                    result = _a.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "instagram",
                            direction: "outbound",
                            content: "[Image]",
                            messageId: result.message_id,
                            status: "sent",
                            metadata: JSON.stringify({ imageUrl: params.imageUrl }),
                        })];
                case 7:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.message_id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send a document (PDF, DOC, etc.) via WhatsApp Business API
 */
function sendWhatsAppDocument(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, evolutionConfig, url, body_2, response_4, error, result_4, configData, token, phoneNumberId, body, response, error, result;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("[sendWhatsAppDocument] Params:", JSON.stringify(params));
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _c.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getEvolutionConfig()];
                case 2:
                    evolutionConfig = _c.sent();
                    console.log("[sendWhatsAppDocument] Evolution config:", evolutionConfig ? "FOUND" : "NOT FOUND");
                    if (!evolutionConfig) return [3 /*break*/, 8];
                    url = "".concat(evolutionConfig.apiUrl, "/message/sendMedia/").concat(evolutionConfig.instanceName);
                    body_2 = {
                        number: normalizeWhatsAppNumber(params.to),
                        mediatype: "document",
                        media: params.documentUrl,
                        fileName: params.filename,
                        mimetype: params.mimeType,
                        caption: params.caption || undefined,
                    };
                    console.log("[sendWhatsAppDocument] Sending to Evolution API:", url);
                    console.log("[sendWhatsAppDocument] Body:", JSON.stringify(body_2));
                    return [4 /*yield*/, fetch(url, {
                            method: "POST",
                            headers: {
                                apikey: evolutionConfig.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body_2),
                        })];
                case 3:
                    response_4 = _c.sent();
                    console.log("[sendWhatsAppDocument] Response status:", response_4.status);
                    if (!!response_4.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response_4.text()];
                case 4:
                    error = _c.sent();
                    console.error("[sendWhatsAppDocument] Error:", error);
                    throw new Error("Evolution API error: ".concat(response_4.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response_4.json()];
                case 6:
                    result_4 = _c.sent();
                    console.log("[sendWhatsAppDocument] Result:", JSON.stringify(result_4));
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || params.filename,
                            messageId: ((_a = result_4 === null || result_4 === void 0 ? void 0 : result_4.key) === null || _a === void 0 ? void 0 : _a.id) || null,
                            status: "sent",
                            metadata: JSON.stringify({
                                documentUrl: params.documentUrl,
                                filename: params.filename,
                                mimeType: params.mimeType,
                                caption: params.caption,
                            }),
                        })];
                case 7:
                    _c.sent();
                    return [2 /*return*/, { success: true, messageId: ((_b = result_4 === null || result_4 === void 0 ? void 0 : result_4.key) === null || _b === void 0 ? void 0 : _b.id) || null, to: params.to }];
                case 8: return [4 /*yield*/, getIntegrationConfig("whatsapp_business")];
                case 9:
                    configData = (_c.sent()).configData;
                    token = configData.accessToken;
                    phoneNumberId = configData.phoneNumberId;
                    if (!token || !phoneNumberId) {
                        throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
                    }
                    body = {
                        messaging_product: "whatsapp",
                        to: normalizeWhatsAppNumber(params.to),
                        type: "document",
                        document: {
                            link: params.documentUrl,
                            filename: params.filename,
                            caption: params.caption || undefined,
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(phoneNumberId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 10:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 12];
                    return [4 /*yield*/, response.text()];
                case 11:
                    error = _c.sent();
                    throw new Error("WhatsApp API error: ".concat(response.status, " - ").concat(error));
                case 12: return [4 /*yield*/, response.json()];
                case 13:
                    result = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || params.filename,
                            messageId: result.messages[0].id,
                            status: "sent",
                            metadata: JSON.stringify({
                                documentUrl: params.documentUrl,
                                filename: params.filename,
                                mimeType: params.mimeType,
                                caption: params.caption,
                            }),
                        })];
                case 14:
                    _c.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messages[0].id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send a document (PDF, DOC, etc.) via Instagram Graph API
 */
function sendInstagramDocument(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, configData, token, pageId, body, response, error, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getIntegrationConfig("instagram_graph")];
                case 2:
                    configData = (_a.sent()).configData;
                    token = configData.accessToken;
                    pageId = configData.pageId || configData.businessAccountId;
                    if (!token || !pageId) {
                        throw new Error("Instagram configuration missing accessToken or pageId");
                    }
                    body = {
                        recipient: {
                            id: params.to,
                        },
                        message: {
                            attachment: {
                                type: "file",
                                payload: {
                                    url: params.documentUrl,
                                    is_reusable: true,
                                },
                            },
                        },
                    };
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(pageId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 3:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response.text()];
                case 4:
                    error = _a.sent();
                    throw new Error("Instagram API error: ".concat(response.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response.json()];
                case 6:
                    result = _a.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "instagram",
                            direction: "outbound",
                            content: params.filename,
                            messageId: result.message_id,
                            status: "sent",
                            metadata: JSON.stringify({
                                documentUrl: params.documentUrl,
                                filename: params.filename,
                                mimeType: params.mimeType,
                            }),
                        })];
                case 7:
                    _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.message_id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Send media (image, video, audio, document) via WhatsApp with correct mime type
 * This function ensures the file type is preserved
 */
function sendWhatsAppMedia(params) {
    return __awaiter(this, void 0, void 0, function () {
        var db, evolutionConfig, endpoint, body_3, response_5, error, result_5, configData, token, phoneNumberId, body, response, error, result;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _c.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getEvolutionConfig()];
                case 2:
                    evolutionConfig = _c.sent();
                    if (!evolutionConfig) return [3 /*break*/, 8];
                    endpoint = "message/sendMedia/".concat(evolutionConfig.instanceName);
                    if (params.mediaType === "audio") {
                        // Áudio usa endpoint específico
                        endpoint = "message/sendWhatsAppAudio/".concat(evolutionConfig.instanceName);
                    }
                    body_3 = {
                        number: normalizeWhatsAppNumber(params.to),
                        mediatype: params.mediaType === "audio" ? "audio" : params.mediaType,
                        media: params.mediaUrl,
                        mimetype: params.mimeType,
                        caption: params.caption || undefined,
                    };
                    // fileName é obrigatório para documentos
                    if (params.mediaType === "document") {
                        body_3.fileName = params.filename || "documento";
                    }
                    return [4 /*yield*/, fetch("".concat(evolutionConfig.apiUrl, "/").concat(endpoint), {
                            method: "POST",
                            headers: {
                                apikey: evolutionConfig.apiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body_3),
                        })];
                case 3:
                    response_5 = _c.sent();
                    if (!!response_5.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, response_5.text()];
                case 4:
                    error = _c.sent();
                    throw new Error("Evolution API error: ".concat(response_5.status, " - ").concat(error));
                case 5: return [4 /*yield*/, response_5.json()];
                case 6:
                    result_5 = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || params.filename || "[".concat(params.mediaType, "]"),
                            messageId: ((_a = result_5 === null || result_5 === void 0 ? void 0 : result_5.key) === null || _a === void 0 ? void 0 : _a.id) || null,
                            status: "sent",
                            metadata: JSON.stringify({
                                mediaUrl: params.mediaUrl,
                                mediaType: params.mediaType,
                                filename: params.filename,
                                mimeType: params.mimeType,
                                caption: params.caption,
                            }),
                        })];
                case 7:
                    _c.sent();
                    return [2 /*return*/, { success: true, messageId: ((_b = result_5 === null || result_5 === void 0 ? void 0 : result_5.key) === null || _b === void 0 ? void 0 : _b.id) || null, to: params.to }];
                case 8: return [4 /*yield*/, getIntegrationConfig("whatsapp_business")];
                case 9:
                    configData = (_c.sent()).configData;
                    token = configData.accessToken;
                    phoneNumberId = configData.phoneNumberId;
                    if (!token || !phoneNumberId) {
                        throw new Error("WhatsApp configuration missing accessToken or phoneNumberId");
                    }
                    body = {
                        messaging_product: "whatsapp",
                        to: normalizeWhatsAppNumber(params.to),
                        type: params.mediaType,
                    };
                    if (params.mediaType === "document") {
                        body.document = {
                            link: params.mediaUrl,
                            filename: params.filename || "document",
                            caption: params.caption || undefined,
                        };
                    }
                    else if (params.mediaType === "image") {
                        body.image = {
                            link: params.mediaUrl,
                            caption: params.caption || undefined,
                        };
                    }
                    else if (params.mediaType === "video") {
                        body.video = {
                            link: params.mediaUrl,
                            caption: params.caption || undefined,
                        };
                    }
                    else if (params.mediaType === "audio") {
                        body.audio = {
                            link: params.mediaUrl,
                        };
                    }
                    return [4 /*yield*/, fetch("https://graph.facebook.com/v18.0/".concat(phoneNumberId, "/messages"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(token),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        })];
                case 10:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 12];
                    return [4 /*yield*/, response.text()];
                case 11:
                    error = _c.sent();
                    throw new Error("WhatsApp API error: ".concat(response.status, " - ").concat(error));
                case 12: return [4 /*yield*/, response.json()];
                case 13:
                    result = _c.sent();
                    return [4 /*yield*/, db.insert(schema_1.messages).values({
                            channel: "whatsapp",
                            direction: "outbound",
                            content: params.caption || params.filename || "[".concat(params.mediaType, "]"),
                            messageId: result.messages[0].id,
                            status: "sent",
                            metadata: JSON.stringify({
                                mediaUrl: params.mediaUrl,
                                mediaType: params.mediaType,
                                filename: params.filename,
                                mimeType: params.mimeType,
                                caption: params.caption,
                            }),
                        })];
                case 14:
                    _c.sent();
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messages[0].id,
                            to: params.to,
                        }];
            }
        });
    });
}
/**
 * Get sent messages history
 */
function getSentMessages(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var db, conditions, query;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    conditions = [(0, drizzle_orm_1.eq)(schema_1.messages.direction, "outbound")];
                    if (filters === null || filters === void 0 ? void 0 : filters.channel) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.messages.channel, filters.channel));
                    }
                    if (filters === null || filters === void 0 ? void 0 : filters.customerId) {
                        conditions.push((0, drizzle_orm_1.eq)(schema_1.messages.customerId, filters.customerId));
                    }
                    query = db
                        .select()
                        .from(schema_1.messages)
                        .where(drizzle_orm_1.and.apply(void 0, conditions));
                    if (filters === null || filters === void 0 ? void 0 : filters.limit) {
                        query = query.limit(filters.limit);
                    }
                    return [4 /*yield*/, query];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
