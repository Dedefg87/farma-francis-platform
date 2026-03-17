import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  pgTable,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Export execution and analytics tables
export * from "./schema_executions";

// Tags tables consolidated in this file.

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers/Clients table for CRM
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  photoUrl: text("photoUrl"),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * ReceivedMessages: raw inbound messages from Evolution API
 */
export const receivedMessages = pgTable("received_messages", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 16 }).notNull(),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  fromNumber: text("fromNumber").notNull(),
  fromName: text("fromName"),
  customerId: integer("customerId").references(() => customers.id, { onDelete: "cascade" }),
  messageType: varchar("messageType", { length: 32 }),
  messageText: text("messageText"),
  caption: text("caption"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  mediaUrl: text("mediaUrl"),
  mediaId: text("mediaId"),
  mimeType: text("mimeType"),
  fileName: text("fileName"),
  fileSize: integer("fileSize"),
  rawPayload: jsonb("rawPayload"),
  processed: integer("processed").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReceivedMessage = typeof receivedMessages.$inferSelect;
export type InsertReceivedMessage = typeof receivedMessages.$inferInsert;

/**
 * Conversations: open/closed chat sessions between customer and agent
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull().references(() => customers.id, { onDelete: "cascade" }),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  channel: varchar("channel", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  assignedTo: integer("assignedTo").references(() => users.id),
  queueId: integer("queueId").references(() => queues.id),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * ConversationMessages: individual messages within a conversation
 */
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("senderId").references(() => users.id),
  senderType: varchar("senderType", { length: 16 }).notNull(),
  messageType: varchar("messageType", { length: 32 }).notNull(),
  content: text("content"),
  fileUrl: text("fileUrl"),
  fileName: text("fileName"),
  fileSize: integer("fileSize"),
  mimeType: text("mimeType"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  externalId: varchar("externalId", { length: 255 }),
  provider: varchar("provider", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;

/**
 * AgentStatus: real-time presence/status of agents
 */
export const agentStatus = pgTable("agent_status", {
  userId: integer("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).default("offline").notNull(),
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  currentConversationId: integer("currentConversationId").references(() => conversations.id),
});

export type AgentStatus = typeof agentStatus.$inferSelect;
export type InsertAgentStatus = typeof agentStatus.$inferInsert;

/**
 * AgentPauses: breaks/pause periods for agents
 */
export const agentPauses = pgTable("agent_pauses", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 255 }),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type AgentPause = typeof agentPauses.$inferSelect;
export type InsertAgentPause = typeof agentPauses.$inferInsert;

/**
 * Queues: routing queues for conversations
 */
export const queues = pgTable("queues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  priority: integer("priority").default(0).notNull(),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Queue = typeof queues.$inferSelect;
export type InsertQueue = typeof queues.$inferInsert;

/**
 * Broadcast Lists: for mass messaging
 */
export const broadcastLists = pgTable("broadcast_lists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: integer("createdBy").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastSentAt: timestamp("lastSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BroadcastList = typeof broadcastLists.$inferSelect;
export type InsertBroadcastList = typeof broadcastLists.$inferInsert;

/**
 * Broadcast List Members: customers in a broadcast list
 */
export const broadcastListMembers = pgTable("broadcast_list_members", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull().references(() => broadcastLists.id, { onDelete: "cascade" }),
  customerId: integer("customerId").notNull().references(() => customers.id, { onDelete: "cascade" }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type BroadcastListMember = typeof broadcastListMembers.$inferSelect;
export type InsertBroadcastListMember = typeof broadcastListMembers.$inferInsert;

/**
 * Broadcast Messages: messages sent to lists
 */
export const broadcastMessages = pgTable("broadcast_messages", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull().references(() => broadcastLists.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  fileUrl: text("fileUrl"),
  fileName: text("fileName"),
  fileType: text("fileType"),
  fileSize: integer("fileSize"),
  sentBy: integer("sentBy").notNull().references(() => users.id),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type BroadcastMessage = typeof broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = typeof broadcastMessages.$inferInsert;

/**
 * Broadcast Members Sent: tracking of sent messages per member
 */
export const broadcastMembersSent = pgTable("broadcast_members_sent", {
  id: serial("id").primaryKey(),
  messageId: integer("messageId").notNull().references(() => broadcastMessages.id, { onDelete: "cascade" }),
  customerId: integer("customerId").notNull().references(() => customers.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  error: text("error"),
  sentAt: timestamp("sentAt"),
});

export type BroadcastMemberSent = typeof broadcastMembersSent.$inferSelect;
export type InsertBroadcastMemberSent = typeof broadcastMembersSent.$inferInsert;

/**
 * IntegrationSettings: config for external integrations (Evolution API, etc.)
 */
export const integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  integrationType: varchar("integrationType", { length: 64 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  config: jsonb("config").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type IntegrationSetting = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSetting = typeof integrationSettings.$inferInsert;

/**
 * BabyShowerEvents: baby shower registry events
 */
export const babyShowerEvents = pgTable("baby_shower_events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("eventDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BabyShowerEvent = typeof babyShowerEvents.$inferSelect;
export type InsertBabyShowerEvent = typeof babyShowerEvents.$inferInsert;

/**
 * BabyShowerProducts: products available for gifting
 */
export const babyShowerProducts = pgTable("baby_shower_products", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull().references(() => babyShowerEvents.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  sold: integer("sold").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BabyShowerProduct = typeof babyShowerProducts.$inferSelect;
export type InsertBabyShowerProduct = typeof babyShowerProducts.$inferInsert;

/**
 * BabyShowerPurchases: gifts purchased by guests
 */
export const babyShowerPurchases = pgTable("baby_shower_purchases", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull().references(() => babyShowerEvents.id),
  productId: integer("productId").notNull().references(() => babyShowerProducts.id),
  customerId: integer("customerId").references(() => customers.id),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  whatsappNumber: varchar("whatsappNumber", { length: 32 }),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BabyShowerPurchase = typeof babyShowerPurchases.$inferSelect;
export type InsertBabyShowerPurchase = typeof babyShowerPurchases.$inferInsert;

// Note: Indexes are automatically created for primary keys, unique constraints, and foreign keys.
// Additional indexes can be added via drizzle if needed.
