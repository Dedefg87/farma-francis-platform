"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = exports.sseManager = void 0;
var events_1 = require("events");
var SseManager = /** @class */ (function (_super) {
    __extends(SseManager, _super);
    function SseManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.clients = new Map();
        return _this;
    }
    SseManager.prototype.addClient = function (userId, res) {
        var _this = this;
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(res);
        console.log("[SSE] Client added. Total clients for userId=".concat(userId, ": ").concat(this.clients.get(userId).size));
        console.log("[SSE] All connected users: ".concat(this.getConnectedUsers().join(", ")));
        res.on("close", function () {
            var _a, _b;
            (_a = _this.clients.get(userId)) === null || _a === void 0 ? void 0 : _a.delete(res);
            if (((_b = _this.clients.get(userId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
                _this.clients.delete(userId);
            }
        });
    };
    SseManager.prototype.emitToUser = function (userId, event) {
        var clientSet = this.clients.get(userId);
        if (!clientSet) {
            console.log("[SSE] No clients connected for userId=".concat(userId, ". Connected users: ").concat(this.getConnectedUsers().join(", ")));
            return;
        }
        var data = "data: ".concat(JSON.stringify(event), "\n\n");
        console.log("[SSE] \uD83D\uDCE4 SENDING EVENT to ".concat(clientSet.size, " client(s) for userId=").concat(userId, ":"), event);
        for (var _i = 0, clientSet_1 = clientSet; _i < clientSet_1.length; _i++) {
            var res = clientSet_1[_i];
            try {
                res.write(data);
            }
            catch (e) {
                console.error("[SSE] \u274C Error sending to client for userId=".concat(userId, ":"), e);
                clientSet.delete(res);
            }
        }
    };
    SseManager.prototype.emitToAll = function (event) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var userId = _a[_i][0];
            this.emitToUser(userId, event);
        }
    };
    /**
     * Emite evento para todos os usuários que são administradores.
     * Requer que o role do usuário seja passado ou possa ser determinado.
     * Por simplicidade, emite para TODOS os users conectados (mantém compatibilidade).
     * Se for necessário filtrar por admin, pode-se fazer no consumer do evento.
     */
    SseManager.prototype.emitToAdmins = function (event) {
        // Por ora, emite para todos os conectados (comportamento anterior era inexistente)
        // TODO: Implementar filtro por admin se necessário
        this.emitToAll(event);
    };
    SseManager.prototype.getConnectedUsers = function () {
        return Array.from(this.clients.keys());
    };
    SseManager.prototype.getClientCount = function () {
        return this.clients.size;
    };
    return SseManager;
}(events_1.EventEmitter));
exports.sseManager = new SseManager();
exports.EVENTS = {
    MESSAGE_NEW: "message:new",
    MESSAGE_STATUS: "message:status",
    CONVERSATION_UPDATE: "conversation:update",
    CONVERSATION_NEW: "conversation:new",
    CONVERSATION_READ: "conversation:read",
    AGENT_STATUS: "agent:status",
};
