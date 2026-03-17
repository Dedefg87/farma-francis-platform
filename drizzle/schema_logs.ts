import {
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";

// Logs de execução de fluxos
export const flowExecutionLogs = pgTable("flow_execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull(),
  nodeId: varchar("node_id", { length: 255 }),
  nodeName: varchar("node_name", { length: 255 }),
  nodeType: varchar("node_type", { length: 100 }),
  status: varchar("status", { length: 16 }),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FlowExecutionLog = typeof flowExecutionLogs.$inferSelect;
export type InsertFlowExecutionLog = typeof flowExecutionLogs.$inferInsert;
