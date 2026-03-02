import { mysqlTable, int, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const flowExecutionLogs = mysqlTable("flow_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("execution_id").notNull(),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // started, completed, failed
  input: text("input"), // JSON
  output: text("output"), // JSON
  error: text("error"),
  duration: int("duration"), // ms
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FlowExecutionLog = typeof flowExecutionLogs.$inferSelect;
