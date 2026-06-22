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
exports.db = void 0;
exports.getDb = getDb;
exports.getDbRaw = getDbRaw;
exports.getUserByOpenId = getUserByOpenId;
exports.upsertUser = upsertUser;
exports.getSession = getSession;
var drizzle_orm_1 = require("drizzle-orm");
var mysql2_1 = require("drizzle-orm/mysql2");
var mysql = require("mysql2/promise");
var sdk_1 = require("./_core/sdk");
var schema_1 = require("../drizzle/schema");
var _db = null;
exports.db = _db;
var _pool = null;
var _dbHealthCheck = 0;
function getDb() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, e_1, url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(_db && Date.now() - _dbHealthCheck < 30000)) return [3 /*break*/, 6];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    if (!_pool) return [3 /*break*/, 4];
                    return [4 /*yield*/, _pool.getConnection()];
                case 2:
                    connection = _a.sent();
                    return [4 /*yield*/, connection.ping()];
                case 3:
                    _a.sent();
                    connection.release();
                    return [2 /*return*/, _db];
                case 4: return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    console.log("[Database] Health check failed, recreating pool...", e_1);
                    exports.db = _db = null;
                    _pool = null;
                    return [3 /*break*/, 6];
                case 6:
                    // Se não temos DB cacheado ou health check falhou, criar novo
                    if (!_db && process.env.DATABASE_URL) {
                        try {
                            url = new URL(process.env.DATABASE_URL);
                            _pool = mysql.createPool({
                                host: url.hostname,
                                user: url.username,
                                password: url.password,
                                database: url.pathname.slice(1),
                                port: url.port ? parseInt(url.port) : 3306,
                                waitForConnections: true,
                                connectionLimit: 50,
                                queueLimit: 0,
                                enableKeepAlive: true,
                                keepAliveInitialDelay: 0,
                                charset: 'utf8mb4',
                                timezone: 'Z',
                            });
                            exports.db = _db = (0, mysql2_1.drizzle)(_pool, { mode: "raw" });
                            _dbHealthCheck = Date.now();
                            console.log("[Database] New connection pool created (50 connections)");
                        }
                        catch (error) {
                            console.error("[Database] Failed to connect:", error);
                            exports.db = _db = null;
                            _pool = null;
                        }
                    }
                    return [2 /*return*/, _db];
            }
        });
    });
}
function getDbRaw() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db) {
                        console.error("[Database] Database not available");
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, db];
            }
        });
    });
}
// USER QUERIES
function getUserByOpenId(openId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, rawResult, rows, rawUser;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _j.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT * FROM users WHERE openId = ", " LIMIT 1"], ["SELECT * FROM users WHERE openId = ", " LIMIT 1"])), openId))];
                case 2:
                    rawResult = _j.sent();
                    rows = (_b = (_a = rawResult.rows) !== null && _a !== void 0 ? _a : rawResult[0]) !== null && _b !== void 0 ? _b : rawResult;
                    rawUser = Array.isArray(rows) ? rows[0] : undefined;
                    if (!rawUser)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            id: rawUser.id,
                            openId: (_c = rawUser.openId) !== null && _c !== void 0 ? _c : rawUser.open_id,
                            name: rawUser.name,
                            email: rawUser.email,
                            passwordHash: (_d = rawUser.passwordHash) !== null && _d !== void 0 ? _d : rawUser.password_hash,
                            loginMethod: (_e = rawUser.loginMethod) !== null && _e !== void 0 ? _e : rawUser.login_method,
                            role: rawUser.role,
                            createdAt: (_f = rawUser.createdAt) !== null && _f !== void 0 ? _f : rawUser.created_at,
                            updatedAt: (_g = rawUser.updatedAt) !== null && _g !== void 0 ? _g : rawUser.updated_at,
                            lastSignedIn: (_h = rawUser.lastSignedIn) !== null && _h !== void 0 ? _h : rawUser.last_signed_in,
                        }];
            }
        });
    });
}
function upsertUser(userData) {
    return __awaiter(this, void 0, void 0, function () {
        var db, existing, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        throw new Error("Database not available");
                    return [4 /*yield*/, getUserByOpenId(userData.openId)];
                case 2:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 5];
                    return [4 /*yield*/, db
                            .update(schema_1.users)
                            .set(__assign(__assign(__assign(__assign(__assign({}, (userData.name !== undefined && { name: userData.name })), (userData.email !== undefined && { email: userData.email })), (userData.loginMethod !== undefined && {
                            loginMethod: userData.loginMethod,
                        })), (userData.lastSignedIn != null && {
                            lastSignedIn: userData.lastSignedIn,
                        })), { updatedAt: new Date() }))
                            .where((0, drizzle_orm_1.eq)(schema_1.users.id, existing.id))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, getUserByOpenId(userData.openId)];
                case 4: return [2 /*return*/, _a.sent()];
                case 5: return [4 /*yield*/, db.insert(schema_1.users).values({
                        openId: userData.openId,
                        name: userData.name || null,
                        email: userData.email || null,
                        loginMethod: userData.loginMethod || null,
                        lastSignedIn: userData.lastSignedIn || new Date(),
                        role: "user",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })];
                case 6:
                    result = _a.sent();
                    return [4 /*yield*/, getUserByOpenId(userData.openId)];
                case 7: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// SESSION HELPER para routers-sse.ts
// Retorna { userId: string } ou null
function getSession(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var session, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, sdk_1.sdk.verifySession(sessionId)];
                case 1:
                    session = _a.sent();
                    if (!session) {
                        return [2 /*return*/, null];
                    }
                    // Verificar se usuário existe no banco (opcional, mas sseAuth já faz essa verificação)
                    // Aqui retornamos apenas o openId como userId
                    return [2 /*return*/, {
                            userId: session.openId,
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error("[Session] Error verifying session:", error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1;
