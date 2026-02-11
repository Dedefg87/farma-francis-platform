import {
  bigint,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

// Export execution and analytics tables (SQLite-based)
export * from "./schema_executions";

// Export tags tables (SQLite-based)
export * from "./schema_tags";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers/Clients table for CRM
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  cpfCnpj: varchar("cpf_cnpj", { length: 18 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  tags: text("tags"), // JSON array of tags
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive", "blocked"])
    .default("active")
    .notNull(),
  createdBy: int("created_by").references(() => users.id),
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
  action: varchar("action", { length: 100 }).notNull(), // create, update, delete, login, etc
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
  mediaUrl: varchar("media_url", { length: 512 }), // URL for media files
  mediaId: varchar("media_id", { length: 255 }), // Media ID from provider
  mimeType: varchar("mime_type", { length: 100 }), // Media MIME type
  caption: text("caption"), // Media caption
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // Location latitude
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // Location longitude
  timestamp: bigint("timestamp", { mode: "number" }).notNull(), // Unix timestamp from provider
  rawPayload: text("raw_payload"), // Full JSON payload for debugging
  processed: int("processed").default(0).notNull(), // 0 = pending, 1 = processed
  processedAt: timestamp("processed_at"),
  isSurveyResponse: int("is_survey_response").default(0).notNull(), // 0 = normal, 1 = survey response (don't show in UI)
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
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .references(() => users.id)
    .notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram"]).notNull(),
  status: mysqlEnum("status", ["online", "paused", "offline"])
    .default("offline")
    .notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
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
  pauseType: mysqlEnum("pause_type", [
    "lunch",
    "snack",
    "bathroom",
    "other",
  ]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: int("duration_minutes"), // Duração planejada em minutos
  status: mysqlEnum("status", ["active", "completed"])
    .default("active")
    .notNull(),
});

export type AgentPause = typeof agentPauses.$inferSelect;
export type InsertAgentPause = typeof agentPauses.$inferInsert;

/**
 * Queues - Filas de atendimento
 * Gerencia filas de atendimento com agentes e distribuição
 */
export const queues = mysqlTable("queues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"])
    .default("active")
    .notNull(),
  maxConcurrentChats: int("max_concurrent_chats").default(3).notNull(), // Máximo de chats por agente
  priority: int("priority").default(0).notNull(), // Prioridade da fila (maior = mais prioritária)
  color: varchar("color", { length: 7 }).default("#D32F2F"), // Cor da fila em hex
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
  senderId: int("sender_id").references(() => users.id), // ID do agente (null se for cliente)
  senderType: mysqlEnum("sender_type", ["agent", "customer"]).notNull(),
  content: text("content").notNull(),
  // Campos de anexo
  fileUrl: varchar("file_url", { length: 500 }),
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
  name: varchar("name", { length: 255 }).notNull(), // Nome descritivo da configuração
  isActive: boolean("is_active").default(true).notNull(),

  // Configurações gerais (JSON)
  config: json("config").notNull(), // Armazena { accessToken, phoneNumberId, etc }

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
 * CRM - Tags para Segmentação de Clientes
 * Relacionamento Many-to-Many com Clientes
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 7 }).default("#6366f1"), // Cor em hex
  description: text("description"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;
