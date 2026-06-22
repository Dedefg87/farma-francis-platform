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
exports.businessHoursRouter = void 0;
exports.checkBusinessHours = checkBusinessHours;
var zod_1 = require("zod");
var trpc_1 = require("./_core/trpc");
// In-memory schedule storage (will be migrated to DB)
var daySchedulesCache = {
    monday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    tuesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    wednesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    thursday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    friday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    saturday: { enabled: true, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
    sunday: { enabled: false, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
};
var holidaysCache = [];
// Default 2026 holidays
var defaultHolidays2026 = [
    { date: "2026-01-01", name: "Confraternização Universal", type: "national", enabled: true },
    { date: "2026-02-17", name: "Carnaval", type: "national", enabled: true },
    { date: "2026-04-03", name: "Paixão de Cristo", type: "national", enabled: true },
    { date: "2026-04-21", name: "Tiradentes", type: "national", enabled: true },
    { date: "2026-05-01", name: "Dia do Trabalho", type: "national", enabled: true },
    { date: "2026-09-07", name: "Independência do Brasil", type: "national", enabled: true },
    { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", enabled: true },
    { date: "2026-11-02", name: "Finados", type: "national", enabled: true },
    { date: "2026-11-15", name: "Proclamação da República", type: "national", enabled: true },
    { date: "2026-11-20", name: "Dia da Consciência Negra", type: "national", enabled: true },
    { date: "2026-12-25", name: "Natal", type: "national", enabled: true },
];
// Day schedule input schema
var DayScheduleInput = zod_1.z.object({
    day: zod_1.z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    enabled: zod_1.z.boolean().default(true),
    openTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    closeTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    holidayOpenTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    holidayCloseTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});
// Holiday input schema
var HolidayInput = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(["national", "municipal", "state"]),
    enabled: zod_1.z.boolean().default(true),
});
exports.businessHoursRouter = (0, trpc_1.router)({
    // Get all day schedules
    getAll: trpc_1.protectedProcedure.query(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Object.entries(daySchedulesCache).map(function (_a) {
                    var day = _a[0], s = _a[1];
                    return (__assign({ day: day }, s));
                })];
        });
    }); }),
    // Update day schedule
    update: trpc_1.protectedProcedure
        .input(DayScheduleInput)
        .mutation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var input = _b.input;
        return __generator(this, function (_c) {
            daySchedulesCache[input.day] = {
                enabled: input.enabled,
                openTime: input.openTime,
                closeTime: input.closeTime,
                holidayOpenTime: input.holidayOpenTime || "08:00",
                holidayCloseTime: input.holidayCloseTime || "12:00",
            };
            return [2 /*return*/, { success: true }];
        });
    }); }),
    // Check if currently within business hours
    checkNow: trpc_1.protectedProcedure
        .input(zod_1.z.object({ date: zod_1.z.string().optional() }).optional())
        .query(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var now, dayOfWeek, timeStr, dayMap, dayKey, dateStr, holiday, holidayOpen, holidayClose, isOpen_1, schedule, isOpen;
        var _c;
        var input = _b.input;
        return __generator(this, function (_d) {
            now = (input === null || input === void 0 ? void 0 : input.date) ? new Date(input.date) : new Date();
            dayOfWeek = now.getDay();
            timeStr = now.toTimeString().slice(0, 5);
            dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday",
            };
            dayKey = dayMap[dayOfWeek];
            dateStr = now.toISOString().split("T")[0];
            holiday = holidaysCache.find(function (h) { return h.date === dateStr && h.enabled; });
            if (holiday && dayKey && ((_c = daySchedulesCache[dayKey]) === null || _c === void 0 ? void 0 : _c.enabled)) {
                holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
                holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
                isOpen_1 = timeStr >= holidayOpen && timeStr < holidayClose;
                return [2 /*return*/, {
                        isBusinessHours: isOpen_1,
                        isOpen: isOpen_1,
                        type: "holiday",
                        holidayName: holiday.name,
                        schedule: { openTime: holidayOpen, closeTime: holidayClose },
                        currentTime: timeStr,
                    }];
            }
            // Regular schedule check
            if (!dayKey) {
                return [2 /*return*/, {
                        isBusinessHours: false,
                        isOpen: false,
                        type: "error",
                        schedule: null,
                        currentTime: timeStr,
                    }];
            }
            schedule = daySchedulesCache[dayKey];
            isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;
            return [2 /*return*/, {
                    isBusinessHours: schedule.enabled && isOpen,
                    isOpen: isOpen,
                    type: "regular",
                    schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
                    currentTime: timeStr,
                }];
        });
    }); }),
    // List holidays
    getHolidays: trpc_1.protectedProcedure
        .input(zod_1.z.object({ year: zod_1.z.number().optional() }).optional())
        .query(function () { return __awaiter(void 0, void 0, void 0, function () {
        var merged, seen;
        return __generator(this, function (_a) {
            merged = __spreadArray(__spreadArray([], defaultHolidays2026, true), holidaysCache, true);
            seen = new Set();
            return [2 /*return*/, merged.filter(function (h) {
                    if (seen.has(h.date))
                        return false;
                    seen.add(h.date);
                    return true;
                })];
        });
    }); }),
    // Add/Update holiday
    upsertHoliday: trpc_1.protectedProcedure
        .input(HolidayInput)
        .mutation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var existingIndex;
        var input = _b.input;
        return __generator(this, function (_c) {
            existingIndex = holidaysCache.findIndex(function (h) { return h.date === input.date; });
            if (existingIndex >= 0) {
                holidaysCache[existingIndex] = input;
            }
            else {
                holidaysCache.push(input);
            }
            return [2 /*return*/, { success: true }];
        });
    }); }),
    // Delete holiday
    deleteHoliday: trpc_1.protectedProcedure
        .input(zod_1.z.object({ date: zod_1.z.string() }))
        .mutation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var input = _b.input;
        return __generator(this, function (_c) {
            holidaysCache = holidaysCache.filter(function (h) { return h.date !== input.date; });
            return [2 /*return*/, { success: true }];
        });
    }); }),
});
// Export function for flow-engine to check business hours
function checkBusinessHours() {
    return __awaiter(this, arguments, void 0, function (date) {
        var dayOfWeek, timeStr, dayMap, dayKey, dateStr, holiday, holidayOpen, holidayClose, isOpen_2, schedule, isOpen;
        var _a;
        if (date === void 0) { date = new Date(); }
        return __generator(this, function (_b) {
            dayOfWeek = date.getDay();
            timeStr = date.toTimeString().slice(0, 5);
            dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday",
            };
            dayKey = dayMap[dayOfWeek];
            dateStr = date.toISOString().split("T")[0];
            holiday = __spreadArray(__spreadArray([], defaultHolidays2026, true), holidaysCache, true).find(function (h) { return h.date === dateStr && h.enabled; });
            if (holiday && dayKey && ((_a = daySchedulesCache[dayKey]) === null || _a === void 0 ? void 0 : _a.enabled)) {
                holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
                holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
                isOpen_2 = timeStr >= holidayOpen && timeStr < holidayClose;
                return [2 /*return*/, {
                        isOpen: isOpen_2,
                        schedule: { openTime: holidayOpen, closeTime: holidayClose },
                        holidayName: holiday.name,
                    }];
            }
            if (!dayKey) {
                return [2 /*return*/, { isOpen: false }];
            }
            schedule = daySchedulesCache[dayKey];
            isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;
            return [2 /*return*/, {
                    isOpen: isOpen,
                    schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
                }];
        });
    });
}
