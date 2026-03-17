import {
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";

// Execution tracking tables
export const flowExecutions = pgTable("flow_executions", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  trigger: varchar("trigger", { length: 32 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  input: text("input"),
  error: text("error"),
});

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type InsertFlowExecution = typeof flowExecutions.$inferInsert;

// Outros símbolos mantidos como null para compatibilidade (não utilizados no PostgreSQL)
export const nodeExecutions = null;
export const flowAnalytics = null;
export const flowVersions = null;
export const flowTags = null;
export const flowTagRelations = null;
export const notifications = null;
