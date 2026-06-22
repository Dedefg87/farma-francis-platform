"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcedure = exports.protectedProcedure = exports.publicProcedure = exports.router = void 0;
var server_1 = require("@trpc/server");
var t = server_1.initTRPC.context().create({
// transformer: superjson, // DESABILITADO PARA TESTE DE LOGIN
});
exports.router = t.router;
// 🔐 Middleware de autenticação
var isAuthed = t.middleware(function (_a) {
    var ctx = _a.ctx, next = _a.next;
    if (!ctx.user) {
        throw new server_1.TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuário não autenticado",
        });
    }
    return next({ ctx: { user: ctx.user } });
});
// 🔒 Middleware para admin
var isAdmin = t.middleware(function (_a) {
    var ctx = _a.ctx, next = _a.next;
    if (!ctx.user || ctx.user.role !== "admin") {
        throw new server_1.TRPCError({
            code: "FORBIDDEN",
            message: "Acesso restrito a administradores",
        });
    }
    return next({ ctx: ctx });
});
// Procedures
exports.publicProcedure = t.procedure;
exports.protectedProcedure = t.procedure.use(isAuthed);
exports.adminProcedure = t.procedure.use(isAuthed).use(isAdmin);
