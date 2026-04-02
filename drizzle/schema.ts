import {
  autoIncrement,
  bigint,
  boolean,
  date,
  decimal,
  int,
  json,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// Export execution and analytics tables (SQLite-based)
export * from "./schema_executions";

// Tags tables consolidated in this file.

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers/Clients table for CRM
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 64 }),
  lastPurchaseAt: timestamp("last_purchase_at"),
  ltvValue: decimal("ltv_value", { precision: 10, scale: 2 }).default("0.00"),
  tags: json("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Leads table for sales funnel
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").references(() => customers.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 100 }), // whatsapp, instagram, website, etc
  stage: mysqlEnum("stage", [
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ])
    .default("prospect")
    .notNull(),
  value: int("value"), // potential deal value
  assignedTo: int("assigned_to").references(() => users.id),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Tickets/Atendimentos table
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  customerId: int("customer_id").references(() => customers.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "open",
    "in_progress",
    "pending",
    "resolved",
    "closed",
  ])
    .default("open")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"])
    .default("medium")
    .notNull(),
  category: varchar("category", { length: 100 }),
  channel: mysqlEnum("channel", [
    "whatsapp",
    "instagram",
    "email",
    "phone",
    "web",
  ]),
  assignedTo: int("assigned_to").references(() => users.id),
  slaDeadline: timestamp("sla_deadline"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  timeSpentMinutes: int("time_spent_minutes").default(0),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Accounts (B2B companies) and relations
 */
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }),
  industry: varchar("industry", { length: 120 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  status: mysqlEnum("status", ["active", "inactive"])
    .default("active")
    .notNull(),
  ownerUserId: int("owner_user_id").references(() => users.id),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const accountContacts = mysqlTable("account_contacts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  role: varchar("role", { length: 120 }),
  isPrimary: int("is_primary").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Deals (Opportunities) with pipeline/stages
 */
export const dealPipelines = mysqlTable("deal_pipelines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const dealStages = mysqlTable("deal_stages", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipeline_id")
    .references(() => dealPipelines.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  probability: int("probability").default(0).notNull(), // 0-100
  isWon: int("is_won").default(0).notNull(),
  isLost: int("is_lost").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id").references(() => accounts.id),
  customerId: int("customer_id").references(() => customers.id),
  pipelineId: int("pipeline_id")
    .references(() => dealPipelines.id)
    .notNull(),
  stageId: int("stage_id")
    .references(() => dealStages.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  amountCents: int("amount_cents"),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  closeDate: timestamp("close_date"),
  status: mysqlEnum("status", ["open", "won", "lost"])
    .default("open")
    .notNull(),
  ownerUserId: int("owner_user_id").references(() => users.id),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Tasks / reminders
 */
export const crmTasks = mysqlTable("crm_tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueAt: timestamp("due_at"),
  status: mysqlEnum("status", ["open", "done", "cancelled"])
    .default("open")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"])
    .default("medium")
    .notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 40 }),
  relatedEntityId: int("related_entity_id"),
  assignedTo: int("assigned_to").references(() => users.id),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completed_at"),
});

/**
 * Custom fields (definitions + values)
 */
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(), // customer/account/lead/deal/ticket
  key: varchar("key", { length: 80 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  fieldType: mysqlEnum("field_type", [
    "text",
    "number",
    "date",
    "boolean",
    "select",
  ]).notNull(),
  optionsJson: text("options_json"),
  isRequired: int("is_required").default(0).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id").notNull(),
  fieldDefinitionId: int("field_definition_id")
    .references(() => customFieldDefinitions.id, { onDelete: "cascade" })
    .notNull(),
  valueText: text("value_text"),
  updatedBy: int("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Ticket comments/notes
 */
export const ticketComments = mysqlTable("ticket_comments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .notNull(),
  userId: int("user_id").references(() => users.id),
  content: text("content").notNull(),
  isInternal: int("is_internal").default(0).notNull(), // 0 = false, 1 = true (internal notes vs customer-visible)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * CRM enterprise foundation tables
 * - crm_outbox_events: async domain events (no UI impact)
 * - crm_audit_logs: immutable audit trail (compliance)
 * - crm_activities: timeline items (read model)
 * - frontend_telemetry_events: optional UI event capture (batched)
 */

export const crmOutboxEvents = mysqlTable("crm_outbox_events", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("event_name", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id"),
  actorUserId: int("actor_user_id").references(() => users.id),
  payloadJson: text("payload_json"),
  idempotencyKey: varchar("idempotency_key", { length: 120 }),
  status: mysqlEnum("status", ["pending", "processed", "failed"])
    .default("pending")
    .notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const crmAuditLogs = mysqlTable("crm_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id"),
  actorUserId: int("actor_user_id").references(() => users.id),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  requestId: varchar("request_id", { length: 80 }),
  ip: varchar("ip", { length: 80 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmActivities = mysqlTable("crm_activities", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id").notNull(),
  activityType: varchar("activity_type", { length: 40 }).notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  metadataJson: text("metadata_json"),
  actorUserId: int("actor_user_id").references(() => users.id),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const frontendTelemetryEvents = mysqlTable("frontend_telemetry_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  page: varchar("page", { length: 160 }),
  eventName: varchar("event_name", { length: 120 }).notNull(),
  payloadJson: text("payload_json"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = typeof ticketComments.$inferInsert;

/**
 * Interactions history (CRM timeline)
 */
export const interactions = mysqlTable("interactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: int("ticket_id").references(() => tickets.id),
  leadId: int("lead_id").references(() => leads.id),
  type: mysqlEnum("type", [
    "call",
    "email",
    "whatsapp",
    "instagram",
    "meeting",
    "note",
  ]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  userId: int("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = typeof interactions.$inferInsert;

/**
 * Employees extended information
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  cpf: varchar("cpf", { length: 14 }).unique(),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  hireDate: timestamp("hire_date"),
  status: mysqlEnum("status", ["active", "inactive", "vacation"])
    .default("active")
    .notNull(),
  skills: text("skills"), // JSON array
  photoUrl: varchar("photo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Automation flows for WhatsApp/Instagram
 */
export const automationFlows = mysqlTable("automation_flows", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "both"]).notNull(),
  trigger: text("trigger").notNull(), // keywords separated by comma
  response: text("response").notNull(), // auto-response message
  isActive: int("is_active").default(1).notNull(), // 0 = inactive, 1 = active
  responseCount: int("response_count").default(0).notNull(), // number of times triggered
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AutomationFlow = typeof automationFlows.$inferSelect;
export type InsertAutomationFlow = typeof automationFlows.$inferInsert;

/**
 * Messages from WhatsApp/Instagram
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").references(() => customers.id),
  ticketId: int("ticket_id").references(() => tickets.id),
  channel: mysqlEnum("channel", ["whatsapp", "instagram"]).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  content: text("content").notNull(),
  messageId: varchar("message_id", { length: 255 }), // external message ID
  status: mysqlEnum("status", ["sent", "delivered", "read", "failed"]),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * File attachments
 */
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticket_id").references(() => tickets.id),
  customerId: int("customer_id").references(() => customers.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("file_url", { length: 1000 }).notNull(), // S3 URL
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: int("file_size"), // in bytes
  uploadedBy: int("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

/**
 * Audit log for critical actions
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // create, up delete, login, etc
  entityType: varchar("entity_type", { length: 100 }), // ticket, customer, user, etc
  entityId: int("entity_id"),
  changes: text("changes"), // JSON of what changed
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  type: mysqlEnum("type", ["ticket", "lead", "system", "goal"]).notNull(),
  isRead: int("is_read").default(0).notNull(), // 0 = false, 1 = true
  relatedId: int("related_id"), // ticket_id, lead_id, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * AI chat history for assistant
 */
export const aiChats = mysqlTable("ai_chats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  ticketId: int("ticket_id").references(() => tickets.id),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON for additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = typeof aiChats.$inferInsert;

/**
 * Visual automation flows (N8N-style)
 */
export const visualFlows = mysqlTable("visual_flows", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  flowData: text("flow_data").notNull(), // JSON: {nodes: [], edges: []}
  isActive: int("is_active").default(0).notNull(),
  isTestMode: int("is_test_mode").default(0).notNull(), // Test mode flag
  executionCount: int("execution_count").default(0).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type VisualFlow = typeof visualFlows.$inferSelect;
export type InsertVisualFlow = typeof visualFlows.$inferInsert;

/**
 * URA (Interactive Voice Response) menu configuration
 */
export const uraMenus = mysqlTable("ura_menus", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  menuData: text("menu_data").notNull(), // JSON: [{option: "1", label: "Vendas", action: "transfer", value: "dept_sales"}]
  workingHours: text("working_hours"), // JSON: {start: "08:00", end: "18:00", days: [1,2,3,4,5]}
  offHoursMessage: text("off_hours_message"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UraMenu = typeof uraMenus.$inferSelect;
export type InsertUraMenu = typeof uraMenus.$inferInsert;

/**
 * API configurations for WhatsApp Business and Instagram
 * Tokens are encrypted before storage
 */
export const apiConfigurations = mysqlTable("api_configurations", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["whatsapp", "instagram"]).notNull(),
  token: text("token").notNull(), // Encrypted
  phoneNumberId: varchar("phone_number_id", { length: 255 }), // WhatsApp only
  pageId: varchar("page_id", { length: 255 }), // Instagram only
  webhookUrl: varchar("webhook_url", { length: 512 }),
  webhookVerifyToken: varchar("webhook_verify_token", { length: 255 }),
  appSecret: varchar("app_secret", { length: 255 }), // For HMAC signature validation
  isActive: int("is_active").default(1).notNull(),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: mysqlEnum("test_status", [
    "success",
    "failed",
    "not_tested",
  ]).default("not_tested"),
  testMessage: text("test_message"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = typeof apiConfigurations.$inferInsert;

/**
 * Received messages from WhatsApp and Instagram webhooks
 * Stores all incoming messages for processing and history
 */
export const receivedMessages = mysqlTable("received_messages", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["whatsapp", "instagram"]).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(), // Message ID from provider
  fromNumber: varchar("from_number", { length: 100 }).notNull(), // Phone number or Instagram user ID
  fromName: varchar("from_name", { length: 255 }), // Sender name if available
  messageType: mysqlEnum("message_type", [
    "text",
    "image",
    "audio",
    "video",
    "document",
    "location",
    "contact",
    "sticker",
    "reaction",
    "unknown",
  ]).notNull(),
  messageText: text("message_text"), // Text content
  mediaUrl: longtext("media_url"), // URL for media files (can be base64 data URL)
  mediaId: varchar("media_id", { length: 255 }), // Media ID from provider
  mimeType: varchar("mime_type", { length: 100 }), // Media MIME type
  caption: text("caption"), // Media caption
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // Location latitude
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // Location longitude
  timestamp: text("timestamp").notNull(), // Unix timestamp from provider (stored as text)
  rawPayload: longtext("raw_payload"), // Full JSON payload for debugging
  processed: int("processed").default(0).notNull(), // 0 = pending, 1 = processed
  processedAt: timestamp("processed_at"),
  customerId: int("customer_id").references(() => customers.id), // Link to customer if identified
  ticketId: int("ticket_id").references(() => tickets.id), // Link to ticket if created
  automationFlowId: int("automation_flow_id").references(
    () => automationFlows.id
  ), // Flow that processed this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReceivedMessage = typeof receivedMessages.$inferSelect;
export type InsertReceivedMessage = typeof receivedMessages.$inferInsert;

/**
 * Workflow Executions - Histórico de execuções de workflows
 * Armazena cada execução com status, tempo, dados e logs
 */
export const workflowExecutions = mysqlTable("workflow_executions", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id")
    .references(() => visualFlows.id)
    .notNull(),
  status: mysqlEnum("status", [
    "running",
    "success",
    "error",
    "waiting",
    "canceled",
  ]).notNull(),
  mode: mysqlEnum("mode", [
    "manual",
    "trigger",
    "webhook",
    "schedule",
  ]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: int("execution_time"), // Milliseconds
  error: text("error"), // Error message if failed
  triggeredBy: int("triggered_by").references(() => users.id), // User who triggered (for manual)
  triggerData: text("trigger_data"), // JSON with trigger input data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * Execution Data - Dados de cada nó executado
 * Armazena input, output, erro e tempo de cada nó
 */
export const executionData = mysqlTable("execution_data", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("execution_id")
    .references(() => workflowExecutions.id)
    .notNull(),
  nodeId: varchar("node_id", { length: 255 }).notNull(), // ID do nó no workflow
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["success", "error", "skipped"]).notNull(),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: int("execution_time"), // Milliseconds
  inputData: text("input_data"), // JSON with input
  outputData: text("output_data"), // JSON with output
  error: text("error"), // Error message if failed
  retryCount: int("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExecutionData = typeof executionData.$inferSelect;
export type InsertExecutionData = typeof executionData.$inferInsert;

/**
 * Workflow Credentials - Credenciais criptografadas
 * Armazena credenciais de APIs de forma segura
 */
export const workflowCredentials = mysqlTable("workflow_credentials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // http, oauth2, api_key, database, etc
  data: text("data").notNull(), // Encrypted JSON with credentials
  createdBy: int("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowCredential = typeof workflowCredentials.$inferSelect;
export type InsertWorkflowCredential = typeof workflowCredentials.$inferInsert;

/**
 * Workflow Webhooks - URLs únicas para cada workflow
 * Permite workflows serem acionados por webhooks externos
 */
export const workflowWebhooks = mysqlTable("workflow_webhooks", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id")
    .references(() => visualFlows.id)
    .notNull(),
  webhookId: varchar("webhook_id", { length: 255 }).notNull().unique(), // UUID único
  path: varchar("path", { length: 255 }).notNull(), // /webhook/abc123
  method: mysqlEnum("method", [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ]).notNull(),
  isActive: int("is_active").default(1).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: int("trigger_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkflowWebhook = typeof workflowWebhooks.$inferSelect;
export type InsertWorkflowWebhook = typeof workflowWebhooks.$inferInsert;

/**
 * Workflow Schedules - Agendamentos com cron
 * Permite workflows serem executados automaticamente
 */
export const workflowSchedules = mysqlTable("workflow_schedules", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id")
    .references(() => visualFlows.id)
    .notNull(),
  cronExpression: varchar("cron_expression", { length: 255 }).notNull(), // 0 0 * * * *
  timezone: varchar("timezone", { length: 100 })
    .default("America/Sao_Paulo")
    .notNull(),
  isActive: int("is_active").default(1).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  runCount: int("run_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowSchedule = typeof workflowSchedules.$inferSelect;
export type InsertWorkflowSchedule = typeof workflowSchedules.$inferInsert;

/**
 * ========================================
 * SISTEMA DE ATENDIMENTO (AGENT AREA)
 * ========================================
 */

/**
 * Conversations - Conversas de atendimento
 * Armazena conversas com clientes via WhatsApp/Instagram
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").references(() => customers.id),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  queueId: int("queue_id").references(() => queues.id), // Fila de atendimento
  channel: mysqlEnum("channel", ["whatsapp", "instagram"]).notNull(),
  status: mysqlEnum("status", ["open", "assigned", "closed"])
    .default("open")
    .notNull(),
  assignedTo: int("assigned_to").references(() => users.id), // Agente responsável
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closeReason: mysqlEnum("close_reason", [
    "venda",
    "orcamento",
    "conversa_anterior",
    "engano",
  ]),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  unreadCount: int("unread_count").default(0).notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Quick Replies - Mensagens prontas
 * Respostas rápidas para agilizar atendimento
 */
export const quickReplies = mysqlTable("quick_replies", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }), // saudacao, endereco, pagamento, etc
  createdBy: int("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = typeof quickReplies.$inferInsert;

/**
 * Agent Status - Status dos agentes
 * Controla se agente está online/pausado em cada canal
 */
export const agentStatus = mysqlTable("agent_status", {
  userId: int("user_id")
    .primaryKey()
    .references(() => users.id)
    .notNull(),
  status: varchar("status", { length: 16 }).default("offline").notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  currentConversationId: int("current_conversation_id"),
});

export type AgentStatus = typeof agentStatus.$inferSelect;
export type InsertAgentStatus = typeof agentStatus.$inferInsert;

/**
 * Queue Settings - Configurações de filas
 * Define regras para filas de atendimento
 */
export const queueSettings = mysqlTable("queue_settings", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram"]).notNull(),
  maxWaitMinutes: int("max_wait_minutes").default(15).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type QueueSetting = typeof queueSettings.$inferSelect;
export type InsertQueueSetting = typeof queueSettings.$inferInsert;

/**
 * Agent Pauses - Pausas dos agentes
 * Registra quando agentes fazem pausas (almoço, lanche, etc)
 */
export const agentPauses = mysqlTable("agent_pauses", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason"),
  pauseType: varchar("pause_type", { length: 32 }),
  durationMinutes: int("duration_minutes"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 16 }).default("active").notNull(),
});

export type AgentPause = typeof agentPauses.$inferSelect;
export type InsertAgentPause = typeof agentPauses.$inferInsert;

/**
 * Queues - Filas de atendimento
 * Gerencia filas de atendimento com agentes e distribuição
 */
export const queues = mysqlTable("queues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  priority: int("priority").default(0).notNull(),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Queue = typeof queues.$inferSelect;
export type InsertQueue = typeof queues.$inferInsert;

/**
 * Queue Agents - Agentes atribuídos a filas
 * Relacionamento muitos-para-muitos entre agentes e filas
 */
export const queueAgents = mysqlTable("queue_agents", {
  id: int("id").autoincrement().primaryKey(),
  queueId: int("queue_id")
    .references(() => queues.id)
    .notNull(),
  agentId: int("agent_id")
    .references(() => users.id)
    .notNull(),
  isActive: int("is_active").default(1).notNull(), // Agente ativo na fila?
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type QueueAgent = typeof queueAgents.$inferSelect;
export type InsertQueueAgent = typeof queueAgents.$inferInsert;

/**
 * Conversation Messages - Mensagens de conversas de atendimento
 * Armazena mensagens trocadas entre agentes e clientes
 */
export const conversationMessages = mysqlTable("conversation_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  externalId: varchar("external_id", { length: 255 }), // Evolution API message ID for idempotency
  remoteJid: varchar("remote_jid", { length: 255 }), // JID do remetente (WhatsApp)
  provider: mysqlEnum("provider", ["whatsapp", "instagram"]).default("whatsapp"),
  senderId: int("sender_id").references(() => users.id), // ID do agente (null se for cliente)
  senderType: mysqlEnum("sender_type", ["agent", "customer"]).notNull(),
  content: text("content").notNull(),
  // Campos de anexo
  fileUrl: longtext("file_url"), // Can contain base64 data URLs
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }), // MIME type
  fileSize: int("file_size"), // Tamanho em bytes
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage =
  typeof conversationMessages.$inferInsert;

/**
 * Internal Messages - Mensagens internas entre Admin e Agente
 * Não aparecem para o cliente, apenas como notificação para o agente
 */
export const internalMessages = mysqlTable("internal_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  senderId: int("sender_id")
    .references(() => users.id)
    .notNull(), // Quem enviou (admin)
  recipientId: int("recipient_id")
    .references(() => users.id)
    .notNull(), // Quem recebe (agente)
  content: text("content").notNull(),
  readAt: timestamp("read_at"), // Quando o agente leu
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = typeof internalMessages.$inferInsert;

/**
 * Tags - Etiquetas para categorizar conversas
 * NOTA: Tabelas criadas diretamente no banco via SQL
 * Comentadas para evitar conflitos TypeScript
 */
// export const tags = mysqlTable("tags", {
//   id: int("id").autoincrement().primaryKey(),
//   name: varchar("name", { length: 50 }).notNull().unique(),
//   color: varchar("color", { length: 7 }).notNull(),
//   description: text("description"),
//   createdBy: int("created_by").references(() => users.id),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
// });

// export type Tag = typeof tags.$inferSelect;
// export type InsertTag = typeof tags.$inferInsert;

// export const conversationTags = mysqlTable("conversation_tags", {
//   id: int("id").autoincrement().primaryKey(),
//   conversationId: int("conversation_id").references(() => conversations.id).notNull(),
//   tagId: int("tag_id").references(() => tags.id).notNull(),
//   addedBy: int("added_by").references(() => users.id),
//   addedAt: timestamp("added_at").defaultNow().notNull(),
// });

// export type ConversationTag = typeof conversationTags.$inferSelect;
// export type InsertConversationTag = typeof conversationTags.$inferInsert;

// export const customerNotes = mysqlTable("customer_notes", {
//   id: int("id").autoincrement().primaryKey(),
//   customerId: int("customer_id").references(() => customers.id).notNull(),
//   note: text("note").notNull(),
//   createdBy: int("created_by").references(() => users.id).notNull(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
// });

// export type CustomerNote = typeof customerNotes.$inferSelect;
// export type InsertCustomerNote = typeof customerNotes.$inferInsert;

/**
 * Integration Settings - Configurações de integrações externas
 * Armazena credenciais e configurações para WhatsApp, Instagram, Evolution API, etc.
 */
export const integrationSettings = mysqlTable("integration_settings", {
  id: int("id").autoincrement().primaryKey(),
  integrationType: mysqlEnum("integration_type", [
    "whatsapp_business",
    "instagram_graph",
    "evolution_api",
    "telegram",
    "email",
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: int("is_active").default(1).notNull(),
  config: json("config").notNull(),

  // Metadados
  createdBy: int("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastTestedAt: timestamp("last_tested_at"), // Última vez que a conexão foi testada
  testStatus: mysqlEnum("test_status", [
    "success",
    "failed",
    "pending",
  ]).default("pending"),
  testMessage: text("test_message"), // Mensagem de erro/sucesso do último teste
});

export type IntegrationSetting = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSetting = typeof integrationSettings.$inferInsert;

/**
 * CRM - Customer Treatments (Medicamentos de Uso Contínuo)
 * Armazena informações sobre tratamentos e medicamentos de clientes
 */
export const customerTreatments = mysqlTable("customer_treatments", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  nomeMedicamento: varchar("nome_medicamento", { length: 255 }).notNull(),
  posologiaDiaria: int("posologia_diaria").notNull(), // Qtd comprimidos/dia
  qtdCaixa: int("qtd_caixa").notNull(), // Qtd total na caixa
  dataUltimaCompra: timestamp("data_ultima_compra"),
  dataFimPrevisto: timestamp("data_fim_previsto"), // Campo calculado para query performática
  observacoes: text("observacoes"),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CustomerTreatment = typeof customerTreatments.$inferSelect;
export type InsertCustomerTreatment = typeof customerTreatments.$inferInsert;

/**
 * PharmaCore - Products catalog (optional enrichment)
 */
export const pharmaProducts = mysqlTable("pharma_products", {
  ean: varchar("ean", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", [
    "medicamento",
    "perfumaria",
    "outros",
  ]).default("outros"),
  substance: varchar("substance", { length: 255 }),
  daysDuration: int("days_duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PharmaProduct = typeof pharmaProducts.$inferSelect;
export type InsertPharmaProduct = typeof pharmaProducts.$inferInsert;

/**
 * PharmaCore - Purchase history (ingested from PDV/ERP or manual)
 */
export const pharmaPurchases = mysqlTable("pharma_purchases", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  externalId: varchar("external_id", { length: 80 }), // id from ERP/PDV
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).default("0"),
  channel: mysqlEnum("channel", [
    "loja",
    "delivery",
    "whatsapp",
    "outros",
  ]).default("outros"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PharmaPurchase = typeof pharmaPurchases.$inferSelect;
export type InsertPharmaPurchase = typeof pharmaPurchases.$inferInsert;

export const pharmaPurchaseItems = mysqlTable("pharma_purchase_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseId: int("purchase_id")
    .references(() => pharmaPurchases.id, { onDelete: "cascade" })
    .notNull(),
  productEan: varchar("product_ean", { length: 32 }).references(
    () => pharmaProducts.ean,
    { onDelete: "set null" }
  ),
  productName: varchar("product_name", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).default("0"),
});

export type PharmaPurchaseItem = typeof pharmaPurchaseItems.$inferSelect;
export type InsertPharmaPurchaseItem = typeof pharmaPurchaseItems.$inferInsert;

/**
 * CRM - Tags para Segmentação de Clientes
 * Relacionamento Many-to-Many com Clientes
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
  icon: varchar("icon", { length: 50 }),
  description: text("description"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversationTags = mysqlTable("conversation_tags", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: varchar("conversationId", { length: 200 }).notNull(),
  tagId: int("tagId")
    .notNull()
    .references(() => tags.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ticketTags = mysqlTable("ticket_tags", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  tagId: int("tagId")
    .notNull()
    .references(() => tags.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * CRM - Relacionamento Cliente-Tags
 */
export const customerTags = mysqlTable("customer_tags", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  tagId: int("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
  addedBy: int("added_by").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type CustomerTag = typeof customerTags.$inferSelect;
export type InsertCustomerTag = typeof customerTags.$inferInsert;

/**
 * Survey Responses - Respostas de Pesquisas de Satisfação
 * Armazena respostas de pesquisas de satisfação após encerramento de conversas
 */
export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  customerId: int("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  rating: int("rating").notNull(), // 1-5 rating
  feedback: text("feedback"), // Optional feedback text
  closeReason: varchar("close_reason", { length: 50 }).notNull(), // venda, orcamento, etc
  agentId: int("agent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * CRM - Scripts/Templates (mensagens prontas)
 * Stored as company-wide templates; returned by crm.getScripts.
 */
export const crmScripts = mysqlTable("crm_scripts", {
  code: varchar("code", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  template: text("template").notNull(),
  variablesJson: text("variables_json"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrmScript = typeof crmScripts.$inferSelect;
export type InsertCrmScript = typeof crmScripts.$inferInsert;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

/**
 * Broadcast Lists - Listas de Transmissão
 * Permite criar listas de até 50 contatos para envio de mensagens em massa
 */
export const broadcastLists = mysqlTable("broadcast_lists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").references(() => users.id).notNull(),
  status: mysqlEnum("status", ["active", "paused", "deleted"]).default("active").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BroadcastList = typeof broadcastLists.$inferSelect;
export type InsertBroadcastList = typeof broadcastLists.$inferInsert;

/**
 * Broadcast List Members - Membros das Listas de Transmissão
 * Relaciona contatos às listas (máximo 50 por lista)
 */
export const broadcastListMembers = mysqlTable("broadcast_list_members", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("list_id")
    .references(() => broadcastLists.id)
    .notNull(),
  customerId: int("customer_id")
    .references(() => customers.id)
    .notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type BroadcastListMember = typeof broadcastListMembers.$inferSelect;
export type InsertBroadcastListMember =
  typeof broadcastListMembers.$inferInsert;

/**
 * Broadcast Messages - Mensagens enviadas em listas de transmissão
 * Registra o histórico de mensagens enviadas
 */
export const broadcastMessages = mysqlTable("broadcast_messages", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("list_id")
    .references(() => broadcastLists.id)
    .notNull(),
  messageText: text("content").notNull(),
  caption: text("caption"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: int("file_size"),
  senderId: int("sender_id")
    .references(() => users.id)
    .notNull(),
  senderType: varchar("sender_type", { length: 50 }).default("agent").notNull(),
  totalRecipients: int("total_recipients").notNull(),
  successfulSends: int("successful_sends").default(0),
  failedSends: int("failed_sends").default(0),
  status: varchar("status", { length: 16 }).default("sending").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  errorMessage: text("error_message"),
});

export type BroadcastMessage = typeof broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = typeof broadcastMessages.$inferInsert;

/**
 * ============================================================
 * MÓDULO CHÁ DE BEBÊ FARMA FRANCIS
 * Sistema de eventos virtuais para arrecadação de fraldas/presentes
 * ============================================================
 */

/**
 * Eventos Chá de Bebê - Pais criam eventos e recebem "Carteira Virtual"
 */
export const babyShowerEvents = mysqlTable("baby_shower_events", {
  id: int("id").autoincrement().primaryKey(),
  // Relacionamento com a mãe (customer)
  motherCustomerId: int("mother_customer_id")
    .references(() => customers.id)
    .notNull(),
  // Dados do Evento
  eventCode: varchar("event_code", { length: 20 }).notNull().unique(), // Ex: "CHA202503001"
  eventName: varchar("event_name", { length: 255 }).notNull(), // Ex: "Chá da Maria"
  babyName: varchar("baby_name", { length: 255 }), // Nome do bebê
  expectedDueDate: date("expected_due_date"), // Data prevista do parto
  eventDate: date("event_date"), // Data do evento físico (se houver)
  status: mysqlEnum("status", ["active", "closed", "cancelled"])
    .default("active")
    .notNull(),
  // WhatsApp para contato (editável)
  whatsappNumber: varchar("whatsapp_number", { length: 20 }), // Ex: "5531986337081"
  // Carteira Virtual (saldo em valor monetário)
  walletBalance: decimal("wallet_balance", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  // Contadores físicos (para controle de estoque)
  totalDiapersCount: int("total_diapers_count").default(0), // Total fraldas em estoque virtual
  availableDiapersCount: int("available_diapers_count").default(0), // Disponíveis para retirada
  // Meta e estatísticas
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }), // Meta de arrecadação
  totalGuests: int("total_guests").default(0), // Total de convidados que compraram
  // URLs de compartilhamento
  publicLink: varchar("public_link", { length: 500 }), // Link para convidados comprarem
  // Mensagem personalizada para convidados
  welcomeMessage: text("welcome_message"), // Mensagem carinhosa exibida na página pública
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export type BabyShowerEvent = typeof babyShowerEvents.$inferSelect;
export type InsertBabyShowerEvent = typeof babyShowerEvents.$inferInsert;

/**
 * Cotas/Pacotes disponíveis para compra
 */
export const babyShowerGiftPackages = mysqlTable("baby_shower_gift_packages", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("event_id")
    .references(() => babyShowerEvents.id, { onDelete: "cascade" })
    .notNull(),
  // Configuração da Cota
  packageName: varchar("package_name", { length: 120 }).notNull(), // Ex: "Pacote Fraldas P"
  description: text("description"),
  // Imagem do produto
  imageUrl: text("image_url"), // URL da imagem (upload ou externa, pode ser base64)
  // Tipo de presente
  giftType: mysqlEnum("gift_type", ["diapers", "wipes", "money", "product"])
    .default("diapers")
    .notNull(),
  // Quantidade representada (ex: 1 pacote = 20 fraldas)
  quantityRepresented: int("quantity_represented").default(1),
  sizeLabel: varchar("size_label", { length: 20 }), // Ex: "P", "M", "G", "GG"
  // Valores
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stockLimit: int("stock_limit"), // Limite de cotas deste tipo (null = ilimitado)
  // Contadores
  soldCount: int("sold_count").default(0),
  isActive: int("is_active").default(1).notNull(),
  // Ordem de exibição (drag-and-drop)
  displayOrder: int("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BabyShowerGiftPackage = typeof babyShowerGiftPackages.$inferSelect;
export type InsertBabyShowerGiftPackage =
  typeof babyShowerGiftPackages.$inferInsert;

/**
 * Compras/Cotas realizadas por convidados
 */
export const babyShowerPurchases = mysqlTable("baby_shower_purchases", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("event_id")
    .references(() => babyShowerEvents.id, { onDelete: "cascade" })
    .notNull(),
  packageId: int("package_id")
    .references(() => babyShowerGiftPackages.id)
    .notNull(),
  // Dados do convidado (lead no CRM)
  guestCustomerId: int("guest_customer_id").references(() => customers.id), // Pode ser nulo se convidado não identificado
  // Dados da compra
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  guestPhone: varchar("guest_phone", { length: 20 }),
  guestEmail: varchar("guest_email", { length: 320 }),
  // Mensagem para o bebê (opcional)
  messageToParents: text("message_to_parents"),
  // Status do pagamento
  paymentStatus: mysqlEnum("payment_status", [
    "pending",
    "paid",
    "failed",
    "refunded",
  ])
    .default("pending")
    .notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  // Dados do pagamento
  paymentMethod: varchar("payment_method", { length: 50 }), // pix, credit_card, etc
  paymentReference: varchar("payment_reference", { length: 255 }), // ID da transação
  paidAt: timestamp("paid_at"),
  // Notificação enviada
  notificationSent: int("notification_sent").default(0),
  notificationSentAt: timestamp("notification_sent_at"),
  // Token único para confirmação de pagamento via link
  confirmationToken: varchar("confirmation_token", { length: 64 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BabyShowerPurchase = typeof babyShowerPurchases.$inferSelect;
export type InsertBabyShowerPurchase = typeof babyShowerPurchases.$inferInsert;

/**
 * Retiradas de fraldas pelo caixa (estoque virtual → físico)
 */
export const babyShowerWithdrawals = mysqlTable("baby_shower_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("event_id")
    .references(() => babyShowerEvents.id, { onDelete: "cascade" })
    .notNull(),
  // Tarefa relacionada no sistema (integração com crm_tasks)
  relatedTaskId: int("related_task_id").references(() => crmTasks.id),
  // Dados da retirada
  withdrawalType: mysqlEnum("withdrawal_type", [
    "diapers",
    "wipes",
    "money",
  ])
    .default("diapers")
    .notNull(),
  // Se for fraldas
  diaperSize: varchar("diaper_size", { length: 20 }), // P, M, G, GG
  quantity: int("quantity").notNull(),
  // Acesso ao caixa
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  fulfilledAt: timestamp("fulfilled_at"),
  // Status
  status: mysqlEnum("status", [
    "requested",
    "preparing",
    "ready",
    "delivered",
    "cancelled",
  ])
    .default("requested")
    .notNull(),
  // Quem atendeu
  fulfilledBy: int("fulfilled_by").references(() => users.id),
  // Método de entrega
  deliveryMethod: mysqlEnum("delivery_method", ["pickup", "delivery"])
    .default("pickup")
    .notNull(),
  notes: text("notes"),
});

export type BabyShowerWithdrawal = typeof babyShowerWithdrawals.$inferSelect;
export type InsertBabyShowerWithdrawal =
  typeof babyShowerWithdrawals.$inferInsert;

// broadcast membership tracking
export const broadcastMembersSent = mysqlTable("broadcast_members_sent", {
  id: int("id").primaryKey().autoincrement(),
  broadcastMessageId: int("message_id").notNull(),
  customerId: int("customer_id").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

export type BroadcastMemberSent = typeof broadcastMembersSent.$inferSelect;
export type InsertBroadcastMemberSent =
  typeof broadcastMembersSent.$inferInsert;

// webhook idempotency table
export const processedWebhookMessages = mysqlTable("processed_webhook_messages", {
  id: varchar("id", { length: 255 }).primaryKey(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  provider: varchar("provider", { length: 16 }),
});

export type ProcessedWebhookMessage = typeof processedWebhookMessages.$inferSelect;
export type InsertProcessedWebhookMessage =
  typeof processedWebhookMessages.$inferInsert;

export * from './schema_logs';
