// Additional tables needed by the application (may need to be created via migrations)

export const apiConfigurations = mysqlTable("api_configurations", {
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
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerEvents = mysqlTable("baby_shower_events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerProducts = mysqlTable("baby_shower_products", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  sold: integer("sold").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerPurchases = mysqlTable("baby_shower_purchases", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),
  productId: integer("product_id").notNull(),
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 32 }),
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  whatsappNumber: varchar("whatsapp_number", { length: 32 }),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerGiftPackages = mysqlTable("baby_shower_gift_packages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productIds: jsonb("product_ids").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const babyShowerWithdrawals = mysqlTable("baby_shower_withdrawals", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  relatedTaskId: integer("related_task_id"),
  withdrawalType: varchar("withdrawal_type", { length: 50 }).notNull(),
  diaperSize: varchar("diaper_size", { length: 50 }),
  quantity: integer("quantity").notNull(),
  deliveryMethod: varchar("delivery_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmOutboxEvents = mysqlTable("crm_outbox_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 120 }),
  entityType: varchar("entity_type", { length: 40 }),
  entityId: integer("entity_id"),
  actorUserId: integer("actor_user_id"),
  payload: jsonb("payload"),
  payloadJson: text("payload_json"),
  idempotencyKey: varchar("idempotency_key", { length: 120 }),
  status: varchar("status", { length: 16, enum: ["pending", "processed", "failed"] }).default("pending"),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const crmTasks = mysqlTable("crm_tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  customerId: integer("customer_id"),
  assignedTo: integer("assigned_to"),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 16 }).default("medium"),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pharmaProducts = mysqlTable("pharma_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pharmaPurchases = mysqlTable("pharma_purchases", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
});

export const pharmaPurchaseItems = mysqlTable("pharma_purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const accounts = mysqlTable("accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  ownerId: integer("owner_id"),
  accountNumber: varchar("account_number", { length: 50 }),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountContacts = mysqlTable("account_contacts", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  contactId: integer("contact_id").notNull(),
  role: varchar("role", { length: 100 }),
  isPrimary: integer("is_primary").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealPipelines = mysqlTable("deal_pipelines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dealStages = mysqlTable("deal_stages", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  description: text("description"),
  probability: integer("probability"),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = mysqlTable("deals", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  accountId: integer("account_id"),
  stageId: integer("stage_id"),
  value: decimal("value", { precision: 10, scale: 2 }),
  closeDate: timestamp("close_date"),
  description: text("description"),
  ownerId: integer("owner_id"),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = mysqlTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerTags = mysqlTable("customer_tags", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmAuditLogs = mysqlTable("crm_audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crmActivities = mysqlTable("crm_activities", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  assignedTo: integer("assigned_to"),
  customerId: integer("customer_id"),
  relatedEntity: jsonb("related_entity"),
  reminderSentAt: timestamp("reminder_sent_at"),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const crmScripts = mysqlTable("crm_scripts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  script: text("script").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customFieldValues = mysqlTable("custom_field_values", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: integer("entity_id").notNull(),
  fieldDefinitionId: integer("field_definition_id").notNull(),
  valueText: text("value_text"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowExecutions = mysqlTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  mode: varchar("mode", { length: 16 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: integer("execution_time"),
  error: text("error"),
  triggeredBy: integer("triggered_by"),
  triggerData: text("trigger_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const executionData = mysqlTable("execution_data", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull(),
  nodeId: varchar("node_id", { length: 255 }).notNull(),
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  executionTime: integer("execution_time"),
  inputData: text("input_data"),
  outputData: text("output_data"),
  error: text("error"),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const surveyResponses = mysqlTable("survey_responses", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id"),
  customerId: integer("customer_id").notNull(),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  closeReason: varchar("close_reason", { length: 50 }).notNull(),
  agentId: integer("agent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quickReplies = mysqlTable("quick_replies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  ticketId: integer("ticket_id"),
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

export const employees = mysqlTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").unique(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: timestamp("hire_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const frontendTelemetryEvents = mysqlTable("frontend_telemetry_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  properties: jsonb("properties"),
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const queueAgents = mysqlTable("queue_agents", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull(),
  agentId: integer("agent_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const ticketTags = mysqlTable("ticket_tags", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationTags = mysqlTable("conversation_tags", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  tag: varchar("tag", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerTreatments = mysqlTable("customer_treatments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  treatmentType: varchar("treatment_type", { length: 100 }).notNull(),
  description: text("description"),
  medication: text("medication"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
