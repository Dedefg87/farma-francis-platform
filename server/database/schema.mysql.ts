import {
  autoIncrement,
  bigint,
  boolean,
  date,
  decimal,
  int,
  json,
  primaryKey,
  text,
  timestamp,
  varchar,
  mysqlTable,
} from "drizzle-orm/mysql2";

// Export execution and analytics tables
export * from "./schema_executions";

// Tags tables consolidated in this file.

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers/Clients table for CRM
 */
export const customers = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * ReceivedMessages: raw inbound messages from Evolution API
 */
export const receivedMessages = mysqlTable("received_messages", {
  id: int("id").primaryKey().autoincrement(),
  provider: varchar("provider", { length: 16 }).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  fromNumber: text("from_number").notNull(),
  fromName: text("from_name"),
  customerId: int("customer_id"),
  messageType: varchar("message_type", { length: 32 }),
  messageText: text("message_text"),
  caption: text("caption"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  mediaUrl: text("media_url"),
  mediaId: text("media_id"),
  mimeType: text("mime_type"),
  fileName: text("file_name"),
  fileSize: int("file_size"),
  rawPayload: json("raw_payload"),
  processed: int("processed").default(0),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReceivedMessage = typeof receivedMessages.$inferSelect;
export type InsertReceivedMessage = typeof receivedMessages.$inferInsert;

/**
 * Conversations: open/closed chat sessions between customer and agent
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  channel: varchar("channel", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  assignedTo: int("assigned_to"),
  queueId: int("queue_id"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  unreadCount: int("unread_count").default(0).notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * ConversationMessages: individual messages within a conversation
 */
export const conversationMessages = mysqlTable("conversation_messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull(),
  senderId: int("sender_id"),
  senderType: varchar("sender_type", { length: 16 }).notNull(),
  messageType: varchar("message_type", { length: 32 }).notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: int("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  externalId: varchar("external_id", { length: 255 }),
  provider: varchar("provider", { length: 16 }),
  readAt: timestamp("read_at"),
  remoteJid: text("remote_jid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;

/**
 * AgentStatus: real-time presence/status of agents
 */
export const agentStatus = mysqlTable("agent_status", {
  userId: int("user_id").primaryKey(),
  status: varchar("status", { length: 16 }).default("offline").notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  currentConversationId: int("current_conversation_id"),
});

export type AgentStatus = typeof agentStatus.$inferSelect;
export type InsertAgentStatus = typeof agentStatus.$inferInsert;

/**
 * AgentPauses: breaks/pause periods for agents
 */
export const agentPauses = mysqlTable("agent_pauses", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agent_id").notNull(),
  reason: varchar("reason", { length: 255 }),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export type AgentPause = typeof agentPauses.$inferSelect;
export type InsertAgentPause = typeof agentPauses.$inferInsert;

/**
 * Queues: routing queues for conversations
 */
export const queues = mysqlTable("queues", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  priority: int("priority").default(0).notNull(),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Queue = typeof queues.$inferSelect;
export type InsertQueue = typeof queues.$inferInsert;

/**
 * Broadcast Lists: for mass messaging
 */
export const broadcastLists = mysqlTable("broadcast_lists", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BroadcastList = typeof broadcastLists.$inferSelect;
export type InsertBroadcastList = typeof broadcastLists.$inferInsert;

/**
 * Broadcast List Members: customers in a broadcast list
 */
export const broadcastListMembers = mysqlTable("broadcast_list_members", {
  id: int("id").primaryKey().autoincrement(),
  listId: int("list_id").notNull(),
  customerId: int("customer_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type BroadcastListMember = typeof broadcastListMembers.$inferSelect;
export type InsertBroadcastListMember = typeof broadcastListMembers.$inferInsert;

/**
 * Broadcast Messages: messages sent to lists
 */
export const broadcastMessages = mysqlTable("broadcast_messages", {
  id: int("id").primaryKey().autoincrement(),
  listId: int("list_id").notNull(),
  messageText: text("message_text"), // NULLABLE
  caption: text("caption"), // NULLABLE
  fileUrl: varchar("file_url", { length: 255 }), // NULLABLE
  fileName: varchar("file_name", { length: 255 }), // NULLABLE
  fileType: varchar("file_type", { length: 50 }), // NULLABLE
  fileSize: int("file_size"), // NULLABLE
  senderId: int("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 50 }).notNull().default('agent'),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  sentAt: datetime("sent_at"), // NULLABLE
  errorMessage: text("error_message"), // NULLABLE
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdate(sql`CURRENT_TIMESTAMP`),
});

export type BroadcastMessage = typeof broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = typeof broadcastMessages.$inferInsert;

/**
 * Broadcast Members Sent: tracking of sent messages per member
 */
export const broadcastMembersSent = mysqlTable("broadcast_members_sent", {
  id: int("id").primaryKey().autoincrement(),
  messageId: int("message_id").notNull(),
  customerId: int("customer_id").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at"),
});

export type BroadcastMemberSent = typeof broadcastMembersSent.$inferSelect;
export type InsertBroadcastMemberSent = typeof broadcastMembersSent.$inferInsert;

/**
 * IntegrationSettings: config for external integrations (Evolution API, etc.)
 */
export const integrationSettings = mysqlTable("integration_settings", {
  id: int("id").primaryKey().autoincrement(),
  integrationType: varchar("integration_type", { length: 64 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IntegrationSetting = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSetting = typeof integrationSettings.$inferInsert;

/**
 * BabyShowerEvents: baby shower registry events
 */
export const babyShowerEvents = mysqlTable("baby_shower_events", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BabyShowerEvent = typeof babyShowerEvents.$inferSelect;
export type InsertBabyShowerEvent = typeof babyShowerEvents.$inferInsert;

/**
 * BabyShowerProducts: products available for gifting
 */
export const babyShowerProducts = mysqlTable("baby_shower_products", {
  id: int("id").primaryKey().autoincrement(),
  eventId: int("event_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: int("stock").default(0).notNull(),
  sold: int("sold").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BabyShowerProduct = typeof babyShowerProducts.$inferSelect;
export type InsertBabyShowerProduct = typeof babyShowerProducts.$inferInsert;

/**
 * BabyShowerPurchases: gifts purchased by guests
 */
export const babyShowerPurchases = mysqlTable("baby_shower_purchases", {
  id: int("id").primaryKey().autoincrement(),
  eventId: int("event_id").notNull(),
  productId: int("product_id").notNull(),
  customerId: int("customer_id"),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 32 }),
  quantity: int("quantity").default(1).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  whatsappNumber: varchar("whatsapp_number", { length: 32 }),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BabyShowerPurchase = typeof babyShowerPurchases.$inferSelect;
export type InsertBabyShowerPurchase = typeof babyShowerPurchases.$inferInsert;

/**
 * BabyShowerWithdrawals: saques de fraldas do estoque do evento
 */
export const babyShowerWithdrawals = mysqlTable("baby_shower_withdrawals", {
  id: int("id").primaryKey().autoincrement(),
  eventId: int("event_id").notNull(),
  relatedTaskId: int("related_task_id"),
  withdrawalType: varchar("withdrawal_type", { length: 50 }).notNull(),
  diaperSize: varchar("diaper_size", { length: 50 }),
  quantity: int("quantity").notNull(),
  deliveryMethod: varchar("delivery_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BabyShowerWithdrawal = typeof babyShowerWithdrawals.$inferSelect;
export type InsertBabyShowerWithdrawal = typeof babyShowerWithdrawals.$inferInsert;

/**
 * Leads: prospecção e qualificação de clientes
 */
export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 100 }),
  stage: varchar("stage", { length: 32 }).default("prospect").notNull(),
  value: int("value"),
  assignedTo: int("assigned_to"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Tickets: sistema de atendimento/suporte
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").primaryKey().autoincrement(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  customerId: int("customer_id"),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("open").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium").notNull(),
  category: varchar("category", { length: 100 }),
  channel: varchar("channel", { length: 16 }),
  assignedTo: int("assigned_to"),
  slaDeadline: timestamp("sla_deadline"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  timeSpentMinutes: int("time_spent_minutes").default(0),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Messages: mensagens de WhatsApp/Instagram (outras que não conversation_messages)
 */
export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id"),
  ticketId: int("ticket_id"),
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
export const automationFlows = mysqlTable("automation_flows", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  trigger: text("trigger").notNull(),
  response: text("response").notNull(),
  isActive: int("is_active").default(1).notNull(),
  responseCount: int("response_count").default(0).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AutomationFlow = typeof automationFlows.$inferSelect;
export type InsertAutomationFlow = typeof automationFlows.$inferInsert;

/**
 * VisualFlows: fluxos visuais (nodes/edges)
 */
export const visualFlows = mysqlTable("visual_flows", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  flowData: text("flow_data").notNull(),
  templateType: varchar("template_type", { length: 50 }),
  tags: json("tags"),
  isActive: int("is_active").default(0).notNull(),
  isTestMode: int("is_test_mode").default(0).notNull(),
  executionCount: int("execution_count").default(0).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type VisualFlow = typeof visualFlows.$inferSelect;
export type InsertVisualFlow = typeof visualFlows.$inferInsert;

/**
 * URA (Interactive Voice Response) menus
 */
export const uraMenus = mysqlTable("ura_menus", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  menuData: text("menu_data").notNull(),
  workingHours: text("working_hours"),
  offHoursMessage: text("off_hours_message"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UraMenu = typeof uraMenus.$inferSelect;
export type InsertUraMenu = typeof uraMenus.$inferInsert;

/**
 * WorkflowExecutions: execuções de fluxos visuais
 */
export const workflowExecutions = mysqlTable("workflow_executions", {
  id: int("id").primaryKey().autoincrement(),
  workflowId: int("workflow_id").notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  mode: varchar("mode", { length: 16 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: int("execution_time"),
  error: text("error"),
  triggeredBy: int("triggered_by"),
  triggerData: text("trigger_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * FlowExecutions: execuções de automação (compatibilidade com routers-automation.ts)
 */
export const flowExecutions = mysqlTable("flow_executions", {
  id: int("id").primaryKey().autoincrement(),
  flowId: int("flow_id").notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  trigger: json("trigger").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  input: json("input"),
  error: text("error"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type InsertFlowExecution = typeof flowExecutions.$inferInsert;

/**
 * ExecutionData: dados de cada nó executado em um workflow
 */
export const executionData = mysqlTable("execution_data", {
  id: int("id").primaryKey().autoincrement(),
  executionId: int("execution_id").notNull(),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: int("execution_time"),
  inputData: text("input_data"),
  outputData: text("output_data"),
  error: text("error"),
  retryCount: int("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExecutionData = typeof executionData.$inferSelect;
export type InsertExecutionData = typeof executionData.$inferInsert;

/**
 * SurveyResponses: respostas de pesquisas de satisfação
 */
export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id"),
  customerId: int("customer_id").notNull(),
  rating: int("rating").notNull(),
  feedback: text("feedback"),
  closeReason: varchar("close_reason", { length: 50 }).notNull(),
  agentId: int("agent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

/**
 * QuickReplies: respostas rápidas pré-definidas
 */
export const quickReplies = mysqlTable("quick_replies", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = typeof quickReplies.$inferInsert;

export const crmAuditLogs = mysqlTable("crm_audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: int("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrmAuditLog = typeof crmAuditLogs.$inferSelect;
export type InsertCrmAuditLog = typeof crmAuditLogs.$inferInsert;

export const crmActivities = mysqlTable("crm_activities", {
  id: int("id").primaryKey().autoincrement(),
  subject: varchar("subject", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  assignedTo: int("assigned_to"),
  customerId: int("customer_id"),
  relatedEntity: json("related_entity"),
  reminderSentAt: timestamp("reminder_sent_at"),
  completedAt: timestamp("completed_at"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = typeof crmActivities.$inferInsert;

export const customerTags = mysqlTable("customer_tags", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  tagId: int("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CustomerTag = typeof customerTags.$inferSelect;
export type InsertCustomerTag = typeof customerTags.$inferInsert;

export const crmScripts = mysqlTable("crm_scripts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  script: text("script").notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrmScript = typeof crmScripts.$inferSelect;
export type InsertCrmScript = typeof crmScripts.$inferInsert;

/**
 * CustomFieldDefinitions: definições de campos personalizados para entidades
 */
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").primaryKey().autoincrement(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;

/**
 * CustomFieldValues: valores de campos personalizados para entidades
 */
export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").primaryKey().autoincrement(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id").notNull(),
  fieldDefinitionId: int("field_definition_id").notNull(),
  valueText: text("value_text"),
  updatedBy: int("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;

export const pharmaProducts = mysqlTable("pharma_products", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: int("stock").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PharmaProduct = typeof pharmaProducts.$inferSelect;
export type InsertPharmaProduct = typeof pharmaProducts.$inferInsert;

export const pharmaPurchases = mysqlTable("pharma_purchases", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id"),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
});

export type PharmaPurchase = typeof pharmaPurchases.$inferSelect;
export type InsertPharmaPurchase = typeof pharmaPurchases.$inferInsert;

export const pharmaPurchaseItems = mysqlTable("pharma_purchase_items", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export type PharmaPurchaseItem = typeof pharmaPurchaseItems.$inferSelect;
export type InsertPharmaPurchaseItem = typeof pharmaPurchaseItems.$inferInsert;

export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  ownerId: int("owner_id"),
  accountNumber: varchar("account_number", { length: 50 }),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export const accountContacts = mysqlTable("account_contacts", {
  id: int("id").primaryKey().autoincrement(),
  accountId: int("account_id").notNull(),
  contactId: int("contact_id").notNull(),
  role: varchar("role", { length: 100 }),
  isPrimary: int("is_primary").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AccountContact = typeof accountContacts.$inferSelect;
export type InsertAccountContact = typeof accountContacts.$inferInsert;

export const dealPipelines = mysqlTable("deal_pipelines", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DealPipeline = typeof dealPipelines.$inferSelect;
export type InsertDealPipeline = typeof dealPipelines.$inferInsert;

export const dealStages = mysqlTable("deal_stages", {
  id: int("id").primaryKey().autoincrement(),
  pipelineId: int("pipeline_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  orderIndex: int("order_index").notNull(),
  description: text("description"),
  probability: int("probability"),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DealStage = typeof dealStages.$inferSelect;
export type InsertDealStage = typeof dealStages.$inferInsert;

export const deals = mysqlTable("deals", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  accountId: int("account_id"),
  stageId: int("stage_id"),
  value: decimal("value", { precision: 10, scale: 2 }),
  closeDate: timestamp("close_date"),
  description: text("description"),
  ownerId: int("owner_id"),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

/**
 * ApiConfigurations: tokens e configurações de APIs externas (WhatsApp, Instagram)
 */
export const apiConfigurations = mysqlTable("api_configurations", {
  id: int("id").primaryKey().autoincrement(),
  provider: varchar("provider", { length: 16 }).notNull(),
  token: text("token").notNull(),
  phoneNumberId: varchar("phone_number_id", { length: 255 }),
  pageId: varchar("page_id", { length: 255 }),
  webhookUrl: varchar("webhook_url", { length: 512 }),
  webhookVerifyToken: varchar("webhook_verify_token", { length: 255 }),
  appSecret: varchar("app_secret", { length: 255 }),
  isActive: int("is_active").default(1).notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: varchar("test_status", { length: 16 }).default("not_tested"),
  testMessage: text("test_message"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = typeof apiConfigurations.$inferInsert;

/**
 * BabyShowerGiftPackages: pacotes de presentes (produtos agrupados)
 */
export const babyShowerGiftPackages = mysqlTable("baby_shower_gift_packages", {
  id: int("id").primaryKey().autoincrement(),
  eventId: int("event_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productIds: json("product_ids").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BabyShowerGiftPackage = typeof babyShowerGiftPackages.$inferSelect;
export type InsertBabyShowerGiftPackage = typeof babyShowerGiftPackages.$inferInsert;

/**
 * ConversationTags: tags para organizar conversas
 */
export const conversationTags = mysqlTable("conversation_tags", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull(),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationTag = typeof conversationTags.$inferSelect;
export type InsertConversationTag = typeof conversationTags.$inferInsert;

/**
 * CrmOutboxEvents: fila de eventos de CRM para processamento assíncrono
 */
export const crmOutboxEvents = mysqlTable("crm_outbox_events", {
  id: int("id").primaryKey().autoincrement(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
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
export const crmTasks = mysqlTable("crm_tasks", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customerId: int("customer_id"),
  assignedTo: int("assigned_to"),
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
export const customerTreatments = mysqlTable("customer_treatments", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
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
export const employees = mysqlTable("employees", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").unique(),
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
export const frontendTelemetryEvents = mysqlTable("frontend_telemetry_events", {
  id: int("id").primaryKey().autoincrement(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  properties: json("properties"),
  userId: int("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FrontendTelemetryEvent = typeof frontendTelemetryEvents.$inferSelect;
export type InsertFrontendTelemetryEvent = typeof frontendTelemetryEvents.$inferInsert;

/**
 * QueueAgents: relacionamento entre filas e agentes
 */
export const queueAgents = mysqlTable("queue_agents", {
  id: int("id").primaryKey().autoincrement(),
  queueId: int("queue_id").notNull(),
  agentId: int("agent_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export type QueueAgent = typeof queueAgents.$inferSelect;
export type InsertQueueAgent = typeof queueAgents.$inferInsert;

/**
 * Tags: tags genéricas para customer, tickets, etc.
 */
export const tags = mysqlTable("tags", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * TicketTags: relacionamento many-to-many entre tickets e tags
 */
export const ticketTags = mysqlTable("ticket_tags", {
  id: int("id").primaryKey().autoincrement(),
  ticketId: int("ticket_id").notNull(),
  tagId: int("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const processedWebhookMessages = mysqlTable("processed_webhook_messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  provider: varchar("provider", { length: 16 }).notNull(),
});

export type TicketTag = typeof ticketTags.$inferSelect;
export type InsertTicketTag = typeof ticketTags.$inferInsert;
