import {
  int,
  varchar,
  text,
  timestamp,
  mysqlTable,
} from "drizzle-orm/mysql-core";

export const flowExecutions = mysqlTable("flow_executions", {
  id:         int("id").autoincrement().primaryKey(),
  flowId:     int("flow_id").notNull(),
  status:     varchar("status", { length: 16 }).notNull(),
  trigger:    varchar("trigger_type", { length: 32 }),
  startedAt:  timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  input:      text("input"),
  error:      text("error"),
});

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type InsertFlowExecution = typeof flowExecutions.$inferInsert;

export const nodeExecutions    = null;
export const flowAnalytics     = null;
export const flowVersions      = null;
export const flowTags          = null;
export const flowTagRelations  = null;
export const notifications     = null;
