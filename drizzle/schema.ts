import {
  bigint,
  boolean,
  date,
  decimal,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
, mysqlEnum } from "drizzle-orm/mysql-core";

// Helper para autoincrement
const autoincrement = () => int().autoincrement();

// ==================== CORE MESSAGING TABLES ====================

export const receivedMessages = mysqlTable("received_messages", {
  id: autoincrement().primaryKey(),
  provider: varchar("provider", { length: 16, enum: ["whatsapp", "instagram"] }),
  externalId: varchar("external_id", { length: 255 }),
  fromNumber: varchar("from_number", { length: 100 }),
  fromName: varchar("from_name", { length: 255 }),
  customerId: int("customer_id"),
  ticketId: int("ticket_id"),
  automationFlowId: int("automation_flow_id"),
  messageType: varchar("message_type", { length: 32, enum: ["text","image","audio","video","document","location","contact","sticker","reaction","unknown"] }),
  messageText: text("message_text"),
  caption: text("caption"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  timestamp: bigint("timestamp", { mode: 'number' }),
  mediaUrl: text("media_url"),
  mediaId: varchar("media_id", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: int("file_size"),
  rawPayload: json("raw_payload"),
  processed: int("processed").default(0),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationMessages = mysqlTable("conversation_messages", {
  id: autoincrement().primaryKey(),
  externalId: varchar("external_id", { length: 255 }),
  remoteJid: varchar("remote_jid", { length: 255 }),
  provider: varchar("provider", { length: 16, enum: ["whatsapp", "instagram"] }).default("whatsapp"),
  conversationId: int("conversation_id"),
  senderId: int("sender_id"),
  senderType: varchar("sender_type", { length: 16, enum: ["agent", "customer"] }),
  content: text("content"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: int("file_size"),
});

export const broadcastMessages = mysqlTable("broadcast_messages", {
  id: autoincrement().primaryKey(),
  listId: int("list_id"),
  content: text("content"),
  fileUrl: varchar("file_url", { length: 1000 }),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: int("file_size"),
  sentBy: int("sent_by"),
  totalRecipients: int("total_recipients"),
  successfulSends: int("successful_sends").default(0),
  failedSends: int("failed_sends").default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const broadcastMembersSent = mysqlTable("broadcast_members_sent", {
  id: autoincrement().primaryKey(),
  messageId: int("message_id"),
  customerId: int("customer_id"),
  phone: varchar("phone", { length: 32 }),
  status: varchar("status", { length: 16, enum: ["pending", "sent", "failed"] }).default("pending"),
  error: text("error"),
  sentAt: timestamp("sent_at"),
});

export const crmOutboxEvents = mysqlTable("crm_outbox_events", {
  id: autoincrement().primaryKey(),
  eventName: varchar("event_name", { length: 120 }),
  entityType: varchar("entity_type", { length: 40 }),
  entityId: int("entity_id"),
  actorUserId: int("actor_user_id"),
  payloadJson: text("payload_json"),
  idempotencyKey: varchar("idempotency_key", { length: 120 }),
  status: varchar("status", { length: 16, enum: ["pending", "processed", "failed"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// ==================== REFERENCE TABLES ====================

export const users = mysqlTable("users", {
  id: autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: autoincrement().primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: autoincrement().primaryKey(),
  customerId: int("customer_id"),
  channel: varchar("channel", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  assignedTo: int("assigned_to"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closeReason: varchar("close_reason", { length: 32 }),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  unreadCount: int("unread_count").default(0).notNull(),
  queueId: int("queue_id"),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
});

export const leads = mysqlTable("leads", {
  id: autoincrement().primaryKey(),
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

export const tickets = mysqlTable("tickets", {
  id: autoincrement().primaryKey(),
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

export const visualFlows = mysqlTable("visual_flows", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  flowData: text("flow_data").notNull(),
  isActive: int("is_active").default(0).notNull(),
  isTestMode: int("is_test_mode").default(0).notNull(),
  executionCount: int("execution_count").default(0).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationFlows = mysqlTable("automation_flows", {
  id: autoincrement().primaryKey(),
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

export const uraMenus = mysqlTable("ura_menus", {
  id: autoincrement().primaryKey(),
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

export const queues = mysqlTable("queues", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  maxConcurrentChats: int("max_concurrent_chats").default(3).notNull(),
  priority: int("priority").default(0).notNull(),
  color: varchar("color", { length: 7 }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentStatus = mysqlTable("agent_status", {
  userId: int("user_id").primaryKey(),
  status: varchar("status", { length: 16 }).default("offline").notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  currentConversationId: int("current_conversation_id"),
});

export const agentPauses = mysqlTable("agent_pauses", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  pauseType: mysqlEnum("pause_type", ["lunch","snack","bathroom","other"]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: int("duration_minutes"),
  status: mysqlEnum("status", ["active","completed"]).default("active").notNull(),
});

export const broadcastLists = mysqlTable("broadcast_lists", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const broadcastListMembers = mysqlTable("broadcast_list_members", {
  id: autoincrement().primaryKey(),
  listId: int("list_id").notNull(),
  customerId: int("customer_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// ==================== ADDITIONAL TABLES ====================

export const apiConfigurations = mysqlTable("api_configurations", {
  id: autoincrement().primaryKey(),
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

export const integrationSettings = mysqlTable("integration_settings", {
  id: autoincrement().primaryKey(),
  integrationType: varchar("integration_type", { length: 64 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: json("config").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerEvents = mysqlTable("baby_shower_events", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerProducts = mysqlTable("baby_shower_products", {
  id: autoincrement().primaryKey(),
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

export const babyShowerPurchases = mysqlTable("baby_shower_purchases", {
  id: autoincrement().primaryKey(),
  eventId: int("event_id"),
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

export const babyShowerGiftPackages = mysqlTable("baby_shower_gift_packages", {
  id: autoincrement().primaryKey(),
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

export const babyShowerWithdrawals = mysqlTable("baby_shower_withdrawals", {
  id: autoincrement().primaryKey(),
  eventId: int("event_id").notNull(),
  relatedTaskId: int("related_task_id"),
  withdrawalType: varchar("withdrawal_type", { length: 50 }).notNull(),
  diaperSize: varchar("diaper_size", { length: 50 }),
  quantity: int("quantity").notNull(),
  deliveryMethod: varchar("delivery_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmTasks = mysqlTable("crm_tasks", {
  id: autoincrement().primaryKey(),
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

export const pharmaProducts = mysqlTable("pharma_products", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: int("stock").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pharmaPurchases = mysqlTable("pharma_purchases", {
  id: autoincrement().primaryKey(),
  customerId: int("customer_id"),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
});

export const pharmaPurchaseItems = mysqlTable("pharma_purchase_items", {
  id: autoincrement().primaryKey(),
  purchaseId: int("purchase_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const accounts = mysqlTable("accounts", {
  id: autoincrement().primaryKey(),
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

export const accountContacts = mysqlTable("account_contacts", {
  id: autoincrement().primaryKey(),
  accountId: int("account_id").notNull(),
  contactId: int("contact_id").notNull(),
  role: varchar("role", { length: 100 }),
  isPrimary: int("is_primary").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealPipelines = mysqlTable("deal_pipelines", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dealStages = mysqlTable("deal_stages", {
  id: autoincrement().primaryKey(),
  pipelineId: int("pipeline_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  orderIndex: int("order_index").notNull(),
  description: text("description"),
  probability: int("probability"),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = mysqlTable("deals", {
  id: autoincrement().primaryKey(),
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

export const tags = mysqlTable("tags", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerTags = mysqlTable("customer_tags", {
  id: autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  tagId: int("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmAuditLogs = mysqlTable("crm_audit_logs", {
  id: autoincrement().primaryKey(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: int("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmActivities = mysqlTable("crm_activities", {
  id: autoincrement().primaryKey(),
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

export const crmScripts = mysqlTable("crm_scripts", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  script: text("script").notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customFieldValues = mysqlTable("custom_field_values", {
  id: autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: int("entity_id").notNull(),
  fieldDefinitionId: int("field_definition_id").notNull(),
  valueText: text("value_text"),
  updatedBy: int("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowExecutions = mysqlTable("workflow_executions", {
  id: autoincrement().primaryKey(),
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

export const executionData = mysqlTable("execution_data", {
  id: autoincrement().primaryKey(),
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

export const surveyResponses = mysqlTable("survey_responses", {
  id: autoincrement().primaryKey(),
  conversationId: int("conversation_id"),
  customerId: int("customer_id").notNull(),
  rating: int("rating").notNull(),
  feedback: text("feedback"),
  closeReason: varchar("close_reason", { length: 50 }).notNull(),
  agentId: int("agent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quickReplies = mysqlTable("quick_replies", {
  id: autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: autoincrement().primaryKey(),
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

export const employees = mysqlTable("employees", {
  id: autoincrement().primaryKey(),
  userId: int("user_id").unique(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: timestamp("hire_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const frontendTelemetryEvents = mysqlTable("frontend_telemetry_events", {
  id: autoincrement().primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  properties: json("properties"),
  userId: int("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const queueAgents = mysqlTable("queue_agents", {
  id: autoincrement().primaryKey(),
  queueId: int("queue_id").notNull(),
  agentId: int("agent_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const ticketTags = mysqlTable("ticket_tags", {
  id: autoincrement().primaryKey(),
  ticketId: int("ticket_id").notNull(),
  tagId: int("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationTags = mysqlTable("conversation_tags", {
  id: autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerTreatments = mysqlTable("customer_treatments", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customer_id").notNull(),
  nomeMedicamento: varchar("nome_medicamento", { length: 255 }).notNull(),
  posologiaDiaria: int("posologia_diaria").notNull(),
  qtdCaixa: int("qtd_caixa").notNull(),
  dataUltimaCompra: datetime("data_ultima_compra"),
  dataFimPrevisto: datetime("data_fim_previsto"),
  observacoes: text("observacoes"),
  isActive: int("is_active").default(1).notNull(),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});
