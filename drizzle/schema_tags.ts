/**
 * Schema de tags coloridas para organização de conversas e tickets
 */

import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // hex color code
  icon: varchar("icon", { length: 50 }), // lucide icon name
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversationTags = mysqlTable("conversation_tags", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 200 }).notNull(), // provider-fromNumber
  tagId: int("tagId").notNull().references(() => tags.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ticketTags = mysqlTable("ticket_tags", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  tagId: int("tagId").notNull().references(() => tags.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
