"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = exports.flowTagRelations = exports.flowTags = exports.flowVersions = exports.flowAnalytics = exports.nodeExecutions = exports.flowExecutions = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
exports.flowExecutions = (0, mysql_core_1.mysqlTable)("flow_executions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    flowId: (0, mysql_core_1.int)("flow_id").notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 16 }).notNull(),
    trigger: (0, mysql_core_1.varchar)("trigger_type", { length: 32 }),
    startedAt: (0, mysql_core_1.timestamp)("started_at").defaultNow().notNull(),
    finishedAt: (0, mysql_core_1.timestamp)("finished_at"),
    input: (0, mysql_core_1.text)("input"),
    error: (0, mysql_core_1.text)("error"),
});
exports.nodeExecutions = null;
exports.flowAnalytics = null;
exports.flowVersions = null;
exports.flowTags = null;
exports.flowTagRelations = null;
exports.notifications = null;
