import {
  bigint,
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  pgTable,
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

/**
 * Leads: prospecção e qualificação de clientes
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 100 }), // whatsapp, instagram, website, etc
  stage: varchar("stage", { length: 32 }).default("prospect").notNull(),
  value: integer("value"),
  assignedTo: integer("assigned_to").references(() => users.id),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Tickets: sistema de atendimento/suporte
 */
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("open").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium").notNull(),
  category: varchar("category", { length: 100 }),
  channel: varchar("channel", { length: 16 }),
  assignedTo: integer("assigned_to").references(() => users.id),
  slaDeadline: timestamp("sla_deadline"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Messages: mensagens de WhatsApp/Instagram (outras que não conversation_messages)
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  channel: varchar("channel", { length: 16 }).notNull(),
  direction: varchar("direction", { length: 16 }).notNull(),
  content: text("content").notNull(),
  messageId: varchar("message_id", { length: 255 }),
  status: varchar("status", { length: 32 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * AutomationFlows: regras de automação por canal
 */
export const automationFlows = pgTable("automation_flows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  trigger: text("trigger").notNull(),
  response: text("response").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  responseCount: integer("response_count").default(0).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AutomationFlow = typeof automationFlows.$inferSelect;
export type InsertAutomationFlow = typeof automationFlows.$inferInsert;

/**
 * VisualFlows: fluxos visuais (nodes/edges)
 */
export const visualFlows = pgTable("visual_flows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  flowData: text("flow_data").notNull(),
  isActive: integer("is_active").default(0).notNull(),
  isTestMode: integer("is_test_mode").default(0).notNull(),
  executionCount: integer("execution_count").default(0).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type VisualFlow = typeof visualFlows.$inferSelect;
export type InsertVisualFlow = typeof visualFlows.$inferInsert;

/**
 * URA (Interactive Voice Response) menus
 */
export const uraMenus = pgTable("ura_menus", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  menuData: text("menu_data").notNull(),
  workingHours: text("working_hours"),
  offHoursMessage: text("off_hours_message"),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UraMenu = typeof uraMenus.$inferSelect;
export type InsertUraMenu = typeof uraMenus.$inferInsert;

/**
 * WorkflowExecutions: execuções de fluxos visuais
 */
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => visualFlows.id),
  status: varchar("status", { length: 16 }).notNull(), // running, success, error, waiting, canceled
  mode: varchar("mode", { length: 16 }).notNull(), // manual, trigger, webhook, schedule
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: integer("execution_time"), // Milliseconds
  error: text("error"),
  triggeredBy: integer("triggered_by").references(() => users.id),
  triggerData: text("trigger_data"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * ExecutionData: dados de cada nó executado em um workflow
 */
export const executionData = pgTable("execution_data", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull().references(() => workflowExecutions.id),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(), // success, error, skipped
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: integer("execution_time"), // Milliseconds
  inputData: text("input_data"), // JSON
  outputData: text("output_data"), // JSON
  error: text("error"),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExecutionData = typeof executionData.$inferSelect;
export type InsertExecutionData = typeof executionData.$inferInsert;

/**
 * SurveyResponses: respostas de pesquisas de satisfação
 */
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5
  feedback: text("feedback"),
  closeReason: varchar("close_reason", { length: 50 }).notNull(), // venda, orcamento, etc
  agentId: integer("agent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

/**
 * QuickReplies: respostas rápidas pré-definidas
 */
export const quickReplies = pgTable("quick_replies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }), // saudacao, endereco, pagamento
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = typeof quickReplies.$inferInsert;

export const crmAuditLogs = pgTable("crm_audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrmAuditLog = typeof crmAuditLogs.$inferSelect;
export type InsertCrmAuditLog = typeof crmAuditLogs.$inferInsert;

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  relatedEntity: jsonb("related_entity"), // { type: "ticket"|"lead", id: number }
  reminderSentAt: timestamp("reminder_sent_at"),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = typeof crmActivities.$inferInsert;

export const customerTags = pgTable("customer_tags", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CustomerTag = typeof customerTags.$inferSelect;
export type InsertCustomerTag = typeof customerTags.$inferInsert;

export const crmScripts = pgTable("crm_scripts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  script: text("script").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrmScript = typeof crmScripts.$inferSelect;
export type InsertCrmScript = typeof crmScripts.$inferInsert;

export const pharmaProducts = pgTable("pharma_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PharmaProduct = typeof pharmaProducts.$inferSelect;
export type InsertPharmaProduct = typeof pharmaProducts.$inferInsert;

export const pharmaPurchases = pgTable("pharma_purchases", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  productId: integer("product_id").notNull().references(() => pharmaProducts.id),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
});

export type PharmaPurchase = typeof pharmaPurchases.$inferSelect;
export type InsertPharmaPurchase = typeof pharmaPurchases.$inferInsert;

export const pharmaPurchaseItems = pgTable("pharma_purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => pharmaPurchases.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => pharmaProducts.id),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export type PharmaPurchaseItem = typeof pharmaPurchaseItems.$inferSelect;
export type InsertPharmaPurchaseItem = typeof pharmaPurchaseItems.$inferInsert;

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  ownerId: integer("owner_id").references(() => users.id),
  accountNumber: varchar("account_number", { length: 50 }),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export const accountContacts = pgTable("account_contacts", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 100 }),
  isPrimary: integer("is_primary").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AccountContact = typeof accountContacts.$inferSelect;
export type InsertAccountContact = typeof accountContacts.$inferInsert;

export const dealPipelines = pgTable("deal_pipelines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DealPipeline = typeof dealPipelines.$inferSelect;
export type InsertDealPipeline = typeof dealPipelines.$inferInsert;

export const dealStages = pgTable("deal_stages", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").notNull().references(() => dealPipelines.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  description: text("description"),
  probability: integer("probability"), // 0-100
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DealStage = typeof dealStages.$inferSelect;
export type InsertDealStage = typeof dealStages.$inferInsert;

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  accountId: integer("account_id").references(() => accounts.id),
  stageId: integer("stage_id").references(() => dealStages.id),
  value: decimal("value", { precision: 10, scale: 2 }),
  closeDate: timestamp("close_date"),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

// Note: Indexes are automatically created for primary keys, unique constraints, and foreign keys.

/**
 * FlowExecutionLogs: logs detalhados de execução de fluxos
 */
export const flowExecutionLogs = pgTable("flow_execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 16 }).notNull(), // info, warn, error
  message: text("message").notNull(),
  nodeId: varchar("node_id", { length: 255 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type FlowExecutionLog = typeof flowExecutionLogs.$inferSelect;
export type InsertFlowExecutionLog = typeof flowExecutionLogs.$inferInsert;

// Note: Indexes are automatically created for primary keys, unique constraints, and foreign keys.

/**
 * ApiConfigurations: tokens e configurações de APIs externas (WhatsApp, Instagram)
 */
export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 16 }).notNull(),
  token: text("token").notNull(),
  phoneNumberId: varchar("phone_number_id", { length: 255 }),
  pageId: varchar("page_id", { length: 255 }),
  webhookUrl: varchar("webhook_url", { length: 512 }),
  webhookVerifyToken: varchar("webhook_verify_token", { length: 255 }),
  appSecret: varchar("app_secret", { length: 255 }),
  isActive: integer("is_active").default(1).notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: varchar("test_status", { length: 16 }).default("not_tested"),
  testMessage: text("test_message"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = typeof apiConfigurations.$inferInsert;

/**
 * BabyShowerGiftPackages: pacotes de presentes (produtos agrupados)
 */
export const babyShowerGiftPackages = pgTable("baby_shower_gift_packages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => babyShowerEvents.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productIds: jsonb("product_ids").notNull(), // array de product IDs
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BabyShowerGiftPackage = typeof babyShowerGiftPackages.$inferSelect;
export type InsertBabyShowerGiftPackage = typeof babyShowerGiftPackages.$inferInsert;

/**
 * ConversationTags: tags para organizar conversas
 */
export const conversationTags = pgTable("conversation_tags", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationTag = typeof conversationTags.$inferSelect;
export type InsertConversationTag = typeof conversationTags.$inferInsert;

/**
 * CrmOutboxEvents: fila de eventos de CRM para processamento assíncrono
 */
export const crmOutboxEvents = pgTable("crm_outbox_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrmOutboxEvent = typeof crmOutboxEvents.$inferSelect;
export type InsertCrmOutboxEvent = typeof crmOutboxEvents.$inferInsert;

/**
 * CrmTasks: tarefas de CRM (lembretes, follow-ups)
 */
export const crmTasks = pgTable("crm_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customerId: integer("customer_id").references(() => customers.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 16 }).default("medium"),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = typeof crmTasks.$inferInsert;

/**
 * CustomerTreatments: histórico de tratamentos/atendimentos médicos
 */
export const customerTreatments = pgTable("customer_treatments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  treatmentType: varchar("treatment_type", { length: 100 }).notNull(),
  description: text("description"),
  medication: text("medication"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CustomerTreatment = typeof customerTreatments.$inferSelect;
export type InsertCustomerTreatment = typeof customerTreatments.$inferInsert;

/**
 * Employees: funcionários/colaboradores
 */
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique().references(() => users.id, { onDelete: "cascade" }),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: timestamp("hire_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * FrontendTelemetryEvents: eventos de telemetria do frontend
 */
export const frontendTelemetryEvents = pgTable("frontend_telemetry_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  properties: jsonb("properties"),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FrontendTelemetryEvent = typeof frontendTelemetryEvents.$inferSelect;
export type InsertFrontendTelemetryEvent = typeof frontendTelemetryEvents.$inferInsert;

/**
 * QueueAgents: relacionamento entre filas e agentes
 */
export const queueAgents = pgTable("queue_agents", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => queues.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export type QueueAgent = typeof queueAgents.$inferSelect;
export type InsertQueueAgent = typeof queueAgents.$inferInsert;

/**
 * Tags: tags genéricas para customer, tickets, etc.
 */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }), // hex color
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * TicketTags: relacionamento many-to-many entre tickets e tags
 */
export const ticketTags = pgTable("ticket_tags", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketTag = typeof ticketTags.$inferSelect;
export type InsertTicketTag = typeof ticketTags.$inferInsert;

// Note: Indexes are automatically created for primary keys, unique constraints, and foreign keys.
// Additional indexes can be added via drizzle if needed.

// Note: Indexes are automatically created for primary keys, unique constraints, and foreign keys.
// Additional indexes can be added via drizzle if needed.
