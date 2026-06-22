"use strict";
/**
 * Evolution API Media Download Service
 *
 * Uses the Evolution API /message/downloadMedia endpoint which handles
 * WhatsApp authentication internally, avoiding 403 hotlink blocks.
 */
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
exports.downloadWhatsAppMediaFromEvolution = downloadWhatsAppMediaFromEvolution;
var db_1 = require("../db");
var schema_1 = require("../../drizzle/schema");
var drizzle_orm_1 = require("drizzle-orm");
function downloadWhatsAppMediaFromEvolution(messageKey) {
    return __awaiter(this, void 0, void 0, function () {
        var db, config, configData, apiUrl, apiKey, instanceName, downloadUrl, response, buffer, _a, _b, err_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, db_1.getDb)()];
                case 1:
                    db = _d.sent();
                    if (!db) {
                        console.log('[Evolution Download] No database connection');
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, db
                            .select()
                            .from(schema_1.integrationSettings)
                            .where((0, drizzle_orm_1.eq)(schema_1.integrationSettings.integrationType, 'evolution_api'))
                            .limit(1)];
                case 2:
                    config = (_d.sent())[0];
                    if (!config) {
                        console.log('[Evolution Download] No Evolution API config found');
                        return [2 /*return*/, null];
                    }
                    configData = typeof config.config === 'string'
                        ? JSON.parse(config.config)
                        : config.config;
                    apiUrl = (_c = configData.apiUrl) === null || _c === void 0 ? void 0 : _c.replace(/\/$/, '');
                    apiKey = configData.apiKey || configData.accessToken;
                    instanceName = configData.instanceName;
                    if (!apiUrl || !apiKey || !instanceName) {
                        console.log('[Evolution Download] Missing required config fields');
                        return [2 /*return*/, null];
                    }
                    downloadUrl = "".concat(apiUrl, "/message/downloadMedia/").concat(instanceName);
                    console.log('[Evolution Download] Calling authenticated endpoint:', {
                        messageKey: messageKey.substring(0, 30) + '...',
                    });
                    return [4 /*yield*/, fetch(downloadUrl, {
                            method: 'POST',
                            headers: {
                                'apikey': apiKey,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messageKey: messageKey, // Baileys message key format
                            }),
                        })];
                case 3:
                    response = _d.sent();
                    if (!response.ok) {
                        console.log('[Evolution Download] Failed:', response.status, response.statusText);
                        return [2 /*return*/, null];
                    }
                    _b = (_a = Buffer).from;
                    return [4 /*yield*/, response.arrayBuffer()];
                case 4:
                    buffer = _b.apply(_a, [_d.sent()]);
                    console.log('[Evolution Download] Success, size:', buffer.length);
                    return [2 /*return*/, buffer];
                case 5:
                    err_1 = _d.sent();
                    console.error('[Evolution Download] Error:', err_1);
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
