"use strict";
/**
 * Utilitarios para normalizacao de numeros de telefone WhatsApp
 * PADRAO UNICO: 55 + DDD + 9 + 8 digitos = 13 digitos (COM o 9)
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.generatePhoneVariants = generatePhoneVariants;
exports.formatPhoneBR = formatPhoneBR;
exports.normalizeWhatsAppNumber = normalizeWhatsAppNumber;
exports.normalizeWhatsAppNumberWithPlus = normalizeWhatsAppNumberWithPlus;
exports.phoneLast8 = phoneLast8;
exports.findConversationByPhone = findConversationByPhone;
function extractDigits(raw) {
    if (!raw)
        return '';
    if (raw.includes('@')) {
        var beforeAt = raw.substring(0, raw.indexOf('@')).replace(/\D/g, '');
        if (beforeAt.length >= 8)
            return beforeAt;
    }
    return raw.replace(/\D/g, '');
}
function normalizePhone(raw) {
    if (!raw)
        return '';
    var digits = extractDigits(raw);
    // Remove leading 0 if present (common in some formats)
    if (digits.length > 13 && digits.startsWith('0'))
        digits = digits.slice(1);
    if (digits.length > 13)
        return '';
    if (!digits.startsWith('55'))
        digits = '55' + digits;
    // If it's 12 digits (55 + DDD + 8 digits), add the 9
    if (digits.length === 12) {
        digits = digits.slice(0, 4) + '9' + digits.slice(4);
    }
    if (digits.length !== 13)
        return '';
    return digits;
}
function generatePhoneVariants(phone) {
    if (!phone)
        return [];
    var digits = extractDigits(phone);
    if (digits.length > 14)
        return [];
    if (!digits.startsWith('55'))
        digits = '55' + digits;
    // Normalize to 13 digits
    if (digits.length === 12)
        digits = digits.slice(0, 4) + '9' + digits.slice(4);
    if (digits.length === 14)
        digits = digits.slice(0, 13);
    var variants = new Set();
    if (digits.length === 13) {
        var sem9 = digits.slice(0, 4) + digits.slice(5);
        variants.add(digits);
        variants.add(sem9);
        variants.add('+' + digits);
        variants.add('+' + sem9);
    }
    else if (digits.length === 12) {
        var com9 = digits.slice(0, 4) + '9' + digits.slice(4);
        variants.add(digits);
        variants.add(com9);
        variants.add('+' + digits);
        variants.add('+' + com9);
    }
    return __spreadArray([], variants, true);
}
function formatPhoneBR(raw) {
    return normalizePhone(raw);
}
function normalizeWhatsAppNumber(raw) {
    return normalizePhone(raw);
}
function normalizeWhatsAppNumberWithPlus(raw) {
    var n = normalizePhone(raw);
    return n ? '+' + n : '';
}
/**
 * Extrai últimos 8 dígitos de um telefone (chave de busca universal)
 * Ex: 5531986337081 → 986337081
 *     553186337081 → 86337081 (mesmos últimos 8)
 *     +5531986337081 → 986337081
 */
function phoneLast8(raw) {
    if (!raw)
        return '';
    var digits = extractDigits(raw);
    return digits.length >= 8 ? digits.slice(-8) : digits;
}
/**
 * Busca ID de conversa existente por telefone (usando últimos 8 dígitos)
 * Resolve o problema de clientes duplicados com formatos diferentes de telefone
 *
 * Fluxo:
 * 1. Busca clientes por últimos 8 dígitos do telefone
 * 2. Para cada cliente encontrado, busca conversa (open/assigned/closed)
 * 3. Retorna a conversa mais recente
 *
 * Se não encontrar nenhuma, retorna null
 */
function findConversationByPhone(db, phone, conversationsTable, customersTable) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, eq, desc, inArray, like, or, last8, matchedCustomers, customerIds, conversation;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('drizzle-orm'); })];
                case 1:
                    _a = _b.sent(), eq = _a.eq, desc = _a.desc, inArray = _a.inArray, like = _a.like, or = _a.or;
                    last8 = phoneLast8(phone);
                    if (last8.length < 8)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db
                            .select({ id: customersTable.id, phone: customersTable.phone })
                            .from(customersTable)
                            .where(like(customersTable.phone, "%".concat(last8, "%")))
                            .limit(10)];
                case 2:
                    matchedCustomers = _b.sent();
                    if (matchedCustomers.length === 0)
                        return [2 /*return*/, null];
                    customerIds = matchedCustomers.map(function (c) { return c.id; });
                    return [4 /*yield*/, db
                            .select({
                            id: conversationsTable.id,
                            customerId: conversationsTable.customerId,
                            status: conversationsTable.status,
                        })
                            .from(conversationsTable)
                            .where(inArray(conversationsTable.customerId, customerIds))
                            .orderBy(desc(conversationsTable.lastMessageAt))
                            .limit(1)];
                case 3:
                    conversation = (_b.sent())[0];
                    return [2 /*return*/, conversation ? { conversationId: conversation.id, customerId: conversation.customerId, status: conversation.status } : null];
            }
        });
    });
}
