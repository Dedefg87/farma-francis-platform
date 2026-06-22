"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tags = exports.pharmaPurchaseItems = exports.pharmaPurchases = exports.pharmaProducts = exports.customerTreatments = exports.integrationSettings = exports.internalMessages = exports.conversationMessages = exports.queueAgents = exports.queues = exports.agentPauses = exports.queueSettings = exports.agentStatus = exports.quickReplies = exports.conversations = exports.workflowSchedules = exports.workflowWebhooks = exports.workflowCredentials = exports.executionData = exports.workflowExecutions = exports.receivedMessages = exports.apiConfigurations = exports.uraMenus = exports.visualFlows = exports.aiChats = exports.notifications = exports.auditLogs = exports.attachments = exports.messages = exports.automationFlows = exports.employees = exports.interactions = exports.frontendTelemetryEvents = exports.crmActivities = exports.crmAuditLogs = exports.crmOutboxEvents = exports.ticketComments = exports.customFieldValues = exports.customFieldDefinitions = exports.crmTasks = exports.deals = exports.dealStages = exports.dealPipelines = exports.accountContacts = exports.accounts = exports.approvals = exports.tickets = exports.leads = exports.customers = exports.users = void 0;
exports.processedWebhookMessages = exports.broadcastMembersSent = exports.babyShowerWithdrawals = exports.babyShowerPurchases = exports.babyShowerGiftPackages = exports.babyShowerEvents = exports.broadcastMessages = exports.broadcastListMembers = exports.broadcastLists = exports.crmScripts = exports.surveyResponses = exports.customerTags = exports.ticketTags = exports.conversationTags = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
// Export execution and analytics tables (SQLite-based)
__exportStar(require("./schema_executions"), exports);
// Tags tables consolidated in this file.
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    openId: (0, mysql_core_1.varchar)("openId", { length: 64 }).notNull().unique(),
    name: (0, mysql_core_1.text)("name"),
    displayName: (0, mysql_core_1.varchar)("display_name", { length: 255 }),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    passwordHash: (0, mysql_core_1.varchar)("passwordHash", { length: 255 }),
    loginMethod: (0, mysql_core_1.varchar)("loginMethod", { length: 64 }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: (0, mysql_core_1.timestamp)("lastSignedIn").defaultNow().notNull(),
});
/**
 * Customers/Clients table for CRM
 */
exports.customers = (0, mysql_core_1.mysqlTable)("customers", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    phone: (0, mysql_core_1.varchar)("phone", { length: 100 }).unique(),
    cpfCnpj: (0, mysql_core_1.varchar)("cpf_cnpj", { length: 18 }),
    address: (0, mysql_core_1.text)("address"),
    city: (0, mysql_core_1.varchar)("city", { length: 100 }),
    state: (0, mysql_core_1.varchar)("state", { length: 2 }),
    zipCode: (0, mysql_core_1.varchar)("zip_code", { length: 10 }),
    tags: (0, mysql_core_1.text)("tags"),
    notes: (0, mysql_core_1.text)("notes"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "inactive", "blocked"]).default("active").notNull(),
    source: (0, mysql_core_1.varchar)("source", { length: 64 }).default("manual"),
    createdBy: (0, mysql_core_1.int)("created_by"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
    photoUrl: (0, mysql_core_1.varchar)("photo_url", { length: 500 }),
    birthDate: (0, mysql_core_1.date)("birth_date"),
    healthTagsJson: (0, mysql_core_1.text)("health_tags_json"),
    whatsappOptIn: (0, mysql_core_1.int)("whatsapp_opt_in").default(0).notNull(),
    whatsappOptInAt: (0, mysql_core_1.datetime)("whatsapp_opt_in_at"),
    ltvValue: (0, mysql_core_1.decimal)("ltv_value", { precision: 12, scale: 2 }).default("0.00"),
    lastPurchaseAt: (0, mysql_core_1.datetime)("last_purchase_at"),
    expectedDueDate: (0, mysql_core_1.date)("expected_due_date"),
});
/**
 * Leads table for sales funnel
 */
exports.leads = (0, mysql_core_1.mysqlTable)("leads", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }),
    source: (0, mysql_core_1.varchar)("source", { length: 100 }), // whatsapp, instagram, website, etc
    stage: (0, mysql_core_1.mysqlEnum)("stage", [
        "prospect",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
    ])
        .default("prospect")
        .notNull(),
    value: (0, mysql_core_1.int)("value"), // potential deal value
    assignedTo: (0, mysql_core_1.int)("assigned_to").references(function () { return exports.users.id; }),
    followUpDate: (0, mysql_core_1.timestamp)("follow_up_date"),
    notes: (0, mysql_core_1.text)("notes"),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Tickets/Atendimentos table
 */
exports.tickets = (0, mysql_core_1.mysqlTable)("tickets", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    ticketNumber: (0, mysql_core_1.varchar)("ticket_number", { length: 50 }).notNull().unique(),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    subject: (0, mysql_core_1.varchar)("subject", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    status: (0, mysql_core_1.mysqlEnum)("status", [
        "open",
        "in_progress",
        "pending",
        "resolved",
        "closed",
    ])
        .default("open")
        .notNull(),
    priority: (0, mysql_core_1.mysqlEnum)("priority", ["low", "medium", "high", "critical"])
        .default("medium")
        .notNull(),
    category: (0, mysql_core_1.varchar)("category", { length: 100 }),
    channel: (0, mysql_core_1.mysqlEnum)("channel", [
        "whatsapp",
        "instagram",
        "email",
        "phone",
        "web",
    ]),
    assignedTo: (0, mysql_core_1.int)("assigned_to").references(function () { return exports.users.id; }),
    slaDeadline: (0, mysql_core_1.timestamp)("sla_deadline"),
    resolvedAt: (0, mysql_core_1.timestamp)("resolved_at"),
    closedAt: (0, mysql_core_1.timestamp)("closed_at"),
    timeSpentMinutes: (0, mysql_core_1.int)("time_spent_minutes").default(0),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Approvals table for human approval system (pharmacists, etc.)
 */
exports.approvals = (0, mysql_core_1.mysqlTable)("approvals", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 64 }).notNull(),
    entityId: (0, mysql_core_1.int)("entity_id").notNull(),
    requestedBy: (0, mysql_core_1.int)("requested_by").references(function () { return exports.users.id; }).notNull(),
    approvedBy: (0, mysql_core_1.int)("approved_by").references(function () { return exports.users.id; }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    reason: (0, mysql_core_1.text)("reason"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Accounts (B2B companies) and relations
 */
exports.accounts = (0, mysql_core_1.mysqlTable)("accounts", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    legalName: (0, mysql_core_1.varchar)("legal_name", { length: 255 }),
    cnpj: (0, mysql_core_1.varchar)("cnpj", { length: 18 }),
    industry: (0, mysql_core_1.varchar)("industry", { length: 120 }),
    website: (0, mysql_core_1.varchar)("website", { length: 255 }),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }),
    address: (0, mysql_core_1.text)("address"),
    city: (0, mysql_core_1.varchar)("city", { length: 100 }),
    state: (0, mysql_core_1.varchar)("state", { length: 2 }),
    zipCode: (0, mysql_core_1.varchar)("zip_code", { length: 10 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "inactive"])
        .default("active")
        .notNull(),
    ownerUserId: (0, mysql_core_1.int)("owner_user_id").references(function () { return exports.users.id; }),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
exports.accountContacts = (0, mysql_core_1.mysqlTable)("account_contacts", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    accountId: (0, mysql_core_1.int)("account_id")
        .references(function () { return exports.accounts.id; }, { onDelete: "cascade" })
        .notNull(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    role: (0, mysql_core_1.varchar)("role", { length: 120 }),
    isPrimary: (0, mysql_core_1.int)("is_primary").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Deals (Opportunities) with pipeline/stages
 */
exports.dealPipelines = (0, mysql_core_1.mysqlTable)("deal_pipelines", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 120 }).notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
exports.dealStages = (0, mysql_core_1.mysqlTable)("deal_stages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    pipelineId: (0, mysql_core_1.int)("pipeline_id")
        .references(function () { return exports.dealPipelines.id; }, { onDelete: "cascade" })
        .notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 120 }).notNull(),
    sortOrder: (0, mysql_core_1.int)("sort_order").default(0).notNull(),
    probability: (0, mysql_core_1.int)("probability").default(0).notNull(), // 0-100
    isWon: (0, mysql_core_1.int)("is_won").default(0).notNull(),
    isLost: (0, mysql_core_1.int)("is_lost").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.deals = (0, mysql_core_1.mysqlTable)("deals", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    accountId: (0, mysql_core_1.int)("account_id").references(function () { return exports.accounts.id; }),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    pipelineId: (0, mysql_core_1.int)("pipeline_id")
        .references(function () { return exports.dealPipelines.id; })
        .notNull(),
    stageId: (0, mysql_core_1.int)("stage_id")
        .references(function () { return exports.dealStages.id; })
        .notNull(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    amountCents: (0, mysql_core_1.int)("amount_cents"),
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("BRL"),
    closeDate: (0, mysql_core_1.timestamp)("close_date"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["open", "won", "lost"])
        .default("open")
        .notNull(),
    ownerUserId: (0, mysql_core_1.int)("owner_user_id").references(function () { return exports.users.id; }),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Tasks / reminders
 */
exports.crmTasks = (0, mysql_core_1.mysqlTable)("crm_tasks", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    dueAt: (0, mysql_core_1.timestamp)("due_at"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["open", "done", "cancelled"])
        .default("open")
        .notNull(),
    priority: (0, mysql_core_1.mysqlEnum)("priority", ["low", "medium", "high"])
        .default("medium")
        .notNull(),
    relatedEntityType: (0, mysql_core_1.varchar)("related_entity_type", { length: 40 }),
    relatedEntityId: (0, mysql_core_1.int)("related_entity_id"),
    assignedTo: (0, mysql_core_1.int)("assigned_to").references(function () { return exports.users.id; }),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
});
/**
 * Custom fields (definitions + values)
 */
exports.customFieldDefinitions = (0, mysql_core_1.mysqlTable)("custom_field_definitions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 40 }).notNull(), // customer/account/lead/deal/ticket
    key: (0, mysql_core_1.varchar)("key", { length: 80 }).notNull(),
    label: (0, mysql_core_1.varchar)("label", { length: 120 }).notNull(),
    fieldType: (0, mysql_core_1.mysqlEnum)("field_type", [
        "text",
        "number",
        "date",
        "boolean",
        "select",
    ]).notNull(),
    optionsJson: (0, mysql_core_1.text)("options_json"),
    isRequired: (0, mysql_core_1.int)("is_required").default(0).notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
exports.customFieldValues = (0, mysql_core_1.mysqlTable)("custom_field_values", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 40 }).notNull(),
    entityId: (0, mysql_core_1.int)("entity_id").notNull(),
    fieldDefinitionId: (0, mysql_core_1.int)("field_definition_id")
        .references(function () { return exports.customFieldDefinitions.id; }, { onDelete: "cascade" })
        .notNull(),
    valueText: (0, mysql_core_1.text)("value_text"),
    updatedBy: (0, mysql_core_1.int)("updated_by").references(function () { return exports.users.id; }),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Ticket comments/notes
 */
exports.ticketComments = (0, mysql_core_1.mysqlTable)("ticket_comments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    ticketId: (0, mysql_core_1.int)("ticket_id")
        .references(function () { return exports.tickets.id; }, { onDelete: "cascade" })
        .notNull(),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }),
    content: (0, mysql_core_1.text)("content").notNull(),
    isInternal: (0, mysql_core_1.int)("is_internal").default(0).notNull(), // 0 = false, 1 = true (internal notes vs customer-visible)
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * CRM enterprise foundation tables
 * - crm_outbox_events: async domain events (no UI impact)
 * - crm_audit_logs: immutable audit trail (compliance)
 * - crm_activities: timeline items (read model)
 * - frontend_telemetry_events: optional UI event capture (batched)
 */
exports.crmOutboxEvents = (0, mysql_core_1.mysqlTable)("crm_outbox_events", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    eventName: (0, mysql_core_1.varchar)("event_name", { length: 120 }).notNull(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 40 }).notNull(),
    entityId: (0, mysql_core_1.int)("entity_id"),
    actorUserId: (0, mysql_core_1.int)("actor_user_id").references(function () { return exports.users.id; }),
    payloadJson: (0, mysql_core_1.text)("payload_json"),
    idempotencyKey: (0, mysql_core_1.varchar)("idempotency_key", { length: 120 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "processed", "failed"])
        .default("pending")
        .notNull(),
    error: (0, mysql_core_1.text)("error"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    processedAt: (0, mysql_core_1.timestamp)("processed_at"),
});
exports.crmAuditLogs = (0, mysql_core_1.mysqlTable)("crm_audit_logs", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    action: (0, mysql_core_1.varchar)("action", { length: 80 }).notNull(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 40 }).notNull(),
    entityId: (0, mysql_core_1.int)("entity_id"),
    actorUserId: (0, mysql_core_1.int)("actor_user_id").references(function () { return exports.users.id; }),
    beforeJson: (0, mysql_core_1.text)("before_json"),
    afterJson: (0, mysql_core_1.text)("after_json"),
    requestId: (0, mysql_core_1.varchar)("request_id", { length: 80 }),
    ip: (0, mysql_core_1.varchar)("ip", { length: 80 }),
    userAgent: (0, mysql_core_1.varchar)("user_agent", { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.crmActivities = (0, mysql_core_1.mysqlTable)("crm_activities", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 40 }).notNull(),
    entityId: (0, mysql_core_1.int)("entity_id").notNull(),
    activityType: (0, mysql_core_1.varchar)("activity_type", { length: 40 }).notNull(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }),
    body: (0, mysql_core_1.text)("body"),
    metadataJson: (0, mysql_core_1.text)("metadata_json"),
    actorUserId: (0, mysql_core_1.int)("actor_user_id").references(function () { return exports.users.id; }),
    occurredAt: (0, mysql_core_1.timestamp)("occurred_at").defaultNow().notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.frontendTelemetryEvents = (0, mysql_core_1.mysqlTable)("frontend_telemetry_events", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }),
    page: (0, mysql_core_1.varchar)("page", { length: 160 }),
    eventName: (0, mysql_core_1.varchar)("event_name", { length: 120 }).notNull(),
    payloadJson: (0, mysql_core_1.text)("payload_json"),
    occurredAt: (0, mysql_core_1.timestamp)("occurred_at").defaultNow().notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Interactions history (CRM timeline)
 */
exports.interactions = (0, mysql_core_1.mysqlTable)("interactions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    ticketId: (0, mysql_core_1.int)("ticket_id").references(function () { return exports.tickets.id; }),
    leadId: (0, mysql_core_1.int)("lead_id").references(function () { return exports.leads.id; }),
    type: (0, mysql_core_1.mysqlEnum)("type", [
        "call",
        "email",
        "whatsapp",
        "instagram",
        "meeting",
        "note",
    ]).notNull(),
    subject: (0, mysql_core_1.varchar)("subject", { length: 255 }),
    content: (0, mysql_core_1.text)("content"),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Employees extended information
 */
exports.employees = (0, mysql_core_1.mysqlTable)("employees", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id")
        .references(function () { return exports.users.id; }, { onDelete: "cascade" })
        .notNull()
        .unique(),
    cpf: (0, mysql_core_1.varchar)("cpf", { length: 14 }).unique(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }),
    position: (0, mysql_core_1.varchar)("position", { length: 100 }),
    department: (0, mysql_core_1.varchar)("department", { length: 100 }),
    hireDate: (0, mysql_core_1.timestamp)("hire_date"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "inactive", "vacation"])
        .default("active")
        .notNull(),
    skills: (0, mysql_core_1.text)("skills"), // JSON array
    photoUrl: (0, mysql_core_1.varchar)("photo_url", { length: 500 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Automation flows for WhatsApp/Instagram
 */
exports.automationFlows = (0, mysql_core_1.mysqlTable)("automation_flows", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    channel: (0, mysql_core_1.mysqlEnum)("channel", ["whatsapp", "instagram", "both"]).notNull(),
    trigger: (0, mysql_core_1.text)("trigger").notNull(), // keywords separated by comma
    response: (0, mysql_core_1.text)("response").notNull(), // auto-response message
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(), // 0 = inactive, 1 = active
    responseCount: (0, mysql_core_1.int)("response_count").default(0).notNull(), // number of times triggered
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Messages from WhatsApp/Instagram
 */
exports.messages = (0, mysql_core_1.mysqlTable)("messages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    ticketId: (0, mysql_core_1.int)("ticket_id").references(function () { return exports.tickets.id; }),
    channel: (0, mysql_core_1.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
    direction: (0, mysql_core_1.mysqlEnum)("direction", ["inbound", "outbound"]).notNull(),
    content: (0, mysql_core_1.text)("content").notNull(),
    messageId: (0, mysql_core_1.varchar)("message_id", { length: 255 }), // external message ID
    status: (0, mysql_core_1.mysqlEnum)("status", ["sent", "delivered", "read", "failed"]),
    metadata: (0, mysql_core_1.text)("metadata"), // JSON for additional data
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * File attachments
 */
exports.attachments = (0, mysql_core_1.mysqlTable)("attachments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    ticketId: (0, mysql_core_1.int)("ticket_id").references(function () { return exports.tickets.id; }),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    fileName: (0, mysql_core_1.varchar)("file_name", { length: 255 }).notNull(),
    fileKey: (0, mysql_core_1.varchar)("file_key", { length: 500 }).notNull(), // S3 key
    fileUrl: (0, mysql_core_1.varchar)("file_url", { length: 1000 }).notNull(), // S3 URL
    mimeType: (0, mysql_core_1.varchar)("mime_type", { length: 100 }),
    fileSize: (0, mysql_core_1.int)("file_size"), // in bytes
    uploadedBy: (0, mysql_core_1.int)("uploaded_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Audit log for critical actions
 */
exports.auditLogs = (0, mysql_core_1.mysqlTable)("audit_logs", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }),
    action: (0, mysql_core_1.varchar)("action", { length: 100 }).notNull(), // create, up delete, login, etc
    entityType: (0, mysql_core_1.varchar)("entity_type", { length: 100 }), // ticket, customer, user, etc
    entityId: (0, mysql_core_1.int)("entity_id"),
    changes: (0, mysql_core_1.text)("changes"), // JSON of what changed
    ipAddress: (0, mysql_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, mysql_core_1.text)("user_agent"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Notifications
 */
exports.notifications = (0, mysql_core_1.mysqlTable)("notifications", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id")
        .references(function () { return exports.users.id; }, { onDelete: "cascade" })
        .notNull(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    content: (0, mysql_core_1.text)("content"),
    type: (0, mysql_core_1.mysqlEnum)("type", ["ticket", "lead", "system", "goal"]).notNull(),
    isRead: (0, mysql_core_1.int)("is_read").default(0).notNull(), // 0 = false, 1 = true
    relatedId: (0, mysql_core_1.int)("related_id"), // ticket_id, lead_id, etc
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * AI chat history for assistant
 */
exports.aiChats = (0, mysql_core_1.mysqlTable)("ai_chats", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }),
    ticketId: (0, mysql_core_1.int)("ticket_id").references(function () { return exports.tickets.id; }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["user", "assistant", "system"]).notNull(),
    content: (0, mysql_core_1.text)("content").notNull(),
    metadata: (0, mysql_core_1.text)("metadata"), // JSON for additional context
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Visual automation flows (N8N-style)
 */
exports.visualFlows = (0, mysql_core_1.mysqlTable)("visual_flows", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    flowData: (0, mysql_core_1.text)("flow_data").notNull(), // JSON: {nodes: [], edges: []}
    isActive: (0, mysql_core_1.int)("is_active").default(0).notNull(),
    isTestMode: (0, mysql_core_1.int)("is_test_mode").default(0).notNull(), // Test mode flag
    executionCount: (0, mysql_core_1.int)("execution_count").default(0).notNull(),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * URA (Interactive Voice Response) menu configuration
 */
exports.uraMenus = (0, mysql_core_1.mysqlTable)("ura_menus", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    welcomeMessage: (0, mysql_core_1.text)("welcome_message").notNull(),
    menuData: (0, mysql_core_1.text)("menu_data").notNull(), // JSON: [{option: "1", label: "Vendas", action: "transfer", value: "dept_sales"}]
    workingHours: (0, mysql_core_1.text)("working_hours"), // JSON: {start: "08:00", end: "18:00", days: [1,2,3,4,5]}
    offHoursMessage: (0, mysql_core_1.text)("off_hours_message"),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * API configurations for WhatsApp Business and Instagram
 * Tokens are encrypted before storage
 */
exports.apiConfigurations = (0, mysql_core_1.mysqlTable)("api_configurations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    provider: (0, mysql_core_1.mysqlEnum)("provider", ["whatsapp", "instagram"]).notNull(),
    token: (0, mysql_core_1.text)("token").notNull(), // Encrypted
    phoneNumberId: (0, mysql_core_1.varchar)("phone_number_id", { length: 255 }), // WhatsApp only
    pageId: (0, mysql_core_1.varchar)("page_id", { length: 255 }), // Instagram only
    webhookUrl: (0, mysql_core_1.varchar)("webhook_url", { length: 512 }),
    webhookVerifyToken: (0, mysql_core_1.varchar)("webhook_verify_token", { length: 255 }),
    appSecret: (0, mysql_core_1.varchar)("app_secret", { length: 255 }), // For HMAC signature validation
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    lastTestedAt: (0, mysql_core_1.timestamp)("last_tested_at"),
    testStatus: (0, mysql_core_1.mysqlEnum)("test_status", [
        "success",
        "failed",
        "not_tested",
    ]).default("not_tested"),
    testMessage: (0, mysql_core_1.text)("test_message"),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Received messages from WhatsApp and Instagram webhooks
 * Stores all incoming messages for processing and history
 */
exports.receivedMessages = (0, mysql_core_1.mysqlTable)("received_messages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    provider: (0, mysql_core_1.mysqlEnum)("provider", ["whatsapp", "instagram"]).notNull(),
    externalId: (0, mysql_core_1.varchar)("external_id", { length: 255 }).notNull(), // Message ID from provider
    fromNumber: (0, mysql_core_1.varchar)("from_number", { length: 100 }).notNull(), // Phone number or Instagram user ID
    fromName: (0, mysql_core_1.varchar)("from_name", { length: 255 }), // Sender name if available
    messageType: (0, mysql_core_1.mysqlEnum)("message_type", [
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
    messageText: (0, mysql_core_1.text)("message_text"), // Text content
    mediaUrl: (0, mysql_core_1.longtext)("media_url"), // URL for media files (can be base64 data URL)
    mediaId: (0, mysql_core_1.varchar)("media_id", { length: 255 }), // Media ID from provider
    mimeType: (0, mysql_core_1.varchar)("mime_type", { length: 100 }), // Media MIME type
    caption: (0, mysql_core_1.text)("caption"), // Media caption
    latitude: (0, mysql_core_1.decimal)("latitude", { precision: 10, scale: 8 }), // Location latitude
    longitude: (0, mysql_core_1.decimal)("longitude", { precision: 11, scale: 8 }), // Location longitude
    timestamp: (0, mysql_core_1.text)("timestamp").notNull(), // Unix timestamp from provider (stored as text)
    rawPayload: (0, mysql_core_1.longtext)("raw_payload"), // Full JSON payload for debugging
    processed: (0, mysql_core_1.int)("processed").default(0).notNull(), // 0 = pending, 1 = processed
    processedAt: (0, mysql_core_1.timestamp)("processed_at"),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }), // Link to customer if identified
    ticketId: (0, mysql_core_1.int)("ticket_id").references(function () { return exports.tickets.id; }), // Link to ticket if created
    automationFlowId: (0, mysql_core_1.int)("automation_flow_id").references(function () { return exports.automationFlows.id; }), // Flow that processed this message
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Workflow Executions - Histórico de execuções de workflows
 * Armazena cada execução com status, tempo, dados e logs
 */
exports.workflowExecutions = (0, mysql_core_1.mysqlTable)("workflow_executions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    workflowId: (0, mysql_core_1.int)("workflow_id")
        .references(function () { return exports.visualFlows.id; })
        .notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", [
        "running",
        "success",
        "error",
        "waiting",
        "canceled",
    ]).notNull(),
    mode: (0, mysql_core_1.mysqlEnum)("mode", [
        "manual",
        "trigger",
        "webhook",
        "schedule",
    ]).notNull(),
    startedAt: (0, mysql_core_1.timestamp)("started_at").defaultNow().notNull(),
    finishedAt: (0, mysql_core_1.timestamp)("finished_at"),
    executionTime: (0, mysql_core_1.int)("execution_time"), // Milliseconds
    error: (0, mysql_core_1.text)("error"), // Error message if failed
    triggeredBy: (0, mysql_core_1.int)("triggered_by").references(function () { return exports.users.id; }), // User who triggered (for manual)
    triggerData: (0, mysql_core_1.text)("trigger_data"), // JSON with trigger input data
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Execution Data - Dados de cada nó executado
 * Armazena input, output, erro e tempo de cada nó
 */
exports.executionData = (0, mysql_core_1.mysqlTable)("execution_data", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    executionId: (0, mysql_core_1.int)("execution_id")
        .references(function () { return exports.workflowExecutions.id; })
        .notNull(),
    nodeId: (0, mysql_core_1.varchar)("node_id", { length: 255 }).notNull(), // ID do nó no workflow
    nodeName: (0, mysql_core_1.varchar)("node_name", { length: 255 }).notNull(),
    nodeType: (0, mysql_core_1.varchar)("node_type", { length: 100 }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["success", "error", "skipped"]).notNull(),
    startedAt: (0, mysql_core_1.timestamp)("started_at").notNull(),
    finishedAt: (0, mysql_core_1.timestamp)("finished_at"),
    executionTime: (0, mysql_core_1.int)("execution_time"), // Milliseconds
    inputData: (0, mysql_core_1.text)("input_data"), // JSON with input
    outputData: (0, mysql_core_1.text)("output_data"), // JSON with output
    error: (0, mysql_core_1.text)("error"), // Error message if failed
    retryCount: (0, mysql_core_1.int)("retry_count").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Workflow Credentials - Credenciais criptografadas
 * Armazena credenciais de APIs de forma segura
 */
exports.workflowCredentials = (0, mysql_core_1.mysqlTable)("workflow_credentials", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, mysql_core_1.varchar)("type", { length: 100 }).notNull(), // http, oauth2, api_key, database, etc
    data: (0, mysql_core_1.text)("data").notNull(), // Encrypted JSON with credentials
    createdBy: (0, mysql_core_1.int)("created_by")
        .references(function () { return exports.users.id; })
        .notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Workflow Webhooks - URLs únicas para cada workflow
 * Permite workflows serem acionados por webhooks externos
 */
exports.workflowWebhooks = (0, mysql_core_1.mysqlTable)("workflow_webhooks", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    workflowId: (0, mysql_core_1.int)("workflow_id")
        .references(function () { return exports.visualFlows.id; })
        .notNull(),
    webhookId: (0, mysql_core_1.varchar)("webhook_id", { length: 255 }).notNull().unique(), // UUID único
    path: (0, mysql_core_1.varchar)("path", { length: 255 }).notNull(), // /webhook/abc123
    method: (0, mysql_core_1.mysqlEnum)("method", [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
    ]).notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    lastTriggeredAt: (0, mysql_core_1.timestamp)("last_triggered_at"),
    triggerCount: (0, mysql_core_1.int)("trigger_count").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Workflow Schedules - Agendamentos com cron
 * Permite workflows serem executados automaticamente
 */
exports.workflowSchedules = (0, mysql_core_1.mysqlTable)("workflow_schedules", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    workflowId: (0, mysql_core_1.int)("workflow_id")
        .references(function () { return exports.visualFlows.id; })
        .notNull(),
    cronExpression: (0, mysql_core_1.varchar)("cron_expression", { length: 255 }).notNull(), // 0 0 * * * *
    timezone: (0, mysql_core_1.varchar)("timezone", { length: 100 })
        .default("America/Sao_Paulo")
        .notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    lastRunAt: (0, mysql_core_1.timestamp)("last_run_at"),
    nextRunAt: (0, mysql_core_1.timestamp)("next_run_at"),
    runCount: (0, mysql_core_1.int)("run_count").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * ========================================
 * SISTEMA DE ATENDIMENTO (AGENT AREA)
 * ========================================
 */
/**
 * Conversations - Conversas de atendimento
 * Armazena conversas com clientes via WhatsApp/Instagram
 */
exports.conversations = (0, mysql_core_1.mysqlTable)("conversations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id").references(function () { return exports.customers.id; }),
    customerName: (0, mysql_core_1.varchar)("customer_name", { length: 255 }),
    customerPhone: (0, mysql_core_1.varchar)("customer_phone", { length: 50 }),
    queueId: (0, mysql_core_1.int)("queue_id").references(function () { return exports.queues.id; }), // Fila de atendimento
    channel: (0, mysql_core_1.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["open", "assigned", "closed"])
        .default("open")
        .notNull(),
    assignedTo: (0, mysql_core_1.int)("assigned_to").references(function () { return exports.users.id; }), // Agente responsável
    openedAt: (0, mysql_core_1.timestamp)("opened_at").defaultNow().notNull(),
    closedAt: (0, mysql_core_1.timestamp)("closed_at"),
    closeReason: (0, mysql_core_1.mysqlEnum)("close_reason", [
        "venda",
        "orcamento",
        "conversa_anterior",
        "engano",
    ]),
    lastMessageAt: (0, mysql_core_1.timestamp)("last_message_at").defaultNow().notNull(),
    unreadCount: (0, mysql_core_1.int)("unread_count").default(0).notNull(),
});
/**
 * Quick Replies - Mensagens prontas
 * Respostas rápidas para agilizar atendimento
 */
exports.quickReplies = (0, mysql_core_1.mysqlTable)("quick_replies", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    content: (0, mysql_core_1.text)("content").notNull(),
    category: (0, mysql_core_1.varchar)("category", { length: 100 }), // saudacao, endereco, pagamento, etc
    createdBy: (0, mysql_core_1.int)("created_by")
        .references(function () { return exports.users.id; })
        .notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Agent Status - Status dos agentes
 * Controla se agente está online/pausado em cada canal
 */
exports.agentStatus = (0, mysql_core_1.mysqlTable)("agent_status", {
    userId: (0, mysql_core_1.int)("user_id")
        .primaryKey()
        .references(function () { return exports.users.id; })
        .notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 16 }).default("offline").notNull(),
    lastSeen: (0, mysql_core_1.timestamp)("last_seen").defaultNow().notNull(),
    currentConversationId: (0, mysql_core_1.int)("current_conversation_id"),
});
/**
 * Queue Settings - Configurações de filas
 * Define regras para filas de atendimento
 */
exports.queueSettings = (0, mysql_core_1.mysqlTable)("queue_settings", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    channel: (0, mysql_core_1.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
    maxWaitMinutes: (0, mysql_core_1.int)("max_wait_minutes").default(15).notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Agent Pauses - Pausas dos agentes
 * Registra quando agentes fazem pausas (almoço, lanche, etc)
 */
exports.agentPauses = (0, mysql_core_1.mysqlTable)("agent_pauses", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    agentId: (0, mysql_core_1.int)("agent_id")
        .references(function () { return exports.users.id; })
        .notNull(),
    pauseType: (0, mysql_core_1.mysqlEnum)("pause_type", ["lunch", "snack", "bathroom", "other"]).notNull(),
    durationMinutes: (0, mysql_core_1.int)("duration_minutes"),
    startedAt: (0, mysql_core_1.timestamp)("started_at").defaultNow().notNull(),
    endedAt: (0, mysql_core_1.timestamp)("ended_at"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "completed"]).default("active").notNull(),
});
/**
 * Queues - Filas de atendimento
 * Gerencia filas de atendimento com agentes e distribuição
 */
exports.queues = (0, mysql_core_1.mysqlTable)("queues", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    channel: (0, mysql_core_1.varchar)("channel", { length: 16 }).notNull(),
    priority: (0, mysql_core_1.int)("priority").default(0).notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 16 }).default("active").notNull(),
    color: (0, mysql_core_1.varchar)("color", { length: 7 }).default("#3b82f6"),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Queue Agents - Agentes atribuídos a filas
 * Relacionamento muitos-para-muitos entre agentes e filas
 */
exports.queueAgents = (0, mysql_core_1.mysqlTable)("queue_agents", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    queueId: (0, mysql_core_1.int)("queue_id")
        .references(function () { return exports.queues.id; })
        .notNull(),
    agentId: (0, mysql_core_1.int)("agent_id")
        .references(function () { return exports.users.id; })
        .notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(), // Agente ativo na fila?
    joinedAt: (0, mysql_core_1.timestamp)("joined_at").defaultNow().notNull(),
});
/**
 * Conversation Messages - Mensagens de conversas de atendimento
 * Armazena mensagens trocadas entre agentes e clientes
 */
exports.conversationMessages = (0, mysql_core_1.mysqlTable)("conversation_messages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    conversationId: (0, mysql_core_1.int)("conversation_id")
        .references(function () { return exports.conversations.id; }, { onDelete: "cascade" })
        .notNull(),
    externalId: (0, mysql_core_1.varchar)("external_id", { length: 255 }), // Evolution API message ID for idempotency
    remoteJid: (0, mysql_core_1.varchar)("remote_jid", { length: 255 }), // JID do remetente (WhatsApp)
    provider: (0, mysql_core_1.mysqlEnum)("provider", ["whatsapp", "instagram"]).default("whatsapp"),
    senderId: (0, mysql_core_1.int)("sender_id").references(function () { return exports.users.id; }), // ID do agente (null se for cliente)
    senderType: (0, mysql_core_1.mysqlEnum)("sender_type", ["agent", "customer"]).notNull(),
    content: (0, mysql_core_1.text)("content").notNull(),
    // Campos de anexo
    fileUrl: (0, mysql_core_1.longtext)("file_url"), // Can contain base64 data URLs
    fileName: (0, mysql_core_1.varchar)("file_name", { length: 255 }),
    fileType: (0, mysql_core_1.varchar)("file_type", { length: 100 }), // MIME type
    fileSize: (0, mysql_core_1.int)("file_size"), // Tamanho em bytes
    readAt: (0, mysql_core_1.timestamp)("read_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Internal Messages - Mensagens internas entre Admin e Agente
 * Não aparecem para o cliente, apenas como notificação para o agente
 */
exports.internalMessages = (0, mysql_core_1.mysqlTable)("internal_messages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    conversationId: (0, mysql_core_1.int)("conversation_id")
        .references(function () { return exports.conversations.id; })
        .notNull(),
    senderId: (0, mysql_core_1.int)("sender_id")
        .references(function () { return exports.users.id; })
        .notNull(), // Quem enviou (admin)
    recipientId: (0, mysql_core_1.int)("recipient_id")
        .references(function () { return exports.users.id; })
        .notNull(), // Quem recebe (agente)
    content: (0, mysql_core_1.text)("content").notNull(),
    readAt: (0, mysql_core_1.timestamp)("read_at"), // Quando o agente leu
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
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
exports.integrationSettings = (0, mysql_core_1.mysqlTable)("integration_settings", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    integrationType: (0, mysql_core_1.mysqlEnum)("integration_type", [
        "whatsapp_business",
        "instagram_graph",
        "evolution_api",
        "telegram",
        "email",
    ]).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    config: (0, mysql_core_1.json)("config").notNull(),
    // Metadados
    createdBy: (0, mysql_core_1.int)("created_by")
        .references(function () { return exports.users.id; })
        .notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
    lastTestedAt: (0, mysql_core_1.timestamp)("last_tested_at"), // Última vez que a conexão foi testada
    testStatus: (0, mysql_core_1.mysqlEnum)("test_status", [
        "success",
        "failed",
        "pending",
    ]).default("pending"),
    testMessage: (0, mysql_core_1.text)("test_message"), // Mensagem de erro/sucesso do último teste
});
/**
 * CRM - Customer Treatments (Medicamentos de Uso Contínuo)
 * Armazena informações sobre tratamentos e medicamentos de clientes
 */
exports.customerTreatments = (0, mysql_core_1.mysqlTable)("customer_treatments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    nomeMedicamento: (0, mysql_core_1.varchar)("nome_medicamento", { length: 255 }).notNull(),
    posologiaDiaria: (0, mysql_core_1.int)("posologia_diaria").notNull(), // Qtd comprimidos/dia
    qtdCaixa: (0, mysql_core_1.int)("qtd_caixa").notNull(), // Qtd total na caixa
    dataUltimaCompra: (0, mysql_core_1.timestamp)("data_ultima_compra"),
    dataFimPrevisto: (0, mysql_core_1.timestamp)("data_fim_previsto"), // Campo calculado para query performática
    observacoes: (0, mysql_core_1.text)("observacoes"),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * PharmaCore - Products catalog (optional enrichment)
 */
exports.pharmaProducts = (0, mysql_core_1.mysqlTable)("pharma_products", {
    ean: (0, mysql_core_1.varchar)("ean", { length: 32 }).primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    category: (0, mysql_core_1.mysqlEnum)("category", [
        "medicamento",
        "perfumaria",
        "outros",
    ]).default("outros"),
    substance: (0, mysql_core_1.varchar)("substance", { length: 255 }),
    daysDuration: (0, mysql_core_1.int)("days_duration"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * PharmaCore - Purchase history (ingested from PDV/ERP or manual)
 */
exports.pharmaPurchases = (0, mysql_core_1.mysqlTable)("pharma_purchases", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    externalId: (0, mysql_core_1.varchar)("external_id", { length: 80 }), // id from ERP/PDV
    purchaseDate: (0, mysql_core_1.timestamp)("purchase_date").defaultNow().notNull(),
    totalValue: (0, mysql_core_1.decimal)("total_value", { precision: 12, scale: 2 }).default("0"),
    channel: (0, mysql_core_1.mysqlEnum)("channel", [
        "loja",
        "delivery",
        "whatsapp",
        "outros",
    ]).default("outros"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.pharmaPurchaseItems = (0, mysql_core_1.mysqlTable)("pharma_purchase_items", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    purchaseId: (0, mysql_core_1.int)("purchase_id")
        .references(function () { return exports.pharmaPurchases.id; }, { onDelete: "cascade" })
        .notNull(),
    productEan: (0, mysql_core_1.varchar)("product_ean", { length: 32 }).references(function () { return exports.pharmaProducts.ean; }, { onDelete: "set null" }),
    productName: (0, mysql_core_1.varchar)("product_name", { length: 255 }).notNull(),
    quantity: (0, mysql_core_1.int)("quantity").notNull(),
    price: (0, mysql_core_1.decimal)("price", { precision: 12, scale: 2 }).default("0"),
});
/**
 * CRM - Tags para Segmentação de Clientes
 * Relacionamento Many-to-Many com Clientes
 */
exports.tags = (0, mysql_core_1.mysqlTable)("tags", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull().unique(),
    color: (0, mysql_core_1.varchar)("color", { length: 7 }).notNull().default("#6366f1"),
    icon: (0, mysql_core_1.varchar)("icon", { length: 50 }),
    description: (0, mysql_core_1.text)("description"),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
exports.conversationTags = (0, mysql_core_1.mysqlTable)("conversation_tags", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    conversationId: (0, mysql_core_1.varchar)("conversationId", { length: 200 }).notNull(),
    tagId: (0, mysql_core_1.int)("tagId")
        .notNull()
        .references(function () { return exports.tags.id; }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
exports.ticketTags = (0, mysql_core_1.mysqlTable)("ticket_tags", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    ticketId: (0, mysql_core_1.int)("ticketId").notNull(),
    tagId: (0, mysql_core_1.int)("tagId")
        .notNull()
        .references(function () { return exports.tags.id; }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
/**
 * CRM - Relacionamento Cliente-Tags
 */
exports.customerTags = (0, mysql_core_1.mysqlTable)("customer_tags", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    tagId: (0, mysql_core_1.int)("tag_id")
        .references(function () { return exports.tags.id; }, { onDelete: "cascade" })
        .notNull(),
    addedBy: (0, mysql_core_1.int)("added_by").references(function () { return exports.users.id; }),
    addedAt: (0, mysql_core_1.timestamp)("added_at").defaultNow().notNull(),
});
/**
 * Survey Responses - Respostas de Pesquisas de Satisfação
 * Armazena respostas de pesquisas de satisfação após encerramento de conversas
 */
exports.surveyResponses = (0, mysql_core_1.mysqlTable)("survey_responses", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    conversationId: (0, mysql_core_1.int)("conversation_id").references(function () { return exports.conversations.id; }, {
        onDelete: "set null",
    }),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; }, { onDelete: "cascade" })
        .notNull(),
    rating: (0, mysql_core_1.int)("rating").notNull(), // 1-5 rating
    feedback: (0, mysql_core_1.text)("feedback"), // Optional feedback text
    closeReason: (0, mysql_core_1.varchar)("close_reason", { length: 50 }).notNull(), // venda, orcamento, etc
    agentId: (0, mysql_core_1.int)("agent_id").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * CRM - Scripts/Templates (mensagens prontas)
 * Stored as company-wide templates; returned by crm.getScripts.
 */
exports.crmScripts = (0, mysql_core_1.mysqlTable)("crm_scripts", {
    code: (0, mysql_core_1.varchar)("code", { length: 50 }).primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 120 }).notNull(),
    template: (0, mysql_core_1.text)("template").notNull(),
    variablesJson: (0, mysql_core_1.text)("variables_json"),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Broadcast Lists - Listas de Transmissão
 * Permite criar listas de até 50 contatos para envio de mensagens em massa
 */
exports.broadcastLists = (0, mysql_core_1.mysqlTable)("broadcast_lists", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    createdBy: (0, mysql_core_1.int)("created_by").references(function () { return exports.users.id; }).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "paused", "deleted"]).default("active").notNull(),
    lastSentAt: (0, mysql_core_1.timestamp)("last_sent_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
});
/**
 * Broadcast List Members - Membros das Listas de Transmissão
 * Relaciona contatos às listas (máximo 50 por lista)
 */
exports.broadcastListMembers = (0, mysql_core_1.mysqlTable)("broadcast_list_members", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    listId: (0, mysql_core_1.int)("list_id")
        .references(function () { return exports.broadcastLists.id; })
        .notNull(),
    customerId: (0, mysql_core_1.int)("customer_id")
        .references(function () { return exports.customers.id; })
        .notNull(),
    addedAt: (0, mysql_core_1.timestamp)("added_at").defaultNow().notNull(),
});
/**
 * Broadcast Messages - Mensagens enviadas em listas de transmissão
 * Registra o histórico de mensagens enviadas
 */
exports.broadcastMessages = (0, mysql_core_1.mysqlTable)("broadcast_messages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    listId: (0, mysql_core_1.int)("list_id")
        .references(function () { return exports.broadcastLists.id; })
        .notNull(),
    messageText: (0, mysql_core_1.text)("message_text"),
    caption: (0, mysql_core_1.text)("caption"),
    fileUrl: (0, mysql_core_1.text)("file_url"),
    fileName: (0, mysql_core_1.text)("file_name"),
    fileType: (0, mysql_core_1.text)("file_type"),
    fileSize: (0, mysql_core_1.int)("file_size"),
    senderId: (0, mysql_core_1.int)("sender_id")
        .references(function () { return exports.users.id; })
        .notNull(),
    senderType: (0, mysql_core_1.varchar)("sender_type", { length: 50 }).default("agent").notNull(),
    totalRecipients: (0, mysql_core_1.int)("total_recipients").notNull(),
    successfulSends: (0, mysql_core_1.int)("successful_sends").default(0),
    failedSends: (0, mysql_core_1.int)("failed_sends").default(0),
    status: (0, mysql_core_1.varchar)("status", { length: 16 }).default("sending").notNull(),
    sentAt: (0, mysql_core_1.timestamp)("sent_at").defaultNow().notNull(),
    errorMessage: (0, mysql_core_1.text)("error_message"),
});
/**
 * ============================================================
 * MÓDULO CHÁ DE BEBÊ FARMA FRANCIS
 * Sistema de eventos virtuais para arrecadação de fraldas/presentes
 * ============================================================
 */
/**
 * Eventos Chá de Bebê - Pais criam eventos e recebem "Carteira Virtual"
 */
exports.babyShowerEvents = (0, mysql_core_1.mysqlTable)("baby_shower_events", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    // Relacionamento com a mãe (customer)
    motherCustomerId: (0, mysql_core_1.int)("mother_customer_id")
        .references(function () { return exports.customers.id; })
        .notNull(),
    // Dados do Evento
    eventCode: (0, mysql_core_1.varchar)("event_code", { length: 20 }).notNull().unique(), // Ex: "CHA202503001"
    eventName: (0, mysql_core_1.varchar)("event_name", { length: 255 }).notNull(), // Ex: "Chá da Maria"
    babyName: (0, mysql_core_1.varchar)("baby_name", { length: 255 }), // Nome do bebê
    expectedDueDate: (0, mysql_core_1.date)("expected_due_date"), // Data prevista do parto
    eventDate: (0, mysql_core_1.date)("event_date"), // Data do evento físico (se houver)
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "closed", "cancelled"])
        .default("active")
        .notNull(),
    // WhatsApp para contato (editável)
    whatsappNumber: (0, mysql_core_1.varchar)("whatsapp_number", { length: 20 }), // Ex: "5531986337081"
    // Carteira Virtual (saldo em valor monetário)
    walletBalance: (0, mysql_core_1.decimal)("wallet_balance", { precision: 12, scale: 2 })
        .default("0.00")
        .notNull(),
    // Contadores físicos (para controle de estoque)
    totalDiapersCount: (0, mysql_core_1.int)("total_diapers_count").default(0), // Total fraldas em estoque virtual
    availableDiapersCount: (0, mysql_core_1.int)("available_diapers_count").default(0), // Disponíveis para retirada
    // Meta e estatísticas
    targetAmount: (0, mysql_core_1.decimal)("target_amount", { precision: 12, scale: 2 }), // Meta de arrecadação
    totalGuests: (0, mysql_core_1.int)("total_guests").default(0), // Total de convidados que compraram
    // URLs de compartilhamento
    publicLink: (0, mysql_core_1.varchar)("public_link", { length: 500 }), // Link para convidados comprarem
    // Mensagem personalizada para convidados
    welcomeMessage: (0, mysql_core_1.text)("welcome_message"), // Mensagem carinhosa exibida na página pública
    // Timestamps
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
    closedAt: (0, mysql_core_1.timestamp)("closed_at"),
});
/**
 * Cotas/Pacotes disponíveis para compra
 */
exports.babyShowerGiftPackages = (0, mysql_core_1.mysqlTable)("baby_shower_gift_packages", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    eventId: (0, mysql_core_1.int)("event_id")
        .references(function () { return exports.babyShowerEvents.id; }, { onDelete: "cascade" })
        .notNull(),
    // Configuração da Cota
    packageName: (0, mysql_core_1.varchar)("package_name", { length: 120 }).notNull(), // Ex: "Pacote Fraldas P"
    description: (0, mysql_core_1.text)("description"),
    // Imagem do produto
    imageUrl: (0, mysql_core_1.text)("image_url"), // URL da imagem (upload ou externa, pode ser base64)
    // Tipo de presente
    giftType: (0, mysql_core_1.mysqlEnum)("gift_type", ["diapers", "wipes", "money", "product"])
        .default("diapers")
        .notNull(),
    // Quantidade representada (ex: 1 pacote = 20 fraldas)
    quantityRepresented: (0, mysql_core_1.int)("quantity_represented").default(1),
    sizeLabel: (0, mysql_core_1.varchar)("size_label", { length: 20 }), // Ex: "P", "M", "G", "GG"
    // Valores
    price: (0, mysql_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    stockLimit: (0, mysql_core_1.int)("stock_limit"), // Limite de cotas deste tipo (null = ilimitado)
    // Contadores
    soldCount: (0, mysql_core_1.int)("sold_count").default(0),
    isActive: (0, mysql_core_1.int)("is_active").default(1).notNull(),
    // Ordem de exibição (drag-and-drop)
    displayOrder: (0, mysql_core_1.int)("display_order").default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Compras/Cotas realizadas por convidados
 */
exports.babyShowerPurchases = (0, mysql_core_1.mysqlTable)("baby_shower_purchases", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    eventId: (0, mysql_core_1.int)("event_id")
        .references(function () { return exports.babyShowerEvents.id; }, { onDelete: "cascade" })
        .notNull(),
    packageId: (0, mysql_core_1.int)("package_id")
        .references(function () { return exports.babyShowerGiftPackages.id; })
        .notNull(),
    // Dados do convidado (lead no CRM)
    guestCustomerId: (0, mysql_core_1.int)("guest_customer_id").references(function () { return exports.customers.id; }), // Pode ser nulo se convidado não identificado
    // Dados da compra
    guestName: (0, mysql_core_1.varchar)("guest_name", { length: 255 }).notNull(),
    guestPhone: (0, mysql_core_1.varchar)("guest_phone", { length: 20 }),
    guestEmail: (0, mysql_core_1.varchar)("guest_email", { length: 320 }),
    // Mensagem para o bebê (opcional)
    messageToParents: (0, mysql_core_1.text)("message_to_parents"),
    // Status do pagamento
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", [
        "pending",
        "paid",
        "failed",
        "refunded",
    ])
        .default("pending")
        .notNull(),
    amountPaid: (0, mysql_core_1.decimal)("amount_paid", { precision: 10, scale: 2 }).notNull(),
    // Dados do pagamento
    paymentMethod: (0, mysql_core_1.varchar)("payment_method", { length: 50 }), // pix, credit_card, etc
    paymentReference: (0, mysql_core_1.varchar)("payment_reference", { length: 255 }), // ID da transação
    paidAt: (0, mysql_core_1.timestamp)("paid_at"),
    // Notificação enviada
    notificationSent: (0, mysql_core_1.int)("notification_sent").default(0),
    notificationSentAt: (0, mysql_core_1.timestamp)("notification_sent_at"),
    // Token único para confirmação de pagamento via link
    confirmationToken: (0, mysql_core_1.varchar)("confirmation_token", { length: 64 }).unique(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/**
 * Retiradas de fraldas pelo caixa (estoque virtual → físico)
 */
exports.babyShowerWithdrawals = (0, mysql_core_1.mysqlTable)("baby_shower_withdrawals", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    eventId: (0, mysql_core_1.int)("event_id")
        .references(function () { return exports.babyShowerEvents.id; }, { onDelete: "cascade" })
        .notNull(),
    // Tarefa relacionada no sistema (integração com crm_tasks)
    relatedTaskId: (0, mysql_core_1.int)("related_task_id").references(function () { return exports.crmTasks.id; }),
    // Dados da retirada
    withdrawalType: (0, mysql_core_1.mysqlEnum)("withdrawal_type", [
        "diapers",
        "wipes",
        "money",
    ])
        .default("diapers")
        .notNull(),
    // Se for fraldas
    diaperSize: (0, mysql_core_1.varchar)("diaper_size", { length: 20 }), // P, M, G, GG
    quantity: (0, mysql_core_1.int)("quantity").notNull(),
    // Acesso ao caixa
    requestedAt: (0, mysql_core_1.timestamp)("requested_at").defaultNow().notNull(),
    fulfilledAt: (0, mysql_core_1.timestamp)("fulfilled_at"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", [
        "requested",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
    ])
        .default("requested")
        .notNull(),
    // Quem atendeu
    fulfilledBy: (0, mysql_core_1.int)("fulfilled_by").references(function () { return exports.users.id; }),
    // Método de entrega
    deliveryMethod: (0, mysql_core_1.mysqlEnum)("delivery_method", ["pickup", "delivery"])
        .default("pickup")
        .notNull(),
    notes: (0, mysql_core_1.text)("notes"),
});
// broadcast membership tracking
exports.broadcastMembersSent = (0, mysql_core_1.mysqlTable)("broadcast_members_sent", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    broadcastMessageId: (0, mysql_core_1.int)("message_id").notNull(),
    customerId: (0, mysql_core_1.int)("customer_id").notNull(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }).notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 16 }).default("pending").notNull(),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    sentAt: (0, mysql_core_1.timestamp)("sent_at"),
    deliveredAt: (0, mysql_core_1.timestamp)("delivered_at"),
    readAt: (0, mysql_core_1.timestamp)("read_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// webhook idempotency table
exports.processedWebhookMessages = (0, mysql_core_1.mysqlTable)("processed_webhook_messages", {
    id: (0, mysql_core_1.varchar)("id", { length: 255 }).primaryKey(),
    processedAt: (0, mysql_core_1.timestamp)("processed_at").defaultNow().notNull(),
    provider: (0, mysql_core_1.varchar)("provider", { length: 16 }),
});
__exportStar(require("./schema_logs"), exports);
