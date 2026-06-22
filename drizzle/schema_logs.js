"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowExecutionLogs = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
// Logs de execução de fluxos
exports.flowExecutionLogs = (0, pg_core_1.pgTable)("flow_execution_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    executionId: (0, pg_core_1.integer)("execution_id").notNull(),
    nodeId: (0, pg_core_1.varchar)("node_id", { length: 255 }),
    nodeName: (0, pg_core_1.varchar)("node_name", { length: 255 }),
    nodeType: (0, pg_core_1.varchar)("node_type", { length: 100 }),
    status: (0, pg_core_1.varchar)("status", { length: 16 }),
    input: (0, pg_core_1.text)("input"),
    output: (0, pg_core_1.text)("output"),
    error: (0, pg_core_1.text)("error"),
    duration: (0, pg_core_1.integer)("duration"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
