"use strict";
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = exports.JWT_SECRET = void 0;
exports.JWT_SECRET = process.env.JWT_SECRET || "";
exports.ENV = {
    appId: (_a = process.env.VITE_APP_ID) !== null && _a !== void 0 ? _a : "",
    cookieSecret: process.env.JWT_SECRET || "",
    databaseUrl: (_b = process.env.DATABASE_URL) !== null && _b !== void 0 ? _b : "",
    oAuthServerUrl: (_c = process.env.OAUTH_SERVER_URL) !== null && _c !== void 0 ? _c : "",
    ownerOpenId: (_d = process.env.OWNER_OPEN_ID) !== null && _d !== void 0 ? _d : "",
    isProduction: process.env.NODE_ENV === "production",
    forgeApiUrl: (_e = process.env.BUILT_IN_FORGE_API_URL) !== null && _e !== void 0 ? _e : "",
    forgeApiKey: (_f = process.env.BUILT_IN_FORGE_API_KEY) !== null && _f !== void 0 ? _f : "",
};
