"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc26) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc26 = __getOwnPropDesc(from, key)) || desc26.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/const.ts
var COOKIE_NAME, AXIOS_TIMEOUT_MS, ONE_YEAR_MS;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "farma-francis-auth";
    AXIOS_TIMEOUT_MS = 3e4;
    ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1e3;
  }
});

// shared/_core/errors.ts
var ForbiddenError;
var init_errors = __esm({
  "shared/_core/errors.ts"() {
    "use strict";
    ForbiddenError = class extends Error {
      constructor(message2) {
        super(message2);
        this.name = "ForbiddenError";
      }
    };
  }
});

// server/_core/env.ts
var JWT_SECRET, ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    JWT_SECRET = process.env.JWT_SECRET || "";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET || "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/_core/sdk.ts
var import_axios, import_cookie, import_jose, isNonEmptyString, EXCHANGE_TOKEN_PATH, GET_USER_INFO_PATH, GET_USER_INFO_WITH_JWT_PATH, OAuthService, createOAuthHttpClient, SDKServer, sdk;
var init_sdk = __esm({
  "server/_core/sdk.ts"() {
    "use strict";
    init_const();
    init_errors();
    import_axios = __toESM(require("axios"), 1);
    import_cookie = require("cookie");
    import_jose = require("jose");
    init_db();
    init_env();
    isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
    EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
    GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
    GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
    OAuthService = class {
      constructor(client) {
        this.client = client;
        if (!ENV.oAuthServerUrl) {
          console.error(
            "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
          );
        }
      }
      decodeState(state) {
        const redirectUri = atob(state);
        return redirectUri;
      }
      async getTokenByCode(code, state) {
        const payload = {
          clientId: ENV.appId,
          grantType: "authorization_code",
          code,
          redirectUri: this.decodeState(state)
        };
        const { data } = await this.client.post(
          EXCHANGE_TOKEN_PATH,
          payload
        );
        return data;
      }
      async getUserInfoByToken(token) {
        const { data } = await this.client.post(
          GET_USER_INFO_PATH,
          {
            accessToken: token.accessToken
          }
        );
        return data;
      }
    };
    createOAuthHttpClient = () => import_axios.default.create({
      baseURL: ENV.oAuthServerUrl,
      timeout: AXIOS_TIMEOUT_MS
    });
    SDKServer = class {
      client;
      oauthService;
      constructor(client = createOAuthHttpClient()) {
        this.client = client;
        this.oauthService = new OAuthService(this.client);
      }
      deriveLoginMethod(platforms, fallback) {
        if (fallback && fallback.length > 0) return fallback;
        if (!Array.isArray(platforms) || platforms.length === 0) return null;
        const set = new Set(
          platforms.filter((p) => typeof p === "string")
        );
        if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
        if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
        if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
        if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
          return "microsoft";
        if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
        const first = Array.from(set)[0];
        return first ? first.toLowerCase() : null;
      }
      /**
       * Exchange OAuth authorization code for access token
       * @example
       * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
       */
      async exchangeCodeForToken(code, state) {
        return this.oauthService.getTokenByCode(code, state);
      }
      /**
       * Get user information using access token
       * @example
       * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
       */
      async getUserInfo(accessToken) {
        const data = await this.oauthService.getUserInfoByToken({
          accessToken
        });
        const loginMethod = this.deriveLoginMethod(
          data?.platforms,
          data?.platform ?? data.platform ?? null
        );
        return {
          ...data,
          platform: loginMethod,
          loginMethod
        };
      }
      parseCookies(cookieHeader) {
        if (!cookieHeader) {
          return /* @__PURE__ */ new Map();
        }
        const parsed = (0, import_cookie.parse)(cookieHeader);
        return new Map(Object.entries(parsed));
      }
      getSessionSecret() {
        const secret = ENV.cookieSecret;
        return new TextEncoder().encode(secret);
      }
      /**
       * Create a session token for a Manus user openId
       * @example
       * const sessionToken = await sdk.createSessionToken(userInfo.openId);
       */
      async createSessionToken(openId, options = {}) {
        return this.signSession(
          {
            openId,
            appId: ENV.appId,
            name: options.name || ""
          },
          options
        );
      }
      async signSession(payload, options = {}) {
        const issuedAt = Date.now();
        const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
        const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
        const secretKey = this.getSessionSecret();
        return new import_jose.SignJWT({
          openId: payload.openId,
          appId: payload.appId,
          name: payload.name
        }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
      }
      async verifySession(cookieValue) {
        if (!cookieValue) {
          return null;
        }
        try {
          const secretKey = this.getSessionSecret();
          const { payload } = await (0, import_jose.jwtVerify)(cookieValue, secretKey, {
            algorithms: ["HS256"]
          });
          const { openId, appId, name } = payload;
          if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
            return null;
          }
          return {
            openId,
            appId,
            name
          };
        } catch (error) {
          console.warn("[Auth] Session verification failed", String(error));
          return null;
        }
      }
      async getUserInfoWithJwt(jwtToken) {
        const payload = {
          jwtToken,
          projectId: ENV.appId
        };
        const { data } = await this.client.post(
          GET_USER_INFO_WITH_JWT_PATH,
          payload
        );
        const loginMethod = this.deriveLoginMethod(
          data?.platforms,
          data?.platform ?? data.platform ?? null
        );
        return {
          ...data,
          platform: loginMethod,
          loginMethod
        };
      }
      async authenticateRequest(req) {
        const cookies = this.parseCookies(req.headers.cookie);
        const sessionCookie = cookies.get(COOKIE_NAME);
        const session = await this.verifySession(sessionCookie);
        if (!session) {
          throw ForbiddenError("Invalid session cookie");
        }
        const sessionUserId = session.openId;
        const signedInAt = /* @__PURE__ */ new Date();
        let user = await getUserByOpenId(sessionUserId);
        if (!user) {
          try {
            const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
            await upsertUser({
              openId: userInfo.openId,
              name: userInfo.name || null,
              email: userInfo.email ?? null,
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
              lastSignedIn: signedInAt
            });
            user = await getUserByOpenId(userInfo.openId);
          } catch (error) {
            console.error("[Auth] Failed to sync user from OAuth:", error);
            throw ForbiddenError("Failed to sync user info");
          }
        }
        if (!user) {
          throw ForbiddenError("User not found");
        }
        await upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt
        });
        return user;
      }
    };
    sdk = new SDKServer();
  }
});

// drizzle/schema_executions.ts
var import_mysql_core, flowExecutions, nodeExecutions, flowAnalytics, flowVersions, flowTags, flowTagRelations;
var init_schema_executions = __esm({
  "drizzle/schema_executions.ts"() {
    "use strict";
    import_mysql_core = require("drizzle-orm/mysql-core");
    flowExecutions = (0, import_mysql_core.mysqlTable)("flow_executions", {
      id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
      flowId: (0, import_mysql_core.int)("flow_id").notNull(),
      status: (0, import_mysql_core.varchar)("status", { length: 16 }).notNull(),
      trigger: (0, import_mysql_core.varchar)("trigger_type", { length: 32 }),
      startedAt: (0, import_mysql_core.timestamp)("started_at").defaultNow().notNull(),
      finishedAt: (0, import_mysql_core.timestamp)("finished_at"),
      input: (0, import_mysql_core.text)("input"),
      error: (0, import_mysql_core.text)("error")
    });
    nodeExecutions = null;
    flowAnalytics = null;
    flowVersions = null;
    flowTags = null;
    flowTagRelations = null;
  }
});

// drizzle/schema_logs.ts
var import_pg_core, flowExecutionLogs;
var init_schema_logs = __esm({
  "drizzle/schema_logs.ts"() {
    "use strict";
    import_pg_core = require("drizzle-orm/pg-core");
    flowExecutionLogs = (0, import_pg_core.pgTable)("flow_execution_logs", {
      id: (0, import_pg_core.serial)("id").primaryKey(),
      executionId: (0, import_pg_core.integer)("execution_id").notNull(),
      nodeId: (0, import_pg_core.varchar)("node_id", { length: 255 }),
      nodeName: (0, import_pg_core.varchar)("node_name", { length: 255 }),
      nodeType: (0, import_pg_core.varchar)("node_type", { length: 100 }),
      status: (0, import_pg_core.varchar)("status", { length: 16 }),
      input: (0, import_pg_core.text)("input"),
      output: (0, import_pg_core.text)("output"),
      error: (0, import_pg_core.text)("error"),
      duration: (0, import_pg_core.integer)("duration"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
    });
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountContacts: () => accountContacts,
  accounts: () => accounts,
  agentPauses: () => agentPauses,
  agentStatus: () => agentStatus,
  aiChats: () => aiChats,
  apiConfigurations: () => apiConfigurations,
  approvals: () => approvals,
  attachments: () => attachments,
  auditLogs: () => auditLogs,
  automationFlows: () => automationFlows,
  babyShowerEvents: () => babyShowerEvents,
  babyShowerGiftPackages: () => babyShowerGiftPackages,
  babyShowerPurchases: () => babyShowerPurchases,
  babyShowerWithdrawals: () => babyShowerWithdrawals,
  broadcastListMembers: () => broadcastListMembers,
  broadcastLists: () => broadcastLists,
  broadcastMembersSent: () => broadcastMembersSent,
  broadcastMessages: () => broadcastMessages,
  conversationMessages: () => conversationMessages,
  conversationTags: () => conversationTags,
  conversations: () => conversations,
  crmActivities: () => crmActivities,
  crmAuditLogs: () => crmAuditLogs,
  crmOutboxEvents: () => crmOutboxEvents,
  crmScripts: () => crmScripts,
  crmTasks: () => crmTasks,
  customFieldDefinitions: () => customFieldDefinitions,
  customFieldValues: () => customFieldValues,
  customerTags: () => customerTags,
  customerTreatments: () => customerTreatments,
  customers: () => customers,
  dealPipelines: () => dealPipelines,
  dealStages: () => dealStages,
  deals: () => deals,
  employees: () => employees,
  executionData: () => executionData,
  flowAnalytics: () => flowAnalytics,
  flowExecutionLogs: () => flowExecutionLogs,
  flowExecutions: () => flowExecutions,
  flowTagRelations: () => flowTagRelations,
  flowTags: () => flowTags,
  flowVersions: () => flowVersions,
  frontendTelemetryEvents: () => frontendTelemetryEvents,
  integrationSettings: () => integrationSettings,
  interactions: () => interactions,
  internalMessages: () => internalMessages,
  leads: () => leads,
  messages: () => messages,
  nodeExecutions: () => nodeExecutions,
  notifications: () => notifications,
  pharmaProducts: () => pharmaProducts,
  pharmaPurchaseItems: () => pharmaPurchaseItems,
  pharmaPurchases: () => pharmaPurchases,
  processedWebhookMessages: () => processedWebhookMessages,
  queueAgents: () => queueAgents,
  queueSettings: () => queueSettings,
  queues: () => queues,
  quickReplies: () => quickReplies,
  receivedMessages: () => receivedMessages,
  reminders: () => reminders,
  storyCache: () => storyCache,
  surveyResponses: () => surveyResponses,
  tags: () => tags,
  ticketComments: () => ticketComments,
  ticketTags: () => ticketTags,
  tickets: () => tickets,
  uraMenus: () => uraMenus,
  users: () => users,
  visualFlows: () => visualFlows,
  workflowCredentials: () => workflowCredentials,
  workflowExecutions: () => workflowExecutions,
  workflowSchedules: () => workflowSchedules,
  workflowWebhooks: () => workflowWebhooks
});
var import_mysql_core2, users, customers, leads, tickets, approvals, accounts, accountContacts, dealPipelines, dealStages, deals, crmTasks, customFieldDefinitions, customFieldValues, ticketComments, crmOutboxEvents, crmAuditLogs, crmActivities, frontendTelemetryEvents, interactions, employees, automationFlows, messages, attachments, auditLogs, notifications, aiChats, visualFlows, uraMenus, apiConfigurations, receivedMessages, workflowExecutions, executionData, workflowCredentials, workflowWebhooks, workflowSchedules, conversations, quickReplies, agentStatus, queueSettings, agentPauses, queues, queueAgents, conversationMessages, internalMessages, integrationSettings, customerTreatments, pharmaProducts, pharmaPurchases, pharmaPurchaseItems, tags, conversationTags, ticketTags, customerTags, surveyResponses, crmScripts, broadcastLists, broadcastListMembers, broadcastMessages, babyShowerEvents, babyShowerGiftPackages, babyShowerPurchases, babyShowerWithdrawals, broadcastMembersSent, processedWebhookMessages, storyCache, reminders;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    import_mysql_core2 = require("drizzle-orm/mysql-core");
    init_schema_executions();
    init_schema_logs();
    users = (0, import_mysql_core2.mysqlTable)("users", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      openId: (0, import_mysql_core2.varchar)("openId", { length: 64 }).notNull().unique(),
      name: (0, import_mysql_core2.text)("name"),
      displayName: (0, import_mysql_core2.varchar)("display_name", { length: 255 }),
      email: (0, import_mysql_core2.varchar)("email", { length: 320 }),
      passwordHash: (0, import_mysql_core2.varchar)("passwordHash", { length: 255 }),
      loginMethod: (0, import_mysql_core2.varchar)("loginMethod", { length: 64 }),
      role: (0, import_mysql_core2.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("createdAt").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: (0, import_mysql_core2.timestamp)("lastSignedIn").defaultNow().notNull()
    });
    customers = (0, import_mysql_core2.mysqlTable)("customers", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      email: (0, import_mysql_core2.varchar)("email", { length: 320 }),
      phone: (0, import_mysql_core2.varchar)("phone", { length: 100 }).unique(),
      cpfCnpj: (0, import_mysql_core2.varchar)("cpf_cnpj", { length: 18 }),
      address: (0, import_mysql_core2.text)("address"),
      city: (0, import_mysql_core2.varchar)("city", { length: 100 }),
      state: (0, import_mysql_core2.varchar)("state", { length: 2 }),
      zipCode: (0, import_mysql_core2.varchar)("zip_code", { length: 10 }),
      tags: (0, import_mysql_core2.text)("tags"),
      notes: (0, import_mysql_core2.text)("notes"),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "inactive", "blocked"]).default("active").notNull(),
      source: (0, import_mysql_core2.varchar)("source", { length: 64 }).default("manual"),
      createdBy: (0, import_mysql_core2.int)("created_by"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
      photoUrl: (0, import_mysql_core2.varchar)("photo_url", { length: 500 }),
      birthDate: (0, import_mysql_core2.date)("birth_date"),
      healthTagsJson: (0, import_mysql_core2.text)("health_tags_json"),
      whatsappOptIn: (0, import_mysql_core2.int)("whatsapp_opt_in").default(0).notNull(),
      whatsappOptInAt: (0, import_mysql_core2.datetime)("whatsapp_opt_in_at"),
      ltvValue: (0, import_mysql_core2.decimal)("ltv_value", { precision: 12, scale: 2 }).default("0.00"),
      lastPurchaseAt: (0, import_mysql_core2.datetime)("last_purchase_at"),
      expectedDueDate: (0, import_mysql_core2.date)("expected_due_date")
    });
    leads = (0, import_mysql_core2.mysqlTable)("leads", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      email: (0, import_mysql_core2.varchar)("email", { length: 320 }),
      phone: (0, import_mysql_core2.varchar)("phone", { length: 20 }),
      source: (0, import_mysql_core2.varchar)("source", { length: 100 }),
      // whatsapp, instagram, website, etc
      stage: (0, import_mysql_core2.mysqlEnum)("stage", [
        "prospect",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost"
      ]).default("prospect").notNull(),
      value: (0, import_mysql_core2.int)("value"),
      // potential deal value
      assignedTo: (0, import_mysql_core2.int)("assigned_to").references(() => users.id),
      followUpDate: (0, import_mysql_core2.timestamp)("follow_up_date"),
      notes: (0, import_mysql_core2.text)("notes"),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    tickets = (0, import_mysql_core2.mysqlTable)("tickets", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      ticketNumber: (0, import_mysql_core2.varchar)("ticket_number", { length: 50 }).notNull().unique(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      subject: (0, import_mysql_core2.varchar)("subject", { length: 255 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      status: (0, import_mysql_core2.mysqlEnum)("status", [
        "open",
        "in_progress",
        "pending",
        "resolved",
        "closed"
      ]).default("open").notNull(),
      priority: (0, import_mysql_core2.mysqlEnum)("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
      category: (0, import_mysql_core2.varchar)("category", { length: 100 }),
      channel: (0, import_mysql_core2.mysqlEnum)("channel", [
        "whatsapp",
        "instagram",
        "email",
        "phone",
        "web"
      ]),
      assignedTo: (0, import_mysql_core2.int)("assigned_to").references(() => users.id),
      slaDeadline: (0, import_mysql_core2.timestamp)("sla_deadline"),
      resolvedAt: (0, import_mysql_core2.timestamp)("resolved_at"),
      closedAt: (0, import_mysql_core2.timestamp)("closed_at"),
      timeSpentMinutes: (0, import_mysql_core2.int)("time_spent_minutes").default(0),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    approvals = (0, import_mysql_core2.mysqlTable)("approvals", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 64 }).notNull(),
      entityId: (0, import_mysql_core2.int)("entity_id").notNull(),
      requestedBy: (0, import_mysql_core2.int)("requested_by").references(() => users.id).notNull(),
      approvedBy: (0, import_mysql_core2.int)("approved_by").references(() => users.id),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
      reason: (0, import_mysql_core2.text)("reason"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    accounts = (0, import_mysql_core2.mysqlTable)("accounts", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      legalName: (0, import_mysql_core2.varchar)("legal_name", { length: 255 }),
      cnpj: (0, import_mysql_core2.varchar)("cnpj", { length: 18 }),
      industry: (0, import_mysql_core2.varchar)("industry", { length: 120 }),
      website: (0, import_mysql_core2.varchar)("website", { length: 255 }),
      phone: (0, import_mysql_core2.varchar)("phone", { length: 20 }),
      address: (0, import_mysql_core2.text)("address"),
      city: (0, import_mysql_core2.varchar)("city", { length: 100 }),
      state: (0, import_mysql_core2.varchar)("state", { length: 2 }),
      zipCode: (0, import_mysql_core2.varchar)("zip_code", { length: 10 }),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "inactive"]).default("active").notNull(),
      ownerUserId: (0, import_mysql_core2.int)("owner_user_id").references(() => users.id),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    accountContacts = (0, import_mysql_core2.mysqlTable)("account_contacts", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      accountId: (0, import_mysql_core2.int)("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      role: (0, import_mysql_core2.varchar)("role", { length: 120 }),
      isPrimary: (0, import_mysql_core2.int)("is_primary").default(0).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    dealPipelines = (0, import_mysql_core2.mysqlTable)("deal_pipelines", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 120 }).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    dealStages = (0, import_mysql_core2.mysqlTable)("deal_stages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      pipelineId: (0, import_mysql_core2.int)("pipeline_id").references(() => dealPipelines.id, { onDelete: "cascade" }).notNull(),
      name: (0, import_mysql_core2.varchar)("name", { length: 120 }).notNull(),
      sortOrder: (0, import_mysql_core2.int)("sort_order").default(0).notNull(),
      probability: (0, import_mysql_core2.int)("probability").default(0).notNull(),
      // 0-100
      isWon: (0, import_mysql_core2.int)("is_won").default(0).notNull(),
      isLost: (0, import_mysql_core2.int)("is_lost").default(0).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    deals = (0, import_mysql_core2.mysqlTable)("deals", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      accountId: (0, import_mysql_core2.int)("account_id").references(() => accounts.id),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      pipelineId: (0, import_mysql_core2.int)("pipeline_id").references(() => dealPipelines.id).notNull(),
      stageId: (0, import_mysql_core2.int)("stage_id").references(() => dealStages.id).notNull(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }).notNull(),
      amountCents: (0, import_mysql_core2.int)("amount_cents"),
      currency: (0, import_mysql_core2.varchar)("currency", { length: 3 }).default("BRL"),
      closeDate: (0, import_mysql_core2.timestamp)("close_date"),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["open", "won", "lost"]).default("open").notNull(),
      ownerUserId: (0, import_mysql_core2.int)("owner_user_id").references(() => users.id),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    crmTasks = (0, import_mysql_core2.mysqlTable)("crm_tasks", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      dueAt: (0, import_mysql_core2.timestamp)("due_at"),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["open", "done", "cancelled"]).default("open").notNull(),
      priority: (0, import_mysql_core2.mysqlEnum)("priority", ["low", "medium", "high"]).default("medium").notNull(),
      relatedEntityType: (0, import_mysql_core2.varchar)("related_entity_type", { length: 40 }),
      relatedEntityId: (0, import_mysql_core2.int)("related_entity_id"),
      assignedTo: (0, import_mysql_core2.int)("assigned_to").references(() => users.id),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
      completedAt: (0, import_mysql_core2.timestamp)("completed_at")
    });
    customFieldDefinitions = (0, import_mysql_core2.mysqlTable)("custom_field_definitions", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 40 }).notNull(),
      // customer/account/lead/deal/ticket
      key: (0, import_mysql_core2.varchar)("key", { length: 80 }).notNull(),
      label: (0, import_mysql_core2.varchar)("label", { length: 120 }).notNull(),
      fieldType: (0, import_mysql_core2.mysqlEnum)("field_type", [
        "text",
        "number",
        "date",
        "boolean",
        "select"
      ]).notNull(),
      optionsJson: (0, import_mysql_core2.text)("options_json"),
      isRequired: (0, import_mysql_core2.int)("is_required").default(0).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    customFieldValues = (0, import_mysql_core2.mysqlTable)("custom_field_values", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 40 }).notNull(),
      entityId: (0, import_mysql_core2.int)("entity_id").notNull(),
      fieldDefinitionId: (0, import_mysql_core2.int)("field_definition_id").references(() => customFieldDefinitions.id, { onDelete: "cascade" }).notNull(),
      valueText: (0, import_mysql_core2.text)("value_text"),
      updatedBy: (0, import_mysql_core2.int)("updated_by").references(() => users.id),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    ticketComments = (0, import_mysql_core2.mysqlTable)("ticket_comments", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id),
      content: (0, import_mysql_core2.text)("content").notNull(),
      isInternal: (0, import_mysql_core2.int)("is_internal").default(0).notNull(),
      // 0 = false, 1 = true (internal notes vs customer-visible)
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    crmOutboxEvents = (0, import_mysql_core2.mysqlTable)("crm_outbox_events", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      eventName: (0, import_mysql_core2.varchar)("event_name", { length: 120 }).notNull(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 40 }).notNull(),
      entityId: (0, import_mysql_core2.int)("entity_id"),
      actorUserId: (0, import_mysql_core2.int)("actor_user_id").references(() => users.id),
      payloadJson: (0, import_mysql_core2.text)("payload_json"),
      idempotencyKey: (0, import_mysql_core2.varchar)("idempotency_key", { length: 120 }),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["pending", "processed", "failed"]).default("pending").notNull(),
      error: (0, import_mysql_core2.text)("error"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      processedAt: (0, import_mysql_core2.timestamp)("processed_at")
    });
    crmAuditLogs = (0, import_mysql_core2.mysqlTable)("crm_audit_logs", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      action: (0, import_mysql_core2.varchar)("action", { length: 80 }).notNull(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 40 }).notNull(),
      entityId: (0, import_mysql_core2.int)("entity_id"),
      actorUserId: (0, import_mysql_core2.int)("actor_user_id").references(() => users.id),
      beforeJson: (0, import_mysql_core2.text)("before_json"),
      afterJson: (0, import_mysql_core2.text)("after_json"),
      requestId: (0, import_mysql_core2.varchar)("request_id", { length: 80 }),
      ip: (0, import_mysql_core2.varchar)("ip", { length: 80 }),
      userAgent: (0, import_mysql_core2.varchar)("user_agent", { length: 255 }),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    crmActivities = (0, import_mysql_core2.mysqlTable)("crm_activities", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 40 }).notNull(),
      entityId: (0, import_mysql_core2.int)("entity_id").notNull(),
      activityType: (0, import_mysql_core2.varchar)("activity_type", { length: 40 }).notNull(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }),
      body: (0, import_mysql_core2.text)("body"),
      metadataJson: (0, import_mysql_core2.text)("metadata_json"),
      actorUserId: (0, import_mysql_core2.int)("actor_user_id").references(() => users.id),
      occurredAt: (0, import_mysql_core2.timestamp)("occurred_at").defaultNow().notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    frontendTelemetryEvents = (0, import_mysql_core2.mysqlTable)("frontend_telemetry_events", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id),
      page: (0, import_mysql_core2.varchar)("page", { length: 160 }),
      eventName: (0, import_mysql_core2.varchar)("event_name", { length: 120 }).notNull(),
      payloadJson: (0, import_mysql_core2.text)("payload_json"),
      occurredAt: (0, import_mysql_core2.timestamp)("occurred_at").defaultNow().notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    interactions = (0, import_mysql_core2.mysqlTable)("interactions", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id),
      leadId: (0, import_mysql_core2.int)("lead_id").references(() => leads.id),
      type: (0, import_mysql_core2.mysqlEnum)("type", [
        "call",
        "email",
        "whatsapp",
        "instagram",
        "meeting",
        "note"
      ]).notNull(),
      subject: (0, import_mysql_core2.varchar)("subject", { length: 255 }),
      content: (0, import_mysql_core2.text)("content"),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    employees = (0, import_mysql_core2.mysqlTable)("employees", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
      cpf: (0, import_mysql_core2.varchar)("cpf", { length: 14 }).unique(),
      phone: (0, import_mysql_core2.varchar)("phone", { length: 20 }),
      position: (0, import_mysql_core2.varchar)("position", { length: 100 }),
      department: (0, import_mysql_core2.varchar)("department", { length: 100 }),
      hireDate: (0, import_mysql_core2.timestamp)("hire_date"),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "inactive", "vacation"]).default("active").notNull(),
      skills: (0, import_mysql_core2.text)("skills"),
      // JSON array
      photoUrl: (0, import_mysql_core2.varchar)("photo_url", { length: 500 }),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    automationFlows = (0, import_mysql_core2.mysqlTable)("automation_flows", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      channel: (0, import_mysql_core2.mysqlEnum)("channel", ["whatsapp", "instagram", "both"]).notNull(),
      trigger: (0, import_mysql_core2.text)("trigger").notNull(),
      // keywords separated by comma
      response: (0, import_mysql_core2.text)("response").notNull(),
      // auto-response message
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      // 0 = inactive, 1 = active
      responseCount: (0, import_mysql_core2.int)("response_count").default(0).notNull(),
      // number of times triggered
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    messages = (0, import_mysql_core2.mysqlTable)("messages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id),
      channel: (0, import_mysql_core2.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
      direction: (0, import_mysql_core2.mysqlEnum)("direction", ["inbound", "outbound"]).notNull(),
      content: (0, import_mysql_core2.text)("content").notNull(),
      messageId: (0, import_mysql_core2.varchar)("message_id", { length: 255 }),
      // external message ID
      status: (0, import_mysql_core2.mysqlEnum)("status", ["sent", "delivered", "read", "failed"]),
      metadata: (0, import_mysql_core2.text)("metadata"),
      // JSON for additional data
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    attachments = (0, import_mysql_core2.mysqlTable)("attachments", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      fileName: (0, import_mysql_core2.varchar)("file_name", { length: 255 }).notNull(),
      fileKey: (0, import_mysql_core2.varchar)("file_key", { length: 500 }).notNull(),
      // S3 key
      fileUrl: (0, import_mysql_core2.varchar)("file_url", { length: 1e3 }).notNull(),
      // S3 URL
      mimeType: (0, import_mysql_core2.varchar)("mime_type", { length: 100 }),
      fileSize: (0, import_mysql_core2.int)("file_size"),
      // in bytes
      uploadedBy: (0, import_mysql_core2.int)("uploaded_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    auditLogs = (0, import_mysql_core2.mysqlTable)("audit_logs", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id),
      action: (0, import_mysql_core2.varchar)("action", { length: 100 }).notNull(),
      // create, up delete, login, etc
      entityType: (0, import_mysql_core2.varchar)("entity_type", { length: 100 }),
      // ticket, customer, user, etc
      entityId: (0, import_mysql_core2.int)("entity_id"),
      changes: (0, import_mysql_core2.text)("changes"),
      // JSON of what changed
      ipAddress: (0, import_mysql_core2.varchar)("ip_address", { length: 45 }),
      userAgent: (0, import_mysql_core2.text)("user_agent"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    notifications = (0, import_mysql_core2.mysqlTable)("notifications", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }).notNull(),
      content: (0, import_mysql_core2.text)("content"),
      type: (0, import_mysql_core2.mysqlEnum)("type", ["ticket", "lead", "system", "goal"]).notNull(),
      isRead: (0, import_mysql_core2.int)("is_read").default(0).notNull(),
      // 0 = false, 1 = true
      relatedId: (0, import_mysql_core2.int)("related_id"),
      // ticket_id, lead_id, etc
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    aiChats = (0, import_mysql_core2.mysqlTable)("ai_chats", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      userId: (0, import_mysql_core2.int)("user_id").references(() => users.id),
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id),
      role: (0, import_mysql_core2.mysqlEnum)("role", ["user", "assistant", "system"]).notNull(),
      content: (0, import_mysql_core2.text)("content").notNull(),
      metadata: (0, import_mysql_core2.text)("metadata"),
      // JSON for additional context
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    visualFlows = (0, import_mysql_core2.mysqlTable)("visual_flows", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      flowData: (0, import_mysql_core2.text)("flow_data").notNull(),
      // JSON: {nodes: [], edges: []}
      isActive: (0, import_mysql_core2.int)("is_active").default(0).notNull(),
      isTestMode: (0, import_mysql_core2.int)("is_test_mode").default(0).notNull(),
      // Test mode flag
      executionCount: (0, import_mysql_core2.int)("execution_count").default(0).notNull(),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    uraMenus = (0, import_mysql_core2.mysqlTable)("ura_menus", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      welcomeMessage: (0, import_mysql_core2.text)("welcome_message").notNull(),
      menuData: (0, import_mysql_core2.text)("menu_data").notNull(),
      // JSON: [{option: "1", label: "Vendas", action: "transfer", value: "dept_sales"}]
      workingHours: (0, import_mysql_core2.text)("working_hours"),
      // JSON: {start: "08:00", end: "18:00", days: [1,2,3,4,5]}
      offHoursMessage: (0, import_mysql_core2.text)("off_hours_message"),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    apiConfigurations = (0, import_mysql_core2.mysqlTable)("api_configurations", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      provider: (0, import_mysql_core2.mysqlEnum)("provider", ["whatsapp", "instagram"]).notNull(),
      token: (0, import_mysql_core2.text)("token").notNull(),
      // Encrypted
      phoneNumberId: (0, import_mysql_core2.varchar)("phone_number_id", { length: 255 }),
      // WhatsApp only
      pageId: (0, import_mysql_core2.varchar)("page_id", { length: 255 }),
      // Instagram only
      webhookUrl: (0, import_mysql_core2.varchar)("webhook_url", { length: 512 }),
      webhookVerifyToken: (0, import_mysql_core2.varchar)("webhook_verify_token", { length: 255 }),
      appSecret: (0, import_mysql_core2.varchar)("app_secret", { length: 255 }),
      // For HMAC signature validation
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      lastTestedAt: (0, import_mysql_core2.timestamp)("last_tested_at"),
      testStatus: (0, import_mysql_core2.mysqlEnum)("test_status", [
        "success",
        "failed",
        "not_tested"
      ]).default("not_tested"),
      testMessage: (0, import_mysql_core2.text)("test_message"),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    receivedMessages = (0, import_mysql_core2.mysqlTable)("received_messages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      provider: (0, import_mysql_core2.mysqlEnum)("provider", ["whatsapp", "instagram"]).notNull(),
      externalId: (0, import_mysql_core2.varchar)("external_id", { length: 255 }).notNull(),
      // Message ID from provider
      fromNumber: (0, import_mysql_core2.varchar)("from_number", { length: 100 }).notNull(),
      // Phone number or Instagram user ID
      fromName: (0, import_mysql_core2.varchar)("from_name", { length: 255 }),
      // Sender name if available
      fromProfilePic: (0, import_mysql_core2.longtext)("from_profile_pic"),
      // Sender profile picture URL (WhatsApp/Instagram)
      messageType: (0, import_mysql_core2.mysqlEnum)("message_type", [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "location",
        "contact",
        "sticker",
        "reaction",
        "unknown"
      ]).notNull(),
      messageText: (0, import_mysql_core2.text)("message_text"),
      // Text content
      mediaUrl: (0, import_mysql_core2.longtext)("media_url"),
      // URL for media files (can be base64 data URL)
      mediaId: (0, import_mysql_core2.varchar)("media_id", { length: 255 }),
      // Media ID from provider
      mimeType: (0, import_mysql_core2.varchar)("mime_type", { length: 100 }),
      // Media MIME type
      caption: (0, import_mysql_core2.text)("caption"),
      // Media caption
      latitude: (0, import_mysql_core2.decimal)("latitude", { precision: 10, scale: 8 }),
      // Location latitude
      longitude: (0, import_mysql_core2.decimal)("longitude", { precision: 11, scale: 8 }),
      // Location longitude
      timestamp: (0, import_mysql_core2.text)("timestamp").notNull(),
      // Unix timestamp from provider (stored as text)
      rawPayload: (0, import_mysql_core2.longtext)("raw_payload"),
      // Full JSON payload for debugging
      processed: (0, import_mysql_core2.int)("processed").default(0).notNull(),
      // 0 = pending, 1 = processed
      processedAt: (0, import_mysql_core2.timestamp)("processed_at"),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      // Link to customer if identified
      ticketId: (0, import_mysql_core2.int)("ticket_id").references(() => tickets.id),
      // Link to ticket if created
      automationFlowId: (0, import_mysql_core2.int)("automation_flow_id").references(
        () => automationFlows.id
      ),
      // Flow that processed this message
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    workflowExecutions = (0, import_mysql_core2.mysqlTable)("workflow_executions", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      workflowId: (0, import_mysql_core2.int)("workflow_id").references(() => visualFlows.id).notNull(),
      status: (0, import_mysql_core2.mysqlEnum)("status", [
        "running",
        "success",
        "error",
        "waiting",
        "canceled"
      ]).notNull(),
      mode: (0, import_mysql_core2.mysqlEnum)("mode", [
        "manual",
        "trigger",
        "webhook",
        "schedule"
      ]).notNull(),
      startedAt: (0, import_mysql_core2.timestamp)("started_at").defaultNow().notNull(),
      finishedAt: (0, import_mysql_core2.timestamp)("finished_at"),
      executionTime: (0, import_mysql_core2.int)("execution_time"),
      // Milliseconds
      error: (0, import_mysql_core2.text)("error"),
      // Error message if failed
      triggeredBy: (0, import_mysql_core2.int)("triggered_by").references(() => users.id),
      // User who triggered (for manual)
      triggerData: (0, import_mysql_core2.text)("trigger_data"),
      // JSON with trigger input data
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    executionData = (0, import_mysql_core2.mysqlTable)("execution_data", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      executionId: (0, import_mysql_core2.int)("execution_id").references(() => workflowExecutions.id).notNull(),
      nodeId: (0, import_mysql_core2.varchar)("node_id", { length: 255 }).notNull(),
      // ID do nó no workflow
      nodeName: (0, import_mysql_core2.varchar)("node_name", { length: 255 }).notNull(),
      nodeType: (0, import_mysql_core2.varchar)("node_type", { length: 100 }).notNull(),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["success", "error", "skipped"]).notNull(),
      startedAt: (0, import_mysql_core2.timestamp)("started_at").notNull(),
      finishedAt: (0, import_mysql_core2.timestamp)("finished_at"),
      executionTime: (0, import_mysql_core2.int)("execution_time"),
      // Milliseconds
      inputData: (0, import_mysql_core2.text)("input_data"),
      // JSON with input
      outputData: (0, import_mysql_core2.text)("output_data"),
      // JSON with output
      error: (0, import_mysql_core2.text)("error"),
      // Error message if failed
      retryCount: (0, import_mysql_core2.int)("retry_count").default(0).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    workflowCredentials = (0, import_mysql_core2.mysqlTable)("workflow_credentials", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      type: (0, import_mysql_core2.varchar)("type", { length: 100 }).notNull(),
      // http, oauth2, api_key, database, etc
      data: (0, import_mysql_core2.text)("data").notNull(),
      // Encrypted JSON with credentials
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    workflowWebhooks = (0, import_mysql_core2.mysqlTable)("workflow_webhooks", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      workflowId: (0, import_mysql_core2.int)("workflow_id").references(() => visualFlows.id).notNull(),
      webhookId: (0, import_mysql_core2.varchar)("webhook_id", { length: 255 }).notNull().unique(),
      // UUID único
      path: (0, import_mysql_core2.varchar)("path", { length: 255 }).notNull(),
      // /webhook/abc123
      method: (0, import_mysql_core2.mysqlEnum)("method", [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
      ]).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      lastTriggeredAt: (0, import_mysql_core2.timestamp)("last_triggered_at"),
      triggerCount: (0, import_mysql_core2.int)("trigger_count").default(0).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    workflowSchedules = (0, import_mysql_core2.mysqlTable)("workflow_schedules", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      workflowId: (0, import_mysql_core2.int)("workflow_id").references(() => visualFlows.id).notNull(),
      cronExpression: (0, import_mysql_core2.varchar)("cron_expression", { length: 255 }).notNull(),
      // 0 0 * * * *
      timezone: (0, import_mysql_core2.varchar)("timezone", { length: 100 }).default("America/Sao_Paulo").notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      lastRunAt: (0, import_mysql_core2.timestamp)("last_run_at"),
      nextRunAt: (0, import_mysql_core2.timestamp)("next_run_at"),
      runCount: (0, import_mysql_core2.int)("run_count").default(0).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    conversations = (0, import_mysql_core2.mysqlTable)("conversations", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id),
      customerName: (0, import_mysql_core2.varchar)("customer_name", { length: 255 }),
      customerPhone: (0, import_mysql_core2.varchar)("customer_phone", { length: 50 }),
      queueId: (0, import_mysql_core2.int)("queue_id").references(() => queues.id),
      // Fila de atendimento
      channel: (0, import_mysql_core2.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["open", "assigned", "closed"]).default("open").notNull(),
      assignedTo: (0, import_mysql_core2.int)("assigned_to").references(() => users.id),
      // Agente responsável
      openedAt: (0, import_mysql_core2.timestamp)("opened_at").defaultNow().notNull(),
      closedAt: (0, import_mysql_core2.timestamp)("closed_at"),
      closeReason: (0, import_mysql_core2.mysqlEnum)("close_reason", [
        "venda",
        "orcamento",
        "conversa_anterior",
        "engano"
      ]),
      lastMessageAt: (0, import_mysql_core2.timestamp)("last_message_at").defaultNow().notNull(),
      unreadCount: (0, import_mysql_core2.int)("unread_count").default(0).notNull()
    });
    quickReplies = (0, import_mysql_core2.mysqlTable)("quick_replies", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }).notNull(),
      content: (0, import_mysql_core2.text)("content").notNull(),
      category: (0, import_mysql_core2.varchar)("category", { length: 100 }),
      // saudacao, endereco, pagamento, etc
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    agentStatus = (0, import_mysql_core2.mysqlTable)("agent_status", {
      userId: (0, import_mysql_core2.int)("user_id").primaryKey().references(() => users.id).notNull(),
      status: (0, import_mysql_core2.varchar)("status", { length: 16 }).default("offline").notNull(),
      lastSeen: (0, import_mysql_core2.timestamp)("last_seen").defaultNow().notNull(),
      currentConversationId: (0, import_mysql_core2.int)("current_conversation_id")
    });
    queueSettings = (0, import_mysql_core2.mysqlTable)("queue_settings", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      channel: (0, import_mysql_core2.mysqlEnum)("channel", ["whatsapp", "instagram"]).notNull(),
      maxWaitMinutes: (0, import_mysql_core2.int)("max_wait_minutes").default(15).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    agentPauses = (0, import_mysql_core2.mysqlTable)("agent_pauses", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      agentId: (0, import_mysql_core2.int)("agent_id").references(() => users.id).notNull(),
      pauseType: (0, import_mysql_core2.mysqlEnum)("pause_type", ["lunch", "snack", "bathroom", "other"]).notNull(),
      durationMinutes: (0, import_mysql_core2.int)("duration_minutes"),
      startedAt: (0, import_mysql_core2.timestamp)("started_at").defaultNow().notNull(),
      endedAt: (0, import_mysql_core2.timestamp)("ended_at"),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "completed"]).default("active").notNull()
    });
    queues = (0, import_mysql_core2.mysqlTable)("queues", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 100 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      channel: (0, import_mysql_core2.varchar)("channel", { length: 16 }).notNull(),
      priority: (0, import_mysql_core2.int)("priority").default(0).notNull(),
      status: (0, import_mysql_core2.varchar)("status", { length: 16 }).default("active").notNull(),
      color: (0, import_mysql_core2.varchar)("color", { length: 7 }).default("#3b82f6"),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    queueAgents = (0, import_mysql_core2.mysqlTable)("queue_agents", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      queueId: (0, import_mysql_core2.int)("queue_id").references(() => queues.id).notNull(),
      agentId: (0, import_mysql_core2.int)("agent_id").references(() => users.id).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      // Agente ativo na fila?
      joinedAt: (0, import_mysql_core2.timestamp)("joined_at").defaultNow().notNull()
    });
    conversationMessages = (0, import_mysql_core2.mysqlTable)("conversation_messages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      conversationId: (0, import_mysql_core2.int)("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
      externalId: (0, import_mysql_core2.varchar)("external_id", { length: 255 }),
      // Evolution API message ID for idempotency
      remoteJid: (0, import_mysql_core2.varchar)("remote_jid", { length: 255 }),
      // JID do remetente (WhatsApp)
      provider: (0, import_mysql_core2.mysqlEnum)("provider", ["whatsapp", "instagram"]).default("whatsapp"),
      senderId: (0, import_mysql_core2.int)("sender_id").references(() => users.id),
      // ID do agente (null se for cliente)
      senderType: (0, import_mysql_core2.mysqlEnum)("sender_type", ["agent", "customer"]).notNull(),
      content: (0, import_mysql_core2.text)("content").notNull(),
      // Campos de anexo
      fileUrl: (0, import_mysql_core2.longtext)("file_url"),
      // Can contain base64 data URLs
      fileName: (0, import_mysql_core2.varchar)("file_name", { length: 255 }),
      fileType: (0, import_mysql_core2.varchar)("file_type", { length: 100 }),
      // MIME type
      fileSize: (0, import_mysql_core2.int)("file_size"),
      // Tamanho em bytes
      // ✅ NOVOS CAMPOS: Reply + Reaction
      replyToExternalId: (0, import_mysql_core2.varchar)("reply_to_external_id", { length: 255 }),
      // Evolution ID da mensagem respondida
      reaction: (0, import_mysql_core2.varchar)("reaction", { length: 10 }),
      // Emoji (❤️, 👍)
      readAt: (0, import_mysql_core2.timestamp)("read_at"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    internalMessages = (0, import_mysql_core2.mysqlTable)("internal_messages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      conversationId: (0, import_mysql_core2.int)("conversation_id").references(() => conversations.id).notNull(),
      senderId: (0, import_mysql_core2.int)("sender_id").references(() => users.id).notNull(),
      // Quem enviou (admin)
      recipientId: (0, import_mysql_core2.int)("recipient_id").references(() => users.id).notNull(),
      // Quem recebe (agente)
      content: (0, import_mysql_core2.text)("content").notNull(),
      readAt: (0, import_mysql_core2.timestamp)("read_at"),
      // Quando o agente leu
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    integrationSettings = (0, import_mysql_core2.mysqlTable)("integration_settings", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      integrationType: (0, import_mysql_core2.mysqlEnum)("integration_type", [
        "whatsapp_business",
        "instagram_graph",
        "evolution_api",
        "telegram",
        "email"
      ]).notNull(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      config: (0, import_mysql_core2.json)("config").notNull(),
      // Metadados
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
      lastTestedAt: (0, import_mysql_core2.timestamp)("last_tested_at"),
      // Última vez que a conexão foi testada
      testStatus: (0, import_mysql_core2.mysqlEnum)("test_status", [
        "success",
        "failed",
        "pending"
      ]).default("pending"),
      testMessage: (0, import_mysql_core2.text)("test_message")
      // Mensagem de erro/sucesso do último teste
    });
    customerTreatments = (0, import_mysql_core2.mysqlTable)("customer_treatments", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      nomeMedicamento: (0, import_mysql_core2.varchar)("nome_medicamento", { length: 255 }).notNull(),
      posologiaDiaria: (0, import_mysql_core2.int)("posologia_diaria").notNull(),
      // Qtd comprimidos/dia
      qtdCaixa: (0, import_mysql_core2.int)("qtd_caixa").notNull(),
      // Qtd total na caixa
      dataUltimaCompra: (0, import_mysql_core2.timestamp)("data_ultima_compra"),
      dataFimPrevisto: (0, import_mysql_core2.timestamp)("data_fim_previsto"),
      // Campo calculado para query performática
      observacoes: (0, import_mysql_core2.text)("observacoes"),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    pharmaProducts = (0, import_mysql_core2.mysqlTable)("pharma_products", {
      ean: (0, import_mysql_core2.varchar)("ean", { length: 32 }).primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull(),
      category: (0, import_mysql_core2.mysqlEnum)("category", [
        "medicamento",
        "perfumaria",
        "outros"
      ]).default("outros"),
      substance: (0, import_mysql_core2.varchar)("substance", { length: 255 }),
      daysDuration: (0, import_mysql_core2.int)("days_duration"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    pharmaPurchases = (0, import_mysql_core2.mysqlTable)("pharma_purchases", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      externalId: (0, import_mysql_core2.varchar)("external_id", { length: 80 }),
      // id from ERP/PDV
      purchaseDate: (0, import_mysql_core2.timestamp)("purchase_date").defaultNow().notNull(),
      totalValue: (0, import_mysql_core2.decimal)("total_value", { precision: 12, scale: 2 }).default("0"),
      channel: (0, import_mysql_core2.mysqlEnum)("channel", [
        "loja",
        "delivery",
        "whatsapp",
        "outros"
      ]).default("outros"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    pharmaPurchaseItems = (0, import_mysql_core2.mysqlTable)("pharma_purchase_items", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      purchaseId: (0, import_mysql_core2.int)("purchase_id").references(() => pharmaPurchases.id, { onDelete: "cascade" }).notNull(),
      productEan: (0, import_mysql_core2.varchar)("product_ean", { length: 32 }).references(
        () => pharmaProducts.ean,
        { onDelete: "set null" }
      ),
      productName: (0, import_mysql_core2.varchar)("product_name", { length: 255 }).notNull(),
      quantity: (0, import_mysql_core2.int)("quantity").notNull(),
      price: (0, import_mysql_core2.decimal)("price", { precision: 12, scale: 2 }).default("0")
    });
    tags = (0, import_mysql_core2.mysqlTable)("tags", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 100 }).notNull().unique(),
      color: (0, import_mysql_core2.varchar)("color", { length: 7 }).notNull().default("#6366f1"),
      icon: (0, import_mysql_core2.varchar)("icon", { length: 50 }),
      description: (0, import_mysql_core2.text)("description"),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("createdAt").defaultNow().notNull()
    });
    conversationTags = (0, import_mysql_core2.mysqlTable)("conversation_tags", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      conversationId: (0, import_mysql_core2.varchar)("conversationId", { length: 200 }).notNull(),
      tagId: (0, import_mysql_core2.int)("tagId").notNull().references(() => tags.id),
      createdAt: (0, import_mysql_core2.timestamp)("createdAt").defaultNow().notNull()
    });
    ticketTags = (0, import_mysql_core2.mysqlTable)("ticket_tags", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      ticketId: (0, import_mysql_core2.int)("ticketId").notNull(),
      tagId: (0, import_mysql_core2.int)("tagId").notNull().references(() => tags.id),
      createdAt: (0, import_mysql_core2.timestamp)("createdAt").defaultNow().notNull()
    });
    customerTags = (0, import_mysql_core2.mysqlTable)("customer_tags", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      tagId: (0, import_mysql_core2.int)("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
      addedBy: (0, import_mysql_core2.int)("added_by").references(() => users.id),
      addedAt: (0, import_mysql_core2.timestamp)("added_at").defaultNow().notNull()
    });
    surveyResponses = (0, import_mysql_core2.mysqlTable)("survey_responses", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      conversationId: (0, import_mysql_core2.int)("conversation_id").references(() => conversations.id, {
        onDelete: "set null"
      }),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      rating: (0, import_mysql_core2.int)("rating").notNull(),
      // 1-5 rating
      feedback: (0, import_mysql_core2.text)("feedback"),
      // Optional feedback text
      closeReason: (0, import_mysql_core2.varchar)("close_reason", { length: 50 }).notNull(),
      // venda, orcamento, etc
      agentId: (0, import_mysql_core2.int)("agent_id").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    crmScripts = (0, import_mysql_core2.mysqlTable)("crm_scripts", {
      code: (0, import_mysql_core2.varchar)("code", { length: 50 }).primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 120 }).notNull(),
      template: (0, import_mysql_core2.text)("template").notNull(),
      variablesJson: (0, import_mysql_core2.text)("variables_json"),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    broadcastLists = (0, import_mysql_core2.mysqlTable)("broadcast_lists", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      name: (0, import_mysql_core2.varchar)("name", { length: 100 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      createdBy: (0, import_mysql_core2.int)("created_by").references(() => users.id).notNull(),
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "paused", "deleted"]).default("active").notNull(),
      lastSentAt: (0, import_mysql_core2.timestamp)("last_sent_at"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
    broadcastListMembers = (0, import_mysql_core2.mysqlTable)("broadcast_list_members", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      listId: (0, import_mysql_core2.int)("list_id").references(() => broadcastLists.id).notNull(),
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id).notNull(),
      addedAt: (0, import_mysql_core2.timestamp)("added_at").defaultNow().notNull()
    });
    broadcastMessages = (0, import_mysql_core2.mysqlTable)("broadcast_messages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      listId: (0, import_mysql_core2.int)("list_id").references(() => broadcastLists.id).notNull(),
      messageText: (0, import_mysql_core2.text)("message_text"),
      caption: (0, import_mysql_core2.text)("caption"),
      fileUrl: (0, import_mysql_core2.text)("file_url"),
      fileName: (0, import_mysql_core2.text)("file_name"),
      fileType: (0, import_mysql_core2.text)("file_type"),
      fileSize: (0, import_mysql_core2.int)("file_size"),
      senderId: (0, import_mysql_core2.int)("sender_id").references(() => users.id).notNull(),
      senderType: (0, import_mysql_core2.varchar)("sender_type", { length: 50 }).default("agent").notNull(),
      totalRecipients: (0, import_mysql_core2.int)("total_recipients").notNull(),
      successfulSends: (0, import_mysql_core2.int)("successful_sends").default(0),
      failedSends: (0, import_mysql_core2.int)("failed_sends").default(0),
      status: (0, import_mysql_core2.varchar)("status", { length: 16 }).default("sending").notNull(),
      sentAt: (0, import_mysql_core2.timestamp)("sent_at").defaultNow().notNull(),
      errorMessage: (0, import_mysql_core2.text)("error_message")
    });
    babyShowerEvents = (0, import_mysql_core2.mysqlTable)("baby_shower_events", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      // Relacionamento com a mãe (customer)
      motherCustomerId: (0, import_mysql_core2.int)("mother_customer_id").references(() => customers.id).notNull(),
      // Dados do Evento
      eventCode: (0, import_mysql_core2.varchar)("event_code", { length: 20 }).notNull().unique(),
      // Ex: "CHA202503001"
      eventName: (0, import_mysql_core2.varchar)("event_name", { length: 255 }).notNull(),
      // Ex: "Chá da Maria"
      babyName: (0, import_mysql_core2.varchar)("baby_name", { length: 255 }),
      // Nome do bebê
      expectedDueDate: (0, import_mysql_core2.date)("expected_due_date"),
      // Data prevista do parto
      eventDate: (0, import_mysql_core2.date)("event_date"),
      // Data do evento físico (se houver)
      status: (0, import_mysql_core2.mysqlEnum)("status", ["active", "closed", "cancelled"]).default("active").notNull(),
      // WhatsApp para contato (editável)
      whatsappNumber: (0, import_mysql_core2.varchar)("whatsapp_number", { length: 20 }),
      // Ex: "5531986337081"
      // Carteira Virtual (saldo em valor monetário)
      walletBalance: (0, import_mysql_core2.decimal)("wallet_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
      // Contadores físicos (para controle de estoque)
      totalDiapersCount: (0, import_mysql_core2.int)("total_diapers_count").default(0),
      // Total fraldas em estoque virtual
      availableDiapersCount: (0, import_mysql_core2.int)("available_diapers_count").default(0),
      // Disponíveis para retirada
      // Meta e estatísticas
      targetAmount: (0, import_mysql_core2.decimal)("target_amount", { precision: 12, scale: 2 }),
      // Meta de arrecadação
      totalGuests: (0, import_mysql_core2.int)("total_guests").default(0),
      // Total de convidados que compraram
      // URLs de compartilhamento
      publicLink: (0, import_mysql_core2.varchar)("public_link", { length: 500 }),
      // Link para convidados comprarem
      // Mensagem personalizada para convidados
      welcomeMessage: (0, import_mysql_core2.text)("welcome_message"),
      // Mensagem carinhosa exibida na página pública
      // Timestamps
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
      closedAt: (0, import_mysql_core2.timestamp)("closed_at")
    });
    babyShowerGiftPackages = (0, import_mysql_core2.mysqlTable)("baby_shower_gift_packages", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      eventId: (0, import_mysql_core2.int)("event_id").references(() => babyShowerEvents.id, { onDelete: "cascade" }).notNull(),
      // Configuração da Cota
      packageName: (0, import_mysql_core2.varchar)("package_name", { length: 120 }).notNull(),
      // Ex: "Pacote Fraldas P"
      description: (0, import_mysql_core2.text)("description"),
      // Imagem do produto
      imageUrl: (0, import_mysql_core2.text)("image_url"),
      // URL da imagem (upload ou externa, pode ser base64)
      // Tipo de presente
      giftType: (0, import_mysql_core2.mysqlEnum)("gift_type", ["diapers", "wipes", "money", "product"]).default("diapers").notNull(),
      // Quantidade representada (ex: 1 pacote = 20 fraldas)
      quantityRepresented: (0, import_mysql_core2.int)("quantity_represented").default(1),
      sizeLabel: (0, import_mysql_core2.varchar)("size_label", { length: 20 }),
      // Ex: "P", "M", "G", "GG"
      // Valores
      price: (0, import_mysql_core2.decimal)("price", { precision: 10, scale: 2 }).notNull(),
      stockLimit: (0, import_mysql_core2.int)("stock_limit"),
      // Limite de cotas deste tipo (null = ilimitado)
      // Contadores
      soldCount: (0, import_mysql_core2.int)("sold_count").default(0),
      isActive: (0, import_mysql_core2.int)("is_active").default(1).notNull(),
      // Ordem de exibição (drag-and-drop)
      displayOrder: (0, import_mysql_core2.int)("display_order").default(0),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    babyShowerPurchases = (0, import_mysql_core2.mysqlTable)("baby_shower_purchases", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      eventId: (0, import_mysql_core2.int)("event_id").references(() => babyShowerEvents.id, { onDelete: "cascade" }).notNull(),
      packageId: (0, import_mysql_core2.int)("package_id").references(() => babyShowerGiftPackages.id).notNull(),
      // Dados do convidado (lead no CRM)
      guestCustomerId: (0, import_mysql_core2.int)("guest_customer_id").references(() => customers.id),
      // Pode ser nulo se convidado não identificado
      // Dados da compra
      guestName: (0, import_mysql_core2.varchar)("guest_name", { length: 255 }).notNull(),
      guestPhone: (0, import_mysql_core2.varchar)("guest_phone", { length: 20 }),
      guestEmail: (0, import_mysql_core2.varchar)("guest_email", { length: 320 }),
      // Mensagem para o bebê (opcional)
      messageToParents: (0, import_mysql_core2.text)("message_to_parents"),
      // Status do pagamento
      paymentStatus: (0, import_mysql_core2.mysqlEnum)("payment_status", [
        "pending",
        "paid",
        "failed",
        "refunded"
      ]).default("pending").notNull(),
      amountPaid: (0, import_mysql_core2.decimal)("amount_paid", { precision: 10, scale: 2 }).notNull(),
      // Dados do pagamento
      paymentMethod: (0, import_mysql_core2.varchar)("payment_method", { length: 50 }),
      // pix, credit_card, etc
      paymentReference: (0, import_mysql_core2.varchar)("payment_reference", { length: 255 }),
      // ID da transação
      paidAt: (0, import_mysql_core2.timestamp)("paid_at"),
      // Notificação enviada
      notificationSent: (0, import_mysql_core2.int)("notification_sent").default(0),
      notificationSentAt: (0, import_mysql_core2.timestamp)("notification_sent_at"),
      // Token único para confirmação de pagamento via link
      confirmationToken: (0, import_mysql_core2.varchar)("confirmation_token", { length: 64 }).unique(),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    babyShowerWithdrawals = (0, import_mysql_core2.mysqlTable)("baby_shower_withdrawals", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      eventId: (0, import_mysql_core2.int)("event_id").references(() => babyShowerEvents.id, { onDelete: "cascade" }).notNull(),
      // Tarefa relacionada no sistema (integração com crm_tasks)
      relatedTaskId: (0, import_mysql_core2.int)("related_task_id").references(() => crmTasks.id),
      // Dados da retirada
      withdrawalType: (0, import_mysql_core2.mysqlEnum)("withdrawal_type", [
        "diapers",
        "wipes",
        "money"
      ]).default("diapers").notNull(),
      // Se for fraldas
      diaperSize: (0, import_mysql_core2.varchar)("diaper_size", { length: 20 }),
      // P, M, G, GG
      quantity: (0, import_mysql_core2.int)("quantity").notNull(),
      // Acesso ao caixa
      requestedAt: (0, import_mysql_core2.timestamp)("requested_at").defaultNow().notNull(),
      fulfilledAt: (0, import_mysql_core2.timestamp)("fulfilled_at"),
      // Status
      status: (0, import_mysql_core2.mysqlEnum)("status", [
        "requested",
        "preparing",
        "ready",
        "delivered",
        "cancelled"
      ]).default("requested").notNull(),
      // Quem atendeu
      fulfilledBy: (0, import_mysql_core2.int)("fulfilled_by").references(() => users.id),
      // Método de entrega
      deliveryMethod: (0, import_mysql_core2.mysqlEnum)("delivery_method", ["pickup", "delivery"]).default("pickup").notNull(),
      notes: (0, import_mysql_core2.text)("notes")
    });
    broadcastMembersSent = (0, import_mysql_core2.mysqlTable)("broadcast_members_sent", {
      id: (0, import_mysql_core2.int)("id").primaryKey().autoincrement(),
      broadcastMessageId: (0, import_mysql_core2.int)("message_id").notNull(),
      customerId: (0, import_mysql_core2.int)("customer_id").notNull(),
      phone: (0, import_mysql_core2.varchar)("phone", { length: 20 }).notNull(),
      status: (0, import_mysql_core2.varchar)("status", { length: 16 }).default("pending").notNull(),
      errorMessage: (0, import_mysql_core2.text)("error_message"),
      sentAt: (0, import_mysql_core2.timestamp)("sent_at"),
      deliveredAt: (0, import_mysql_core2.timestamp)("delivered_at"),
      readAt: (0, import_mysql_core2.timestamp)("read_at"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    processedWebhookMessages = (0, import_mysql_core2.mysqlTable)("processed_webhook_messages", {
      id: (0, import_mysql_core2.varchar)("id", { length: 255 }).primaryKey(),
      processedAt: (0, import_mysql_core2.timestamp)("processed_at").defaultNow().notNull(),
      provider: (0, import_mysql_core2.varchar)("provider", { length: 16 })
    });
    storyCache = (0, import_mysql_core2.mysqlTable)("story_cache", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      storyId: (0, import_mysql_core2.varchar)("story_id", { length: 255 }).notNull(),
      // message.key.id do story
      remoteJid: (0, import_mysql_core2.varchar)("remote_jid", { length: 255 }).notNull(),
      // Quem enviou o story
      fromNumber: (0, import_mysql_core2.varchar)("from_number", { length: 100 }).notNull(),
      // Phone normalizado
      fromName: (0, import_mysql_core2.varchar)("from_name", { length: 255 }),
      mediaUrl: (0, import_mysql_core2.longtext)("media_url"),
      // URL da mídia no R2
      rawUrl: (0, import_mysql_core2.longtext)("raw_url"),
      // URL original antes do download
      mediaType: (0, import_mysql_core2.mysqlEnum)("media_type", ["image", "video", "audio", "document", "text"]).notNull(),
      caption: (0, import_mysql_core2.text)("caption"),
      mimeType: (0, import_mysql_core2.varchar)("mime_type", { length: 100 }),
      fileName: (0, import_mysql_core2.varchar)("file_name", { length: 255 }),
      fileSize: (0, import_mysql_core2.int)("file_size"),
      messageTimestamp: (0, import_mysql_core2.int)("message_timestamp").notNull(),
      // Unix timestamp
      expiresAt: (0, import_mysql_core2.timestamp)("expires_at").notNull(),
      // Stories expiram em 24h
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull()
    });
    reminders = (0, import_mysql_core2.mysqlTable)("reminders", {
      id: (0, import_mysql_core2.int)("id").autoincrement().primaryKey(),
      agentId: (0, import_mysql_core2.int)("agent_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      // Atendente responsável
      customerId: (0, import_mysql_core2.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      // Cliente relacionado
      type: (0, import_mysql_core2.mysqlEnum)("type", [
        "aniversario",
        "medicamento_vencendo",
        "follow_up",
        "renovacao",
        "custom"
      ]).notNull(),
      priority: (0, import_mysql_core2.mysqlEnum)("priority", ["critica", "alta", "media", "baixa"]).notNull(),
      title: (0, import_mysql_core2.varchar)("title", { length: 255 }).notNull(),
      description: (0, import_mysql_core2.text)("description"),
      eventDate: (0, import_mysql_core2.date)("event_date").notNull(),
      // Data do evento (aniversário, vencimento, etc)
      daysBefore: (0, import_mysql_core2.int)("days_before").default(0),
      // Para medicamentos: dias antes do vencimento
      metadata: (0, import_mysql_core2.json)("metadata"),
      // Dados extras: { medicamento: "Dipirona", quantidade: 2, dosagem: "500mg" }
      status: (0, import_mysql_core2.mysqlEnum)("status", ["pendente", "dispensado", "adiado", "expirado"]).default("pendente").notNull(),
      snoozedUntil: (0, import_mysql_core2.timestamp)("snoozed_until"),
      // Para lembretes adiados
      dismissedAt: (0, import_mysql_core2.timestamp)("dismissed_at"),
      createdAt: (0, import_mysql_core2.timestamp)("created_at").defaultNow().notNull(),
      updatedAt: (0, import_mysql_core2.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => _db,
  getDb: () => getDb,
  getDbRaw: () => getDbRaw,
  getSession: () => getSession,
  getUserByOpenId: () => getUserByOpenId,
  upsertUser: () => upsertUser
});
async function getDb() {
  if (_db && Date.now() - _dbHealthCheck < 3e4) {
    try {
      if (_pool) {
        const connection = await _pool.getConnection();
        await connection.ping();
        connection.release();
        return _db;
      }
    } catch (e) {
      console.log("[Database] Health check failed, recreating pool...", e);
      _db = null;
      _pool = null;
    }
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      _pool = mysql.createPool({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        port: url.port ? parseInt(url.port) : 3306,
        waitForConnections: true,
        connectionLimit: 50,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: "utf8mb4",
        timezone: "Z"
      });
      _db = (0, import_mysql2.drizzle)(_pool, { mode: "raw" });
      _dbHealthCheck = Date.now();
      console.log("[Database] New connection pool created (50 connections)");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}
async function getDbRaw() {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Database not available");
    return null;
  }
  return db;
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return null;
  const rawResult = await db.execute(
    import_drizzle_orm.sql`SELECT * FROM users WHERE openId = ${openId} LIMIT 1`
  );
  const rows = rawResult.rows ?? rawResult[0] ?? rawResult;
  const rawUser = Array.isArray(rows) ? rows[0] : void 0;
  if (!rawUser) return null;
  return {
    id: rawUser.id,
    openId: rawUser.openId ?? rawUser.open_id,
    name: rawUser.name,
    email: rawUser.email,
    passwordHash: rawUser.passwordHash ?? rawUser.password_hash,
    loginMethod: rawUser.loginMethod ?? rawUser.login_method,
    role: rawUser.role,
    createdAt: rawUser.createdAt ?? rawUser.created_at,
    updatedAt: rawUser.updatedAt ?? rawUser.updated_at,
    lastSignedIn: rawUser.lastSignedIn ?? rawUser.last_signed_in
  };
}
async function upsertUser(userData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserByOpenId(userData.openId);
  if (existing) {
    await db.update(users).set({
      ...userData.name !== void 0 && { name: userData.name },
      ...userData.email !== void 0 && { email: userData.email },
      ...userData.loginMethod !== void 0 && {
        loginMethod: userData.loginMethod
      },
      ...userData.lastSignedIn != null && {
        lastSignedIn: userData.lastSignedIn
      },
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm.eq)(users.id, existing.id));
    return await getUserByOpenId(userData.openId);
  } else {
    const result = await db.insert(users).values({
      openId: userData.openId,
      name: userData.name || null,
      email: userData.email || null,
      loginMethod: userData.loginMethod || null,
      lastSignedIn: userData.lastSignedIn || /* @__PURE__ */ new Date(),
      role: "user",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    return await getUserByOpenId(userData.openId);
  }
}
async function getSession(sessionId) {
  try {
    const session = await sdk.verifySession(sessionId);
    if (!session) {
      return null;
    }
    return {
      userId: session.openId
    };
  } catch (error) {
    console.error("[Session] Error verifying session:", error);
    return null;
  }
}
var import_drizzle_orm, import_mysql2, mysql, _db, _pool, _dbHealthCheck;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_mysql2 = require("drizzle-orm/mysql2");
    mysql = __toESM(require("mysql2/promise"), 1);
    init_sdk();
    init_schema();
    _db = null;
    _pool = null;
    _dbHealthCheck = 0;
  }
});

// server/_core/trpc.ts
var import_server, t, router, isAuthed, isAdmin, publicProcedure, protectedProcedure, adminProcedure;
var init_trpc = __esm({
  "server/_core/trpc.ts"() {
    "use strict";
    import_server = require("@trpc/server");
    t = import_server.initTRPC.context().create({
      // transformer: superjson, // DESABILITADO PARA TESTE DE LOGIN
    });
    router = t.router;
    isAuthed = t.middleware(({ ctx, next }) => {
      if (!ctx.user) {
        throw new import_server.TRPCError({
          code: "UNAUTHORIZED",
          message: "Usu\xE1rio n\xE3o autenticado"
        });
      }
      return next({ ctx: { user: ctx.user } });
    });
    isAdmin = t.middleware(({ ctx, next }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new import_server.TRPCError({
          code: "FORBIDDEN",
          message: "Acesso restrito a administradores"
        });
      }
      return next({ ctx });
    });
    publicProcedure = t.procedure;
    protectedProcedure = t.procedure.use(isAuthed);
    adminProcedure = t.procedure.use(isAuthed).use(isAdmin);
  }
});

// server/crm-core.ts
var crm_core_exports = {};
__export(crm_core_exports, {
  appendCrmActivity: () => appendCrmActivity,
  appendCrmAuditLog: () => appendCrmAuditLog,
  enqueueCrmOutboxEvent: () => enqueueCrmOutboxEvent,
  fireAndForget: () => fireAndForget
});
function safeJson(value) {
  try {
    return value === void 0 ? null : JSON.stringify(value);
  } catch {
    return null;
  }
}
function fireAndForget(fn) {
  setImmediate(() => {
    fn().catch((err) => {
      console.error("[CRM] fireAndForget error:", err);
    });
  });
}
async function enqueueCrmOutboxEvent(params) {
  const db = await getDb();
  if (!db) return;
  await db.insert(crmOutboxEvents).values({
    eventName: params.eventName,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    actorUserId: params.actorUserId ?? null,
    payloadJson: safeJson(params.payload),
    idempotencyKey: params.idempotencyKey ?? null,
    status: "pending",
    createdAt: /* @__PURE__ */ new Date()
  });
}
async function appendCrmAuditLog(params) {
  const db = await getDb();
  if (!db) return;
  await db.insert(crmAuditLogs).values({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    actorUserId: params.actorUserId ?? null,
    beforeJson: safeJson(params.before),
    afterJson: safeJson(params.after),
    requestId: params.requestId ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: /* @__PURE__ */ new Date()
  });
}
async function appendCrmActivity(params) {
  const db = await getDb();
  if (!db) return;
  await db.insert(crmActivities).values({
    entityType: params.entityType,
    entityId: params.entityId,
    activityType: params.activityType,
    title: params.title ?? null,
    body: params.body ?? null,
    metadataJson: safeJson(params.metadata),
    actorUserId: params.actorUserId ?? null,
    occurredAt: params.occurredAt ?? /* @__PURE__ */ new Date(),
    createdAt: /* @__PURE__ */ new Date()
  });
}
var init_crm_core = __esm({
  "server/crm-core.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/utils/phone.ts
function extractDigits(raw) {
  if (!raw) return "";
  if (raw.includes("@")) {
    const beforeAt = raw.substring(0, raw.indexOf("@")).replace(/\D/g, "");
    if (beforeAt.length >= 8) return beforeAt;
  }
  return raw.replace(/\D/g, "");
}
function normalizePhone(raw) {
  if (!raw) return "";
  let digits = extractDigits(raw);
  if (digits.length > 13 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 13) return "";
  if (!digits.startsWith("55")) digits = "55" + digits;
  if (digits.length === 12) {
    digits = digits.slice(0, 4) + "9" + digits.slice(4);
  }
  if (digits.length !== 13) return "";
  return digits;
}
function generatePhoneVariants(phone) {
  if (!phone) return [];
  let digits = extractDigits(phone);
  if (digits.length > 14) return [];
  if (!digits.startsWith("55")) digits = "55" + digits;
  if (digits.length === 12) digits = digits.slice(0, 4) + "9" + digits.slice(4);
  if (digits.length === 14) digits = digits.slice(0, 13);
  const variants = /* @__PURE__ */ new Set();
  if (digits.length === 13) {
    const sem9 = digits.slice(0, 4) + digits.slice(5);
    variants.add(digits);
    variants.add(sem9);
    variants.add("+" + digits);
    variants.add("+" + sem9);
  } else if (digits.length === 12) {
    const com9 = digits.slice(0, 4) + "9" + digits.slice(4);
    variants.add(digits);
    variants.add(com9);
    variants.add("+" + digits);
    variants.add("+" + com9);
  }
  return [...variants];
}
function formatPhoneBR(raw) {
  return normalizePhone(raw);
}
function phoneLast8(raw) {
  if (!raw) return "";
  const digits = extractDigits(raw);
  return digits.length >= 8 ? digits.slice(-8) : digits;
}
async function findConversationByPhone(db, phone, conversationsTable, customersTable) {
  const { eq: eq50, desc: desc26, inArray: inArray10, like: like9, or: or14 } = await import("drizzle-orm");
  const last8 = phoneLast8(phone);
  if (last8.length < 8) return null;
  const matchedCustomers = await db.select({ id: customersTable.id, phone: customersTable.phone }).from(customersTable).where(like9(customersTable.phone, `%${last8}%`)).limit(10);
  if (matchedCustomers.length === 0) return null;
  const customerIds = matchedCustomers.map((c) => c.id);
  const [conversation] = await db.select({
    id: conversationsTable.id,
    customerId: conversationsTable.customerId,
    status: conversationsTable.status
  }).from(conversationsTable).where(inArray10(conversationsTable.customerId, customerIds)).orderBy(desc26(conversationsTable.lastMessageAt)).limit(1);
  return conversation ? { conversationId: conversation.id, customerId: conversation.customerId, status: conversation.status } : null;
}
var init_phone = __esm({
  "server/utils/phone.ts"() {
    "use strict";
  }
});

// server/_core/llm.ts
async function invokeLLM(params) {
  assertApiKey();
  try {
    const {
      messages: messages4,
      tools,
      toolChoice,
      tool_choice,
      outputSchema,
      output_schema,
      responseFormat,
      response_format
    } = params;
    const payload = {
      model: "gemini-2.0-flash-preview-05-20",
      messages: messages4.map(normalizeMessage)
    };
    const hasImage = messages4.some((msg) => {
      if (Array.isArray(msg.content)) {
        return msg.content.some((part) => part?.type === "image_url");
      }
      return false;
    });
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }
    const normalizedToolChoice = normalizeToolChoice(
      toolChoice || tool_choice,
      tools
    );
    if (normalizedToolChoice) {
      payload.tool_choice = normalizedToolChoice;
    }
    payload.max_tokens = 32768;
    payload.thinking = {
      budget_tokens: 128
    };
    const normalizedResponseFormat = normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema
    });
    if (normalizedResponseFormat) {
      payload.response_format = normalizedResponseFormat;
    }
    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[invokeLLM] API Error:",
        response.status,
        response.statusText
      );
      console.error("[invokeLLM] Error response:", errorText);
      console.error("[invokeLLM] Model used:", payload.model);
      if (errorText.includes("image") || errorText.includes("image_url") || errorText.includes("does not support") || errorText.includes("Cannot read")) {
        console.error(
          "[invokeLLM] Image not supported by current model, throwing IMAGE_NOT_SUPPORTED"
        );
        throw new Error("IMAGE_NOT_SUPPORTED");
      }
      throw new Error(
        `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("[invokeLLM] Caught error:", error.message || error);
    console.error("[invokeLLM] Stack trace:", error.stack);
    throw error;
  }
}
var ensureArray, normalizeContentPart, normalizeMessage, normalizeToolChoice, resolveApiUrl, assertApiKey, normalizeResponseFormat;
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
    ensureArray = (value) => Array.isArray(value) ? value : [value];
    normalizeContentPart = (part) => {
      if (typeof part === "string") {
        return { type: "text", text: part };
      }
      if (part.type === "text") {
        return part;
      }
      if (part.type === "image_url") {
        return part;
      }
      if (part.type === "file_url") {
        return { type: "text", text: "[arquivo]" };
      }
      return { type: "text", text: "[conte\xFAdo n\xE3o suportado]" };
    };
    normalizeMessage = (message2) => {
      const { role, name, tool_call_id } = message2;
      if (role === "tool" || role === "function") {
        const content2 = ensureArray(message2.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
        return {
          role,
          name,
          tool_call_id,
          content: content2
        };
      }
      const contentParts = ensureArray(message2.content).map(normalizeContentPart);
      if (contentParts.length === 1 && contentParts[0].type === "text") {
        return {
          role,
          name,
          content: contentParts[0].text
        };
      }
      return {
        role,
        name,
        content: contentParts
      };
    };
    normalizeToolChoice = (toolChoice, tools) => {
      if (!toolChoice) return void 0;
      if (toolChoice === "none" || toolChoice === "auto") {
        return toolChoice;
      }
      if (toolChoice === "required") {
        if (!tools || tools.length === 0) {
          throw new Error(
            "tool_choice 'required' was provided but no tools were configured"
          );
        }
        if (tools.length > 1) {
          throw new Error(
            "tool_choice 'required' needs a single tool or specify the tool name explicitly"
          );
        }
        return {
          type: "function",
          function: { name: tools[0].function.name }
        };
      }
      if ("name" in toolChoice) {
        return {
          type: "function",
          function: { name: toolChoice.name }
        };
      }
      return toolChoice;
    };
    resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
    assertApiKey = () => {
      if (!ENV.forgeApiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
    };
    normalizeResponseFormat = ({
      responseFormat,
      response_format,
      outputSchema,
      output_schema
    }) => {
      const explicitFormat = responseFormat || response_format;
      if (explicitFormat) {
        if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
          throw new Error(
            "responseFormat json_schema requires a defined schema object"
          );
        }
        return explicitFormat;
      }
      const schema = outputSchema || output_schema;
      if (!schema) return void 0;
      if (!schema.name || !schema.schema) {
        throw new Error("outputSchema requires both name and schema");
      }
      return {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          schema: schema.schema,
          ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
        }
      };
    };
  }
});

// server/_core/logger.ts
var import_pino, isDevelopment, logger;
var init_logger = __esm({
  "server/_core/logger.ts"() {
    "use strict";
    import_pino = __toESM(require("pino"), 1);
    isDevelopment = process.env.NODE_ENV === "development";
    logger = (0, import_pino.default)({
      level: isDevelopment ? "debug" : "info",
      transport: isDevelopment ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      } : void 0,
      formatters: {
        level: (label) => {
          return { level: label };
        }
      },
      timestamp: import_pino.default.stdTimeFunctions.isoTime
    });
  }
});

// server/_core/sse.ts
var import_events, SseManager, sseManager, EVENTS;
var init_sse = __esm({
  "server/_core/sse.ts"() {
    "use strict";
    import_events = require("events");
    SseManager = class extends import_events.EventEmitter {
      clients = /* @__PURE__ */ new Map();
      addClient(userId, res) {
        if (!this.clients.has(userId)) {
          this.clients.set(userId, /* @__PURE__ */ new Set());
        }
        this.clients.get(userId).add(res);
        console.log(`[SSE] Client added. Total clients for userId=${userId}: ${this.clients.get(userId).size}`);
        console.log(`[SSE] All connected users: ${this.getConnectedUsers().join(", ")}`);
        res.on("close", () => {
          this.clients.get(userId)?.delete(res);
          if (this.clients.get(userId)?.size === 0) {
            this.clients.delete(userId);
          }
        });
      }
      emitToUser(userId, event) {
        const clientSet = this.clients.get(userId);
        if (!clientSet) {
          console.log(`[SSE] No clients connected for userId=${userId}. Connected users: ${this.getConnectedUsers().join(", ")}`);
          return;
        }
        const data = `data: ${JSON.stringify(event)}

`;
        console.log(`[SSE] \u{1F4E4} SENDING EVENT to ${clientSet.size} client(s) for userId=${userId}:`, event);
        for (const res of clientSet) {
          try {
            res.write(data);
          } catch (e) {
            console.error(`[SSE] \u274C Error sending to client for userId=${userId}:`, e);
            clientSet.delete(res);
          }
        }
      }
      emitToAll(event) {
        for (const [userId] of this.clients) {
          this.emitToUser(userId, event);
        }
      }
      /**
       * Emite evento para todos os usuários que são administradores.
       * Requer que o role do usuário seja passado ou possa ser determinado.
       * Por simplicidade, emite para TODOS os users conectados (mantém compatibilidade).
       * Se for necessário filtrar por admin, pode-se fazer no consumer do evento.
       */
      emitToAdmins(event) {
        this.emitToAll(event);
      }
      getConnectedUsers() {
        return Array.from(this.clients.keys());
      }
      getClientCount() {
        return this.clients.size;
      }
    };
    sseManager = new SseManager();
    EVENTS = {
      MESSAGE_NEW: "message:new",
      MESSAGE_STATUS: "message:status",
      CONVERSATION_UPDATE: "conversation:update",
      CONVERSATION_NEW: "conversation:new",
      CONVERSATION_READ: "conversation:read",
      AGENT_STATUS: "agent:status"
    };
  }
});

// server/ai-templates.ts
var AI_CONVERSATION_TEMPLATES, AI_NODE_TYPES, AI_KNOWLEDGE_BASES, AI_DEFAULT_PROMPT, AI_ERROR_HANDLING, AI_CONTEXT_MANAGEMENT, AI_INTEGRATION_CONFIG;
var init_ai_templates = __esm({
  "server/ai-templates.ts"() {
    "use strict";
    AI_CONVERSATION_TEMPLATES = {
      /**
       * Customer Service Template
       * For general customer inquiries and support
       */
      CUSTOMER_SERVICE: {
        name: "Atendimento ao Cliente",
        description: "Template para atendimento geral de clientes com IA",
        trigger: "atendimento, ajuda, suporte, informa\xE7\xF5es",
        nodes: [
          {
            id: "start",
            type: "trigger",
            name: "In\xEDcio",
            config: {
              triggerType: "keyword",
              keywords: ["atendimento", "ajuda", "suporte", "informa\xE7\xF5es", "falar com"],
              channels: ["whatsapp", "instagram"]
            }
          },
          {
            id: "greet",
            type: "message",
            name: "Sauda\xE7\xE3o",
            config: {
              message: "Ol\xE1! Seja bem-vindo(a) ao atendimento da Farm\xE1cia Francis. Como posso ajudar voc\xEA hoje?",
              delay: 1e3
            }
          },
          {
            id: "classify",
            type: "ai-classify",
            name: "Classificar Inten\xE7\xE3o",
            config: {
              model: "gpt-4",
              prompt: "Classifique a inten\xE7\xE3o do cliente em uma das categorias: produtos, pre\xE7os, hor\xE1rios, entrega, devolu\xE7\xE3o, outros",
              maxTokens: 100
            }
          },
          {
            id: "route",
            type: "condition",
            name: "Roteamento",
            config: {
              conditions: [
                {
                  node: "classify",
                  field: "category",
                  operator: "equals",
                  value: "produtos"
                }
              ],
              truePath: "products",
              falsePath: "other"
            }
          },
          {
            id: "products",
            type: "ai-response",
            name: "Informa\xE7\xF5es de Produtos",
            config: {
              model: "gpt-3.5-turbo",
              knowledgeBase: "produtos_farmacia",
              prompt: "Forne\xE7a informa\xE7\xF5es sobre produtos farmac\xEAuticos. Seja espec\xEDfico sobre pre\xE7os, disponibilidade e indica\xE7\xF5es.",
              maxTokens: 300,
              temperature: 0.3
            }
          },
          {
            id: "other",
            type: "ai-response",
            name: "Resposta Gen\xE9rica",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Responda \xE0 pergunta do cliente de forma \xFAtil e profissional. Se n\xE3o souber a resposta, ofere\xE7a transferir para um atendente humano.",
              maxTokens: 200,
              temperature: 0.2
            }
          },
          {
            id: "human-handoff",
            type: "condition",
            name: "Transferir para Humano",
            config: {
              conditions: [
                {
                  node: "other",
                  field: "needsHuman",
                  operator: "equals",
                  value: true
                }
              ],
              truePath: "transfer",
              falsePath: "end"
            }
          },
          {
            id: "transfer",
            type: "transfer",
            name: "Transferir para Atendente",
            config: {
              message: "Entendemos que voc\xEA precisa de ajuda personalizada. Um de nossos atendentes estar\xE1 com voc\xEA em breve.",
              channels: ["whatsapp", "instagram"]
            }
          },
          {
            id: "end",
            type: "end",
            name: "Finalizar",
            config: {
              message: "Obrigado por entrar em contato! Se precisar de mais ajuda, estou aqui.",
              saveContext: true
            }
          }
        ]
      },
      /**
       * Sales Assistant Template
       * For product recommendations and sales
       */
      SALES_ASSISTANT: {
        name: "Assistente de Vendas",
        description: "Template para recomenda\xE7\xE3o de produtos e vendas",
        trigger: "comprar, produto, pre\xE7o, valor, quanto custa",
        nodes: [
          {
            id: "start",
            type: "trigger",
            name: "In\xEDcio",
            config: {
              triggerType: "keyword",
              keywords: ["comprar", "produto", "pre\xE7o", "valor", "quanto custa", "quero"],
              channels: ["whatsapp", "instagram"]
            }
          },
          {
            id: "greet",
            type: "message",
            name: "Sauda\xE7\xE3o Vendas",
            config: {
              message: "Bem-vindo(a) ao nosso cat\xE1logo virtual! Estou aqui para ajudar voc\xEA a encontrar os melhores produtos.",
              delay: 1e3
            }
          },
          {
            id: "ask-needs",
            type: "ai-prompt",
            name: "Entender Necessidades",
            config: {
              model: "gpt-4",
              prompt: "Identifique as necessidades do cliente com base na mensagem. Pergunte sobre sintomas, prefer\xEAncias ou or\xE7amento se necess\xE1rio.",
              maxTokens: 150
            }
          },
          {
            id: "recommend",
            type: "ai-recommendation",
            name: "Recomendar Produtos",
            config: {
              model: "gpt-3.5-turbo",
              knowledgeBase: "produtos_farmacia",
              prompt: "Recomende produtos farmac\xEAuticos baseado nas necessidades do cliente. Inclua pre\xE7os, benef\xEDcios e indica\xE7\xF5es.",
              maxProducts: 3,
              maxTokens: 400
            }
          },
          {
            id: "show-images",
            type: "media",
            name: "Mostrar Imagens",
            config: {
              mediaType: "image",
              imageUrls: ["{{recommend.product1.image}}", "{{recommend.product2.image}}", "{{recommend.product3.image}}"]
            }
          },
          {
            id: "ask-purchase",
            type: "ai-prompt",
            name: "Perguntar Sobre Compra",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Pergunte se o cliente deseja comprar os produtos recomendados. Ofere\xE7a op\xE7\xF5es de pagamento e entrega.",
              maxTokens: 100
            }
          },
          {
            id: "purchase-flow",
            type: "condition",
            name: "Flow de Compra",
            config: {
              conditions: [
                {
                  node: "ask-purchase",
                  field: "wantsPurchase",
                  operator: "equals",
                  value: true
                }
              ],
              truePath: "checkout",
              falsePath: "end"
            }
          },
          {
            id: "checkout",
            type: "ai-checkout",
            name: "Processar Compra",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Guie o cliente pelo processo de compra. Colete informa\xE7\xF5es necess\xE1rias e confirme o pedido.",
              paymentMethods: ["cart\xE3o", "pix", "dinheiro"],
              deliveryOptions: ["retirada", "entrega", "delivery"],
              maxTokens: 300
            }
          },
          {
            id: "confirm-order",
            type: "message",
            name: "Confirmar Pedido",
            config: {
              message: "Pedido confirmado! Obrigado por comprar conosco. Seu pedido est\xE1 sendo processado.",
              delay: 2e3
            }
          },
          {
            id: "end",
            type: "end",
            name: "Finalizar Venda",
            config: {
              message: "Obrigado pela prefer\xEAncia! Estamos ansiosos para atend\xEA-lo novamente.",
              saveContext: true,
              followUp: true
            }
          }
        ]
      },
      /**
       * FAQ Assistant Template
       * For frequently asked questions
       */
      FAQ_ASSISTANT: {
        name: "Assistente de FAQ",
        description: "Template para responder perguntas frequentes",
        trigger: "perguntas, d\xFAvidas, como fazer, onde fica, qual \xE9",
        nodes: [
          {
            id: "start",
            type: "trigger",
            name: "In\xEDcio FAQ",
            config: {
              triggerType: "keyword",
              keywords: ["perguntas", "d\xFAvidas", "como fazer", "onde fica", "qual \xE9", "hor\xE1rio"],
              channels: ["whatsapp", "instagram"]
            }
          },
          {
            id: "greet",
            type: "message",
            name: "Sauda\xE7\xE3o FAQ",
            config: {
              message: "Tenho respostas para as perguntas mais frequentes! O que voc\xEA gostaria de saber?",
              delay: 1e3
            }
          },
          {
            id: "extract-question",
            type: "ai-extract",
            name: "Extrair Pergunta",
            config: {
              model: "gpt-4",
              prompt: "Extraia a pergunta principal do cliente. Identifique o t\xF3pico: hor\xE1rios, localiza\xE7\xE3o, formas de pagamento, pol\xEDticas, etc.",
              maxTokens: 100
            }
          },
          {
            id: "knowledge-search",
            type: "knowledge-search",
            name: "Buscar no Conhecimento",
            config: {
              knowledgeBase: "faq_farmacia",
              searchType: "semantic",
              maxResults: 5
            }
          },
          {
            id: "select-best",
            type: "ai-select",
            name: "Selecionar Melhor Resposta",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Selecione a melhor resposta entre os resultados da busca. Priorize precis\xE3o e clareza.",
              maxTokens: 50
            }
          },
          {
            id: "format-response",
            type: "ai-format",
            name: "Formatar Resposta",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Formate a resposta de forma clara e amig\xE1vel. Use listas se necess\xE1rio e mantenha tom profissional.",
              maxTokens: 200
            }
          },
          {
            id: "ask-more",
            type: "ai-prompt",
            name: "Perguntar Mais",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Pergunte se o cliente tem mais d\xFAvidas ou precisa de esclarecimentos adicionais.",
              maxTokens: 80
            }
          },
          {
            id: "end",
            type: "end",
            name: "Finalizar FAQ",
            config: {
              message: "Espero ter ajudado! Estamos sempre aqui para esclarecer suas d\xFAvidas.",
              saveContext: true
            }
          }
        ]
      },
      /**
       * Appointment Scheduler Template
       * For booking appointments and consultations
       */
      APPOINTMENT_SCHEDULER: {
        name: "Agendamento de Consultas",
        description: "Template para agendamento de consultas e hor\xE1rios",
        trigger: "marcar, consulta, hor\xE1rio, agendar, quando",
        nodes: [
          {
            id: "start",
            type: "trigger",
            name: "In\xEDcio Agendamento",
            config: {
              triggerType: "keyword",
              keywords: ["marcar", "consulta", "hor\xE1rio", "agendar", "quando", "dispon\xEDvel"],
              channels: ["whatsapp", "instagram"]
            }
          },
          {
            id: "greet",
            type: "message",
            name: "Sauda\xE7\xE3o Agendamento",
            config: {
              message: "Perfeito! Posso ajudar voc\xEA a agendar uma consulta. Qual tipo de atendimento voc\xEA precisa?",
              delay: 1e3
            }
          },
          {
            id: "ask-type",
            type: "ai-prompt",
            name: "Perguntar Tipo",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Pergunte sobre o tipo de consulta: atendimento farmac\xEAutico, vacina\xE7\xE3o, exames, outros.",
              maxTokens: 100
            }
          },
          {
            id: "check-availability",
            type: "api-call",
            name: "Verificar Disponibilidade",
            config: {
              endpoint: "/api/appointments/availability",
              method: "POST",
              body: {
                type: "{{ask-type.selectedType}}",
                date: "{{ask-type.selectedDate}}"
              },
              responsePath: "availableSlots"
            }
          },
          {
            id: "show-availability",
            type: "ai-format",
            name: "Mostrar Disponibilidades",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Formate as disponibilidades de forma clara. Mostre datas e hor\xE1rios em lista.",
              maxTokens: 150
            }
          },
          {
            id: "select-time",
            type: "ai-prompt",
            name: "Selecionar Hor\xE1rio",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Pe\xE7a ao cliente para selecionar um hor\xE1rio da lista. Confirme se est\xE1 correto.",
              maxTokens: 80
            }
          },
          {
            id: "confirm-appointment",
            type: "ai-confirm",
            name: "Confirmar Agendamento",
            config: {
              model: "gpt-3.5-turbo",
              prompt: "Resuma o agendamento e pe\xE7a confirma\xE7\xE3o final. Inclua data, hor\xE1rio e tipo de consulta.",
              maxTokens: 120
            }
          },
          {
            id: "book-appointment",
            type: "api-call",
            name: "Reservar Hor\xE1rio",
            config: {
              endpoint: "/api/appointments/book",
              method: "POST",
              body: {
                customerId: "{{customer.id}}",
                type: "{{ask-type.selectedType}}",
                dateTime: "{{select-time.selectedTime}}",
                notes: "{{select-time.notes}}"
              },
              onSuccess: "appointment-confirmed",
              onError: "appointment-error"
            }
          },
          {
            id: "appointment-confirmed",
            type: "message",
            name: "Agendamento Confirmado",
            config: {
              message: "\xD3timo! Seu agendamento foi confirmado para {{book-appointment.appointmentDate}} \xE0s {{book-appointment.appointmentTime}}.",
              delay: 2e3
            }
          },
          {
            id: "send-reminder",
            type: "schedule",
            name: "Enviar Lembrete",
            config: {
              scheduleType: "cron",
              cronExpression: "0 9 * * 1",
              // Toda segunda às 9h
              message: "Lembrete: Voc\xEA tem uma consulta amanh\xE3 \xE0s {{book-appointment.appointmentTime}}.",
              channels: ["whatsapp"]
            }
          },
          {
            id: "end",
            type: "end",
            name: "Finalizar Agendamento",
            config: {
              message: "Agradecemos por agendar conosco! Estamos ansiosos para atend\xEA-lo.",
              saveContext: true
            }
          }
        ]
      }
    };
    AI_NODE_TYPES = {
      /**
       * AI Integration Nodes
       */
      "ai-classify": {
        name: "Classificar Inten\xE7\xE3o",
        description: "Classifica a inten\xE7\xE3o do cliente usando IA",
        icon: "\u{1F916}",
        config: {
          model: {
            type: "select",
            options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva a tarefa de classifica\xE7\xE3o..."
          },
          maxTokens: {
            type: "number",
            default: 100,
            min: 10,
            max: 2e3
          }
        }
      },
      "ai-response": {
        name: "Responder com IA",
        description: "Gera resposta usando IA com base no contexto",
        icon: "\u{1F916}",
        config: {
          model: {
            type: "select",
            options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          knowledgeBase: {
            type: "select",
            options: ["produtos_farmacia", "faq_farmacia", "conhecimento_geral"],
            required: false
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva o que a IA deve responder..."
          },
          maxTokens: {
            type: "number",
            default: 300,
            min: 10,
            max: 2e3
          },
          temperature: {
            type: "number",
            default: 0.3,
            min: 0,
            max: 1,
            step: 0.1
          }
        }
      },
      "ai-recommendation": {
        name: "Recomendar Produtos",
        description: "Recomenda produtos baseado nas necessidades do cliente",
        icon: "\u{1F6CD}\uFE0F",
        config: {
          model: {
            type: "select",
            options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          knowledgeBase: {
            type: "select",
            options: ["produtos_farmacia"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva como recomendar produtos..."
          },
          maxProducts: {
            type: "number",
            default: 3,
            min: 1,
            max: 10
          },
          maxTokens: {
            type: "number",
            default: 400,
            min: 10,
            max: 2e3
          }
        }
      },
      "ai-extract": {
        name: "Extrair Informa\xE7\xF5es",
        description: "Extrai informa\xE7\xF5es espec\xEDficas da mensagem",
        icon: "\u{1F50D}",
        config: {
          model: {
            type: "select",
            options: ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva o que extrair..."
          },
          maxTokens: {
            type: "number",
            default: 100,
            min: 10,
            max: 1e3
          }
        }
      },
      "ai-select": {
        name: "Selecionar Melhor Op\xE7\xE3o",
        description: "Seleciona a melhor op\xE7\xE3o entre m\xFAltiplas escolhas",
        icon: "\u2705",
        config: {
          model: {
            type: "select",
            options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva os crit\xE9rios de sele\xE7\xE3o..."
          },
          maxTokens: {
            type: "number",
            default: 50,
            min: 10,
            max: 500
          }
        }
      },
      "ai-format": {
        name: "Formatar Resposta",
        description: "Formata resposta para melhor legibilidade",
        icon: "\u{1F4DD}",
        config: {
          model: {
            type: "select",
            options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva como formatar..."
          },
          maxTokens: {
            type: "number",
            default: 200,
            min: 10,
            max: 1e3
          }
        }
      },
      "ai-confirm": {
        name: "Confirmar A\xE7\xE3o",
        description: "Confirma a\xE7\xF5es com o cliente",
        icon: "\u2705",
        config: {
          model: {
            type: "select",
            options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva o que confirmar..."
          },
          maxTokens: {
            type: "number",
            default: 120,
            min: 10,
            max: 500
          }
        }
      },
      "ai-checkout": {
        name: "Processar Compra",
        description: "Guia o cliente pelo processo de compra",
        icon: "\u{1F6D2}",
        config: {
          model: {
            type: "select",
            options: ["gpt-3.5-turbo", "claude-3", "gemini-pro"],
            required: true
          },
          prompt: {
            type: "textarea",
            required: true,
            placeholder: "Descreva o processo de compra..."
          },
          paymentMethods: {
            type: "select",
            multiple: true,
            options: ["cart\xE3o", "pix", "dinheiro", "boleto"],
            required: true
          },
          deliveryOptions: {
            type: "select",
            multiple: true,
            options: ["retirada", "entrega", "delivery", "motoboy"],
            required: true
          },
          maxTokens: {
            type: "number",
            default: 300,
            min: 10,
            max: 2e3
          }
        }
      },
      "knowledge-search": {
        name: "Buscar no Conhecimento",
        description: "Busca informa\xE7\xF5es em bases de conhecimento",
        icon: "\u{1F50D}",
        config: {
          knowledgeBase: {
            type: "select",
            options: ["faq_farmacia", "produtos_farmacia", "politicas_farmacia", "conhecimento_geral"],
            required: true
          },
          searchType: {
            type: "select",
            options: ["semantic", "keyword", "hybrid"],
            required: true
          },
          maxResults: {
            type: "number",
            default: 5,
            min: 1,
            max: 20
          }
        }
      },
      "api-call": {
        name: "Chamar API",
        description: "Realiza chamadas para APIs externas",
        icon: "\u26A1",
        config: {
          endpoint: {
            type: "text",
            required: true,
            placeholder: "/api/some-endpoint"
          },
          method: {
            type: "select",
            options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            required: true
          },
          body: {
            type: "json",
            required: false,
            placeholder: '{\n  "param1": "{{variable1}}",\n  "param2": "{{variable2}}"\n}'
          },
          headers: {
            type: "json",
            required: false,
            placeholder: '{\n  "Authorization": "Bearer {{token}}",\n  "Content-Type": "application/json"\n}'
          },
          onSuccess: {
            type: "text",
            required: true,
            placeholder: "node-name"
          },
          onError: {
            type: "text",
            required: true,
            placeholder: "node-name"
          }
        }
      },
      "schedule": {
        name: "Agendar Tarefa",
        description: "Agenda tarefas para execu\xE7\xE3o futura",
        icon: "\u23F0",
        config: {
          scheduleType: {
            type: "select",
            options: ["cron", "interval", "datetime"],
            required: true
          },
          cronExpression: {
            type: "text",
            required: false,
            placeholder: "0 9 * * 1"
            // Toda segunda às 9h
          },
          interval: {
            type: "number",
            required: false,
            placeholder: "300",
            // 5 minutos
            min: 60
          },
          message: {
            type: "textarea",
            required: true,
            placeholder: "Mensagem a ser enviada..."
          },
          channels: {
            type: "select",
            multiple: true,
            options: ["whatsapp", "instagram", "email", "sms"],
            required: true
          }
        }
      },
      "transfer": {
        name: "Transferir para Humano",
        description: "Transfere conversa para atendente humano",
        icon: "\u{1F916}\u26A1",
        config: {
          message: {
            type: "textarea",
            required: true,
            placeholder: "Mensagem informando transfer\xEAncia..."
          },
          channels: {
            type: "select",
            multiple: true,
            options: ["whatsapp", "instagram"],
            required: true
          },
          priority: {
            type: "select",
            options: ["low", "medium", "high", "urgent"],
            required: false,
            default: "medium"
          }
        }
      }
    };
    AI_KNOWLEDGE_BASES = {
      "faq_farmacia": {
        name: "FAQ da Farm\xE1cia",
        description: "Base de conhecimento com perguntas frequentes",
        content: `
## Hor\xE1rios de Funcionamento
- **Segunda a Sexta:** 8h \xE0s 20h
- **S\xE1bados:** 8h \xE0s 18h
- **Domingos e Feriados:** Fechado

## Formas de Pagamento
- Dinheiro
- Cart\xE3o de Cr\xE9dito (Visa, Mastercard, Elo)
- Cart\xE3o de D\xE9bito
- Pix
- Boleto Banc\xE1rio

## Entrega e Retirada
- **Entrega:** Em at\xE9 2 horas (ap\xF3s confirma\xE7\xE3o)
- **Retirada na Loja:** Sem custo
- **Taxa de Entrega:** A partir de R$ 10,00 (varia por regi\xE3o)

## Pol\xEDticas
- Troca em at\xE9 7 dias com nota fiscal
- Devolu\xE7\xE3o em at\xE9 30 dias
- Produtos lacrados n\xE3o s\xE3o pass\xEDveis de troca
    `
      },
      "produtos_farmacia": {
        name: "Cat\xE1logo de Produtos",
        description: "Base de conhecimento com informa\xE7\xF5es de produtos",
        content: `
## Medicamentos
- **Dipirona:** Analg\xE9sico e antifebril
- **Paracetamol:** Al\xEDvio de dor e febre
- **Ibuprofeno:** Anti-inflamat\xF3rio

## Cosm\xE9ticos
- **Protetor Solar FPS 50:** Prote\xE7\xE3o UVA/UVB
- **Hidratante Facial:** Para todos os tipos de pele
- **Shampoo Anticaspa:** Com cetoconazol

## Vitaminas
- **Vitamina C:** 1000mg
- **Centrum:** Multivitam\xEDnico completo
- **Lavitan:** Para energia e disposi\xE7\xE3o
    `
      },
      "politicas_farmacia": {
        name: "Pol\xEDticas da Farm\xE1cia",
        description: "Pol\xEDticas e regulamentos da farm\xE1cia",
        content: `
## Privacidade
- Dados pessoais s\xE3o protegidos conforme LGPD
- Informa\xE7\xF5es m\xE9dicas s\xE3o confidenciais
- Compromisso com seguran\xE7a dos dados

## Qualidade
- Produtos com registro na ANVISA
- Equipe t\xE9cnica qualificada
- Controle de qualidade rigoroso

## Atendimento
- Atendimento personalizado
- Respeito \xE0s necessidades dos clientes
- Compromisso com satisfa\xE7\xE3o
    `
      }
    };
    AI_DEFAULT_PROMPT = `
Voc\xEA \xE9 um assistente virtual especializado em atendimento ao cliente para farm\xE1cias. Seu objetivo \xE9 fornecer informa\xE7\xF5es precisas, ajudar com vendas e agendamentos, e oferecer suporte profissional.

## Regras Importantes:
1. **Seja Profissional:** Mantenha sempre um tom educado e profissional
2. **Conhecimento Farmac\xEAutico:** Apenas forne\xE7a informa\xE7\xF5es sobre produtos e medicamentos
3. **Limita\xE7\xF5es:** N\xE3o prescreva medicamentos ou d\xEA diagn\xF3sticos m\xE9dicos
4. **Seguran\xE7a:** Priorize informa\xE7\xF5es seguras e baseadas em evid\xEAncias
5. **Transfer\xEAncia:** Se n\xE3o tiver certeza, ofere\xE7a transferir para um atendente humano

## Contexto da Farm\xE1cia:
- Nome: Farm\xE1cia Francis
- Hor\xE1rios: Seg-Sex 8h-20h, S\xE1b 8h-18h
- Formas de pagamento: Dinheiro, Cart\xE3o, Pix
- Entrega: At\xE9 2 horas, taxa a partir de R$ 10

## Responda as perguntas de forma clara, concisa e sempre oferecendo ajuda adicional se necess\xE1rio.
`;
    AI_ERROR_HANDLING = {
      fallbackMessages: [
        "Desculpe, n\xE3o consegui entender sua pergunta. Poderia reformular?",
        "Parece que tivemos um problema t\xE9cnico. Deixe-me transferir para um atendente humano.",
        "Gostaria de falar com um de nossos atendentes? Eles podem ajudar melhor com sua solicita\xE7\xE3o."
      ],
      validationRules: {
        maxLength: 2e3,
        prohibitedContent: ["conte\xFAdo expl\xEDcito", "discurso de \xF3dio", "informa\xE7\xF5es falsas"],
        medicalRestrictions: ["prescrever medicamentos", "diagnosticar doen\xE7as", "dar conselhos m\xE9dicos"]
      }
    };
    AI_CONTEXT_MANAGEMENT = {
      conversationMemory: {
        maxTurns: 20,
        ttlMinutes: 30,
        keyFields: ["customerId", "channel", "phoneNumber"]
      },
      sessionContext: {
        customerInfo: {
          name: "",
          phone: "",
          history: []
        },
        currentFlow: {
          name: "",
          step: 0,
          data: {}
        },
        preferences: {
          language: "pt-BR",
          timezone: "America/Sao_Paulo",
          notification: true
        }
      }
    };
    AI_INTEGRATION_CONFIG = {
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-3.5-turbo",
          baseURL: "https://api.openai.com/v1"
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: "claude-3-sonnet-20240229",
          baseURL: "https://api.anthropic.com/v1"
        },
        google: {
          apiKey: process.env.GOOGLE_API_KEY,
          model: "gemini-pro",
          baseURL: "https://generativelanguage.googleapis.com/v1"
        }
      },
      embeddings: {
        model: "text-embedding-ada-002",
        dimensions: 1536,
        similarityThreshold: 0.7
      },
      rateLimits: {
        messagesPerMinute: 60,
        messagesPerHour: 1e3,
        concurrentRequests: 5
      }
    };
  }
});

// server/ai-integration.ts
var ai_integration_exports = {};
__export(ai_integration_exports, {
  default: () => ai_integration_default,
  getAITemplates: () => getAITemplates,
  processAIConversation: () => processAIConversation,
  processAutomationFlow: () => processAutomationFlow
});
async function processAIConversation(req, res) {
  try {
    const { templateId, customerId, channelId, message: message2, context } = req.body;
    if (!templateId || !customerId || !channelId || !message2) {
      return res.status(400).json({
        error: "Missing required parameters",
        required: ["templateId", "customerId", "channelId", "message"]
      });
    }
    const template = AI_CONVERSATION_TEMPLATES[templateId];
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const conversationContext = initializeContext(
      customerId,
      channelId,
      context
    );
    const result = await processFlow(template, message2, conversationContext);
    await saveConversationHistory(customerId, channelId, result);
    emitSSEEvents(customerId, result);
    res.json({
      success: true,
      result,
      context: conversationContext
    });
  } catch (error) {
    logger.error(error, { context: req.body });
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}
async function processAutomationFlow(req, res) {
  try {
    const { flowId, triggerType, triggerData, customerId } = req.body;
    if (!flowId || !triggerType) {
      return res.status(400).json({
        error: "Missing required parameters",
        required: ["flowId", "triggerType"]
      });
    }
    const flow = await getVisualFlow(flowId);
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }
    const result = await executeFlow(
      flow,
      triggerType,
      triggerData,
      customerId
    );
    res.json({
      success: true,
      result,
      executionId: result.executionId
    });
  } catch (error) {
    logger.error(error, { context: req.body });
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}
async function getAITemplates(req, res) {
  try {
    res.json({
      success: true,
      templates: AI_CONVERSATION_TEMPLATES,
      nodeTypes: AI_NODE_TYPES,
      knowledgeBases: AI_KNOWLEDGE_BASES,
      defaultPrompt: AI_DEFAULT_PROMPT,
      errorHandling: AI_ERROR_HANDLING,
      contextManagement: AI_CONTEXT_MANAGEMENT,
      integrationConfig: AI_INTEGRATION_CONFIG
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
function initializeContext(customerId, channelId, existingContext) {
  const context = existingContext || {};
  return {
    ...context,
    customerId,
    channelId,
    conversationId: `${channelId}-${Date.now()}`,
    startTime: (/* @__PURE__ */ new Date()).toISOString(),
    turnCount: context.turnCount || 0,
    memory: context.memory || [],
    preferences: context.preferences || {
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      notification: true
    }
  };
}
async function processFlow(template, message2, context) {
  const result = {
    conversationId: context.conversationId,
    customerId: context.customerId,
    channelId: context.channelId,
    messages: [],
    decisions: [],
    actions: [],
    finalResponse: "",
    needsHuman: false,
    contextUpdate: {}
  };
  for (const node of template.nodes) {
    const nodeResult = await processNode(node, message2, context, result);
    if (nodeResult.message) {
      result.messages.push(nodeResult.message);
    }
    if (nodeResult.decision) {
      result.decisions.push(nodeResult.decision);
    }
    if (nodeResult.action) {
      result.actions.push(nodeResult.action);
    }
    context.turnCount = (context.turnCount || 0) + 1;
    if (node.type === "end" || nodeResult.shouldEnd) {
      break;
    }
  }
  result.finalResponse = generateFinalResponse(result, context);
  return result;
}
async function processNode(node, message2, context, result) {
  switch (node.type) {
    case "trigger":
      return await processTriggerNode(node, message2, context);
    case "message":
      return await processMessageNode(node, context);
    case "ai-classify":
      return await processAICLassifyNode(node, message2, context);
    case "condition":
      return await processConditionNode(node, result, context);
    case "ai-response":
      return await processAIResponseNode(node, message2, context);
    case "ai-recommendation":
      return await processAIRecommendationNode(node, message2, context);
    case "ai-extract":
      return await processAIExtractNode(node, message2, context);
    case "ai-select":
      return await processAISelectNode(node, result, context);
    case "ai-format":
      return await processAIFormatNode(node, result, context);
    case "ai-confirm":
      return await processAIConfirmNode(node, message2, context);
    case "ai-checkout":
      return await processAICheckoutNode(node, message2, context);
    case "knowledge-search":
      return await processKnowledgeSearchNode(node, message2, context);
    case "api-call":
      return await processAPICallNode(node, context);
    case "schedule":
      return await processScheduleNode(node, context);
    case "transfer":
      return await processTransferNode(node, context);
    case "end":
      return await processEndNode(node, context);
    default:
      return { message: `Unknown node type: ${node.type}` };
  }
}
async function processTriggerNode(node, message2, context) {
  const keywords = node.config.keywords;
  const channels = node.config.channels;
  const messageLower = message2.toLowerCase();
  const matchedKeyword = keywords.find(
    (keyword) => messageLower.includes(keyword.toLowerCase())
  );
  return {
    message: matchedKeyword ? `Trigger detected: "${matchedKeyword}"` : "No trigger keyword matched",
    decision: {
      type: "trigger",
      matched: !!matchedKeyword,
      keyword: matchedKeyword
    }
  };
}
async function processMessageNode(node, context) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      delay: node.config.delay || 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function processAICLassifyNode(node, message2, context) {
  try {
    const response = await callAIProvider({
      model: node.config.model,
      prompt: node.config.prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens
    });
    const classification = response.choices[0].message.content.trim();
    return {
      message: `Classifica\xE7\xE3o: ${classification}`,
      decision: {
        type: "classification",
        category: classification,
        confidence: response.choices[0].index || 0.8
      },
      action: {
        type: "update-context",
        field: "classification",
        value: classification
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI classification failed"
      }
    };
  }
}
async function processConditionNode(node, result, context) {
  const conditions = node.config.conditions;
  let shouldFollowTruePath = true;
  for (const condition of conditions) {
    const nodeValue = result[condition.node]?.[condition.field];
    switch (condition.operator) {
      case "equals":
        if (nodeValue !== condition.value) {
          shouldFollowTruePath = false;
        }
        break;
      case "contains":
        if (!nodeValue?.includes(condition.value)) {
          shouldFollowTruePath = false;
        }
        break;
      case "greaterThan":
        if (nodeValue < condition.value) {
          shouldFollowTruePath = false;
        }
        break;
      case "lessThan":
        if (nodeValue > condition.value) {
          shouldFollowTruePath = false;
        }
        break;
    }
  }
  return {
    decision: {
      type: "condition",
      condition: node.config.conditions,
      result: shouldFollowTruePath
    },
    action: {
      type: "route",
      path: shouldFollowTruePath ? node.config.truePath : node.config.falsePath
    }
  };
}
async function processAIResponseNode(node, message2, context) {
  try {
    const prompt = `
${AI_DEFAULT_PROMPT}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message2}

## Responda com base neste contexto e nas instru\xE7\xF5es espec\xEDficas:
${node.config.prompt}
`;
    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens,
      temperature: node.config.temperature || 0.3
    });
    const aiResponse = response.choices[0].message.content.trim();
    return {
      message: {
        type: "bot",
        content: aiResponse,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        aiModel: node.config.model,
        knowledgeBase: node.config.knowledgeBase
      },
      action: {
        type: "response",
        content: aiResponse,
        model: node.config.model
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: "AI response failed"
      }
    };
  }
}
async function processAIRecommendationNode(node, message2, context) {
  try {
    const prompt = `
${AI_DEFAULT_PROMPT}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message2}
- Necessidades identificadas: [INSERIR NECESSIDADES]

## Recomende produtos farmac\xEAuticos baseado nas necessidades do cliente:
${node.config.prompt}
`;
    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens
    });
    const recommendations = parseRecommendations(
      response.choices[0].message.content
    );
    return {
      message: {
        type: "bot",
        content: generateRecommendationsMessage(recommendations),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        recommendations
      },
      action: {
        type: "recommendations",
        products: recommendations,
        model: node.config.model
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[2],
      decision: {
        type: "error",
        error: "AI recommendation failed"
      }
    };
  }
}
async function processAIExtractNode(node, message2, context) {
  try {
    const response = await callAIProvider({
      model: node.config.model,
      prompt: node.config.prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens
    });
    const extractedData = response.choices[0].message.content.trim();
    return {
      message: `Informa\xE7\xF5es extra\xEDdas: ${extractedData}`,
      decision: {
        type: "extraction",
        data: extractedData
      },
      action: {
        type: "update-context",
        field: "extractedData",
        value: extractedData
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI extraction failed"
      }
    };
  }
}
async function processAISelectNode(node, result, context) {
  try {
    const options = result[Object.keys(result).find((key) => key.includes("options"))] || [];
    if (options.length === 0) {
      return {
        message: "Nenhuma op\xE7\xE3o dispon\xEDvel para sele\xE7\xE3o",
        decision: {
          type: "selection",
          result: null
        }
      };
    }
    const response = await callAIProvider({
      model: node.config.model,
      prompt: `
${node.config.prompt}

## Op\xE7\xF5es dispon\xEDveis:
${options.map((opt, i) => `${i + 1}. ${JSON.stringify(opt)}`).join("\n")}
`,
      maxTokens: node.config.maxTokens
    });
    const selectedIndex = parseInt(response.choices[0].message.content.trim()) - 1;
    const selectedOption = options[selectedIndex];
    return {
      message: `Op\xE7\xE3o selecionada: ${JSON.stringify(selectedOption)}`,
      decision: {
        type: "selection",
        selected: selectedOption,
        index: selectedIndex
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI selection failed"
      }
    };
  }
}
async function processAIFormatNode(node, result, context) {
  try {
    const dataToFormat = result[Object.keys(result).find((key) => key.includes("data"))] || {};
    const response = await callAIProvider({
      model: node.config.model,
      prompt: `
${node.config.prompt}

## Dados a serem formatados:
${JSON.stringify(dataToFormat, null, 2)}
`,
      maxTokens: node.config.maxTokens
    });
    const formattedData = response.choices[0].message.content.trim();
    return {
      message: `Dados formatados:
${formattedData}`,
      decision: {
        type: "formatting",
        formatted: formattedData
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI formatting failed"
      }
    };
  }
}
async function processAIConfirmNode(node, message2, context) {
  try {
    const prompt = `
${node.config.prompt}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message2}
`;
    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens
    });
    const confirmation = response.choices[0].message.content.trim().toLowerCase();
    const isConfirmed = confirmation.includes("sim") || confirmation.includes("confirmo");
    return {
      message: isConfirmed ? "Confirma\xE7\xE3o recebida" : "Confirma\xE7\xE3o n\xE3o recebida",
      decision: {
        type: "confirmation",
        confirmed: isConfirmed,
        response: confirmation
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "AI confirmation failed"
      }
    };
  }
}
async function processAICheckoutNode(node, message2, context) {
  try {
    const prompt = `
${node.config.prompt}

## Contexto da Conversa:
- Cliente: ${context.customerId}
- Canal: ${context.channelId}
- Mensagem: ${message2}
- Formas de pagamento dispon\xEDveis: ${node.config.paymentMethods.join(", ")}
- Op\xE7\xF5es de entrega: ${node.config.deliveryOptions.join(", ")}
`;
    const response = await callAIProvider({
      model: node.config.model,
      prompt,
      messages: [{ role: "user", content: message2 }],
      maxTokens: node.config.maxTokens
    });
    const checkoutData = parseCheckoutData(response.choices[0].message.content);
    return {
      message: {
        type: "bot",
        content: generateCheckoutMessage(checkoutData),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        checkoutData
      },
      action: {
        type: "checkout",
        data: checkoutData,
        model: node.config.model
      }
    };
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      return {
        message: "Desculpe, no momento n\xE3o consigo processar imagens. Por favor, descreva o que voc\xEA precisa em texto.",
        decision: {
          type: "error",
          error: "Image not supported"
        }
      };
    }
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: "AI checkout failed"
      }
    };
  }
}
async function processKnowledgeSearchNode(node, message2, context) {
  try {
    const knowledgeBase = AI_KNOWLEDGE_BASES[node.config.knowledgeBase];
    if (!knowledgeBase) {
      throw new Error(`Knowledge base ${node.config.knowledgeBase} not found`);
    }
    const results = await searchKnowledgeBase(
      knowledgeBase,
      message2,
      node.config.searchType
    );
    return {
      message: `Resultados encontrados: ${results.length} itens`,
      decision: {
        type: "knowledge-search",
        results: results.slice(0, node.config.maxResults)
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[0],
      decision: {
        type: "error",
        error: "Knowledge search failed"
      }
    };
  }
}
async function processAPICallNode(node, context) {
  try {
    const response = await fetch(node.config.endpoint, {
      method: node.config.method,
      headers: {
        "Content-Type": "application/json",
        ...node.config.headers
      },
      body: node.config.body ? JSON.stringify(node.config.body) : void 0
    });
    if (!response.ok) {
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return {
      message: `API call successful: ${JSON.stringify(data, null, 2)}`,
      decision: {
        type: "api-call",
        endpoint: node.config.endpoint,
        method: node.config.method,
        response: data
      }
    };
  } catch (error) {
    return {
      message: AI_ERROR_HANDLING.fallbackMessages[1],
      decision: {
        type: "error",
        error: `API call failed: ${error.message}`
      }
    };
  }
}
async function processScheduleNode(node, context) {
  return {
    message: `Tarefa agendada: ${node.config.scheduleType}`,
    decision: {
      type: "schedule",
      scheduleType: node.config.scheduleType,
      cronExpression: node.config.cronExpression,
      interval: node.config.interval
    }
  };
}
async function processTransferNode(node, context) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      transfer: {
        to: "human",
        channels: node.config.channels,
        priority: node.config.priority || "medium"
      }
    },
    decision: {
      type: "transfer",
      to: "human",
      channels: node.config.channels,
      priority: node.config.priority || "medium"
    },
    action: {
      type: "transfer",
      to: "human",
      channels: node.config.channels,
      priority: node.config.priority || "medium"
    }
  };
}
async function processEndNode(node, context) {
  return {
    message: {
      type: "bot",
      content: node.config.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      end: true
    },
    decision: {
      type: "end",
      saveContext: node.config.saveContext || false,
      followUp: node.config.followUp || false
    },
    shouldEnd: true
  };
}
function generateFinalResponse(result, context) {
  if (result.finalResponse) {
    return result.finalResponse;
  }
  if (result.messages.length > 0) {
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage.type === "bot") {
      return lastMessage.content;
    }
  }
  return "Obrigado por entrar em contato! Estamos aqui para ajudar.";
}
async function callAIProvider(options) {
  const provider = AI_INTEGRATION_CONFIG.providers.openai;
  const messages4 = options.messages || [];
  const hasImages = messages4.some((msg) => {
    if (Array.isArray(msg.content)) {
      return msg.content.some((part) => part?.type === "image_url");
    }
    return false;
  });
  if (hasImages) {
    console.log("[callAIProvider] Images detected in message");
  }
  try {
    const response = await fetch(`${provider.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: options.model,
        messages: messages4.length > 0 ? messages4 : [
          { role: "system", content: options.prompt },
          { role: "user", content: options.prompt }
        ],
        max_tokens: options.maxTokens || 1e3,
        temperature: options.temperature || 0.3
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[AI Integration] API Error:",
        response.status,
        response.statusText
      );
      console.error("[AI Integration] Error response:", errorText);
      if (errorText.includes("image") || errorText.includes("image_url") || errorText.includes("does not support") || errorText.includes("Cannot read")) {
        console.error("[AI Integration] Image not supported error detected");
        throw new Error("IMAGE_NOT_SUPPORTED");
      }
      throw new Error(
        `AI API call failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
      );
    }
    return await response.json();
  } catch (error) {
    if (error.message === "IMAGE_NOT_SUPPORTED") {
      throw error;
    }
    throw new Error(`AI API call failed: ${error.message}`);
  }
}
function parseRecommendations(text4) {
  const products = [];
  const lines = text4.split("\n");
  lines.forEach((line) => {
    if (line.includes("Produto:")) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        products.push({
          name: parts[1].trim(),
          description: parts[2]?.trim() || "",
          price: parts[3]?.trim() || "",
          image: parts[4]?.trim() || ""
        });
      }
    }
  });
  return products;
}
function generateRecommendationsMessage(products) {
  return `Encontrei estes produtos para voc\xEA:

` + products.map(
    (p, i) => `${i + 1}. ${p.name}
   ${p.description}
   Pre\xE7o: ${p.price}

`
  ).join("") + `Deseja mais informa\xE7\xF5es sobre algum deles?`;
}
function parseCheckoutData(text4) {
  const data = {};
  if (text4.includes("Pagamento:")) {
    data.paymentMethod = text4.split("Pagamento:")[1].split("\n")[0].trim();
  }
  if (text4.includes("Entrega:")) {
    data.deliveryOption = text4.split("Entrega:")[1].split("\n")[0].trim();
  }
  if (text4.includes("Total:")) {
    data.total = text4.split("Total:")[1].split("\n")[0].trim();
  }
  return data;
}
function generateCheckoutMessage(data) {
  return `\xD3timo! Vou processar seu pedido:

Pagamento: ${data.paymentMethod}
Entrega: ${data.deliveryOption}
Total: ${data.total}

Por favor, confirme se est\xE1 tudo correto.`;
}
async function searchKnowledgeBase(knowledgeBase, query, searchType) {
  if (searchType === "semantic") {
    return semanticSearch(knowledgeBase.content, query);
  } else {
    return keywordSearch(knowledgeBase.content, query);
  }
}
async function semanticSearch(content2, query) {
  return [{ content: content2, score: 0.9 }];
}
function keywordSearch(content2, query) {
  const results = [];
  const queryLower = query.toLowerCase();
  if (content2.toLowerCase().includes(queryLower)) {
    results.push({ content: content2, score: 1 });
  }
  return results;
}
async function saveConversationHistory(customerId, channelId, result) {
  console.log("Saving conversation history:", {
    customerId,
    channelId,
    result
  });
}
function emitSSEEvents(customerId, result) {
  const events = [];
  result.messages.forEach((message2) => {
    events.push({
      type: EVENTS.MESSAGE_NEW,
      data: {
        customerId,
        channelId: result.channelId,
        message: message2
      }
    });
  });
  if (result.needsHuman) {
    events.push({
      type: EVENTS.AGENT_STATUS,
      data: {
        customerId,
        status: "needs-human"
      }
    });
  }
  events.forEach((event) => {
    sseManager.emitToUser(String(customerId), {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    });
  });
}
async function getVisualFlow(flowId) {
  return {
    id: flowId,
    name: "Flow Name",
    flowData: '{"nodes": [], "edges": []}',
    isActive: true
  };
}
async function executeFlow(flow, triggerType, triggerData, customerId) {
  return {
    executionId: `${flow.id}-${Date.now()}`,
    status: "completed",
    result: "Flow executed successfully",
    executionTime: 1234
  };
}
var ai_integration_default;
var init_ai_integration = __esm({
  "server/ai-integration.ts"() {
    "use strict";
    init_logger();
    init_sse();
    init_ai_templates();
    ai_integration_default = {
      processAIConversation,
      processAutomationFlow,
      getAITemplates
    };
  }
});

// server/_core/redis.ts
function createRedisClient() {
  if (!process.env.REDIS_URL) {
    console.warn("[Redis] \u26A0\uFE0F REDIS_URL not found \u2014 using in-memory fallback");
    return null;
  }
  try {
    const isRailway = process.env.REDIS_URL.includes("proxy.rlwy.net");
    console.log(`[Redis] \u{1F504} Connecting to ${isRailway ? "Railway Redis" : "External Redis"}...`);
    const client = new import_ioredis.default(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 1e4,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 50, 2e3),
      tls: isRailway ? {
        rejectUnauthorized: false
      } : void 0
    });
    client.on("connect", () => {
      redisDown = false;
      reconnectAttempts = 0;
      metrics.reconnects++;
      console.log("[Redis] \u2705 Connected successfully");
    });
    client.on("error", (err) => {
      redisDown = true;
      reconnectAttempts++;
      metrics.errors++;
      console.error("[Redis] \u274C Erro de conex\xE3o:", err.message);
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error(
          "[Redis] \u274C M\xE1ximo de tentativas atingido \u2014 desativando"
        );
        redisClient = null;
      }
    });
    client.on("end", () => {
      redisDown = true;
      console.warn("[Redis] \u26A0\uFE0F Connection closed");
    });
    return client;
  } catch (err) {
    console.error("[Redis] \u274C Falha ao inicializar:", err);
    return null;
  }
}
function getRedis() {
  if (redisDown) {
    console.warn("[Redis] \u26A0\uFE0F Redis is down, using fallback");
    return null;
  }
  return redisClient;
}
async function checkRedisHealth() {
  const redis = getRedis();
  if (!redis) {
    return {
      status: "unavailable",
      message: "Redis not configured or down",
      fallback: "in-memory",
      metrics
    };
  }
  try {
    await redis.ping();
    metrics.lastHealthCheck = /* @__PURE__ */ new Date();
    return {
      status: "ok",
      message: "Redis is running",
      metrics
    };
  } catch (err) {
    console.error("[Redis] \u274C Health check falhou:", err);
    return {
      status: "error",
      message: String(err),
      metrics
    };
  }
}
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log("[Redis] \u2705 Disconnected gracefully");
    } catch (err) {
      console.error("[Redis] \u274C Erro ao desconectar:", err);
      redisClient.disconnect();
    }
  }
}
var import_ioredis, redisClient, redisDown, reconnectAttempts, MAX_RECONNECT_ATTEMPTS, metrics, DEFAULT_TTL;
var init_redis = __esm({
  "server/_core/redis.ts"() {
    "use strict";
    import_ioredis = __toESM(require("ioredis"), 1);
    redisClient = null;
    redisDown = false;
    reconnectAttempts = 0;
    MAX_RECONNECT_ATTEMPTS = 10;
    metrics = {
      operations: 0,
      errors: 0,
      reconnects: 0,
      lastHealthCheck: /* @__PURE__ */ new Date()
    };
    redisClient = createRedisClient();
    DEFAULT_TTL = 60 * 60;
    process.on("SIGTERM", async () => {
      await closeRedis();
      process.exit(0);
    });
    process.on("SIGINT", async () => {
      await closeRedis();
      process.exit(0);
    });
  }
});

// server/_core/redis-namespaces.ts
function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}
function memorySet(key, value, ttlSeconds) {
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1e3 : null
  });
}
function createNamespacedClient(namespace) {
  const prefix = REDIS_NAMESPACES[namespace];
  return {
    async _getClient() {
      try {
        return await getRedis();
      } catch {
        return null;
      }
    },
    async get(key) {
      const client = await this._getClient();
      if (!client) return memoryGet(`${prefix}${key}`);
      try {
        return await client.get(`${prefix}${key}`);
      } catch {
        return memoryGet(`${prefix}${key}`);
      }
    },
    async getJSON(key) {
      const value = await this.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    async set(key, value, ttlSeconds) {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      const fullKey = `${prefix}${key}`;
      memorySet(fullKey, serialized, ttlSeconds);
      const client = await this._getClient();
      if (!client) return "OK";
      try {
        if (ttlSeconds) {
          return await client.setex(fullKey, ttlSeconds, serialized);
        } else {
          return await client.set(fullKey, serialized);
        }
      } catch {
        return "OK";
      }
    },
    async setnx(key, value, ttlSeconds) {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      const fullKey = `${prefix}${key}`;
      const client = await this._getClient();
      if (!client) {
        if (memoryGet(fullKey)) return false;
        memorySet(fullKey, serialized, ttlSeconds);
        return true;
      }
      try {
        if (ttlSeconds) {
          const result = await client.set(fullKey, serialized, "EX", ttlSeconds, "NX");
          return result === "OK";
        } else {
          const result = await client.set(fullKey, serialized, "NX");
          return result === "OK";
        }
      } catch {
        if (memoryGet(fullKey)) return false;
        memorySet(fullKey, serialized, ttlSeconds);
        return true;
      }
    },
    async del(key) {
      const fullKey = `${prefix}${key}`;
      memoryCache.delete(fullKey);
      const client = await this._getClient();
      if (!client) return 1;
      try {
        return await client.del(fullKey);
      } catch {
        return 1;
      }
    },
    async exists(key) {
      const fullKey = `${prefix}${key}`;
      if (memoryCache.has(fullKey)) return true;
      const client = await this._getClient();
      if (!client) return false;
      try {
        const result = await client.exists(fullKey);
        return result === 1;
      } catch {
        return false;
      }
    },
    async keys(pattern = "*") {
      const client = await this._getClient();
      if (!client) return [];
      try {
        const keys = await client.keys(`${prefix}${pattern}`);
        return keys.map((k) => k.substring(prefix.length));
      } catch {
        return [];
      }
    },
    async incr(key) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.incr(`${prefix}${key}`);
      } catch {
        return 0;
      }
    },
    async decr(key) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.decr(`${prefix}${key}`);
      } catch {
        return 0;
      }
    },
    async expire(key, ttlSeconds) {
      const client = await this._getClient();
      if (!client) return false;
      try {
        return await client.expire(`${prefix}${key}`, ttlSeconds);
      } catch {
        return false;
      }
    },
    async ttl(key) {
      const client = await this._getClient();
      if (!client) return -1;
      try {
        return await client.ttl(`${prefix}${key}`);
      } catch {
        return -1;
      }
    },
    async hget(hashKey, field) {
      const client = await this._getClient();
      if (!client) return null;
      try {
        return await client.hget(`${prefix}${hashKey}`, field);
      } catch {
        return null;
      }
    },
    async hset(hashKey, field, value) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.hset(`${prefix}${hashKey}`, field, value);
      } catch {
        return 0;
      }
    },
    async hgetall(hashKey) {
      const client = await this._getClient();
      if (!client) return {};
      try {
        return await client.hgetall(`${prefix}${hashKey}`);
      } catch {
        return {};
      }
    },
    async hdel(hashKey, field) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.hdel(`${prefix}${hashKey}`, field);
      } catch {
        return 0;
      }
    },
    async sadd(setKey, member) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.sadd(`${prefix}${setKey}`, member);
      } catch {
        return 0;
      }
    },
    async smembers(setKey) {
      const client = await this._getClient();
      if (!client) return [];
      try {
        return await client.smembers(`${prefix}${setKey}`);
      } catch {
        return [];
      }
    },
    async srem(setKey, member) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.srem(`${prefix}${setKey}`, member);
      } catch {
        return 0;
      }
    },
    async publish(channel, message2) {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.publish(`${prefix}${channel}`, message2);
      } catch {
        return 0;
      }
    }
  };
}
function getEvolutionRedis() {
  if (!evolutionClient) {
    evolutionClient = createNamespacedClient("EVOLUTION");
  }
  return evolutionClient;
}
var REDIS_NAMESPACES, memoryCache, evolutionClient;
var init_redis_namespaces = __esm({
  "server/_core/redis-namespaces.ts"() {
    "use strict";
    init_redis();
    REDIS_NAMESPACES = {
      EVOLUTION: "evolution:",
      FARMA: "farma:",
      BROADCAST: "broadcast:",
      RATELIMIT: "ratelimit:",
      CACHE: "cache:",
      SESSION: "session:",
      QUEUE: "queue:"
    };
    memoryCache = /* @__PURE__ */ new Map();
    evolutionClient = null;
  }
});

// server/services/cache-evolution.ts
async function getEvolutionConfigWithCache() {
  if (memoryConfig && Date.now() < memoryConfig.expiresAt) {
    return memoryConfig.data;
  }
  try {
    const cache = getEvolutionRedis();
    const cached = await cache.getJSON(EVOLUTION_CONFIG_KEY);
    if (cached) {
      memoryConfig = { data: cached, expiresAt: Date.now() + EVOLUTION_TTL * 1e3 };
      return cached;
    }
  } catch {
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db.select().from(integrationSettings).where(import_drizzle_orm13.sql`integration_type = ${"evolution_api"}`).limit(1);
  if (!config || !config.isActive) {
    throw new Error("Evolution API not configured");
  }
  const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  const toCache = {
    apiUrl: configData.apiUrl,
    instanceName: configData.instanceName
  };
  memoryConfig = { data: toCache, expiresAt: Date.now() + EVOLUTION_TTL * 1e3 };
  try {
    const cache = getEvolutionRedis();
    await cache.set(EVOLUTION_CONFIG_KEY, toCache, EVOLUTION_TTL);
  } catch {
  }
  return toCache;
}
async function getEvolutionApiKey() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db.select().from(integrationSettings).where(import_drizzle_orm13.sql`integration_type = ${"evolution_api"}`).limit(1);
  if (!config || !config.isActive) {
    throw new Error("Evolution API not configured");
  }
  const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  return configData.apiKey || configData.accessToken;
}
var import_drizzle_orm13, EVOLUTION_CONFIG_KEY, EVOLUTION_TTL, memoryConfig;
var init_cache_evolution = __esm({
  "server/services/cache-evolution.ts"() {
    "use strict";
    init_redis_namespaces();
    init_db();
    init_schema();
    import_drizzle_orm13 = require("drizzle-orm");
    EVOLUTION_CONFIG_KEY = "config:evolution";
    EVOLUTION_TTL = 300;
    memoryConfig = null;
  }
});

// server/r2-client.ts
var r2_client_exports = {};
__export(r2_client_exports, {
  extractR2Key: () => extractR2Key,
  isR2Url: () => isR2Url,
  uploadToR2: () => uploadToR2
});
async function uploadToR2(buffer, originalName, mimetype) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Buffer vazio - upload abortado");
  }
  const contentMD5 = import_crypto.default.createHash("md5").update(buffer).digest("base64");
  const sha256 = import_crypto.default.createHash("sha256").update(buffer).digest("hex");
  const localMd5Hex = import_crypto.default.createHash("md5").update(buffer).digest("hex");
  const ext = originalName.split(".").pop() || "bin";
  const fileKey = `media/${Date.now()}-${import_crypto.default.randomBytes(8).toString("hex")}.${ext}`;
  const command = new import_client_s3.PutObjectCommand({
    Bucket: "farmafranciswhatsappmedia",
    Key: fileKey,
    Body: buffer,
    ContentType: mimetype,
    ContentMD5: contentMD5,
    Metadata: {
      "original-name": originalName,
      "sha256": sha256,
      "uploaded-at": (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  await s3Client.send(command);
  const headCmd = new import_client_s3.HeadObjectCommand({ Bucket: "farmafranciswhatsappmedia", Key: fileKey });
  const headResult = await s3Client.send(headCmd);
  const r2Etag = headResult.ETag?.replace(/"/g, "");
  if (r2Etag && r2Etag !== localMd5Hex) {
    console.error("[R2 Upload] \u26A0\uFE0F ETag mismatch!", { r2Etag, localMd5Hex, fileKey });
    throw new Error("Falha de integridade: ETag do R2 n\xE3o confere com hash local");
  }
  const publicUrl = `https://pub-33c481f0a9e94adb8870472308f49471.r2.dev/${fileKey}`;
  console.log("[R2 Upload] \u2705 Sucesso:", { fileKey, size: buffer.length, etag: r2Etag });
  return {
    url: publicUrl,
    key: fileKey,
    etag: r2Etag || localMd5Hex,
    size: buffer.length,
    contentType: mimetype
  };
}
function extractR2Key(url) {
  if (!url || typeof url !== "string") return null;
  if (url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.includes("pub-33c481f0a9e94adb8870472308f49471.r2.dev")) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(1).join("/");
    } catch {
      return null;
    }
  }
  if (!url.startsWith("http") && !url.startsWith("data:")) return url;
  return url;
}
function isR2Url(url) {
  if (!url) return false;
  return url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.includes("pub-33c481f0a9e94adb8870472308f49471.r2.dev");
}
var import_client_s3, import_crypto, s3Client;
var init_r2_client = __esm({
  "server/r2-client.ts"() {
    "use strict";
    import_client_s3 = require("@aws-sdk/client-s3");
    import_crypto = __toESM(require("crypto"), 1);
    s3Client = new import_client_s3.S3Client({
      region: "auto",
      endpoint: "https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "debc3a713faeb6d442dab499221ba42f",
        secretAccessKey: "c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c"
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED"
    });
  }
});

// server/workers/broadcast-sender.ts
var broadcast_sender_exports = {};
__export(broadcast_sender_exports, {
  processBroadcastMessage: () => processBroadcastMessage
});
async function sendWhatsAppMessageWithRetry(phone, content2, fileAttachment) {
  const variants = generatePhoneVariants(phone);
  const { apiUrl, instanceName } = await getEvolutionConfigWithCache();
  const apiKey = await getEvolutionApiKey();
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    try {
      const payload = {
        number: variant
      };
      if (fileAttachment) {
        payload.media = fileAttachment.url;
        payload.mediatype = mimetypeToMediatype[fileAttachment.type] || "image";
        payload.fileName = fileAttachment.name;
        if (content2 && content2.trim()) {
          payload.caption = content2;
        }
        const response = await fetch(
          `${apiUrl}/message/sendMedia/${instanceName}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );
        if (response.ok) {
          console.log(`[Broadcast] \u2705 Enviado com sucesso para ${variant} (m\xEDdia)`);
          return { success: true };
        } else {
          const errorText = await response.text();
          console.warn(
            `[Broadcast] \u26A0\uFE0F Tentativa ${i + 1}/${variants.length} falhou para ${variant}: ${response.status} - ${errorText}`
          );
        }
      } else {
        payload.text = content2;
        const response = await fetch(
          `${apiUrl}/message/sendText/${instanceName}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );
        if (response.ok) {
          console.log(`[Broadcast] \u2705 Enviado com sucesso para ${variant} (texto)`);
          return { success: true };
        } else {
          const errorText = await response.text();
          console.warn(
            `[Broadcast] \u26A0\uFE0F Tentativa ${i + 1}/${variants.length} falhou para ${variant}: ${response.status} - ${errorText}`
          );
        }
      }
    } catch (err) {
      console.warn(
        `[Broadcast] \u26A0\uFE0F Erro na tentativa ${i + 1}/${variants.length} para ${variant}:`,
        err.message
      );
    }
  }
  return {
    success: false,
    error: "Todas as 4 varia\xE7\xF5es falharam"
  };
}
async function processBroadcastMessage(messageId) {
  const db = await getDb();
  if (!db) {
    console.error("[Broadcast] Database not available");
    return;
  }
  try {
    const [message2] = await db.select({
      id: broadcastMessages.id,
      messageText: broadcastMessages.messageText,
      fileUrl: broadcastMessages.fileUrl,
      fileName: broadcastMessages.fileName,
      fileType: broadcastMessages.fileType,
      fileSize: broadcastMessages.fileSize
    }).from(broadcastMessages).where((0, import_drizzle_orm14.eq)(broadcastMessages.id, messageId)).limit(1);
    if (!message2) {
      console.error(`[Broadcast] Mensagem ${messageId} n\xE3o encontrada`);
      return;
    }
    let resolvedFileUrl = message2.fileUrl;
    if (resolvedFileUrl && resolvedFileUrl.startsWith("data:")) {
      try {
        const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
        const mimeMatch = resolvedFileUrl.match(/^data:([^;]+);base64,(.*)$/s);
        if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
          const mimetype = mimeMatch[1];
          const base64Data = mimeMatch[2];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : "jpg";
          const r2Result = await uploadToR23(buffer, `broadcast/${messageId}_${Date.now()}.${ext}`, mimetype);
          resolvedFileUrl = r2Result.url;
          console.log("[Broadcast] \u{1F4CE} Uploaded media to R2:", r2Result.url);
          await db.update(broadcastMessages).set({ fileUrl: resolvedFileUrl }).where((0, import_drizzle_orm14.eq)(broadcastMessages.id, messageId));
        }
      } catch (r2Err) {
        console.error("[Broadcast] \u26A0\uFE0F R2 upload failed:", r2Err.message);
        const base64Match = resolvedFileUrl.match(/^data:[^;]+;base64,(.*)$/s);
        if (base64Match) {
          resolvedFileUrl = base64Match[1];
        }
      }
    }
    if (!message2) {
      console.error(`[Broadcast] Mensagem ${messageId} n\xE3o encontrada`);
      return;
    }
    const pendingSents = await db.select({
      id: broadcastMembersSent.id,
      customerId: broadcastMembersSent.customerId,
      phone: broadcastMembersSent.phone,
      customerPhone: customers.phone
      // telefone do cliente (original)
    }).from(broadcastMembersSent).leftJoin(customers, (0, import_drizzle_orm14.eq)(broadcastMembersSent.customerId, customers.id)).where(
      (0, import_drizzle_orm14.and)(
        (0, import_drizzle_orm14.eq)(broadcastMembersSent.broadcastMessageId, messageId),
        (0, import_drizzle_orm14.eq)(broadcastMembersSent.status, "pending")
      )
    );
    if (pendingSents.length === 0) {
      console.log(`[Broadcast] Nenhum pendente para mensagem ${messageId}`);
      return;
    }
    console.log(
      `[Broadcast] Processando ${pendingSents.length} envios pendentes para mensagem ${messageId}`
    );
    let successCount = 0;
    let failCount = 0;
    for (const sent of pendingSents) {
      const targetPhone = sent.customerPhone || sent.phone;
      const fileAttachment = resolvedFileUrl ? {
        url: resolvedFileUrl,
        name: message2.fileName || "arquivo",
        type: message2.fileType || "application/octet-stream",
        size: message2.fileSize || 0
      } : void 0;
      const result = await sendWhatsAppMessageWithRetry(
        targetPhone,
        message2.messageText,
        fileAttachment
      );
      if (result.success) {
        await db.update(broadcastMembersSent).set({
          status: "sent",
          sentAt: /* @__PURE__ */ new Date(),
          errorMessage: null
        }).where((0, import_drizzle_orm14.eq)(broadcastMembersSent.id, sent.id));
        try {
          await saveBroadcastToConversation(db, sent.customerId, message2.messageText, resolvedFileUrl, message2.fileName, message2.fileType, message2.senderId);
        } catch (saveErr) {
          console.warn(`[Broadcast] \u26A0\uFE0F Erro ao salvar na conversa do cliente ${sent.customerId}:`, saveErr.message);
        }
        successCount++;
      } else {
        await db.update(broadcastMembersSent).set({
          status: "failed",
          errorMessage: result.error || "Erro desconhecido",
          sentAt: null
        }).where((0, import_drizzle_orm14.eq)(broadcastMembersSent.id, sent.id));
        failCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await db.update(broadcastMessages).set({
      successfulSends: successCount,
      failedSends: failCount,
      status: successCount > 0 && failCount === 0 ? "completed" : "partial"
    }).where((0, import_drizzle_orm14.eq)(broadcastMessages.id, messageId));
    console.log(
      `[Broadcast] Mensagem ${messageId} processada: ${successCount} sucessos, ${failCount} falhas`
    );
  } catch (err) {
    console.error(
      `[Broadcast] Erro ao processar mensagem ${messageId}:`,
      err
    );
  }
}
async function saveBroadcastToConversation(db, customerId, messageText, fileUrl, fileName, fileType, senderId) {
  if (!customerId) return;
  const now = /* @__PURE__ */ new Date();
  const [customer2] = await db.select().from(customers).where((0, import_drizzle_orm14.eq)(customers.id, customerId)).limit(1);
  if (!customer2?.phone) {
    console.warn(`[Broadcast] Cliente ${customerId} sem telefone, n\xE3o pode salvar na conversa`);
    return;
  }
  const found = await findConversationByPhone(db, customer2.phone, conversations, customers);
  let conversationId2;
  if (found) {
    conversationId2 = found.conversationId;
    if (found.status === "closed") {
      await db.update(conversations).set({ status: "open", lastMessageAt: now, unreadCount: 0 }).where((0, import_drizzle_orm14.eq)(conversations.id, conversationId2));
      console.log(`[Broadcast] \u{1F504} Reabriu conversa ${conversationId2}`);
    } else {
      await db.update(conversations).set({ lastMessageAt: now }).where((0, import_drizzle_orm14.eq)(conversations.id, conversationId2));
    }
  } else {
    const insertResult = await db.insert(conversations).values({
      customerId,
      customerName: customer2?.name || "",
      customerPhone: customer2?.phone || "",
      channel: "whatsapp",
      status: "open",
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 0
    });
    const rawId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId;
    conversationId2 = Number(rawId);
    console.log(`[Broadcast] \u{1F195} Criou conversa ${conversationId2}`);
  }
  if (!conversationId2) return;
  await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    senderId: senderId || null,
    senderType: "agent",
    content: messageText || "",
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    fileType: fileType || null,
    createdAt: now
  });
  console.log(`[Broadcast] \u{1F4AC} Mensagem salva na conversa ${conversationId2} do cliente ${customerId}`);
}
var import_drizzle_orm14, mimetypeToMediatype;
var init_broadcast_sender = __esm({
  "server/workers/broadcast-sender.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm14 = require("drizzle-orm");
    init_phone();
    init_cache_evolution();
    mimetypeToMediatype = {
      "image/jpeg": "image",
      "image/png": "image",
      "image/gif": "image",
      "image/webp": "image",
      "video/mp4": "video",
      "video/quicktime": "video",
      "application/pdf": "document",
      "application/msword": "document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
      "application/vnd.ms-excel": "document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
      "audio/mpeg": "audio",
      "audio/ogg": "audio",
      "audio/wav": "audio"
    };
  }
});

// server/services/profile-pic.ts
var profile_pic_exports = {};
__export(profile_pic_exports, {
  downloadAndUploadProfilePic: () => downloadAndUploadProfilePic,
  getCustomerInitials: () => getCustomerInitials
});
function getCustomerInitials(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length >= 4) return cleanPhone.slice(-4);
  return "USR";
}
async function getEvolutionConfig() {
  try {
    const { integrationSettings: integrationSettings4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select().from(integrationSettings4).where((0, import_drizzle_orm16.eq)(integrationSettings4.integrationType, "evolution_api")).limit(1);
    if (!row) return null;
    const cfg = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
    const apiUrl = cfg.apiUrl?.replace(/\/$/, "");
    const apiKey = cfg.apiKey || cfg.accessToken || cfg.token;
    const instanceName = cfg.instanceName || cfg.instance || "Meu";
    if (!apiUrl || !apiKey || !instanceName) return null;
    return { apiUrl, apiKey, instanceName };
  } catch {
    return null;
  }
}
async function fetchProfileFromEvolution(phone) {
  const config = await getEvolutionConfig();
  if (!config) return null;
  const number = phone.replace(/\D/g, "");
  if (!number) return null;
  console.log("[ProfilePic] fetchProfile for", number, "\u2192", config.apiUrl);
  try {
    const res = await fetch(
      `${config.apiUrl}/chat/fetchProfile/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ number }),
        signal: AbortSignal.timeout(2e4)
      }
    );
    if (!res.ok) {
      console.log("[ProfilePic] fetchProfile failed:", res.status);
      return null;
    }
    const data = await res.json();
    console.log("[ProfilePic] fetchProfile response keys:", Object.keys(data));
    const picture = data.profilePicture || data.picture || data.profilePictureUrl || null;
    if (!picture) return null;
    const result = {};
    if (picture.startsWith("data:")) {
      result.pictureBase64 = picture;
    } else if (picture.startsWith("http")) {
      result.pictureUrl = picture;
    }
    if (data.name) result.name = data.name;
    if (data.pushName) result.pushName = data.pushName;
    return result;
  } catch (err) {
    console.error("[ProfilePic] fetchProfile error:", err);
    return null;
  }
}
async function downloadViaEvolutionProxy(url) {
  const config = await getEvolutionConfig();
  if (!config) {
    console.error("[ProfilePic] \u274C No Evolution config available");
    return null;
  }
  console.log(
    "[ProfilePic] Downloading WhatsApp CDN URL via Evolution proxy:",
    url.substring(0, 80)
  );
  try {
    const proxyUrl = `${config.apiUrl}/chat/getBase64FromMediaMessage/${config.instanceName}`;
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          key: {
            remoteJid: "status@broadcast",
            fromMe: false
          },
          message: {
            imageMessage: {
              url
            }
          }
        }
      }),
      signal: AbortSignal.timeout(3e4)
    });
    if (!res.ok) {
      console.log("[ProfilePic] \u274C Proxy request failed:", res.status);
      return null;
    }
    const data = await res.json();
    const pic = data?.base64 || data?.picture || data?.profilePicture || null;
    if (pic && pic.startsWith("data:")) {
      const match = pic.match(/^data:([^;]+);base64,(.*)$/s);
      if (match && match[2]) {
        const buf = Buffer.from(match[2], "base64");
        if (buf.length > 100) {
          console.log("[ProfilePic] \u2705 Got base64 from Evolution proxy:", buf.length, "bytes");
          return buf;
        }
      }
    } else if (pic && !pic.startsWith("data:")) {
      const buf = Buffer.from(pic, "base64");
      if (buf.length > 100) {
        console.log("[ProfilePic] \u2705 Got base64 from Evolution proxy (raw):", buf.length, "bytes");
        return buf;
      }
    }
    console.log("[ProfilePic] \u274C No valid base64 in response");
    return null;
  } catch (err) {
    console.error("[ProfilePic] \u274C Evolution proxy error:", err);
    return null;
  }
}
async function uploadProfilePicToR2(buffer, customerId, mimetype = "image/jpeg") {
  try {
    const fileName = `profile-pics/${customerId}-${Date.now()}.jpg`;
    const result = await uploadToR2(buffer, fileName, mimetype);
    if (result?.url) {
      console.log(
        "[ProfilePic] \u2705 R2 upload OK:",
        result.url.substring(0, 80)
      );
      return result.url;
    }
    return null;
  } catch (err) {
    console.error("[ProfilePic] R2 upload failed:", err);
    return null;
  }
}
async function downloadAndUploadProfilePic(phone, customerId) {
  const lockKey = `${phone}:${customerId}`;
  const existing = downloadLocks.get(lockKey);
  if (existing) {
    console.log("[ProfilePic] Download already in progress for", lockKey);
    return existing;
  }
  const promise = _downloadAndUploadProfilePic(phone, customerId).finally(
    () => {
      downloadLocks.delete(lockKey);
    }
  );
  downloadLocks.set(lockKey, promise);
  return promise;
}
async function _downloadAndUploadProfilePic(phone, customerId) {
  try {
    console.log(
      "[ProfilePic] Resolving profile pic for customer",
      customerId,
      "phone:",
      phone
    );
    const profile = await fetchProfileFromEvolution(phone);
    if (!profile) {
      console.log("[ProfilePic] No profile data from Evolution for", phone);
      return null;
    }
    if (profile.name || profile.pushName) {
      try {
        const db2 = await getDb();
        if (db2) {
          await db2.update(customers).set({
            name: profile.name || profile.pushName,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm16.eq)(customers.id, customerId));
        }
      } catch {
      }
    }
    let buffer = null;
    let mimetype = "image/jpeg";
    if (profile.pictureBase64) {
      const match = profile.pictureBase64.match(/^data:([^;]+);base64,(.*)$/s);
      if (match && match[1] && match[2]) {
        mimetype = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(profile.pictureBase64, "base64");
      }
      console.log(
        "[ProfilePic] Got base64 from Evolution:",
        buffer.length,
        "bytes"
      );
    }
    if (!buffer && profile.pictureUrl) {
      console.log(
        "[ProfilePic] Downloading WhatsApp CDN URL via Evolution proxy..."
      );
      buffer = await downloadViaEvolutionProxy(profile.pictureUrl);
    }
    if (!buffer || buffer.length < 100) {
      console.log(
        "[ProfilePic] \u274C Could not resolve profile pic bytes for",
        phone
      );
      return null;
    }
    console.log(
      "[ProfilePic] Downloaded",
      buffer.length,
      "bytes for customer",
      customerId
    );
    const r2Url = await uploadProfilePicToR2(buffer, customerId, mimetype);
    if (!r2Url) return null;
    const db = await getDb();
    if (db) {
      await db.update(customers).set({ photoUrl: r2Url, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm16.eq)(customers.id, customerId));
      await db.update(receivedMessages).set({ fromProfilePic: r2Url }).where((0, import_drizzle_orm16.eq)(receivedMessages.customerId, customerId));
      console.log(
        "[ProfilePic] \u2705 DB updated for customer",
        customerId,
        "\u2192",
        r2Url.substring(0, 60)
      );
    }
    return r2Url;
  } catch (err) {
    console.error("[ProfilePic] Error for customer", customerId, ":", err);
    return null;
  }
}
var import_drizzle_orm16, downloadLocks;
var init_profile_pic = __esm({
  "server/services/profile-pic.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm16 = require("drizzle-orm");
    init_r2_client();
    downloadLocks = /* @__PURE__ */ new Map();
  }
});

// server/routers-business-hours.ts
async function checkBusinessHours(date2 = /* @__PURE__ */ new Date()) {
  const dayOfWeek = date2.getDay();
  const timeStr = date2.toTimeString().slice(0, 5);
  const dayMap = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday"
  };
  const dayKey = dayMap[dayOfWeek];
  const dateStr = date2.toISOString().split("T")[0];
  const holiday = [...defaultHolidays2026, ...holidaysCache].find((h) => h.date === dateStr && h.enabled);
  if (holiday && dayKey && daySchedulesCache[dayKey]?.enabled) {
    const holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
    const holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
    const isOpen2 = timeStr >= holidayOpen && timeStr < holidayClose;
    return {
      isOpen: isOpen2,
      schedule: { openTime: holidayOpen, closeTime: holidayClose },
      holidayName: holiday.name
    };
  }
  if (!dayKey) {
    return { isOpen: false };
  }
  const schedule = daySchedulesCache[dayKey];
  const isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;
  return {
    isOpen,
    schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime }
  };
}
var import_zod9, daySchedulesCache, holidaysCache, defaultHolidays2026, DayScheduleInput, HolidayInput, businessHoursRouter;
var init_routers_business_hours = __esm({
  "server/routers-business-hours.ts"() {
    "use strict";
    import_zod9 = require("zod");
    init_trpc();
    daySchedulesCache = {
      monday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      tuesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      wednesday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      thursday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      friday: { enabled: true, openTime: "08:00", closeTime: "18:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      saturday: { enabled: true, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" },
      sunday: { enabled: false, openTime: "08:00", closeTime: "12:00", holidayOpenTime: "08:00", holidayCloseTime: "12:00" }
    };
    holidaysCache = [];
    defaultHolidays2026 = [
      { date: "2026-01-01", name: "Confraterniza\xE7\xE3o Universal", type: "national", enabled: true },
      { date: "2026-02-17", name: "Carnaval", type: "national", enabled: true },
      { date: "2026-04-03", name: "Paix\xE3o de Cristo", type: "national", enabled: true },
      { date: "2026-04-21", name: "Tiradentes", type: "national", enabled: true },
      { date: "2026-05-01", name: "Dia do Trabalho", type: "national", enabled: true },
      { date: "2026-09-07", name: "Independ\xEAncia do Brasil", type: "national", enabled: true },
      { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", enabled: true },
      { date: "2026-11-02", name: "Finados", type: "national", enabled: true },
      { date: "2026-11-15", name: "Proclama\xE7\xE3o da Rep\xFAblica", type: "national", enabled: true },
      { date: "2026-11-20", name: "Dia da Consci\xEAncia Negra", type: "national", enabled: true },
      { date: "2026-12-25", name: "Natal", type: "national", enabled: true }
    ];
    DayScheduleInput = import_zod9.z.object({
      day: import_zod9.z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
      enabled: import_zod9.z.boolean().default(true),
      openTime: import_zod9.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closeTime: import_zod9.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      holidayOpenTime: import_zod9.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      holidayCloseTime: import_zod9.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    });
    HolidayInput = import_zod9.z.object({
      date: import_zod9.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      // YYYY-MM-DD
      name: import_zod9.z.string().min(1),
      type: import_zod9.z.enum(["national", "municipal", "state"]),
      enabled: import_zod9.z.boolean().default(true)
    });
    businessHoursRouter = router({
      // Get all day schedules
      getAll: protectedProcedure.query(async () => {
        return Object.entries(daySchedulesCache).map(([day, s]) => ({
          day,
          ...s
        }));
      }),
      // Update day schedule
      update: protectedProcedure.input(DayScheduleInput).mutation(async ({ input }) => {
        daySchedulesCache[input.day] = {
          enabled: input.enabled,
          openTime: input.openTime,
          closeTime: input.closeTime,
          holidayOpenTime: input.holidayOpenTime || "08:00",
          holidayCloseTime: input.holidayCloseTime || "12:00"
        };
        return { success: true };
      }),
      // Check if currently within business hours
      checkNow: protectedProcedure.input(import_zod9.z.object({ date: import_zod9.z.string().optional() }).optional()).query(async ({ input }) => {
        const now = input?.date ? new Date(input.date) : /* @__PURE__ */ new Date();
        const dayOfWeek = now.getDay();
        const timeStr = now.toTimeString().slice(0, 5);
        const dayMap = {
          0: "sunday",
          1: "monday",
          2: "tuesday",
          3: "wednesday",
          4: "thursday",
          5: "friday",
          6: "saturday"
        };
        const dayKey = dayMap[dayOfWeek];
        const dateStr = now.toISOString().split("T")[0];
        const holiday = holidaysCache.find((h) => h.date === dateStr && h.enabled);
        if (holiday && dayKey && daySchedulesCache[dayKey]?.enabled) {
          const holidayOpen = daySchedulesCache[dayKey].holidayOpenTime || "08:00";
          const holidayClose = daySchedulesCache[dayKey].holidayCloseTime || "12:00";
          const isOpen2 = timeStr >= holidayOpen && timeStr < holidayClose;
          return {
            isBusinessHours: isOpen2,
            isOpen: isOpen2,
            type: "holiday",
            holidayName: holiday.name,
            schedule: { openTime: holidayOpen, closeTime: holidayClose },
            currentTime: timeStr
          };
        }
        if (!dayKey) {
          return {
            isBusinessHours: false,
            isOpen: false,
            type: "error",
            schedule: null,
            currentTime: timeStr
          };
        }
        const schedule = daySchedulesCache[dayKey];
        const isOpen = schedule.enabled && timeStr >= schedule.openTime && timeStr < schedule.closeTime;
        return {
          isBusinessHours: schedule.enabled && isOpen,
          isOpen,
          type: "regular",
          schedule: { openTime: schedule.openTime, closeTime: schedule.closeTime },
          currentTime: timeStr
        };
      }),
      // List holidays
      getHolidays: protectedProcedure.input(import_zod9.z.object({ year: import_zod9.z.number().optional() }).optional()).query(async () => {
        const merged = [...defaultHolidays2026, ...holidaysCache];
        const seen = /* @__PURE__ */ new Set();
        return merged.filter((h) => {
          if (seen.has(h.date)) return false;
          seen.add(h.date);
          return true;
        });
      }),
      // Add/Update holiday
      upsertHoliday: protectedProcedure.input(HolidayInput).mutation(async ({ input }) => {
        const existingIndex = holidaysCache.findIndex((h) => h.date === input.date);
        if (existingIndex >= 0) {
          holidaysCache[existingIndex] = input;
        } else {
          holidaysCache.push(input);
        }
        return { success: true };
      }),
      // Delete holiday
      deleteHoliday: protectedProcedure.input(import_zod9.z.object({ date: import_zod9.z.string() })).mutation(async ({ input }) => {
        holidaysCache = holidaysCache.filter((h) => h.date !== input.date);
        return { success: true };
      })
    });
  }
});

// server/flow-engine.ts
var flow_engine_exports = {};
__export(flow_engine_exports, {
  executeVisualFlow: () => executeVisualFlow,
  findAndExecuteFlowForTrigger: () => findAndExecuteFlowForTrigger,
  processPendingMessages: () => processPendingMessages,
  startFlowEngine: () => startFlowEngine
});
async function processPendingMessages() {
  const db = await getDb();
  if (!db) return;
  const pending = await db.select().from(receivedMessages).where(
    (0, import_drizzle_orm17.and)(
      (0, import_drizzle_orm17.eq)(receivedMessages.processed, 0),
      // Skip survey ratings (1-5) so chatbot can process them
      import_drizzle_orm17.sql`NOT (
          ${receivedMessages.messageType} = 'text'
          AND TRIM(COALESCE(${receivedMessages.messageText}, '')) IN ('1','2','3','4','5')
        )`
    )
  ).limit(10);
  for (const message2 of pending) {
    try {
      await processMessage(message2);
    } catch (error) {
      console.error(
        `[Flow Engine] Error processing message ${message2.id}:`,
        error
      );
    }
  }
}
async function processMessage(message2) {
  const db = await getDb();
  if (!db) return;
  const customer2 = await findOrCreateCustomerByPhone(
    message2.fromNumber,
    message2.fromName
  );
  try {
    const { ingestInboundConversationMessage: ingestInboundConversationMessage2 } = await Promise.resolve().then(() => (init_db_messages(), db_messages_exports));
    await ingestInboundConversationMessage2({
      provider: message2.provider,
      fromNumber: message2.fromNumber,
      fromName: message2.fromName,
      messageType: message2.messageType,
      messageText: message2.messageText,
      caption: message2.caption,
      mediaUrl: message2.mediaUrl,
      mimeType: message2.mimeType,
      createdAt: message2.timestamp ? new Date(message2.timestamp * 1e3) : /* @__PURE__ */ new Date()
    });
  } catch (ingestErr) {
    console.error(`[Flow Engine] Failed to ingest message:`, ingestErr);
  }
  const visualFlowsList = await db.select().from(visualFlows).where((0, import_drizzle_orm17.and)((0, import_drizzle_orm17.eq)(visualFlows.isActive, 1))).orderBy((0, import_drizzle_orm17.desc)(visualFlows.updatedAt));
  let matchedVisualFlow = null;
  for (const flow of visualFlowsList) {
    try {
      const flowData = JSON.parse(flow.flowData || "{}");
      const triggerNodes = flowData.nodes?.filter(
        (n) => n.type === "trigger"
      );
      if (triggerNodes && triggerNodes.length > 0) {
        for (const triggerNode of triggerNodes) {
          if (matchesVisualFlowTrigger(message2, triggerNode)) {
            matchedVisualFlow = flow;
            break;
          }
        }
      }
      if (matchedVisualFlow) break;
    } catch (e) {
      console.error(`[Flow Engine] Error parsing visual flow ${flow.id}:`, e);
    }
  }
  if (matchedVisualFlow) {
    try {
      await executeVisualFlow(message2, matchedVisualFlow.id, customer2);
      await markMessageAsProcessed(message2.id, {
        customerId: customer2.id
      });
      return;
    } catch (error) {
      console.error(`[Flow Engine] Error executing visual flow:`, error);
    }
  }
  const flows = await db.select().from(automationFlows).where(
    (0, import_drizzle_orm17.and)(
      (0, import_drizzle_orm17.eq)(automationFlows.isActive, 1),
      (0, import_drizzle_orm17.eq)(automationFlows.channel, message2.provider)
    )
  );
  let matchedFlow = null;
  for (const flow of flows) {
    if (matchesTrigger(message2, flow)) {
      matchedFlow = flow;
      break;
    }
  }
  if (matchedFlow) {
    console.log(
      `[Flow Engine] Message matched flow: ${matchedFlow.name} (ID: ${matchedFlow.id})`
    );
    if (!matchedFlow.id) {
      console.error(`[Flow Engine] Flow ID is invalid, skipping update`);
      return;
    }
    await executeSimpleFlow(message2, matchedFlow, customer2);
    await markMessageAsProcessed(message2.id, {
      customerId: customer2.id,
      automationFlowId: matchedFlow.id
    });
  } else {
    await markMessageAsProcessed(message2.id, {
      customerId: customer2.id
    });
  }
}
function matchesVisualFlowTrigger(message2, triggerNode) {
  const config = triggerNode.data?.config || {};
  const triggerType = config.event || "message_received";
  const messageText = message2.messageText?.toLowerCase() || "";
  console.log(`[Flow Engine] Message text: ${messageText?.substring(0, 50)}`);
  if (triggerType === "message_received") {
    return true;
  }
  if (!triggerType) {
    return true;
  }
  if (config.condition) {
    try {
      const conditionResult = evaluateTriggerCondition(
        config.condition,
        message2
      );
      return conditionResult;
    } catch (error) {
      console.error(`[Flow Engine] Condition evaluation error:`, error);
      return false;
    }
  }
  return true;
}
function evaluateTriggerCondition(condition, message2) {
  const messageText = message2.messageText?.toLowerCase() || "";
  const messageType2 = message2.messageType || "text";
  if (condition.includes("message_type")) {
    if (condition.includes("call") || condition.includes("video")) {
      return messageType2 === "call" || messageType2 === "video";
    }
  }
  if (condition.includes("close_reason")) {
    const expectedReason = condition.split("==")[1]?.trim().replace(/"/g, "");
    const actualReason = message2.closeReason || message2.close_reason || "";
    return actualReason === expectedReason;
  }
  if (condition.includes("message_text")) {
    const expectedText = condition.split("==")[1]?.trim().replace(/"/g, "").replace(/'/g, "");
    return messageText.includes(expectedText.toLowerCase());
  }
  return true;
}
function matchesTrigger(message2, flow) {
  const trigger = flow.trigger?.toLowerCase() || "";
  const messageText = message2.messageText?.toLowerCase() || "";
  if (trigger && messageText.includes(trigger)) {
    return true;
  }
  if (!trigger || trigger === "*" || trigger === "all") {
    return true;
  }
  return false;
}
async function executeSimpleFlow(message2, flow, customer2) {
  const response = flow.response || "Obrigado pela sua mensagem!";
  const processedResponse = replaceVariables(response, {
    customer: customer2,
    message: message2
  });
  if (message2.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message2.fromNumber,
      message: processedResponse,
      replyToMessageId: message2.externalId
    });
  } else if (message2.provider === "instagram") {
    await sendInstagramMessage({
      to: message2.fromNumber,
      message: processedResponse
    });
  }
}
async function findAndExecuteFlowForTrigger(fromNumber, customer2, conversationId2) {
  const db = await getDb();
  if (!db) return;
  const activeFlows = await db.select().from(visualFlows).where((0, import_drizzle_orm17.eq)(visualFlows.isActive, true)).limit(10);
  if (activeFlows.length === 0) {
    console.log("[Flow Engine] No active flows found");
    return;
  }
  for (const flow of activeFlows) {
    try {
      const parsedFlowData = JSON.parse(flow.flowData || "{}");
      const nodes = parsedFlowData.nodes || [];
      const edges = parsedFlowData.edges || [];
      const message2 = {
        from: fromNumber,
        provider: "whatsapp",
        nome: customer2.name,
        mensagem: "",
        origem: "whatsapp"
      };
      const customerContext = {
        id: customer2.id,
        name: customer2.name,
        phone: customer2.phone
      };
      await executeFlowFromTrigger(nodes, edges, customerContext, message2);
      console.log("[Flow Engine] Flow executed:", flow.id);
    } catch (err) {
      console.error("[Flow Engine] Error executing flow", flow.id, ":", err);
    }
  }
}
async function executeVisualFlow(message2, flowId, customer2) {
  const db = await getDb();
  if (!db) return;
  const flowData = await db.select().from(visualFlows).where((0, import_drizzle_orm17.eq)(visualFlows.id, flowId)).limit(1);
  if (flowData.length === 0) {
    console.error(`[Flow Engine] Visual flow ${flowId} not found`);
    return;
  }
  const flow = flowData[0];
  const parsedFlowData = JSON.parse(flow.flowData || "{}");
  const nodes = parsedFlowData.nodes || [];
  const edges = parsedFlowData.edges || [];
  let agentName = null;
  const [activeConversation] = await db.select().from(conversations).where(
    (0, import_drizzle_orm17.and)(
      (0, import_drizzle_orm17.eq)(conversations.customerId, customer2.id),
      (0, import_drizzle_orm17.eq)(conversations.status, "assigned")
    )
  ).orderBy((0, import_drizzle_orm17.desc)(conversations.lastMessageAt)).limit(1);
  if (activeConversation?.assignedTo) {
    const [agent] = await db.select().from(users).where((0, import_drizzle_orm17.eq)(users.id, activeConversation.assignedTo)).limit(1);
    if (agent) {
      agentName = agent.name;
    }
  }
  const context = {
    message: {
      text: message2.messageText || message2.caption || "",
      type: message2.messageType || "text",
      from: message2.fromNumber,
      provider: message2.provider
    },
    customer: {
      id: customer2.id,
      name: customer2.name,
      phone: customer2.phone
    },
    agent_name: agentName,
    assignedTo: activeConversation?.assignedTo,
    variables: {}
  };
  await executeFlowFromTrigger(nodes, edges, context, message2);
}
function inferNodeTypeFromLabel(label) {
  if (!label) return null;
  const labelLower = label.toLowerCase();
  if (labelLower.includes("gatilho") || labelLower.includes("trigger") || labelLower.includes("nova mensagem")) {
    return "trigger";
  }
  if (labelLower.includes("condi\xE7ao") || labelLower.includes("condicao") || labelLower.includes("if") || labelLower.includes("se")) {
    return "condition";
  }
  if (labelLower.includes("filtro") || labelLower.includes("filter")) {
    return "filter";
  }
  if (labelLower.includes("mensagem") || labelLower.includes("message") || labelLower.includes("responder") || labelLower.includes("enviar")) {
    return "message";
  }
  if (labelLower.includes("switch") || labelLower.includes("casos") || labelLower.includes("cases")) {
    return "switch";
  }
  if (labelLower.includes("esperar") || labelLower.includes("wait") || labelLower.includes("pausa")) {
    return "wait";
  }
  if (labelLower.includes("variavel") || labelLower.includes("set") || labelLower.includes("definir")) {
    return "setVariable";
  }
  if (labelLower.includes("http") || labelLower.includes("api") || labelLower.includes("webhook")) {
    return "httpRequest";
  }
  if (labelLower.includes("transferir") || labelLower.includes("atendente") || labelLower.includes("human")) {
    return "transferHuman";
  }
  if (labelLower.includes("ticket") || labelLower.includes("chamado")) {
    return "createTicket";
  }
  if (labelLower.includes("ura") || labelLower.includes("menu") || labelLower.includes("opcoes")) {
    return "uraMenu";
  }
  if (labelLower.includes("ia") || labelLower.includes("ai") || labelLower.includes("assistente")) {
    return "aiAssistant";
  }
  if (labelLower.includes("funcao") || labelLower.includes("function") || labelLower.includes("acao")) {
    return "function";
  }
  if (labelLower.includes("notificar") || labelLower.includes("notify") || labelLower.includes("avisar")) {
    return "notify";
  }
  if (labelLower.includes("tag") || labelLower.includes("etiqueta")) {
    return "add_tag";
  }
  if (labelLower.includes("atribuir") || labelLower.includes("assign") || labelLower.includes("agente")) {
    return "assign_agent";
  }
  if (labelLower.includes("contato") || labelLower.includes("contact")) {
    return "create_contact";
  }
  if (labelLower.includes("tarefa") || labelLower.includes("task")) {
    return "create_task";
  }
  if (labelLower.includes("email") || labelLower.includes("e-mail")) {
    return "email-send";
  }
  if (labelLower.includes("horario") || labelLower.includes("business")) {
    return "if-business-hours";
  }
  if (labelLower.includes("bem-vindo") || labelLower.includes("welcome")) {
    return "welcome-agent";
  }
  if (labelLower.includes("receita") || labelLower.includes("prescription")) {
    return "check-prescription";
  }
  if (labelLower.includes("pix") || labelLower.includes("pagamento")) {
    return "pix-confirmation";
  }
  if (labelLower.includes("atendimento")) {
    return "attendance-create";
  }
  return null;
}
async function executeFlowFromTrigger(nodes, edges, context, message2) {
  let triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    const triggerNodeFallback = nodes.find((n) => {
      const inferredType = inferNodeTypeFromLabel(n.data?.label);
      if (inferredType === "trigger") {
        n.type = inferredType;
        return true;
      }
      return n.type === "default" && (n.data?.label?.toLowerCase().includes("nova mensagem") || n.data?.label?.toLowerCase().includes("trigger"));
    });
    if (triggerNodeFallback) {
      triggerNodeFallback.type = triggerNodeFallback.type || "trigger";
      triggerNode = triggerNodeFallback;
    }
  }
  if (!triggerNode) {
    console.error(`[Chatbot Flow] No trigger node found`);
    return;
  }
  await executeNodeWithEdges(triggerNode, nodes, edges, context, message2);
}
function sanitizeNodeType(nodeType) {
  if (VALID_NODE_TYPES.has(nodeType)) return nodeType;
  const mappings = {
    "http_request": "httpRequest",
    "http-request": "httpRequest",
    "set_variable": "setVariable",
    "set-variable": "setVariable",
    "create_ticket": "createTicket",
    "create-ticket": "createTicket",
    "transfer_human": "transferHuman",
    "transfer-human": "transferHuman",
    "ai_assistant": "aiAssistant",
    "ai-assistant": "aiAssistant",
    "ura_menu": "uraMenu",
    "ura-menu": "uraMenu",
    "add_tag": "add_tag",
    "add-tag": "add_tag",
    "assign_agent": "assign_agent",
    "assign-agent": "assign_agent",
    "create_contact": "create_contact",
    "create-contact": "create_contact",
    "create_task": "create_task",
    "create-task": "create_task",
    "whatsapp_send": "whatsapp-send",
    "email_send": "email-send",
    "pix_confirmation": "pix-confirmation",
    "check_prescription": "check-prescription",
    "attendance_create": "attendance-create",
    // Template node types (visual editor) - FIXED MAPPINGS
    "webhook-trigger": "trigger",
    "if-node": "if-else",
    "if-business-hours": "if-business-hours",
    "welcome-agent": "welcome-agent",
    "http-request-node": "httpRequest",
    "set-node": "setVariable",
    "switch-node": "switch",
    "filter-node": "filter",
    "merge-node": "setVariable",
    // Merge as set variable (combine data)
    "wait-node": "wait",
    "error-handler-node": "customNode",
    // Visual only, no execution
    "code-node": "function",
    "split-batches-node": "customNode",
    // Visual only
    "aggregate-node": "setVariable",
    // Aggregate as set
    "csv-parse-node": "customNode",
    // Visual only
    "datetime-node": "setVariable",
    // Set variables with dates
    "email-send-node": "email-send",
    "execute-workflow-node": "customNode",
    // Visual only
    "summarize-node": "setVariable",
    // Summarize and set
    "sort-node": "setVariable",
    // Sort and set
    "limit-node": "setVariable",
    // Limit and set
    "remove-duplicates-node": "setVariable",
    // Remove dupes and set
    "sticky-note-node": "customNode",
    // Visual only
    "schedule-trigger": "trigger"
  };
  return mappings[nodeType] || nodeType;
}
async function executeNodeWithEdges(node, nodes, edges, context, message2) {
  const rawType = node.type || "customNode";
  const nodeType = node.data?.nodeType;
  if (rawType === "customNode" || rawType === "default") {
    const inferredType = inferNodeTypeFromLabel(node.data?.label);
    if (inferredType) {
      node.type = sanitizeNodeType(inferredType);
    } else if (nodeType) {
      node.type = sanitizeNodeType(nodeType);
    } else {
      node.type = sanitizeNodeType(rawType);
    }
  } else {
    node.type = sanitizeNodeType(rawType);
  }
  if (!VALID_NODE_TYPES.has(node.type)) {
    console.warn(
      `[Flow Engine] SKIPPING unknown node type: "${rawType}" (label: ${node.data?.label || node.id}). Valid types: ${Array.from(VALID_NODE_TYPES).join(", ")}`
    );
    const outgoingEdges2 = edges.filter((e) => e.source === node.id);
    for (const edge of outgoingEdges2) {
      const nextNode = nodes.find((n) => n.id === edge.target);
      if (nextNode) await executeNodeWithEdges(nextNode, nodes, edges, context, message2);
    }
    return;
  }
  console.log(
    `[Chatbot Flow] Executing node: ${node.data?.label || node.id} (${node.type})`
  );
  const config = node.data?.config || {};
  let conditionResult = null;
  switch (node.type) {
    case "trigger":
      break;
    case "condition":
    case "filter":
    case "switch":
    case "if-else":
      conditionResult = evaluateConditionNode(config, context);
      break;
    case "message":
      const messageText = replaceVariables(config.message || "", context);
      console.log(
        `[Chatbot Flow] Sending message: "${messageText.substring(0, 50)}..."`
      );
      if (message2.provider === "whatsapp") {
        await sendWhatsAppMessage({
          to: message2.fromNumber,
          message: messageText
        });
      } else if (message2.provider === "instagram") {
        await sendInstagramMessage({
          to: message2.fromNumber,
          message: messageText
        });
      }
      if (config.terminal || isTerminalMessage(node)) {
        return;
      }
      break;
    case "function":
      if (config.function === "get_greeting") {
        const hour = (/* @__PURE__ */ new Date()).getHours();
        let greeting = "Bom dia";
        if (hour >= 12 && hour < 18) greeting = "Boa tarde";
        else if (hour >= 18) greeting = "Boa noite";
        context.greeting = greeting;
        context.agent_name = context.agent_name || "Atendente";
      }
      break;
    case "aiAssistant":
      await executeAIAssistantNode(config, context, message2);
      break;
    case "transfer":
    case "transferHuman":
      await executeTransferHumanNode(config, context, message2);
      return;
    case "createTicket":
      await executeCreateTicketNode(config, context, message2);
      break;
    case "wait":
      console.log(`[Flow Engine] Wait node: ${JSON.stringify(config)}`);
      const delay = config.delay || config.duration || 1e3;
      await new Promise((resolve) => setTimeout(resolve, delay));
      break;
    case "setVariable":
      executeSetVariableNode(config, context);
      break;
    case "httpRequest":
      await executeHttpRequestNode(config, context);
      break;
    case "uraMenu":
      await executeURAMenuNode(config, context, message2);
      return;
    // ===== BUSINESS HOURS NODE =====
    case "if-business-hours":
      conditionResult = await executeBusinessHoursNode(context, config);
      break;
    // ===== WELCOME AGENT NODE =====
    case "welcome-agent":
      await executeWelcomeAgentNode(config, context, message2);
      break;
    // ===== PHARMACY-SPECIFIC NODES =====
    case "check-prescription":
      await executeCheckPrescriptionNode(config, context, message2);
      break;
    case "pix-confirmation":
      await executePixConfirmationNode(config, context, message2);
      break;
    case "attendance-create":
      await executeAttendanceCreateNode(config, context, message2);
      break;
    // ===== ACTION NODES =====
    case "notify":
      await executeNotifyNode(config, context, message2);
      break;
    case "add_tag":
      await executeAddTagNode(config, context, message2);
      break;
    case "assign_agent":
      await executeAssignAgentNode(config, context, message2);
      break;
    case "create_contact":
      await executeCreateContactNode(config, context, message2);
      break;
    case "create_task":
      await executeCreateTaskNode(config, context, message2);
      break;
    case "http-request":
      await executeHttpRequestNode(config, context);
      break;
    case "email-send":
      console.log(`[Flow Engine] Email to: ${config.to}, subject: ${config.subject}`);
      break;
    case "whatsapp-send":
      const waBody = replaceVariables(config.body || config.message || "", context);
      if (message2.provider === "whatsapp") {
        await sendWhatsAppMessage({ to: message2.fromNumber, message: waBody });
      } else if (message2.provider === "instagram") {
        await sendInstagramMessage({ to: message2.fromNumber, message: waBody });
      }
      break;
    // ===== NEW VISUAL EDITOR NODE HANDLERS =====
    case "if-node":
    case "if-else":
      conditionResult = evaluateConditionNode(config, context);
      break;
    case "set-node":
    case "setVariable":
      executeSetVariableNode(config, context);
      break;
    case "http-request-node":
    case "httpRequest":
      await executeHttpRequestNode(config, context, message2);
      break;
    case "switch-node":
    case "switch":
      await executeSwitchNode(config, context, edges, node.id, nodes);
      break;
    case "filter-node":
    case "filter":
      conditionResult = evaluateConditionNode(config, context);
      break;
    case "datetime-node":
    case "setVariable":
      executeDatetimeNode(config, context);
      break;
    case "email-send-node":
    case "email-send":
      console.log(`[Flow Engine] Email to: ${config.to}, subject: ${config.subject}`);
      break;
    case "merge-node":
      console.log(`[Flow Engine] Merge node`);
      break;
    case "wait-node":
      const waitDelay = config.delay || config.duration || 1e3;
      await new Promise((resolve) => setTimeout(resolve, waitDelay));
      break;
    case "error-handler-node":
      console.log(`[Flow Engine] Error handler`);
      context.lastError = config.errorMessage || null;
      break;
    case "code-node":
      console.log(`[Flow Engine] Code node`);
      break;
    case "split-batches-node":
      console.log(`[Flow Engine] Split batches`);
      break;
    case "aggregate-node":
      console.log(`[Flow Engine] Aggregate`);
      break;
    case "csv-parse-node":
      console.log(`[Flow Engine] CSV parse`);
      break;
    case "execute-workflow-node":
      console.log(`[Flow Engine] Execute workflow`);
      break;
    case "summarize-node":
      console.log(`[Flow Engine] Summarize`);
      break;
    case "sort-node":
      console.log(`[Flow Engine] Sort`);
      break;
    case "limit-node":
      console.log(`[Flow Engine] Limit`);
      break;
    case "remove-duplicates-node":
      console.log(`[Flow Engine] Remove duplicates`);
      break;
    case "schedule-trigger":
      console.log(`[Flow Engine] Schedule trigger`);
      break;
    case "webhook-trigger":
      console.log(`[Flow Engine] Webhook trigger`);
      break;
    case "customNode":
      console.warn(`[Flow Engine] customNode has no handler - ensure sanitizeNodeType mapped correctly`);
      break;
    default:
      console.warn(`[Flow Engine] Unknown node type: ${node.type} \u2014 skipping`);
  }
  const outgoingEdges = edges.filter((e) => e.source === node.id);
  if (outgoingEdges.length === 0) {
    return;
  }
  if (node.type === "condition" && conditionResult !== null) {
    const trueEdge = outgoingEdges.find(
      (e) => e.label?.toLowerCase() === "sim" || e.sourceHandle === "true" || e.sourceHandle === "0"
    );
    const falseEdge = outgoingEdges.find(
      (e) => e.label?.toLowerCase() === "n\xE3o" || e.label?.toLowerCase() === "nao" || e.sourceHandle === "false" || e.sourceHandle === "1"
    );
    const nextEdge = conditionResult ? trueEdge : falseEdge;
    if (nextEdge) {
      const nextNode = nodes.find((n) => n.id === nextEdge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message2);
      }
    }
  } else {
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await executeNodeWithEdges(nextNode, nodes, edges, context, message2);
      }
    }
  }
}
function evaluateConditionNode(config, context) {
  const condition = config.condition;
  if (!condition) return true;
  if (condition === "working_hours") {
    return checkWorkingHours(config.schedule);
  }
  if (condition === "agent_logged_in") {
    return !!context.agent_name || !!context.assignedTo;
  }
  if (condition.includes("close_reason")) {
    const closeReason = context.close_reason || context.closeReason;
    const expectedReason = condition.split("==")[1]?.trim().replace(/"/g, "");
    return closeReason === expectedReason;
  }
  if (condition.includes("message_type")) {
    const messageType2 = context.message?.type || "text";
    if (condition.includes("call") || condition.includes("video")) {
      return messageType2 === "call" || messageType2 === "video";
    }
  }
  return true;
}
function checkWorkingHours(schedule) {
  const now = /* @__PURE__ */ new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute;
  const monSatStart = schedule?.mon_sat?.start || "08:00";
  const monSatEnd = schedule?.mon_sat?.end || "19:40";
  const sunHolidayStart = schedule?.sun_holiday?.start || "08:00";
  const sunHolidayEnd = schedule?.sun_holiday?.end || "11:40";
  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };
  const isSundayOrHoliday = day === 0;
  if (isSundayOrHoliday) {
    const start = parseTime(sunHolidayStart);
    const end = parseTime(sunHolidayEnd);
    return currentTime >= start && currentTime <= end;
  } else {
    const start = parseTime(monSatStart);
    const end = parseTime(monSatEnd);
    return currentTime >= start && currentTime <= end;
  }
}
function isTerminalMessage(node) {
  const label = (node.data?.label || "").toLowerCase();
  const terminalLabels = [
    "fora de hor\xE1rio",
    "fora de horario",
    "recusar",
    "pesquisa",
    "agradecer",
    "n\xE3o responder",
    "nao responder"
  ];
  return terminalLabels.some((term) => label.includes(term));
}
function replaceVariables(text4, context) {
  return text4.replace(/\{\{([^}]+)\}\}/g, (match, path2) => {
    const parts = path2.trim().split(".");
    let value = context;
    for (const part of parts) {
      value = value?.[part];
      if (value === void 0) break;
    }
    return value !== void 0 ? String(value) : match;
  });
}
async function executeWelcomeAgentNode(config, context, message2) {
  const useAgentName = config.useAgentName !== false;
  const fallbackName = config.fallbackName || "Assistente Virtual";
  const agentName = context.agent_name || (useAgentName ? fallbackName : null);
  let messageText = config.message || "Ol\xE1! Como posso te ajudar?";
  if (agentName) {
    messageText = messageText.replace(/\{\{agent_name\}\}/g, agentName);
  }
  const finalMessage2 = replaceVariables(messageText, context);
  console.log(`[Flow Engine] Welcome Agent message: "${finalMessage2.substring(0, 80)}..."`);
  if (message2.provider === "whatsapp") {
    await sendWhatsAppMessage({ to: message2.fromNumber, message: finalMessage2 });
  } else if (message2.provider === "instagram") {
    await sendInstagramMessage({ to: message2.fromNumber, message: finalMessage2 });
  }
}
async function executeAIAssistantNode(config, context, message2) {
  const systemPrompt = replaceVariables(
    config.systemPrompt || "Voc\xEA \xE9 um assistente prestativo.",
    context
  );
  const userMessage = message2.messageText || "";
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ]
    });
    const aiResponse = typeof response.choices[0].message.content === "string" ? response.choices[0].message.content : JSON.stringify(response.choices[0].message.content);
    if (message2.provider === "whatsapp") {
      await sendWhatsAppMessage({
        to: message2.fromNumber,
        message: aiResponse
      });
    } else if (message2.provider === "instagram") {
      await sendInstagramMessage({
        to: message2.fromNumber,
        message: aiResponse
      });
    }
  } catch (error) {
    console.error("[Flow Engine] AI Assistant error:", error);
  }
}
async function executeTransferHumanNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  const department = config.department || "Suporte";
  const priority = config.priority || "medium";
  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const ticketData = {
    ticketNumber,
    customerId: context.customer.id,
    subject: `Transfer\xEAncia de ${message2.provider}: ${message2.fromNumber}`,
    description: `Mensagem: ${message2.messageText}

Transferido automaticamente para ${department}`,
    status: "open",
    priority,
    channel: message2.provider
  };
  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;
  context.ticket = {
    id: ticketId ?? null,
    ...ticketData
  };
  try {
    const { fireAndForget: fireAndForget2, enqueueCrmOutboxEvent: enqueueCrmOutboxEvent2 } = await Promise.resolve().then(() => (init_crm_core(), crm_core_exports));
    fireAndForget2(async () => {
      await enqueueCrmOutboxEvent2({
        eventName: "TicketCreated",
        entityType: "ticket",
        entityId: ticketId ?? null,
        actorUserId: null,
        payload: {
          source: "flow-engine",
          department,
          channel: message2.provider,
          customerId: context.customer?.id ?? null,
          fromNumber: message2.fromNumber
        }
      });
    });
  } catch {
  }
  const confirmMessage = replaceVariables(
    config.message || "Voc\xEA ser\xE1 atendido por um de nossos agentes em breve.",
    context
  );
  if (message2.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message2.fromNumber,
      message: confirmMessage
    });
  } else if (message2.provider === "instagram") {
    await sendInstagramMessage({
      to: message2.fromNumber,
      message: confirmMessage
    });
  }
}
async function executeCreateTicketNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  const subject = replaceVariables(config.subject || "Novo ticket", context);
  const description = replaceVariables(
    config.description || message2.messageText || "",
    context
  );
  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const ticketData = {
    ticketNumber,
    customerId: context.customer.id,
    subject,
    description,
    status: "open",
    priority: config.priority || "medium",
    channel: message2.provider
  };
  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;
  context.ticket = {
    id: ticketId ?? null,
    ...ticketData
  };
  try {
    const { fireAndForget: fireAndForget2, enqueueCrmOutboxEvent: enqueueCrmOutboxEvent2 } = await Promise.resolve().then(() => (init_crm_core(), crm_core_exports));
    fireAndForget2(async () => {
      await enqueueCrmOutboxEvent2({
        eventName: "TicketCreated",
        entityType: "ticket",
        entityId: ticketId ?? null,
        actorUserId: null,
        payload: {
          source: "flow-engine",
          channel: message2.provider,
          customerId: context.customer?.id ?? null,
          fromNumber: message2.fromNumber,
          subject
        }
      });
    });
  } catch {
  }
}
function executeSetVariableNode(config, context) {
  const variableName = config.variableName || "";
  const variableValue = replaceVariables(config.variableValue || "", context);
  context.variables[variableName] = variableValue;
}
async function executeURAMenuNode(config, context, message2) {
  const menuText = replaceVariables(config.menuText || "", context);
  const options = config.options || [];
  let menuMessage = menuText + "\n\n";
  options.forEach((opt, index) => {
    menuMessage += `${index + 1}. ${opt.label}
`;
  });
  if (message2.provider === "whatsapp") {
    await sendWhatsAppMessage({
      to: message2.fromNumber,
      message: menuMessage
    });
  } else if (message2.provider === "instagram") {
    await sendInstagramMessage({
      to: message2.fromNumber,
      message: menuMessage
    });
  }
}
async function executeCheckPrescriptionNode(config, context, message2) {
  const fileUrl = replaceVariables(config.fileUrl || "", context);
  const aiModel = config.aiModel || "gpt-4";
  console.log(`[Flow Engine] Check Prescription: ${fileUrl}, model: ${aiModel}`);
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Voc\xEA \xE9 um farmac\xEAutico especializado. Analise a receita m\xE9dica e retorne: v\xE1lida ou inv\xE1lida, nome do medicamento, dosagem, e observa\xE7\xF5es."
        },
        {
          role: "user",
          content: `Analise esta receita: ${fileUrl}. Mensagem do cliente: ${message2.messageText || ""}`
        }
      ]
    });
    const result = typeof response.choices[0].message.content === "string" ? response.choices[0].message.content : JSON.stringify(response.choices[0].message.content);
    context.variables.prescriptionResult = result;
    context.variables.prescriptionValid = result.toLowerCase().includes("v\xE1lida");
    const reply = `\u{1F4CB} *An\xE1lise da Receita*

${result}

Um farmac\xEAutico ir\xE1 validar em breve.`;
    if (message2.provider === "whatsapp") {
      await sendWhatsAppMessage({ to: message2.fromNumber, message: reply });
    } else if (message2.provider === "instagram") {
      await sendInstagramMessage({ to: message2.fromNumber, message: reply });
    }
  } catch (error) {
    console.error("[Flow Engine] Check Prescription error:", error);
  }
}
async function executePixConfirmationNode(config, context, message2) {
  const pixKey = config.pixKey || "";
  const expectedAmount = config.expectedAmount || 0;
  console.log(`[Flow Engine] Pix Confirmation: key=${pixKey}, amount=${expectedAmount}`);
  context.variables.pixKey = pixKey;
  context.variables.pixAmount = expectedAmount;
  const reply = `\u{1F4B3} *Pagamento via Pix*

Chave: ${pixKey}
Valor: R$ ${expectedAmount}

Envie o comprovante ap\xF3s o pagamento.`;
  if (message2.provider === "whatsapp") {
    await sendWhatsAppMessage({ to: message2.fromNumber, message: reply });
  } else if (message2.provider === "instagram") {
    await sendInstagramMessage({ to: message2.fromNumber, message: reply });
  }
}
async function executeAttendanceCreateNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  const priority = config.priority || "medium";
  const channel = config.channel || message2.provider;
  const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const ticketData = {
    ticketNumber,
    customerId: context.customer?.id,
    subject: `Atendimento ${channel}: ${message2.fromNumber}`,
    description: message2.messageText || "",
    status: "open",
    priority,
    channel
  };
  const inserted = await db.insert(tickets).values(ticketData).$returningId();
  const ticketId = inserted?.[0]?.id;
  context.variables.attendanceTicket = { id: ticketId, ...ticketData };
  console.log(`[Flow Engine] Attendance created: ${ticketNumber}`);
}
async function executeNotifyNode(config, context, message2) {
  const alert = replaceVariables(config.alert || "", context);
  console.log(`[Flow Engine] NOTIFICATION: ${alert}`);
}
async function executeAddTagNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  const tag = config.tag || "";
  const customerId = context.customer?.id;
  if (customerId && tag) {
    try {
      const [customer2] = await db.select().from(customers).where((0, import_drizzle_orm17.eq)(customers.id, customerId)).limit(1);
      if (customer2) {
        const currentTags = customer2.tags ? JSON.parse(customer2.tags) : [];
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          await db.update(customers).set({ tags: JSON.stringify(currentTags) }).where((0, import_drizzle_orm17.eq)(customers.id, customerId));
        }
      }
    } catch (error) {
      console.error("[Flow Engine] Add Tag error:", error);
    }
  }
  context.variables[`tag_${tag.replace(/[^a-zA-Z0-9]/g, "_")}`] = true;
}
async function executeAssignAgentNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  const queue2 = config.queue || "general";
  const fallback = config.fallback || "";
  try {
    const agents = await db.select().from(users).where((0, import_drizzle_orm17.and)((0, import_drizzle_orm17.eq)(users.role, "agent"), (0, import_drizzle_orm17.eq)(users.status, "active"))).limit(5);
    if (agents.length > 0) {
      const assignedAgent = agents[Math.floor(Math.random() * agents.length)];
      context.assignedTo = assignedAgent.id;
      context.agent_name = assignedAgent.name;
      const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm17.and)((0, import_drizzle_orm17.eq)(conversations.customerId, context.customer?.id), (0, import_drizzle_orm17.eq)(conversations.status, "open"))).orderBy((0, import_drizzle_orm17.desc)(conversations.lastMessageAt)).limit(1);
      if (conv) {
        await db.update(conversations).set({ assignedTo: assignedAgent.id, status: "assigned" }).where((0, import_drizzle_orm17.eq)(conversations.id, conv.id));
      }
      console.log(`[Flow Engine] Agent assigned: ${assignedAgent.name} (queue: ${queue2})`);
    } else if (fallback) {
      console.log(`[Flow Engine] No agents available, using fallback: ${fallback}`);
      context.agent_name = fallback;
    }
  } catch (error) {
    console.error("[Flow Engine] Assign Agent error:", error);
  }
}
async function executeCreateContactNode(config, context, message2) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db.select().from(customers).where((0, import_drizzle_orm17.eq)(customers.phone, message2.fromNumber)).limit(1);
    if (existing.length === 0) {
      const tags2 = config.tags ? JSON.stringify(config.tags) : "[]";
      await db.insert(customers).values({
        name: message2.fromName || "Cliente",
        phone: message2.fromNumber,
        tags: tags2,
        createdAt: /* @__PURE__ */ new Date()
      });
      console.log(`[Flow Engine] Contact created: ${message2.fromNumber}`);
    } else {
      console.log(`[Flow Engine] Contact already exists: ${message2.fromNumber}`);
    }
  } catch (error) {
    console.error("[Flow Engine] Create Contact error:", error);
  }
}
async function executeCreateTaskNode(config, context, message2) {
  const title = replaceVariables(config.title || "Nova tarefa", context);
  const description = replaceVariables(config.description || "", context);
  const priority = config.priority || "medium";
  const assignTo = config.assignTo || config.assignee || null;
  console.log(`[Flow Engine] Task created: ${title} (priority: ${priority}, assignTo: ${assignTo})`);
  context.variables.lastTask = { title, description, priority, assignTo };
}
async function executeHttpRequestNode(config, context, message2) {
  const url = replaceVariables(config.url || "", context);
  const method = config.method || "GET";
  const headers = config.headers || {};
  const body2 = config.body ? replaceVariables(config.body, context) : void 0;
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body2 ? JSON.stringify(JSON.parse(body2)) : void 0
    });
    const data = await response.json();
    context.variables.httpResponse = data;
  } catch (error) {
    console.error(`[Flow Engine] HTTP Request error:`, error);
  }
}
async function executeSwitchNode(config, context, edges, nodeId, nodes) {
  const value = replaceVariables(config.value || "", context);
  const rules = config.rules || [];
  let matchedEdge = null;
  for (const rule of rules) {
    if (value === rule.value || value.includes(rule.value)) {
      matchedEdge = edges.find((e) => e.sourceHandle === rule.output);
      break;
    }
  }
  if (!matchedEdge) {
    matchedEdge = edges.find((e) => e.sourceHandle === "default");
  }
  if (matchedEdge) {
    const nextNode = nodes.find((n) => n.id === matchedEdge.target);
    if (nextNode) {
      console.log(`[Flow Engine] Switch matched: ${matchedEdge.sourceHandle}`);
    }
  }
}
function executeDatetimeNode(config, context) {
  const format2 = config.format || "iso";
  const now = /* @__PURE__ */ new Date();
  if (config.variableName) {
    context.variables[config.variableName] = format2 === "iso" ? now.toISOString() : now.toLocaleString("pt-BR");
  }
  if (config.addDays) {
    const future = new Date(now.getTime() + config.addDays * 24 * 60 * 60 * 1e3);
    context.variables.futureDate = future.toISOString();
  }
}
async function executeBusinessHoursNode(context, config = {}) {
  try {
    const checkType = config.checkType || "business";
    const result = await checkBusinessHours(/* @__PURE__ */ new Date());
    context.variables.isBusinessHours = result.isOpen;
    context.variables.businessHoursOpen = result.isOpen;
    context.variables.businessHoursSchedule = result.schedule;
    if (result.holidayName) {
      context.variables.isHoliday = true;
      context.variables.holidayName = result.holidayName;
    }
    return result.isOpen;
  } catch (error) {
    console.error("[Flow Engine] Business Hours check error:", error);
    return false;
  }
}
function startFlowEngine() {
  setInterval(() => {
    processPendingMessages().catch((error) => {
      console.error("[Flow Engine] Error in processor:", error);
    });
  }, 5e3);
}
var import_drizzle_orm17, VALID_NODE_TYPES;
var init_flow_engine = __esm({
  "server/flow-engine.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm17 = require("drizzle-orm");
    init_messaging();
    init_db_messages();
    init_llm();
    init_routers_business_hours();
    VALID_NODE_TYPES = /* @__PURE__ */ new Set([
      // Existing core node types
      "trigger",
      "condition",
      "filter",
      "switch",
      "if-else",
      "message",
      "aiAssistant",
      "transferHuman",
      "transfer",
      "createTicket",
      "wait",
      "setVariable",
      "httpRequest",
      "http-request",
      "uraMenu",
      "function",
      "notify",
      "add_tag",
      "assign_agent",
      "create_contact",
      "create_task",
      "check-prescription",
      "pix-confirmation",
      "attendance-create",
      "email-send",
      "whatsapp-send",
      // ===== NEW NODE TYPES FOR VISUAL EDITOR =====
      "if-node",
      "set-node",
      "http-request-node",
      "switch-node",
      "filter-node",
      "merge-node",
      "wait-node",
      "error-handler-node",
      "code-node",
      "split-batches-node",
      "aggregate-node",
      "csv-parse-node",
      "datetime-node",
      "email-send-node",
      "execute-workflow-node",
      "summarize-node",
      "sort-node",
      "limit-node",
      "remove-duplicates-node",
      "sticky-note-node",
      "schedule-trigger",
      "webhook-trigger",
      "if-business-hours",
      "welcome-agent"
    ]);
  }
});

// server/db-messages.ts
var db_messages_exports = {};
__export(db_messages_exports, {
  findOrCreateCustomerByPhone: () => findOrCreateCustomerByPhone,
  getConversationHistory: () => getConversationHistory,
  getReceivedMessageByExternalId: () => getReceivedMessageByExternalId,
  getReceivedMessageById: () => getReceivedMessageById,
  getReceivedMessages: () => getReceivedMessages,
  ingestInboundConversationMessage: () => ingestInboundConversationMessage,
  ingestOutboundConversationMessage: () => ingestOutboundConversationMessage,
  listReceivedMessages: () => listReceivedMessages,
  markMessageAsProcessed: () => markMessageAsProcessed
});
async function pickLeastLoadedOnlineAgent(params) {
  const db = await getDb();
  if (!db) return null;
  const cacheKey = params.provider;
  const cached = agentAssignmentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.agentId ? { userId: cached.agentId, loadCount: 0, lastSignedIn: null } : null;
  }
  const connected = sseManager.getConnectedUsers().map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  if (connected.length === 0) {
    console.log("[pickAgent] \u26A0\uFE0F No agents online via SSE \u2014 using offline fallback");
    const offlineResult = await db.execute(import_drizzle_orm18.sql`
      SELECT 
        u.id AS userId,
        COUNT(c.id) AS loadCount
      FROM users u
      LEFT JOIN agent_pauses p
        ON p.agent_id = u.id AND p.status = 'active'
      LEFT JOIN conversations c
        ON c.assigned_to = u.id
       AND c.status IN ('open','assigned')
      WHERE u.role IN ('user', 'admin')
        AND p.id IS NULL
      GROUP BY u.id
      ORDER BY loadCount ASC, u.id DESC
      LIMIT 1
    `);
    const offlineRows = Array.isArray(offlineResult) ? offlineResult[0] : offlineResult;
    if (Array.isArray(offlineRows) && offlineRows.length > 0) {
      const fallbackId = Number(offlineRows[0]?.userId);
      if (Number.isFinite(fallbackId) && fallbackId > 0) {
        console.log("[pickAgent] \u{1F504} Offline fallback assigned to agent", fallbackId);
        agentAssignmentCache.set(cacheKey, { agentId: fallbackId, timestamp: Date.now() });
        return { userId: fallbackId, loadCount: Number(offlineRows[0]?.loadCount ?? 0), lastSignedIn: null };
      }
    }
    agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
    return null;
  }
  if (connected.length > 0) {
    const rows = await db.execute(import_drizzle_orm18.sql`
      SELECT 
        u.id AS userId,
        COUNT(c.id) AS loadCount,
        MAX(u.lastSignedIn) AS lastSignedIn
      FROM users u
      LEFT JOIN agent_pauses p
        ON p.agent_id = u.id AND p.status = 'active'
      LEFT JOIN conversations c
        ON c.assigned_to = u.id
       AND c.status IN ('open','assigned')
       AND c.channel = ${params.provider}
      WHERE u.role IN ('user', 'admin')
        AND u.id IN (${import_drizzle_orm18.sql.join(
      connected.map((id) => import_drizzle_orm18.sql`${id}`),
      import_drizzle_orm18.sql`, `
    )})
        AND p.id IS NULL
      GROUP BY u.id
      ORDER BY loadCount ASC, u.id DESC
    `);
    if (Array.isArray(rows) && rows.length > 0) {
      const minLoad = Number(rows[0]?.loadCount ?? 0);
      const minRows = rows.filter((r) => Number(r.loadCount ?? 0) === minLoad);
      const chosenId = Number(minRows[0]?.userId);
      if (!Number.isFinite(chosenId) || chosenId <= 0) {
        agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
        return null;
      }
      agentAssignmentCache.set(cacheKey, { agentId: chosenId, timestamp: Date.now() });
      return {
        userId: chosenId,
        candidates: rows.length,
        minLoad,
        source: "sse"
      };
    }
  }
  agentAssignmentCache.set(cacheKey, { agentId: null, timestamp: Date.now() });
  return null;
}
async function getReceivedMessages(filters) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(receivedMessages);
  const conditions = [];
  if (filters?.provider) {
    conditions.push((0, import_drizzle_orm18.eq)(receivedMessages.provider, filters.provider));
  }
  if (filters?.processed !== void 0) {
    conditions.push((0, import_drizzle_orm18.eq)(receivedMessages.processed, filters.processed ? 1 : 0));
  }
  if (filters?.customerId) {
    conditions.push((0, import_drizzle_orm18.eq)(receivedMessages.customerId, filters.customerId));
  }
  if (conditions.length > 0) {
    query = query.where((0, import_drizzle_orm18.and)(...conditions));
  }
  query = query.orderBy((0, import_drizzle_orm18.desc)(receivedMessages.createdAt));
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  return await query;
}
async function getReceivedMessageById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(receivedMessages).where((0, import_drizzle_orm18.eq)(receivedMessages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function getReceivedMessageByExternalId(externalId, provider) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(receivedMessages).where(
    (0, import_drizzle_orm18.and)(
      (0, import_drizzle_orm18.eq)(receivedMessages.externalId, externalId),
      (0, import_drizzle_orm18.eq)(receivedMessages.provider, provider)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function markMessageAsProcessed(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receivedMessages).set({
    processed: 1,
    processedAt: /* @__PURE__ */ new Date(),
    ...updates
  }).where((0, import_drizzle_orm18.eq)(receivedMessages.id, id));
  return await getReceivedMessageById(id);
}
async function getConversationHistory(fromNumber, provider, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(receivedMessages).where(
    (0, import_drizzle_orm18.and)(
      (0, import_drizzle_orm18.eq)(receivedMessages.fromNumber, fromNumber),
      (0, import_drizzle_orm18.eq)(receivedMessages.provider, provider)
    )
  ).orderBy((0, import_drizzle_orm18.desc)(receivedMessages.timestamp)).limit(limit);
}
async function findOrCreateCustomerByPhone(phone, name, photoUrl) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedPhone = formatPhoneBR(phone);
  if (normalizedPhone.length < 10) {
    throw new Error(`N\xFAmero muito curto ap\xF3s normaliza\xE7\xE3o: ${phone} \u2192 ${normalizedPhone}`);
  }
  const searchVariants = generatePhoneVariants(phone);
  let existing = await db.select({
    id: customers.id,
    name: customers.name,
    email: customers.email,
    phone: customers.phone,
    status: customers.status,
    photoUrl: customers.photoUrl
  }).from(customers).where((0, import_drizzle_orm18.inArray)(customers.phone, searchVariants)).limit(1);
  if (!existing || existing.length === 0) {
    const pushName = name;
    const finalName = pushName && pushName.trim() !== "" ? pushName : `Cliente ${normalizedPhone.slice(-4)}`;
    const result = await db.insert(customers).values({
      name: finalName,
      phone: normalizedPhone,
      // Sempre salvo no formato normalizado
      photoUrl: photoUrl || null,
      status: "active"
    });
    const rawId = Array.isArray(result) ? result[0]?.insertId : result?.insertId || result?.lastInsertRowid;
    const newId = Number(rawId);
    if (!newId || isNaN(newId)) {
      throw new Error("Falha ao obter ID do cliente rec\xE9m-criado");
    }
    existing = [{
      id: newId,
      name: finalName,
      email: null,
      phone: normalizedPhone,
      status: "active",
      photoUrl: photoUrl || null
    }];
  }
  const customer2 = existing[0];
  if (name && customer2.name !== name) {
    await db.update(customers).set({ name, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm18.eq)(customers.id, customer2.id));
  }
  if (photoUrl && customer2.photoUrl !== photoUrl) {
    await db.update(customers).set({ photoUrl, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm18.eq)(customers.id, customer2.id));
  }
  return customer2;
}
function buildInboundContent(message2) {
  if (message2.text?.trim()) return message2.text;
  if (message2.extendedTextMessage?.text?.trim()) {
    return message2.extendedTextMessage.text;
  }
  if (message2.messageText?.trim()) return message2.messageText;
  if (message2.caption?.trim()) return message2.caption;
  switch (message2.messageType) {
    case "reaction":
      return message2.messageText || "";
    case "image":
      return "[Imagem]";
    case "audio":
      return "[Audio]";
    case "video":
      return "[Video]";
    case "document":
      return "[Documento]";
    case "location":
      return "[Localizacao]";
    case "sticker":
    case "stickerMessage":
      return "";
    // Sticker é renderizado como imagem no frontend
    case "extendedTextMessage":
      return "[Resposta a Status]";
    case "contact":
      return "[Contato]";
    default:
      return "[Mensagem]";
  }
}
async function ingestInboundConversationMessage(message2) {
  console.log("[Ingest] Starting for message from", message2.fromNumber, "type:", message2.messageType);
  const db = await getDb();
  if (!db) {
    console.error("[ingestInbound] Database not available!");
    return null;
  }
  if (message2.externalId) {
    const TTL_HOURS = 24;
    const cutoffTime = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1e3);
    const existing = await db.select().from(processedWebhookMessages).where(
      (0, import_drizzle_orm18.and)(
        (0, import_drizzle_orm18.eq)(processedWebhookMessages.id, message2.externalId),
        import_drizzle_orm18.sql`${processedWebhookMessages.processedAt} > ${cutoffTime.toISOString().slice(0, 19).replace("T", " ")}`
      )
    ).limit(1);
    if (existing.length > 0) {
      console.log(`[Webhook] Duplicate message ignored (within TTL): ${message2.externalId}`);
      return null;
    }
    await db.insert(processedWebhookMessages).values({
      id: message2.externalId,
      provider: message2.provider
    });
    console.log(`[Webhook] New message registered: ${message2.externalId}`);
  }
  const customer2 = await findOrCreateCustomerByPhone(
    message2.fromNumber,
    message2.fromName || void 0
  );
  const isExpiredCdn = !!customer2?.photoUrl && (customer2.photoUrl.includes("whatsapp.net") || customer2.photoUrl.includes("whatsapp.com"));
  if (message2.provider === "whatsapp" && customer2?.id && (!customer2?.photoUrl || isExpiredCdn)) {
    setImmediate(async () => {
      try {
        const { downloadAndUploadProfilePic: downloadAndUploadProfilePic2 } = await Promise.resolve().then(() => (init_profile_pic(), profile_pic_exports));
        await downloadAndUploadProfilePic2(message2.fromNumber, customer2.id);
      } catch (err) {
      }
    });
  }
  if (customer2?.id) {
    await db.update(receivedMessages).set({ customerId: customer2.id }).where(
      (0, import_drizzle_orm18.and)(
        (0, import_drizzle_orm18.eq)(receivedMessages.fromNumber, message2.fromNumber),
        (0, import_drizzle_orm18.eq)(receivedMessages.provider, message2.provider)
      )
    );
  }
  const now = message2.createdAt ?? /* @__PURE__ */ new Date();
  let picked = await pickLeastLoadedOnlineAgent({ provider: message2.provider });
  const assignedUserId = picked && Number.isFinite(picked.userId) && picked.userId > 0 ? picked.userId : null;
  console.log("[ingestInbound] \u{1F3AF} Agent pick result:", { picked: picked?.userId, assignedUserId, customerPhone: customer2.phone });
  const [defaultQueue] = await db.select().from(queues).where((0, import_drizzle_orm18.eq)(queues.status, "active")).orderBy((0, import_drizzle_orm18.desc)(queues.priority)).limit(1);
  const found = await findConversationByPhone(db, customer2.phone, conversations, customers);
  let conversationId2 = found?.conversationId;
  let existingConversation = null;
  if (conversationId2) {
    [existingConversation] = await db.select().from(conversations).where((0, import_drizzle_orm18.eq)(conversations.id, conversationId2)).limit(1);
    conversationId2 = existingConversation?.id;
  }
  if (existingConversation && existingConversation.customerId !== customer2.id) {
    console.log(`[ingestInbound] \u{1F504} Customer ID ajustado: ${customer2.id} \u2192 ${existingConversation.customerId} (mesmo telefone)`);
  }
  if (!conversationId2) {
    await db.insert(conversations).values({
      customerId: customer2.id,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      channel: message2.provider || "whatsapp",
      // fallback para whatsapp se undefined
      status: assignedUserId ? "assigned" : "open",
      assignedTo: assignedUserId,
      queueId: assignedUserId ? null : defaultQueue?.id ?? null,
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 1
    });
    const [newConversation] = await db.select().from(conversations).where((0, import_drizzle_orm18.eq)(conversations.customerId, customer2.id)).orderBy((0, import_drizzle_orm18.desc)(conversations.id)).limit(1);
    conversationId2 = newConversation?.id;
  } else {
    const isReopening = existingConversation?.status === "closed";
    const shouldAssign = !existingConversation?.assignedTo && assignedUserId;
    await db.update(conversations).set({
      lastMessageAt: now,
      unreadCount: isReopening ? 1 : import_drizzle_orm18.sql`unread_count + 1`,
      // Reabrir conversa fechada
      ...isReopening ? {
        status: assignedUserId ? "assigned" : "open",
        assignedTo: assignedUserId ?? null,
        queueId: assignedUserId ? null : defaultQueue?.id ?? null,
        closedAt: null,
        closeReason: null
      } : {},
      // Atribuir agente se não tinha
      ...shouldAssign && !isReopening ? {
        assignedTo: assignedUserId,
        status: "assigned",
        queueId: null
      } : {}
    }).where((0, import_drizzle_orm18.eq)(conversations.id, conversationId2));
  }
  let fileUrlToSave = message2.mediaUrl || null;
  let duplicateCheck;
  if (message2.externalId) {
    duplicateCheck = (0, import_drizzle_orm18.and)(
      (0, import_drizzle_orm18.eq)(conversationMessages.externalId, message2.externalId),
      (0, import_drizzle_orm18.eq)(conversationMessages.senderType, "customer")
    );
  } else {
    const timeWindowMs = 5e3;
    const now2 = /* @__PURE__ */ new Date();
    duplicateCheck = (0, import_drizzle_orm18.and)(
      (0, import_drizzle_orm18.eq)(conversationMessages.conversationId, conversationId2),
      (0, import_drizzle_orm18.eq)(conversationMessages.senderType, "customer"),
      (0, import_drizzle_orm18.eq)(conversationMessages.content, message2.messageText || message2.caption || ""),
      (0, import_drizzle_orm18.gte)(conversationMessages.createdAt, new Date(now2.getTime() - timeWindowMs)),
      (0, import_drizzle_orm18.lte)(conversationMessages.createdAt, new Date(now2.getTime() + timeWindowMs))
    );
  }
  const [already] = await db.select({ id: conversationMessages.id }).from(conversationMessages).where(duplicateCheck).limit(1);
  if (already) {
    console.log(`[EvolutionDeduplication] Mensagem j\xE1 processada, ignorando: ${message2.externalId || "sem externalId"}`);
    return null;
  }
  console.log(`[EvolutionDeduplication] Nova mensagem, processando: ${message2.externalId || "sem externalId"}`);
  const externalIdToCheck = message2.key?.id ?? null;
  if (externalIdToCheck) {
    const existing = await db.select({ id: conversationMessages.id }).from(conversationMessages).where((0, import_drizzle_orm18.and)((0, import_drizzle_orm18.eq)(conversationMessages.externalId, externalIdToCheck), (0, import_drizzle_orm18.eq)(conversationMessages.provider, message2.provider || "whatsapp"))).limit(1);
    if (existing.length > 0) {
      console.log(`[EvolutionDeduplication] \u23ED\uFE0F Skipping duplicate message: ${externalIdToCheck}`);
      return null;
    }
  }
  const insertResult = await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    externalId: message2.key?.id ?? null,
    senderId: null,
    senderType: "customer",
    content: buildInboundContent(message2),
    fileUrl: fileUrlToSave,
    fileName: message2.fileName || null,
    fileType: message2.mimeType || null,
    fileSize: message2.fileSize || null,
    createdAt: now
  });
  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || void 0;
  const needsR2Upload = message2.provider === "whatsapp" && message2.externalId && // Case 1: has WhatsApp CDN URL
  (fileUrlToSave?.includes("mmg.whatsapp.net") || fileUrlToSave?.includes("pps.whatsapp.net") || // Case 2: has media but no URL (stickers, etc.) — mediaId or mimeType indicates media
  !fileUrlToSave && (message2.mediaId || ["sticker", "stickerMessage", "image", "audio", "video", "document"].includes(message2.messageType || "")));
  if (needsR2Upload) {
    try {
      console.log("[S3] Triggering Evolution download for R2 upload, messageId:", message2.externalId);
      const [configRecord] = await db.select().from(integrationSettings).where((0, import_drizzle_orm18.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
      if (configRecord?.config) {
        const configData = typeof configRecord.config === "string" ? JSON.parse(configRecord.config) : configRecord.config;
        const apiUrl = configData.apiUrl?.replace(/\/$/, "");
        const apiKey = configData.apiKey || configData.accessToken;
        const instanceName = configData.instanceName;
        if (apiUrl && apiKey && instanceName) {
          const downloadUrl = `${apiUrl}/message/download/${instanceName}/${message2.externalId}`;
          console.log("[S3] Calling Evolution download endpoint:", downloadUrl);
          const response = await fetch(downloadUrl, {
            headers: {
              "apikey": apiKey
            },
            signal: AbortSignal.timeout(15e3)
          });
          if (response.ok) {
            const data = await response.json();
            console.log("[S3] Download response:", data);
            const r2Url = data?.url || data?.mediaUrl || null;
            if (r2Url && r2Url.includes("r2.dev")) {
              console.log("[S3] \u2705 Got R2 URL, updating message:", r2Url);
              await db.update(conversationMessages).set({ fileUrl: r2Url }).where((0, import_drizzle_orm18.eq)(conversationMessages.id, messageDbId));
              console.log("[S3] Message updated with R2 URL");
            }
          } else {
            console.log("[S3] \u274C Download failed:", response.status, response.statusText);
          }
        }
      }
    } catch (error) {
      console.log("[S3] Error during R2 upload:", error);
    }
  }
  console.log("[Ingest] \u2705 Message ingested successfully:", {
    conversationId: conversationId2,
    messageDbId,
    content: buildInboundContent(message2).substring(0, 50),
    assignedUserId
  });
  const messageContent = message2.messageText || message2.caption || "[M\xEDdia]";
  const sseMessage = {
    type: EVENTS.MESSAGE_NEW,
    data: {
      conversationId: conversationId2,
      message: {
        id: messageDbId,
        content: buildInboundContent(message2),
        senderType: "customer",
        fileUrl: fileUrlToSave,
        fileType: message2.mimeType || null,
        createdAt: now.toISOString()
      },
      customerName: customer2.name,
      customerPhone: customer2.phone,
      customerAvatar: customer2.photoUrl
    },
    timestamp: Date.now()
  };
  const sseConvUpdate = {
    type: !existingConversation ? EVENTS.CONVERSATION_NEW : EVENTS.CONVERSATION_UPDATE,
    data: {
      id: conversationId2,
      conversationId: conversationId2,
      lastMessageAt: now.toISOString(),
      lastMessage: messageContent,
      unreadCount: existingConversation ? existingConversation.unreadCount + 1 : 1,
      status: assignedUserId ? "assigned" : "open",
      assignedTo: assignedUserId,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      customerAvatar: customer2.photoUrl
    },
    timestamp: Date.now()
  };
  if (assignedUserId) {
    sseManager.emitToUser(String(assignedUserId), sseMessage);
    sseManager.emitToUser(String(assignedUserId), sseConvUpdate);
    sseManager.emitToAll(sseConvUpdate);
  } else {
    sseManager.emitToAll(sseMessage);
    sseManager.emitToAll(sseConvUpdate);
  }
  return { conversationId: conversationId2, customerId: customer2.id };
}
async function listReceivedMessages(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.provider) {
    conditions.push((0, import_drizzle_orm18.eq)(receivedMessages.provider, filters.provider));
  }
  let query = db.select().from(receivedMessages);
  if (conditions.length > 0) {
    query = query.where((0, import_drizzle_orm18.and)(...conditions));
  }
  const messages4 = await query;
  const stats = {
    total: messages4.length,
    processed: messages4.filter((m) => m.processed === 1).length,
    pending: messages4.filter((m) => m.processed === 0).length,
    byType: {},
    byProvider: {}
  };
  messages4.forEach((msg) => {
    stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
    stats.byProvider[msg.provider] = (stats.byProvider[msg.provider] || 0) + 1;
  });
  return stats;
  setImmediate(async () => {
    try {
      const { findAndExecuteFlowForTrigger: findAndExecuteFlowForTrigger2 } = await Promise.resolve().then(() => (init_flow_engine(), flow_engine_exports));
      await findAndExecuteFlowForTrigger2(message.fromNumber, customer, conversationId);
    } catch (err) {
      console.error("[Flow Engine] Error:", err);
    }
  });
  return { conversationId, customerId: customer.id };
}
async function ingestOutboundConversationMessage(message2) {
  console.log("[ingestOutbound] Starting for message to", message2.toNumber, "type:", message2.messageType);
  const db = await getDb();
  if (!db) {
    console.error("[ingestOutbound] Database not available!");
    return null;
  }
  const customer2 = await findOrCreateCustomerByPhone(
    message2.toNumber,
    void 0,
    null
  );
  if (!customer2) {
    console.error("[ingestOutbound] Customer not found for:", message2.toNumber);
    return null;
  }
  let found = await findConversationByPhone(db, customer2.phone, conversations, customers);
  if (!found) {
    const variants = generatePhoneVariants(customer2.phone);
    for (const variant of variants) {
      found = await findConversationByPhone(db, variant, conversations, customers);
      if (found) {
        console.log("[ingestOutbound] \u2705 Found conversation with variant:", variant);
        break;
      }
    }
  }
  let conversationId2;
  if (!found) {
    console.log("[ingestOutbound] \u26A0\uFE0F No conversation found for", customer2.phone, "\u2192 creating new one");
    const [newConv] = await db.insert(conversations).values({
      customerId: customer2.id,
      customerName: customer2.name || null,
      customerPhone: customer2.phone,
      channel: message2.provider || "whatsapp",
      status: "open",
      assignedTo: message2.fromUserId || null
    }).returning();
    if (!found) {
      console.log("[ingestOutbound] \u26A0\uFE0F No conversation found for", customer2.phone, "\u2192 creating new one");
      const [newConv2] = await db.insert(conversations).values({
        customerId: customer2.id,
        customerName: customer2.name || null,
        customerPhone: customer2.phone,
        channel: message2.provider || "whatsapp",
        status: "open",
        assignedTo: message2.fromUserId || null
      }).returning();
      found = { conversationId: newConv2.id };
    }
    found = { conversationId: newConv.id };
  }
  if (found?.conversationId) {
    conversationId2 = found.conversationId;
  } else {
    const [newConv] = await db.insert(conversations).values({
      customerId: customer2.id,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      channel: message2.provider,
      status: "open",
      assignedTo: message2.fromUserId,
      openedAt: message2.createdAt || /* @__PURE__ */ new Date(),
      lastMessageAt: message2.createdAt || /* @__PURE__ */ new Date(),
      unreadCount: 0
    });
    conversationId2 = newConv.id;
  }
  const outboundExtId = message2.key?.id || message2.messageId || null;
  if (outboundExtId) {
    const existingOut = await db.select({ id: conversationMessages.id }).from(conversationMessages).where((0, import_drizzle_orm18.and)((0, import_drizzle_orm18.eq)(conversationMessages.externalId, outboundExtId), (0, import_drizzle_orm18.eq)(conversationMessages.provider, "whatsapp"))).limit(1);
    if (existingOut.length > 0) {
      console.log("[ingestOutbound] \u23ED\uFE0F Skipping duplicate outbound message:", outboundExtId);
      return null;
    }
  }
  let fileUrlToSave = message2.mediaUrl || null;
  if (fileUrlToSave && !fileUrlToSave.startsWith("http") && !fileUrlToSave.startsWith("evolution-api")) {
    const r2Base = process.env.R2_PUBLIC_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev";
    const key = fileUrlToSave.startsWith("media/") ? fileUrlToSave : "media/" + fileUrlToSave;
    fileUrlToSave = r2Base + "/" + key;
    console.log("[ingestOutbound] Reconstructed full R2 URL:", fileUrlToSave);
  }
  const insertResult = await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    externalId: message2.externalId || null,
    replyToExternalId: message2.replyToExternalId || null,
    // ✅ Salvar referência do reply
    senderId: message2.fromUserId,
    senderName: message2.fromUserName || null,
    senderPosition: message2.fromUserPosition || null,
    senderType: "agent",
    content: message2.messageText || message2.caption || buildInboundContent({
      messageType: message2.messageType,
      messageText: message2.messageText,
      caption: message2.caption
    }),
    fileUrl: fileUrlToSave || null,
    fileName: message2.fileName || null,
    fileType: message2.mimeType || null,
    fileSize: message2.fileSize || null,
    createdAt: message2.createdAt || /* @__PURE__ */ new Date()
  });
  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || void 0;
  console.log("[ingestOutbound] \u2705 Message ingested successfully:", {
    conversationId: conversationId2,
    messageDbId,
    content: (message2.messageText || message2.caption || "[M\xEDdia]").substring(0, 50)
  });
  return { conversationId: conversationId2, customerId: customer2.id, messageDbId };
}
var import_drizzle_orm18, agentAssignmentCache, CACHE_TTL_MS;
var init_db_messages = __esm({
  "server/db-messages.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm18 = require("drizzle-orm");
    init_sse();
    init_phone();
    agentAssignmentCache = /* @__PURE__ */ new Map();
    CACHE_TTL_MS = 30 * 1e3;
  }
});

// server/db-messages-outbound.ts
var db_messages_outbound_exports = {};
__export(db_messages_outbound_exports, {
  ingestOutboundConversationMessage: () => ingestOutboundConversationMessage2
});
function buildOutboundContent(message2) {
  if (message2.messageText?.trim()) return message2.messageText;
  if (message2.caption?.trim()) return message2.caption;
  switch (message2.messageType) {
    case "image":
      return "[Imagem]";
    case "audio":
      return "[\xC1udio]";
    case "video":
      return "[V\xEDdeo]";
    case "document":
      return "[Documento]";
    case "sticker":
      return "";
    case "location":
      return "[Localiza\xE7\xE3o]";
    case "contact":
      return "[Contato]";
    default:
      return `[${message2.messageType}]`;
  }
}
async function ingestOutboundConversationMessage2(message2) {
  console.log("[ingestOutbound] Starting for message to", message2.toNumber, "type:", message2.messageType);
  const db = await getDb();
  if (!db) {
    console.error("[ingestOutbound] Database not available!");
    return null;
  }
  const customer2 = await findOrCreateCustomerByPhone(
    message2.toNumber,
    void 0,
    null
  );
  if (!customer2) {
    console.error("[ingestOutbound] Customer not found for:", message2.toNumber);
    return null;
  }
  const found = await findConversationByPhone(db, customer2.phone, conversations, customers);
  let conversationId2;
  if (found?.conversationId) {
    conversationId2 = found.conversationId;
  } else {
    const [newConv] = await db.insert(conversations).values({
      customerId: customer2.id,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      channel: message2.provider,
      status: "open",
      assignedTo: message2.fromUserId,
      openedAt: message2.createdAt || /* @__PURE__ */ new Date(),
      lastMessageAt: message2.createdAt || /* @__PURE__ */ new Date(),
      unreadCount: 0
    });
    conversationId2 = newConv.id;
  }
  const content2 = buildOutboundContent({
    messageType: message2.messageType,
    messageText: message2.messageText,
    caption: message2.caption
  });
  const insertResult = await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    externalId: (message2.externalId || message2.key?.id) ?? null,
    senderId: message2.fromUserId,
    senderType: "agent",
    content: content2,
    fileUrl: message2.mediaUrl || null,
    fileName: message2.fileName || null,
    fileType: message2.mimeType || null,
    fileSize: message2.fileSize || null,
    reaction: message2.reaction || null,
    replyToMessageId: message2.replyToMessageId || null,
    createdAt: message2.createdAt || /* @__PURE__ */ new Date()
  });
  console.log("[DB-INSERT] externalId gravado (insertion):", message2.externalId ? "PRESENTE - " + message2.externalId : "NULL (erro)");
  const rawMessageId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
  const messageDbId = Number(rawMessageId) || void 0;
  console.log("[ingestOutbound] \u2705 Message ingested successfully:", {
    conversationId: conversationId2,
    messageDbId,
    content: content2.substring(0, 50)
  });
  await db.update(conversations).set({ lastMessageAt: message2.createdAt || /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm19.eq)(conversations.id, conversationId2));
  return { conversationId: conversationId2, customerId: customer2.id, messageDbId };
}
var import_drizzle_orm19;
var init_db_messages_outbound = __esm({
  "server/db-messages-outbound.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm19 = require("drizzle-orm");
    init_db_messages();
    init_phone();
  }
});

// server/messaging.ts
var messaging_exports = {};
__export(messaging_exports, {
  fetchEvolutionProfile: () => fetchEvolutionProfile,
  fetchInstagramProfile: () => fetchInstagramProfile2,
  getSentMessages: () => getSentMessages,
  sendInstagramDocument: () => sendInstagramDocument2,
  sendInstagramImage: () => sendInstagramImage2,
  sendInstagramMessage: () => sendInstagramMessage,
  sendReaction: () => sendReaction,
  sendWhatsAppDocument: () => sendWhatsAppDocument2,
  sendWhatsAppImage: () => sendWhatsAppImage2,
  sendWhatsAppMedia: () => sendWhatsAppMedia2,
  sendWhatsAppMessage: () => sendWhatsAppMessage,
  sendWhatsAppViewOnceMedia: () => sendWhatsAppViewOnceMedia
});
function extractR2Key2(url) {
  if (!url || typeof url !== "string") return null;
  if (url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.includes("pub-33c481f0a9e94adb8870472308f49471.r2.dev")) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(1).join("/");
    } catch {
      return null;
    }
  }
  if (!url.startsWith("http") && !url.startsWith("data:")) return url;
  return url;
}
async function getMediaAsBase64(urlOrKey) {
  if (!urlOrKey) throw new Error("Media URL or key is empty");
  if (urlOrKey.startsWith("data:")) {
    const m = urlOrKey.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) return { base64: m[2], mimetype: m[1] };
  }
  let r2Key = null;
  if (urlOrKey.includes(".r2.dev") || urlOrKey.includes("r2.cloudflarestorage.com")) {
    try {
      r2Key = new URL(urlOrKey).pathname.split("/").filter(Boolean).join("/");
    } catch {
    }
  } else if (!urlOrKey.startsWith("http") && !urlOrKey.startsWith("data:")) {
    r2Key = urlOrKey;
  }
  if (r2Key) {
    const keysToTry = [r2Key];
    try {
      const decoded = decodeURIComponent(r2Key);
      if (decoded !== r2Key) keysToTry.push(decoded);
    } catch {
    }
    for (const key of keysToTry) {
      try {
        const command = new import_client_s32.GetObjectCommand({ Bucket: "farmafranciswhatsappmedia", Key: key });
        const response = await s3Client2.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString("base64");
        const mimetype = response.ContentType || "application/octet-stream";
        const MAX_BASE64_SIZE = 5 * 1024 * 1024;
        if (base64.length > MAX_BASE64_SIZE) {
          throw new Error("M\xEDdia muito grande (" + (base64.length / 1024 / 1024).toFixed(1) + "MB). Limite: 5MB.");
        }
        return { base64, mimetype };
      } catch (e) {
        console.log("[getMediaAsBase64] R2 failed for key: " + String(key).substring(0, 80) + " - " + String(e.message || e).substring(0, 100));
      }
    }
  }
  if (urlOrKey.startsWith("http")) {
    const response = await fetch(urlOrKey, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3e4)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimetype = response.headers.get("content-type") || "application/octet-stream";
    if (base64.length > 5 * 1024 * 1024) throw new Error("Media too large");
    return { base64, mimetype };
  }
  if (urlOrKey.startsWith("evolution-api/") || urlOrKey.includes("evolution-api/")) {
    try {
      const config = await getEvolutionConfig2();
      if (config) {
        const decodedPath = urlOrKey.includes("%40") ? decodeURIComponent(urlOrKey) : urlOrKey;
        const fetchUrl = config.apiUrl + "/" + decodedPath;
        console.log("[getMediaAsBase64] Trying Evolution API:", fetchUrl.substring(0, 100));
        const evoResp = await fetch(fetchUrl, {
          headers: { "apikey": config.apiKey, "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(15e3)
        });
        console.log("[getMediaAsBase64] Evolution API response:", evoResp.status);
        if (evoResp.ok) {
          const ctype = evoResp.headers.get("content-type") || "";
          if (!ctype.includes("text/html") && !ctype.includes("text/plain") && !ctype.includes("application/json")) {
            const buf = Buffer.from(await evoResp.arrayBuffer());
            if (buf.length > 0 && buf.length < 10 * 1024 * 1024) {
              const b64 = buf.toString("base64");
              const mt = ctype || "application/octet-stream";
              console.log("[getMediaAsBase64] Got media from Evolution API:", buf.length, "bytes");
              return { base64: b64, mimetype: mt };
            }
          }
        }
      }
    } catch (e) {
      console.log("[getMediaAsBase64] Evolution API fallback failed:", String(e.message || e).substring(0, 100));
    }
  }
  throw new Error("Could not fetch media: " + String(urlOrKey).substring(0, 100));
}
function normalizeWhatsAppNumber2(value) {
  return value.replace(/\D/g, "");
}
async function getIntegrationConfig(type) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm20.eq)(integrationSettings.integrationType, type)).limit(1);
  if (!config || !config.isActive) {
    throw new Error(`${type} configuration not found or inactive`);
  }
  const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
  return { configData, configId: config.id };
}
async function getEvolutionConfig2() {
  try {
    const { configData } = await getIntegrationConfig("evolution_api");
    const apiUrl = configData.apiUrl;
    const apiKey = configData.apiKey || configData.accessToken;
    const instanceName = configData.instanceName;
    if (!apiUrl || !apiKey || !instanceName) {
      return null;
    }
    return {
      apiUrl: apiUrl.replace(/\/$/, ""),
      apiKey,
      instanceName
    };
  } catch {
    return null;
  }
}
async function sendEvolutionText(params) {
  const config = await getEvolutionConfig2();
  if (!config) {
    throw new Error("Evolution API configuration not found or incomplete");
  }
  const response = await fetch(
    `${config.apiUrl}/message/sendText/${config.instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number: normalizeWhatsAppNumber2(params.to),
        text: params.message,
        ...params.replyToMessageId && params.remoteJid ? {
          quoted: {
            key: {
              id: params.replyToMessageId,
              remoteJid: params.remoteJid
            }
          }
        } : {}
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  return result;
}
async function fetchEvolutionProfile(phone) {
  const config = await getEvolutionConfig2();
  if (!config) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.apiUrl}/chat/fetchProfile/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: config.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber2(phone)
        })
      }
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return {
      name: data.name || data.pushname || null,
      profilePicture: data.picture || data.profilePictureUrl || null,
      phone
    };
  } catch (error) {
    console.error("[Evolution API] Error fetching profile:", error);
    return null;
  }
}
async function fetchInstagramProfile2(igsid) {
  try {
    const { configData } = await getIntegrationConfig("instagram_graph");
    const token = configData.accessToken;
    if (!token || !igsid) return null;
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${igsid}?fields=name,username,profile_pic&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(1e4) }
    );
    if (!response.ok) {
      console.warn("[Instagram Profile] fetch failed:", response.status);
      return null;
    }
    const data = await response.json();
    return {
      name: data.name || data.username || null,
      profilePicture: data.profile_pic || null
    };
  } catch (error) {
    console.error("[Instagram Profile] Error fetching profile:", error);
    return null;
  }
}
async function sendWhatsAppMessage(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let finalMessage2 = params.message;
  if (params.senderName) {
    const senderLabel = String(params.senderName).trim().split("*").join("").split("_").join("").split("~").join("");
    finalMessage2 = `*${senderLabel}:*
${finalMessage2}`;
  }
  if (params.mediaUrl) {
    const result2 = await sendWhatsAppViewOnceMedia({
      to: params.to,
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaUrl.startsWith("data:") || params.mediaUrl.includes("base64") ? "image" : "image",
      caption: params.caption || finalMessage2
    });
    return result2;
  }
  const evolutionConfig = await getEvolutionConfig2();
  if (evolutionConfig) {
    const result2 = await sendEvolutionText({
      to: params.to,
      message: finalMessage2,
      replyToMessageId: params.replyToMessageId,
      remoteJid: params.replyToRemoteJid
      // ✅ Passar remoteJid para quoted
    });
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: params.message,
      messageId: result2?.key?.id || null,
      status: "sent"
    });
    await ingestOutboundConversationMessage2({
      provider: "whatsapp",
      toNumber: params.to,
      fromUserId: params.senderId ?? 1,
      fromUserName: params.senderName || null,
      fromUserPosition: params.senderPosition || null,
      messageType: "text",
      messageText: params.message,
      externalId: result2?.key?.id || null,
      replyToExternalId: params.replyToMessageId || null
      // ✅ Salvar referência do reply
    });
    return { success: true, messageId: result2?.key?.id || null, to: params.to };
  }
  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }
  const body2 = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber2(params.to),
    type: "text",
    text: {
      body: finalMessage2
    }
  };
  if (params.replyToMessageId) {
    body2.context = {
      message_id: params.replyToMessageId
    };
  }
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    console.error("[WhatsApp Send] Error:", error);
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: params.message,
    messageId: result.messages[0].id,
    status: "sent"
  });
  console.log(
    `[WhatsApp Send] Message sent to ${params.to}: ${result.messages[0].id}`
  );
  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to
  };
}
async function sendWhatsAppImage2(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let finalCaption = params.caption || "";
  if (params.senderName) {
    const senderLabel = String(params.senderName).trim().split("*").join("").split("_").join("").split("~").join("");
    finalCaption = `*${senderLabel}:*
${finalMessage}`;
  }
  const evolutionConfig = await getEvolutionConfig2();
  if (evolutionConfig) {
    let mediaBase64;
    let mediaMimetype;
    try {
      const fileKey = extractR2Key2(params.imageUrl);
      if (!fileKey) {
        throw new Error(`N\xE3o foi poss\xEDvel extrair key do R2 da URL: ${params.imageUrl}`);
      }
      const media = await getMediaAsBase64(fileKey);
      mediaBase64 = media.base64;
      mediaMimetype = media.mimetype;
    } catch (err) {
      console.error("[sendWhatsAppImage] Erro ao converter para base64:", err);
      throw new Error(`Falha ao preparar m\xEDdia para Evolution API: ${err.message}`);
    }
    const response2 = await fetch(
      `${evolutionConfig.apiUrl}/message/sendMedia/${evolutionConfig.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: evolutionConfig.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber2(params.to),
          mediatype: "image",
          media: mediaBase64,
          // base64 puro, sem prefixo data:
          caption: finalCaption || void 0,
          mimetype: mediaMimetype
        })
      }
    );
    if (!response2.ok) {
      const error = await response2.text();
      throw new Error(`Evolution API error: ${response2.status} - ${error}`);
    }
    const result2 = await response2.json();
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: finalCaption,
      messageId: result2?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        imageUrl: params.imageUrl,
        caption: finalCaption
      })
    });
    await ingestOutboundConversationMessage2({
      provider: "whatsapp",
      toNumber: params.to,
      fromUserId: params.senderId ?? 1,
      messageType: "image",
      messageText: finalCaption,
      mediaUrl: params.imageUrl,
      mimeType: mediaMimetype,
      fileName: params.imageUrl.split("/").pop() || "imagem.jpg",
      externalId: result2?.key?.id || null
    });
    return { success: true, messageId: result2?.key?.id || null, to: params.to };
  }
  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }
  const body2 = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber2(params.to),
    type: "image",
    image: {
      link: params.imageUrl,
      caption: finalCaption
    }
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: finalCaption,
    messageId: result.messages[0].id,
    status: "sent",
    metadata: JSON.stringify({
      imageUrl: params.imageUrl,
      caption: finalCaption
    })
  });
  await ingestOutboundConversationMessage2({
    provider: "whatsapp",
    toNumber: params.to,
    fromUserId: params.senderId ?? 1,
    messageType: "image",
    messageText: finalCaption,
    mediaUrl: params.imageUrl,
    mimeType: "image/jpeg",
    fileName: params.imageUrl.split("/").pop() || "imagem.jpg",
    externalId: result.messages[0].id
  });
  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to
  };
}
async function sendInstagramMessage(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const igsid = configData.igsid;
  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }
  const messageText = params.message;
  const body2 = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      text: {
        body: messageText
      }
    }
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: messageText,
    messageId: result?.messageId || null,
    status: "sent"
  });
  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to
  };
}
async function sendInstagramImage2(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const igsid = configData.igsid;
  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }
  const body2 = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      image: {
        link: params.imageUrl,
        caption: params.caption
      }
    }
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: params.caption || "[Image]",
    messageId: result?.messageId || null,
    status: "sent",
    metadata: JSON.stringify({
      imageUrl: params.imageUrl,
      caption: params.caption
    })
  });
  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to
  };
}
async function sendWhatsAppDocument2(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }
  const body2 = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber2(params.to),
    type: "document",
    document: {
      link: params.documentUrl,
      caption: params.caption,
      filename: params.fileName
    }
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "whatsapp",
    direction: "outbound",
    content: params.caption || params.fileName,
    messageId: result.messages[0].id,
    status: "sent"
  });
  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to
  };
}
async function sendInstagramDocument2(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { configData } = await getIntegrationConfig("instagram_graph");
  const token = configData.accessToken;
  const igsid = configData.igsid;
  if (!token || !igsid) {
    throw new Error("Instagram configuration missing accessToken or igsid");
  }
  const body2 = {
    messaging_product: "instagram",
    recipient_id: params.to,
    message: {
      attachment: {
        type: "MEDIA",
        payload: {
          url: params.documentUrl,
          is_video: false
        }
      }
    }
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${igsid}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await db.insert(messages).values({
    channel: "instagram",
    direction: "outbound",
    content: params.caption || params.fileName,
    messageId: result?.messageId || null,
    status: "sent"
  });
  return {
    success: true,
    messageId: result?.messageId || null,
    to: params.to
  };
}
async function sendWhatsAppMedia2(params) {
  switch (params.mediaType) {
    case "image":
      return await sendWhatsAppImage2({
        to: params.to,
        imageUrl: params.mediaUrl,
        caption: params.caption
      });
    case "video":
      throw new Error("Video sending not implemented yet");
    case "audio":
      throw new Error("Audio sending not implemented yet");
    case "document":
      return await sendWhatsAppDocument2({
        to: params.to,
        documentUrl: params.mediaUrl,
        fileName: params.fileName || "document",
        caption: params.caption
      });
    default:
      throw new Error(`Unsupported media type: ${params.mediaType}`);
  }
}
async function sendWhatsAppViewOnceMedia(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let finalCaption = params.caption || `""`;
  if (params.senderName) {
    const senderLabel = String(params.senderName).trim().split("*").join("").split("_").join("").split("~").join("");
    finalCaption = `*${senderLabel}:*
${finalMessage}`;
  }
  const evolutionConfig = await getEvolutionConfig2();
  if (evolutionConfig) {
    let mediaBase64;
    let mediaMimetype;
    try {
      const fileKey = extractR2Key2(params.mediaUrl);
      if (!fileKey) {
        throw new Error(`N\xE3o foi poss\xEDvel extrair key do R2 da URL: ${params.mediaUrl}`);
      }
      const media = await getMediaAsBase64(fileKey);
      mediaBase64 = media.base64;
      mediaMimetype = media.mimetype;
    } catch (err) {
      console.error("[sendWhatsAppViewOnceMedia] Erro ao converter para base64:", err);
      throw new Error(`Falha ao preparar m\xEDdia para Evolution API: ${err.message}`);
    }
    const response2 = await fetch(
      `${evolutionConfig.apiUrl}/message/sendMedia/${evolutionConfig.instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: evolutionConfig.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber2(params.to),
          mediatype: params.mediaType,
          media: mediaBase64,
          // base64 puro
          caption: finalCaption || void 0,
          mimetype: mediaMimetype
        })
      }
    );
    if (!response2.ok) {
      const error = await response2.text();
      throw new Error(`Evolution API error: ${response2.status} - ${error}`);
    }
    const result2 = await response2.json();
    await db.insert(messages).values({
      channel: "whatsapp",
      direction: "outbound",
      content: finalCaption,
      messageId: result2?.key?.id || null,
      status: "sent",
      metadata: JSON.stringify({
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        caption: finalCaption,
        viewOnce: true
      })
    });
    return { success: true, messageId: result2?.key?.id || null, to: params.to };
  }
  const { configData } = await getIntegrationConfig("whatsapp_business");
  const token = configData.accessToken;
  const phoneNumberId = configData.phoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp configuration missing accessToken or phoneNumberId"
    );
  }
  const body2 = {
    messaging_product: "whatsapp",
    to: normalizeWhatsAppNumber2(params.to),
    type: params.mediaType,
    [params.mediaType]: {
      link: params.mediaUrl,
      caption: finalCaption,
      animated: false
    },
    ephemeral: true
  };
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body2)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  await ingestOutboundConversationMessage2({
    provider: "whatsapp",
    toNumber: params.to,
    fromUserId: params.senderId ?? 1,
    messageType: params.mediaType,
    messageText: finalCaption,
    mediaUrl: params.mediaUrl,
    mimeType: params.mediaType === "image" ? "image/jpeg" : "video/mp4",
    fileName: params.mediaUrl.split("/").pop() || "media.jpg",
    externalId: result.messages[0].id
  });
  return {
    success: true,
    messageId: result.messages[0].id,
    to: params.to
  };
}
async function getSentMessages(params) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(messages);
  if (params.channel) {
    query = query.where((0, import_drizzle_orm20.eq)(messages.channel, params.channel));
  }
  if (params.customerId) {
    query = query.where((0, import_drizzle_orm20.eq)(messages.customerId, params.customerId));
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  return await query;
}
async function sendReaction(params) {
  const config = await getEvolutionConfig2();
  if (!config) {
    throw new Error("Evolution API configuration not found or incomplete");
  }
  const response = await fetch(
    `${config.apiUrl}/message/sendReaction/${config.instanceName}`,
    {
      method: "POST",
      headers: { apikey: config.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: normalizeWhatsAppNumber2(params.to),
        reactionMessage: {
          key: { id: params.messageId, remoteJid: params.remoteJid },
          reaction: params.emoji
        }
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API sendReaction error: ${response.status} - ${error}`);
  }
  const result = await response.json();
  return result;
}
var import_drizzle_orm20, import_client_s32, s3Client2;
var init_messaging = __esm({
  "server/messaging.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm20 = require("drizzle-orm");
    init_db_messages_outbound();
    import_client_s32 = require("@aws-sdk/client-s3");
    s3Client2 = new import_client_s32.S3Client({
      region: "auto",
      endpoint: "https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "debc3a713faeb6d442dab499221ba42f",
        secretAccessKey: "c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c"
      },
      responseChecksumValidation: "WHEN_REQUIRED",
      requestChecksumCalculation: "WHEN_REQUIRED"
    });
  }
});

// server/workflow-executor.ts
var workflow_executor_exports = {};
__export(workflow_executor_exports, {
  WorkflowExecutor: () => WorkflowExecutor,
  executeWorkflow: () => executeWorkflow
});
async function executeWorkflow(workflowId, triggerData, triggeredBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [workflow] = await db.select().from(visualFlows).where((0, import_drizzle_orm29.eq)(visualFlows.id, workflowId));
  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }
  const flowData = JSON.parse(workflow.flowData);
  const nodes = flowData.nodes || [];
  const edges = flowData.edges || [];
  const executor = new WorkflowExecutor(workflowId, nodes, edges, triggerData);
  return await executor.execute(triggeredBy);
}
var import_drizzle_orm29, WorkflowExecutor;
var init_workflow_executor = __esm({
  "server/workflow-executor.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm29 = require("drizzle-orm");
    init_llm();
    WorkflowExecutor = class {
      context;
      constructor(workflowId, nodes, edges, triggerData) {
        this.context = {
          workflow: { id: workflowId, name: "" },
          execution: { id: 0, mode: "manual" },
          nodes: new Map(nodes.map((n) => [n.id, n])),
          edges,
          nodeOutputs: /* @__PURE__ */ new Map(),
          variables: /* @__PURE__ */ new Map()
        };
        if (triggerData) {
          this.context.variables.set("trigger", triggerData);
        }
      }
      /**
       * Execute entire workflow
       */
      async execute(triggeredBy) {
        const startTime = Date.now();
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [execution] = await db.insert(workflowExecutions).values({
          workflowId: this.context.workflow.id,
          status: "running",
          mode: "manual",
          triggeredBy,
          triggerData: JSON.stringify(this.context.variables.get("trigger") || {})
        });
        this.context.execution.id = execution.insertId;
        try {
          const startNode = Array.from(this.context.nodes.values()).find(
            (n) => n.type === "trigger" || n.data.config.trigger
          );
          if (!startNode) {
            throw new Error("No trigger node found");
          }
          await this.executeNode(startNode.id);
          const executionTime = Date.now() - startTime;
          const dbUpdate = await getDb();
          if (!dbUpdate) throw new Error("Database not available");
          await dbUpdate.update(workflowExecutions).set({
            status: "success",
            finishedAt: /* @__PURE__ */ new Date(),
            executionTime
          }).where((0, import_drizzle_orm29.eq)(workflowExecutions.id, this.context.execution.id));
          return { success: true, executionId: this.context.execution.id };
        } catch (error) {
          const executionTime = Date.now() - startTime;
          const dbError = await getDb();
          if (!dbError) throw new Error("Database not available");
          await dbError.update(workflowExecutions).set({
            status: "error",
            finishedAt: /* @__PURE__ */ new Date(),
            executionTime,
            error: error.message
          }).where((0, import_drizzle_orm29.eq)(workflowExecutions.id, this.context.execution.id));
          return {
            success: false,
            executionId: this.context.execution.id,
            error: error.message
          };
        }
      }
      /**
       * Execute single node with retry logic
       */
      async executeNode(nodeId, retryCount = 0) {
        const node = this.context.nodes.get(nodeId);
        if (!node) return;
        const startTime = Date.now();
        const maxRetries = node.data.config.retryOnFail ? node.data.config.maxRetries || 3 : 0;
        try {
          const inputData = this.getNodeInputData(nodeId);
          const result = await this.executeNodeByType(node, inputData);
          if (!result.success) {
            throw new Error(result.error || "Node execution failed");
          }
          this.context.nodeOutputs.set(nodeId, result.data);
          const executionTime = Date.now() - startTime;
          const dbLog = await getDb();
          if (!dbLog) throw new Error("Database not available");
          await dbLog.insert(executionData).values({
            executionId: this.context.execution.id,
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.type,
            status: "success",
            startedAt: new Date(startTime),
            finishedAt: /* @__PURE__ */ new Date(),
            executionTime,
            inputData: JSON.stringify(inputData),
            outputData: JSON.stringify(result.data),
            retryCount
          });
          await this.executeNextNodes(nodeId, result.data);
        } catch (error) {
          if (retryCount < maxRetries) {
            console.log(
              `[Workflow Executor] Retrying node ${node.data.label} (attempt ${retryCount + 1}/${maxRetries})`
            );
            await new Promise(
              (resolve) => setTimeout(resolve, 1e3 * (retryCount + 1))
            );
            return this.executeNode(nodeId, retryCount + 1);
          }
          const executionTime = Date.now() - startTime;
          const dbFail = await getDb();
          if (!dbFail) throw new Error("Database not available");
          await dbFail.insert(executionData).values({
            executionId: this.context.execution.id,
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.type,
            status: "error",
            startedAt: new Date(startTime),
            finishedAt: /* @__PURE__ */ new Date(),
            executionTime,
            inputData: JSON.stringify(this.getNodeInputData(nodeId)),
            error: error.message,
            retryCount
          });
          if (!node.data.config.continueOnFail) {
            throw error;
          }
          console.log(
            `[Workflow Executor] Node ${node.data.label} failed but continuing: ${error.message}`
          );
        }
      }
      /**
       * Execute node based on its type
       */
      async executeNodeByType(node, inputData) {
        const config = node.data.config;
        switch (node.type) {
          case "trigger":
            return {
              success: true,
              data: this.context.variables.get("trigger") || {}
            };
          case "message":
            return {
              success: true,
              data: { message: this.resolveExpression(config.message, inputData) }
            };
          case "condition":
          case "if":
            const condition = this.evaluateCondition(config, inputData);
            return {
              success: true,
              data: { result: condition, path: condition ? "true" : "false" }
            };
          case "ai":
          case "aiAssistant":
            return await this.executeAINode(config, inputData);
          case "http":
          case "httpRequest":
            return await this.executeHTTPNode(config, inputData);
          case "database":
          case "dbQuery":
            return await this.executeDatabaseNode(config, inputData);
          case "function":
          case "code":
            if (config.function === "get_greeting") {
              return this.executeGreetingFunction(config, inputData);
            }
            return await this.executeFunctionNode(config, inputData);
          case "set":
            return this.executeSetNode(config, inputData);
          case "split":
          case "splitInBatches":
            return this.executeSplitNode(config, inputData);
          case "merge":
            return this.executeMergeNode(config, inputData);
          case "loop":
          case "loopOverItems":
            return await this.executeLoopNode(node, config, inputData);
          case "switch":
            return this.executeSwitchNode(config, inputData);
          case "wait":
          case "delay":
            return await this.executeWaitNode(config);
          case "transfer":
          case "transferHuman":
            return {
              success: true,
              data: { transferred: true, department: config.department }
            };
          default:
            console.log(`[Workflow Executor] Unknown node type: ${node.type}`);
            return { success: true, data: inputData };
        }
      }
      /**
       * Execute AI Assistant node
       */
      async executeAINode(config, inputData) {
        try {
          const prompt = this.resolveExpression(
            config.prompt || config.systemPrompt,
            inputData
          );
          const userMessage = this.resolveExpression(
            config.userMessage || inputData.message || "",
            inputData
          );
          const response = await invokeLLM({
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: userMessage }
            ]
          });
          const aiResponse = response.choices[0]?.message?.content || "";
          return { success: true, data: { response: aiResponse, raw: response } };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute HTTP Request node
       */
      async executeHTTPNode(config, inputData) {
        try {
          const url = this.resolveExpression(config.url, inputData);
          const method = config.method || "GET";
          const headers = config.headers || {};
          const body2 = config.body ? this.resolveExpression(config.body, inputData) : void 0;
          const options = {
            method,
            headers: this.resolveObject(headers, inputData)
          };
          if (body2 && method !== "GET") {
            options.body = typeof body2 === "string" ? body2 : JSON.stringify(body2);
          }
          const response = await fetch(url, options);
          const data = await response.json();
          return {
            success: response.ok,
            data: {
              statusCode: response.status,
              body: data,
              headers: Object.fromEntries(response.headers.entries())
            },
            error: response.ok ? void 0 : `HTTP ${response.status}: ${response.statusText}`
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute Database Query node
       */
      async executeDatabaseNode(config, inputData) {
        try {
          const query = this.resolveExpression(config.query, inputData);
          const dbQuery = await getDb();
          if (!dbQuery) throw new Error("Database not available");
          const result = await dbQuery.execute(query);
          return { success: true, data: { rows: result, count: result.length } };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute greeting function - returns appropriate greeting based on time
       */
      executeGreetingFunction(config, inputData) {
        try {
          const hour = (/* @__PURE__ */ new Date()).getHours();
          let greeting = "Bom dia";
          if (hour >= 12 && hour < 18) {
            greeting = "Boa tarde";
          } else if (hour >= 18) {
            greeting = "Boa noite";
          }
          const agentName = inputData.agent_name || inputData.assignedToName || "Atendente";
          return {
            success: true,
            data: {
              greeting,
              agent_name: agentName,
              hour
            }
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute Function/Code node - runs JavaScript
       */
      async executeFunctionNode(config, inputData) {
        try {
          const code = config.code || config.functionCode || "";
          const $input = inputData;
          const $json = inputData;
          const $vars = Object.fromEntries(this.context.variables);
          const AsyncFunction = Object.getPrototypeOf(async function() {
            return void 0;
          }).constructor;
          const fn = new AsyncFunction("$input", "$json", "$vars", code);
          const result = await fn($input, $json, $vars);
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute Set node - manipulate data
       */
      executeSetNode(config, inputData) {
        try {
          const output = { ...inputData };
          if (config.values) {
            for (const item of config.values) {
              const key = item.name || item.key;
              const value = this.resolveExpression(item.value, inputData);
              output[key] = value;
            }
          }
          if (config.removeFields) {
            for (const field of config.removeFields) {
              delete output[field];
            }
          }
          return Promise.resolve({ success: true, data: output });
        } catch (error) {
          return Promise.resolve({ success: false, error: error.message });
        }
      }
      /**
       * Execute Split node - split array into batches
       */
      executeSplitNode(config, inputData) {
        try {
          const array = Array.isArray(inputData) ? inputData : inputData.items || [];
          const batchSize = config.batchSize || 10;
          const batches = [];
          for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
          }
          return Promise.resolve({
            success: true,
            data: { batches, count: batches.length }
          });
        } catch (error) {
          return Promise.resolve({ success: false, error: error.message });
        }
      }
      /**
       * Execute Merge node - combine multiple inputs
       */
      executeMergeNode(config, inputData) {
        try {
          const inputs = Array.from(this.context.nodeOutputs.values());
          const mode = config.mode || "append";
          let result;
          if (mode === "append") {
            result = inputs.flat();
          } else if (mode === "merge") {
            result = Object.assign({}, ...inputs);
          } else {
            result = inputs;
          }
          return Promise.resolve({ success: true, data: result });
        } catch (error) {
          return Promise.resolve({ success: false, error: error.message });
        }
      }
      /**
       * Execute Loop node - iterate over items
       */
      async executeLoopNode(node, config, inputData) {
        try {
          const items = Array.isArray(inputData) ? inputData : inputData.items || [];
          const results = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            this.context.variables.set("loop", {
              index: i,
              item,
              total: items.length
            });
            const loopOutput = await this.processLoopIteration(node.id, item);
            results.push(loopOutput);
          }
          return { success: true, data: results };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      /**
       * Execute Switch node - multiple conditional paths
       */
      executeSwitchNode(config, inputData) {
        try {
          const value = this.resolveExpression(config.value, inputData);
          const cases = config.cases || [];
          for (const caseItem of cases) {
            if (caseItem.value === value || caseItem.condition === value) {
              return Promise.resolve({
                success: true,
                data: { matched: caseItem.value, path: caseItem.output }
              });
            }
          }
          return Promise.resolve({
            success: true,
            data: { matched: "default", path: "default" }
          });
        } catch (error) {
          return Promise.resolve({ success: false, error: error.message });
        }
      }
      /**
       * Execute Wait/Delay node
       */
      async executeWaitNode(config) {
        const delay = config.delay || config.amount || 1e3;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return { success: true, data: { waited: delay } };
      }
      /**
       * Get input data for a node from previous nodes
       */
      getNodeInputData(nodeId) {
        const incomingEdges = this.context.edges.filter((e) => e.target === nodeId);
        if (incomingEdges.length === 0) {
          return this.context.variables.get("trigger") || {};
        }
        if (incomingEdges.length === 1) {
          const sourceId = incomingEdges[0].source;
          return this.context.nodeOutputs.get(sourceId) || {};
        }
        const inputs = incomingEdges.map(
          (e) => this.context.nodeOutputs.get(e.source) || {}
        );
        return Object.assign({}, ...inputs);
      }
      /**
       * Execute next nodes after current node
       */
      async executeNextNodes(currentNodeId, outputData) {
        const outgoingEdges = this.context.edges.filter(
          (e) => e.source === currentNodeId
        );
        for (const edge of outgoingEdges) {
          if (edge.sourceHandle) {
            const shouldExecute = edge.sourceHandle === outputData.path || edge.sourceHandle === (outputData.result ? "true" : "false");
            if (!shouldExecute) continue;
          }
          await this.executeNode(edge.target);
        }
      }
      /**
       * Process single loop iteration
       */
      async processLoopIteration(loopNodeId, item) {
        const loopEdges = this.context.edges.filter((e) => e.source === loopNodeId);
        if (loopEdges.length === 0) return item;
        const firstNodeId = loopEdges[0].target;
        this.context.nodeOutputs.set(loopNodeId, item);
        await this.executeNode(firstNodeId);
        return this.context.nodeOutputs.get(firstNodeId) || item;
      }
      /**
       * Evaluate condition
       */
      evaluateCondition(config, inputData) {
        try {
          if (config.condition === "working_hours") {
            return this.checkWorkingHours(config.schedule);
          }
          if (config.condition === "agent_logged_in") {
            return this.checkAgentLoggedIn(inputData);
          }
          if (config.condition?.includes("close_reason")) {
            const closeReason = inputData.close_reason || inputData.closeReason;
            const expectedReason = config.condition.split("==")[1]?.trim().replace(/"/g, "");
            return closeReason === expectedReason;
          }
          const left = this.resolveExpression(
            config.value1 || config.left,
            inputData
          );
          const operator = config.operator || config.comparison || "equals";
          const right = this.resolveExpression(
            config.value2 || config.right,
            inputData
          );
          switch (operator) {
            case "equals":
            case "===":
              return left === right;
            case "notEquals":
            case "!==":
              return left !== right;
            case "contains":
              return String(left).includes(String(right));
            case "notContains":
              return !String(left).includes(String(right));
            case "startsWith":
              return String(left).startsWith(String(right));
            case "endsWith":
              return String(left).endsWith(String(right));
            case "greater":
            case ">":
              return Number(left) > Number(right);
            case "greaterOrEquals":
            case ">=":
              return Number(left) >= Number(right);
            case "less":
            case "<":
              return Number(left) < Number(right);
            case "lessOrEquals":
            case "<=":
              return Number(left) <= Number(right);
            case "regex":
              return new RegExp(String(right)).test(String(left));
            case "isEmpty":
              return !left || left === "" || Array.isArray(left) && left.length === 0;
            case "isNotEmpty":
              return !!left && left !== "" && (!Array.isArray(left) || left.length > 0);
            default:
              return false;
          }
        } catch (error) {
          console.error("[Workflow Executor] Condition evaluation error:", error);
          return false;
        }
      }
      /**
       * Check if current time is within working hours
       * Mon-Sat: 08:00-19:40
       * Sun/Holidays: 08:00-11:40
       */
      checkWorkingHours(schedule) {
        const now = /* @__PURE__ */ new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;
        const monSatStart = schedule?.mon_sat?.start || "08:00";
        const monSatEnd = schedule?.mon_sat?.end || "19:40";
        const sunHolidayStart = schedule?.sun_holiday?.start || "08:00";
        const sunHolidayEnd = schedule?.sun_holiday?.end || "11:40";
        const parseTime = (timeStr) => {
          const [h, m] = timeStr.split(":").map(Number);
          return h * 60 + m;
        };
        const isSundayOrHoliday = day === 0;
        if (isSundayOrHoliday) {
          const start = parseTime(sunHolidayStart);
          const end = parseTime(sunHolidayEnd);
          return currentTime >= start && currentTime <= end;
        } else {
          const start = parseTime(monSatStart);
          const end = parseTime(monSatEnd);
          return currentTime >= start && currentTime <= end;
        }
      }
      /**
       * Check if agent is logged in
       */
      checkAgentLoggedIn(inputData) {
        return !!(inputData.assignedTo || inputData.agent_id || inputData.agent_name);
      }
      /**
       * Resolve expression with variables ({{$json.field}}, {{$node["Name"].json}})
       */
      resolveExpression(expression, inputData) {
        if (typeof expression !== "string") return expression;
        let resolved = expression.replace(/\{\{([^}]+)\}\}/g, (match, path2) => {
          path2 = path2.trim();
          if (path2.startsWith("$json")) {
            const field = path2.substring(6);
            return this.getNestedValue(inputData, field);
          }
          if (path2.startsWith("$input")) {
            const field = path2.substring(7);
            return this.getNestedValue(inputData, field);
          }
          if (path2.startsWith("$node")) {
            const nodeMatch = path2.match(/\$node\["([^"]+)"\]\.json\.?(.*)/);
            if (nodeMatch) {
              const nodeName = nodeMatch[1];
              const field = nodeMatch[2];
              const node = Array.from(this.context.nodes.values()).find(
                (n) => n.data.label === nodeName
              );
              if (node) {
                const nodeOutput = this.context.nodeOutputs.get(node.id);
                return field ? this.getNestedValue(nodeOutput, field) : nodeOutput;
              }
            }
          }
          if (path2.startsWith("$vars")) {
            const field = path2.substring(6);
            return this.context.variables.get(field);
          }
          return match;
        });
        return resolved;
      }
      /**
       * Resolve object with expressions
       */
      resolveObject(obj, inputData) {
        const resolved = {};
        for (const [key, value] of Object.entries(obj)) {
          resolved[key] = this.resolveExpression(value, inputData);
        }
        return resolved;
      }
      /**
       * Get nested value from object (e.g., "user.name")
       */
      getNestedValue(obj, path2) {
        if (!path2 || path2 === ".") return obj;
        const keys = path2.split(".").filter((k) => k);
        let value = obj;
        for (const key of keys) {
          if (value && typeof value === "object" && key in value) {
            value = value[key];
          } else {
            return void 0;
          }
        }
        return value;
      }
    };
  }
});

// server/debug.ts
var debug_exports = {};
__export(debug_exports, {
  addLog: () => addLog,
  clearLogs: () => clearLogs,
  default: () => debug_default,
  getLogs: () => getLogs,
  webhookLogger: () => webhookLogger
});
function addLog(level, category, message2, data) {
  const log = {
    timestamp: /* @__PURE__ */ new Date(),
    level,
    category,
    message: message2,
    data
  };
  logs.push(log);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  console.log(`[${level.toUpperCase()}] [${category}]`, message2, data || "");
}
function getLogs() {
  return [...logs];
}
function clearLogs() {
  logs.length = 0;
}
function webhookLogger(req, res, next) {
  console.log(`[WEBHOOK] ${req.method} ${req.url}`);
  next();
}
var logs, MAX_LOGS, debug_default;
var init_debug = __esm({
  "server/debug.ts"() {
    "use strict";
    logs = [];
    MAX_LOGS = 100;
    debug_default = {
      addLog,
      getLogs,
      clearLogs,
      webhookLogger
    };
  }
});

// server/services/media-validator.ts
var media_validator_exports = {};
__export(media_validator_exports, {
  calculateContentMD5: () => calculateContentMD5,
  calculateSHA256: () => calculateSHA256,
  downloadWithValidation: () => downloadWithValidation,
  isInstagramCdnUrl: () => isInstagramCdnUrl,
  isWhatsAppCdnUrl: () => isWhatsAppCdnUrl,
  validateMediaBuffer: () => validateMediaBuffer
});
function validateMediaBuffer(buffer, expectedMimeType) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Buffer vazio");
  }
  const detectedMime = detectMimeFromMagicBytes(buffer);
  if (expectedMimeType && detectedMime !== expectedMimeType) {
    console.warn(`[MediaValidator] MIME mismatch: expected ${expectedMimeType}, detected ${detectedMime}`);
  }
  const minSize = MIN_SIZES[detectedMime] || 50;
  if (buffer.length < minSize) {
    throw new Error(`Arquivo muito pequeno (${buffer.length} bytes) para ${detectedMime}, m\xEDnimo ${minSize}`);
  }
  const md5 = import_crypto2.default.createHash("md5").update(buffer).digest("hex");
  const sha256 = import_crypto2.default.createHash("sha256").update(buffer).digest("hex");
  const extension = EXTENSION_MAP[detectedMime] || "bin";
  return {
    buffer,
    mimeType: detectedMime,
    fileSize: buffer.length,
    sha256,
    md5,
    extension
  };
}
function detectMimeFromMagicBytes(buffer) {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(sig)) {
        return mime;
      }
    }
  }
  return "application/octet-stream";
}
function isWhatsAppCdnUrl(url) {
  return url.includes("mmg.whatsapp.net") || url.includes("pps.whatsapp.net") || url.includes("whatsapp.net") || url.includes("whatsapp.com");
}
function isInstagramCdnUrl(url) {
  return url.includes("fbcdn.net") || url.includes("scontent") || url.includes("instagram.com") || url.includes("ig.gg") || url.includes("cdninstagram.com");
}
async function downloadWithValidation(url, options = {}) {
  const { expectedMimeType, maxRetries = 3, timeoutMs = 3e4 } = options;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "FarmaFrancisBot/1.0",
          "Accept": "*/*"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentLength = response.headers.get("content-length");
      const expectedSize = contentLength ? parseInt(contentLength, 10) : null;
      const responseMime = response.headers.get("content-type")?.split(";")[0]?.trim();
      const mimeToValidate = expectedMimeType || responseMime || void 0;
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (expectedSize && buffer.length !== expectedSize) {
        throw new Error(`Tamanho incompleto: esperado ${expectedSize}, recebido ${buffer.length}`);
      }
      return validateMediaBuffer(buffer, mimeToValidate);
    } catch (err) {
      lastError = err;
      console.warn(`[MediaValidator] Tentativa ${attempt}/${maxRetries} falhou: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = 1e3 * attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error("Download falhou ap\xF3s todas as tentativas");
}
function calculateContentMD5(buffer) {
  return import_crypto2.default.createHash("md5").update(buffer).digest("base64");
}
function calculateSHA256(buffer) {
  return import_crypto2.default.createHash("sha256").update(buffer).digest("hex");
}
var import_crypto2, MAGIC_BYTES, MIN_SIZES, EXTENSION_MAP;
var init_media_validator = __esm({
  "server/services/media-validator.ts"() {
    "use strict";
    import_crypto2 = __toESM(require("crypto"), 1);
    MAGIC_BYTES = {
      "image/jpeg": [new Uint8Array([255, 216, 255])],
      "image/png": [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "image/webp": [
        new Uint8Array([82, 73, 70, 70]),
        // RIFF
        new Uint8Array([87, 69, 66, 80])
        // WEBP
      ],
      "video/mp4": [new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])],
      // ftyp
      "video/quicktime": [new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112])],
      "audio/mpeg": [
        new Uint8Array([73, 68, 51]),
        // ID3
        new Uint8Array([255, 251])
        // MP3 frame
      ],
      "audio/ogg": [new Uint8Array([79, 103, 103, 83])],
      // OggS
      "audio/aac": [new Uint8Array([255, 241])],
      // ADTS
      "application/pdf": [new Uint8Array([37, 80, 68, 70])],
      // %PDF
      "application/zip": [new Uint8Array([80, 75, 3, 4])]
      // PK
    };
    MIN_SIZES = {
      "image/jpeg": 100,
      "image/png": 100,
      "image/webp": 100,
      "video/mp4": 1e3,
      "video/quicktime": 1e3,
      "audio/mpeg": 500,
      "audio/ogg": 500,
      "audio/aac": 500,
      "application/pdf": 100
    };
    EXTENSION_MAP = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/quicktime": "mov",
      "audio/mpeg": "mp3",
      "audio/ogg": "ogg",
      "audio/aac": "aac",
      "application/pdf": "pdf",
      "application/zip": "zip"
    };
  }
});

// server/services/evolution-download.ts
var evolution_download_exports = {};
__export(evolution_download_exports, {
  downloadGenericMedia: () => downloadGenericMedia,
  downloadStoryMedia: () => downloadStoryMedia,
  downloadWhatsAppMediaFromEvolution: () => downloadWhatsAppMediaFromEvolution,
  downloadWithValidation: () => downloadWithValidation,
  getStoryMediaViaBase64: () => getStoryMediaViaBase64,
  isWhatsAppCdnUrl: () => isWhatsAppCdnUrl
});
async function getEvolutionConfig3() {
  try {
    const db = await getDb();
    if (!db) return null;
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm50.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    if (!config) return null;
    const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
    const apiUrl = configData.apiUrl?.replace(/\/$/, "");
    const apiKey = configData.apiKey || configData.accessToken || configData.token;
    const instanceName = configData.instanceName || configData.instance || "Meu";
    if (!apiUrl || !apiKey || !instanceName) return null;
    return { apiUrl, apiKey, instanceName };
  } catch (err) {
    console.error("[Evolution Config] Error:", err);
    return null;
  }
}
async function getStoryMediaViaBase64(stanzaId, participant, quotedMessage2, instanceName) {
  try {
    const config = await getEvolutionConfig3();
    if (!config) {
      console.log("[StoryMedia] \u274C No Evolution API config found");
      return null;
    }
    const apiUrl = config.apiUrl;
    const apiKey = config.apiKey;
    const inst = instanceName || config.instanceName;
    const endpoints = [
      `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
      `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`
    ];
    const payload = {
      message: {
        key: {
          remoteJid: "status@broadcast",
          id: stanzaId,
          fromMe: true,
          participant
        },
        message: quotedMessage2
      }
    };
    for (const endpoint of endpoints) {
      try {
        console.log(`[StoryMedia] \u{1F4E4} Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
            "instance": inst
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3e4)
        });
        console.log(`[StoryMedia] \u{1F4E5} Response status: ${response.status}`);
        if (response.ok) {
          const result = await response.json();
          console.log("[StoryMedia] \u{1F4E5} Response keys:", Object.keys(result));
          if (result?.base64) {
            const base64Str = typeof result.base64 === "string" ? result.base64 : JSON.stringify(result.base64);
            const buffer = Buffer.from(base64Str, "base64");
            console.log(`[StoryMedia] \u2705 Buffer: ${buffer.length} bytes`);
            return buffer;
          }
          if (result?.url || result?.mediaUrl) {
            const mediaUrl = result.url || result.mediaUrl;
            console.log(`[StoryMedia] \u{1F504} Fetching from URL: ${mediaUrl.substring(0, 80)}`);
            const mediaResponse = await fetch(mediaUrl, {
              signal: AbortSignal.timeout(15e3)
            });
            if (mediaResponse.ok) {
              const arrayBuffer = await mediaResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              console.log(`[StoryMedia] \u2705 Buffer from URL: ${buffer.length} bytes`);
              return buffer;
            }
          }
        }
      } catch (err) {
        console.log(`[StoryMedia] \u26A0\uFE0F Endpoint ${endpoint} failed: ${err}`);
      }
    }
    if (quotedMessage2.imageMessage?.jpegThumbnail) {
      console.log("[StoryMedia] \u{1F4CE} Using jpegThumbnail fallback");
      const thumbBase64 = quotedMessage2.imageMessage.jpegThumbnail;
      const buffer = typeof thumbBase64 === "string" ? Buffer.from(thumbBase64, "base64") : Buffer.from(Object.values(thumbBase64));
      console.log(`[StoryMedia] \u2705 Thumbnail buffer: ${buffer.length} bytes`);
      return buffer;
    }
    console.log("[StoryMedia] \u274C All endpoints failed");
    return null;
  } catch (err) {
    console.error("[StoryMedia] \u274C Error:", err);
    return null;
  }
}
async function downloadWhatsAppMediaFromEvolution(params) {
  console.log("\u{1F6A8} [Evolution Download] IN\xCDCIO - params:", {
    hasUrl: !!params.url && params.url.length > 0,
    urlPreview: params.url?.substring(0, 60),
    hasMessageKey: !!params.messageKey,
    messageKeyId: params.messageKey?.id,
    messageKeyRemoteJid: params.messageKey?.remoteJid,
    hasMediaKey: !!params.mediaKey,
    hasDirectPath: !!params.directPath
  });
  try {
    const config = await getEvolutionConfig3();
    if (!config) {
      console.log("\u{1F6A8} [Evolution Download] No Evolution API config found");
      return null;
    }
    const apiUrl = config.apiUrl;
    const apiKey = config.apiKey;
    const instanceName = config.instanceName;
    console.log("\u{1F6A8} [Evolution Download] Config OK, attempting download...");
    if (params.url && params.url.length > 0) {
      console.log("\u{1F6A8} [Evolution Download] Trying fetchImage endpoint...");
      const fetchImageUrl = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
      const fetchResponse = await fetch(fetchImageUrl, {
        method: "POST",
        headers: {
          "apikey": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: params.url })
      });
      console.log("\u{1F6A8} [Evolution Download] fetchImage response status:", fetchResponse.status);
      if (fetchResponse.ok) {
        const arrayBuffer2 = await fetchResponse.arrayBuffer();
        const buffer2 = Buffer.from(arrayBuffer2);
        console.log("\u{1F6A8} [Evolution Download] fetchImage success, size:", buffer2.length);
        if (buffer2.length > 0) {
          return buffer2;
        }
      } else {
        const errorText = await fetchResponse.text();
        console.log("\u{1F6A8} [Evolution Download] fetchImage failed:", fetchResponse.status, errorText.substring(0, 200));
      }
    } else {
      console.log("\u{1F6A8} [Evolution Download] No URL provided, skipping fetchImage");
    }
    const downloadUrl = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    console.log("\u{1F6A8} [Evolution Download] Trying getBase64FromMediaMessage endpoint:", downloadUrl);
    const downloadResponse = await fetch(downloadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey
      },
      body: JSON.stringify({
        message: {
          key: params.messageKey
        }
      })
    });
    console.log("\u{1F6A8} [Evolution Download] message/download response status:", downloadResponse.status);
    if (!downloadResponse.ok) {
      console.log("\u{1F6A8} [Evolution Download] Both endpoints failed:", {
        fetchImageStatus: params.url ? "attempted" : "skipped (no url)",
        downloadMediaStatus: downloadResponse.status
      });
      const errorBody = await downloadResponse.text();
      console.log("\u{1F6A8} [Evolution Download] Error body:", errorBody.substring(0, 300));
      return null;
    }
    const data = await downloadResponse.json();
    console.log("\u{1F6A8} [Evolution Download] message/download response data keys:", Object.keys(data));
    const mediaUrl = data?.url || data?.mediaUrl || null;
    if (!mediaUrl) {
      console.log("\u{1F6A8} [Evolution Download] \u274C No URL in download response");
      return null;
    }
    console.log("\u{1F6A8} [Evolution Download] Got media URL:", mediaUrl.substring(0, 80));
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"'
      }
    });
    if (!mediaResponse.ok) {
      console.log("\u{1F6A8} [Evolution Download] Failed to fetch media from returned URL:", mediaResponse.status);
      return null;
    }
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("\u{1F6A8} [Evolution Download] Media fetch success, size:", buffer.length);
    return buffer;
  } catch (error) {
    console.error("\u{1F6A8} [Evolution Download] Unexpected error:", error);
    return null;
  }
}
async function downloadGenericMedia(url, options = {}) {
  try {
    const validated = await downloadWithValidation(url, options);
    return validated.buffer;
  } catch (error) {
    console.error("[Generic Download] Failed:", error);
    return null;
  }
}
async function downloadStoryMedia(contextInfo, messageId, instanceName) {
  console.log("[downloadStoryMedia] Attempting to download story media:", {
    stanzaId: contextInfo.stanzaId,
    participant: contextInfo.participant,
    messageId
  });
  if (!contextInfo) {
    console.log("[downloadStoryMedia] \u274C Missing contextInfo");
    return null;
  }
  const { stanzaId, participant, quotedMessage: quotedMessage2 } = contextInfo;
  const config = await getEvolutionConfig3();
  if (!config) {
    console.log("[downloadStoryMedia] \u274C No Evolution API config found");
    return null;
  }
  const apiUrl = config.apiUrl;
  const apiKey = config.apiKey;
  const inst = instanceName || config.instanceName;
  if (quotedMessage2?.imageMessage?.url || quotedMessage2?.videoMessage?.url) {
    const directUrl = quotedMessage2.imageMessage?.url || quotedMessage2.videoMessage?.url;
    const isImage = !!quotedMessage2.imageMessage;
    const mimeType = isImage ? "image/jpeg" : "video/mp4";
    console.log("[downloadStoryMedia] \u{1F4E4} Tentativa 0: Download direto da URL:", directUrl.substring(0, 80));
    try {
      const proxyResponse = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${inst}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ url: directUrl }),
        signal: AbortSignal.timeout(2e4)
      });
      console.log("[downloadStoryMedia] \u{1F4E5} Proxy response status:", proxyResponse.status);
      if (proxyResponse.ok) {
        const arrayBuffer = await proxyResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 0) {
          console.log("[downloadStoryMedia] \u2705 Tentativa 0 sucesso: " + buffer.length + " bytes");
          return { buffer, mimetype: mimeType };
        }
      }
    } catch (err) {
      console.log("[downloadStoryMedia] \u26A0\uFE0F Tentativa 0 falhou:", err);
    }
  }
  if (quotedMessage2 && (quotedMessage2.imageMessage || quotedMessage2.videoMessage)) {
    console.log("[downloadStoryMedia] \u{1F4E4} Tentativa 1: getBase64FromMediaMessage com quotedMessage");
    try {
      const payload = {
        message: {
          key: {
            remoteJid: "status@broadcast",
            id: stanzaId,
            fromMe: true,
            participant
          },
          message: quotedMessage2
        }
      };
      const endpoints = [
        `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`,
        `${apiUrl}/chat/getBase64FromMediaMessage/${inst}`
      ];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey,
              "instance": inst
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3e4)
          });
          console.log(`[downloadStoryMedia] \u{1F4E5} ${endpoint} status: ${response.status}`);
          if (response.ok) {
            const result = await response.json();
            console.log("[downloadStoryMedia] \u{1F4E5} Response keys:", Object.keys(result));
            if (result?.base64) {
              const base64Str = typeof result.base64 === "string" ? result.base64 : JSON.stringify(result.base64);
              const buffer = Buffer.from(base64Str, "base64");
              const isImage = !!quotedMessage2.imageMessage;
              const mimeType = isImage ? "image/jpeg" : "video/mp4";
              console.log(`[downloadStoryMedia] \u2705 Tentativa 1 sucesso: ${buffer.length} bytes`);
              return { buffer, mimetype: mimeType };
            }
            if (result?.url || result?.mediaUrl) {
              const mediaUrl = result.url || result.mediaUrl;
              console.log(`[downloadStoryMedia] \u{1F504} Fetching from returned URL: ${mediaUrl.substring(0, 80)}`);
              const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(15e3) });
              if (mediaResponse.ok) {
                const arrayBuffer = await mediaResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const isImage = !!quotedMessage2.imageMessage;
                const mimeType = isImage ? "image/jpeg" : "video/mp4";
                console.log(`[downloadStoryMedia] \u2705 Tentativa 1 via URL: ${buffer.length} bytes`);
                return { buffer, mimetype: mimeType };
              }
            }
          }
        } catch (err) {
          console.log(`[downloadStoryMedia] \u26A0\uFE0F Endpoint ${endpoint} failed: ${err}`);
        }
      }
    } catch (err) {
      console.log("[downloadStoryMedia] \u26A0\uFE0F Tentativa 1 falhou:", err);
    }
  }
  if (stanzaId && participant) {
    console.log("[downloadStoryMedia] \u{1F4E4} Tentativa 2: getMessageById via stanzaId");
    try {
      const msgResponse = await fetch(
        `${apiUrl}/chat/getMessageById/${inst}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey
          },
          body: JSON.stringify({
            message: {
              key: {
                remoteJid: "status@broadcast",
                id: stanzaId,
                fromMe: true,
                participant
              }
            }
          })
        }
      );
      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        console.log("[downloadStoryMedia] \u{1F4E5} getMessageById response:", Object.keys(msgData));
        if (msgData?.message) {
          const fullMessage = msgData.message;
          if (fullMessage.imageMessage || fullMessage.videoMessage) {
            const payload = {
              message: {
                key: {
                  remoteJid: "status@broadcast",
                  id: stanzaId,
                  fromMe: true,
                  participant
                },
                message: fullMessage
              }
            };
            const endpoints = [
              `${apiUrl}/chat/getBase64FromMediaMessage`,
              `${apiUrl}/api/chat/getBase64FromMediaMessage`
            ];
            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey,
                    "instance": inst
                  },
                  body: JSON.stringify(payload),
                  signal: AbortSignal.timeout(3e4)
                });
                if (response.ok) {
                  const result = await response.json();
                  if (result?.base64) {
                    const base64Str = typeof result.base64 === "string" ? result.base64 : JSON.stringify(result.base64);
                    const buffer = Buffer.from(base64Str, "base64");
                    const isImage = !!fullMessage.imageMessage;
                    const mimeType = isImage ? "image/jpeg" : "video/mp4";
                    console.log(`[downloadStoryMedia] \u2705 Tentativa 2 sucesso: ${buffer.length} bytes`);
                    return { buffer, mimetype: mimeType };
                  }
                  if (result?.url || result?.mediaUrl) {
                    const mediaUrl = result.url || result.mediaUrl;
                    const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(15e3) });
                    if (mediaResponse.ok) {
                      const arrayBuffer = await mediaResponse.arrayBuffer();
                      const buffer = Buffer.from(arrayBuffer);
                      const isImage = !!fullMessage.imageMessage;
                      const mimeType = isImage ? "image/jpeg" : "video/mp4";
                      console.log(`[downloadStoryMedia] \u2705 Tentativa 2 via URL: ${buffer.length} bytes`);
                      return { buffer, mimetype: mimeType };
                    }
                  }
                }
              } catch (err) {
                console.log(`[downloadStoryMedia] \u26A0\uFE0F Endpoint ${endpoint} failed: ${err}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log("[downloadStoryMedia] \u26A0\uFE0F Tentativa 2 falhou:", err);
    }
  }
  const thumbnail = quotedMessage2?.imageMessage?.jpegThumbnail || quotedMessage2?.videoMessage?.jpegThumbnail;
  if (thumbnail) {
    console.log("[downloadStoryMedia] \u{1F4CE} Tentativa 3: Usando jpegThumbnail fallback");
    try {
      const buffer = typeof thumbnail === "string" ? Buffer.from(thumbnail, "base64") : Buffer.from(Object.values(thumbnail));
      console.log(`[downloadStoryMedia] \u2705 Thumbnail buffer: ${buffer.length} bytes`);
      return { buffer, mimetype: "image/jpeg", isThumbnail: true };
    } catch (error) {
      console.log("[downloadStoryMedia] \u26A0\uFE0F Thumbnail fallback falhou:", error);
    }
  }
  console.log("[downloadStoryMedia] \u274C Todas as tentativas falharam");
  return null;
}
var import_drizzle_orm50;
var init_evolution_download = __esm({
  "server/services/evolution-download.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm50 = require("drizzle-orm");
    init_media_validator();
    init_media_validator();
  }
});

// server/_core/routes/system.ts
var system_exports = {};
__export(system_exports, {
  default: () => system_default
});
function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autentica\xE7\xE3o requerido" });
    }
    const token = authHeader.substring(7).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      return res.status(500).json({ error: "Configura\xE7\xE3o inv\xE1lida: JWT_SECRET" });
    }
    try {
      const decoded = import_jsonwebtoken4.default.verify(token, secret);
      if (decoded.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado: requer permiss\xE3o de admin" });
      }
      next();
    } catch {
      return res.status(401).json({ error: "Token inv\xE1lido ou expirado" });
    }
  } catch {
    return res.status(401).json({ error: "Erro de autentica\xE7\xE3o" });
  }
}
function normalizeRows(rawResult) {
  let rows = rawResult;
  if (rawResult && typeof rawResult === "object") {
    if ("rows" in rawResult) {
      rows = rawResult.rows;
    } else if (Array.isArray(rawResult) && Array.isArray(rawResult[0])) {
      rows = rawResult[0];
    }
  }
  return Array.isArray(rows) ? rows : [];
}
function normalizeRow(row) {
  if (Array.isArray(row)) {
    return {
      table_name: row[0],
      size_mb: row[1],
      table_rows: row[2]
    };
  }
  return row;
}
async function tableExists(db, tableName) {
  try {
    const rawResult = await db.execute(
      import_drizzle_orm54.sql`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${tableName}`
    );
    const rows = normalizeRows(rawResult);
    return rows.length > 0;
  } catch {
    return false;
  }
}
async function countRows(db, tableName) {
  try {
    const rawResult = await db.execute(import_drizzle_orm54.sql`SELECT COUNT(*) as cnt FROM ${import_drizzle_orm54.sql.identifier(tableName)}`);
    const rows = normalizeRows(rawResult);
    const normalized = normalizeRow(rows[0]);
    return Number(normalized?.cnt || 0);
  } catch {
    return 0;
  }
}
async function deleteOld(db, tableName, cutoff) {
  try {
    const result = await db.execute(import_drizzle_orm54.sql`DELETE FROM ${import_drizzle_orm54.sql.identifier(tableName)} WHERE created_at < ${import_drizzle_orm54.sql.raw(cutoff.toISOString().slice(0, 19).replace("T", " "))}`);
    return result.affectedRows || 0;
  } catch (error) {
    if (error.message?.includes("Unknown column") || error.message?.includes("no such column")) {
      return 0;
    }
    throw error;
  }
}
var import_express7, import_jsonwebtoken4, import_drizzle_orm54, systemRouter2, system_default;
var init_system = __esm({
  "server/_core/routes/system.ts"() {
    "use strict";
    import_express7 = __toESM(require("express"), 1);
    init_db();
    import_jsonwebtoken4 = __toESM(require("jsonwebtoken"), 1);
    import_drizzle_orm54 = require("drizzle-orm");
    systemRouter2 = import_express7.default.Router();
    systemRouter2.get("/storage", async (req, res) => {
      try {
        const { exec: exec2 } = await import("child_process");
        const { promisify: promisify2 } = await import("util");
        const execAsync2 = promisify2(exec2);
        const { stdout } = await execAsync2("df -h /");
        const lines = stdout.trim().split("\\n");
        const diskInfo = lines.slice(1).map((line) => {
          const [filesystem, size, used, available, usePct, mounted] = line.split(/\\s+/);
          return { filesystem, size, used, available, usePct, mounted };
        })[0] || {};
        const appPath = process.cwd();
        const { stdout: duStdout } = await execAsync2(`du -sh ${appPath}`);
        const appSize = duStdout.trim().split("\\t")[0];
        res.json({ success: true, disk: diskInfo, appSize, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.get("/database/size", requireAdmin, async (req, res) => {
      try {
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        const rawResult = await db.execute(
          import_drizzle_orm54.sql`SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb FROM information_schema.tables WHERE table_schema = DATABASE()`
        );
        const rows = normalizeRows(rawResult);
        const size_mb = Number(normalizeRow(rows[0])?.size_mb || 0);
        res.json({ success: true, size_mb, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (error) {
        console.error("[System/Size] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.get("/database/tables", requireAdmin, async (req, res) => {
      try {
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        const rawResult = await db.execute(
          import_drizzle_orm54.sql`SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb, table_rows FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name NOT LIKE '\\_%' AND table_name NOT IN ('schema_migrations', 'migrations', '_migrations_applied') ORDER BY (data_length + index_length) DESC`
        );
        const rows = normalizeRows(rawResult);
        const tables = rows.map((row) => {
          const normalized = normalizeRow(row);
          return {
            table_name: normalized.table_name || "unknown",
            size_mb: Number(normalized.size_mb || 0),
            table_rows: Number(normalized.table_rows || 0)
          };
        });
        console.log("[System/Tables] Normalized tables count:", tables.length, "first:", tables[0]?.table_name);
        res.json({ success: true, tables, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (error) {
        console.error("[System/Tables] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.post("/clean", requireAdmin, async (req, res) => {
      try {
        const { types } = req.body;
        const results = [];
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        if (!types || types.includes("logs")) {
          const cutoffDate = /* @__PURE__ */ new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          const logTables = ["system_logs", "audit_logs", "crm_audit_logs", "workflow_executions", "execution_data"];
          let totalDeleted = 0, tablesFound = 0;
          for (const tableName of logTables) {
            try {
              if (await tableExists(db, tableName)) {
                const deleted = await deleteOld(db, tableName, cutoffDate);
                tablesFound++;
                totalDeleted += deleted;
              }
            } catch (e) {
              if (!e.message?.includes("does not exist")) {
                console.log(`[System/Clean] Erro ${tableName}: ${e.message}`);
              }
            }
          }
          results.push({
            type: "logs",
            deleted: totalDeleted,
            message: `Removidos ${totalDeleted} logs de ${tablesFound} tabela${tablesFound !== 1 ? "s" : ""}`
          });
        }
        if (!types || types.includes("sessions")) {
          const exists = await tableExists(db, "sessions");
          if (exists) {
            const cutoffDate = /* @__PURE__ */ new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            try {
              const deleted = await deleteOld(db, "sessions", cutoffDate);
              results.push({ type: "sessions", deleted, message: `Removidas ${deleted} sess\xF5es` });
            } catch (e) {
              try {
                await db.execute(import_drizzle_orm54.sql`DELETE FROM sessions WHERE expires_at < ${import_drizzle_orm54.sql.raw(cutoffDate.toISOString().slice(0, 19).replace("T", " "))}`);
                results.push({ type: "sessions", deleted: 0, message: `Removidas sess\xF5es (via DELETE)` });
              } catch (e2) {
                results.push({ type: "sessions", deleted: 0, message: `Erro: ${e2.message}` });
              }
            }
          } else {
            results.push({ type: "sessions", deleted: 0, message: "Tabela de sess\xF5es n\xE3o encontrada" });
          }
        }
        res.json({ success: true, results, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (error) {
        console.error("[System/Clean] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.post("/clean-messages", requireAdmin, async (req, res) => {
      try {
        const { days = 90, dryRun = false } = req.body;
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        if (dryRun) {
          return res.json({
            success: true,
            dryRun: true,
            stats: {
              messages: 0,
              conversations: 0,
              withMedia: 0,
              cutoffDate: cutoffDate.toISOString()
            },
            message: "Simula\xE7\xE3o - n\xE3o autenticado"
          });
        }
        await db.execute(import_drizzle_orm54.sql`DELETE FROM conversation_messages WHERE created_at < ${import_drizzle_orm54.sql.raw(cutoffDate.toISOString().slice(0, 19).replace("T", " "))}`);
        res.json({
          success: true,
          stats: {
            messages: 0,
            conversations: 0,
            withMedia: 0,
            cutoffDate: cutoffDate.toISOString()
          },
          message: "Mensagens antigas removidas"
        });
      } catch (error) {
        console.error("[System/CleanMessages] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.post("/clean-database", requireAdmin, async (req, res) => {
      try {
        const { confirm } = req.body;
        if (!confirm) {
          return res.status(400).json({ error: "Confirma\xE7\xE3o necess\xE1ria" });
        }
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        const tables = [
          "conversation_messages",
          "received_messages",
          "system_logs",
          "audit_logs",
          "notifications",
          "sessions",
          "flow_executions",
          "execution_logs",
          "broadcast_messages",
          "quick_replies_cache",
          "webhook_logs"
        ];
        const results = [];
        for (const tableName of tables) {
          try {
            const exists = await tableExists(db, tableName);
            if (exists) {
              const beforeCount = await countRows(db, tableName);
              try {
                await db.execute(import_drizzle_orm54.sql.raw(`TRUNCATE TABLE ${tableName}`));
                results.push({
                  table: tableName,
                  success: true,
                  rows: beforeCount,
                  message: `Tabela ${tableName}: ${beforeCount} linha${beforeCount !== 1 ? "s" : ""} removida${beforeCount !== 1 ? "s" : ""}`
                });
              } catch (truncateError) {
                await db.execute(import_drizzle_orm54.sql.raw(`DELETE FROM ${tableName}`));
                results.push({
                  table: tableName,
                  success: true,
                  rows: beforeCount,
                  message: `Tabela ${tableName}: ${beforeCount} linha${beforeCount !== 1 ? "s" : ""} removida${beforeCount !== 1 ? "s" : ""} (via DELETE)`
                });
              }
            } else {
              results.push({ table: tableName, success: false, error: "Tabela n\xE3o encontrada" });
            }
          } catch (e) {
            results.push({ table: tableName, success: false, error: e.message });
          }
        }
        for (const tableName of tables) {
          try {
            if (await tableExists(db, tableName)) {
              await db.execute(import_drizzle_orm54.sql.raw(`OPTIMIZE TABLE ${tableName}`));
            }
          } catch (optimizeError) {
            console.warn(`[System/Optimize] ${tableName}: ${optimizeError.message}`);
          }
        }
        res.json({
          success: true,
          results,
          message: "Limpeza do banco de dados conclu\xEDda"
        });
      } catch (error) {
        console.error("[System/CleanDatabase] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.post("/close-conversations", requireAdmin, async (req, res) => {
      try {
        const db = await getDb();
        if (!db) return res.status(503).json({ error: "Database unavailable" });
        const now = /* @__PURE__ */ new Date();
        await db.execute(import_drizzle_orm54.sql`UPDATE conversations SET status = 'closed', closed_at = ${import_drizzle_orm54.sql.raw(now.toISOString().slice(0, 19).replace("T", " "))} WHERE status IN ('open', 'assigned')`);
        res.json({ success: true, closed: 0 });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    systemRouter2.get("/health", async (req, res) => {
      try {
        const db = await getDb();
        if (!db) return res.status(503).json({ db: "unavailable" });
        await db.execute(import_drizzle_orm54.sql`SELECT 1 as ok`);
        res.json({
          success: true,
          db: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });
    system_default = systemRouter2;
  }
});

// server/workers/broadcast-recovery.ts
var broadcast_recovery_exports = {};
__export(broadcast_recovery_exports, {
  startBroadcastRecoveryWorker: () => startBroadcastRecoveryWorker,
  stopBroadcastRecoveryWorker: () => stopBroadcastRecoveryWorker
});
function startBroadcastRecoveryWorker() {
  if (recoveryTimer) return;
  console.log("[BroadcastRecovery] \u{1F504} Starting recovery worker (checks every 60s)");
  recoveryTimer = setInterval(async () => {
    try {
      await recoverStuckBroadcasts();
    } catch (err) {
      console.error("[BroadcastRecovery] Error in recovery loop:", err.message);
    }
  }, RECOVERY_INTERVAL_MS);
  setImmediate(() => recoverStuckBroadcasts());
}
async function recoverStuckBroadcasts() {
  const db = await getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1e3);
  const stuckMessages = await db.select({
    id: broadcastMessages.id,
    status: broadcastMessages.status
  }).from(broadcastMessages).where(
    (0, import_drizzle_orm55.and)(
      (0, import_drizzle_orm55.eq)(broadcastMessages.status, "sending"),
      (0, import_drizzle_orm55.lt)(broadcastMessages.sentAt, cutoff)
    )
  ).limit(10);
  if (stuckMessages.length === 0) return;
  console.log(
    `[BroadcastRecovery] \u{1F50D} Found ${stuckMessages.length} stuck broadcast(s), reprocessing...`
  );
  for (const msg of stuckMessages) {
    try {
      await processBroadcastMessage(msg.id);
      console.log(`[BroadcastRecovery] \u2705 Reprocessed broadcast ${msg.id}`);
    } catch (err) {
      console.error(
        `[BroadcastRecovery] \u274C Failed to reprocess broadcast ${msg.id}:`,
        err.message
      );
      try {
        await db.update(broadcastMessages).set({ status: "failed", errorMessage: `Recovery failed: ${err.message}` }).where((0, import_drizzle_orm55.eq)(broadcastMessages.id, msg.id));
      } catch {
      }
    }
  }
}
function stopBroadcastRecoveryWorker() {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
    console.log("[BroadcastRecovery] \u{1F6D1} Stopped");
  }
}
var import_drizzle_orm55, RECOVERY_INTERVAL_MS, STUCK_THRESHOLD_MINUTES, recoveryTimer;
var init_broadcast_recovery = __esm({
  "server/workers/broadcast-recovery.ts"() {
    "use strict";
    init_db();
    init_schema();
    import_drizzle_orm55 = require("drizzle-orm");
    init_broadcast_sender();
    RECOVERY_INTERVAL_MS = 60 * 1e3;
    STUCK_THRESHOLD_MINUTES = 2;
    recoveryTimer = null;
  }
});

// server/index.ts
var import_express8 = __toESM(require("express"), 1);
var import_express9 = require("@trpc/server/adapters/express");
init_db();

// server/_core/migrations.ts
var import_drizzle_orm2 = require("drizzle-orm");
async function applySqlMigrations() {
  try {
    const fs = await import("fs");
    const path2 = await import("path");
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const db = await getDb2();
    if (!db) {
      return;
    }
    const migrationsDir = path2.join(process.cwd(), "server", "database", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      return;
    }
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    try {
      await db.execute(import_drizzle_orm2.sql`
        CREATE TABLE IF NOT EXISTS _migrations_applied (
          migration_name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (migration_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (err) {
      console.error("[Migrations] \u274C Erro ao criar tabela de controle:", err.message);
    }
    let appliedSet = /* @__PURE__ */ new Set();
    try {
      const [rows] = await db.execute(import_drizzle_orm2.sql`SELECT migration_name FROM _migrations_applied`);
      rows.forEach((row) => appliedSet.add(row.migration_name));
    } catch (err) {
    }
    for (const file of files) {
      if (!file || appliedSet.has(file)) continue;
      const fullPath = path2.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(fullPath, "utf8");
      try {
        const statements = sqlContent.split(";").map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("--"));
        let failed = false;
        for (const stmt of statements) {
          if (!stmt) continue;
          try {
            await db.execute(stmt + ";");
          } catch (stmtErr) {
            const errorString = (stmtErr.message + " " + (stmtErr.code || "") + " " + (stmtErr.stack || "")).toLowerCase();
            if (errorString.includes("duplicate column") || errorString.includes("already exists") || errorString.includes("duplicate key") || errorString.includes("er_dup_fieldname") || errorString.includes("er_dup_keyname") || errorString.includes("er_table_exists_error")) {
              console.log(`[Migrations] \u23ED\uFE0F Ignorando (j\xE1 existe no banco): bypass seguro ativado.`);
            } else {
              console.error(`[Migrations] \u274C Erro real na query:`, stmtErr.message);
              failed = true;
              break;
            }
          }
        }
        if (!failed) {
          try {
            await db.execute(import_drizzle_orm2.sql`INSERT IGNORE INTO _migrations_applied (migration_name) VALUES (${file})`);
          } catch (err) {
          }
        }
      } catch (err) {
        console.error(`[Migrations] \u274C Erro em ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Migrations] \u274C Falha cr\xEDtica:", err);
  }
}

// server/index.ts
var import_path = __toESM(require("path"), 1);
var import_drizzle_orm56 = require("drizzle-orm");
init_schema();
init_schema();

// server/routers/index.ts
init_trpc();

// server/routers-auth.ts
var import_zod = require("zod");
init_trpc();
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
init_env();
var import_bcrypt = __toESM(require("bcrypt"), 1);
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
var authRouter = router({
  // Teste de autenticação (debug)
  testAuth: protectedProcedure.query(({ ctx }) => {
    console.log("[testAuth] ctx.user:", ctx.user);
    return {
      autenticado: !!ctx.user,
      user: ctx.user
    };
  }),
  // Login procedure
  login: publicProcedure.input(
    import_zod.z.object({
      username: import_zod.z.string().min(1, "Username \xE9 obrigat\xF3rio"),
      password: import_zod.z.string().min(1, "Senha \xE9 obrigat\xF3ria"),
      cfTurnstileToken: import_zod.z.string().optional()
      // Token do Cloudflare Turnstile
    })
  ).mutation(async ({ input, ctx }) => {
    console.log("[LOGIN] INPUT RECEIVED:", input);
    console.log("[LOGIN] CTX USER:", ctx.user);
    try {
      const { username, password, cfTurnstileToken } = input;
      if (process.env.NODE_ENV === "production" && process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
        if (!cfTurnstileToken) {
          throw new Error("Token de seguran\xE7a necess\xE1rio");
        }
        const formData = new URLSearchParams();
        formData.append("secret", process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
        formData.append("response", cfTurnstileToken);
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          body: formData
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          console.log("[LOGIN] Turnstile validation failed:", result);
          throw new Error("Falha na valida\xE7\xE3o de seguran\xE7a. Por favor, tente novamente.");
        }
      }
      console.log("[LOGIN] Turnstile validation successful");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rawResult = await db.execute(
        import_drizzle_orm3.sql`SELECT id, openId, name, email, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn, display_name
                FROM users
                WHERE name = ${username}
                LIMIT 1`
      );
      console.log("[LOGIN] DB Result raw:", JSON.stringify(rawResult).substring(0, 200));
      const rows = rawResult.rows ?? rawResult[0] ?? rawResult;
      const usersList = Array.isArray(rows) ? rows : [rows];
      if (usersList.length === 0) {
        console.log("[LOGIN] User not found:", username);
        throw new Error("Username ou senha inv\xE1lidos");
      }
      const user = usersList[0];
      console.log("[LOGIN] User found:", user?.name, "| Role:", user?.role);
      const passwordHash = user.passwordHash ?? user.password_hash;
      if (!passwordHash) {
        console.error("[LOGIN] password_hash missing from user row:", user);
        throw new Error("Username ou senha inv\xE1lidos");
      }
      console.log("[LOGIN] Comparing password...");
      const valid = await import_bcrypt.default.compare(password, passwordHash);
      if (!valid) {
        console.log("[LOGIN] Password invalid for:", username);
        throw new Error("Username ou senha inv\xE1lidos");
      }
      console.log("[LOGIN] Password valid! Updating lastSignedIn...");
      await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.id, user.id));
      const safeUser = user;
      const userForToken = {
        id: safeUser.id,
        name: safeUser.display_name ?? safeUser.name,
        // display_name é o nome real (atendimento)
        username: safeUser.name,
        // name é o login
        email: safeUser.email,
        role: safeUser.role
      };
      console.log("[LOGIN] Signing JWT with JWT_SECRET exists:", !!JWT_SECRET);
      const token = import_jsonwebtoken.default.sign(userForToken, JWT_SECRET, { expiresIn: "7d" });
      console.log("[LOGIN] Returning success for:", username);
      return {
        success: true,
        user: userForToken,
        token
      };
    } catch (error) {
      console.log("[LOGIN] ERROR:", error.message);
      throw new Error(error.message || "Falha no login");
    }
  }),
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Usu\xE1rio n\xE3o autenticado");
    }
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      username: ctx.user.username,
      role: ctx.user.role,
      photo: ctx.user.photo
      // Add photo field to user profile
    };
  }),
  // Logout (opcional, frontend limpa localStorage)
  logout: protectedProcedure.mutation(({ ctx }) => {
    console.log("[LOGOUT] User logging out:", ctx.user?.username);
    return { success: true };
  })
});

// server/routers-agents.ts
init_trpc();
var import_zod2 = require("zod");
init_db();
init_schema();
var import_drizzle_orm4 = require("drizzle-orm");
function startDateFromRange(range) {
  if (range === "all") return void 0;
  const days = parseInt(range, 10);
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function dbErrCode(e) {
  return e?.cause?.code || e?.code;
}
function isMissingTable(e) {
  const code = dbErrCode(e);
  const msg = String(e?.cause?.sqlMessage || e?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist");
}
async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) {
      console.log(`[agents] Ignorando ${label}: tabela ausente`);
      return fallback;
    }
    throw e;
  }
}
function sqlJoinNumbers(ids) {
  return import_drizzle_orm4.sql.join(
    ids.map((id) => import_drizzle_orm4.sql`${id}`),
    import_drizzle_orm4.sql`, `
  );
}
function pickPrimaryAgentId(params) {
  return params.assignedTo ?? params.lastAgentSenderId;
}
async function computeAgentsWithMetrics(db, input) {
  const startDate = startDateFromRange(input.timeRange);
  const allAgents = await db.select().from(users).orderBy((0, import_drizzle_orm4.desc)(users.createdAt));
  const agentIds = allAgents.map((a) => a.id).filter(Boolean);
  const convs = await db.select().from(conversations).where(
    startDate ? import_drizzle_orm4.sql`(${conversations.openedAt} >= ${startDate} OR ${conversations.lastMessageAt} >= ${startDate})` : void 0
  );
  const conversationIds = convs.map((c) => c.id);
  const firstCustomerRows = await safe(
    "conversation_messages(firstCustomer)",
    async () => {
      if (conversationIds.length === 0) return [];
      return await db.execute(import_drizzle_orm4.sql`
        SELECT conversation_id AS conversationId,
               MIN(created_at) AS firstCustomerAt
        FROM conversation_messages
        WHERE sender_type = 'customer'
          AND conversation_id IN (${sqlJoinNumbers(conversationIds)})
          ${startDate ? import_drizzle_orm4.sql`AND created_at >= ${startDate}` : import_drizzle_orm4.sql``}
        GROUP BY conversation_id
      `);
    },
    []
  );
  const firstCustomerAtByConvId = /* @__PURE__ */ new Map();
  for (const r of firstCustomerRows) {
    const conversationId2 = Number(r.conversationId);
    const ts = r.firstCustomerAt ? new Date(r.firstCustomerAt).getTime() : NaN;
    if (!Number.isNaN(ts)) firstCustomerAtByConvId.set(conversationId2, ts);
  }
  const agentStatsRows = await safe(
    "conversation_messages(perAgent)",
    async () => {
      if (conversationIds.length === 0 || agentIds.length === 0) return [];
      return await db.execute(import_drizzle_orm4.sql`
        SELECT m.conversation_id AS conversationId,
               m.sender_id AS senderId,
               MIN(m.created_at) AS firstAgentAt,
               MAX(m.created_at) AS lastAgentAt,
               COUNT(*) AS agentMsgCount
        FROM conversation_messages m
        INNER JOIN (
          SELECT conversation_id, MIN(created_at) AS firstCustomerAt
          FROM conversation_messages
          WHERE sender_type = 'customer'
            AND conversation_id IN (${sqlJoinNumbers(conversationIds)})
            ${startDate ? import_drizzle_orm4.sql`AND created_at >= ${startDate}` : import_drizzle_orm4.sql``}
          GROUP BY conversation_id
        ) fc ON fc.conversation_id = m.conversation_id
        WHERE m.sender_type = 'agent'
          AND m.sender_id IS NOT NULL
          AND m.conversation_id IN (${sqlJoinNumbers(conversationIds)})
          AND m.created_at >= fc.firstCustomerAt
        GROUP BY m.conversation_id, m.sender_id
      `);
    },
    []
  );
  const statsByConvAgent = /* @__PURE__ */ new Map();
  const lastAgentSenderByConvId = /* @__PURE__ */ new Map();
  const lastActiveAtByAgentId = /* @__PURE__ */ new Map();
  const bestByConv = /* @__PURE__ */ new Map();
  for (const row of agentStatsRows) {
    const conversationId2 = Number(row.conversationId);
    const senderId = Number(row.senderId);
    const firstAgentAt = row.firstAgentAt ? new Date(row.firstAgentAt).getTime() : void 0;
    const lastAgentAt = row.lastAgentAt ? new Date(row.lastAgentAt).getTime() : void 0;
    const agentMsgCount = Number(row.agentMsgCount || 0);
    statsByConvAgent.set(`${conversationId2}:${senderId}`, {
      firstAgentAt,
      lastAgentAt,
      agentMsgCount
    });
    if (lastAgentAt !== void 0) {
      const prevAgentLast = lastActiveAtByAgentId.get(senderId);
      if (prevAgentLast === void 0 || lastAgentAt > prevAgentLast) {
        lastActiveAtByAgentId.set(senderId, lastAgentAt);
      }
      const prevConv = bestByConv.get(conversationId2);
      if (!prevConv || lastAgentAt > prevConv.lastTs) {
        bestByConv.set(conversationId2, { senderId, lastTs: lastAgentAt });
      }
    }
  }
  bestByConv.forEach((v, conversationId2) => {
    lastAgentSenderByConvId.set(conversationId2, v.senderId);
  });
  const surveys = await safe(
    "survey_responses",
    async () => {
      const q = startDate ? db.select().from(surveyResponses).where((0, import_drizzle_orm4.gte)(surveyResponses.createdAt, startDate)) : db.select().from(surveyResponses);
      return await q;
    },
    []
  );
  const surveyAggByAgentId = /* @__PURE__ */ new Map();
  for (const s of surveys) {
    const agentId = Number(s.agentId);
    if (!agentId) continue;
    const prev = surveyAggByAgentId.get(agentId) || { total: 0, count: 0 };
    surveyAggByAgentId.set(agentId, {
      total: prev.total + Number(s.rating || 0),
      count: prev.count + 1
    });
  }
  const convsByPrimaryAgentId = /* @__PURE__ */ new Map();
  for (const c of convs) {
    const lastAgentSenderId = lastAgentSenderByConvId.get(c.id) ?? null;
    const primaryId = pickPrimaryAgentId({
      assignedTo: c.assignedTo ?? null,
      lastAgentSenderId
    });
    if (!primaryId) continue;
    const list = convsByPrimaryAgentId.get(primaryId) || [];
    list.push(c);
    convsByPrimaryAgentId.set(primaryId, list);
  }
  const agentsWithMetrics = allAgents.map((a) => {
    const agentConvs = convsByPrimaryAgentId.get(a.id) || [];
    const totalTickets = agentConvs.length;
    const resolvedTickets = agentConvs.filter(
      (c) => c.status === "closed"
    ).length;
    const activeTickets = agentConvs.filter(
      (c) => c.status === "open" || c.status === "assigned"
    ).length;
    let sumRespMin = 0;
    let nResp = 0;
    let msgCount = 0;
    for (const c of agentConvs) {
      const firstCustomerAt = firstCustomerAtByConvId.get(c.id);
      const st = statsByConvAgent.get(`${c.id}:${a.id}`);
      if (st?.agentMsgCount) msgCount += st.agentMsgCount;
      if (!firstCustomerAt || !st?.firstAgentAt) continue;
      const diffMin = (st.firstAgentAt - firstCustomerAt) / (1e3 * 60);
      if (diffMin > 0 && diffMin < 1440) {
        sumRespMin += diffMin;
        nResp += 1;
      }
    }
    const avgResponseTime = nResp > 0 ? sumRespMin / nResp : 0;
    const resolvedConvs = agentConvs.filter(
      (c) => c.status === "closed" && c.openedAt && c.closedAt
    );
    let avgResolutionTime = 0;
    if (resolvedConvs.length > 0) {
      const totalMs = resolvedConvs.reduce((sum, c) => {
        return sum + (new Date(c.closedAt).getTime() - new Date(c.openedAt).getTime());
      }, 0);
      avgResolutionTime = totalMs / resolvedConvs.length / (1e3 * 60 * 60);
    }
    const surveyAgg = surveyAggByAgentId.get(a.id);
    const satisfactionRate = surveyAgg && surveyAgg.count > 0 ? surveyAgg.total / (surveyAgg.count * 5) * 100 : 0;
    const lastActiveAtTs = lastActiveAtByAgentId.get(a.id);
    const badges = [];
    if (satisfactionRate >= 90) badges.push("\u{1F3C6} Top Performer");
    if (avgResponseTime > 0 && avgResponseTime < 5)
      badges.push("\u26A1 Resposta R\xE1pida");
    if (resolvedTickets >= 50) badges.push("\u{1F4AA} Produtivo");
    if (activeTickets >= 10) badges.push("\u{1F4CC} Muito Ativo");
    return {
      id: a.id,
      name: a.name || a.email || `Agente ${a.id}`,
      email: a.email,
      avatar: (a.name || a.email || "AG").trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2),
      totalTickets,
      resolvedTickets,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      satisfactionRate: Math.round(satisfactionRate),
      activeTickets,
      agentMsgCount: msgCount,
      lastActiveAt: lastActiveAtTs ? new Date(lastActiveAtTs) : null,
      badges,
      trend: "stable",
      trendValue: 0
    };
  });
  return { agentsWithMetrics, hasSurveyData: surveys.length > 0 };
}
var agentsRouter = router({
  list: protectedProcedure.input(
    import_zod2.z.object({
      page: import_zod2.z.number().min(1).default(1),
      pageSize: import_zod2.z.number().min(1).max(100).default(20),
      timeRange: import_zod2.z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      sortBy: import_zod2.z.enum(["satisfaction", "resolved", "response_time", "active"]).default("satisfaction")
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const safeInput = input ?? {};
    const { page = 1, pageSize = 20, sortBy = "satisfaction", timeRange = "30d" } = safeInput;
    const { agentsWithMetrics } = await computeAgentsWithMetrics(db, {
      timeRange
    });
    const sorted = agentsWithMetrics.sort((a, b) => {
      switch (sortBy) {
        case "satisfaction":
          return b.satisfactionRate - a.satisfactionRate;
        case "resolved":
          return b.resolvedTickets - a.resolvedTickets;
        case "response_time":
          return a.avgResponseTime - b.avgResponseTime;
        case "active":
          return b.activeTickets - a.activeTickets;
        default:
          return 0;
      }
    });
    const offset = (page - 1) * pageSize;
    return sorted.slice(offset, offset + pageSize);
  }),
  getChartData: protectedProcedure.input(
    import_zod2.z.object({
      timeRange: import_zod2.z.enum(["7d", "30d", "90d", "all"]).default("30d")
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const startDate = startDateFromRange(input.timeRange);
    const convs = await db.select({
      openedAt: conversations.openedAt,
      status: conversations.status
    }).from(conversations).where(startDate ? (0, import_drizzle_orm4.gte)(conversations.openedAt, startDate) : void 0);
    const surveys = await safe(
      "survey_responses(chart)",
      async () => {
        const q = startDate ? db.select({
          createdAt: surveyResponses.createdAt,
          rating: surveyResponses.rating
        }).from(surveyResponses).where((0, import_drizzle_orm4.gte)(surveyResponses.createdAt, startDate)) : db.select({
          createdAt: surveyResponses.createdAt,
          rating: surveyResponses.rating
        }).from(surveyResponses);
        return await q;
      },
      []
    );
    const byIso = {};
    for (const c of convs) {
      if (!c.openedAt) continue;
      const iso = new Date(c.openedAt).toISOString().slice(0, 10);
      byIso[iso] = byIso[iso] || {
        opened: 0,
        resolved: 0,
        satSum: 0,
        satN: 0
      };
      byIso[iso].opened += 1;
      if (c.status === "closed") byIso[iso].resolved += 1;
    }
    for (const s of surveys) {
      if (!s.createdAt) continue;
      const iso = new Date(s.createdAt).toISOString().slice(0, 10);
      byIso[iso] = byIso[iso] || {
        opened: 0,
        resolved: 0,
        satSum: 0,
        satN: 0
      };
      byIso[iso].satSum += Number(s.rating || 0);
      byIso[iso].satN += 1;
    }
    return Object.keys(byIso).sort().map((iso) => {
      const d = byIso[iso];
      const [, m, day] = iso.split("-");
      return {
        date: `${day}/${m}`,
        tickets: d.opened,
        resolved: d.resolved,
        satisfacao: d.satN > 0 ? Math.round(d.satSum / d.satN / 5 * 100) : 0
      };
    });
  }),
  getInsights: protectedProcedure.input(
    import_zod2.z.object({
      timeRange: import_zod2.z.enum(["7d", "30d", "90d", "all"]).default("30d")
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const { agentsWithMetrics, hasSurveyData } = await computeAgentsWithMetrics(db, { timeRange: input.timeRange });
    if (!agentsWithMetrics || agentsWithMetrics.length === 0) {
      return [
        "Sem dados suficientes para gerar insights no per\xEDodo selecionado."
      ];
    }
    const insights = [];
    const byResolved = [...agentsWithMetrics].sort(
      (a, b) => b.resolvedTickets - a.resolvedTickets
    );
    const byResponse = [...agentsWithMetrics].filter((a) => a.avgResponseTime > 0).sort((a, b) => a.avgResponseTime - b.avgResponseTime);
    const bySatisfaction = [...agentsWithMetrics].sort(
      (a, b) => b.satisfactionRate - a.satisfactionRate
    );
    if (byResolved[0]?.resolvedTickets > 0) {
      insights.push(
        `\u2022 ${byResolved[0].name} lidera em tickets resolvidos: ${byResolved[0].resolvedTickets}.`
      );
    }
    if (byResponse[0]) {
      insights.push(
        `\u2022 ${byResponse[0].name} tem o menor tempo m\xE9dio de resposta: ${byResponse[0].avgResponseTime.toFixed(1)}min.`
      );
    }
    if (hasSurveyData && bySatisfaction[0]?.satisfactionRate > 0) {
      insights.push(
        `\u2022 ${bySatisfaction[0].name} lidera em satisfa\xE7\xE3o: ${bySatisfaction[0].satisfactionRate}%.`
      );
    }
    const totalTickets = agentsWithMetrics.reduce(
      (sum, a) => sum + (a.totalTickets || 0),
      0
    );
    const totalResolved = agentsWithMetrics.reduce(
      (sum, a) => sum + (a.resolvedTickets || 0),
      0
    );
    const resolutionRate = totalTickets > 0 ? totalResolved / totalTickets * 100 : 0;
    insights.push(
      `\u2022 Taxa de resolu\xE7\xE3o da equipe: ${resolutionRate.toFixed(0)}%.`
    );
    const activeCount = agentsWithMetrics.filter(
      (a) => (a.activeTickets || 0) > 0
    ).length;
    insights.push(
      `\u2022 ${activeCount} agente(s) com tickets ativos no momento.`
    );
    if (!hasSurveyData) {
      insights.push("\u2022 Satisfa\xE7\xE3o: ainda sem dados de pesquisa no banco.");
    }
    return insights;
  }),
  getRecentConversations: protectedProcedure.input(
    import_zod2.z.object({
      agentId: import_zod2.z.number(),
      limit: import_zod2.z.number().min(1).max(50).default(15),
      timeRange: import_zod2.z.enum(["7d", "30d", "90d", "all"]).default("30d")
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const startDate = startDateFromRange(input.timeRange);
    const assigned = await db.select().from(conversations).where(
      startDate ? import_drizzle_orm4.sql`${conversations.assignedTo} = ${input.agentId} AND (${conversations.openedAt} >= ${startDate} OR ${conversations.lastMessageAt} >= ${startDate})` : (0, import_drizzle_orm4.eq)(conversations.assignedTo, input.agentId)
    );
    const byMsgs = await safe(
      "conversation_messages(recentByAgent)",
      async () => {
        return await db.execute(import_drizzle_orm4.sql`
            SELECT DISTINCT conversation_id AS conversationId
            FROM conversation_messages
            WHERE sender_type = 'agent'
              AND sender_id = ${input.agentId}
              ${startDate ? import_drizzle_orm4.sql`AND created_at >= ${startDate}` : import_drizzle_orm4.sql``}
          `);
      },
      []
    );
    const idSet = new Set(assigned.map((c) => c.id));
    for (const r of byMsgs)
      idSet.add(Number(r.conversationId));
    const ids = Array.from(idSet);
    if (ids.length === 0) return [];
    const convs = await db.select().from(conversations).where(import_drizzle_orm4.sql`${conversations.id} IN (${sqlJoinNumbers(ids)})`).orderBy((0, import_drizzle_orm4.desc)(conversations.lastMessageAt));
    return convs.slice(0, input.limit).map((c) => ({
      id: c.id,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      channel: c.channel,
      status: c.status,
      openedAt: c.openedAt,
      lastMessageAt: c.lastMessageAt,
      closedAt: c.closedAt
    }));
  })
});

// server/routers-crm.ts
var import_zod3 = require("zod");
init_trpc();
init_trpc();
init_db();
init_schema();
var import_drizzle_orm5 = require("drizzle-orm");
init_crm_core();
init_phone();
var calculateEndDate = (purchaseDate, quantity, dailyDosage) => {
  const daysSupply = Math.floor(quantity / dailyDosage);
  const endDate = new Date(purchaseDate);
  endDate.setDate(endDate.getDate() + daysSupply);
  return endDate;
};
var customersRouter = router({
  // ========================================
  // CLIENTES (CUSTOMERS)
  // ========================================
  // Listar todos os clientes
  list: protectedProcedure.input(import_zod3.z.object({
    page: import_zod3.z.number().min(1).default(1),
    pageSize: import_zod3.z.number().min(1).max(100).default(20),
    search: import_zod3.z.string().optional()
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const page = input?.page ?? 1;
    const pageSize = input?.pageSize ?? 20;
    const search = input?.search;
    const offset = (page - 1) * pageSize;
    const countResult = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(customers);
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    let query = db.select().from(customers);
    if (search) {
      query = query.where(
        (0, import_drizzle_orm5.or)(
          (0, import_drizzle_orm5.like)(customers.name, `%${search}%`),
          (0, import_drizzle_orm5.like)(customers.email, `%${search}%`),
          (0, import_drizzle_orm5.like)(customers.phone, `%${search}%`)
        )
      );
    }
    const result = await query.limit(pageSize).offset(offset).orderBy((0, import_drizzle_orm5.desc)(customers.id));
    return {
      customers: result.map((c) => ({ customer: c })),
      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize
      }
    };
  }),
  // Buscar cliente por telefone (normalizado)
  getByPhone: publicProcedure.input(import_zod3.z.object({ phone: import_zod3.z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const normalizedPhone = formatPhoneBR(input.phone);
    const customer2 = await db.select().from(customers).where((0, import_drizzle_orm5.eq)(customers.phone, normalizedPhone)).limit(1);
    return customer2[0] || null;
  }),
  // Criar cliente automaticamente (para webhooks)
  createIfNotExists: publicProcedure.input(
    import_zod3.z.object({
      phone: import_zod3.z.string(),
      name: import_zod3.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const normalizedPhone = formatPhoneBR(input.phone);
    const phoneVariants = generatePhoneVariants(input.phone);
    const phoneCondition = phoneVariants.length > 1 ? (0, import_drizzle_orm5.or)(...phoneVariants.map((v) => (0, import_drizzle_orm5.eq)(customers.phone, v))) : (0, import_drizzle_orm5.eq)(customers.phone, phoneVariants[0]);
    const existing = await db.select().from(customers).where(phoneCondition).limit(1);
    if (existing[0]) {
      return existing[0];
    }
    const newCustomer = await db.insert(customers).values({
      phone: normalizedPhone,
      name: input.name || "Cliente",
      status: "active"
    }).$returningId();
    return { id: newCustomer[0].id };
  }),
  // Atualizar cliente
  updateCustomer: protectedProcedure.input(
    import_zod3.z.object({
      id: import_zod3.z.number(),
      name: import_zod3.z.string().optional(),
      birthDate: import_zod3.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const update = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (input.name !== void 0) update.name = input.name;
    if (input.birthDate !== void 0) {
      const d = input.birthDate ? new Date(input.birthDate) : null;
      update.birthDate = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    await db.update(customers).set(update).where((0, import_drizzle_orm5.eq)(customers.id, input.id));
    fireAndForget(async () => {
      await appendCrmAuditLog({
        action: "customer.update",
        entityType: "customer",
        entityId: input.id,
        actorUserId: null,
        after: input
      });
      await enqueueCrmOutboxEvent({
        eventName: "CustomerUpdated",
        entityType: "customer",
        entityId: input.id,
        actorUserId: null,
        payload: input
      });
    });
    return { success: true };
  }),
  // ========================================
  // TRATAMENTOS (TREATMENTS)
  // ========================================
  // Criar tratamento
  createTreatment: protectedProcedure.input(
    import_zod3.z.object({
      customerId: import_zod3.z.number(),
      nomeMedicamento: import_zod3.z.string(),
      posologiaDiaria: import_zod3.z.number().min(1),
      qtdCaixa: import_zod3.z.number().min(1),
      dataUltimaCompra: import_zod3.z.string(),
      observacoes: import_zod3.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const purchaseDate = new Date(input.dataUltimaCompra);
    const dataFimPrevisto = calculateEndDate(
      purchaseDate,
      input.qtdCaixa,
      input.posologiaDiaria
    );
    const newTreatment = await db.insert(customerTreatments).values({
      customerId: input.customerId,
      nomeMedicamento: input.nomeMedicamento,
      posologiaDiaria: input.posologiaDiaria,
      qtdCaixa: input.qtdCaixa,
      dataUltimaCompra: purchaseDate,
      dataFimPrevisto,
      observacoes: input.observacoes,
      isActive: 1
    }).$returningId();
    const treatmentId = newTreatment?.[0]?.id;
    if (!treatmentId) {
      throw new Error("Failed to create treatment");
    }
    const created = await db.select().from(customerTreatments).where((0, import_drizzle_orm5.eq)(customerTreatments.id, treatmentId)).limit(1);
    if (!created?.[0]) {
      throw new Error("Treatment created but could not be loaded");
    }
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "CustomerTreatmentCreated",
        entityType: "customer",
        entityId: input.customerId,
        actorUserId: ctx.user.id,
        payload: { treatmentId, ...input }
      });
    });
    return { id: treatmentId, treatment: created[0] };
  }),
  // Listar tratamentos de um cliente
  getTreatments: protectedProcedure.input(import_zod3.z.object({ customerId: import_zod3.z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const treatments = await db.select().from(customerTreatments).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(customerTreatments.customerId, input.customerId),
        (0, import_drizzle_orm5.eq)(customerTreatments.isActive, 1)
      )
    ).orderBy((0, import_drizzle_orm5.desc)(customerTreatments.dataFimPrevisto));
    return treatments;
  }),
  // Atualizar tratamento
  updateTreatment: protectedProcedure.input(
    import_zod3.z.object({
      id: import_zod3.z.number(),
      posologiaDiaria: import_zod3.z.number().optional(),
      qtdCaixa: import_zod3.z.number().optional(),
      dataUltimaCompra: import_zod3.z.string().optional(),
      isActive: import_zod3.z.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.posologiaDiaria)
      updateData.posologiaDiaria = input.posologiaDiaria;
    if (input.qtdCaixa) updateData.qtdCaixa = input.qtdCaixa;
    if (input.dataUltimaCompra) {
      updateData.dataUltimaCompra = new Date(input.dataUltimaCompra);
    }
    if (input.isActive !== void 0) updateData.isActive = input.isActive;
    if (input.qtdCaixa && input.posologiaDiaria) {
      const treatment = await db.select().from(customerTreatments).where((0, import_drizzle_orm5.eq)(customerTreatments.id, input.id)).limit(1);
      if (treatment[0]?.dataUltimaCompra) {
        updateData.dataFimPrevisto = calculateEndDate(
          treatment[0].dataUltimaCompra,
          input.qtdCaixa,
          input.posologiaDiaria
        );
      }
    }
    await db.update(customerTreatments).set(updateData).where((0, import_drizzle_orm5.eq)(customerTreatments.id, input.id));
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "CustomerTreatmentUpdated",
        entityType: "treatment",
        entityId: input.id,
        actorUserId: ctx.user.id,
        payload: input
      });
    });
    return { success: true };
  }),
  // Apagar (desativar) tratamento
  deleteTreatment: protectedProcedure.input(import_zod3.z.object({ id: import_zod3.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(customerTreatments).where((0, import_drizzle_orm5.eq)(customerTreatments.id, input.id)).limit(1);
    if (!existing?.[0]) {
      return { success: true };
    }
    await db.update(customerTreatments).set({ isActive: 0, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(customerTreatments.id, input.id));
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "CustomerTreatmentDeleted",
        entityType: "treatment",
        entityId: input.id,
        actorUserId: ctx.user.id,
        payload: { customerId: existing[0].customerId }
      });
    });
    return { success: true };
  }),
  // ========================================
  // TAGS
  // ========================================
  // Listar todas as tags
  getTags: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(tags).orderBy(tags.name);
  }),
  // Alias (used by some frontend screens)
  listTags: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(tags).orderBy(tags.name);
  }),
  // Criar nova tag
  createTag: protectedProcedure.input(
    import_zod3.z.object({
      name: import_zod3.z.string(),
      color: import_zod3.z.string().default("#6366f1"),
      description: import_zod3.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const newTag = await db.insert(tags).values({
      ...input,
      createdBy: ctx.user?.id
    }).$returningId();
    fireAndForget(async () => {
      await enqueueCrmOutboxEvent({
        eventName: "TagCreated",
        entityType: "tag",
        entityId: newTag[0].id,
        actorUserId: ctx.user?.id ?? null,
        payload: input
      });
    });
    return { id: newTag[0].id };
  }),
  // Adicionar tag a cliente
  addTagToCustomer: protectedProcedure.input(
    import_zod3.z.object({
      customerId: import_zod3.z.number(),
      tagId: import_zod3.z.number()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(customerTags).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(customerTags.customerId, input.customerId),
        (0, import_drizzle_orm5.eq)(customerTags.tagId, input.tagId)
      )
    ).limit(1);
    if (existing[0]) {
      return existing[0];
    }
    const newCustomerTag = await db.insert(customerTags).values({
      customerId: input.customerId,
      tagId: input.tagId,
      addedBy: ctx.user?.id
    }).$returningId();
    return { id: newCustomerTag[0].id };
  }),
  // Remover tag de cliente
  removeTagFromCustomer: protectedProcedure.input(
    import_zod3.z.object({
      customerId: import_zod3.z.number(),
      tagId: import_zod3.z.number()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(customerTags).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(customerTags.customerId, input.customerId),
        (0, import_drizzle_orm5.eq)(customerTags.tagId, input.tagId)
      )
    );
    return { success: true };
  }),
  // ========================================
  // ALERTAS DE RECORRÊNCIA
  // ========================================
  // Buscar tratamentos próximos do fim (para alertas)
  getUpcomingTreatments: protectedProcedure.input(
    import_zod3.z.object({
      daysAhead: import_zod3.z.number().default(3)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const today = /* @__PURE__ */ new Date();
    const futureDate = /* @__PURE__ */ new Date();
    futureDate.setDate(futureDate.getDate() + input.daysAhead);
    const treatments = await db.select({
      treatment: customerTreatments,
      customer: customers
    }).from(customerTreatments).innerJoin(customers, (0, import_drizzle_orm5.eq)(customerTreatments.customerId, customers.id)).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(customerTreatments.isActive, 1),
        (0, import_drizzle_orm5.gte)(customerTreatments.dataFimPrevisto, today),
        (0, import_drizzle_orm5.lte)(customerTreatments.dataFimPrevisto, futureDate)
      )
    ).orderBy(customerTreatments.dataFimPrevisto);
    return treatments;
  }),
  // ========================================
  // SCRIPT/JORNADAS
  // ========================================
  getScripts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(crmScripts).where((0, import_drizzle_orm5.eq)(crmScripts.isActive, 1)).orderBy((0, import_drizzle_orm5.desc)(crmScripts.updatedAt));
    return rows.map((r) => {
      let vars = [];
      try {
        vars = r.variablesJson ? JSON.parse(r.variablesJson) : [];
      } catch {
        vars = [];
      }
      return {
        id: r.code,
        name: r.name,
        template: r.template,
        variables: Array.isArray(vars) ? vars : []
      };
    });
  }),
  scripts: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db.select().from(crmScripts).orderBy((0, import_drizzle_orm5.desc)(crmScripts.updatedAt));
      return rows.map((r) => {
        let vars = [];
        try {
          vars = r.variablesJson ? JSON.parse(r.variablesJson) : [];
        } catch {
          vars = [];
        }
        return {
          code: r.code,
          name: r.name,
          template: r.template,
          variables: Array.isArray(vars) ? vars : [],
          isActive: r.isActive
        };
      });
    }),
    upsert: adminProcedure.input(
      import_zod3.z.object({
        code: import_zod3.z.string().min(2).max(50),
        name: import_zod3.z.string().min(2).max(120),
        template: import_zod3.z.string().min(1),
        variables: import_zod3.z.array(import_zod3.z.string()).default([]),
        isActive: import_zod3.z.number().int().min(0).max(1).default(1)
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select({ code: crmScripts.code }).from(crmScripts).where((0, import_drizzle_orm5.eq)(crmScripts.code, input.code)).limit(1);
      if (existing?.[0]) {
        await db.update(crmScripts).set({
          name: input.name,
          template: input.template,
          variablesJson: JSON.stringify(input.variables),
          isActive: input.isActive,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm5.eq)(crmScripts.code, input.code));
      } else {
        await db.insert(crmScripts).values({
          code: input.code,
          name: input.name,
          template: input.template,
          variablesJson: JSON.stringify(input.variables),
          isActive: input.isActive,
          createdBy: ctx.user.id,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "CrmScriptUpserted",
          entityType: "crm_script",
          entityId: null,
          actorUserId: ctx.user.id,
          payload: { code: input.code }
        });
      });
      return { success: true };
    }),
    delete: adminProcedure.input(import_zod3.z.object({ code: import_zod3.z.string().min(2).max(50) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(crmScripts).where((0, import_drizzle_orm5.eq)(crmScripts.code, input.code));
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "CrmScriptDeleted",
          entityType: "crm_script",
          entityId: null,
          actorUserId: ctx.user.id,
          payload: { code: input.code }
        });
      });
      return { success: true };
    })
  }),
  // ========================================
  // DADOS COMPLETOS DO CLIENTE (PARA FRONTEND)
  // ========================================
  getCustomerFullData: protectedProcedure.input(import_zod3.z.object({ customerId: import_zod3.z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const customer2 = await db.select().from(customers).where((0, import_drizzle_orm5.eq)(customers.id, input.customerId)).limit(1);
    if (!customer2[0]) return null;
    const treatments = await db.select().from(customerTreatments).where(
      (0, import_drizzle_orm5.and)(
        (0, import_drizzle_orm5.eq)(customerTreatments.customerId, input.customerId),
        (0, import_drizzle_orm5.eq)(customerTreatments.isActive, 1)
      )
    ).orderBy((0, import_drizzle_orm5.desc)(customerTreatments.dataFimPrevisto));
    const customerTagsList = await db.select({
      tag: tags
    }).from(customerTags).innerJoin(tags, (0, import_drizzle_orm5.eq)(customerTags.tagId, tags.id)).where((0, import_drizzle_orm5.eq)(customerTags.customerId, input.customerId));
    const baseCustomer = { ...customer2[0] };
    if (ctx.user.role !== "admin") {
      baseCustomer.healthTagsJson = null;
    }
    return {
      ...baseCustomer,
      treatments,
      tags: customerTagsList.map((t2) => t2.tag)
    };
  }),
  // ========================================
  // PHARMACORE: PURCHASE HISTORY + SUGGESTIONS
  // ========================================
  pharma: router({
    ingestPurchase: protectedProcedure.input(
      import_zod3.z.object({
        customerId: import_zod3.z.number(),
        externalId: import_zod3.z.string().optional(),
        purchaseDate: import_zod3.z.string().optional(),
        totalValue: import_zod3.z.number().optional(),
        channel: import_zod3.z.enum(["loja", "delivery", "whatsapp", "outros"]).optional(),
        items: import_zod3.z.array(
          import_zod3.z.object({
            ean: import_zod3.z.string().optional(),
            name: import_zod3.z.string().min(1),
            quantity: import_zod3.z.number().min(1),
            price: import_zod3.z.number().optional(),
            category: import_zod3.z.enum(["medicamento", "perfumaria", "outros"]).optional(),
            substance: import_zod3.z.string().optional(),
            daysDuration: import_zod3.z.number().optional()
          })
        ).min(1)
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : /* @__PURE__ */ new Date();
      const channel = input.channel ?? "outros";
      const total = Number.isFinite(input.totalValue) ? Number(input.totalValue) : input.items.reduce(
        (acc, it) => acc + (Number(it.price || 0) * it.quantity || 0),
        0
      );
      for (const it of input.items) {
        if (!it.ean) continue;
        try {
          const ex = await db.select({ ean: pharmaProducts.ean }).from(pharmaProducts).where((0, import_drizzle_orm5.eq)(pharmaProducts.ean, it.ean)).limit(1);
          if (!ex?.[0]) {
            await db.insert(pharmaProducts).values({
              ean: it.ean,
              name: it.name,
              category: it.category || "outros",
              substance: it.substance || null,
              daysDuration: it.daysDuration ?? null
            });
          }
        } catch {
        }
      }
      const inserted = await db.insert(pharmaPurchases).values({
        customerId: input.customerId,
        externalId: input.externalId || null,
        purchaseDate,
        totalValue: String(total),
        channel,
        createdAt: /* @__PURE__ */ new Date()
      }).$returningId();
      const purchaseId = inserted?.[0]?.id;
      if (purchaseId) {
        await db.insert(pharmaPurchaseItems).values(
          input.items.map((it) => ({
            purchaseId,
            productEan: it.ean || null,
            productName: it.name,
            quantity: it.quantity,
            price: String(it.price || 0)
          }))
        );
      }
      await db.update(customers).set({
        lastPurchaseAt: purchaseDate,
        ltvValue: import_drizzle_orm5.sql`${customers.ltvValue} + ${total}`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm5.eq)(customers.id, input.customerId));
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "PurchaseIngested",
          entityType: "customer",
          entityId: input.customerId,
          actorUserId: ctx.user.id,
          payload: {
            purchaseId: purchaseId ?? null,
            externalId: input.externalId ?? null,
            purchaseDate: purchaseDate.toISOString(),
            total,
            channel,
            itemsCount: input.items.length
          }
        });
      });
      return { id: purchaseId ?? null };
    }),
    listPurchasesByCustomer: protectedProcedure.input(
      import_zod3.z.object({
        customerId: import_zod3.z.number(),
        limit: import_zod3.z.number().min(1).max(200).default(50)
      })
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(pharmaPurchases).where((0, import_drizzle_orm5.eq)(pharmaPurchases.customerId, input.customerId)).orderBy((0, import_drizzle_orm5.desc)(pharmaPurchases.purchaseDate)).limit(input.limit);
    }),
    listPurchaseItems: protectedProcedure.input(import_zod3.z.object({ purchaseId: import_zod3.z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(pharmaPurchaseItems).where((0, import_drizzle_orm5.eq)(pharmaPurchaseItems.purchaseId, input.purchaseId)).orderBy((0, import_drizzle_orm5.desc)(pharmaPurchaseItems.id));
    }),
    getSmartSuggestions: protectedProcedure.input(
      import_zod3.z.object({
        items: import_zod3.z.array(
          import_zod3.z.object({
            name: import_zod3.z.string()
          })
        )
      })
    ).query(async ({ input }) => {
      const names = input.items.map((i) => i.name.toLowerCase());
      const suggestions = [];
      const has = (re) => names.some((n) => re.test(n));
      if (has(/antibiot/)) {
        suggestions.push({
          title: "Probi\xF3tico",
          reason: "Antibi\xF3tico infantil costuma precisar de suporte intestinal"
        });
        suggestions.push({
          title: "Term\xF4metro",
          reason: "Complemento \xFAtil em quadros infecciosos"
        });
      }
      if (has(/fralda/)) {
        suggestions.push({
          title: "Pomada de assadura",
          reason: "Cross-sell natural para fraldas"
        });
      }
      if (has(/protetor\s+solar|fps|sunscreen/)) {
        suggestions.push({
          title: "P\xF3s-sol / hidratante",
          reason: "Aumenta a ades\xE3o ao cuidado p\xF3s-exposi\xE7\xE3o"
        });
      }
      return suggestions;
    })
  }),
  // ========================================
  // ENTERPRISE: ACCOUNTS (B2B)
  // ========================================
  accounts: router({
    list: protectedProcedure.input(
      import_zod3.z.object({
        query: import_zod3.z.string().optional(),
        limit: import_zod3.z.number().min(1).max(100).default(25)
      }).optional()
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const q = input?.query?.trim();
      const limit = input?.limit ?? 25;
      const where = q ? (0, import_drizzle_orm5.or)(
        (0, import_drizzle_orm5.like)(accounts.name, `%${q}%`),
        (0, import_drizzle_orm5.like)(accounts.legalName, `%${q}%`),
        (0, import_drizzle_orm5.like)(accounts.cnpj, `%${q}%`)
      ) : void 0;
      return await db.select().from(accounts).where(where).orderBy((0, import_drizzle_orm5.desc)(accounts.updatedAt)).limit(limit);
    }),
    create: protectedProcedure.input(
      import_zod3.z.object({
        name: import_zod3.z.string().min(2),
        legalName: import_zod3.z.string().optional(),
        cnpj: import_zod3.z.string().optional(),
        industry: import_zod3.z.string().optional(),
        website: import_zod3.z.string().optional(),
        phone: import_zod3.z.string().optional(),
        address: import_zod3.z.string().optional(),
        city: import_zod3.z.string().optional(),
        state: import_zod3.z.string().optional(),
        zipCode: import_zod3.z.string().optional(),
        ownerUserId: import_zod3.z.number().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(accounts).values({
        name: input.name,
        legalName: input.legalName || null,
        cnpj: input.cnpj || null,
        industry: input.industry || null,
        website: input.website || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zipCode: input.zipCode || null,
        ownerUserId: input.ownerUserId ?? ctx.user.id,
        createdBy: ctx.user.id,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).$returningId();
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "AccountCreated",
          entityType: "account",
          entityId: result[0].id,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { id: result[0].id };
    }),
    linkContact: protectedProcedure.input(
      import_zod3.z.object({
        accountId: import_zod3.z.number(),
        customerId: import_zod3.z.number(),
        role: import_zod3.z.string().optional(),
        isPrimary: import_zod3.z.boolean().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(accountContacts).values({
        accountId: input.accountId,
        customerId: input.customerId,
        role: input.role || null,
        isPrimary: input.isPrimary ? 1 : 0,
        createdAt: /* @__PURE__ */ new Date()
      }).onDuplicateKeyUpdate({
        set: {
          role: input.role || null,
          isPrimary: input.isPrimary ? 1 : 0
        }
      });
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "AccountContactLinked",
          entityType: "account",
          entityId: input.accountId,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { success: true };
    })
  }),
  // ========================================
  // ENTERPRISE: DEALS
  // ========================================
  deals: router({
    pipelines: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(dealPipelines).where((0, import_drizzle_orm5.eq)(dealPipelines.isActive, 1));
    }),
    stages: protectedProcedure.input(import_zod3.z.object({ pipelineId: import_zod3.z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(dealStages).where((0, import_drizzle_orm5.eq)(dealStages.pipelineId, input.pipelineId)).orderBy(dealStages.sortOrder);
    }),
    list: protectedProcedure.input(
      import_zod3.z.object({
        pipelineId: import_zod3.z.number().optional(),
        stageId: import_zod3.z.number().optional(),
        ownerUserId: import_zod3.z.number().optional(),
        limit: import_zod3.z.number().min(1).max(100).default(25)
      }).optional()
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const limit = input?.limit ?? 25;
      const conditions = [];
      if (input?.pipelineId)
        conditions.push((0, import_drizzle_orm5.eq)(deals.pipelineId, input.pipelineId));
      if (input?.stageId) conditions.push((0, import_drizzle_orm5.eq)(deals.stageId, input.stageId));
      if (input?.ownerUserId)
        conditions.push((0, import_drizzle_orm5.eq)(deals.ownerUserId, input.ownerUserId));
      return await db.select().from(deals).where(conditions.length ? (0, import_drizzle_orm5.and)(...conditions) : void 0).orderBy((0, import_drizzle_orm5.desc)(deals.updatedAt)).limit(limit);
    }),
    create: protectedProcedure.input(
      import_zod3.z.object({
        title: import_zod3.z.string().min(2),
        pipelineId: import_zod3.z.number(),
        stageId: import_zod3.z.number(),
        accountId: import_zod3.z.number().optional(),
        customerId: import_zod3.z.number().optional(),
        amountCents: import_zod3.z.number().int().optional(),
        closeDate: import_zod3.z.string().optional(),
        ownerUserId: import_zod3.z.number().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(deals).values({
        title: input.title,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        accountId: input.accountId ?? null,
        customerId: input.customerId ?? null,
        amountCents: input.amountCents ?? null,
        closeDate: input.closeDate ? new Date(input.closeDate) : null,
        ownerUserId: input.ownerUserId ?? ctx.user.id,
        createdBy: ctx.user.id,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        status: "open"
      }).$returningId();
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "DealCreated",
          entityType: "deal",
          entityId: result[0].id,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { id: result[0].id };
    }),
    moveStage: protectedProcedure.input(import_zod3.z.object({ dealId: import_zod3.z.number(), stageId: import_zod3.z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(deals).set({ stageId: input.stageId, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(deals.id, input.dealId));
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "DealStageChanged",
          entityType: "deal",
          entityId: input.dealId,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { success: true };
    })
  }),
  // ========================================
  // ENTERPRISE: TASKS
  // ========================================
  tasks: router({
    list: protectedProcedure.input(
      import_zod3.z.object({
        assignedTo: import_zod3.z.number().optional(),
        status: import_zod3.z.enum(["open", "done", "cancelled"]).optional(),
        limit: import_zod3.z.number().min(1).max(100).default(50)
      }).optional()
    ).query(async ({ ctx, input }) => {
      console.log("[customers.list] ctx.user:", ctx.user?.username, "| role:", ctx.user?.role);
      console.log("[customers.list] ctx.user:", ctx.user?.username, "| role:", ctx.user?.role);
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions = [];
      conditions.push(
        (0, import_drizzle_orm5.eq)(crmTasks.assignedTo, input?.assignedTo ?? ctx.user.id)
      );
      if (input?.status) conditions.push((0, import_drizzle_orm5.eq)(crmTasks.status, input.status));
      return await db.select().from(crmTasks).where((0, import_drizzle_orm5.and)(...conditions)).orderBy((0, import_drizzle_orm5.desc)(crmTasks.updatedAt)).limit(input?.limit ?? 50);
    }),
    create: protectedProcedure.input(
      import_zod3.z.object({
        title: import_zod3.z.string().min(2),
        description: import_zod3.z.string().optional(),
        dueAt: import_zod3.z.string().optional(),
        priority: import_zod3.z.enum(["low", "medium", "high"]).optional(),
        relatedEntityType: import_zod3.z.string().optional(),
        relatedEntityId: import_zod3.z.number().optional(),
        assignedTo: import_zod3.z.number().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(crmTasks).values({
        title: input.title,
        description: input.description || null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        priority: input.priority || "medium",
        relatedEntityType: input.relatedEntityType || null,
        relatedEntityId: input.relatedEntityId ?? null,
        assignedTo: input.assignedTo ?? ctx.user.id,
        createdBy: ctx.user.id,
        status: "open",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        completedAt: null
      }).$returningId();
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "TaskCreated",
          entityType: "task",
          entityId: result[0].id,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { id: result[0].id };
    }),
    complete: protectedProcedure.input(import_zod3.z.object({ taskId: import_zod3.z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(crmTasks).set({
        status: "done",
        completedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm5.eq)(crmTasks.id, input.taskId));
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "TaskCompleted",
          entityType: "task",
          entityId: input.taskId,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { success: true };
    })
  }),
  // ========================================
  // ENTERPRISE: ACTIVITIES (timeline)
  // ========================================
  activities: router({
    listByEntity: protectedProcedure.input(
      import_zod3.z.object({
        entityType: import_zod3.z.string().min(1).max(40),
        entityId: import_zod3.z.number(),
        limit: import_zod3.z.number().min(1).max(200).default(50)
      })
    ).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(crmActivities).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(crmActivities.entityType, input.entityType),
          (0, import_drizzle_orm5.eq)(crmActivities.entityId, input.entityId)
        )
      ).orderBy((0, import_drizzle_orm5.desc)(crmActivities.occurredAt)).limit(input.limit);
    })
  }),
  // ========================================
  // ENTERPRISE: CUSTOM FIELDS
  // ========================================
  customFields: router({
    listDefinitions: protectedProcedure.input(import_zod3.z.object({ entityType: import_zod3.z.string().min(1).max(40) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(customFieldDefinitions).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(customFieldDefinitions.entityType, input.entityType),
          (0, import_drizzle_orm5.eq)(customFieldDefinitions.isActive, 1)
        )
      ).orderBy((0, import_drizzle_orm5.desc)(customFieldDefinitions.updatedAt));
    }),
    upsertValue: protectedProcedure.input(
      import_zod3.z.object({
        entityType: import_zod3.z.string().min(1).max(40),
        entityId: import_zod3.z.number(),
        fieldDefinitionId: import_zod3.z.number(),
        valueText: import_zod3.z.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(customFieldValues).values({
        entityType: input.entityType,
        entityId: input.entityId,
        fieldDefinitionId: input.fieldDefinitionId,
        valueText: input.valueText ?? null,
        updatedBy: ctx.user.id,
        updatedAt: /* @__PURE__ */ new Date()
      }).onDuplicateKeyUpdate({
        set: {
          valueText: input.valueText ?? null,
          updatedBy: ctx.user.id,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "CustomFieldValueUpserted",
          entityType: input.entityType,
          entityId: input.entityId,
          actorUserId: ctx.user.id,
          payload: input
        });
      });
      return { success: true };
    })
  })
});

// server/routers-ai.ts
var import_zod4 = require("zod");
init_trpc();
init_llm();

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/routers-ai.ts
var aiRouter = router({
  /**
   * Get AI Configuration
   */
  getConfig: adminProcedure.query(async () => {
    return {
      providers: {
        openai: {
          env,
          model: "gpt-3.5-turbo"
        },
        anthropic: {
          env,
          model: "claude-3-sonnet"
        },
        google: { env, model: "gemini-pro" }
      },
      knowledgeBases: [
        "faq_farmacia",
        "produtos_farmacia",
        "politicas_farmacia"
      ],
      defaultPrompt: "Voc\xEA \xE9 um assistente virtual da Farm\xE1cia Francis. Forne\xE7a informa\xE7\xF5es precisas e profissionais sobre medicamentos, produtos e servi\xE7os.",
      maxTokens: 1e3,
      temperature: 0.3,
      fallbackEnabled: true,
      validationEnabled: true,
      maxResponseTime: 1e4,
      maxRetries: 3
    };
  }),
  /**
   * Apply an AI automation template.
   * NOTE: This is currently a safe no-op to avoid crashing production.
   * It provides a stable API for the UI and can be wired to real template
   * provisioning later.
   */
  applyTemplate: adminProcedure.input(
    import_zod4.z.object({
      templateType: import_zod4.z.string(),
      settings: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.unknown()).optional()
    })
  ).mutation(async ({ input }) => {
    return {
      success: true,
      message: `Template "${input.templateType}" aplicado (modo seguro).`
    };
  }),
  /**
   * Process AI Conversation
   */
  processConversation: adminProcedure.input(
    import_zod4.z.object({
      templateId: import_zod4.z.string(),
      customerId: import_zod4.z.number(),
      channelId: import_zod4.z.string(),
      message: import_zod4.z.string(),
      context: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.unknown()).optional()
    })
  ).mutation(async ({ input }) => {
    const { processAIConversation: processAIConversation2 } = await Promise.resolve().then(() => (init_ai_integration(), ai_integration_exports));
    const req = {
      body: input,
      headers: {}
    };
    const res = {
      json: (data) => data,
      status: (code) => res
    };
    return await processAIConversation2(req, res);
  }),
  /**
   * Process Automation Flow
   */
  processAutomation: adminProcedure.input(
    import_zod4.z.object({
      flowId: import_zod4.z.string(),
      triggerType: import_zod4.z.string(),
      triggerData: import_zod4.z.record(import_zod4.z.string(), import_zod4.z.unknown()).optional(),
      customerId: import_zod4.z.number().optional()
    })
  ).mutation(async ({ input }) => {
    const { processAutomationFlow: processAutomationFlow2 } = await Promise.resolve().then(() => (init_ai_integration(), ai_integration_exports));
    const req = {
      body: input,
      headers: {}
    };
    const res = {
      json: (data) => data,
      status: (code) => res
    };
    return await processAutomationFlow2(req, res);
  }),
  /**
   * Transcrever áudio usando Whisper
   */
  transcribeAudio: protectedProcedure.input(
    import_zod4.z.object({
      audioUrl: import_zod4.z.string().url(),
      messageId: import_zod4.z.number(),
      language: import_zod4.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const result = await transcribeAudio({
      audioUrl: input.audioUrl,
      language: input.language
    });
    if ("error" in result) {
      throw new Error(result.error);
    }
    return {
      transcription: result.text,
      language: result.language
    };
  }),
  /**
   * Sugerir 3 respostas usando IA
   */
  suggestResponses: protectedProcedure.input(
    import_zod4.z.object({
      customerMessage: import_zod4.z.string(),
      customerName: import_zod4.z.string(),
      context: import_zod4.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const prompt = `Voc\xEA \xE9 um assistente de atendimento de uma farm\xE1cia chamada Farma Francis.

Cliente: ${input.customerName}
Mensagem do cliente: "${input.customerMessage}"
${input.context ? `Contexto adicional: ${input.context}` : ""}

Gere 3 sugest\xF5es de resposta profissionais, emp\xE1ticas e \xFAteis. As respostas devem:
1. Ser cordiais e usar o nome do cliente
2. Responder diretamente \xE0 pergunta
3. Oferecer ajuda adicional quando apropriado
4. Ser concisas (m\xE1ximo 2-3 frases cada)

Retorne apenas as 3 respostas, uma por linha, sem numera\xE7\xE3o.`;
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Voc\xEA \xE9 um assistente especializado em atendimento farmac\xEAutico."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content3 = response.choices[0].message.content;
    const text4 = typeof content3 === "string" ? content3 : "";
    const suggestions = text4.split("\n").filter((line) => line.trim().length > 0).slice(0, 3);
    return { suggestions };
  }),
  /**
   * Analisar sentimento da mensagem
   */
  analyzeSentiment: protectedProcedure.input(
    import_zod4.z.object({
      message: import_zod4.z.string()
    })
  ).mutation(async ({ input }) => {
    const prompt = `Analise o sentimento da seguinte mensagem de um cliente:

"${input.message}"

Classifique o sentimento como:
- "happy" (feliz, satisfeito, positivo)
- "neutral" (neutro, informativo)
- "frustrated" (frustrado, irritado, negativo)

Retorne apenas uma palavra: happy, neutral ou frustrated.`;
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Voc\xEA \xE9 um analisador de sentimentos especializado."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    const content2 = response.choices[0].message.content;
    const sentiment = typeof content2 === "string" ? content2.trim().toLowerCase() : "neutral";
    return {
      sentiment,
      confidence: 0.85
      // Placeholder - pode ser melhorado com modelo específico
    };
  }),
  /**
   * Extrair dados de receita usando OCR
   */
  extractRecipeData: protectedProcedure.input(
    import_zod4.z.object({
      imageUrl: import_zod4.z.string()
    })
  ).mutation(async ({ input }) => {
    let base64Image = "";
    let mimeType = "image/jpeg";
    try {
      if (input.imageUrl.startsWith("data:")) {
        const match = input.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Image = match[2];
        }
      } else {
        const response2 = await fetch(input.imageUrl, {
          signal: AbortSignal.timeout(15e3)
        });
        if (!response2.ok) {
          throw new Error(`Failed to download image: ${response2.status}`);
        }
        const arrayBuffer = await response2.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Image = buffer.toString("base64");
        const headerCt = response2.headers.get("content-type");
        if (headerCt) {
          mimeType = headerCt.split(";")[0];
        } else if (buffer.length >= 2) {
          if (buffer[0] === 255 && buffer[1] === 216)
            mimeType = "image/jpeg";
          else if (buffer[0] === 137 && buffer[1] === 80)
            mimeType = "image/png";
          else if (buffer[0] === 71 && buffer[1] === 73)
            mimeType = "image/gif";
        }
      }
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      const prompt = `Analise esta imagem de receita m\xE9dica e extraia:
1. Nome do medicamento
2. Dosagem
3. Quantidade prescrita
4. Nome do m\xE9dico (se vis\xEDvel)
5. CRM do m\xE9dico (se vis\xEDvel)

Retorne em formato JSON.`;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Voc\xEA \xE9 um assistente de extra\xE7\xE3o de dados de receitas m\xE9dicas. Analise a imagem e retorne os dados em JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ]
      });
      const content2 = response.choices[0].message.content;
      const text4 = typeof content2 === "string" ? content2 : "{}";
      try {
        const data = JSON.parse(text4);
        return {
          medication: data.medication,
          dosage: data.dosage,
          quantity: data.quantity,
          doctorName: data.doctorName,
          doctorCRM: data.doctorCRM,
          confidence: 0.75
        };
      } catch {
        return {
          medication: "",
          dosage: "",
          quantity: "",
          doctorName: "",
          doctorCRM: "",
          confidence: 0,
          error: "N\xE3o foi poss\xEDvel extrair dados da receita"
        };
      }
    } catch (error) {
      console.error("[extractRecipeData] Error:", error.message);
      if (error.message === "IMAGE_NOT_SUPPORTED" || error.message?.includes("does not support image")) {
        return {
          medication: "",
          dosage: "",
          quantity: "",
          doctorName: "",
          doctorCRM: "",
          confidence: 0,
          error: "O modelo de IA atual n\xE3o suporta an\xE1lise de imagens. Por favor, digite as informa\xE7\xF5es da receita manualmente."
        };
      }
      throw error;
    }
  })
});

// server/routers-api-config.ts
init_trpc();
var import_zod5 = require("zod");
init_db();
init_schema();
var import_drizzle_orm6 = require("drizzle-orm");
var import_server2 = require("@trpc/server");

// server/integrations/telegram.ts
async function telegramApi(botToken, method, params = {}) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  return data.result;
}
async function validateTelegramCredentials(config) {
  try {
    const me = await telegramApi(config.botToken, "getMe", {});
    return {
      valid: true,
      botInfo: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        canJoinGroups: me.can_join_groups,
        canReadAllGroupMessages: me.can_read_all_group_messages,
        supportsInlineQueries: me.supports_inline_queries
      }
    };
  } catch (error) {
    console.error("[Telegram API] Error validating credentials:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/routers-api-config.ts
var apiConfigRouter = router({
  /**
   * Buscar configurações de uma integração específica
   */
  get: adminProcedure.input(import_zod5.z.object({
    integrationType: import_zod5.z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"])
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm6.eq)(integrationSettings.integrationType, input.integrationType)).limit(1);
    if (!config) return null;
    const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
    return {
      ...config,
      config: configData
    };
  }),
  /**
   * Salvar ou atualizar configurações de uma integração
   */
  save: adminProcedure.input(import_zod5.z.object({
    integrationType: import_zod5.z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"]),
    name: import_zod5.z.string(),
    accessToken: import_zod5.z.string().optional(),
    phoneNumberId: import_zod5.z.string().optional(),
    businessAccountId: import_zod5.z.string().optional(),
    webhookUrl: import_zod5.z.string().optional(),
    webhookSecret: import_zod5.z.string().optional(),
    webhookVerifyToken: import_zod5.z.string().optional(),
    appSecret: import_zod5.z.string().optional(),
    apiUrl: import_zod5.z.string().optional(),
    apiKey: import_zod5.z.string().optional(),
    instanceName: import_zod5.z.string().optional(),
    botToken: import_zod5.z.string().optional(),
    // Telegram
    isActive: import_zod5.z.boolean().default(true)
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    if (!ctx.user) throw new import_server2.TRPCError({ code: "UNAUTHORIZED" });
    const config = {
      accessToken: input.accessToken,
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
      webhookUrl: input.webhookUrl,
      webhookSecret: input.webhookSecret,
      webhookVerifyToken: input.webhookVerifyToken,
      appSecret: input.appSecret,
      apiUrl: input.apiUrl,
      apiKey: input.apiKey,
      instanceName: input.instanceName,
      botToken: input.botToken
      // Telegram
    };
    const [existing] = await db.select().from(integrationSettings).where((0, import_drizzle_orm6.eq)(integrationSettings.integrationType, input.integrationType)).limit(1);
    if (existing) {
      await db.update(integrationSettings).set({
        name: input.name,
        config: JSON.stringify(config),
        isActive: input.isActive,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm6.eq)(integrationSettings.id, existing.id));
      return { success: true, id: existing.id, action: "updated" };
    } else {
      const [result] = await db.insert(integrationSettings).values({
        integrationType: input.integrationType,
        name: input.name,
        config: JSON.stringify(config),
        isActive: input.isActive,
        createdBy: ctx.user.id,
        testStatus: "pending"
      }).$returningId();
      return { success: true, id: result.id, action: "created" };
    }
  }),
  /**
   * Testar conexão com a API
   */
  test: adminProcedure.input(import_zod5.z.object({
    integrationType: import_zod5.z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram"]),
    accessToken: import_zod5.z.string(),
    phoneNumberId: import_zod5.z.string().optional(),
    businessAccountId: import_zod5.z.string().optional(),
    apiUrl: import_zod5.z.string().optional()
  })).mutation(async ({ input }) => {
    try {
      if (input.integrationType === "telegram") {
        if (!input.accessToken) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: "Bot Token \xE9 obrigat\xF3rio"
          });
        }
        const result = await validateTelegramCredentials({ botToken: input.accessToken });
        if (!result.valid) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: `Erro ao conectar: ${result.error || "Token inv\xE1lido"}`
          });
        }
        return {
          success: true,
          message: "Bot do Telegram conectado com sucesso!",
          data: {
            botUsername: result.botInfo?.username,
            botName: result.botInfo?.firstName,
            botId: result.botInfo?.id
          }
        };
      }
      if (input.integrationType === "whatsapp_business") {
        if (!input.accessToken || !input.phoneNumberId) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: "Access Token e Phone Number ID s\xE3o obrigat\xF3rios"
          });
        }
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${input.phoneNumberId}`,
          {
            headers: {
              Authorization: `Bearer ${input.accessToken}`
            }
          }
        );
        if (!response.ok) {
          const error = await response.json();
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: `Erro ao conectar: ${error.error?.message || "Token inv\xE1lido"}`
          });
        }
        const data = await response.json();
        return {
          success: true,
          message: "Conex\xE3o bem-sucedida!",
          data: {
            phoneNumber: data.display_phone_number,
            verifiedName: data.verified_name
          }
        };
      } else if (input.integrationType === "instagram_graph") {
        if (!input.accessToken || !input.businessAccountId) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: "Access Token e Business Account ID s\xE3o obrigat\xF3rios"
          });
        }
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${input.businessAccountId}?fields=id,name,username&access_token=${input.accessToken}`
        );
        if (!response.ok) {
          const error = await response.json();
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: `Erro ao conectar: ${error.error?.message || "Token inv\xE1lido"}`
          });
        }
        const data = await response.json();
        return {
          success: true,
          message: "Conex\xE3o bem-sucedida!",
          data: {
            accountId: data.id,
            name: data.name,
            username: data.username
          }
        };
      } else if (input.integrationType === "evolution_api") {
        if (!input.apiUrl || !input.accessToken) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: "API URL e API Key s\xE3o obrigat\xF3rios"
          });
        }
        const response = await fetch(`${input.apiUrl}/instance/fetchInstances`, {
          headers: {
            apikey: input.accessToken
          }
        });
        if (!response.ok) {
          throw new import_server2.TRPCError({
            code: "BAD_REQUEST",
            message: "Erro ao conectar: API Key inv\xE1lida ou URL incorreta"
          });
        }
        const data = await response.json();
        return {
          success: true,
          message: "Conex\xE3o bem-sucedida!",
          data: {
            instances: Array.isArray(data) ? data.length : 0
          }
        };
      }
      throw new import_server2.TRPCError({
        code: "BAD_REQUEST",
        message: "Tipo de integra\xE7\xE3o n\xE3o suportado"
      });
    } catch (error) {
      if (error instanceof import_server2.TRPCError) throw error;
      throw new import_server2.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao testar conex\xE3o: ${error.message}`
      });
    }
  }),
  /**
      * Deletar configuração
      */
  delete: adminProcedure.input(import_zod5.z.object({
    integrationType: import_zod5.z.enum(["whatsapp_business", "instagram_graph", "evolution_api", "telegram", "email"])
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    await db.delete(integrationSettings).where((0, import_drizzle_orm6.eq)(integrationSettings.integrationType, input.integrationType));
    return { success: true };
  }),
  /**
   * Gerar QR Code para conectar WhatsApp via Evolution API
   */
  generateQrCode: adminProcedure.input(import_zod5.z.object({
    apiUrl: import_zod5.z.string(),
    apiKey: import_zod5.z.string(),
    instanceName: import_zod5.z.string()
  })).mutation(async ({ input }) => {
    try {
      const cleanApiUrl = input.apiUrl.replace(/\/$/, "");
      console.log("[QR Code] Creating instance with QR...");
      const createResponse = await fetch(`${cleanApiUrl}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: input.apiKey
        },
        body: JSON.stringify({
          instanceName: input.instanceName,
          qr: true,
          integration: "WHATSAPP"
        })
      });
      const createText = await createResponse.text();
      console.log("[QR Code] Create response:", createText.substring(0, 500));
      const endpoints = [
        `${cleanApiUrl}/instance/qrcode/${input.instanceName}`,
        `${cleanApiUrl}/instance/connect/${input.instanceName}`,
        `${cleanApiUrl}/instance/QRCode/${input.instanceName}`
      ];
      let qrData = null;
      let workedEndpoint = null;
      for (const endpoint of endpoints) {
        console.log("[QR Code] Trying endpoint:", endpoint);
        try {
          const qrResponse = await fetch(endpoint, {
            headers: {
              apikey: input.apiKey
            }
          });
          if (qrResponse.ok) {
            const data = await qrResponse.text();
            console.log("[QR Code] Response from", endpoint, ":", data.substring(0, 500));
            try {
              qrData = JSON.parse(data);
              workedEndpoint = endpoint;
              break;
            } catch {
              if (data.startsWith("data:image") || data.length > 100) {
                qrData = { base64: data };
                workedEndpoint = endpoint;
                break;
              }
            }
          }
        } catch (e) {
          console.log("[QR Code] Endpoint failed:", endpoint, e);
        }
      }
      if (!qrData) {
        console.log("[QR Code] Checking instance status...");
        const statusResponse = await fetch(`${cleanApiUrl}/instance/fetchInstances`, {
          headers: {
            apikey: input.apiKey
          }
        });
        if (statusResponse.ok) {
          const instances = await statusResponse.json();
          console.log("[QR Code] Instances:", JSON.stringify(instances).substring(0, 500));
        }
      }
      console.log("[QR Code] Final qrData:", qrData);
      if (!qrData) {
        return {
          success: false,
          message: "N\xE3o foi poss\xEDvel gerar o QR Code. A inst\xE2ncia pode j\xE1 estar conectada ou os endpoints podem ter mudado.",
          hint: "Tente desconectar a inst\xE2ncia manualmente no Evolution API e tente novamente."
        };
      }
      let qrCode = qrData.base64 || qrData.qrcode || qrData.data || qrData.qr || qrData.code || qrData.pairingCode;
      if (!qrCode && qrData.instance?.qrcode) {
        qrCode = qrData.instance.qrcode;
      }
      if (!qrCode && qrData.status === "created") {
        return {
          success: true,
          qrCode: null,
          message: "Inst\xE2ncia criada! Aguarde uns segundos e tente novamente para gerar o QR Code.",
          justCreated: true
        };
      }
      if (!qrCode) {
        return {
          success: false,
          message: "QR Code n\xE3o encontrado na resposta. Verifique o status da inst\xE2ncia.",
          debug: workedEndpoint
        };
      }
      return {
        success: true,
        qrCode,
        message: "QR Code gerado com sucesso! Escaneie com o WhatsApp."
      };
    } catch (error) {
      console.error("[QR Code] Error:", error);
      if (error instanceof import_server2.TRPCError) throw error;
      throw new import_server2.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao gerar QR Code: ${error.message}`
      });
    }
  }),
  /**
   * Desconectar instância do WhatsApp (para gerar novo QR Code)
   */
  disconnectInstance: adminProcedure.input(import_zod5.z.object({
    apiUrl: import_zod5.z.string(),
    apiKey: import_zod5.z.string(),
    instanceName: import_zod5.z.string()
  })).mutation(async ({ input }) => {
    try {
      const cleanApiUrl = input.apiUrl.replace(/\/$/, "");
      console.log("[QR Code] Disconnecting instance:", input.instanceName);
      const deleteResponse = await fetch(
        `${cleanApiUrl}/instance/delete/${input.instanceName}`,
        {
          method: "DELETE",
          headers: {
            apikey: input.apiKey
          }
        }
      );
      if (!deleteResponse.ok) {
        throw new import_server2.TRPCError({
          code: "BAD_REQUEST",
          message: "Erro ao desconectar inst\xE2ncia. Verifique se ela existe no Evolution API."
        });
      }
      return {
        success: true,
        message: "Inst\xE2ncia desconectada! Agora voc\xEA pode gerar um novo QR Code."
      };
    } catch (error) {
      console.error("[QR Code] Disconnect error:", error);
      if (error instanceof import_server2.TRPCError) throw error;
      throw new import_server2.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao desconectar: ${error.message}`
      });
    }
  })
});

// server/routers-automation.ts
init_trpc();
var import_zod6 = require("zod");

// server/automation-sse.ts
init_sse();
init_logger();
init_db();
init_schema();
var import_drizzle_orm7 = require("drizzle-orm");
async function executeAutomationWithSSE(params) {
  try {
    const db = await getDb();
    if (!db) {
      logger.error("Database not available for automation");
      return { success: false, error: "Database not available" };
    }
    logger.info("Executing automation with SSE integration", {
      automationId: params.automationId,
      templateType: params.templateType,
      customerId: params.customerId
    });
    let activeConversationId = params.conversationId;
    if (!activeConversationId) {
      const [activeConv] = await db.select().from(conversations).where(
        (0, import_drizzle_orm7.and)(
          (0, import_drizzle_orm7.eq)(conversations.customerId, params.customerId),
          (0, import_drizzle_orm7.eq)(conversations.status, "assigned")
        )
      ).orderBy(conversations.lastMessageAt).limit(1);
      if (activeConv) {
        activeConversationId = activeConv.id;
      }
    }
    switch (params.automationId) {
      case "welcome-message":
        await sendWelcomeMessage(
          db,
          params.customerId,
          activeConversationId,
          params.context || {}
        );
        break;
      case "follow-up-2h":
        await scheduleFollowUp(
          db,
          params.customerId,
          activeConversationId,
          "2h"
        );
        break;
      case "follow-up-24h":
        await scheduleFollowUp(
          db,
          params.customerId,
          activeConversationId,
          "24h"
        );
        break;
      case "urgent-notification":
        await sendUrgentNotification(
          db,
          params.customerId,
          activeConversationId
        );
        break;
      case "offer-reminder":
        await sendOfferReminder(db, params.customerId, activeConversationId);
        break;
      default:
        await sendCustomMessage(
          db,
          params.customerId,
          activeConversationId,
          params.automationId,
          params.context || {}
        );
        break;
    }
    return { success: true };
  } catch (error) {
    logger.error("Error executing automation with SSE", error);
    return { success: false, error: error.message };
  }
}
async function sendWelcomeMessage(db, customerId, conversationId2, context) {
  const customerName = context.name || "Cliente";
  const hour = (/* @__PURE__ */ new Date()).getHours();
  let greeting = "Bom dia";
  if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else if (hour >= 18) greeting = "Boa noite";
  const message2 = `${greeting} ${customerName}! Bem-vindo \xE0 Farm\xE1cia Francis! \u{1F60A}`;
  await saveMessageAndNotify(
    db,
    conversationId2,
    customerId,
    message2,
    "welcome"
  );
}
async function scheduleFollowUp(db, customerId, conversationId2, delay) {
  const message2 = `\u23F0 Lembrete: Seguiremos com voc\xEA em ${delay} para saber se tudo est\xE1 certo!`;
  await saveMessageAndNotify(
    db,
    conversationId2,
    customerId,
    message2,
    "follow-up"
  );
}
async function sendUrgentNotification(db, customerId, conversationId2) {
  const message2 = "\u{1F6A8} Detectamos uma situa\xE7\xE3o que pode precisar de aten\xE7\xE3o especial. Um de nossos farmac\xEAuticos entrar\xE1 em contato em breve!";
  await saveMessageAndNotify(db, conversationId2, customerId, message2, "urgent");
}
async function sendOfferReminder(db, customerId, conversationId2) {
  const message2 = "\u{1F39F} \xD3tima! Aproveite nossas ofertas especiais com at\xE9 20% de desconto!";
  await saveMessageAndNotify(db, conversationId2, customerId, message2, "offer");
}
async function sendCustomMessage(db, customerId, conversationId2, automationId, context) {
  const message2 = `\u2699 Automa\xE7\xE3o executada: ${automationId}`;
  await saveMessageAndNotify(
    db,
    conversationId2,
    customerId,
    message2,
    "automation"
  );
}
async function saveMessageAndNotify(db, conversationId2, customerId, content2, messageType2) {
  if (!conversationId2) return;
  const [messageRecord] = await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    senderId: null,
    senderType: "agent",
    // Automation messages come from agent
    content: content2,
    createdAt: /* @__PURE__ */ new Date()
  }).$returningId();
  sseManager.emitToUser(String(customerId), {
    type: EVENTS.MESSAGE_NEW,
    data: {
      conversationId: conversationId2,
      message: {
        id: messageRecord.insertId,
        content: content2,
        senderType: "agent",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        direction: "outbound",
        messageType: messageType2
      }
    },
    timestamp: Date.now()
  });
  sseManager.emitToUser(String(customerId), {
    type: EVENTS.CONVERSATION_UPDATE,
    data: {
      conversationId: conversationId2,
      lastMessageAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastMessage: content2
    },
    timestamp: Date.now()
  });
  logger.info(
    `Message sent via automation: ${messageType2} to customer ${customerId}`
  );
}

// server/routers-automation.ts
init_db();
init_schema_executions();
init_schema();
var import_drizzle_orm8 = require("drizzle-orm");
var CreateAutomationInput = import_zod6.z.object({
  name: import_zod6.z.string().min(1, "Nome \xE9 obrigat\xF3rio").max(255, "Nome muito longo"),
  description: import_zod6.z.string().max(1e3, "Descri\xE7\xE3o muito longa").optional(),
  templateType: import_zod6.z.string().default("pharma"),
  flowData: import_zod6.z.any().optional(),
  isActive: import_zod6.z.boolean().default(true),
  tags: import_zod6.z.array(import_zod6.z.string()).optional()
});
var UpdateAutomationInput = import_zod6.z.object({
  id: import_zod6.z.number(),
  name: import_zod6.z.string().min(1, "Nome \xE9 obrigat\xF3rio").max(255, "Nome muito longo").optional(),
  description: import_zod6.z.string().max(1e3, "Descri\xE7\xE3o muito longa").optional(),
  templateType: import_zod6.z.string().optional(),
  flowData: import_zod6.z.any().optional(),
  isActive: import_zod6.z.boolean().optional(),
  tags: import_zod6.z.array(import_zod6.z.string()).optional()
});
var AutomationFilterInput = import_zod6.z.object({
  isActive: import_zod6.z.boolean().optional(),
  templateType: import_zod6.z.string().optional(),
  search: import_zod6.z.string().optional(),
  tags: import_zod6.z.array(import_zod6.z.string()).optional(),
  limit: import_zod6.z.number().min(1).max(100).default(50),
  offset: import_zod6.z.number().min(0).default(0)
});
var TestAutomationInput = import_zod6.z.object({
  customerId: import_zod6.z.number().positive("Customer ID deve ser positivo"),
  context: import_zod6.z.record(import_zod6.z.string(), import_zod6.z.any()).optional()
});
var AutomationResponseSchema = import_zod6.z.object({
  success: import_zod6.z.boolean(),
  message: import_zod6.z.string().optional(),
  data: import_zod6.z.any().optional(),
  error: import_zod6.z.string().optional()
});
function successResponse(data, message2) {
  return { success: true, data, message: message2 };
}
function errorResponse(message2, error) {
  return { success: false, error, message: message2 };
}
var automationRouter = router({
  // -------------------- CREATE --------------------
  /**
   * Create a new automation/flow
   * POST /api/automation/create
   *
   * @example
   * ```json
   * {
   *   "name": "Welcome Automation",
   *   "description": "Sends welcome message to new customers",
   *   "templateType": "pharma",
   *   "flowData": {
   *     "nodes": [],
   *     "edges": []
   *   },
   *   "isActive": true,
   *   "tags": ["welcome", "onboarding"]
   * }
   * ```
   * @returns { success: boolean, data: { id: number }, message?: string }
   */
  create: protectedProcedure.input(CreateAutomationInput).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const [result] = await db.insert(visualFlows).values({
        name: input.name,
        description: input.description,
        templateType: input.templateType,
        flowData: JSON.stringify(input.flowData),
        isActive: input.isActive,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      const lastId = result.insertId || result.$mysqlInsertId();
      if (!lastId) {
        throw new Error("Failed to get inserted ID");
      }
      const [newFlow] = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, lastId)).limit(1);
      return {
        id: newFlow.id,
        name: newFlow.name
      };
    } catch (error) {
      console.error("Error creating automation:", error);
      return errorResponse(
        "Falha ao criar automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // -------------------- READ (LIST) --------------------
  /**
   * List all automations with optional filters
   * GET /api/automation/list?isActive=true&templateType=pharma&limit=20
   *
   * @query Parameters:
   * - isActive?: boolean - Filter by active status
   * - templateType?: string - Filter by template type
   * - search?: string - Search in name/description
   * - tags?: string[] - Filter by tags
   * - limit?: number (1-100, default: 50)
   * - offset?: number (default: 0)
   *
   * @example Request:
   * GET /api/automation/list?isActive=true&search=welcome&limit=10
   *
   * @returns { success: boolean, data: { items: [], total: number }, message?: string }
   */
  list: protectedProcedure.input(AutomationFilterInput).query(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      let query = db.select().from(visualFlows);
      let countQuery = db.select({ count: import_drizzle_orm8.sql`count(*)` }).from(visualFlows);
      const conditions = [];
      if (input.isActive !== void 0) {
        conditions.push((0, import_drizzle_orm8.eq)(visualFlows.isActive, input.isActive));
      }
      if (input.templateType) {
        conditions.push((0, import_drizzle_orm8.eq)(visualFlows.templateType, input.templateType));
      }
      if (input.search) {
        conditions.push(
          import_drizzle_orm8.sql`${visualFlows.name} ILIKE ${`%${input.search}%`} OR ${visualFlows.description} ILIKE ${`%${input.search}%`}`
        );
      }
      if (input.tags && input.tags.length > 0) {
        for (const tag of input.tags) {
          conditions.push(
            import_drizzle_orm8.sql`array_position(${visualFlows.tags}, ${tag}) IS NOT NULL`
          );
        }
      }
      if (conditions.length > 0) {
        query = query.where((0, import_drizzle_orm8.and)(...conditions));
        countQuery = countQuery.where((0, import_drizzle_orm8.and)(...conditions));
      }
      const countResult = await countQuery;
      const total = Number(countResult[0].count);
      query = query.limit(input.limit).offset(input.offset);
      const items = await query;
      const parsedItems = items.map((item) => ({
        ...item,
        flowData: item.flowData ? JSON.parse(item.flowData) : null,
        tags: item.tags ? JSON.parse(item.tags) : []
      }));
      return {
        items: parsedItems,
        total,
        limit: input.limit,
        offset: input.offset
      };
    } catch (error) {
      console.error("Error listing automations:", error);
      return errorResponse(
        "Falha ao listar automa\xE7\xF5es",
        error.message
      );
    }
  }),
  // -------------------- READ (SINGLE) --------------------
  /**
   * Get a specific automation by ID
   * GET /api/automation/:id
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": 1,
   *     "name": "Welcome Automation",
   *     "description": "Sends welcome message to new customers",
   *     "templateType": "pharma",
   *     "flowData": { "nodes": [], "edges": [] },
   *     "isActive": true,
   *     "tags": ["welcome", "onboarding"],
   *     "createdAt": "2025-03-15T10:00:00.000Z",
   *     "updatedAt": "2025-03-15T10:00:00.000Z"
   *   }
   * }
   * ```
   */
  get: protectedProcedure.input(import_zod6.z.object({ id: import_zod6.z.number() })).query(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const flows = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      if (flows.length === 0) {
        return errorResponse("Automa\xE7\xE3o n\xE3o encontrada", "NOT_FOUND");
      }
      const flow = flows[0];
      return successResponse({
        id: flow.id,
        name: flow.name,
        description: flow.description,
        templateType: flow.templateType,
        flowData: flow.flowData ? JSON.parse(flow.flowData) : null,
        isActive: flow.isActive,
        tags: flow.tags ? JSON.parse(flow.tags) : [],
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt
      });
    } catch (error) {
      console.error("Error getting automation:", error);
      return errorResponse(
        "Falha ao obter automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // -------------------- UPDATE --------------------
  /**
   * Update an existing automation
   * PUT /api/automation/:id
   *
   * @example
   * ```json
   * {
   *   "name": "Updated Welcome Automation",
   *   "description": "Updated description",
   *   "isActive": false
   * }
   * ```
   * @returns { success: boolean, data?: { id: number }, message?: string }
   */
  update: protectedProcedure.input(UpdateAutomationInput).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const existing = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      if (existing.length === 0) {
        return errorResponse("Automa\xE7\xE3o n\xE3o encontrada", "NOT_FOUND");
      }
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.name !== void 0) updateData.name = input.name;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.templateType !== void 0) updateData.templateType = input.templateType;
      if (input.flowData !== void 0) updateData.flowData = JSON.stringify(input.flowData);
      if (input.isActive !== void 0) updateData.isActive = input.isActive;
      if (input.tags !== void 0) updateData.tags = JSON.stringify(input.tags);
      await db.update(visualFlows).set(updateData).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id));
      return successResponse(
        { id: input.id },
        "Automa\xE7\xE3o atualizada com sucesso"
      );
    } catch (error) {
      console.error("Error updating automation:", error);
      return errorResponse(
        "Falha ao atualizar automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // -------------------- DELETE --------------------
  /**
   * Delete an automation (soft delete by setting isActive=false)
   * DELETE /api/automation/:id
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "message": "Automação desativada com sucesso"
   * }
   * ```
   */
  delete: protectedProcedure.input(import_zod6.z.object({ id: import_zod6.z.number() })).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const existing = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      if (existing.length === 0) {
        return errorResponse("Automa\xE7\xE3o n\xE3o encontrada", "NOT_FOUND");
      }
      await db.delete(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id));
      return successResponse(
        { id: input.id },
        "Automa\xE7\xE3o exclu\xEDda com sucesso"
      );
    } catch (error) {
      console.error("Error deleting automation:", error);
      return errorResponse(
        "Falha ao deletar automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // -------------------- TEST AUTOMATION --------------------
  /**
   * Manual test endpoint for any automation
   * POST /api/automation/:id/test
   *
   * @param id - Automation ID to test
   * @param body.customerId - Customer ID for test
   * @param body.context - Optional context data
   *
   * @example
   * Request:
   * POST /api/automation/1/test
   * ```json
   * {
   *   "customerId": 12345,
   *   "context": {
   *     "testMode": true,
   *     "manualTrigger": true
   *   }
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "message": "Automação executada em modo teste",
   *   "data": {
   *     "executionId": "abc-123",
   *     "status": "running",
   *     "stepsCompleted": 0,
   *     "totalSteps": 5
   *   }
   * }
   * ```
   */
  testById: protectedProcedure.input(
    import_zod6.z.object({
      id: import_zod6.z.number()
    }).and(TestAutomationInput)
  ).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const flows = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      const flow = flows[0];
      if (!flow) {
        return errorResponse("Automa\xE7\xE3o n\xE3o encontrada", "NOT_FOUND");
      }
      if (!flow.isActive) {
        return errorResponse("Automa\xE7\xE3o inativa", "INACTIVE");
      }
      const result = await executeAutomationWithSSE({
        automationId: flow.name,
        // ou flow.id se preferir
        templateType: flow.templateType,
        customerId: input.customerId,
        context: {
          ...input.context,
          testMode: true,
          manualTrigger: true,
          automationId: flow.id
        }
      });
      return successResponse(
        result,
        "Automa\xE7\xE3o executada em modo teste"
      );
    } catch (error) {
      console.error(`Error testing automation ${input.id}:`, error);
      return errorResponse(
        "Falha ao testar automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // -------------------- EXECUTE EXISTING ENDPOINT (IMPROVED) --------------------
  /**
   * Execute an automation with improved response format
   * POST /api/automation/execute
   *
   * @example
   * ```json
   * {
   *   "automationId": "welcome-message",
   *   "templateType": "pharma",
   *   "customerId": 12345,
   *   "conversationId": 67890
   * }
   * ```
   */
  execute: protectedProcedure.input(
    import_zod6.z.object({
      automationId: import_zod6.z.string(),
      templateType: import_zod6.z.string(),
      customerId: import_zod6.z.number(),
      conversationId: import_zod6.z.number().optional(),
      context: import_zod6.z.record(import_zod6.z.string(), import_zod6.z.any()).optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await executeAutomationWithSSE(input);
      if (result && typeof result === "object" && "success" in result) {
        return result;
      }
      return successResponse(
        result,
        "Automa\xE7\xE3o executada com sucesso"
      );
    } catch (error) {
      console.error("Automation execution error:", error);
      return errorResponse(
        "Falha ao executar automa\xE7\xE3o",
        error.message
      );
    }
  }),
  // Existing test endpoints (improved)
  // -------------------- TEST FLOW (IMPROVED) --------------------
  /**
   * Test a visual flow execution
   * POST /api/automation/test-flow
   *
   * @example
   * ```json
   * {
   *   "flowId": 1,
   *   "testMessage": "Teste manual de execução"
   * }
   * ```
   */
  testFlow: protectedProcedure.input(import_zod6.z.object({
    flowId: import_zod6.z.number(),
    testMessage: import_zod6.z.string().optional()
  })).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      const flows = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.flowId)).limit(1);
      const flow = flows[0];
      if (!flow) {
        return errorResponse("Fluxo n\xE3o encontrado", "NOT_FOUND");
      }
      await db.update(visualFlows).set({ isTestMode: true, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.flowId));
      await db.insert(flowExecutions).values({
        flowId: input.flowId,
        status: "running",
        trigger: "manual_test",
        startedAt: /* @__PURE__ */ new Date(),
        input: JSON.stringify({ testMessage: input.testMessage || "Teste manual" })
      });
      const lastIdResult = await db.get(import_drizzle_orm8.sql`SELECT last_insert_rowid() as id`);
      const lastId = lastIdResult?.id;
      if (!lastId) {
        throw new Error("Failed to get execution ID");
      }
      const [execution] = await db.select().from(flowExecutions).where((0, import_drizzle_orm8.eq)(flowExecutions.id, lastId)).limit(1);
      return successResponse(
        {
          executionId: execution.id,
          flowId: input.flowId,
          status: "running",
          mode: "test"
        },
        "Fluxo em modo teste. Mensagens n\xE3o ser\xE3o enviadas."
      );
    } catch (error) {
      console.error("Error testing flow:", error);
      return errorResponse(
        "Falha ao testar fluxo",
        error.message
      );
    }
  }),
  // -------------------- STATISTICS (IMPROVED) --------------------
  /**
   * Get automation statistics and analytics
   * GET /api/automation/stats?period=week
   *
   * @query period?: "today" | "week" | "month" (default: "today")
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "totalExecutions": 150,
   *     "successfulExecutions": 142,
   *     "failedExecutions": 8,
   *     "avgResponseTime": 1250,
   *     "totalConversations": 150,
   *     "whatsappExecutions": 105,
   *     "instagramExecutions": 45,
   *     "conversions": 21,
   *     "conversionRate": 14,
   *     "period": "week"
   *   }
   * }
   * ```
   */
  stats: protectedProcedure.input(
    import_zod6.z.object({
      period: import_zod6.z.enum(["today", "week", "month"]).default("today")
    })
  ).query(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const now = /* @__PURE__ */ new Date();
      let startDate;
      switch (input.period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
          break;
      }
      const executions = await db.select().from(flowExecutions).where((0, import_drizzle_orm8.gte)(flowExecutions.startedAt, startDate));
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(
        (e) => e.status === "completed"
      ).length;
      const failedExecutions = executions.filter(
        (e) => e.status === "failed"
      ).length;
      const durationsWithValues = executions.filter(
        (e) => e.duration !== null && e.duration > 0
      );
      const avgDuration = durationsWithValues.length > 0 ? Math.round(
        durationsWithValues.reduce(
          (sum, e) => sum + (e.duration || 0),
          0
        ) / durationsWithValues.length
      ) : 0;
      return successResponse(
        {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          avgResponseTime: avgDuration,
          totalConversations: totalExecutions,
          whatsappExecutions: Math.round(totalExecutions * 0.7),
          instagramExecutions: Math.round(totalExecutions * 0.3),
          conversions: Math.round(successfulExecutions * 0.15),
          conversionRate: totalExecutions > 0 ? Math.round(successfulExecutions / totalExecutions * 100) : 0,
          period: input.period
        },
        "Estat\xEDsticas obtidas com sucesso"
      );
    } catch (error) {
      console.error("Error fetching automation stats:", error);
      return errorResponse(
        "Falha ao obter estat\xEDsticas",
        error.message
      );
    }
  }),
  // -------------------- EXECUTION HISTORY --------------------
  /**
   * Get execution history for a specific automation
   * GET /api/automation/:id/executions?limit=20&offset=0
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "items": [
   *       {
   *         "id": 1,
   *         "status": "completed",
   *         "startedAt": "2025-03-15T10:00:00.000Z",
   *         "duration": 2500,
   *         "input": {}
   *       }
   *     ],
   *     "total": 45
   *   }
   * }
   * ```
   */
  executions: protectedProcedure.input(
    import_zod6.z.object({
      id: import_zod6.z.number(),
      limit: import_zod6.z.number().min(1).max(100).default(20),
      offset: import_zod6.z.number().min(0).default(0)
    })
  ).query(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const flow = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      if (flow.length === 0) {
        return errorResponse("Automa\xE7\xE3o n\xE3o encontrada", "NOT_FOUND");
      }
      const query = db.select().from(flowExecutions).where((0, import_drizzle_orm8.eq)(flowExecutions.flowId, input.id)).orderBy(import_drizzle_orm8.sql`started_at DESC`).limit(input.limit).offset(input.offset);
      const executions = await query;
      const countResult = await db.select().from(flowExecutions).where((0, import_drizzle_orm8.eq)(flowExecutions.flowId, input.id)).limit(1).count();
      const total = Number(countResult[0].count);
      const parsedExecutions = executions.map((exec2) => ({
        ...exec2,
        input: exec2.input ? JSON.parse(exec2.input) : {},
        output: exec2.output ? JSON.parse(exec2.output) : null
      }));
      return successResponse(
        {
          items: parsedExecutions,
          total,
          limit: input.limit,
          offset: input.offset
        },
        `${total} execu\xE7\xE3o(\xF5es) encontrada(s)`
      );
    } catch (error) {
      console.error("Error fetching executions:", error);
      return errorResponse(
        "Falha ao obter hist\xF3rico de execu\xE7\xF5es",
        error.message
      );
    }
  }),
  // -------------------- EXECUTE FLOW BY ID (WEBHOOK) --------------------
  /**
   * Execute a specific flow by ID (triggered by webhook)
   * POST /api/automation/execute-flow/:id
   *
   * @param id - Flow ID (from URL)
   * @param context - Optional context data
   *
   * @returns { success: boolean, data: { executionId, status }, message?: string }
   */
  executeFlowById: protectedProcedure.input(import_zod6.z.object({
    id: import_zod6.z.number(),
    context: import_zod6.z.record(import_zod6.z.string(), import_zod6.z.any()).optional()
  })).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const [flow] = await db.select().from(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.id, input.id)).limit(1);
      if (!flow) {
        return errorResponse("Fluxo n\xE3o encontrado", "NOT_FOUND");
      }
      const flowData = flow.flowData ? JSON.parse(flow.flowData) : { nodes: [], edges: [] };
      const result = await executeAutomationWithSSE({
        automationId: flow.id.toString(),
        templateType: flow.templateType || "pharma",
        customerId: 0,
        // Webhook might not have customer
        context: input.context || {}
      });
      return successResponse(
        {
          executionId: result.executionId || null,
          status: result.status || "started",
          flowName: flow.name
        },
        "Fluxo executado com sucesso"
      );
    } catch (error) {
      console.error("Error executing flow by ID:", error);
      return errorResponse(
        "Falha ao executar fluxo",
        error.message
      );
    }
  }),
  // -------------------- CLEANUP OBSOLETE FLOWS --------------------
  /**
   * Delete all inactive/obsolete flows
   * DELETE /api/automation/cleanup
   */
  cleanup: protectedProcedure.mutation(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database n\xE3o dispon\xEDvel");
      }
      const result = await db.delete(visualFlows).where((0, import_drizzle_orm8.eq)(visualFlows.isActive, false));
      return successResponse(
        { deleted: true },
        "Fluxos obsoletos removidos com sucesso"
      );
    } catch (error) {
      console.error("Error cleaning up flows:", error);
      return errorResponse(
        "Falha ao limpar fluxos obsoletos",
        error.message
      );
    }
  })
});

// server/routers-baby-shower.ts
var import_zod7 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm12 = require("drizzle-orm");
var import_node_crypto = require("node:crypto");

// server/services/whatsapp.ts
init_db();
init_schema();
var import_drizzle_orm9 = require("drizzle-orm");
async function sendWhatsAppNotification(params) {
  try {
    const db = await getDb();
    if (!db) {
      return false;
    }
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm9.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    if (!config || !config.isActive) {
      return false;
    }
    const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
    const apiUrl = configData.apiUrl?.replace(/\/$/, "");
    const apiKey = configData.apiKey || configData.accessToken;
    const instanceName = configData.instanceName;
    if (!apiUrl || !apiKey || !instanceName) {
      return false;
    }
    let normalizedPhone = params.phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }
    const response = await fetch(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: params.message
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] Falha ao enviar para ${normalizedPhone}: ${response.status} - ${errorText}`);
    } else {
    }
    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Error sending WhatsApp:", error);
    return false;
  }
}

// server/services/shopping-cart-cleanup.ts
init_db();
init_schema();
var import_drizzle_orm10 = require("drizzle-orm");
var import_drizzle_orm11 = require("drizzle-orm");
var ShoppingCartCleanupService = class {
  static BATCH_SIZE = 100;
  /**
   * Remove automaticamente compras pendentes com mais de 24 horas
   * Este método deve ser chamado por um worker/cron a cada hora
   */
  static async cleanupPendingPurchases() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    let totalDeleted = 0;
    let hasMore = true;
    while (hasMore) {
      const oldPendingPurchases = await db.select({ id: babyShowerPurchases.id }).from(babyShowerPurchases).where(
        (0, import_drizzle_orm11.and)(
          (0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "pending"),
          (0, import_drizzle_orm10.lt)(babyShowerPurchases.createdAt, cutoffDate)
        )
      ).limit(this.BATCH_SIZE);
      if (oldPendingPurchases.length === 0) {
        hasMore = false;
        continue;
      }
      const ids = oldPendingPurchases.map((p) => p.id);
      const result = await db.delete(babyShowerPurchases).where((0, import_drizzle_orm11.inArray)(babyShowerPurchases.id, ids));
      totalDeleted += result.affectedRows ?? 0;
      if (oldPendingPurchases.length < this.BATCH_SIZE) {
        hasMore = false;
      }
    }
    return { deleted: totalDeleted };
  }
  /**
   * Remove manualmente compras antigas (todas as status)
   * @param olderThanDays -remove compras mais antigas que X dias
   */
  static async cleanupOldPurchases(olderThanDays = 365) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1e3);
    const result = await db.delete(babyShowerPurchases).where((0, import_drizzle_orm10.lt)(babyShowerPurchases.createdAt, cutoffDate));
    return { deleted: result.affectedRows ?? 0 };
  }
  /**
   * Remove compras por ID específico (para limpeza manual de um registro)
   */
  static async deletePurchase(purchaseId) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(babyShowerPurchases).where((0, import_drizzle_orm11.eq)(babyShowerPurchases.id, purchaseId));
    return { success: true };
  }
  /**
   * Conta compras pendentes antigas (para métricas/monitoramento)
   */
  static async countPendingOlderThan24h() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const result = await db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases).where(
      (0, import_drizzle_orm11.and)(
        (0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "pending"),
        (0, import_drizzle_orm10.lt)(babyShowerPurchases.createdAt, cutoffDate)
      )
    );
    return result[0]?.count ?? 0;
  }
  /**
   * Obtém estatísticas de compras (para admin)
   */
  static async getStats() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [
      total,
      pending,
      paid,
      failed,
      refunded,
      pending24
    ] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases),
      db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases).where((0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "pending")),
      db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases).where((0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "paid")),
      db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases).where((0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "failed")),
      db.select({ count: sql`COUNT(*)` }).from(babyShowerPurchases).where((0, import_drizzle_orm11.eq)(babyShowerPurchases.paymentStatus, "refunded")),
      this.countPendingOlderThan24h()
    ]);
    return {
      total: total[0]?.count ?? 0,
      pending: pending[0]?.count ?? 0,
      paid: paid[0]?.count ?? 0,
      failed: failed[0]?.count ?? 0,
      refunded: refunded[0]?.count ?? 0,
      pendingOlder24h: pending24
    };
  }
};

// server/routers-baby-shower.ts
var generateEventCode = () => {
  const date2 = /* @__PURE__ */ new Date();
  const year = date2.getFullYear();
  const month = String(date2.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  const code = `CHA${year}${month}${random}`;
  return code.trim();
};
var createEventSchema = import_zod7.z.object({
  motherCustomerId: import_zod7.z.number(),
  eventName: import_zod7.z.string().min(3).max(255),
  babyName: import_zod7.z.string().max(255).optional(),
  expectedDueDate: import_zod7.z.string().optional(),
  eventDate: import_zod7.z.string().optional(),
  targetAmount: import_zod7.z.number().optional(),
  welcomeMessage: import_zod7.z.string().optional()
});
var createPackageSchema = import_zod7.z.object({
  eventId: import_zod7.z.number(),
  packageName: import_zod7.z.string().min(2).max(120),
  description: import_zod7.z.string().optional(),
  giftType: import_zod7.z.enum(["diapers", "wipes", "money", "product"]),
  quantityRepresented: import_zod7.z.number().default(1),
  sizeLabel: import_zod7.z.string().optional(),
  price: import_zod7.z.number().positive(),
  stockLimit: import_zod7.z.number().optional(),
  imageUrl: import_zod7.z.string().optional()
});
var createPurchaseSchema = import_zod7.z.object({
  eventId: import_zod7.z.number(),
  packageId: import_zod7.z.number(),
  guestName: import_zod7.z.string().min(2).max(255),
  guestPhone: import_zod7.z.string().optional(),
  guestEmail: import_zod7.z.string().email().optional(),
  messageToParents: import_zod7.z.string().optional(),
  amountPaid: import_zod7.z.number().positive()
});
var createWithdrawalSchema = import_zod7.z.object({
  eventId: import_zod7.z.number(),
  withdrawalType: import_zod7.z.enum(["diapers", "wipes", "money"]),
  diaperSize: import_zod7.z.string().optional(),
  quantity: import_zod7.z.number().positive(),
  deliveryMethod: import_zod7.z.enum(["pickup", "delivery"]).default("pickup"),
  notes: import_zod7.z.string().optional()
});
var babyShowerRouter = router({
  createEvent: protectedProcedure.input(createEventSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const eventCode = generateEventCode();
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://farmafrancis.up.railway.app";
    const publicLink = `${baseUrl}/cha-de-bebe/${eventCode}`;
    const expectedDueDate = input.expectedDueDate && input.expectedDueDate.trim() !== "" ? input.expectedDueDate : null;
    const eventDate = input.eventDate && input.eventDate.trim() !== "" ? input.eventDate : null;
    const [event] = await db.insert(babyShowerEvents).values({
      motherCustomerId: input.motherCustomerId,
      eventCode,
      eventName: input.eventName,
      babyName: input.babyName || null,
      expectedDueDate,
      eventDate,
      targetAmount: input.targetAmount?.toString() || null,
      publicLink,
      welcomeMessage: input.welcomeMessage || null
    });
    return { success: true, eventId: Number(event.insertId), eventCode, publicLink };
  }),
  listEvents: protectedProcedure.input(import_zod7.z.object({
    status: import_zod7.z.enum(["active", "closed", "cancelled"]).optional(),
    motherCustomerId: import_zod7.z.number().optional(),
    limit: import_zod7.z.number().default(50),
    offset: import_zod7.z.number().default(0)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const baseQuery = db.select({
      event: babyShowerEvents,
      motherName: customers.name,
      motherPhone: customers.phone
    }).from(babyShowerEvents).leftJoin(customers, (0, import_drizzle_orm12.eq)(babyShowerEvents.motherCustomerId, customers.id));
    if (input.status && input.motherCustomerId) {
      return await baseQuery.where((0, import_drizzle_orm12.and)(
        (0, import_drizzle_orm12.eq)(babyShowerEvents.status, input.status),
        (0, import_drizzle_orm12.eq)(babyShowerEvents.motherCustomerId, input.motherCustomerId)
      )).orderBy((0, import_drizzle_orm12.desc)(babyShowerEvents.createdAt)).limit(input.limit).offset(input.offset);
    } else if (input.status) {
      return await baseQuery.where((0, import_drizzle_orm12.eq)(babyShowerEvents.status, input.status)).orderBy((0, import_drizzle_orm12.desc)(babyShowerEvents.createdAt)).limit(input.limit).offset(input.offset);
    } else if (input.motherCustomerId) {
      return await baseQuery.where((0, import_drizzle_orm12.eq)(babyShowerEvents.motherCustomerId, input.motherCustomerId)).orderBy((0, import_drizzle_orm12.desc)(babyShowerEvents.createdAt)).limit(input.limit).offset(input.offset);
    }
    return await baseQuery.orderBy((0, import_drizzle_orm12.desc)(babyShowerEvents.createdAt)).limit(input.limit).offset(input.offset);
  }),
  // Endpoint público - sem autenticação
  getEventByCode: publicProcedure.input(import_zod7.z.object({ code: import_zod7.z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [event] = await db.select({
      event: babyShowerEvents,
      motherName: customers.name
    }).from(babyShowerEvents).leftJoin(customers, (0, import_drizzle_orm12.eq)(babyShowerEvents.motherCustomerId, customers.id)).where((0, import_drizzle_orm12.eq)(babyShowerEvents.eventCode, input.code)).limit(1);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    const packages = await db.select().from(babyShowerGiftPackages).where((0, import_drizzle_orm12.and)(
      (0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, event.event.id),
      (0, import_drizzle_orm12.eq)(babyShowerGiftPackages.isActive, 1)
    )).orderBy((0, import_drizzle_orm12.asc)(babyShowerGiftPackages.displayOrder), (0, import_drizzle_orm12.asc)(babyShowerGiftPackages.id));
    return { event: event.event, motherName: event.motherName, packages };
  }),
  getEventById: protectedProcedure.input(import_zod7.z.object({ id: import_zod7.z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [event] = await db.select({
      event: babyShowerEvents,
      motherName: customers.name,
      motherPhone: customers.phone
    }).from(babyShowerEvents).leftJoin(customers, (0, import_drizzle_orm12.eq)(babyShowerEvents.motherCustomerId, customers.id)).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.id)).limit(1);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    const packages = await db.select().from(babyShowerGiftPackages).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, input.id)).orderBy((0, import_drizzle_orm12.asc)(babyShowerGiftPackages.displayOrder), (0, import_drizzle_orm12.asc)(babyShowerGiftPackages.id));
    const purchases = await db.select().from(babyShowerPurchases).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.eventId, input.id)).orderBy((0, import_drizzle_orm12.desc)(babyShowerPurchases.createdAt));
    const withdrawals = await db.select().from(babyShowerWithdrawals).where((0, import_drizzle_orm12.eq)(babyShowerWithdrawals.eventId, input.id));
    return { ...event, packages, purchases, withdrawals };
  }),
  updateEvent: protectedProcedure.input(import_zod7.z.object({
    id: import_zod7.z.number(),
    eventName: import_zod7.z.string().optional(),
    babyName: import_zod7.z.string().optional(),
    expectedDueDate: import_zod7.z.string().optional(),
    eventDate: import_zod7.z.string().optional(),
    targetAmount: import_zod7.z.number().optional(),
    status: import_zod7.z.enum(["active", "closed", "cancelled"]).optional(),
    whatsappNumber: import_zod7.z.string().optional(),
    welcomeMessage: import_zod7.z.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const updates = {};
    if (input.eventName) updates.eventName = input.eventName;
    if (input.babyName !== void 0) updates.babyName = input.babyName || null;
    if (input.expectedDueDate !== void 0) {
      updates.expectedDueDate = input.expectedDueDate && input.expectedDueDate.trim() !== "" ? input.expectedDueDate : null;
    }
    if (input.eventDate !== void 0) {
      updates.eventDate = input.eventDate && input.eventDate.trim() !== "" ? input.eventDate : null;
    }
    if (input.targetAmount !== void 0) updates.targetAmount = input.targetAmount?.toString() || null;
    if (input.status) {
      updates.status = input.status;
      if (input.status === "closed") updates.closedAt = /* @__PURE__ */ new Date();
    }
    if (input.whatsappNumber !== void 0) updates.whatsappNumber = input.whatsappNumber || null;
    if (input.welcomeMessage !== void 0) updates.welcomeMessage = input.welcomeMessage || null;
    await db.update(babyShowerEvents).set(updates).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.id));
    return { success: true };
  }),
  createPackage: protectedProcedure.input(createPackageSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [pkg] = await db.insert(babyShowerGiftPackages).values({
      eventId: input.eventId,
      packageName: input.packageName,
      description: input.description || null,
      giftType: input.giftType,
      quantityRepresented: input.quantityRepresented,
      sizeLabel: input.sizeLabel || null,
      price: input.price.toString(),
      stockLimit: input.stockLimit || null,
      imageUrl: input.imageUrl || null
    });
    return { success: true, packageId: Number(pkg.insertId) };
  }),
  updatePackage: protectedProcedure.input(import_zod7.z.object({
    id: import_zod7.z.number(),
    packageName: import_zod7.z.string().optional(),
    description: import_zod7.z.string().optional(),
    price: import_zod7.z.number().optional(),
    imageUrl: import_zod7.z.string().optional(),
    isActive: import_zod7.z.number().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const conditions = [];
    if (input.packageName) {
      conditions.push(import_drizzle_orm12.sql`package_name = ${input.packageName}`);
    }
    if (input.description !== void 0) {
      conditions.push(import_drizzle_orm12.sql`description = ${input.description || null}`);
    }
    if (input.price !== void 0) {
      conditions.push(import_drizzle_orm12.sql`price = ${input.price.toFixed(2)}`);
    }
    if (input.imageUrl !== void 0) {
      conditions.push(import_drizzle_orm12.sql`image_url = ${input.imageUrl || null}`);
    }
    if (input.isActive !== void 0) {
      conditions.push(import_drizzle_orm12.sql`is_active = ${input.isActive}`);
    }
    if (conditions.length === 0) {
      return { success: true };
    }
    const setClause = import_drizzle_orm12.sql.join(conditions, import_drizzle_orm12.sql`, `);
    await db.execute(import_drizzle_orm12.sql`
        UPDATE baby_shower_gift_packages 
        SET ${setClause}
        WHERE id = ${input.id}
      `);
    return { success: true };
  }),
  // Reordenar pacotes (drag-and-drop)
  reorderPackages: protectedProcedure.input(import_zod7.z.object({
    eventId: import_zod7.z.number(),
    packageIds: import_zod7.z.array(import_zod7.z.number())
    // Nova ordem de IDs
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    for (let i = 0; i < input.packageIds.length; i++) {
      await db.execute(import_drizzle_orm12.sql`
          UPDATE baby_shower_gift_packages 
          SET display_order = ${i}
          WHERE id = ${input.packageIds[i]} AND event_id = ${input.eventId}
        `);
    }
    return { success: true };
  }),
  // Deletar pacote
  deletePackage: protectedProcedure.input(import_zod7.z.object({
    id: import_zod7.z.number()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const purchases = await db.select().from(babyShowerPurchases).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.packageId, input.id)).limit(1);
    if (purchases.length > 0) {
      await db.execute(import_drizzle_orm12.sql`
          UPDATE baby_shower_gift_packages 
          SET is_active = 0
          WHERE id = ${input.id}
        `);
      return { success: true, action: "deactivated", message: "Produto desativado (possui compras associadas)" };
    }
    await db.execute(import_drizzle_orm12.sql`
        DELETE FROM baby_shower_gift_packages 
        WHERE id = ${input.id}
      `);
    return { success: true, action: "deleted", message: "Produto exclu\xEDdo com sucesso" };
  }),
  createPurchase: publicProcedure.input(createPurchaseSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [pkg] = await db.select().from(babyShowerGiftPackages).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.id, input.packageId)).limit(1);
    if (!pkg) throw new Error("Pacote n\xE3o encontrado");
    if (pkg.stockLimit && (pkg.soldCount ?? 0) >= pkg.stockLimit) throw new Error("Cotas esgotadas");
    const confirmationToken = (0, import_node_crypto.randomBytes)(32).toString("hex");
    const [purchase] = await db.insert(babyShowerPurchases).values({
      eventId: input.eventId,
      packageId: input.packageId,
      guestName: input.guestName,
      guestPhone: input.guestPhone || null,
      guestEmail: input.guestEmail || null,
      messageToParents: input.messageToParents || null,
      amountPaid: input.amountPaid.toString(),
      paymentStatus: "pending",
      confirmationToken
    });
    return { success: true, purchaseId: Number(purchase.insertId), confirmationToken };
  }),
  confirmPayment: protectedProcedure.input(import_zod7.z.object({
    purchaseId: import_zod7.z.number(),
    paymentStatus: import_zod7.z.enum(["pending", "paid", "failed", "refunded"]),
    paymentMethod: import_zod7.z.string().optional(),
    paymentReference: import_zod7.z.string().optional()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [purchase] = await db.select().from(babyShowerPurchases).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.id, input.purchaseId)).limit(1);
    if (!purchase) throw new Error("Compra n\xE3o encontrada");
    await db.update(babyShowerPurchases).set({
      paymentStatus: input.paymentStatus,
      paymentMethod: input.paymentMethod || null,
      paymentReference: input.paymentReference || null,
      paidAt: input.paymentStatus === "paid" ? /* @__PURE__ */ new Date() : null
    }).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.id, input.purchaseId));
    if (input.paymentStatus === "paid") {
      const [pkg] = await db.select().from(babyShowerGiftPackages).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.id, purchase.packageId)).limit(1);
      const [event] = await db.select().from(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, purchase.eventId)).limit(1);
      await db.update(babyShowerGiftPackages).set({
        soldCount: import_drizzle_orm12.sql`${babyShowerGiftPackages.soldCount} + 1`
      }).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.id, purchase.packageId));
      await db.update(babyShowerEvents).set({
        walletBalance: import_drizzle_orm12.sql`${babyShowerEvents.walletBalance} + ${purchase.amountPaid}`,
        totalGuests: import_drizzle_orm12.sql`${babyShowerEvents.totalGuests} + 1`,
        totalDiapersCount: import_drizzle_orm12.sql`${babyShowerEvents.totalDiapersCount} + ${pkg?.quantityRepresented || 1}`,
        availableDiapersCount: import_drizzle_orm12.sql`${babyShowerEvents.availableDiapersCount} + ${pkg?.quantityRepresented || 1}`
      }).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, purchase.eventId));
      let notificationSent = 0;
      if (event) {
        const [mother] = await db.select().from(customers).where((0, import_drizzle_orm12.eq)(customers.id, event.motherCustomerId)).limit(1);
        const parentsPhone = event.whatsappNumber || mother?.phone;
        if (parentsPhone) {
          const babyNameText = event.babyName ? `, ${event.babyName}` : "";
          let message2 = `\u{1F389} *NOVO PRESENTE PARA SEU CH\xC1 DE BEB\xCA!*

`;
          message2 += `${purchase.guestName} acabou de presentear ${event.babyName || "o beb\xEA"} com:
\u{1F4E6} ${pkg?.packageName || "Um presente especial"}`;
          const qtyPerPackage = pkg?.quantityRepresented || 1;
          const unitLabel = qtyPerPackage > 1 ? `${qtyPerPackage} unidades` : `1 ${pkg?.packageName?.split(" ")[0] || "unidade"}`;
          message2 += ` (Cont\xE9m ${unitLabel})

`;
          if (purchase.messageToParents?.trim()) {
            message2 += `\u{1F48C} *MENSAGEM DO CONVIDADO:*
"${purchase.messageToParents.trim()}"

`;
          }
          message2 += `Sua Carteira Virtual foi atualizada com sucesso. \u{1F4B0}
`;
          message2 += `Total arrecadado: R$ ${event.walletBalance}

`;
          message2 += `\u{1F4CB} *Extrato de presentes ganhos at\xE9 o momento:*
`;
          const allPackages = await db.select({
            id: babyShowerGiftPackages.id,
            packageName: babyShowerGiftPackages.packageName,
            quantityRepresented: babyShowerGiftPackages.quantityRepresented,
            soldCount: babyShowerGiftPackages.soldCount
          }).from(babyShowerGiftPackages).where(
            (0, import_drizzle_orm12.and)(
              (0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, event.id),
              (0, import_drizzle_orm12.gt)(babyShowerGiftPackages.soldCount, 0)
            )
          ).orderBy(babyShowerGiftPackages.displayOrder);
          for (const p of allPackages) {
            const totalUnits = (p.soldCount || 0) * (p.quantityRepresented || 1);
            const unitWord = (p.quantityRepresented || 1) > 1 ? "unidades" : "unidade";
            message2 += `. ${p.packageName} (${totalUnits} ${unitWord})
`;
          }
          message2 += `
_Obrigado por escolher a Farma Francis!_ \u{1F499}`;
          const sent1 = await sendWhatsAppNotification({
            phone: parentsPhone,
            message: message2
          });
          if (sent1) {
            notificationSent = 1;
          } else {
            console.error("[ConfirmPayment] Falha ao enviar WhatsApp para", parentsPhone);
          }
        }
      }
      if (notificationSent === 1) {
        await db.update(babyShowerPurchases).set({
          notificationSent: 1,
          notificationSentAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.id, input.purchaseId));
      }
    }
    return { success: true };
  }),
  createWithdrawal: protectedProcedure.input(createWithdrawalSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [event] = await db.select().from(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.eventId)).limit(1);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    if ((event.availableDiapersCount ?? 0) < input.quantity) throw new Error("Saldo insuficiente");
    const [mother] = await db.select({ name: customers.name }).from(customers).where((0, import_drizzle_orm12.eq)(customers.id, event.motherCustomerId)).limit(1);
    const taskTitle = `Separar ${input.quantity} ${input.diaperSize || ""} para ${mother?.name || "M\xE3e"} (Ch\xE1 de Beb\xEA)`;
    const [task] = await db.insert(crmTasks).values({
      title: taskTitle,
      description: `Tipo: ${input.withdrawalType} | Quantidade: ${input.quantity}`,
      status: "open",
      priority: "high",
      relatedEntityType: "baby_shower_withdrawal",
      createdBy: ctx.user?.id
    });
    const [withdrawal] = await db.insert(babyShowerWithdrawals).values({
      eventId: input.eventId,
      relatedTaskId: Number(task.insertId),
      withdrawalType: input.withdrawalType,
      diaperSize: input.diaperSize || null,
      quantity: input.quantity,
      deliveryMethod: input.deliveryMethod,
      notes: input.notes || null
    });
    await db.update(babyShowerEvents).set({
      availableDiapersCount: import_drizzle_orm12.sql`${babyShowerEvents.availableDiapersCount} - ${input.quantity}`
    }).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.eventId));
    return { success: true, withdrawalId: Number(withdrawal.insertId), taskId: Number(task.insertId) };
  }),
  getDashboardStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [activeEvents] = await db.select({ count: import_drizzle_orm12.sql`COUNT(*)` }).from(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.status, "active"));
    const [totalSales] = await db.select({ total: import_drizzle_orm12.sql`COALESCE(SUM(${babyShowerPurchases.amountPaid}), 0)` }).from(babyShowerPurchases).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.paymentStatus, "paid"));
    const [avgTicket] = await db.select({ avg: import_drizzle_orm12.sql`COALESCE(AVG(${babyShowerPurchases.amountPaid}), 0)` }).from(babyShowerPurchases).where((0, import_drizzle_orm12.eq)(babyShowerPurchases.paymentStatus, "paid"));
    return {
      activeEventsCount: activeEvents?.count || 0,
      totalSalesValue: parseFloat(totalSales?.total || "0"),
      averageTicket: parseFloat(avgTicket?.avg || "0")
    };
  }),
  deleteEvent: protectedProcedure.input(import_zod7.z.object({ id: import_zod7.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [event] = await db.select().from(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.id)).limit(1);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    const packages = await db.select({ id: babyShowerGiftPackages.id }).from(babyShowerGiftPackages).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, input.id));
    const packageIds = packages.map((p) => p.id);
    if (packageIds.length > 0) {
      await db.delete(babyShowerPurchases).where((0, import_drizzle_orm12.inArray)(babyShowerPurchases.packageId, packageIds));
    }
    await db.delete(babyShowerWithdrawals).where((0, import_drizzle_orm12.eq)(babyShowerWithdrawals.eventId, input.id));
    await db.delete(babyShowerGiftPackages).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, input.id));
    await db.delete(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.id));
    return { success: true };
  }),
  resetEvent: protectedProcedure.input(import_zod7.z.object({
    eventId: import_zod7.z.number()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const [event] = await db.select().from(babyShowerEvents).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.eventId)).limit(1);
    if (!event) throw new Error("Evento n\xE3o encontrado");
    await db.update(babyShowerEvents).set({
      walletBalance: 0,
      totalGuests: 0,
      totalDiapersCount: 0,
      availableDiapersCount: 0
    }).where((0, import_drizzle_orm12.eq)(babyShowerEvents.id, input.eventId));
    await db.update(babyShowerGiftPackages).set({ soldCount: 0 }).where((0, import_drizzle_orm12.eq)(babyShowerGiftPackages.eventId, input.eventId));
    return { success: true, message: "Evento resetado com sucesso" };
  }),
  // ============== LIMPEZA DE HISTÓRICO DE COMPRAS ==============
  /**
   * Admin: Obtém estatísticas de compras (para monitoramento)
   */
  getPurchaseStats: protectedProcedure.query(async () => {
    const stats = await ShoppingCartCleanupService.getStats();
    return stats;
  }),
  /**
   * Admin: Limpa manualmente pedidos pendentes com mais de 24 horas
   * Use para trigger manual do worker automático
   */
  cleanupPendingPurchases: protectedProcedure.input(import_zod7.z.object({
    dryRun: import_zod7.z.boolean().optional().default(false)
    // Se true, só mostra quantos seriam deletados
  })).mutation(async ({ input }) => {
    if (input.dryRun) {
      const count = await ShoppingCartCleanupService.countPendingOlderThan24h();
      return { success: true, dryRun: true, wouldDelete: count };
    }
    const result = await ShoppingCartCleanupService.cleanupPendingPurchases();
    return { success: true, deleted: result.deleted };
  }),
  /**
   * Admin: Limpa manualmente histórico antigo de compras (paid/failed/refunded)
   * @param olderThanDays - Remove compras mais antigas que X dias (padrão: 365 dias)
   */
  cleanupOldPurchases: protectedProcedure.input(import_zod7.z.object({
    olderThanDays: import_zod7.z.number().int().positive().optional().default(365),
    dryRun: import_zod7.z.boolean().optional().default(false)
  })).mutation(async ({ input }) => {
    if (input.dryRun) {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cutoffDate = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1e3);
      const result2 = await db.select({ count: import_drizzle_orm12.sql`COUNT(*)` }).from(babyShowerPurchases).where(lt(babyShowerPurchases.createdAt, cutoffDate));
      const count = result2[0]?.count ?? 0;
      return { success: true, dryRun: true, wouldDelete: count };
    }
    const result = await ShoppingCartCleanupService.cleanupOldPurchases(input.olderThanDays);
    return { success: true, deleted: result.deleted };
  }),
  /**
   * Admin: Deleta uma compra específica por ID
   */
  deletePurchase: protectedProcedure.input(import_zod7.z.object({
    purchaseId: import_zod7.z.number().int().positive()
  })).mutation(async ({ input }) => {
    await ShoppingCartCleanupService.deletePurchase(input.purchaseId);
    return { success: true };
  })
});

// server/routers-broadcast.ts
init_db();
init_schema();
var import_drizzle_orm15 = require("drizzle-orm");
var import_zod8 = require("zod");
init_trpc();

// server/utils/normalize.ts
function normalize(value) {
  if (value === void 0 || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}
function normalizeEmptyStringToNull(value) {
  if (value === void 0 || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

// server/routers-broadcast.ts
var broadcastRouter = router({
  list: protectedProcedure.input(import_zod8.z.object({
    page: import_zod8.z.number().int().min(1).optional().default(1),
    limit: import_zod8.z.number().int().min(1).max(100).optional().default(20)
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      console.error("[BroadcastList] Database not available");
      throw new Error("Database not available");
    }
    try {
      const offset = (input.page - 1) * input.limit;
      const lists = await db.select({
        id: broadcastLists.id,
        name: broadcastLists.name,
        description: broadcastLists.description,
        memberCount: import_drizzle_orm15.sql`COUNT(DISTINCT ${broadcastListMembers.customerId})`.as("memberCount"),
        lastSentAt: broadcastLists.lastSentAt,
        createdAt: broadcastLists.createdAt
      }).from(broadcastLists).leftJoin(broadcastListMembers, (0, import_drizzle_orm15.eq)(broadcastLists.id, broadcastListMembers.listId)).groupBy(broadcastLists.id, broadcastLists.name, broadcastLists.description, broadcastLists.lastSentAt, broadcastLists.createdAt).orderBy((0, import_drizzle_orm15.desc)(broadcastLists.createdAt)).limit(Number(input.limit)).offset(offset);
      const [{ total }] = await db.select({ total: import_drizzle_orm15.sql`COUNT(*)` }).from(broadcastLists);
      const sanitizedLists = lists.map((item) => {
        const { createdAt, lastSentAt, ...rest } = item;
        return {
          ...rest,
          createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
          lastSentAt: lastSentAt instanceof Date ? lastSentAt.toISOString() : lastSentAt,
          memberCount: Number(item.memberCount)
        };
      });
      return {
        lists: sanitizedLists,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / input.limit)
        }
      };
    } catch (err) {
      console.error("[BroadcastList] Query failed:", err.message, "stack:", err.stack);
      throw err;
    }
  }),
  getById: protectedProcedure.input(import_zod8.z.object({ listId: import_zod8.z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [list] = await db.select({
      id: broadcastLists.id,
      name: broadcastLists.name,
      description: broadcastLists.description,
      createdAt: broadcastLists.createdAt,
      updatedAt: broadcastLists.updatedAt
    }).from(broadcastLists).where((0, import_drizzle_orm15.eq)(broadcastLists.id, input.listId)).limit(1);
    if (!list) throw new Error("Lista n\xE3o encontrada");
    const members = await db.select({
      id: broadcastListMembers.id,
      customerId: broadcastListMembers.customerId,
      addedAt: broadcastListMembers.addedAt,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        photoUrl: customers.photoUrl
      }
    }).from(broadcastListMembers).leftJoin(customers, (0, import_drizzle_orm15.eq)(broadcastListMembers.customerId, customers.id)).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, input.listId)).orderBy((0, import_drizzle_orm15.asc)(broadcastListMembers.addedAt));
    return {
      ...list,
      members: members.map((m) => ({ ...m, customer: m.customer || null }))
    };
  }),
  create: protectedProcedure.input(import_zod8.z.object({
    name: import_zod8.z.string().min(1).max(255),
    description: import_zod8.z.string().max(500).optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(
      import_drizzle_orm15.sql`
          INSERT INTO broadcast_lists (name, description, created_by, created_at, updated_at)
          VALUES (${input.name}, ${input.description || null}, ${ctx.user.id}, NOW(), NOW())
        `
    );
    const insertId = result.insertId || result.ids?.[0];
    return { id: Number(insertId) };
  }),
  delete: protectedProcedure.input(import_zod8.z.object({ listId: import_zod8.z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      console.error("[BroadcastDelete] Database not available");
      throw new Error("Database not available");
    }
    try {
      const listId = input.listId;
      const messageIds = await db.select({ id: broadcastMessages.id }).from(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, listId));
      const idsToDelete = messageIds.map((m) => m.id);
      if (idsToDelete.length > 0) {
        const chunkSize = 20;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          await db.delete(broadcastMembersSent).where(
            (0, import_drizzle_orm15.inArray)(broadcastMembersSent.broadcastMessageId, chunk)
          );
        }
      } else {
      }
      await db.delete(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, listId));
      await db.delete(broadcastLists).where((0, import_drizzle_orm15.eq)(broadcastLists.id, listId));
      return { success: true };
    } catch (err) {
      console.error(`[BroadcastDelete] Failed to delete list ${input.listId}:`, err.message);
      throw err;
    }
  }),
  addMember: protectedProcedure.input(import_zod8.z.object({
    listId: import_zod8.z.number().int().positive(),
    customerId: import_zod8.z.number().int().positive()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(broadcastListMembers).where((0, import_drizzle_orm15.and)(
      (0, import_drizzle_orm15.eq)(broadcastListMembers.listId, input.listId),
      (0, import_drizzle_orm15.eq)(broadcastListMembers.customerId, input.customerId)
    )).limit(1);
    if (existing.length > 0) throw new Error("Cliente j\xE1 est\xE1 na lista");
    await db.insert(broadcastListMembers).values({
      listId: input.listId,
      customerId: input.customerId,
      addedAt: /* @__PURE__ */ new Date()
    });
    return { success: true };
  }),
  removeMember: protectedProcedure.input(import_zod8.z.object({
    memberId: import_zod8.z.number().int().positive()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      console.error("[BroadcastRemoveMember] Database not available");
      throw new Error("Database not available");
    }
    await db.delete(broadcastListMembers).where(
      (0, import_drizzle_orm15.eq)(broadcastListMembers.id, input.memberId)
    );
    return { success: true };
  }),
  deleteMany: protectedProcedure.input(import_zod8.z.object({
    listIds: import_zod8.z.array(import_zod8.z.number().int().positive())
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      console.error("[BroadcastDeleteMany] Database not available");
      throw new Error("Database not available");
    }
    try {
      for (const listId of input.listIds) {
        const messageIds = await db.select({ id: broadcastMessages.id }).from(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, listId));
        const idsToDelete = messageIds.map((m) => m.id);
        if (idsToDelete.length > 0) {
          const chunkSize = 20;
          for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            await db.delete(broadcastMembersSent).where(
              (0, import_drizzle_orm15.inArray)(broadcastMembersSent.broadcastMessageId, chunk)
            );
          }
        }
        await db.delete(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, listId));
        await db.delete(broadcastListMembers).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, listId));
        await db.delete(broadcastLists).where((0, import_drizzle_orm15.eq)(broadcastLists.id, listId));
      }
      return { success: true, deletedCount: input.listIds.length };
    } catch (err) {
      console.error(`[BroadcastDeleteMany] Failed:`, err.message);
      throw err;
    }
  }),
  listMembers: protectedProcedure.input(import_zod8.z.object({
    listId: import_zod8.z.number().int().positive()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const members = await db.select({
      id: broadcastListMembers.id,
      customerId: broadcastListMembers.customerId,
      addedAt: broadcastListMembers.addedAt,
      name: customers.name,
      phone: customers.phone
    }).from(broadcastListMembers).leftJoin(customers, (0, import_drizzle_orm15.eq)(broadcastListMembers.customerId, customers.id)).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, input.listId)).orderBy((0, import_drizzle_orm15.asc)(broadcastListMembers.addedAt));
    const uniqueMembersMap = /* @__PURE__ */ new Map();
    for (const member of members) {
      if (member.phone && !uniqueMembersMap.has(member.phone)) {
        uniqueMembersMap.set(member.phone, member);
      }
    }
    const deduplicatedMembers = Array.from(uniqueMembersMap.values());
    return deduplicatedMembers;
  }),
  searchCustomers: protectedProcedure.input(import_zod8.z.object({
    query: import_zod8.z.string().default(""),
    excludeListId: import_zod8.z.number().int().positive().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const searchPattern = `%${input.query}%`;
    const whereClause = (0, import_drizzle_orm15.or)(
      import_drizzle_orm15.sql`LOWER(${customers.name}) LIKE LOWER(${searchPattern})`,
      import_drizzle_orm15.sql`LOWER(${customers.email}) LIKE LOWER(${searchPattern})`,
      import_drizzle_orm15.sql`${customers.phone} LIKE ${searchPattern}`
    );
    let query = db.select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      photoUrl: customers.photoUrl
    }).from(customers).where(whereClause);
    if (input.excludeListId) {
      const excludeIds = await db.select({ customerId: broadcastListMembers.customerId }).from(broadcastListMembers).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, input.excludeListId));
      const excludeIdList = excludeIds.map((r) => r.customerId);
      if (excludeIdList.length > 0) {
        query = db.select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          photoUrl: customers.photoUrl
        }).from(customers).where((0, import_drizzle_orm15.and)(whereClause, (0, import_drizzle_orm15.notInArray)(customers.id, excludeIdList)));
      }
    }
    return query.limit(50);
  }),
  sendMessage: protectedProcedure.input(import_zod8.z.object({
    listId: import_zod8.z.number().int().positive(),
    content: import_zod8.z.string().optional().nullable().transform(normalize),
    caption: import_zod8.z.string().optional().nullable().transform(normalize),
    fileUrl: import_zod8.z.string().optional().nullable().transform(normalize),
    fileName: import_zod8.z.string().optional().nullable().transform(normalize),
    fileType: import_zod8.z.string().optional().nullable().transform(normalize),
    fileSize: import_zod8.z.number().int().optional().nullable()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const members = await db.select({
      customerId: broadcastListMembers.customerId,
      phone: customers.phone
    }).from(broadcastListMembers).leftJoin(customers, (0, import_drizzle_orm15.eq)(broadcastListMembers.customerId, customers.id)).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, input.listId));
    if (members.length === 0) throw new Error("Lista n\xE3o tem membros");
    const values = {
      listId: input.listId,
      messageText: normalizeEmptyStringToNull(input.content),
      caption: normalizeEmptyStringToNull(input.caption),
      fileUrl: normalizeEmptyStringToNull(input.fileUrl),
      fileName: normalizeEmptyStringToNull(input.fileName),
      fileType: normalizeEmptyStringToNull(input.fileType),
      fileSize: input.fileSize ?? null,
      senderId: ctx.user.id,
      senderType: "agent",
      totalRecipients: members.length,
      successfulSends: 0,
      failedSends: 0,
      status: "sending",
      sentAt: /* @__PURE__ */ new Date(),
      errorMessage: null
    };
    try {
      const [result] = await db.insert(broadcastMessages).values(values);
      const rawId = result.insertId;
      const messageId = Number(rawId);
      if (!messageId || isNaN(messageId)) {
        throw new Error("Falha ao obter ID da mensagem broadcast");
      }
      const batchSize = 1e3;
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const valuesToInsert = batch.map((m) => ({
          broadcastMessageId: messageId,
          customerId: m.customerId,
          phone: normalize(m.phone),
          status: "pending",
          errorMessage: null,
          deliveredAt: null,
          readAt: null,
          sentAt: null
        }));
        await db.insert(broadcastMembersSent).values(valuesToInsert);
      }
      await db.update(broadcastLists).set({ lastSentAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm15.eq)(broadcastLists.id, input.listId));
      const { processBroadcastMessage: processBroadcastMessage2 } = await Promise.resolve().then(() => (init_broadcast_sender(), broadcast_sender_exports));
      setImmediate(() => {
        processBroadcastMessage2(messageId).catch(
          (e) => console.error("[Broadcast] processBroadcastMessage error:", e.message)
        );
      });
      return { messageId: Number(messageId), status: "queued" };
    } catch (error) {
      console.error("[BroadcastSendMessage] Error:", error);
      throw error;
    }
  }),
  getMessageStats: protectedProcedure.input(import_zod8.z.object({ messageId: import_zod8.z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const message2 = await db.select().from(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.id, input.messageId)).limit(1);
    if (!message2.length) throw new Error("Mensagem n\xE3o encontrada");
    const [[{ total }]] = await db.select({ total: import_drizzle_orm15.sql`COUNT(*)` }).from(broadcastListMembers).where((0, import_drizzle_orm15.eq)(broadcastListMembers.listId, message2[0].listId));
    const stats = await db.select({
      status: broadcastMembersSent.status,
      count: import_drizzle_orm15.sql`COUNT(*)`
    }).from(broadcastMembersSent).where((0, import_drizzle_orm15.eq)(broadcastMembersSent.broadcastMessageId, input.messageId)).groupBy(broadcastMembersSent.status);
    const result = { total, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
    stats.forEach((s) => {
      result[s.status] = Number(s.count);
    });
    return result;
  }),
  listMessages: protectedProcedure.input(import_zod8.z.object({
    listId: import_zod8.z.number().int().positive(),
    page: import_zod8.z.number().int().min(1).optional().default(1),
    limit: import_zod8.z.number().int().min(1).max(50).optional().default(20)
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const offset = (input.page - 1) * input.limit;
    const messages4 = await db.select({
      id: broadcastMessages.id,
      messageText: broadcastMessages.messageText,
      fileUrl: broadcastMessages.fileUrl,
      fileName: broadcastMessages.fileName,
      fileType: broadcastMessages.fileType,
      fileSize: broadcastMessages.fileSize,
      senderId: broadcastMessages.senderId,
      status: broadcastMessages.status,
      sentAt: broadcastMessages.sentAt,
      createdAt: broadcastMessages.createdAt
    }).from(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, input.listId)).orderBy((0, import_drizzle_orm15.desc)(broadcastMessages.createdAt)).limit(Number(input.limit)).offset(offset);
    const [[{ total }]] = await db.select({ total: import_drizzle_orm15.sql`COUNT(*)` }).from(broadcastMessages).where((0, import_drizzle_orm15.eq)(broadcastMessages.listId, input.listId));
    return {
      messages: messages4,
      pagination: { page: input.page, limit: input.limit, total: Number(total), totalPages: Math.ceil(Number(total) / input.limit) }
    };
  })
});

// server/routers-contact-fetch.ts
init_trpc();
var import_zod10 = require("zod");
var import_server3 = require("@trpc/server");
init_db();
init_schema();
var import_drizzle_orm21 = require("drizzle-orm");

// server/integrations/whatsapp-business.ts
async function fetchWhatsAppProfile(phone, config) {
  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/contacts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        blocking: "wait",
        contacts: [phone]
      })
    });
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const contact = data.contacts?.[0];
    if (!contact) {
      throw new Error("Contact not found");
    }
    return {
      name: contact.profile?.name || `Contato ${phone.slice(-4)}`,
      phone,
      profilePicture: contact.profile?.picture || void 0
    };
  } catch (error) {
    console.error("[WhatsApp API] Error fetching profile:", error);
    return {
      name: `Contato ${phone.slice(-4)}`,
      phone
    };
  }
}

// server/integrations/instagram-graph.ts
async function fetchInstagramProfile(username, config) {
  try {
    const cleanUsername = username.replace("@", "");
    const searchUrl = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${config.instagramBusinessAccountId}&q=${cleanUsername}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${config.accessToken}`
      }
    });
    if (!searchResponse.ok) {
      throw new Error(`Instagram API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }
    const searchData = await searchResponse.json();
    const userId = searchData.data?.[0]?.id;
    if (!userId) {
      throw new Error("User not found");
    }
    const profileUrl = `https://graph.facebook.com/v18.0/${userId}?fields=username,name,biography,profile_picture_url,followers_count,follows_count`;
    const profileResponse = await fetch(profileUrl, {
      headers: {
        "Authorization": `Bearer ${config.accessToken}`
      }
    });
    if (!profileResponse.ok) {
      throw new Error(`Instagram API error: ${profileResponse.status}`);
    }
    const profileData = await profileResponse.json();
    return {
      username: profileData.username || cleanUsername,
      name: profileData.name || cleanUsername,
      biography: profileData.biography,
      profilePicture: profileData.profile_picture_url,
      followersCount: profileData.followers_count,
      followsCount: profileData.follows_count
    };
  } catch (error) {
    console.error("[Instagram API] Error fetching profile:", error);
    const cleanUsername = username.replace("@", "");
    return {
      username: cleanUsername,
      name: cleanUsername
    };
  }
}
async function fetchInstagramProfilePublic(username) {
  try {
    const cleanUsername = username.replace("@", "");
    const url = `https://www.instagram.com/${cleanUsername}/?__a=1&__d=dis`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch public profile");
    }
    const data = await response.json();
    const user = data?.graphql?.user;
    if (!user) {
      throw new Error("User data not found");
    }
    return {
      username: user.username,
      name: user.full_name || user.username,
      biography: user.biography,
      profilePicture: user.profile_pic_url_hd || user.profile_pic_url,
      followersCount: user.edge_followed_by?.count,
      followsCount: user.edge_follow?.count
    };
  } catch (error) {
    console.error("[Instagram Public] Error fetching profile:", error);
    const cleanUsername = username.replace("@", "");
    return {
      username: cleanUsername,
      name: cleanUsername
    };
  }
}

// server/routers-contact-fetch.ts
init_messaging();
var contactFetchRouter = router({
  /**
   * Buscar nome do contato do WhatsApp
   * Usa a API do WhatsApp Business para buscar informações do perfil
   */
  fetchWhatsAppName: protectedProcedure.input(
    import_zod10.z.object({
      phone: import_zod10.z.string().min(10, "Telefone inv\xE1lido")
    })
  ).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const evolutionProfile = await fetchEvolutionProfile(input.phone);
      if (evolutionProfile && evolutionProfile.name) {
        return {
          success: true,
          name: evolutionProfile.name,
          phone: input.phone,
          source: "evolution",
          profilePicture: evolutionProfile.profilePicture || null,
          usingFallback: false
        };
      }
      const [config] = await db.select().from(integrationSettings).where(
        (0, import_drizzle_orm21.and)(
          (0, import_drizzle_orm21.eq)(integrationSettings.integrationType, "whatsapp_business"),
          (0, import_drizzle_orm21.eq)(integrationSettings.isActive, true)
        )
      ).limit(1);
      if (!config) {
        return {
          success: true,
          name: `Contato ${input.phone.slice(-4)}`,
          phone: input.phone,
          source: "whatsapp",
          profilePicture: null,
          usingFallback: true
        };
      }
      const profile = await fetchWhatsAppProfile(input.phone, config.config);
      return {
        success: true,
        name: profile.name,
        phone: profile.phone,
        source: "whatsapp",
        profilePicture: profile.profilePicture || null,
        usingFallback: false
      };
    } catch (error) {
      console.error("[WhatsApp Fetch] Error:", error);
      return {
        success: true,
        name: `Contato ${input.phone.slice(-4)}`,
        phone: input.phone,
        source: "whatsapp",
        profilePicture: null,
        usingFallback: true,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }),
  /**
   * Buscar nome do contato do Instagram
   * Usa a API do Instagram Graph para buscar informações do perfil
   */
  fetchInstagramName: protectedProcedure.input(
    import_zod10.z.object({
      username: import_zod10.z.string().min(1, "Username inv\xE1lido")
    })
  ).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [config] = await db.select().from(integrationSettings).where(
        (0, import_drizzle_orm21.and)(
          (0, import_drizzle_orm21.eq)(integrationSettings.integrationType, "instagram_graph"),
          (0, import_drizzle_orm21.eq)(integrationSettings.isActive, true)
        )
      ).limit(1);
      let profile;
      let usingFallback = false;
      if (!config) {
        console.log("[Instagram] No API config found, using public method");
        profile = await fetchInstagramProfilePublic(input.username);
        usingFallback = true;
      } else {
        try {
          profile = await fetchInstagramProfile(input.username, config.config);
        } catch (error) {
          console.log("[Instagram] API failed, falling back to public method");
          profile = await fetchInstagramProfilePublic(input.username);
          usingFallback = true;
        }
      }
      return {
        success: true,
        name: profile.name || `@${input.username}`,
        username: profile.username || input.username,
        bio: profile.biography || null,
        source: "instagram",
        profilePicture: profile.profilePicture || null,
        followersCount: profile.followersCount || null,
        usingFallback
      };
    } catch (error) {
      console.error("[Instagram Fetch] Error:", error);
      return {
        success: true,
        name: `@${input.username}`,
        username: input.username,
        bio: null,
        source: "instagram",
        profilePicture: null,
        usingFallback: true,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }),
  /**
   * Buscar informações de contato de forma automática
   * Tenta buscar do WhatsApp ou Instagram baseado no tipo de canal
   */
  fetchContactInfo: protectedProcedure.input(
    import_zod10.z.object({
      identifier: import_zod10.z.string().min(1, "Identificador inv\xE1lido"),
      channel: import_zod10.z.enum(["whatsapp", "instagram", "telegram", "email"])
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      let contactInfo;
      switch (input.channel) {
        case "whatsapp":
          const evoProfile = await fetchEvolutionProfile(input.identifier);
          if (evoProfile && evoProfile.name) {
            contactInfo = {
              name: evoProfile.name,
              source: "evolution",
              profilePicture: evoProfile.profilePicture || null
            };
            break;
          }
          const mockWhatsAppNames = {
            "5511999999999": "Jo\xE3o Silva",
            "5511988888888": "Maria Santos",
            "5511977777777": "Pedro Oliveira"
          };
          contactInfo = {
            name: mockWhatsAppNames[input.identifier] || `Contato ${input.identifier.slice(-4)}`,
            source: "whatsapp",
            profilePicture: null
          };
          break;
        case "instagram":
          await new Promise((resolve) => setTimeout(resolve, 500));
          const mockInstagramProfiles = {
            "joaosilva": { name: "Jo\xE3o Silva", bio: "Empres\xE1rio | S\xE3o Paulo" },
            "mariasantos": { name: "Maria Santos", bio: "Designer | Rio de Janeiro" },
            "pedrooliveira": { name: "Pedro Oliveira", bio: "Desenvolvedor | Belo Horizonte" }
          };
          const profile = mockInstagramProfiles[input.identifier.toLowerCase()] || {
            name: `@${input.identifier}`,
            bio: null
          };
          contactInfo = {
            name: profile.name,
            source: "instagram",
            profilePicture: null,
            bio: profile.bio || null
          };
          break;
        case "telegram":
          contactInfo = {
            name: `Telegram ${input.identifier}`,
            source: "telegram"
          };
          break;
        case "email":
          const emailName = input.identifier.split("@")[0];
          contactInfo = {
            name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
            source: "email"
          };
          break;
        default:
          throw new import_server3.TRPCError({
            code: "BAD_REQUEST",
            message: "Canal n\xE3o suportado"
          });
      }
      return {
        success: true,
        ...contactInfo,
        identifier: input.identifier,
        channel: input.channel
      };
    } catch (error) {
      throw new import_server3.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar informa\xE7\xF5es de contato"
      });
    }
  })
});

// server/routers-conversations.ts
var import_zod11 = require("zod");
var import_drizzle_orm23 = require("drizzle-orm");
init_schema();
init_trpc();
init_db();
init_phone();
var import_drizzle_orm24 = require("drizzle-orm");

// server/chatbot.ts
init_db();
init_schema();
var import_drizzle_orm22 = require("drizzle-orm");
init_messaging();
init_db_messages();
async function closeConversation(conversationId2, closeReason, skipDbUpdate = false) {
  try {
    const db = await getDb();
    if (!db) return;
    if (!skipDbUpdate) {
      const [conv2] = await db.select().from(conversations).where((0, import_drizzle_orm22.eq)(conversations.id, conversationId2)).limit(1);
      if (!conv2) {
        return;
      }
      await db.update(conversations).set({
        status: "closed",
        closedAt: /* @__PURE__ */ new Date(),
        closeReason
      }).where((0, import_drizzle_orm22.eq)(conversations.id, conversationId2));
    }
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm22.eq)(conversations.id, conversationId2)).limit(1);
    if (!conv) {
      return;
    }
    const customerId = conv.customerId;
    if (!customerId) {
      return;
    }
    const [customer2] = await db.select().from(customers).where((0, import_drizzle_orm22.eq)(customers.id, customerId)).limit(1);
    if (!customer2 || !customer2.phone) {
      return;
    }
    let closingMessage = "";
    if (closeReason === "venda") {
      closingMessage = `Para aperfei\xE7oar nosso atendimento, nos diga como foi a sua experi\xEAncia neste atendimento?

Digite 5\uFE0F\u20E3 Muito satisfeito \u{1F60D}
Digite 4\uFE0F\u20E3 Satisfeito \u{1F600}
Digite 3\uFE0F\u20E3 Indiferente \u{1F610}
Digite 2\uFE0F\u20E3 Insatisfeito \u2639\uFE0F
Digite 1\uFE0F\u20E3 Muito insatisfeito \u{1F61E}`;
    } else if (closeReason === "orcamento") {
      closingMessage = `Agradecemos seu contato, e estaremos sempre \xE0 disposi\xE7\xE3o. \u{1F609}`;
    } else if (closeReason === "conversa_anterior") {
      console.log("[CHATBOT] Closing without message (conversa_anterior)");
      return;
    } else {
      closingMessage = `Obrigado pelo contato! \u{1F60A}`;
    }
    if (conv.channel === "whatsapp") {
      await sendWhatsAppMessage({
        to: customer2.phone,
        message: closingMessage
      });
    } else if (conv.channel === "instagram") {
      await sendInstagramMessage({
        to: customer2.phone,
        message: closingMessage
      });
    }
  } catch (error) {
    console.error("[CHATBOT] Error closing conversation:", error);
  }
}

// server/routers-conversations.ts
function mapConversation(row) {
  const statusMap = {
    open: "open" /* OPEN */,
    assigned: "pending" /* PENDING */,
    // 'assigned' mapeia para PENDING
    closed: "closed" /* CLOSED */
  };
  const status = statusMap[row.status] || (row.status === "open" ? "open" /* OPEN */ : row.status === "closed" ? "closed" /* CLOSED */ : "pending" /* PENDING */);
  return {
    id: String(row.id),
    externalId: String(row.id),
    // fallback; idealmente haveria uma coluna externalId
    channel: row.channel,
    channelReference: "",
    // não existe no schema atual
    customerId: String(row.customerId),
    assignedAgentId: row.assignedTo ? String(row.assignedTo) : null,
    status,
    subject: null,
    priority: "normal",
    tags: [],
    metadata: {},
    createdAt: row.openedAt instanceof Date ? row.openedAt.toISOString() : new Date(row.openedAt).toISOString(),
    updatedAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.toISOString() : new Date(row.lastMessageAt).toISOString(),
    closedAt: row.closedAt ? row.closedAt instanceof Date ? row.closedAt.toISOString() : new Date(row.closedAt).toISOString() : null,
    lastMessageAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.toISOString() : new Date(row.lastMessageAt).toISOString(),
    lastMessagePreview: row.lastMessage || null,
    unreadCount: row.unreadCount,
    // Campos extras do cliente
    customerName: row.customerName || void 0,
    customerPhone: row.customerPhone || void 0,
    customerAvatar: row.customerAvatar || row.photoUrl || void 0
  };
}
var conversationsRouter = router({
  /**
   * Lista TODAS as conversas (sem filtro de status) para o CRM
   */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      queueId: conversations.queueId,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      closeReason: conversations.closeReason,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      customerAvatar: customers.photoUrl,
      lastMessage: import_drizzle_orm24.sql`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as("lastMessage")
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm23.eq)(conversations.customerId, customers.id)).orderBy((0, import_drizzle_orm23.desc)(conversations.lastMessageAt));
    return rows.map(mapConversation);
  }),
  /**
   * Lista contatos recentes para encaminhamento de mensagens.
   * Retorna clientes únicos com última interação, telefone e canal.
   */
  recentContacts: protectedProcedure.input(
    import_zod11.z.object({
      limit: import_zod11.z.number().default(20)
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const limit = input?.limit || 20;
    const [rows] = await db.execute(import_drizzle_orm24.sql`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          conv.channel,
          conv.last_message_at,
          (
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = conv.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          ) as last_message_preview
        FROM conversations conv
        INNER JOIN customers c ON conv.customer_id = c.id
        WHERE conv.status IN ('open', 'assigned', 'closed')
          AND c.phone IS NOT NULL
          AND c.phone != ''
        ORDER BY conv.last_message_at DESC
        LIMIT ${limit}
      `);
    const contacts = rows.map((row) => ({
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      channel: row.channel,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      lastMessagePreview: row.last_message_preview
    }));
    const uniqueContacts = /* @__PURE__ */ new Map();
    for (const contact of contacts) {
      const key = contact.customerPhone.replace(/\D/g, "").slice(-8);
      if (!uniqueContacts.has(key) || contact.lastMessageAt && uniqueContacts.get(key).lastMessageAt && contact.lastMessageAt > uniqueContacts.get(key).lastMessageAt) {
        uniqueContacts.set(key, contact);
      }
    }
    return Array.from(uniqueContacts.values()).sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    }).slice(0, limit);
  }),
  /**
   * Lista todas as conversas atribuídas ao agente logado.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conditions = (0, import_drizzle_orm23.inArray)(conversations.status, ["open", "assigned"]);
    const rows = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      queueId: conversations.queueId,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      closeReason: conversations.closeReason,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      customerAvatar: customers.photoUrl,
      lastMessage: import_drizzle_orm24.sql`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as("lastMessage")
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm23.eq)(conversations.customerId, customers.id)).where(conditions).orderBy((0, import_drizzle_orm23.desc)(conversations.lastMessageAt));
    return rows.map(mapConversation);
  }),
  /**
   * Lista apenas conversas abertas ou atribuídas (não fechadas) para o agente.
   */
  listActive: protectedProcedure.query(async ({ ctx }) => {
    console.log("[Conversations] listActive called | ctx.user:", ctx.user?.name, "| role:", ctx.user?.role);
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conditions = (0, import_drizzle_orm23.inArray)(conversations.status, ["open", "assigned"]);
    const rows = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      queueId: conversations.queueId,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      closeReason: conversations.closeReason,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      customerAvatar: customers.photoUrl,
      lastMessage: import_drizzle_orm24.sql`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as("lastMessage")
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm23.eq)(conversations.customerId, customers.id)).where(conditions).orderBy((0, import_drizzle_orm23.desc)(conversations.lastMessageAt));
    return rows.map(mapConversation);
  }),
  /**
   * Obtém uma conversa específica por ID (apenas se atribuída ao agente).
   */
  get: protectedProcedure.input(import_zod11.z.object({ id: import_zod11.z.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const numericId = parseInt(input.id, 10);
    if (isNaN(numericId)) return null;
    const rows = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      queueId: conversations.queueId,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      closeReason: conversations.closeReason,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      customerAvatar: customers.photoUrl,
      lastMessage: import_drizzle_orm24.sql`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as("lastMessage")
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm23.eq)(conversations.customerId, customers.id)).where((0, import_drizzle_orm23.eq)(conversations.id, numericId)).limit(1);
    const row = rows[0];
    if (!row) return null;
    const isUser = ctx?.user?.role === "user";
    if (isUser && row.assignedTo !== ctx.user.id) {
      return null;
    }
    return mapConversation(row);
  }),
  /**
   * Cria uma nova conversa.
   */
  create: protectedProcedure.input(
    import_zod11.z.object({
      customerId: import_zod11.z.string().optional(),
      // Opcional — se não fornecido, busca/cria pelo telefone
      customerPhone: import_zod11.z.string(),
      // Obrigatório — usado pra buscar ou criar cliente
      customerName: import_zod11.z.string().optional(),
      channel: import_zod11.z.enum(["whatsapp", "instagram", "telegram", "webchat", "email", "sms", "facebook"]),
      queueId: import_zod11.z.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = /* @__PURE__ */ new Date();
    let numericCustomerId;
    let resolvedName = input.customerName || "";
    let resolvedPhone = input.customerPhone || "";
    console.log("[conversations.create] Input:", JSON.stringify({ customerId: input.customerId, customerPhone: input.customerPhone, customerName: input.customerName, channel: input.channel }));
    if (input.customerId) {
      numericCustomerId = parseInt(input.customerId, 10);
      console.log("[conversations.create] Using provided customerId:", numericCustomerId);
    } else {
      const phoneVariants = generatePhoneVariants(resolvedPhone);
      console.log("[conversations.create] Phone variants:", phoneVariants);
      let foundCustomer = null;
      if (phoneVariants.length > 0) {
        const phoneConditions = phoneVariants.map((v) => (0, import_drizzle_orm23.like)(customers.phone, `%${v.replace(/[^0-9]/g, "")}%`));
        const phoneDigits = resolvedPhone.replace(/\D/g, "");
        if (phoneDigits.length >= 8) {
          phoneConditions.push((0, import_drizzle_orm23.like)(customers.phone, `%${phoneDigits.slice(-8)}%`));
        }
        const candidates = await db.select().from(customers).where((0, import_drizzle_orm23.or)(...phoneConditions)).limit(5);
        console.log("[conversations.create] Found candidates:", candidates.length, candidates.map((c) => ({ id: c.id, name: c.name, phone: c.phone })));
        if (candidates.length > 0) {
          foundCustomer = candidates[0];
        }
      }
      if (foundCustomer) {
        numericCustomerId = foundCustomer.id;
        resolvedName = foundCustomer.name || resolvedName;
        resolvedPhone = foundCustomer.phone || resolvedPhone;
        console.log("[conversations.create] Matched existing customer:", { id: numericCustomerId, name: resolvedName, phone: resolvedPhone });
      } else {
        const normalizedPhone = formatPhoneBR(resolvedPhone);
        const insertResult = await db.insert(customers).values({
          name: resolvedName || "Cliente",
          phone: normalizedPhone || resolvedPhone
        });
        const rawId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
        numericCustomerId = Number(rawId) || 0;
        if (!numericCustomerId) {
          const [newCustomer] = await db.select().from(customers).orderBy((0, import_drizzle_orm23.desc)(customers.id)).limit(1);
          numericCustomerId = newCustomer?.id || 0;
        }
        console.log("[conversations.create] Created new customer:", numericCustomerId);
      }
    }
    if (!numericCustomerId) {
      throw new Error("N\xE3o foi poss\xEDvel encontrar ou criar o cliente");
    }
    const found = await findConversationByPhone(db, resolvedPhone, conversations, customers);
    console.log("[conversations.create] findConversationByPhone result:", found);
    if (found) {
      const [existingConversation] = await db.select().from(conversations).where((0, import_drizzle_orm23.eq)(conversations.id, found.conversationId)).limit(1);
      if (existingConversation) {
        numericCustomerId = found.customerId;
        if (existingConversation.status === "open" || existingConversation.status === "assigned") {
          if (!existingConversation.assignedTo) {
            await db.update(conversations).set({ assignedTo: ctx.user.id }).where((0, import_drizzle_orm23.eq)(conversations.id, existingConversation.id));
            const [updated] = await db.select().from(conversations).where((0, import_drizzle_orm23.eq)(conversations.id, existingConversation.id));
            console.log("[conversations.create] Assigned to agent, returning:", updated.id);
            return mapConversation(updated);
          }
          console.log("[conversations.create] Returning existing active conversation:", existingConversation.id);
          return mapConversation(existingConversation);
        }
        await db.update(conversations).set({
          status: "open",
          assignedTo: ctx.user.id,
          unreadCount: 0,
          lastMessageAt: now,
          ...resolvedName ? { customerName: resolvedName } : {},
          ...resolvedPhone ? { customerPhone: resolvedPhone } : {}
        }).where((0, import_drizzle_orm23.eq)(conversations.id, existingConversation.id));
        const [reopened] = await db.select().from(conversations).where((0, import_drizzle_orm23.eq)(conversations.id, existingConversation.id));
        console.log("[conversations.create] Reopened closed conversation:", reopened.id, "(had messages preserved)");
        return mapConversation(reopened);
      }
    }
    const insertValues = {
      customerId: numericCustomerId,
      channel: input.channel,
      status: "open",
      openedAt: now,
      lastMessageAt: now,
      unreadCount: 0,
      assignedTo: ctx.user.id
    };
    if (resolvedName) insertValues.customerName = resolvedName;
    if (resolvedPhone) insertValues.customerPhone = resolvedPhone;
    if (input.queueId) insertValues.queueId = parseInt(input.queueId, 10);
    const result = await db.insert(conversations).values(insertValues).$returningId();
    const [newRow] = await db.select().from(conversations).where((0, import_drizzle_orm23.eq)(conversations.id, result[0].id));
    return mapConversation(newRow);
  }),
  /**
   * Atualiza uma conversa existente.
   */
  update: protectedProcedure.input(
    import_zod11.z.object({
      id: import_zod11.z.string(),
      status: import_zod11.z.enum(["open", "assigned", "closed"]).optional(),
      assignedTo: import_zod11.z.string().optional(),
      customerName: import_zod11.z.string().optional(),
      customerPhone: import_zod11.z.string().optional(),
      queueId: import_zod11.z.string().optional(),
      closeReason: import_zod11.z.enum(["venda", "orcamento", "conversa_anterior", "engano"]).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const numericId = parseInt(input.id, 10);
    if (isNaN(numericId)) {
      throw new Error("ID inv\xE1lido");
    }
    const updates = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (input.status !== void 0) {
      updates.status = input.status;
    }
    if (input.assignedTo !== void 0) {
      const agentId = parseInt(input.assignedTo, 10);
      if (!isNaN(agentId)) {
        updates.assignedTo = agentId;
      }
    }
    if (input.customerName !== void 0) {
      updates.customerName = input.customerName;
    }
    if (input.customerPhone !== void 0) {
      updates.customerPhone = input.customerPhone;
    }
    if (input.queueId !== void 0) {
      const qId = parseInt(input.queueId, 10);
      if (!isNaN(qId)) {
        updates.queueId = qId;
      }
    }
    if (input.closeReason !== void 0) {
      updates.closeReason = input.closeReason;
    }
    if (updates.status === "closed") {
      updates.closedAt = /* @__PURE__ */ new Date();
    }
    await db.update(conversations).set(updates).where((0, import_drizzle_orm23.eq)(conversations.id, numericId));
    return { success: true };
  }),
  /**
   * Atribui uma conversa a um agente (normalmente o próprio agente logado).
   */
  assign: protectedProcedure.input(import_zod11.z.object({ conversationId: import_zod11.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(conversations).set({ assignedTo: ctx.user.id, status: "open" }).where((0, import_drizzle_orm23.eq)(conversations.id, input.conversationId));
    return { success: true };
  }),
  /**
     * Fecha uma conversa com um motivo.
     */
  close: protectedProcedure.input(
    import_zod11.z.object({
      conversationId: import_zod11.z.number(),
      reason: import_zod11.z.enum(["venda", "orcamento", "conversa_anterior", "engano"])
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    console.log(`[conversations.close] Closing conversation ${input.conversationId} with reason ${input.reason}`);
    await db.update(conversations).set({ status: "closed", closeReason: input.reason, closedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm23.eq)(conversations.id, input.conversationId));
    console.log(`[conversations.close] Conversation ${input.conversationId} closed successfully`);
    try {
      await closeConversation(input.conversationId, input.reason, true);
    } catch (chatbotError) {
      console.error("[conversations.close] Error calling chatbot closeConversation:", chatbotError);
    }
    return { success: true };
  }),
  /**
   * Exclui uma conversa permanentemente.
   */
  delete: protectedProcedure.input(import_zod11.z.object({ id: import_zod11.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(conversations).where((0, import_drizzle_orm23.eq)(conversations.id, input.id));
    return { success: true };
  }),
  /**
   * Encerra todas as conversas abertas e atribuídas.
   */
  closeAll: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = /* @__PURE__ */ new Date();
    const result = await db.execute(
      import_drizzle_orm24.sql`UPDATE conversations SET status = 'closed', closed_at = ${now} WHERE status IN ('open', 'assigned')`
    );
    return { count: result.affectedRows || 0 };
  })
});

// server/routers-clients.ts
var import_zod12 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm25 = require("drizzle-orm");
var clientsRouter = router({
  // Listar TODOS os clientes únicos de conversations
  list: protectedProcedure.input(import_zod12.z.object({}).optional()).query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const convs = await db.select({
      customerPhone: conversations.customerPhone,
      customerName: conversations.customerName,
      createdAt: conversations.createdAt,
      lastMessageAt: conversations.lastMessageAt
    }).from(conversations).where(import_drizzle_orm25.sql`customerPhone IS NOT NULL`).orderBy((0, import_drizzle_orm25.desc)(conversations.lastMessageAt));
    const uniqueMap = /* @__PURE__ */ new Map();
    convs.forEach((c) => {
      const phone = c.customerPhone;
      if (phone && !uniqueMap.has(phone)) {
        uniqueMap.set(phone, {
          id: phone,
          // usar telefone como ID
          name: c.customerName || `Cliente ${phone.slice(-4)}`,
          phone,
          email: null,
          status: "active",
          createdAt: c.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
          lastInteraction: c.lastMessageAt?.toISOString() || null,
          interactionsCount: 0
          // será preenchido depois
        });
      }
    });
    const clients = Array.from(uniqueMap.values());
    for (const client of clients) {
      const count = convs.filter((c) => c.customerPhone === client.phone).length;
      client.interactionsCount = count;
    }
    console.log(`[clients.list] Total de clientes \xFAnicos: ${clients.length}`);
    return clients;
  })
});

// server/routers-dashboard-drilldown.ts
init_trpc();
var import_zod13 = require("zod");
init_db();
init_schema();
var import_drizzle_orm26 = require("drizzle-orm");
var dashboardDrilldownRouter = router({
  /**
   * Buscar conversas de uma hora específica
   * Usado no drill-down do gráfico "Contatos por hora"
   */
  getConversationsByHour: protectedProcedure.input(
    import_zod13.z.object({
      hour: import_zod13.z.number().min(0).max(23),
      // Hora do dia (0-23)
      date: import_zod13.z.string().optional(),
      // Data no formato YYYY-MM-DD (padrão: hoje)
      status: import_zod13.z.enum(["all", "chats", "abandoned"]).optional().default("all")
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const targetDate = input.date ? new Date(input.date) : /* @__PURE__ */ new Date();
    targetDate.setHours(input.hour, 0, 0, 0);
    const startTime = new Date(targetDate);
    const endTime = new Date(targetDate);
    endTime.setHours(input.hour + 1, 0, 0, 0);
    let statusFilter;
    if (input.status === "chats") {
      statusFilter = import_drizzle_orm26.sql`${conversations.status} IN ('assigned', 'closed')`;
    } else if (input.status === "abandoned") {
      statusFilter = import_drizzle_orm26.sql`${conversations.status} = 'abandoned'`;
    } else {
      statusFilter = import_drizzle_orm26.sql`1=1`;
    }
    const result = await db.select({
      id: conversations.id,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      channel: conversations.channel,
      status: conversations.status,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      assignedTo: conversations.assignedTo,
      queueId: conversations.queueId
    }).from(conversations).where(
      (0, import_drizzle_orm26.and)(
        (0, import_drizzle_orm26.gte)(conversations.openedAt, startTime),
        (0, import_drizzle_orm26.lte)(conversations.openedAt, endTime),
        statusFilter
      )
    ).orderBy(conversations.openedAt);
    return {
      hour: input.hour,
      date: targetDate.toISOString().split("T")[0],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      total: result.length,
      conversations: result
    };
  }),
  /**
   * Buscar conversas de um período específico
   * Usado para drill-down de métricas agregadas
   */
  getConversationsByPeriod: protectedProcedure.input(
    import_zod13.z.object({
      startDate: import_zod13.z.string(),
      // YYYY-MM-DD
      endDate: import_zod13.z.string(),
      // YYYY-MM-DD
      status: import_zod13.z.enum(["all", "open", "assigned", "closed"]).optional().default("all"),
      channel: import_zod13.z.enum(["all", "whatsapp", "instagram", "telegram", "email"]).optional().default("all"),
      limit: import_zod13.z.number().min(1).max(100).optional().default(50),
      offset: import_zod13.z.number().min(0).optional().default(0)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const startTime = new Date(input.startDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(input.endDate);
    endTime.setHours(23, 59, 59, 999);
    const filters = [
      (0, import_drizzle_orm26.gte)(conversations.openedAt, startTime),
      (0, import_drizzle_orm26.lte)(conversations.openedAt, endTime)
    ];
    if (input.status !== "all") {
      filters.push(import_drizzle_orm26.sql`${conversations.status} = ${import_drizzle_orm26.sql.raw(`'${input.status}'`)}`);
    }
    if (input.channel !== "all") {
      filters.push(import_drizzle_orm26.sql`${conversations.channel} = ${import_drizzle_orm26.sql.raw(`'${input.channel}'`)}`);
    }
    const result = await db.select({
      id: conversations.id,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      channel: conversations.channel,
      status: conversations.status,
      openedAt: conversations.openedAt,
      closedAt: conversations.closedAt,
      assignedTo: conversations.assignedTo,
      queueId: conversations.queueId
    }).from(conversations).where((0, import_drizzle_orm26.and)(...filters)).orderBy(conversations.openedAt).limit(input.limit).offset(input.offset);
    const [{ total }] = await db.select({ total: import_drizzle_orm26.sql`count(*)` }).from(conversations).where((0, import_drizzle_orm26.and)(...filters));
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      total,
      showing: result.length,
      offset: input.offset,
      limit: input.limit,
      hasMore: input.offset + result.length < total,
      conversations: result
    };
  })
});

// server/routers-dashboard-stats.ts
init_trpc();
init_db();
init_schema();
var import_drizzle_orm27 = require("drizzle-orm");
var import_zod14 = require("zod");

// server/utils/date-range.ts
function getDateRangeFromPeriod(period, customStart, customEnd) {
  const now = /* @__PURE__ */ new Date();
  const setEndOfDayUTC = (date2) => {
    const utc = new Date(Date.UTC(
      date2.getUTCFullYear(),
      date2.getUTCMonth(),
      date2.getUTCDate(),
      23,
      59,
      59,
      999
    ));
    return utc;
  };
  const setStartOfDayUTC = (date2) => {
    const utc = new Date(Date.UTC(
      date2.getUTCFullYear(),
      date2.getUTCMonth(),
      date2.getUTCDate(),
      0,
      0,
      0,
      0
    ));
    return utc;
  };
  let startDate;
  let endDate;
  switch (period) {
    case "hoje":
      startDate = setStartOfDayUTC(now);
      endDate = setEndOfDayUTC(now);
      break;
    case "ontem":
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      startDate = setStartOfDayUTC(yesterday);
      endDate = setEndOfDayUTC(yesterday);
      break;
    case "semana":
      const dayOfWeek = now.getUTCDay();
      const tempStartDateWeek = new Date(now);
      tempStartDateWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
      startDate = setStartOfDayUTC(tempStartDateWeek);
      const tempEndDateWeek = new Date(startDate);
      tempEndDateWeek.setUTCDate(startDate.getUTCDate() + 6);
      endDate = setEndOfDayUTC(tempEndDateWeek);
      break;
    case "mes":
      startDate = setStartOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
      endDate = setEndOfDayUTC(now);
      break;
    case "mes_anterior":
      const firstDayCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const lastDayPreviousMonth = new Date(firstDayCurrentMonth);
      lastDayPreviousMonth.setUTCDate(lastDayPreviousMonth.getUTCDate() - 1);
      const firstDayPreviousMonth = new Date(Date.UTC(
        lastDayPreviousMonth.getUTCFullYear(),
        lastDayPreviousMonth.getUTCMonth(),
        1
      ));
      startDate = setStartOfDayUTC(firstDayPreviousMonth);
      endDate = setEndOfDayUTC(lastDayPreviousMonth);
      break;
    case "30d":
      const ThirtyDaysAgo = new Date(now);
      ThirtyDaysAgo.setUTCDate(ThirtyDaysAgo.getUTCDate() - 30);
      startDate = setStartOfDayUTC(ThirtyDaysAgo);
      endDate = setEndOfDayUTC(now);
      break;
    case "365d":
      const YearAgo = new Date(now);
      YearAgo.setUTCDate(YearAgo.getUTCDate() - 365);
      startDate = setStartOfDayUTC(YearAgo);
      endDate = setEndOfDayUTC(now);
      break;
    case "custom":
      if (customStart && customEnd) {
        const customStartDate = new Date(customStart);
        const customEndDate = new Date(customEnd);
        startDate = setStartOfDayUTC(customStartDate);
        endDate = setEndOfDayUTC(customEndDate);
      } else {
        const ThirtyDaysAgoCustom = new Date(now);
        ThirtyDaysAgoCustom.setUTCDate(ThirtyDaysAgoCustom.getUTCDate() - 30);
        startDate = setStartOfDayUTC(ThirtyDaysAgoCustom);
        endDate = setEndOfDayUTC(now);
      }
      break;
    default:
      throw new Error(`Per\xEDodo n\xE3o suportado: ${period}`);
  }
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error(`Datas inv\xE1lidas geradas para per\xEDodo: ${period}`);
  }
  return { startDate, endDate };
}

// server/routers-dashboard-stats.ts
function formatSecondsToHMS(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
var dashboardStatsRouter = router({
  // getStats: Retorna estatísticas gerais
  getStats: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("mes"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const period = input?.period || "mes";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: start, endDate: end } = getDateRangeFromPeriod(
      period,
      input?.startDate,
      input?.endDate
    );
    console.log(`[getStats] Per\xEDodo: ${period}, Filtrando entre ${start.toISOString()} e ${end.toISOString()}`);
    const dateFilter = (0, import_drizzle_orm27.and)(
      (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
      (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
    );
    const totalConversationsResult = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversations).where(dateFilter);
    const totalConversations = totalConversationsResult[0]?.count || 0;
    const uniqueCustomersResult = await db.select({
      count: import_drizzle_orm27.sql`count(DISTINCT ${conversations.customerPhone})`
    }).from(conversations).where(dateFilter);
    const uniqueCustomers = uniqueCustomersResult[0]?.count || 0;
    const messagesSentResult = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversationMessages).where(
      (0, import_drizzle_orm27.and)(
        (0, import_drizzle_orm27.eq)(conversationMessages.senderType, "agent"),
        (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, start),
        (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, end)
      )
    );
    const messagesSent = messagesSentResult[0]?.count || 0;
    const messagesReceivedResult = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversationMessages).where(
      (0, import_drizzle_orm27.and)(
        (0, import_drizzle_orm27.eq)(conversationMessages.senderType, "customer"),
        (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, start),
        (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, end)
      )
    );
    const messagesReceived = messagesReceivedResult[0]?.count || 0;
    const totalAgentsResult = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(users).where((0, import_drizzle_orm27.eq)(users.role, "user"));
    const totalAgents = totalAgentsResult[0]?.count || 0;
    const avgPerAgent = totalAgents > 0 ? Math.round(totalConversations / totalAgents) : 0;
    let avgHandlingTime = "00:00:00";
    const avgTimeResult = await db.select({ avgMs: import_drizzle_orm27.sql`AVG(TIMESTAMPDIFF(MICROSECOND, ${conversations.openedAt}, ${conversations.closedAt}))` }).from(conversations).where(
      (0, import_drizzle_orm27.and)(
        dateFilter,
        (0, import_drizzle_orm27.isNotNull)(conversations.closedAt)
      )
    );
    const avgMs = avgTimeResult[0]?.avgMs || 0;
    const avgSeconds = avgMs / 1e6;
    avgHandlingTime = formatSecondsToHMS(avgSeconds);
    return {
      totalConversations,
      uniqueCustomers,
      messagesSent,
      messagesReceived,
      avgPerAgent,
      avgHandlingTime
    };
  }),
  getConversationsByChannel: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("mes"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const period = input?.period || "mes";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: start, endDate: end } = getDateRangeFromPeriod(
      period,
      input?.startDate,
      input?.endDate
    );
    const result = await db.select({
      channel: conversations.channel,
      count: import_drizzle_orm27.sql`count(*)`
    }).from(conversations).where((0, import_drizzle_orm27.and)(
      (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
      (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
    )).groupBy(conversations.channel);
    return result;
  }),
  getConversationsByStatus: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("mes"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const period = input?.period || "mes";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: start, endDate: end } = getDateRangeFromPeriod(
      period,
      input?.startDate,
      input?.endDate
    );
    const result = await db.select({
      status: conversations.status,
      count: import_drizzle_orm27.sql`count(*)`
    }).from(conversations).where((0, import_drizzle_orm27.and)(
      (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
      (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
    )).groupBy(conversations.status);
    return result;
  }),
  getAgentStats: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("mes"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const rawPeriod = input?.period || "mes";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: start, endDate: end } = getDateRangeFromPeriod(
      rawPeriod,
      input?.startDate,
      input?.endDate
    );
    console.log(`[getAgentStats] Per\xEDodo: ${rawPeriod}`);
    console.log(`[getAgentStats] startDate (local): ${start.toString()}`);
    console.log(`[getAgentStats] startDate (ISO):   ${start.toISOString()}`);
    console.log(`[getAgentStats] endDate (local):   ${end.toString()}`);
    console.log(`[getAgentStats] endDate (ISO):     ${end.toISOString()}`);
    const agentStats = await db.select({
      agentId: users.id,
      agentName: users.name,
      photo: users.photo,
      // Conversas no período (abertas no período)
      totalConversations: import_drizzle_orm27.sql`COUNT(DISTINCT ${conversations.id})`,
      daysActive: import_drizzle_orm27.sql`COUNT(DISTINCT DATE(${conversations.openedAt}))`,
      // TMA baseado apenas em conversas ENCERRADAS no período
      avgHandlingTime: import_drizzle_orm27.sql`AVG(TIMESTAMPDIFF(MICROSECOND, ${conversations.openedAt}, ${conversations.closedAt}))`,
      // Mensagens no período VINCULADAS a conversas do período (senderType analisado via CASE)
      messagesSent: import_drizzle_orm27.sql`SUM(CASE WHEN ${conversationMessages.senderType} = 'agent' THEN 1 ELSE 0 END)`,
      messagesReceived: import_drizzle_orm27.sql`SUM(CASE WHEN ${conversationMessages.senderType} = 'customer' THEN 1 ELSE 0 END)`
    }).from(users).leftJoin(conversations, (0, import_drizzle_orm27.and)(
      (0, import_drizzle_orm27.eq)(conversations.assignedTo, users.id),
      (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
      (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
    )).leftJoin(conversationMessages, (0, import_drizzle_orm27.and)(
      (0, import_drizzle_orm27.eq)(conversationMessages.conversationId, conversations.id),
      (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, start),
      (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, end)
    )).where((0, import_drizzle_orm27.eq)(users.role, "user")).groupBy(users.id, users.name).orderBy(import_drizzle_orm27.sql`COUNT(DISTINCT ${conversations.id}) DESC`);
    console.log(`[getAgentStats] Resultado:`, JSON.stringify(agentStats));
    return agentStats.map((stat) => ({
      agentId: stat.agentId,
      agentName: stat.agentName,
      photo: stat.photo ?? null,
      totalConversations: Number(stat.totalConversations) || 0,
      daysActive: Number(stat.daysActive) || 0,
      avgPerDay: Number(stat.daysActive) > 0 ? Number(((Number(stat.totalConversations) || 0) / Number(stat.daysActive)).toFixed(1)) : 0,
      messagesSent: Number(stat.messagesSent) || 0,
      messagesReceived: Number(stat.messagesReceived) || 0,
      tma: stat.avgHandlingTime ? formatSecondsToHMS(Number(stat.avgHandlingTime) / 1e6) : "00:00:00"
    }));
  }),
  getContactsByHour: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("hoje"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const rawPeriod = input?.period || "hoje";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let startDate;
    let endDate;
    if (rawPeriod === "all" || rawPeriod === "todas") {
      startDate = /* @__PURE__ */ new Date(0);
      endDate = /* @__PURE__ */ new Date();
    } else {
      const { startDate: s, endDate: e } = getDateRangeFromPeriod(
        rawPeriod,
        input?.startDate,
        input?.endDate
      );
      startDate = s;
      endDate = e;
    }
    console.log(`[getContactsByHour] Per\xEDodo: ${rawPeriod}`);
    console.log(`[getContactsByHour] startDate (local): ${startDate.toString()}`);
    console.log(`[getContactsByHour] startDate (ISO):   ${startDate.toISOString()}`);
    console.log(`[getContactsByHour] endDate (local):   ${endDate.toString()}`);
    console.log(`[getContactsByHour] endDate (ISO):     ${endDate.toISOString()}`);
    const result = await db.select({
      date: import_drizzle_orm27.sql`DATE(${conversationMessages.createdAt})`,
      hour: import_drizzle_orm27.sql`HOUR(${conversationMessages.createdAt})`,
      chats: import_drizzle_orm27.sql`COUNT(DISTINCT ${conversationMessages.conversationId})`
    }).from(conversationMessages).where(
      (0, import_drizzle_orm27.and)(
        (0, import_drizzle_orm27.eq)(conversationMessages.senderType, "customer"),
        (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, startDate),
        (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, endDate)
      )
    ).groupBy(import_drizzle_orm27.sql`DATE(${conversationMessages.createdAt})`, import_drizzle_orm27.sql`HOUR(${conversationMessages.createdAt})`).orderBy(import_drizzle_orm27.sql`DATE(${conversationMessages.createdAt})`, import_drizzle_orm27.sql`HOUR(${conversationMessages.createdAt})`);
    console.log(`[getContactsByHour] Resultado bruto:`, JSON.stringify(result));
    const hoursArray = Array(24).fill(0);
    for (const row of result) {
      hoursArray[row.hour] += row.chats;
    }
    return hoursArray;
  }),
  getConversationsByQueue: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("hoje"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const rawPeriod = input?.period || "hoje";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: start, endDate: end } = getDateRangeFromPeriod(
      rawPeriod,
      input?.startDate,
      input?.endDate
    );
    const allQueues = await db.select({
      id: queues.id,
      name: queues.name,
      color: queues.color
    }).from(queues);
    const queueStats = await Promise.all(
      allQueues.map(async (queue2) => {
        const [{ count }] = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm27.and)(
            (0, import_drizzle_orm27.eq)(conversations.queueId, queue2.id),
            (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
            (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
          )
        );
        return {
          name: queue2.name,
          value: Number(count),
          color: queue2.color || "#3b82f6"
        };
      })
    );
    const [{ count: noQueueCount }] = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversations).where(
      (0, import_drizzle_orm27.and)(
        isNull(conversations.queueId),
        (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
        (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
      )
    );
    queueStats.push({
      name: "Sem fila",
      value: Number(noQueueCount),
      color: "#6b7280"
    });
    return queueStats.filter((qs) => qs.value > 0);
  }),
  getVariations: publicProcedure.input(
    import_zod14.z.object({
      period: import_zod14.z.string().optional().default("mes"),
      startDate: import_zod14.z.string().optional(),
      endDate: import_zod14.z.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const rawPeriod = input?.period || "mes";
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { startDate: currentStart, endDate: currentEnd } = getDateRangeFromPeriod(
      rawPeriod,
      input?.startDate,
      input?.endDate
    );
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - durationMs);
    const previousEnd = new Date(currentStart.getTime() - 1);
    console.log(`[getVariations] Current: ${currentStart.toISOString()} a ${currentEnd.toISOString()}`);
    console.log(`[getVariations] Previous: ${previousStart.toISOString()} a ${previousEnd.toISOString()}`);
    const getMetrics = async (start, end) => {
      const dateFilter = (0, import_drizzle_orm27.and)(
        (0, import_drizzle_orm27.gte)(conversations.openedAt, start),
        (0, import_drizzle_orm27.lte)(conversations.openedAt, end)
      );
      const [convResult] = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversations).where(dateFilter);
      const conversationsCount = convResult?.count || 0;
      const [custResult] = await db.select({ count: import_drizzle_orm27.sql`count(DISTINCT ${conversations.customerPhone})` }).from(conversations).where(dateFilter);
      const uniqueCustomers = custResult?.count || 0;
      const [sentResult] = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversationMessages).where(
        (0, import_drizzle_orm27.and)(
          (0, import_drizzle_orm27.eq)(conversationMessages.senderType, "agent"),
          (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, start),
          (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, end)
        )
      );
      const messagesSent = sentResult?.count || 0;
      const [recvResult] = await db.select({ count: import_drizzle_orm27.sql`count(*)` }).from(conversationMessages).where(
        (0, import_drizzle_orm27.and)(
          (0, import_drizzle_orm27.eq)(conversationMessages.senderType, "customer"),
          (0, import_drizzle_orm27.gte)(conversationMessages.createdAt, start),
          (0, import_drizzle_orm27.lte)(conversationMessages.createdAt, end)
        )
      );
      const messagesReceived = recvResult?.count || 0;
      return {
        conversations: conversationsCount,
        customers: uniqueCustomers,
        messagesSent,
        messagesReceived
      };
    };
    const [current, previous] = await Promise.all([
      getMetrics(currentStart, currentEnd),
      getMetrics(previousStart, previousEnd)
    ]);
    const calcVariation = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round((curr - prev) / prev * 100);
    };
    return {
      conversations: {
        current: current.conversations,
        previous: previous.conversations,
        variation: calcVariation(current.conversations, previous.conversations)
      },
      customers: {
        current: current.customers,
        previous: previous.customers,
        variation: calcVariation(current.customers, previous.customers)
      },
      messagesSent: {
        current: current.messagesSent,
        previous: previous.messagesSent,
        variation: calcVariation(current.messagesSent, previous.messagesSent)
      },
      messagesReceived: {
        current: current.messagesReceived,
        previous: previous.messagesReceived,
        variation: calcVariation(current.messagesReceived, previous.messagesReceived)
      }
    };
  })
});

// server/routers-dashboard.ts
var import_zod15 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm28 = require("drizzle-orm");
var dashboardRouter = router({
  /**
   * Get main dashboard statistics
   */
  getStats: protectedProcedure.input(
    import_zod15.z.object({
      startDate: import_zod15.z.string().optional(),
      endDate: import_zod15.z.string().optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db)
      return {
        totalTickets: 0,
        uniqueCustomers: 0,
        messagesSent: 0,
        messagesReceived: 0,
        avgHandlingTime: 0
      };
    const ticketCount = await db.select({ count: import_drizzle_orm28.sql`COUNT(*)` }).from(tickets);
    const customerCount = await db.select({ count: import_drizzle_orm28.sql`COUNT(DISTINCT ${customers.id})` }).from(customers);
    const sentCount = await db.select({ count: import_drizzle_orm28.sql`COUNT(*)` }).from(messages).where((0, import_drizzle_orm28.eq)(messages.direction, "outbound"));
    const receivedCount = await db.select({ count: import_drizzle_orm28.sql`COUNT(*)` }).from(receivedMessages);
    const avgTime = await db.select({ avg: import_drizzle_orm28.sql`AVG(${tickets.timeSpentMinutes})` }).from(tickets).where(import_drizzle_orm28.sql`${tickets.timeSpentMinutes} > 0`);
    return {
      totalTickets: Number(ticketCount[0]?.count || 0),
      uniqueCustomers: Number(customerCount[0]?.count || 0),
      messagesSent: Number(sentCount[0]?.count || 0),
      messagesReceived: Number(receivedCount[0]?.count || 0),
      avgHandlingTime: Math.round(Number(avgTime[0]?.avg || 0))
    };
  }),
  /**
   * Get messages by hour for chart
   */
  getMessagesByHour: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({
      hour: import_drizzle_orm28.sql`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`,
      count: import_drizzle_orm28.sql`COUNT(*)`
    }).from(receivedMessages).groupBy(import_drizzle_orm28.sql`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`).orderBy(import_drizzle_orm28.sql`HOUR(FROM_UNIXTIME(${receivedMessages.timestamp} / 1000))`);
    return result.map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count)
    }));
  }),
  /**
   * Get tickets by status
   */
  getTicketsByStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({
      status: tickets.status,
      count: import_drizzle_orm28.sql`COUNT(*)`
    }).from(tickets).groupBy(tickets.status);
    return result.map((r) => ({
      status: r.status,
      count: Number(r.count)
    }));
  }),
  /**
   * Get tickets by channel
   */
  getTicketsByChannel: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({
      channel: tickets.channel,
      count: import_drizzle_orm28.sql`COUNT(*)`
    }).from(tickets).where(import_drizzle_orm28.sql`${tickets.channel} IS NOT NULL`).groupBy(tickets.channel);
    return result.map((r) => ({
      channel: r.channel,
      count: Number(r.count)
    }));
  }),
  /**
   * Get employee performance metrics
   */
  getEmployeeMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select({
      employeeId: tickets.assignedTo,
      ticketsHandled: import_drizzle_orm28.sql`COUNT(*)`,
      avgTime: import_drizzle_orm28.sql`AVG(${tickets.timeSpentMinutes})`
    }).from(tickets).where(import_drizzle_orm28.sql`${tickets.assignedTo} IS NOT NULL`).groupBy(tickets.assignedTo);
    return result.map((r) => ({
      employeeId: r.employeeId,
      ticketsHandled: Number(r.ticketsHandled),
      avgHandlingTime: Math.round(Number(r.avgTime || 0))
    }));
  }),
  /**
   * Get recent tickets
   */
  getRecentTickets: protectedProcedure.input(
    import_zod15.z.object({
      limit: import_zod15.z.number().optional().default(10)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.select().from(tickets).orderBy((0, import_drizzle_orm28.desc)(tickets.createdAt)).limit(input.limit);
    return result;
  })
});

// server/routers-executions.ts
init_trpc();
var import_zod16 = require("zod");
init_db();
init_schema();
var import_drizzle_orm30 = require("drizzle-orm");
var executionsRouter = router({
  /**
   * List all executions with filters and pagination
   */
  list: protectedProcedure.input(
    import_zod16.z.object({
      page: import_zod16.z.number().min(1).default(1),
      pageSize: import_zod16.z.number().min(1).max(100).default(20),
      status: import_zod16.z.enum(["all", "running", "success", "error", "canceled"]).default("all"),
      workflowId: import_zod16.z.number().optional(),
      startDate: import_zod16.z.date().optional(),
      endDate: import_zod16.z.date().optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db)
      return {
        executions: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
      };
    const { page, pageSize, status, workflowId, startDate, endDate } = input;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (status !== "all") {
      conditions.push((0, import_drizzle_orm30.eq)(workflowExecutions.status, status));
    }
    if (workflowId) {
      conditions.push((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, workflowId));
    }
    if (startDate) {
      conditions.push((0, import_drizzle_orm30.gte)(workflowExecutions.startedAt, startDate));
    }
    if (endDate) {
      conditions.push((0, import_drizzle_orm30.lte)(workflowExecutions.startedAt, endDate));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm30.and)(...conditions) : void 0;
    const executions = await db.select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: visualFlows.name,
      status: workflowExecutions.status,
      mode: workflowExecutions.mode,
      startedAt: workflowExecutions.startedAt,
      finishedAt: workflowExecutions.finishedAt,
      executionTime: workflowExecutions.executionTime,
      error: workflowExecutions.error
    }).from(workflowExecutions).leftJoin(
      visualFlows,
      (0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, visualFlows.id)
    ).where(whereClause).orderBy((0, import_drizzle_orm30.desc)(workflowExecutions.startedAt)).limit(pageSize).offset(offset);
    const allExecutions = await db.select().from(workflowExecutions).where(whereClause);
    const total = allExecutions.length;
    return {
      executions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }),
  /**
   * Get all executions for a workflow
   */
  getByWorkflow: protectedProcedure.input(
    import_zod16.z.object({
      workflowId: import_zod16.z.number(),
      limit: import_zod16.z.number().optional().default(50),
      offset: import_zod16.z.number().optional().default(0)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const executions = await db.select().from(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, input.workflowId)).orderBy((0, import_drizzle_orm30.desc)(workflowExecutions.startedAt)).limit(input.limit).offset(input.offset);
    return executions;
  }),
  /**
   * Get execution by ID with all node data
   */
  getById: protectedProcedure.input(import_zod16.z.object({ id: import_zod16.z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [execution] = await db.select().from(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.id, input.id));
    if (!execution) return null;
    const nodes = await db.select().from(executionData).where((0, import_drizzle_orm30.eq)(executionData.executionId, input.id)).orderBy(executionData.startedAt);
    return {
      ...execution,
      nodes
    };
  }),
  /**
   * Get execution statistics
   */
  getStats: protectedProcedure.input(
    import_zod16.z.object({
      workflowId: import_zod16.z.number().optional(),
      startDate: import_zod16.z.date().optional(),
      endDate: import_zod16.z.date().optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db)
      return {
        total: 0,
        success: 0,
        error: 0,
        running: 0,
        avgExecutionTime: 0
      };
    const conditions = [];
    if (input.workflowId) {
      conditions.push((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, input.workflowId));
    }
    if (input.startDate) {
      conditions.push((0, import_drizzle_orm30.gte)(workflowExecutions.startedAt, input.startDate));
    }
    if (input.endDate) {
      conditions.push((0, import_drizzle_orm30.lte)(workflowExecutions.startedAt, input.endDate));
    }
    const executions = await db.select().from(workflowExecutions).where(conditions.length > 0 ? (0, import_drizzle_orm30.and)(...conditions) : void 0);
    const total = executions.length;
    const success = executions.filter((e) => e.status === "success").length;
    const error = executions.filter((e) => e.status === "error").length;
    const running = executions.filter((e) => e.status === "running").length;
    const completedExecutions = executions.filter((e) => e.executionTime);
    const avgExecutionTime = completedExecutions.length > 0 ? completedExecutions.reduce(
      (sum, e) => sum + (e.executionTime || 0),
      0
    ) / completedExecutions.length : 0;
    return {
      total,
      success,
      error,
      running,
      avgExecutionTime: Math.round(avgExecutionTime),
      successRate: total > 0 ? Math.round(success / total * 100) : 0
    };
  }),
  /**
   * Get recent executions (all workflows)
   */
  getRecent: protectedProcedure.input(
    import_zod16.z.object({
      limit: import_zod16.z.number().optional().default(20)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const executions = await db.select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: visualFlows.name,
      status: workflowExecutions.status,
      mode: workflowExecutions.mode,
      startedAt: workflowExecutions.startedAt,
      finishedAt: workflowExecutions.finishedAt,
      executionTime: workflowExecutions.executionTime,
      error: workflowExecutions.error
    }).from(workflowExecutions).leftJoin(
      visualFlows,
      (0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, visualFlows.id)
    ).orderBy((0, import_drizzle_orm30.desc)(workflowExecutions.startedAt)).limit(input.limit);
    return executions;
  }),
  /**
   * Retry failed execution
   */
  retry: protectedProcedure.input(import_zod16.z.object({ id: import_zod16.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [execution] = await db.select().from(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.id, input.id));
    if (!execution) {
      throw new Error("Execution not found");
    }
    const { executeWorkflow: executeWorkflow2 } = await Promise.resolve().then(() => (init_workflow_executor(), workflow_executor_exports));
    const triggerData = execution.triggerData ? JSON.parse(execution.triggerData) : void 0;
    const result = await executeWorkflow2(
      execution.workflowId,
      triggerData,
      ctx.user.id
    );
    return result;
  }),
  /**
   * Cancel running execution
   */
  cancel: protectedProcedure.input(import_zod16.z.object({ id: import_zod16.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(workflowExecutions).set({
      status: "canceled",
      finishedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm30.eq)(workflowExecutions.id, input.id));
    return { success: true };
  }),
  /**
   * Delete execution
   */
  delete: protectedProcedure.input(import_zod16.z.object({ id: import_zod16.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(executionData).where((0, import_drizzle_orm30.eq)(executionData.executionId, input.id));
    await db.delete(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.id, input.id));
    return { success: true };
  }),
  /**
   * Export executions to CSV or PDF
   */
  export: protectedProcedure.input(
    import_zod16.z.object({
      format: import_zod16.z.enum(["csv", "pdf"]),
      status: import_zod16.z.enum(["all", "running", "success", "error", "canceled"]).default("all"),
      workflowId: import_zod16.z.number().optional(),
      startDate: import_zod16.z.date().optional(),
      endDate: import_zod16.z.date().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conditions = [];
    if (input.status !== "all") {
      conditions.push((0, import_drizzle_orm30.eq)(workflowExecutions.status, input.status));
    }
    if (input.workflowId) {
      conditions.push((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, input.workflowId));
    }
    if (input.startDate) {
      conditions.push((0, import_drizzle_orm30.gte)(workflowExecutions.startedAt, input.startDate));
    }
    if (input.endDate) {
      conditions.push((0, import_drizzle_orm30.lte)(workflowExecutions.startedAt, input.endDate));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm30.and)(...conditions) : void 0;
    const executions = await db.select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: visualFlows.name,
      status: workflowExecutions.status,
      mode: workflowExecutions.mode,
      startedAt: workflowExecutions.startedAt,
      finishedAt: workflowExecutions.finishedAt,
      executionTime: workflowExecutions.executionTime,
      error: workflowExecutions.error
    }).from(workflowExecutions).leftJoin(
      visualFlows,
      (0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, visualFlows.id)
    ).where(whereClause).orderBy((0, import_drizzle_orm30.desc)(workflowExecutions.startedAt));
    if (input.format === "csv") {
      const headers = [
        "ID",
        "Fluxo",
        "Status",
        "Modo",
        "In\xEDcio",
        "Fim",
        "Tempo (ms)",
        "Erro"
      ];
      const rows = executions.map((e) => [
        e.id,
        e.workflowName || `Fluxo ${e.workflowId}`,
        e.status,
        e.mode,
        e.startedAt?.toISOString() || "",
        e.finishedAt?.toISOString() || "",
        e.executionTime || "",
        e.error || ""
      ]);
      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      return {
        format: "csv",
        data: csv,
        filename: `execucoes_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`
      };
    } else {
      return {
        format: "pdf",
        data: JSON.stringify(executions),
        filename: `execucoes_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`
      };
    }
  }),
  /**
   * Clear all executions for a workflow
   */
  clearByWorkflow: protectedProcedure.input(import_zod16.z.object({ workflowId: import_zod16.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const executions = await db.select({ id: workflowExecutions.id }).from(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, input.workflowId));
    const executionIds = executions.map((e) => e.id);
    for (const id of executionIds) {
      await db.delete(executionData).where((0, import_drizzle_orm30.eq)(executionData.executionId, id));
    }
    await db.delete(workflowExecutions).where((0, import_drizzle_orm30.eq)(workflowExecutions.workflowId, input.workflowId));
    return { success: true, deleted: executionIds.length };
  }),
  /**
   * Get analytics data for dashboard charts
   */
  getAnalytics: protectedProcedure.input(
    import_zod16.z.object({
      period: import_zod16.z.enum(["7d", "30d", "90d"]).default("7d")
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return {
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          avgTime: 0,
          successRate: 0
        },
        dailyStats: []
      };
    }
    const days = { "7d": 7, "30d": 30, "90d": 90 }[input.period];
    const startDate = /* @__PURE__ */ new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const executions = await db.select().from(workflowExecutions).where((0, import_drizzle_orm30.gte)(workflowExecutions.startedAt, startDate)).orderBy(workflowExecutions.startedAt);
    const total = executions.length;
    const success = executions.filter((e) => e.status === "success").length;
    const failed = executions.filter((e) => e.status === "error").length;
    const completedWithTime = executions.filter((e) => e.executionTime);
    const avgTime = completedWithTime.length > 0 ? Math.round(
      completedWithTime.reduce(
        (sum, e) => sum + (e.executionTime || 0),
        0
      ) / completedWithTime.length
    ) : 0;
    const dailyMap = /* @__PURE__ */ new Map();
    executions.forEach((exec2) => {
      const dateKey = exec2.startedAt.toISOString().split("T")[0];
      const current = dailyMap.get(dateKey) || { success: 0, failed: 0 };
      if (exec2.status === "success") current.success++;
      if (exec2.status === "error") current.failed++;
      dailyMap.set(dateKey, current);
    });
    const dailyStats = [];
    for (let i = 0; i < days; i++) {
      const date2 = new Date(startDate);
      date2.setDate(date2.getDate() + i);
      const dateKey = date2.toISOString().split("T")[0];
      const stats = dailyMap.get(dateKey) || { success: 0, failed: 0 };
      dailyStats.push({
        date: dateKey,
        success: stats.success,
        failed: stats.failed
      });
    }
    return {
      summary: {
        total,
        success,
        failed,
        avgTime,
        successRate: total > 0 ? Math.round(success / total * 100) : 0
      },
      dailyStats
    };
  })
});

// server/routers-employees.ts
var import_zod17 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm31 = require("drizzle-orm");
var bcrypt2 = __toESM(require("bcrypt"), 1);
var employeesRouter = router({
  list: protectedProcedure.input(import_zod17.z.object({
    page: import_zod17.z.number().min(1).default(1),
    pageSize: import_zod17.z.number().min(1).max(100).default(20),
    search: import_zod17.z.string().optional().nullish(),
    role: import_zod17.z.string().optional().nullish(),
    status: import_zod17.z.string().optional().nullish()
  }).nullish()).output(import_zod17.z.object({
    employees: import_zod17.z.array(import_zod17.z.object({
      userId: import_zod17.z.number(),
      username: import_zod17.z.string(),
      // login name
      displayName: import_zod17.z.string(),
      // name shown to agents
      email: import_zod17.z.string().nullable(),
      role: import_zod17.z.enum(["user", "admin"]),
      status: import_zod17.z.string(),
      department: import_zod17.z.string().nullable(),
      position: import_zod17.z.string().nullable(),
      cpf: import_zod17.z.string().nullable(),
      phone: import_zod17.z.string().nullable(),
      hireDate: import_zod17.z.string().nullable(),
      skills: import_zod17.z.array(import_zod17.z.string()),
      photoUrl: import_zod17.z.string().nullable(),
      createdAt: import_zod17.z.string(),
      updatedAt: import_zod17.z.string()
    })),
    pagination: import_zod17.z.object({ page: import_zod17.z.number(), pageSize: import_zod17.z.number(), total: import_zod17.z.number(), totalPages: import_zod17.z.number() })
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const safeInput = input && typeof input === "object" ? input : {};
    const { page, pageSize, search, role, status } = safeInput;
    let query = db.select({
      id: users.id,
      username: users.name,
      // name is the login username
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      empStatus: employees.status,
      department: employees.department,
      position: employees.position,
      cpf: employees.cpf,
      phone: employees.phone,
      hireDate: employees.hireDate,
      skills: employees.skills,
      photoUrl: employees.photoUrl
    }).from(users).leftJoin(employees, (0, import_drizzle_orm31.eq)(users.id, employees.userId));
    if (search) query = query.where((0, import_drizzle_orm31.or)((0, import_drizzle_orm31.like)(users.name, `%${search}%`), (0, import_drizzle_orm31.like)(users.email, `%${search}%`), (0, import_drizzle_orm31.like)(employees.cpf, `%${search}%`), (0, import_drizzle_orm31.like)(employees.phone, `%${search}%`)));
    if (role && ["user", "admin"].includes(role)) query = query.where((0, import_drizzle_orm31.eq)(users.role, role));
    if (status) query = query.where((0, import_drizzle_orm31.eq)(employees.status, status));
    let countQ = db.select({ count: import_drizzle_orm31.sql`COUNT(*)` }).from(users).leftJoin(employees, (0, import_drizzle_orm31.eq)(users.id, employees.userId));
    if (search) countQ = countQ.where((0, import_drizzle_orm31.or)((0, import_drizzle_orm31.like)(users.name, `%${search}%`), (0, import_drizzle_orm31.like)(users.email, `%${search}%`), (0, import_drizzle_orm31.like)(employees.cpf, `%${search}%`), (0, import_drizzle_orm31.like)(employees.phone, `%${search}%`)));
    if (role && ["user", "admin"].includes(role)) countQ = countQ.where((0, import_drizzle_orm31.eq)(users.role, role));
    if (status) countQ = countQ.where((0, import_drizzle_orm31.eq)(employees.status, status));
    const countRes = await countQ.limit(1);
    const total = Number(countRes[0].count) || 0;
    const effectivePage = page || 1;
    const effectivePageSize = pageSize || 20;
    const offset = (effectivePage - 1) * effectivePageSize;
    const rows = await query.orderBy((0, import_drizzle_orm31.desc)(users.createdAt)).limit(effectivePageSize).offset(offset);
    const employees4 = rows.map((r) => ({
      userId: r.id,
      username: r.username || "",
      displayName: r.displayName || r.username || "",
      email: r.email || null,
      role: r.role || "user",
      status: r.empStatus || "active",
      department: r.department || null,
      position: r.position || null,
      cpf: r.cpf || null,
      phone: r.phone || null,
      hireDate: r.hireDate?.toISOString() || null,
      skills: r.skills ? JSON.parse(r.skills) : [],
      photoUrl: r.photoUrl || null,
      createdAt: r.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r.updatedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
    }));
    return { employees: employees4, pagination: { page: effectivePage, pageSize: effectivePageSize, total, totalPages: Math.ceil(total / effectivePageSize) } };
  }),
  get: protectedProcedure.input(import_zod17.z.object({ userId: import_zod17.z.number() }).nullish()).output(import_zod17.z.object({
    employee: import_zod17.z.object({
      userId: import_zod17.z.number(),
      username: import_zod17.z.string(),
      displayName: import_zod17.z.string(),
      email: import_zod17.z.string().nullable(),
      role: import_zod17.z.enum(["user", "admin"]),
      status: import_zod17.z.string(),
      department: import_zod17.z.string().nullable(),
      position: import_zod17.z.string().nullable(),
      cpf: import_zod17.z.string().nullable(),
      phone: import_zod17.z.string().nullable(),
      hireDate: import_zod17.z.string().nullable(),
      skills: import_zod17.z.array(import_zod17.z.string()),
      photoUrl: import_zod17.z.string().nullable(),
      createdAt: import_zod17.z.string(),
      updatedAt: import_zod17.z.string()
    })
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const userId = input?.userId;
    if (userId === void 0) throw new Error("userId obrigat\xF3rio");
    const res = await db.select({
      id: users.id,
      username: users.name,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      empStatus: employees.status,
      department: employees.department,
      position: employees.position,
      cpf: employees.cpf,
      phone: employees.phone,
      hireDate: employees.hireDate,
      skills: employees.skills,
      photoUrl: employees.photoUrl
    }).from(users).leftJoin(employees, (0, import_drizzle_orm31.eq)(users.id, employees.userId)).where((0, import_drizzle_orm31.eq)(users.id, userId)).limit(1);
    if (res.length === 0) throw new Error("Funcion\xE1rio n\xE3o encontrado");
    const r = res[0];
    return {
      employee: {
        userId: r.id,
        username: r.username || "",
        displayName: r.displayName || r.username || "",
        email: r.email || null,
        role: r.role || "user",
        status: r.empStatus || "active",
        department: r.department || null,
        position: r.position || null,
        cpf: r.cpf || null,
        phone: r.phone || null,
        hireDate: r.hireDate?.toISOString() || null,
        skills: r.skills ? JSON.parse(r.skills) : [],
        photoUrl: r.photoUrl || null,
        createdAt: r.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: r.updatedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }),
  create: adminProcedure.input(import_zod17.z.object({
    username: import_zod17.z.string().min(1, "Nome de usu\xE1rio \xE9 obrigat\xF3rio"),
    displayName: import_zod17.z.string().min(1, "Nome de exibi\xE7\xE3o \xE9 obrigat\xF3rio"),
    password: import_zod17.z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: import_zod17.z.enum(["user", "admin"]).default("user")
  }).nullish()).output(import_zod17.z.object({ success: import_zod17.z.boolean(), userId: import_zod17.z.number(), message: import_zod17.z.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rawResult = await db.execute(
      import_drizzle_orm31.sql`SELECT id FROM users WHERE name = ${input.username} LIMIT 1`
    );
    const rows = rawResult.rows ?? rawResult[0] ?? rawResult;
    const existing = Array.isArray(rows) ? rows : [rows];
    if (existing.length > 0) throw new Error("Nome de usu\xE1rio j\xE1 cadastrado");
    const passwordHash = await bcrypt2.hash(input.password, 10);
    const openId = `local:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [result] = await db.insert(users).values({
      openId,
      name: input.username,
      displayName: input.displayName,
      email: null,
      passwordHash,
      loginMethod: "local",
      role: input.role
    });
    const lastId = result.insertId || result.$mysqlInsertId();
    if (!lastId) throw new Error("Falha ao criar funcion\xE1rio");
    const [newUser] = await db.select().from(users).where((0, import_drizzle_orm31.eq)(users.id, lastId)).limit(1);
    if (!newUser) throw new Error("Falha ao criar funcion\xE1rio");
    return { success: true, userId: newUser.id, message: "Funcion\xE1rio criado com sucesso" };
  }),
  update: adminProcedure.input(import_zod17.z.object({
    userId: import_zod17.z.number(),
    username: import_zod17.z.string().optional().nullish(),
    displayName: import_zod17.z.string().optional().nullish(),
    role: import_zod17.z.enum(["user", "admin"]).optional().nullish(),
    password: import_zod17.z.string().min(6).optional().nullish()
  }).nullish()).output(import_zod17.z.object({ success: import_zod17.z.boolean(), message: import_zod17.z.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!input) throw new Error("Dados inv\xE1lidos");
    const { userId, username, displayName, role, password } = input;
    const existing = await db.select().from(users).where((0, import_drizzle_orm31.eq)(users.id, userId)).limit(1);
    if (existing.length === 0) throw new Error("Funcion\xE1rio n\xE3o encontrado");
    const updates = {};
    if (username) updates.name = username;
    if (displayName !== void 0) updates.displayName = displayName;
    if (role) updates.role = role;
    if (password) updates.passwordHash = await bcrypt2.hash(password, 10);
    if (Object.keys(updates).length > 0) updates.updatedAt = /* @__PURE__ */ new Date();
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where((0, import_drizzle_orm31.eq)(users.id, userId));
    }
    return { success: true, message: "Funcion\xE1rio atualizado com sucesso" };
  }),
  delete: adminProcedure.input(import_zod17.z.object({ userId: import_zod17.z.number() }).nullish()).output(import_zod17.z.object({ success: import_zod17.z.boolean(), message: import_zod17.z.string() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(users).where((0, import_drizzle_orm31.eq)(users.id, input.userId)).limit(1);
    if (existing.length === 0) throw new Error("Funcion\xE1rio n\xE3o encontrado");
    if (input.userId === 1) throw new Error("N\xE3o \xE9 poss\xEDvel excluir o administrador principal");
    await db.delete(users).where((0, import_drizzle_orm31.eq)(users.id, input.userId));
    return { success: true, message: "Funcion\xE1rio exclu\xEDdo com sucesso" };
  })
});

// server/routers-inbox.ts
var import_zod18 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm32 = require("drizzle-orm");
init_messaging();
var inboxRouter = router({
  /**
   * Get list of conversations (grouped by customer/phone number)
   */
  getConversations: protectedProcedure.input(
    import_zod18.z.object({
      provider: import_zod18.z.enum(["whatsapp", "instagram", "all"]).optional(),
      limit: import_zod18.z.number().optional().default(50),
      tagIds: import_zod18.z.array(import_zod18.z.number()).optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    let filteredConversationIds = null;
    if (input.tagIds && input.tagIds.length > 0) {
      const { conversationTags: conversationTags2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const taggedConversations = await db.select({
        conversationId: conversationTags2.conversationId,
        tagCount: import_drizzle_orm32.sql`COUNT(DISTINCT ${conversationTags2.tagId})`
      }).from(conversationTags2).where(
        import_drizzle_orm32.sql`${conversationTags2.tagId} IN (${import_drizzle_orm32.sql.join(
          input.tagIds.map((id) => import_drizzle_orm32.sql`${id}`),
          import_drizzle_orm32.sql`, `
        )})`
      ).groupBy(conversationTags2.conversationId).having(
        import_drizzle_orm32.sql`COUNT(DISTINCT ${conversationTags2.tagId}) = ${input.tagIds.length}`
      );
      filteredConversationIds = taggedConversations.map(
        (c) => c.conversationId
      );
      if (filteredConversationIds.length === 0) {
        return [];
      }
    }
    let query = db.select({
      fromNumber: receivedMessages.fromNumber,
      fromName: receivedMessages.fromName,
      fromProfilePic: import_drizzle_orm32.sql`COALESCE(${customers.photoUrl}, MAX(${receivedMessages.fromProfilePic}))`,
      provider: receivedMessages.provider,
      lastMessage: receivedMessages.messageText,
      lastMessageType: receivedMessages.messageType,
      lastMessageTime: receivedMessages.timestamp,
      unreadCount: import_drizzle_orm32.sql`COUNT(CASE WHEN ${receivedMessages.processed} = 0 THEN 1 END)`,
      customerId: receivedMessages.customerId
    }).from(receivedMessages).leftJoin(customers, (0, import_drizzle_orm32.eq)(customers.id, receivedMessages.customerId)).groupBy(receivedMessages.fromNumber, receivedMessages.provider, customers.photoUrl).orderBy((0, import_drizzle_orm32.desc)(import_drizzle_orm32.sql`MAX(${receivedMessages.timestamp})`)).limit(input.limit);
    const conditions = [];
    if (input.provider && input.provider !== "all") {
      conditions.push((0, import_drizzle_orm32.eq)(receivedMessages.provider, input.provider));
    }
    if (filteredConversationIds) {
      conditions.push(
        import_drizzle_orm32.sql`CONCAT(${receivedMessages.provider}, '-', ${receivedMessages.fromNumber}) IN (${import_drizzle_orm32.sql.join(
          filteredConversationIds.map((id) => import_drizzle_orm32.sql`${id}`),
          import_drizzle_orm32.sql`, `
        )})`
      );
    }
    if (conditions.length > 0) {
      query = query.where(import_drizzle_orm32.sql`${import_drizzle_orm32.sql.join(conditions, import_drizzle_orm32.sql` AND `)}`);
    }
    const conversations5 = await query;
    conversations5.forEach((conv) => {
      const hasNoPhoto = !conv.fromProfilePic;
      const isExpiredWhatsAppCdn = conv.fromProfilePic && (conv.fromProfilePic.includes("whatsapp.net") || conv.fromProfilePic.includes("whatsapp.com") || conv.fromProfilePic.includes("mmg.whatsapp.net") || conv.fromProfilePic.includes("pps.whatsapp.net"));
      if ((hasNoPhoto || isExpiredWhatsAppCdn) && conv.fromNumber && conv.provider === "whatsapp") {
        setImmediate(async () => {
          try {
            let custId = conv.customerId ? Number(conv.customerId) : null;
            if (!custId) {
              const { findOrCreateCustomerByPhone: findOrCreateCustomerByPhone2 } = await Promise.resolve().then(() => (init_db_messages(), db_messages_exports));
              const c = await findOrCreateCustomerByPhone2(conv.fromNumber);
              custId = c?.id ?? null;
              if (custId) {
                const db2 = await getDb();
                if (db2) {
                  await db2.update(receivedMessages).set({ customerId: custId }).where(
                    (0, import_drizzle_orm32.and)(
                      (0, import_drizzle_orm32.eq)(receivedMessages.fromNumber, conv.fromNumber),
                      (0, import_drizzle_orm32.eq)(receivedMessages.provider, conv.provider)
                    )
                  );
                }
              }
            }
            if (!custId) return;
            console.log(`[Inbox Lazy Load] Resolving missing/expired profile pic for ${conv.fromNumber}...`);
            const { downloadAndUploadProfilePic: downloadAndUploadProfilePic2 } = await Promise.resolve().then(() => (init_profile_pic(), profile_pic_exports));
            await downloadAndUploadProfilePic2(conv.fromNumber, custId);
          } catch (err) {
            console.error(`[Inbox Lazy Load] Failed resolving profile pic for ${conv.fromNumber}:`, err);
          }
        });
      }
    });
    return conversations5.map((conv) => ({
      ...conv,
      lastMessageTime: Number(conv.lastMessageTime),
      unreadCount: Number(conv.unreadCount)
    }));
  }),
  /**
   * Get conversation history for a specific phone number
   */
  getConversationHistory: protectedProcedure.input(
    import_zod18.z.object({
      fromNumber: import_zod18.z.string(),
      provider: import_zod18.z.enum(["whatsapp", "instagram"]),
      limit: import_zod18.z.number().optional().default(100)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm32.eq)(conversations.customerPhone, input.fromNumber)).limit(1);
    if (!conv) return [];
    const msgs = await db.select().from(conversationMessages).where((0, import_drizzle_orm32.eq)(conversationMessages.conversationId, conv.id)).orderBy(conversationMessages.createdAt);
    return msgs.map((msg) => ({
      id: `cm-${msg.id}`,
      direction: msg.senderType === "agent" ? "outbound" : "inbound",
      content: msg.content || (msg.messageType === "reaction" ? msg.reaction || "" : ""),
      messageType: msg.messageType,
      mediaUrl: msg.fileUrl,
      timestamp: msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime(),
      createdAt: msg.createdAt,
      fromName: msg.fromName || null,
      senderId: msg.senderId,
      senderName: msg.senderName || null,
      senderPosition: msg.senderPosition || null,
      reaction: msg.reaction || null,
      replyToExternalId: msg.replyToExternalId || null,
      externalId: msg.externalId,
      processed: true
    }));
  }),
  /**
   * Send a message to a customer
   */
  sendMessage: protectedProcedure.input(
    import_zod18.z.object({
      to: import_zod18.z.string(),
      provider: import_zod18.z.enum(["whatsapp", "instagram"]),
      message: import_zod18.z.string(),
      customerId: import_zod18.z.number().optional(),
      fileUrl: import_zod18.z.string().optional(),
      fileName: import_zod18.z.string().optional(),
      fileType: import_zod18.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (input.provider === "whatsapp") {
      const result = await sendWhatsAppMessage({
        to: input.to,
        message: input.message,
        mediaUrl: input.fileUrl,
        caption: input.fileName
      });
      try {
        const { ingestOutboundConversationMessage: ingestOutboundConversationMessage3 } = await Promise.resolve().then(() => (init_db_messages_outbound(), db_messages_outbound_exports));
        await ingestOutboundConversationMessage3({
          provider: "whatsapp",
          toNumber: input.to,
          fromUserId: ctx.user?.id || 1,
          messageType: input.fileUrl ? "image" : "text",
          messageText: input.message,
          mediaUrl: input.fileUrl,
          fileName: input.fileName,
          mimeType: input.fileType,
          externalId: result?.messageId || result?.messages?.[0]?.id || `outbound-${Date.now()}`,
          createdAt: /* @__PURE__ */ new Date()
        });
        console.log("[Inbox] Outbound message saved to conversation history");
      } catch (saveError) {
        console.error("[Inbox] Failed to save outbound message:", saveError);
      }
      return result;
    } else if (input.provider === "instagram") {
      const result = await sendInstagramMessage({
        to: input.to,
        message: input.message,
        mediaUrl: input.fileUrl
      });
      return result;
    }
    throw new Error("Invalid provider");
  }),
  /**
   * Mark conversation as read
   */
  markAsRead: protectedProcedure.input(
    import_zod18.z.object({
      fromNumber: import_zod18.z.string(),
      provider: import_zod18.z.enum(["whatsapp", "instagram"])
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(receivedMessages).set({ processed: 1, processedAt: /* @__PURE__ */ new Date() }).where(
      (0, import_drizzle_orm32.and)(
        (0, import_drizzle_orm32.eq)(receivedMessages.fromNumber, input.fromNumber),
        (0, import_drizzle_orm32.eq)(receivedMessages.provider, input.provider),
        (0, import_drizzle_orm32.eq)(receivedMessages.processed, 0)
      )
    );
    return { success: true };
  }),
  /**
   * Get inbox statistics
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      return {
        totalConversations: 0,
        unreadMessages: 0,
        whatsappCount: 0,
        instagramCount: 0
      };
    const stats = await db.select({
      totalConversations: import_drizzle_orm32.sql`COUNT(DISTINCT ${receivedMessages.fromNumber})`,
      unreadMessages: import_drizzle_orm32.sql`COUNT(CASE WHEN ${receivedMessages.processed} = 0 THEN 1 END)`,
      whatsappCount: import_drizzle_orm32.sql`COUNT(CASE WHEN ${receivedMessages.provider} = 'whatsapp' THEN 1 END)`,
      instagramCount: import_drizzle_orm32.sql`COUNT(CASE WHEN ${receivedMessages.provider} = 'instagram' THEN 1 END)`
    }).from(receivedMessages);
    return {
      totalConversations: Number(stats[0].totalConversations),
      unreadMessages: Number(stats[0].unreadMessages),
      whatsappCount: Number(stats[0].whatsappCount),
      instagramCount: Number(stats[0].instagramCount)
    };
  })
});

// server/routers-leads.ts
var import_zod19 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm33 = require("drizzle-orm");
var leadsRouter = router({
  // Listar leads com paginação e filtros opcionais
  list: protectedProcedure.input(
    import_zod19.z.object({
      page: import_zod19.z.number().min(1).default(1),
      pageSize: import_zod19.z.number().min(1).max(100).default(20),
      search: import_zod19.z.string().optional(),
      stage: import_zod19.z.string().optional(),
      assignedTo: import_zod19.z.number().optional(),
      sortBy: import_zod19.z.enum(["createdAt", "value", "name"]).default("createdAt"),
      sortOrder: import_zod19.z.enum(["asc", "desc"]).default("desc")
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { page, pageSize, search, stage, assignedTo, sortBy, sortOrder } = input;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (search) {
      conditions.push(
        (0, import_drizzle_orm33.or)(
          (0, import_drizzle_orm33.like)(leads.name, `%${search}%`),
          (0, import_drizzle_orm33.like)(leads.email, `%${search}%`),
          (0, import_drizzle_orm33.like)(leads.phone, `%${search}%`)
        )
      );
    }
    if (stage) {
      conditions.push((0, import_drizzle_orm33.eq)(leads.stage, stage));
    }
    if (assignedTo !== void 0) {
      conditions.push((0, import_drizzle_orm33.eq)(leads.assignedTo, assignedTo));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm33.and)(...conditions) : void 0;
    const countResult = await db.select({ count: import_drizzle_orm33.sql`COUNT(*)` }).from(leads).where(whereClause).limit(1);
    const total = Number(countResult[0].count) || 0;
    let orderBy = (0, import_drizzle_orm33.desc)(leads.createdAt);
    switch (sortBy) {
      case "createdAt":
        orderBy = sortOrder === "asc" ? import_drizzle_orm33.sql`${leads.createdAt} ASC` : import_drizzle_orm33.sql`${leads.createdAt} DESC`;
        break;
      case "value":
        orderBy = sortOrder === "asc" ? import_drizzle_orm33.sql`${leads.value} ASC` : import_drizzle_orm33.sql`${leads.value} DESC`;
        break;
      case "name":
        orderBy = sortOrder === "asc" ? import_drizzle_orm33.sql`${leads.name} ASC` : import_drizzle_orm33.sql`${leads.name} DESC`;
        break;
    }
    const results = await db.select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      source: leads.source,
      stage: leads.stage,
      value: leads.value,
      assignedTo: leads.assignedTo,
      followUpDate: leads.followUpDate,
      notes: leads.notes,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      // Join with customer name if exists
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone
      },
      // Join with assigned agent name if exists
      assignedAgent: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    }).from(leads).leftJoin(customers, (0, import_drizzle_orm33.eq)(leads.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm33.eq)(leads.assignedTo, users.id)).where(whereClause).orderBy(orderBy).limit(pageSize).offset(offset);
    return {
      leads: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }),
  // Obter um lead por ID
  get: protectedProcedure.input(import_zod19.z.object({ id: import_zod19.z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      source: leads.source,
      stage: leads.stage,
      value: leads.value,
      assignedTo: leads.assignedTo,
      followUpDate: leads.followUpDate,
      notes: leads.notes,
      createdBy: leads.createdBy,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone
      },
      assignedAgent: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    }).from(leads).leftJoin(customers, (0, import_drizzle_orm33.eq)(leads.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm33.eq)(leads.assignedTo, users.id)).where(
      (0, import_drizzle_orm33.and)(
        (0, import_drizzle_orm33.eq)(leads.id, input.id),
        (0, import_drizzle_orm33.eq)(leads.assignedTo, ctx.user.id)
        // Ensure the lead belongs to the current user
      )
    ).limit(1);
    return result[0] || null;
  }),
  // Criar lead
  create: protectedProcedure.input(
    import_zod19.z.object({
      name: import_zod19.z.string(),
      email: import_zod19.z.string().email().optional().or(import_zod19.z.string().max(0)),
      phone: import_zod19.z.string().optional(),
      source: import_zod19.z.string().optional(),
      stage: import_zod19.z.enum(["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
      value: import_zod19.z.number().optional(),
      assignedTo: import_zod19.z.number().optional(),
      followUpDate: import_zod19.z.string().optional(),
      notes: import_zod19.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = /* @__PURE__ */ new Date();
    const insertValues = {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      value: input.value ?? null,
      assignedTo: input.assignedTo ?? null,
      notes: input.notes ?? null,
      createdBy: ctx.user?.id ?? null,
      createdAt: now,
      updatedAt: now
    };
    if (input.stage) insertValues.stage = input.stage;
    if (input.source) insertValues.source = input.source;
    if (input.followUpDate) insertValues.followUpDate = new Date(input.followUpDate);
    const newLead = await db.insert(leads).values(insertValues).$returningId();
    return { id: newLead[0].id };
  }),
  // Atualizar lead
  update: protectedProcedure.input(
    import_zod19.z.object({
      id: import_zod19.z.number(),
      name: import_zod19.z.string().optional(),
      email: import_zod19.z.string().email().optional().or(import_zod19.z.string().max(0)),
      phone: import_zod19.z.string().optional(),
      source: import_zod19.z.string().optional(),
      stage: import_zod19.z.enum(["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
      value: import_zod19.z.number().optional(),
      assignedTo: import_zod19.z.number().optional(),
      followUpDate: import_zod19.z.string().optional(),
      notes: import_zod19.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const update = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    Object.keys(input).forEach((key) => {
      if (key !== "id" && input[key] !== void 0) {
        const value = input[key];
        if (key === "stage" || key === "source" || key === "email" || key === "phone" || key === "value" || key === "assignedTo" || key === "followUpDate" || key === "notes") {
          update[key] = value ?? null;
        } else {
          update[key] = value;
        }
      }
    });
    await db.update(leads).set(update).where((0, import_drizzle_orm33.eq)(leads.id, input.id));
    return { success: true };
  }),
  // Deletar lead
  delete: protectedProcedure.input(import_zod19.z.object({ id: import_zod19.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(leads).where((0, import_drizzle_orm33.eq)(leads.id, input.id));
    return { success: true };
  })
});

// server/routers-logs.ts
init_trpc();
var import_zod20 = require("zod");
init_db();
init_schema_logs();
var import_drizzle_orm34 = require("drizzle-orm");
var logsRouter = router({
  // Get logs for an execution
  getByExecution: protectedProcedure.input(import_zod20.z.object({
    executionId: import_zod20.z.number()
  })).query(async ({ input }) => {
    try {
      const db = await getDb();
      const logs2 = await db.select().from(flowExecutionLogs).where((0, import_drizzle_orm34.eq)(flowExecutionLogs.executionId, input.executionId)).orderBy(flowExecutionLogs.createdAt);
      return logs2;
    } catch (error) {
      console.error("Error fetching execution logs:", error);
      return [];
    }
  }),
  // Get recent logs
  getRecent: protectedProcedure.input(import_zod20.z.object({
    limit: import_zod20.z.number().min(1).max(100).default(50)
  })).query(async ({ input }) => {
    try {
      const db = await getDb();
      const logs2 = await db.select().from(flowExecutionLogs).orderBy((0, import_drizzle_orm34.desc)(flowExecutionLogs.createdAt)).limit(input.limit);
      return logs2;
    } catch (error) {
      console.error("Error fetching recent logs:", error);
      return [];
    }
  }),
  // Create log entry
  create: protectedProcedure.input(import_zod20.z.object({
    executionId: import_zod20.z.number(),
    nodeId: import_zod20.z.string(),
    nodeName: import_zod20.z.string(),
    nodeType: import_zod20.z.string(),
    status: import_zod20.z.enum(["started", "completed", "failed"]),
    input: import_zod20.z.string().optional(),
    output: import_zod20.z.string().optional(),
    error: import_zod20.z.string().optional(),
    duration: import_zod20.z.number().optional()
  })).mutation(async ({ input }) => {
    try {
      const db = await getDb();
      const [result] = await db.insert(flowExecutionLogs).values({
        executionId: input.executionId,
        nodeId: input.nodeId,
        nodeName: input.nodeName,
        nodeType: input.nodeType,
        status: input.status,
        input: input.input,
        output: input.output,
        error: input.error,
        duration: input.duration
      });
      const lastId = result.insertId || result.$mysqlInsertId();
      if (!lastId) {
        throw new Error("Failed to get log ID");
      }
      const [log] = await db.select().from(flowExecutionLogs).where((0, import_drizzle_orm34.eq)(flowExecutionLogs.id, lastId)).limit(1);
      return log;
    } catch (error) {
      console.error("Error creating log:", error);
      throw error;
    }
  })
});

// server/routers-messages.ts
var import_zod21 = require("zod");
var import_drizzle_orm35 = require("drizzle-orm");
init_schema();
init_trpc();
init_db();
init_sse();
init_messaging();
var messagesRouter = router({
  /**
   * Deleta uma mensagem por ID.
   */
  delete: protectedProcedure.input(import_zod21.z.object({ messageId: import_zod21.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.delete(conversationMessages).where((0, import_drizzle_orm35.eq)(conversationMessages.id, input.messageId));
    const affected = result?.[0]?.affectedRows ?? 0;
    if (affected === 0) {
      throw new Error("Mensagem n\xE3o encontrada");
    }
    return { success: true };
  }),
  /**
   * Encaminha uma mensagem (texto, imagem, documento, etc.) para outro atendente OU para um cliente.
   * - Se targetAgentId: atendente recebe como sussurro (mensagem interna)
   * - Se targetCustomerPhone: cliente recebe via WhatsApp/Instagram
   */
  forward: protectedProcedure.input(
    import_zod21.z.object({
      messageId: import_zod21.z.number(),
      targetAgentId: import_zod21.z.number().optional(),
      // ID do atendente destino
      targetCustomerPhone: import_zod21.z.string().optional(),
      // Telefone do cliente destino
      targetProvider: import_zod21.z.enum(["whatsapp", "instagram"]).optional()
      // Canal para envio ao cliente
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!input.targetAgentId && !input.targetCustomerPhone) {
      throw new Error("Informe targetAgentId ou targetCustomerPhone");
    }
    const [originalMsg] = await db.select().from(conversationMessages).where((0, import_drizzle_orm35.eq)(conversationMessages.id, input.messageId)).limit(1);
    if (!originalMsg) {
      throw new Error("Mensagem original n\xE3o encontrada");
    }
    console.log("[FORWARD] originalMsg:", originalMsg);
    console.log("[FORWARD] originalMsg.fileUrl:", originalMsg.fileUrl);
    console.log("[FORWARD] originalMsg.fileType:", originalMsg.fileType);
    console.log("[FORWARD] originalMsg.externalId:", originalMsg.externalId);
    console.log("[FORWARD] originalMsg.content:", originalMsg.content);
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm35.eq)(conversations.id, originalMsg.conversationId)).limit(1);
    if (!conv) {
      throw new Error("Conversa n\xE3o encontrada");
    }
    const [senderUser] = await db.select().from(users).where((0, import_drizzle_orm35.eq)(users.id, ctx.user.id)).limit(1);
    const senderName = senderUser?.displayName || senderUser?.name || "Atendente";
    let forwardContent = `\u{1F4E4} **Mensagem encaminhada por ${senderName}**

`;
    if (originalMsg.content && originalMsg.content !== "null") {
      forwardContent += `\u{1F4AC} ${originalMsg.content}

`;
    }
    if (originalMsg.fileUrl) {
      const fileType = originalMsg.fileType || "";
      if (fileType.startsWith("image/")) {
        forwardContent += `\u{1F5BC}\uFE0F [Imagem encaminhada](${originalMsg.fileUrl})
`;
      } else if (fileType.startsWith("audio/")) {
        forwardContent += `\u{1F3B5} [\xC1udio encaminhado](${originalMsg.fileUrl})
`;
      } else if (fileType.startsWith("video/")) {
        forwardContent += `\u{1F3AC} [V\xEDdeo encaminhado](${originalMsg.fileUrl})
`;
      } else {
        forwardContent += `\u{1F4CE} [Documento encaminhado](${originalMsg.fileUrl})
`;
      }
      if (originalMsg.fileName) {
        forwardContent += `\u{1F4C4} ${originalMsg.fileName}
`;
      }
    }
    forwardContent += `
\u{1F517} Conversa: #${conv.id} - ${conv.customerName || conv.customerPhone}`;
    if (input.targetAgentId) {
      const insertResult = await db.insert(internalMessages).values({
        conversationId: originalMsg.conversationId,
        senderId: ctx.user.id,
        recipientId: input.targetAgentId,
        content: forwardContent,
        createdAt: /* @__PURE__ */ new Date()
      });
      const rawId = Array.isArray(insertResult) ? insertResult[0]?.insertId : insertResult?.insertId || insertResult?.lastInsertRowid;
      const internalMessageId = Number(rawId) || null;
      if (internalMessageId) {
        sseManager.emitToUser(String(input.targetAgentId), EVENTS.INTERNAL_MESSAGE, {
          messageId: internalMessageId,
          conversationId: originalMsg.conversationId,
          senderId: ctx.user.id,
          senderName,
          content: forwardContent,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return { success: true, internalMessageId };
    }
    if (input.targetCustomerPhone) {
      const provider = input.targetProvider || conv.channel || "whatsapp";
      let existingConv = null;
      try {
        const { conversations: conversations5, customers: customers5 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eqFn } = await import("drizzle-orm");
        [existingConv] = await db.select().from(conversations5).where(eqFn(conversations5.customerPhone, input.targetCustomerPhone)).limit(1);
        if (existingConv && existingConv.status === "closed") {
          await db.update(conversations5).set({ status: "open", updatedAt: /* @__PURE__ */ new Date() }).where(eqFn(conversations5.id, existingConv.id));
          console.log("[FORWARD] Conversa #" + existingConv.id + " reaberta");
        }
        if (!existingConv) {
          let [customer2] = await db.select().from(customers5).where(eqFn(customers5.phone, input.targetCustomerPhone)).limit(1);
          if (!customer2) {
            const [newCustomer] = await db.insert(customers5).values({
              phone: input.targetCustomerPhone,
              name: input.targetCustomerPhone,
              status: "active",
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).returning();
            customer2 = newCustomer;
          }
          const [newConv] = await db.insert(conversations5).values({
            customerId: customer2.id,
            customerPhone: input.targetCustomerPhone,
            customerName: customer2.name || input.targetCustomerPhone,
            channel: provider,
            status: "open",
            assignedTo: ctx.user.id,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          console.log("[FORWARD] Nova conversa criada #" + newConv.id + " para " + input.targetCustomerPhone);
        }
      } catch (e) {
        console.log("[FORWARD] Erro ao reabrir/criar conversa:", String(e.message || e).substring(0, 100));
      }
      let externalMessageId = null;
      let customerContent = `\u{1F4E4} Mensagem encaminhada:

`;
      if (originalMsg.content && originalMsg.content !== "null") {
        customerContent += `${originalMsg.content}

`;
      }
      if (originalMsg.fileUrl) {
        const fileType = originalMsg.fileType || "";
        if (fileType.startsWith("image/")) {
          customerContent += `[Imagem]
`;
        } else if (fileType.startsWith("audio/")) {
          customerContent += `[\xC1udio]
`;
        } else if (fileType.startsWith("video/")) {
          customerContent += `[V\xEDdeo]
`;
        } else {
          customerContent += `[Documento]
`;
        }
        if (originalMsg.fileName) {
          customerContent += `${originalMsg.fileName}
`;
        }
        customerContent += `${originalMsg.fileUrl}
`;
      }
      if (provider === "whatsapp") {
        const { sendWhatsAppMessage: sendWhatsAppMessage2, sendWhatsAppImage: sendWhatsAppImage3, sendWhatsAppViewOnceMedia: sendWhatsAppViewOnceMedia2 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
        const { uploadToR2: uploadToR23, isR2Url: isR2Url2 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
        const ensurePublicMediaUrl = async (mediaUrl, mimetype) => {
          if (isR2Url2(mediaUrl)) return mediaUrl;
          if (mediaUrl.startsWith("data:")) {
            try {
              const mimeMatch = mediaUrl.match(/^data:([^;]+);base64,(.*)$/s);
              if (mimeMatch && mimeMatch[1] && mimeMatch[2]) {
                const buffer = Buffer.from(mimeMatch[2], "base64");
                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : "jpg";
                const r2Result = await uploadToR23(buffer, `messages/forward_${Date.now()}.${ext}`, mimetype);
                return r2Result.url;
              }
            } catch (r2Err) {
              console.error("[messages.forward] R2 upload failed for data URL:", r2Err);
              const base64Match = mediaUrl.match(/^data:[^;]+;base64,(.*)$/s);
              if (base64Match) return base64Match[1];
            }
          }
          const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
          const { integrationSettings: integrationSettings4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { eq: eq210 } = await import("drizzle-orm");
          const db2 = await getDb2();
          if (db2) {
            const [config] = await db2.select().from(integrationSettings4).where(eq210(integrationSettings4.integrationType, "evolution_api")).limit(1);
            if (config) {
              const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
              const possibleUrls = [];
              if (configData.apiUrl) {
                possibleUrls.push(configData.apiUrl.replace(/\/$/, ""));
              }
              const instances = configData.instances || [];
              for (const inst of instances) {
                if (inst?.url) possibleUrls.push(inst.url.replace(/\/$/, ""));
                if (inst?.instanceUrl) possibleUrls.push(inst.instanceUrl.replace(/\/$/, ""));
              }
              const settings = config.settings ? typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings : null;
              if (settings?.instances) {
                for (const inst of settings.instances) {
                  if (inst?.url) possibleUrls.push(inst.url.replace(/\/$/, ""));
                  if (inst?.instanceUrl) possibleUrls.push(inst.instanceUrl.replace(/\/$/, ""));
                }
              }
              const uniqueUrls = [...new Set(possibleUrls)];
              const apiKey = configData.apiKey || configData.accessToken || "";
              for (const baseUrl of uniqueUrls) {
                if (!mediaUrl.startsWith("http")) {
                  if (originalMsg.externalId) {
                    const downloadUrl = `${baseUrl}/message/download/${originalMsg.key?.id ?? originalMsg.externalId}`;
                    console.log("[FORWARD] downloadUrl:", downloadUrl);
                    try {
                      const resp = await fetch(downloadUrl, {
                        headers: { apikey: apiKey },
                        signal: AbortSignal.timeout(15e3)
                      });
                      console.log("[FORWARD] downloadResponse status:", resp.status);
                      if (resp.ok) {
                        const ctype = resp.headers.get("content-type") || "";
                        if (ctype.includes("json")) {
                          const data = await resp.json();
                          console.log("[FORWARD] downloadResponse body:", data);
                          const actualMediaUrl = data?.url || data?.mediaUrl;
                          if (actualMediaUrl) {
                            const mediaResp = await fetch(actualMediaUrl, {
                              headers: { "User-Agent": "Mozilla/5.0" },
                              signal: AbortSignal.timeout(2e4)
                            });
                            if (mediaResp.ok) {
                              const buf = Buffer.from(await mediaResp.arrayBuffer());
                              if (buf.length > 0) {
                                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                                const r2Result = await uploadToR23(buf, `messages/forward_${Date.now()}.${ext}`, mimetype);
                                console.log("[FORWARD] uploadToR2 result:", r2Result);
                                return r2Result.url;
                              }
                            }
                          }
                        } else {
                          const buf = Buffer.from(await resp.arrayBuffer());
                          if (buf.length > 0) {
                            const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                            const r2Result = await uploadToR23(buf, `messages/forward_${Date.now()}.${ext}`, mimetype);
                            console.log("[FORWARD] uploadToR2 result (direct buffer):", r2Result);
                            return r2Result.url;
                          }
                        }
                      }
                    } catch (e) {
                      console.error("[messages.forward] Download error:", e);
                    }
                  } else {
                    try {
                      const decodedUrl = mediaUrl.includes("%40") ? decodeURIComponent(mediaUrl) : mediaUrl;
                      for (const baseUrl2 of uniqueUrls) {
                        try {
                          const directUrl = baseUrl2 + "/" + decodedUrl;
                          console.log("[FORWARD] Trying direct fetch from Evolution API:", directUrl.substring(0, 100));
                          const mediaResp = await fetch(directUrl, {
                            headers: { apikey: apiKey, "User-Agent": "Mozilla/5.0" },
                            signal: AbortSignal.timeout(15e3)
                          });
                          console.log("[FORWARD] Direct fetch response:", mediaResp.status);
                          if (mediaResp.ok) {
                            const ctype = mediaResp.headers.get("content-type") || "";
                            if (!ctype.includes("text/html") && !ctype.includes("text/plain")) {
                              const buf = Buffer.from(await mediaResp.arrayBuffer());
                              if (buf.length > 0) {
                                const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : mimetype.includes("pdf") ? "pdf" : mimetype.includes("video") ? "mp4" : mimetype.includes("audio") ? "ogg" : "jpg";
                                const r2Result = await uploadToR22(buf, "messages/forward_" + Date.now() + "." + ext, mimetype);
                                console.log("[FORWARD] Uploaded to R2 from Evolution API:", r2Result.url);
                                return r2Result.url;
                              }
                            }
                          }
                        } catch (e) {
                          console.log("[FORWARD] Direct fetch failed:", String(e.message || e).substring(0, 100));
                        }
                      }
                    } catch (e) {
                      console.log("[FORWARD] Evolution API fallback error:", String(e.message || e).substring(0, 100));
                    }
                    console.log("[FORWARD] All media fetch attempts failed - returning mediaUrl");
                    return mediaUrl;
                  }
                } else {
                  try {
                    const resp = await fetch(mediaUrl, {
                      headers: apiKey ? { apikey: apiKey, "User-Agent": "Mozilla/5.0" } : { "User-Agent": "Mozilla/5.0" },
                      signal: AbortSignal.timeout(15e3)
                    });
                    if (resp.ok) {
                      const ctype = resp.headers.get("content-type") || "";
                      if (!ctype.includes("json") && !ctype.includes("text/html") && !ctype.includes("text/plain")) {
                        const buf = Buffer.from(await resp.arrayBuffer());
                        if (buf.length > 0) {
                          const detectedMime = ctype || mimetype;
                          const ext = detectedMime.includes("png") ? "png" : detectedMime.includes("webp") ? "webp" : detectedMime.includes("pdf") ? "pdf" : detectedMime.includes("video") ? "mp4" : detectedMime.includes("audio") ? "ogg" : "jpg";
                          const r2Result = await uploadToR23(buf, `messages/forward_${Date.now()}.${ext}`, detectedMime);
                          return r2Result.url;
                        }
                      }
                    }
                  } catch (e) {
                    console.error("[messages.forward] Direct download error:", e);
                  }
                }
              }
            }
          }
        };
        if (originalMsg.fileUrl) {
          const fileType = originalMsg.fileType || "";
          const publicMediaUrl = await ensurePublicMediaUrl(originalMsg.fileUrl, fileType);
          console.log("[FORWARD] publicMediaUrl returned by ensurePublicMediaUrl:", publicMediaUrl);
          const payloadToSend = {
            to: input.targetCustomerPhone,
            imageUrl: publicMediaUrl,
            caption: void 0
            // Removido: enviar apenas a imagem sem texto
          };
          console.log("[FORWARD] payload to sendWhatsAppImage:", JSON.stringify(payloadToSend, null, 2));
          if (fileType.startsWith("image/")) {
            const result = await sendWhatsAppImage3({
              to: input.targetCustomerPhone,
              imageUrl: publicMediaUrl,
              caption: void 0
              // Removido: enviar apenas midia sem texto
            });
            externalMessageId = result?.messageId || null;
          } else if (fileType.startsWith("video/")) {
            const result = await sendWhatsAppViewOnceMedia2({
              to: input.targetCustomerPhone,
              mediaUrl: publicMediaUrl,
              mediaType: "video",
              caption: void 0
              // Removido: enviar apenas midia sem texto
            });
            externalMessageId = result?.messageId || null;
          } else if (fileType.startsWith("audio/")) {
            const result = await sendWhatsAppViewOnceMedia2({
              to: input.targetCustomerPhone,
              mediaUrl: publicMediaUrl,
              mediaType: "audio",
              caption: void 0
              // Removido: enviar apenas midia sem texto
            });
            externalMessageId = result?.messageId || null;
          } else {
            const [senderUser2] = await db.select().from(users).where((0, import_drizzle_orm35.eq)(users.id, ctx.user?.id)).limit(1);
            const [senderEmp] = await db.select().from(employees).where((0, import_drizzle_orm35.eq)(employees.userId, ctx.user?.id)).limit(1);
            const senderName2 = senderUser2?.displayName || senderUser2?.name || ctx.user?.name || null;
            const senderPosition = senderEmp?.position || null;
            const result = await sendWhatsAppMessage2({
              to: customerPhone,
              message: content,
              senderId: ctx.user?.id ? Number(ctx.user.id) : void 0,
              senderName: senderName2,
              senderPosition
            });
          }
        } else {
          const result = await sendWhatsAppMessage2({
            to: input.targetCustomerPhone,
            message: customerContent
          });
          externalMessageId = result?.messageId || null;
        }
      } else if (provider === "instagram") {
        const result = await sendInstagramMessage({
          to: input.targetCustomerPhone,
          message: customerContent,
          mediaUrl: originalMsg.fileUrl || void 0
        });
        externalMessageId = result?.messageId || null;
      } else {
        const result = await sendWhatsAppMessage({
          to: input.targetCustomerPhone,
          message: customerContent
        });
        externalMessageId = result?.messageId || null;
      }
      return { success: true, externalMessageId };
    }
    throw new Error("Destino inv\xE1lido");
  }),
  list: protectedProcedure.input(import_zod21.z.object({ conversation_id: import_zod21.z.coerce.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const messages4 = await db.select().from(conversationMessages).where((0, import_drizzle_orm35.eq)(conversationMessages.conversationId, input.conversation_id)).orderBy(conversationMessages.createdAt);
      const result = await Promise.all(messages4.map(async (msg) => {
        let senderName = null;
        let senderPosition = null;
        if (msg.senderId) {
          const [user] = await db.select().from(users).where((0, import_drizzle_orm35.eq)(users.id, msg.senderId)).limit(1);
          senderName = user?.name || null;
          const [employee] = await db.select().from(employees).where((0, import_drizzle_orm35.eq)(employees.userId, msg.senderId)).limit(1);
          senderPosition = employee?.position || null;
        }
        return {
          id: msg.id,
          conversationId: msg.conversationId,
          externalId: msg.externalId,
          remoteJid: msg.remoteJid,
          provider: msg.provider,
          senderId: msg.senderId,
          senderType: msg.senderType,
          content: msg.content,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          fileSize: msg.fileSize,
          readAt: msg.readAt,
          createdAt: msg.createdAt,
          senderName,
          senderPosition,
          reaction: msg.reaction || null,
          replyToExternalId: msg.replyToExternalId || null
        };
      }));
      return result;
    } catch (error) {
      console.error("[messages.list] Error fetching messages:", error);
      return [];
    }
  }),
  send: protectedProcedure.input(
    import_zod21.z.object({
      // Frontend sends these parameters
      to: import_zod21.z.string().optional(),
      provider: import_zod21.z.enum(["whatsapp", "instagram"]).optional(),
      message: import_zod21.z.string().optional(),
      customerId: import_zod21.z.number().optional(),
      fileUrl: import_zod21.z.string().optional(),
      fileName: import_zod21.z.string().optional(),
      fileType: import_zod21.z.string().optional(),
      fileSize: import_zod21.z.number().optional(),
      viewOnce: import_zod21.z.boolean().optional(),
      // Also accept snake_case
      conversation_id: import_zod21.z.coerce.number().optional(),
      content: import_zod21.z.string().optional(),
      file_url: import_zod21.z.string().optional(),
      file_name: import_zod21.z.string().optional(),
      file_type: import_zod21.z.string().optional(),
      file_size: import_zod21.z.number().optional(),
      replyToMessageId: import_zod21.z.number().optional()
      // ID da mensagem original para citar (responder)
    }).refine(
      (data) => {
        return !!(data.conversation_id || data.to && data.provider);
      },
      {
        message: "Either conversation_id or (to + provider) is required"
      }
    )
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user?.role === "admin") {
      throw new Error(
        "Admin n\xE3o pode enviar mensagens ao cliente. Use mensagens internas (sussurros) para orientar agentes."
      );
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let fileUrl = input.fileUrl ?? input.file_url ?? null;
    const replyToMessageId = input.replyToMessageId ?? null;
    const fileName = input.fileName ?? input.file_name ?? null;
    let fileType = input.fileType ?? input.file_type ?? null;
    const fileSize = input.fileSize ?? input.file_size ?? null;
    const messageText = input.message ?? input.content ?? "";
    let conversationId2 = input.conversation_id;
    if (!conversationId2) {
      const [foundConv] = await db.select().from(conversations).where(
        (0, import_drizzle_orm35.and)(
          (0, import_drizzle_orm35.eq)(conversations.customerPhone, input.to),
          (0, import_drizzle_orm35.eq)(conversations.channel, input.provider)
        )
      ).limit(1);
      conversationId2 = foundConv?.id;
    }
    if (!conversationId2) {
      throw new Error("Conversa n\xE3o encontrada");
    }
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm35.eq)(conversations.id, conversationId2)).limit(1);
    const customerPhone2 = conv?.customerPhone || input.to;
    const provider = input.provider || conv?.channel || "whatsapp";
    let content2 = messageText;
    if (!content2 && fileUrl) {
      content2 = `[M\xEDdia enviada: ${fileName || fileUrl}]`;
    }
    if (provider === "whatsapp") {
      const { sendWhatsAppMessage: sendWhatsAppMessage2 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
      const [senderUser] = await db.select().from(users).where((0, import_drizzle_orm35.eq)(users.id, ctx.user?.id)).limit(1);
      const [senderEmp] = await db.select().from(employees).where((0, import_drizzle_orm35.eq)(employees.userId, ctx.user?.id)).limit(1);
      const senderName = senderUser?.displayName || senderUser?.name || ctx.user?.name || null;
      const senderPosition = senderEmp?.position || null;
      const result = await sendWhatsAppMessage2({
        to: customerPhone2,
        message: content2,
        senderId: ctx.user?.id ? Number(ctx.user.id) : void 0,
        senderName,
        senderPosition
      });
      return { success: true, messageId: result?.messageId };
    } else if (provider === "instagram") {
      const { sendInstagramMessage: sendInstagramMessage2 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
      const result = await sendInstagramMessage2({
        to: customerPhone2,
        message: content2,
        mediaUrl: fileUrl || void 0
      });
      return { success: true, messageId: result?.messageId };
    }
    throw new Error("Provider n\xE3o suportado");
  }),
  /**
   * Responder a uma mensagem específica (reply/context)
   * - replyToId: externalId (Evolution message ID) da mensagem original
   * - content: texto da resposta
   */
  reply: protectedProcedure.input(
    import_zod21.z.object({
      replyToId: import_zod21.z.string(),
      // externalId da mensagem a responder
      content: import_zod21.z.string().min(1),
      conversation_id: import_zod21.z.coerce.number()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm35.eq)(conversations.id, input.conversation_id)).limit(1);
    if (!conv) throw new Error("Conversa n\xE3o encontrada");
    const [senderUser] = await db.select().from(users).where((0, import_drizzle_orm35.eq)(users.id, ctx.user?.id)).limit(1);
    const [senderEmp] = await db.select().from(employees).where((0, import_drizzle_orm35.eq)(employees.userId, ctx.user?.id)).limit(1);
    const senderName = senderUser?.displayName || senderUser?.name || ctx.user?.name || null;
    const senderPosition = senderEmp?.position || null;
    const { sendWhatsAppMessage: sendWhatsAppMessage2 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
    const [originalMsg] = await db.select().from(conversationMessages).where((0, import_drizzle_orm35.eq)(conversationMessages.externalId, input.replyToId)).limit(1);
    const result = await sendWhatsAppMessage2({
      to: conv.customerPhone,
      message: input.content,
      replyToMessageId: input.replyToId,
      replyToRemoteJid: originalMsg?.remoteJid || void 0,
      // ✅ Passar remoteJid para quoted
      senderId: ctx.user?.id ? Number(ctx.user.id) : void 0,
      senderName,
      senderPosition
    });
    try {
      const { ingestOutboundConversationMessage: ingestOutboundConversationMessage3 } = await Promise.resolve().then(() => (init_db_messages(), db_messages_exports));
      await ingestOutboundConversationMessage3({
        provider: "whatsapp",
        toNumber: conv.customerPhone,
        fromUserId: ctx.user?.id ? Number(ctx.user.id) : 1,
        fromUserName: senderName || null,
        fromUserPosition: senderPosition || null,
        messageType: "text",
        messageText: input.content,
        externalId: result?.messageId || `outbound-${Date.now()}`,
        replyToExternalId: input.replyToId,
        // ✅ Referenciar mensagem respondida
        createdAt: /* @__PURE__ */ new Date()
      });
    } catch (saveErr) {
      console.error("[messages.reply] Failed to save outbound:", saveErr);
    }
    return { success: true, messageId: result?.messageId };
  })
});

// server/routers-migration.ts
init_trpc();
init_db();
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var migrationRouter = router({
  runBabyShowerMigration: protectedProcedure.mutation(async () => {
    try {
      const db = await getDb();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mother_customer_id INT NOT NULL,
          event_code VARCHAR(20) NOT NULL UNIQUE,
          event_name VARCHAR(255) NOT NULL,
          expected_due_date DATE,
          event_date DATE,
          status ENUM('active', 'closed', 'cancelled') DEFAULT 'active' NOT NULL,
          wallet_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
          total_diapers_count INT DEFAULT 0,
          available_diapers_count INT DEFAULT 0,
          target_amount DECIMAL(12, 2),
          total_guests INT DEFAULT 0,
          public_link VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          closed_at TIMESTAMP NULL,
          INDEX idx_mother (mother_customer_id),
          INDEX idx_status (status),
          INDEX idx_code (event_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_gift_packages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_name VARCHAR(120) NOT NULL,
          description TEXT,
          gift_type ENUM('diapers', 'wipes', 'money', 'product') DEFAULT 'diapers',
          quantity_represented INT DEFAULT 1,
          size_label VARCHAR(20),
          price DECIMAL(10, 2) NOT NULL,
          stock_limit INT,
          sold_count INT DEFAULT 0,
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_event (event_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          package_id INT NOT NULL,
          guest_customer_id INT,
          guest_name VARCHAR(255) NOT NULL,
          guest_phone VARCHAR(20),
          guest_email VARCHAR(320),
          message_to_parents TEXT,
          payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
          amount_paid DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50),
          payment_reference VARCHAR(255),
          paid_at TIMESTAMP,
          notification_sent INT DEFAULT 0,
          notification_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_event (event_id),
          INDEX idx_status (payment_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS baby_shower_withdrawals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id INT NOT NULL,
          related_task_id INT,
          withdrawal_type ENUM('diapers', 'wipes', 'money') DEFAULT 'diapers',
          diaper_size VARCHAR(20),
          quantity INT NOT NULL,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          fulfilled_at TIMESTAMP,
          status ENUM('requested', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'requested',
          fulfilled_by INT,
          delivery_method ENUM('pickup', 'delivery') DEFAULT 'pickup',
          notes TEXT,
          INDEX idx_event (event_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      try {
        await db.execute(`ALTER TABLE customers ADD COLUMN expected_due_date DATE`);
      } catch (e) {
      }
      return { success: true, message: "Tabelas do Ch\xE1 de Beb\xEA criadas com sucesso!" };
    } catch (error) {
      console.error("Migration error:", error);
      return { success: false, error: error.message };
    }
  }),
  checkTables: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      const tables = await db.execute(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name LIKE 'baby_shower%'
      `);
      return {
        success: true,
        tables: tables.map((t2) => t2.table_name || t2.TABLE_NAME)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
});

// server/routers-pauses.ts
var import_zod22 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm37 = require("drizzle-orm");

// server/helpers/agent-availability.ts
init_db();
init_schema();
var import_drizzle_orm36 = require("drizzle-orm");
async function removeAgentFromQueuesOnPause(agentId) {
  const db = await getDb();
  if (!db) return;
  await db.update(queueAgents).set({ isActive: 0 }).where((0, import_drizzle_orm36.eq)(queueAgents.agentId, agentId));
  console.log(`[AgentAvailability] Agente ${agentId} removido de todas as filas (pausa iniciada)`);
}

// server/routers-pauses.ts
var pausesRouter = router({
  // Iniciar pausa
  start: protectedProcedure.input(
    import_zod22.z.object({
      pauseType: import_zod22.z.enum(["lunch", "snack", "bathroom", "other"]),
      durationMinutes: import_zod22.z.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [activePause] = await db.select().from(agentPauses).where(
      (0, import_drizzle_orm37.and)(
        (0, import_drizzle_orm37.eq)(agentPauses.agentId, ctx.user.id),
        (0, import_drizzle_orm37.eq)(agentPauses.status, "active")
      )
    ).limit(1);
    if (activePause) {
      throw new Error("Voc\xEA j\xE1 tem uma pausa ativa");
    }
    const [pause] = await db.insert(agentPauses).values({
      agentId: ctx.user.id,
      pauseType: input.pauseType,
      durationMinutes: input.durationMinutes || null,
      startedAt: /* @__PURE__ */ new Date(),
      status: "active"
    }).$returningId();
    await removeAgentFromQueuesOnPause(ctx.user.id);
    return { success: true, pauseId: pause.id };
  }),
  // Finalizar pausa
  end: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [activePause] = await db.select().from(agentPauses).where(
      (0, import_drizzle_orm37.and)(
        (0, import_drizzle_orm37.eq)(agentPauses.agentId, ctx.user.id),
        (0, import_drizzle_orm37.eq)(agentPauses.status, "active")
      )
    ).limit(1);
    if (!activePause) {
      throw new Error("Nenhuma pausa ativa encontrada");
    }
    await db.update(agentPauses).set({
      endedAt: /* @__PURE__ */ new Date(),
      status: "completed"
    }).where((0, import_drizzle_orm37.eq)(agentPauses.id, activePause.id));
    return { success: true };
  }),
  // Obter pausa ativa do agente
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [activePause] = await db.select().from(agentPauses).where(
      (0, import_drizzle_orm37.and)(
        (0, import_drizzle_orm37.eq)(agentPauses.agentId, ctx.user.id),
        (0, import_drizzle_orm37.eq)(agentPauses.status, "active")
      )
    ).limit(1);
    return activePause || null;
  }),
  // Histórico de pausas do agente
  history: protectedProcedure.input(
    import_zod22.z.object({
      limit: import_zod22.z.number().optional().default(20)
    })
  ).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const pauses = await db.select().from(agentPauses).where((0, import_drizzle_orm37.eq)(agentPauses.agentId, ctx.user.id)).orderBy((0, import_drizzle_orm37.desc)(agentPauses.startedAt)).limit(input.limit);
    return pauses;
  })
});

// server/routers-queues.ts
var import_zod23 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm38 = require("drizzle-orm");
function toQueueType(dbQueue, stats, assignedAgents = []) {
  return {
    id: String(dbQueue.id),
    name: dbQueue.name,
    description: dbQueue.description || null,
    channel: dbQueue.channel,
    maxWaitTime: 300,
    // valor padrão de 5 minutos (não existe no schema atual)
    maxSize: 0,
    // ilimitado por padrão (não existe no schema)
    currentSize: stats.waiting + stats.active,
    // conversas atualmente na fila
    waitingCount: stats.waiting,
    assignedAgents,
    routingRules: [],
    // não implementado no schema atual
    isActive: dbQueue.status === "active",
    createdAt: dbQueue.createdAt.toISOString(),
    updatedAt: dbQueue.updatedAt.toISOString()
  };
}
function toQueueTypeBase(dbQueue) {
  return toQueueType(dbQueue, { agentsOnline: 0, waiting: 0, active: 0 }, []);
}
var queuesRouter = router({
  // Listar filas com contadores de conversas aguardando
  // Retorna array de Queue (com waitingCount preenchido)
  listWithCounts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allQueues = await db.select().from(queues).where((0, import_drizzle_orm38.eq)(queues.status, "active"));
    const queuesWithCounts = await Promise.all(
      allQueues.map(async (queue2) => {
        const [waitingResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "open")
          )
        );
        const waiting = Number(waitingResult?.count || 0);
        const agentsRows = await db.select({ agentId: queueAgents.agentId }).from(queueAgents).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(queueAgents.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(queueAgents.isActive, 1)
          )
        );
        const assignedAgents = agentsRows.map((row) => String(row.agentId));
        const [activeResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "assigned")
          )
        );
        const active = Number(activeResult?.count || 0);
        const stats = {
          agentsOnline: assignedAgents.length,
          waiting,
          active
        };
        return toQueueType(queue2, stats, assignedAgents);
      })
    );
    return queuesWithCounts;
  }),
  // Puxar próxima conversa de uma fila
  pullConversation: protectedProcedure.input(
    import_zod23.z.object({
      queueId: import_zod23.z.number()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [nextConversation] = await db.select().from(conversations).where(
      (0, import_drizzle_orm38.and)(
        (0, import_drizzle_orm38.eq)(conversations.queueId, input.queueId),
        (0, import_drizzle_orm38.eq)(conversations.status, "open")
      )
    ).orderBy(conversations.openedAt).limit(1);
    if (!nextConversation) {
      throw new Error("Nenhuma conversa dispon\xEDvel nesta fila");
    }
    await db.update(conversations).set({
      assignedTo: ctx.user.id,
      status: "assigned"
    }).where((0, import_drizzle_orm38.eq)(conversations.id, nextConversation.id));
    return { success: true, conversationId: nextConversation.id };
  }),
  // Listar todas as filas (com estatísticas completas)
  // Retorna array de Queue
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allQueues = await db.select().from(queues).where((0, import_drizzle_orm38.eq)(queues.status, "active"));
    const queuesList = await Promise.all(
      allQueues.map(async (queue2) => {
        const agentsRows = await db.select({ agentId: queueAgents.agentId }).from(queueAgents).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(queueAgents.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(queueAgents.isActive, 1)
          )
        );
        const assignedAgents = agentsRows.map((row) => String(row.agentId));
        const [waitingResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "open")
          )
        );
        const [activeResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, queue2.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "assigned")
          )
        );
        const stats = {
          agentsOnline: assignedAgents.length,
          waiting: Number(waitingResult?.count || 0),
          active: Number(activeResult?.count || 0)
        };
        return toQueueType(queue2, stats, assignedAgents);
      })
    );
    return queuesList;
  }),
  // Criar nova fila (admin only)
  // Input é um subconjunto de Queue (sem campos calculados/auto)
  // Retorna a fila criada (tipo Queue completo)
  create: protectedProcedure.input(
    import_zod23.z.object({
      name: import_zod23.z.string().min(1),
      description: import_zod23.z.string().optional(),
      channel: import_zod23.z.enum(["whatsapp", "instagram", "email", "telegram", "webchat", "facebook"]),
      priority: import_zod23.z.number().default(0),
      color: import_zod23.z.string().default("#3b82f6")
    })
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Apenas administradores podem criar filas");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [newQueue] = await db.insert(queues).values({
      ...input,
      status: "active",
      createdBy: ctx.user.id
    });
    const createdQueue = await db.select().from(queues).where((0, import_drizzle_orm38.eq)(queues.id, newQueue.insertId)).limit(1);
    if (!createdQueue[0]) {
      throw new Error("Falha ao criar fila");
    }
    return toQueueTypeBase(createdQueue[0]);
  }),
  // Atualizar fila (admin only)
  // Input parcial de campos atualizáveis de Queue
  // Retorna a fila atualizada (tipo Queue completo)
  update: protectedProcedure.input(
    import_zod23.z.object({
      id: import_zod23.z.number(),
      name: import_zod23.z.string().min(1).optional(),
      description: import_zod23.z.string().optional(),
      status: import_zod23.z.enum(["active", "inactive"]).optional(),
      priority: import_zod23.z.number().optional(),
      color: import_zod23.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Apenas administradores podem atualizar filas");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...updateData } = input;
    await db.update(queues).set(updateData).where((0, import_drizzle_orm38.eq)(queues.id, id));
    const updatedQueue = await db.select().from(queues).where((0, import_drizzle_orm38.eq)(queues.id, id)).limit(1);
    if (!updatedQueue[0]) {
      throw new Error("Fila n\xE3o encontrada");
    }
    return toQueueTypeBase(updatedQueue[0]);
  }),
  // Agente entrar na fila
  join: protectedProcedure.input(import_zod23.z.object({ queueId: import_zod23.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { agentPauses: agentPauses3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [activePause] = await db.select().from(agentPauses3).where(
      (0, import_drizzle_orm38.and)(
        (0, import_drizzle_orm38.eq)(agentPauses3.agentId, ctx.user.id),
        (0, import_drizzle_orm38.eq)(agentPauses3.status, "active")
      )
    ).limit(1);
    if (activePause) {
      throw new Error(
        "Voc\xEA n\xE3o pode entrar na fila enquanto estiver em pausa. Finalize sua pausa primeiro."
      );
    }
    const existing = await db.select().from(queueAgents).where(
      (0, import_drizzle_orm38.and)(
        (0, import_drizzle_orm38.eq)(queueAgents.queueId, input.queueId),
        (0, import_drizzle_orm38.eq)(queueAgents.agentId, ctx.user.id)
      )
    );
    if (existing.length > 0) {
      await db.update(queueAgents).set({ isActive: 1 }).where((0, import_drizzle_orm38.eq)(queueAgents.id, existing[0].id));
    } else {
      await db.insert(queueAgents).values({
        queueId: input.queueId,
        agentId: ctx.user.id,
        isActive: 1
      });
    }
    return { success: true };
  }),
  // Agente sair da fila
  leave: protectedProcedure.input(import_zod23.z.object({ queueId: import_zod23.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(queueAgents).set({ isActive: 0 }).where(
      (0, import_drizzle_orm38.and)(
        (0, import_drizzle_orm38.eq)(queueAgents.queueId, input.queueId),
        (0, import_drizzle_orm38.eq)(queueAgents.agentId, ctx.user.id)
      )
    );
    return { success: true };
  }),
  // Listar filas que o agente está participando
  // Retorna array de Queue completos
  myQueues: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const myQueueAssociations = await db.select({
      queue: queues,
      isActive: queueAgents.isActive
    }).from(queueAgents).innerJoin(queues, (0, import_drizzle_orm38.eq)(queueAgents.queueId, queues.id)).where((0, import_drizzle_orm38.eq)(queueAgents.agentId, ctx.user.id));
    const queuesList = await Promise.all(
      myQueueAssociations.map(async (item) => {
        const agentsRows = await db.select({ agentId: queueAgents.agentId }).from(queueAgents).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(queueAgents.queueId, item.queue.id),
            (0, import_drizzle_orm38.eq)(queueAgents.isActive, 1)
          )
        );
        const assignedAgents = agentsRows.map((row) => String(row.agentId));
        const [waitingResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, item.queue.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "open")
          )
        );
        const waiting = Number(waitingResult?.count || 0);
        const [activeResult] = await db.select({ count: import_drizzle_orm38.sql`count(*)` }).from(conversations).where(
          (0, import_drizzle_orm38.and)(
            (0, import_drizzle_orm38.eq)(conversations.queueId, item.queue.id),
            (0, import_drizzle_orm38.eq)(conversations.status, "assigned")
          )
        );
        const active = Number(activeResult?.count || 0);
        const stats = {
          agentsOnline: assignedAgents.length,
          waiting,
          active
        };
        return toQueueType(item.queue, stats, assignedAgents);
      })
    );
    return queuesList;
  })
});

// server/routers-quick-replies.ts
var import_zod24 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm39 = require("drizzle-orm");
var quickRepliesRouter = router({
  // Listar todas as respostas rápidas
  list: protectedProcedure.input(
    import_zod24.z.object({
      search: import_zod24.z.string().optional(),
      category: import_zod24.z.string().optional()
    }).optional()
  ).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let query = db.select().from(quickReplies);
    if (input?.search) {
      query = query.where(
        (0, import_drizzle_orm39.or)(
          (0, import_drizzle_orm39.like)(quickReplies.title, `%${input.search}%`),
          (0, import_drizzle_orm39.like)(quickReplies.content, `%${input.search}%`)
        )
      );
    }
    if (input?.category) {
      query = query.where((0, import_drizzle_orm39.eq)(quickReplies.category, input.category));
    }
    const replies = await query.orderBy((0, import_drizzle_orm39.desc)(quickReplies.createdAt));
    return replies;
  }),
  // Listar categorias disponíveis
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const categories = await db.selectDistinct({ category: quickReplies.category }).from(quickReplies).where((0, import_drizzle_orm39.eq)(quickReplies.category, quickReplies.category));
    return categories.map((c) => c.category).filter((c) => c !== null);
  }),
  // Criar nova resposta rápida
  create: protectedProcedure.input(
    import_zod24.z.object({
      title: import_zod24.z.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
      content: import_zod24.z.string().min(1, "Conte\xFAdo \xE9 obrigat\xF3rio"),
      category: import_zod24.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [reply] = await db.insert(quickReplies).values({
      title: input.title,
      content: input.content,
      category: input.category || null,
      createdBy: ctx.user.id,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).$returningId();
    return { success: true, id: reply.id };
  }),
  // Atualizar resposta rápida
  update: protectedProcedure.input(
    import_zod24.z.object({
      id: import_zod24.z.number(),
      title: import_zod24.z.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
      content: import_zod24.z.string().min(1, "Conte\xFAdo \xE9 obrigat\xF3rio"),
      category: import_zod24.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(quickReplies).set({
      title: input.title,
      content: input.content,
      category: input.category || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm39.eq)(quickReplies.id, input.id));
    return { success: true };
  }),
  // Deletar resposta rápida
  delete: protectedProcedure.input(import_zod24.z.object({ id: import_zod24.z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(quickReplies).where((0, import_drizzle_orm39.eq)(quickReplies.id, input.id));
    return { success: true };
  })
});

// server/routers-reminders.ts
var import_zod25 = require("zod");
var import_drizzle_orm40 = require("drizzle-orm");
init_schema();
init_trpc();
init_db();
var import_date_fns = require("date-fns");
var remindersRouter = router({
  /**
   * Buscar lembretes pendentes para o atendente logado
   * Retorna agrupados por cliente, ordenados por prioridade
   */
  getPending: protectedProcedure.input(
    import_zod25.z.object({
      limit: import_zod25.z.number().default(10).optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const agentId = ctx.user.id;
    const limit = input?.limit || 10;
    const now = /* @__PURE__ */ new Date();
    const today = (0, import_date_fns.startOfDay)(now);
    const remindersList = await db.select({
      reminder: reminders,
      customer: customers
    }).from(reminders).innerJoin(customers, (0, import_drizzle_orm40.eq)(reminders.customerId, customers.id)).where(
      (0, import_drizzle_orm40.and)(
        (0, import_drizzle_orm40.eq)(reminders.agentId, agentId),
        (0, import_drizzle_orm40.or)(
          // Pendentes normais com eventDate <= hoje
          (0, import_drizzle_orm40.and)(
            (0, import_drizzle_orm40.eq)(reminders.status, "pendente"),
            (0, import_drizzle_orm40.lte)(reminders.eventDate, today)
          ),
          // Adiados que chegaram na data
          (0, import_drizzle_orm40.and)(
            (0, import_drizzle_orm40.eq)(reminders.status, "adiado"),
            (0, import_drizzle_orm40.lte)(reminders.snoozedUntil, now)
          )
        )
      )
    ).orderBy(
      // Prioridade: critica > alta > media > baixa
      import_drizzle_orm40.sql`CASE ${reminders.priority}
            WHEN 'critica' THEN 4
            WHEN 'alta' THEN 3
            WHEN 'media' THEN 2
            WHEN 'baixa' THEN 1
            ELSE 0 END DESC`,
      // Eventos mais urgentes primeiro
      reminders.eventDate,
      // Desempate por nome do cliente
      customers.name
    ).limit(limit);
    const grouped = /* @__PURE__ */ new Map();
    for (const row of remindersList) {
      const customerId = row.customer.id;
      if (!grouped.has(customerId)) {
        grouped.set(customerId, {
          customerId: row.customer.id,
          customerName: row.customer.name,
          customerPhone: row.customer.phone,
          reminders: []
        });
      }
      grouped.get(customerId).reminders.push({
        id: row.reminder.id,
        type: row.reminder.type,
        priority: row.reminder.priority,
        title: row.reminder.title,
        description: row.reminder.description,
        eventDate: row.reminder.eventDate.toISOString(),
        status: row.reminder.status,
        snoozedUntil: row.reminder.snoozedUntil?.toISOString(),
        metadata: row.reminder.metadata
      });
    }
    return Array.from(grouped.values());
  }),
  /**
   * Adiar lembrete (snooze)
   */
  snooze: protectedProcedure.input(
    import_zod25.z.object({
      id: import_zod25.z.number(),
      snoozeOption: import_zod25.z.enum(["1dia", "3dias", "1semana", "custom"]).optional(),
      customDate: import_zod25.z.string().optional()
      // ISO date string
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const agentId = ctx.user.id;
    const [reminder] = await db.select().from(reminders).where((0, import_drizzle_orm40.and)((0, import_drizzle_orm40.eq)(reminders.id, input.id), (0, import_drizzle_orm40.eq)(reminders.agentId, agentId))).limit(1);
    if (!reminder) {
      throw new Error("Lembrete n\xE3o encontrado");
    }
    let snoozedUntil;
    if (input.customDate) {
      snoozedUntil = new Date(input.customDate);
    } else {
      const baseDate = /* @__PURE__ */ new Date();
      switch (input.snoozeOption) {
        case "1dia":
          snoozedUntil = (0, import_date_fns.addDays)(baseDate, 1);
          break;
        case "3dias":
          snoozedUntil = (0, import_date_fns.addDays)(baseDate, 3);
          break;
        case "1semana":
          snoozedUntil = (0, import_date_fns.addDays)(baseDate, 7);
          break;
        default:
          snoozedUntil = (0, import_date_fns.addDays)(baseDate, 1);
      }
    }
    await db.update(reminders).set({
      status: "adiado",
      snoozedUntil,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm40.eq)(reminders.id, input.id));
    return { success: true, snoozedUntil };
  }),
  /**
   * Dispensar lembrete (marcar como lido)
   */
  dismiss: protectedProcedure.input(
    import_zod25.z.object({
      id: import_zod25.z.number()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const agentId = ctx.user.id;
    const [reminder] = await db.select().from(reminders).where((0, import_drizzle_orm40.and)((0, import_drizzle_orm40.eq)(reminders.id, input.id), (0, import_drizzle_orm40.eq)(reminders.agentId, agentId))).limit(1);
    if (!reminder) {
      throw new Error("Lembrete n\xE3o encontrado");
    }
    await db.update(reminders).set({
      status: "dispensado",
      dismissedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm40.eq)(reminders.id, input.id));
    return { success: true };
  }),
  /**
   * Criar lembrete manual (admin ou atendente)
   */
  create: protectedProcedure.input(
    import_zod25.z.object({
      customerId: import_zod25.z.number(),
      type: import_zod25.z.enum(["aniversario", "medicamento_vencendo", "follow_up", "renovacao", "custom"]),
      title: import_zod25.z.string().min(1).max(255),
      description: import_zod25.z.string().optional(),
      eventDate: import_zod25.z.string(),
      // ISO date
      daysBefore: import_zod25.z.number().default(0).optional(),
      metadata: import_zod25.z.record(import_zod25.z.any()).optional(),
      assignedAgentId: import_zod25.z.number().optional()
      // Admin pode atribuir a outro atendente
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const agentId = input.assignedAgentId || ctx.user.id;
    const [customer2] = await db.select().from(customers).where((0, import_drizzle_orm40.eq)(customers.id, input.customerId)).limit(1);
    if (!customer2) {
      throw new Error("Cliente n\xE3o encontrado");
    }
    const priority = calculatePriority(input.type, new Date(input.eventDate));
    const [result] = await db.insert(reminders).values({
      agentId,
      customerId: input.customerId,
      type: input.type,
      priority,
      title: input.title,
      description: input.description,
      eventDate: new Date(input.eventDate),
      daysBefore: input.daysBefore,
      metadata: input.metadata,
      status: "pendente"
    }).$returningId();
    return { success: true, id: result.id };
  }),
  /**
   * Listar todos os lembretes (admin)
   */
  listAll: adminProcedure.input(
    import_zod25.z.object({
      page: import_zod25.z.number().default(1),
      pageSize: import_zod25.z.number().default(20),
      status: import_zod25.z.enum(["pendente", "dispensado", "adiado", "expirado"]).optional(),
      type: import_zod25.z.enum(["aniversario", "medicamento_vencendo", "follow_up", "renovacao", "custom"]).optional(),
      agentId: import_zod25.z.number().optional(),
      customerId: import_zod25.z.number().optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const page = input?.page || 1;
    const pageSize = input?.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (input?.status) conditions.push((0, import_drizzle_orm40.eq)(reminders.status, input.status));
    if (input?.type) conditions.push((0, import_drizzle_orm40.eq)(reminders.type, input.type));
    if (input?.agentId) conditions.push((0, import_drizzle_orm40.eq)(reminders.agentId, input.agentId));
    if (input?.customerId) conditions.push((0, import_drizzle_orm40.eq)(reminders.customerId, input.customerId));
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm40.and)(...conditions) : void 0;
    const [totalResult] = await db.select({ count: import_drizzle_orm40.sql`count(*)` }).from(reminders).where(whereClause);
    const total = Number(totalResult.count);
    const totalPages = Math.ceil(total / pageSize);
    const results = await db.select({
      reminder: reminders,
      customer: customers,
      agent: users
    }).from(reminders).leftJoin(customers, (0, import_drizzle_orm40.eq)(reminders.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm40.eq)(reminders.agentId, users.id)).where(whereClause).orderBy((0, import_drizzle_orm40.desc)(reminders.createdAt)).limit(pageSize).offset(offset);
    return {
      reminders: results,
      pagination: { total, totalPages, currentPage: page, pageSize }
    };
  }),
  /**
   * Estatísticas de lembretes
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const agentId = ctx.user.id;
    const now = /* @__PURE__ */ new Date();
    const today = (0, import_date_fns.startOfDay)(now);
    const [pendingCount] = await db.select({ count: import_drizzle_orm40.sql`count(*)` }).from(reminders).where(
      (0, import_drizzle_orm40.and)(
        (0, import_drizzle_orm40.eq)(reminders.agentId, agentId),
        (0, import_drizzle_orm40.eq)(reminders.status, "pendente"),
        (0, import_drizzle_orm40.lte)(reminders.eventDate, today)
      )
    );
    const [snoozedCount] = await db.select({ count: import_drizzle_orm40.sql`count(*)` }).from(reminders).where(
      (0, import_drizzle_orm40.and)(
        (0, import_drizzle_orm40.eq)(reminders.agentId, agentId),
        (0, import_drizzle_orm40.eq)(reminders.status, "adiado"),
        (0, import_drizzle_orm40.lte)(reminders.snoozedUntil, now)
      )
    );
    const [criticalCount] = await db.select({ count: import_drizzle_orm40.sql`count(*)` }).from(reminders).where(
      (0, import_drizzle_orm40.and)(
        (0, import_drizzle_orm40.eq)(reminders.agentId, agentId),
        (0, import_drizzle_orm40.eq)(reminders.priority, "critica"),
        (0, import_drizzle_orm40.or)(
          (0, import_drizzle_orm40.and)((0, import_drizzle_orm40.eq)(reminders.status, "pendente"), (0, import_drizzle_orm40.lte)(reminders.eventDate, today)),
          (0, import_drizzle_orm40.and)((0, import_drizzle_orm40.eq)(reminders.status, "adiado"), (0, import_drizzle_orm40.lte)(reminders.snoozedUntil, now))
        )
      )
    );
    return {
      pending: Number(pendingCount.count),
      snoozed: Number(snoozedCount.count),
      critical: Number(criticalCount.count)
    };
  })
});
function calculatePriority(type, eventDate) {
  const now = /* @__PURE__ */ new Date();
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
  switch (type) {
    case "aniversario":
      if (diffDays <= 0) return "critica";
      if (diffDays <= 7) return "alta";
      return "media";
    case "medicamento_vencendo":
      if (diffDays <= 0) return "critica";
      if (diffDays <= 3) return "critica";
      if (diffDays <= 7) return "alta";
      return "media";
    case "follow_up":
      if (diffDays <= 0) return "alta";
      if (diffDays <= 3) return "alta";
      return "media";
    case "renovacao":
      if (diffDays <= 0) return "alta";
      if (diffDays <= 7) return "alta";
      return "media";
    default:
      return "baixa";
  }
}

// server/routers-survey.ts
init_trpc();
var import_zod26 = require("zod");
init_db();
init_schema();
var import_drizzle_orm41 = require("drizzle-orm");
var surveyRouter = router({
  // List all survey responses
  list: protectedProcedure.input(
    import_zod26.z.object({
      limit: import_zod26.z.number().default(50),
      offset: import_zod26.z.number().default(0),
      minRating: import_zod26.z.number().optional(),
      maxRating: import_zod26.z.number().optional()
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const limit = input?.limit || 50;
    const offset = input?.offset || 0;
    const conditions = [];
    if (input?.minRating !== void 0) {
      conditions.push(import_drizzle_orm41.sql`${surveyResponses.rating} >= ${input.minRating}`);
    }
    if (input?.maxRating !== void 0) {
      conditions.push(import_drizzle_orm41.sql`${surveyResponses.rating} <= ${input.maxRating}`);
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm41.and)(...conditions) : void 0;
    let query = db.select({
      survey: surveyResponses,
      customer: customers,
      agent: users,
      conversation: conversations
    }).from(surveyResponses).leftJoin(customers, (0, import_drizzle_orm41.eq)(surveyResponses.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm41.eq)(surveyResponses.agentId, users.id)).leftJoin(
      conversations,
      (0, import_drizzle_orm41.eq)(surveyResponses.conversationId, conversations.id)
    );
    if (whereClause) {
      query = query.where(whereClause);
    }
    const results = await query.orderBy((0, import_drizzle_orm41.desc)(surveyResponses.createdAt)).limit(limit).offset(offset);
    return results;
  }),
  // Get survey statistics
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [total] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses);
    const [avgRating] = await db.select({ avg: import_drizzle_orm41.sql`avg(rating)` }).from(surveyResponses);
    const [rating1] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses).where((0, import_drizzle_orm41.eq)(surveyResponses.rating, 1));
    const [rating2] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses).where((0, import_drizzle_orm41.eq)(surveyResponses.rating, 2));
    const [rating3] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses).where((0, import_drizzle_orm41.eq)(surveyResponses.rating, 3));
    const [rating4] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses).where((0, import_drizzle_orm41.eq)(surveyResponses.rating, 4));
    const [rating5] = await db.select({ count: import_drizzle_orm41.sql`count(*)` }).from(surveyResponses).where((0, import_drizzle_orm41.eq)(surveyResponses.rating, 5));
    return {
      totalResponses: Number(total?.count) || 0,
      averageRating: Number(avgRating?.avg) || 0,
      ratingDistribution: {
        rating1: Number(rating1?.count) || 0,
        rating2: Number(rating2?.count) || 0,
        rating3: Number(rating3?.count) || 0,
        rating4: Number(rating4?.count) || 0,
        rating5: Number(rating5?.count) || 0
      }
    };
  }),
  // Get a single survey response by ID
  getById: protectedProcedure.input(import_zod26.z.object({ id: import_zod26.z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.select({
      survey: surveyResponses,
      customer: customers,
      agent: users,
      conversation: conversations
    }).from(surveyResponses).leftJoin(customers, (0, import_drizzle_orm41.eq)(surveyResponses.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm41.eq)(surveyResponses.agentId, users.id)).leftJoin(
      conversations,
      (0, import_drizzle_orm41.eq)(surveyResponses.conversationId, conversations.id)
    ).where((0, import_drizzle_orm41.eq)(surveyResponses.id, input.id)).limit(1);
    return result;
  })
});

// server/routers-system.ts
init_trpc();
init_db();
var import_drizzle_orm42 = require("drizzle-orm");
var systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  }),
  debugTime: publicProcedure.query(() => {
    const now = /* @__PURE__ */ new Date();
    return {
      nowISO: now.toISOString(),
      nowUTC: now.getTime(),
      timezoneOffset: now.getTimezoneOffset(),
      timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }),
  closeAll: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(
      import_drizzle_orm42.sql`UPDATE conversations SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE status IN ('open', 'assigned')`
    );
    return { closed: result.affectedRows || 0 };
  }),
  // ✅ Endpoint temporário para aplicar migration
  migrate: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      await db.execute(import_drizzle_orm42.sql`ALTER TABLE conversation_messages ADD COLUMN reply_to_external_id VARCHAR(255) NULL`);
      console.log("\u2705 reply_to_external_id added");
    } catch (e) {
      if (!e.message?.includes("Duplicate column") && !e.message?.includes("exists")) {
        throw e;
      }
      console.log("\u2139\uFE0F reply_to_external_id j\xE1 existe");
    }
    try {
      await db.execute(import_drizzle_orm42.sql`ALTER TABLE conversation_messages ADD COLUMN reaction VARCHAR(10) NULL`);
      console.log("\u2705 reaction added");
    } catch (e) {
      if (!e.message?.includes("Duplicate column") && !e.message?.includes("exists")) {
        throw e;
      }
      console.log("\u2139\uFE0F reaction j\xE1 existe");
    }
    return { success: true, message: "Migration applied: reply + reaction columns" };
  })
});

// server/routers-tags.ts
var import_zod27 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm43 = require("drizzle-orm");
function dbErrCode2(e) {
  return e?.cause?.code || e?.code;
}
function isMissingTable2(e) {
  const code = dbErrCode2(e);
  const msg = String(e?.cause?.sqlMessage || e?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.includes("doesn't exist");
}
async function safe2(fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable2(e)) return fallback;
    throw e;
  }
}
var tagsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(tags).orderBy(tags.name);
  }),
  create: protectedProcedure.input(import_zod27.z.object({ name: import_zod27.z.string().min(1), color: import_zod27.z.string().optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(tags).where((0, import_drizzle_orm43.eq)(tags.name, input.name)).limit(1);
    if (existing?.[0]) return existing[0];
    const inserted = await db.insert(tags).values({
      name: input.name,
      color: input.color || "#3b82f6",
      icon: null,
      description: null,
      createdBy: null,
      createdAt: /* @__PURE__ */ new Date()
    }).$returningId();
    const id = inserted?.[0]?.id;
    const created = await db.select().from(tags).where((0, import_drizzle_orm43.eq)(tags.id, id)).limit(1);
    return created?.[0];
  }),
  addToConversation: protectedProcedure.input(import_zod27.z.object({ conversationId: import_zod27.z.string(), tagId: import_zod27.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await safe2(
      async () => {
        await db.insert(conversationTags).values({
          conversationId: input.conversationId,
          tagId: input.tagId,
          createdAt: /* @__PURE__ */ new Date()
        });
        return { success: true };
      },
      { success: true }
    );
  }),
  removeFromConversation: protectedProcedure.input(import_zod27.z.object({ conversationId: import_zod27.z.string(), tagId: import_zod27.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await safe2(
      async () => {
        await db.delete(conversationTags).where(
          (0, import_drizzle_orm43.and)(
            (0, import_drizzle_orm43.eq)(conversationTags.conversationId, input.conversationId),
            (0, import_drizzle_orm43.eq)(conversationTags.tagId, input.tagId)
          )
        );
        return { success: true };
      },
      { success: true }
    );
  }),
  addToTicket: protectedProcedure.input(import_zod27.z.object({ ticketId: import_zod27.z.number(), tagId: import_zod27.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await safe2(
      async () => {
        await db.insert(ticketTags).values({
          ticketId: input.ticketId,
          tagId: input.tagId,
          createdAt: /* @__PURE__ */ new Date()
        });
        return { success: true };
      },
      { success: true }
    );
  }),
  removeFromTicket: protectedProcedure.input(import_zod27.z.object({ ticketId: import_zod27.z.number(), tagId: import_zod27.z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await safe2(
      async () => {
        await db.delete(ticketTags).where(
          (0, import_drizzle_orm43.and)(
            (0, import_drizzle_orm43.eq)(ticketTags.ticketId, input.ticketId),
            (0, import_drizzle_orm43.eq)(ticketTags.tagId, input.tagId)
          )
        );
        return { success: true };
      },
      { success: true }
    );
  }),
  getTagStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await safe2(async () => {
      const rows = await db.select({
        tagId: conversationTags.tagId,
        conversationCount: import_drizzle_orm43.sql`COUNT(DISTINCT ${conversationTags.conversationId})`
      }).from(conversationTags).groupBy(conversationTags.tagId).orderBy((0, import_drizzle_orm43.desc)(import_drizzle_orm43.sql`conversationCount`));
      return rows;
    }, []);
  }),
  getConversationTags: protectedProcedure.input(import_zod27.z.object({ conversationId: import_zod27.z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return await safe2(async () => {
      const rows = await db.select({
        tag: tags
      }).from(conversationTags).innerJoin(tags, (0, import_drizzle_orm43.eq)(tags.id, conversationTags.tagId)).where((0, import_drizzle_orm43.eq)(conversationTags.conversationId, input.conversationId)).orderBy(tags.name);
      return rows.map((r) => r.tag);
    }, []);
  })
});

// server/routers-telemetry.ts
var import_zod28 = require("zod");
init_trpc();
init_db();
init_schema();
var telemetryRouter = router({
  ingest: protectedProcedure.input(
    import_zod28.z.object({
      events: import_zod28.z.array(
        import_zod28.z.object({
          page: import_zod28.z.string().max(160).optional(),
          eventName: import_zod28.z.string().max(120),
          payload: import_zod28.z.unknown().optional(),
          occurredAt: import_zod28.z.string().datetime().optional()
        })
      ).min(1).max(100)
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = /* @__PURE__ */ new Date();
    const rows = input.events.map((e) => ({
      userId: ctx.user.id,
      page: e.page ?? null,
      eventName: e.eventName,
      payloadJson: e.payload ? JSON.stringify(e.payload) : null,
      occurredAt: e.occurredAt ? new Date(e.occurredAt) : now,
      createdAt: now
    }));
    await db.insert(frontendTelemetryEvents).values(rows);
    return { success: true };
  })
});

// server/routers-test.ts
init_trpc();
var import_zod29 = require("zod");
init_db();
init_schema();
var import_drizzle_orm44 = require("drizzle-orm");
var testRouter = router({
  echo: publicProcedure.input(import_zod29.z.object({ msg: import_zod29.z.string() })).mutation(({ input }) => {
    return { received: input.msg, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  }),
  // Diagnóstico: retorna contagens de usuários e employees
  counts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [usersCount] = await db.select({ count: import_drizzle_orm44.sql`COUNT(*)` }).from(users);
    const [employeesCount] = await db.select({ count: import_drizzle_orm44.sql`COUNT(*)` }).from(employees);
    const [rows] = await db.execute(import_drizzle_orm44.sql`
      SELECT u.id, u.name, u.role, e.status as empStatus
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      ORDER BY u.id DESC
      LIMIT 5
    `);
    return {
      totalUsers: Number(usersCount.count),
      totalEmployees: Number(employeesCount.count),
      sampleRows: rows
    };
  })
});

// server/routers-approvals.ts
init_trpc();
init_schema();
var import_drizzle_orm45 = require("drizzle-orm");
init_db();
var import_zod30 = require("zod");
var approvalsRouter = router({
  // List approvals (filtered by status)
  list: protectedProcedure.input(
    import_zod30.z.object({
      status: import_zod30.z.enum(["pending", "approved", "rejected"]).optional(),
      entityType: import_zod30.z.string().optional(),
      limit: import_zod30.z.number().min(1).max(100).default(20),
      offset: import_zod30.z.number().min(0).default(0)
    })
  ).query(async ({ input }) => {
    const db = getDb();
    let query = db.select().from(approvals);
    if (input.status) {
      query = query.where((0, import_drizzle_orm45.eq)(approvals.status, input.status));
    }
    if (input.entityType) {
      query = query.where((0, import_drizzle_orm45.eq)(approvals.entityType, input.entityType));
    }
    const results = await query.limit(input.limit).offset(input.offset);
    return results;
  }),
  // Request approval (create new approval record)
  request: protectedProcedure.input(
    import_zod30.z.object({
      entityType: import_zod30.z.string().min(1),
      entityId: import_zod30.z.number().int().positive(),
      reason: import_zod30.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const [newApproval] = await db.insert(approvals).values({
      entityType: input.entityType,
      entityId: input.entityId,
      requestedBy: ctx.user.id,
      reason: input.reason
    }).$returningId();
    return { id: newApproval.insertId, message: "Approval request created" };
  }),
  // Approve (pharmacist or admin)
  approve: protectedProcedure.input(
    import_zod30.z.object({
      id: import_zod30.z.number().int().positive(),
      reason: import_zod30.z.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    if (ctx.user.role !== "admin") {
      return { error: "Unauthorized: Only admins can approve" };
    }
    await db.update(approvals).set({
      status: "approved",
      approvedBy: ctx.user.id,
      reason: input.reason,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm45.eq)(approvals.id, input.id));
    return { message: "Approval granted" };
  }),
  // Reject
  reject: protectedProcedure.input(
    import_zod30.z.object({
      id: import_zod30.z.number().int().positive(),
      reason: import_zod30.z.string().min(1)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    if (ctx.user.role !== "admin") {
      return { error: "Unauthorized: Only admins can reject" };
    }
    await db.update(approvals).set({
      status: "rejected",
      approvedBy: ctx.user.id,
      reason: input.reason,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm45.eq)(approvals.id, input.id));
    return { message: "Approval rejected" };
  })
});

// server/routers-internal-messages.ts
var import_zod31 = require("zod");
init_trpc();
init_db();
var internalMessagesRouter = router({
  /**
   * Lista mensagens internas de uma conversa.
   * Admin vê todas. Agente vê apenas as dirigidas a ele.
   */
  list: protectedProcedure.input(import_zod31.z.object({
    conversation_id: import_zod31.z.number()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { conversation_id } = input;
    const userId = ctx.user?.id;
    const isAdmin2 = ctx.user?.role === "admin";
    try {
      const [rows] = await db.execute(
        `SELECT 
            im.id,
            im.conversation_id,
            im.sender_id,
            im.recipient_id,
            im.content,
            im.read_at,
            im.created_at,
            sender.name as sender_name
          FROM internal_messages im
          LEFT JOIN users sender ON im.sender_id = sender.id
          WHERE im.conversation_id = ?
          ORDER BY im.created_at ASC`,
        [conversation_id]
      );
      if (!Array.isArray(rows)) return [];
      const filtered = isAdmin2 ? rows : rows.filter((r) => String(r.recipient_id) === String(userId));
      return filtered.map((r) => ({
        id: String(r.id),
        conversationId: String(r.conversation_id),
        senderId: String(r.sender_id),
        recipientId: String(r.recipient_id),
        senderName: r.sender_name || "Admin",
        content: r.content,
        readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString()
      }));
    } catch (err) {
      console.error("[internalMessages.list] Error:", err.message);
      return [];
    }
  }),
  /**
   * Envia uma mensagem interna (sussurro) do Admin para o agente da conversa.
   * Apenas Admin pode enviar. Agente não precisa dessa funcionalidade.
   */
  send: protectedProcedure.input(import_zod31.z.object({
    conversation_id: import_zod31.z.number(),
    recipient_id: import_zod31.z.number(),
    content: import_zod31.z.string().min(1).max(2e3)
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const userId = ctx.user?.id;
    if (!userId) throw new Error("Usu\xE1rio n\xE3o autenticado");
    if (ctx.user?.role !== "admin") {
      throw new Error("Apenas administradores podem enviar mensagens internas");
    }
    const { conversation_id, recipient_id, content: content2 } = input;
    try {
      const [result] = await db.execute(
        `INSERT INTO internal_messages (conversation_id, sender_id, recipient_id, content)
           VALUES (?, ?, ?, ?)`,
        [conversation_id, Number(userId), recipient_id, content2]
      );
      const insertId = result?.insertId;
      return {
        id: String(insertId),
        conversationId: String(conversation_id),
        senderId: String(userId),
        recipientId: String(recipient_id),
        content: content2,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      console.error("[internalMessages.send] Error:", err.message);
      throw new Error("Erro ao enviar mensagem interna");
    }
  }),
  /**
   * Marca mensagens internas como lidas pelo agente.
   */
  markRead: protectedProcedure.input(import_zod31.z.object({
    conversation_id: import_zod31.z.number()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const userId = ctx.user?.id;
    if (!userId) throw new Error("Usu\xE1rio n\xE3o autenticado");
    const { conversation_id } = input;
    try {
      await db.execute(
        `UPDATE internal_messages 
           SET read_at = NOW() 
           WHERE conversation_id = ? 
             AND recipient_id = ? 
             AND read_at IS NULL`,
        [conversation_id, Number(userId)]
      );
      return { success: true };
    } catch (err) {
      console.error("[internalMessages.markRead] Error:", err.message);
      throw new Error("Erro ao marcar como lido");
    }
  })
});

// server/routers-tickets.ts
var import_zod32 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm46 = require("drizzle-orm");
function mapStatusToTicket(status) {
  switch (status) {
    case "open":
      return "open";
    case "assigned":
      return "in_progress";
    case "closed":
      return "resolved";
    default:
      return "open";
  }
}
function generateTicketNumber(conversationId2) {
  return `TKT-${conversationId2.toString().padStart(6, "0")}`;
}
var ticketsRouter = router({
  // Listar tickets (baseado em conversas reais)
  list: protectedProcedure.input(
    import_zod32.z.object({
      page: import_zod32.z.number().min(1).default(1),
      pageSize: import_zod32.z.number().min(1).max(100).default(20),
      search: import_zod32.z.string().optional(),
      status: import_zod32.z.string().optional(),
      priority: import_zod32.z.string().optional(),
      assignedTo: import_zod32.z.number().optional(),
      customerId: import_zod32.z.number().optional(),
      sortBy: import_zod32.z.enum(["createdAt", "updatedAt", "priority", "status"]).default("createdAt"),
      sortOrder: import_zod32.z.enum(["asc", "desc"]).default("desc")
    }).optional()
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { page, pageSize, search, status, priority, assignedTo, customerId } = input || {};
    const offset = ((page || 1) - 1) * (pageSize || 20);
    const conditions = [];
    const activeStatuses = ["open", "assigned"];
    if (search) {
      conditions.push(
        (0, import_drizzle_orm46.or)(
          (0, import_drizzle_orm46.like)(conversations.customerName, `%${search}%`),
          (0, import_drizzle_orm46.like)(conversations.customerPhone, `%${search}%`)
        )
      );
    }
    if (status) {
      const conversationStatus = status === "in_progress" ? "assigned" : status === "open" ? "open" : null;
      if (conversationStatus && activeStatuses.includes(conversationStatus)) {
        conditions.push((0, import_drizzle_orm46.eq)(conversations.status, conversationStatus));
      } else {
        conditions.push((0, import_drizzle_orm46.eq)(conversations.status, "closed"));
      }
    } else {
      conditions.push(inArray(conversations.status, activeStatuses));
    }
    if (assignedTo !== void 0) {
      conditions.push((0, import_drizzle_orm46.eq)(conversations.assignedTo, assignedTo));
    }
    if (customerId !== void 0) {
      conditions.push((0, import_drizzle_orm46.eq)(conversations.customerId, customerId));
    }
    const whereClause = conditions.length > 0 ? (0, import_drizzle_orm46.and)(...conditions) : void 0;
    const countResult = await db.select({ count: import_drizzle_orm46.sql`COUNT(*)` }).from(conversations).where(whereClause).limit(1);
    const total = Number(countResult[0].count) || 0;
    const results = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      lastMessageAt: conversations.lastMessageAt,
      closedAt: conversations.closedAt,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email
      },
      assignedAgent: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      // Buscar última mensagem como subject
      lastMessage: import_drizzle_orm46.sql`(
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = ${conversations.id} 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          )`.as("lastMessage")
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm46.eq)(conversations.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm46.eq)(conversations.assignedTo, users.id)).where(whereClause).orderBy((0, import_drizzle_orm46.desc)(conversations.lastMessageAt)).limit(pageSize || 20).offset(offset);
    const tickets4 = results.map((row) => ({
      id: row.id,
      ticketNumber: generateTicketNumber(row.id),
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      subject: row.lastMessage || "Sem mensagem",
      description: row.lastMessage || "",
      status: mapStatusToTicket(row.status),
      priority: "medium",
      // padrão, já que conversations não tem priority
      category: null,
      channel: row.channel,
      assignedTo: row.assignedTo,
      slaDeadline: null,
      resolvedAt: row.status === "closed" ? row.closedAt : null,
      closedAt: row.closedAt,
      timeSpentMinutes: null,
      createdBy: null,
      createdAt: row.openedAt,
      updatedAt: row.lastMessageAt,
      customer: row.customer,
      assignedAgent: row.assignedAgent
    }));
    return {
      data: tickets4,
      pagination: {
        page: page || 1,
        pageSize: pageSize || 20,
        total,
        totalPages: Math.ceil(total / (pageSize || 20))
      }
    };
  }),
  // Buscar ticket por ID (conversa real)
  getById: protectedProcedure.input(import_zod32.z.object({ id: import_zod32.z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.select({
      id: conversations.id,
      customerId: conversations.customerId,
      customerName: conversations.customerName,
      customerPhone: conversations.customerPhone,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      openedAt: conversations.openedAt,
      lastMessageAt: conversations.lastMessageAt,
      closedAt: conversations.closedAt,
      unreadCount: conversations.unreadCount,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email
      },
      assignedAgent: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    }).from(conversations).leftJoin(customers, (0, import_drizzle_orm46.eq)(conversations.customerId, customers.id)).leftJoin(users, (0, import_drizzle_orm46.eq)(conversations.assignedTo, users.id)).where(
      (0, import_drizzle_orm46.and)(
        (0, import_drizzle_orm46.eq)(conversations.id, input.id),
        (0, import_drizzle_orm46.eq)(conversations.assignedTo, ctx.user.id)
        // Ensure the ticket belongs to the current user
      )
    ).limit(1);
    if (!result || result.length === 0) {
      throw new Error("Ticket not found or access denied");
    }
    const row = result[0];
    const lastMessage = await db.select({ content: conversationMessages.content }).from(conversationMessages).where((0, import_drizzle_orm46.eq)(conversationMessages.conversationId, input.id)).orderBy((0, import_drizzle_orm46.desc)(conversationMessages.createdAt)).limit(1);
    return {
      id: row.id,
      ticketNumber: generateTicketNumber(row.id),
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      subject: lastMessage[0]?.content || "Sem mensagem",
      description: lastMessage[0]?.content || "",
      status: mapStatusToTicket(row.status),
      priority: "medium",
      category: null,
      channel: row.channel,
      assignedTo: row.assignedTo,
      slaDeadline: null,
      resolvedAt: row.status === "closed" ? row.closedAt : null,
      closedAt: row.closedAt,
      timeSpentMinutes: null,
      createdBy: null,
      createdAt: row.openedAt,
      updatedAt: row.lastMessageAt,
      customer: row.customer,
      assignedAgent: row.assignedAgent
    };
  }),
  // Estatísticas baseadas em conversas reais
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const statusCounts = await db.select({
      status: conversations.status,
      count: import_drizzle_orm46.sql`COUNT(*)`
    }).from(conversations).groupBy(conversations.status);
    const totalResult = await db.select({ count: import_drizzle_orm46.sql`COUNT(*)` }).from(conversations).limit(1);
    const total = Number(totalResult[0].count) || 0;
    const openResult = await db.select({ count: import_drizzle_orm46.sql`COUNT(*)` }).from(conversations).where(import_drizzle_orm46.sql`status IN ('open', 'assigned')`).limit(1);
    const open = Number(openResult[0].count) || 0;
    const inProgressResult = await db.select({ count: import_drizzle_orm46.sql`COUNT(*)` }).from(conversations).where((0, import_drizzle_orm46.eq)(conversations.status, "assigned")).limit(1);
    const inProgress = Number(inProgressResult[0].count) || 0;
    const pending = 0;
    const resolvedResult = await db.select({ count: import_drizzle_orm46.sql`COUNT(*)` }).from(conversations).where((0, import_drizzle_orm46.eq)(conversations.status, "closed")).limit(1);
    const resolved = Number(resolvedResult[0].count) || 0;
    return {
      total,
      open,
      inProgress,
      pending,
      resolved,
      byStatus: statusCounts.map((s) => ({
        status: mapStatusToTicket(s.status),
        count: Number(s.count)
      })),
      byPriority: []
      // conversations não tem priority
    };
  }),
  // Placeholder: criar ticket (não aplicável, tickets vêm de conversas)
  create: protectedProcedure.input(
    import_zod32.z.object({
      customerId: import_zod32.z.number().optional(),
      subject: import_zod32.z.string().min(1),
      description: import_zod32.z.string().optional(),
      priority: import_zod32.z.enum(["low", "medium", "high", "critical"]).default("medium"),
      category: import_zod32.z.string().optional(),
      channel: import_zod32.z.string().optional(),
      assignedTo: import_zod32.z.number().optional(),
      slaDeadline: import_zod32.z.date().optional()
    })
  ).mutation(async ({ input }) => {
    throw new Error("Tickets s\xE3o criados automaticamente a partir de conversas reais");
  }),
  // Placeholder: atualizar ticket
  update: protectedProcedure.input(
    import_zod32.z.object({
      id: import_zod32.z.number(),
      status: import_zod32.z.enum(["open", "in_progress", "pending", "resolved", "closed"]).optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conversationStatus = input.status === "in_progress" ? "assigned" : input.status === "resolved" ? "closed" : input.status === "open" ? "open" : void 0;
    if (conversationStatus) {
      await db.update(conversations).set({ status: conversationStatus, updatedAt: import_drizzle_orm46.sql`NOW()` }).where((0, import_drizzle_orm46.eq)(conversations.id, input.id));
    }
    return { success: true };
  }),
  // Placeholder: deletar ticket
  delete: protectedProcedure.input(import_zod32.z.object({ id: import_zod32.z.number() })).mutation(async ({ input }) => {
    throw new Error("Use update status para fechar uma conversa/ticket");
  })
});

// server/routers/index.ts
init_routers_business_hours();
var appRouter = router({
  auth: authRouter,
  agents: agentsRouter,
  crm: customersRouter,
  employees: employeesRouter,
  ai: aiRouter,
  apiConfig: apiConfigRouter,
  automation: automationRouter,
  babyShower: babyShowerRouter,
  broadcast: broadcastRouter,
  contactFetch: contactFetchRouter,
  conversations: conversationsRouter,
  clients: clientsRouter,
  leads: leadsRouter,
  dashboardDrilldown: dashboardDrilldownRouter,
  dashboardStats: dashboardStatsRouter,
  dashboard: dashboardRouter,
  executions: executionsRouter,
  inbox: inboxRouter,
  logs: logsRouter,
  messages: messagesRouter,
  migration: migrationRouter,
  pauses: pausesRouter,
  queues: queuesRouter,
  quickReplies: quickRepliesRouter,
  reminders: remindersRouter,
  survey: surveyRouter,
  system: systemRouter,
  tags: tagsRouter,
  telemetry: telemetryRouter,
  test: testRouter,
  approvals: approvalsRouter,
  internalMessages: internalMessagesRouter,
  tickets: ticketsRouter,
  businessHours: businessHoursRouter
});

// server/_core/trpc/context.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
init_env();
var getHeader = (req, name) => {
  if (!req?.headers) return void 0;
  if (typeof req.headers.get === "function") {
    return req.headers.get(name) || req.headers.get(name.toLowerCase());
  }
  const h = req.headers;
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()];
};
async function createContext(opts) {
  console.log("[createContext] Called | has req:", !!opts?.req);
  const req = opts?.req;
  let user = void 0;
  if (req) {
    try {
      const tokenRaw = getHeader(req, "x-jti") || getHeader(req, "authorization") || getHeader(req, "Authorization");
      const token = tokenRaw?.startsWith("Bearer ") ? tokenRaw.slice(7) : tokenRaw;
      if (token) {
        try {
          const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET);
          user = decoded;
          console.log("[createContext] \u2705 Token v\xE1lido para:", user?.name, "| Role:", user?.role);
        } catch (e) {
          console.log("[createContext] \u274C JWT verification failed:", e.message);
        }
      } else {
        console.log("[createContext] \u26A0\uFE0F Nenhum token encontrado");
      }
    } catch (error) {
      console.log("[createContext] General error:", error.message);
    }
  }
  console.log("[createContext] FINAL CONTEXT:", { hasUser: !!user });
  return { req, user };
}

// server/_core/routes/health.ts
var import_express = require("express");
init_db();
init_redis();
var router2 = (0, import_express.Router)();
router2.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const redisHealth = await checkRedisHealth();
    const health = {
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: db ? "connected" : "unavailable",
      redis: redisHealth
    };
    if (!db || redisHealth?.status === "error") {
      return res.status(503).json({
        ...health,
        status: "error"
      });
    }
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: "error", message: String(error) });
  }
});
var health_default = router2;

// server/routers-sse.ts
var import_express2 = require("express");
init_db();
init_sse();
init_db();
init_schema();
var import_drizzle_orm47 = require("drizzle-orm");
var import_jsonwebtoken3 = __toESM(require("jsonwebtoken"), 1);
init_env();
function createSSERouter() {
  const router6 = (0, import_express2.Router)();
  const sseAuth = async (req, res, next) => {
    try {
      let userId = null;
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
          const decoded = import_jsonwebtoken3.default.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (jwtError) {
          console.log("[SSE Auth] JWT token invalid, trying cookies");
        }
      }
      if (!userId) {
        const sessionId = req.cookies?.session;
        if (sessionId) {
          try {
            const session = await getSession(sessionId);
            if (session?.userId) {
              userId = session.userId;
            }
          } catch (sessionError) {
            console.log("[SSE Auth] Session invalid, trying localStorage token");
          }
        }
      }
      if (!userId) {
        const tokenCookie = req.cookies?.authToken || req.cookies?.jti;
        if (tokenCookie) {
          try {
            const decoded = import_jsonwebtoken3.default.verify(tokenCookie, JWT_SECRET);
            userId = decoded.id;
          } catch (tokenError) {
            console.log("[SSE Auth] Auth token cookie invalid");
          }
        }
      }
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userRows = await _db.select().from(users).where((0, import_drizzle_orm47.eq)(users.id, userId));
      const user = userRows[0];
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      req.userId = user.id;
      req.user = user;
      next();
    } catch (error) {
      console.error("[SSE Auth] Error:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };
  router6.get("/", sseAuth, (req, res) => {
    const userId = req.userId;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.flushHeaders();
    console.log(`[SSE] Client connected for userId=${userId}`);
    sseManager.addClient(String(userId), res);
    res.write(`data: ${JSON.stringify({ type: "connected", userId })}

`);
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat

`);
    }, 15e3);
    req.on("close", () => {
      console.log(`[SSE] Client disconnected userId=${userId}`);
      clearInterval(heartbeat);
    });
    req.on("error", (err) => {
      console.error(`[SSE] Error for userId=${userId}:`, err);
      clearInterval(heartbeat);
    });
  });
  return router6;
}

// server/routers-media.ts
var import_express3 = require("express");
init_db();
init_schema();
var import_drizzle_orm48 = require("drizzle-orm");
var router3 = (0, import_express3.Router)();
router3.get("/:messageId", async (req, res) => {
  const { messageId } = req.params;
  console.log("[MediaProxy] Request for:", messageId);
  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    const [convMsg] = await db.select().from(conversationMessages).where((0, import_drizzle_orm48.eq)(conversationMessages.id, Number(messageId))).limit(1);
    let fileUrl = convMsg?.fileUrl || null;
    if (!fileUrl) {
      const [received] = await db.select().from(receivedMessages).where((0, import_drizzle_orm48.eq)(receivedMessages.externalId, messageId)).limit(1);
      fileUrl = received?.mediaUrl || null;
    }
    if (!fileUrl) {
      console.log("[MediaProxy] Not found for messageId:", messageId);
      return res.status(404).json({ error: "M\xEDdia n\xE3o encontrada" });
    }
    if (fileUrl.includes("whatsapp.net") || fileUrl.includes("whatsapp.com")) {
      console.log("[MediaProxy] WhatsApp CDN detected, downloading:", fileUrl.substring(0, 80));
      try {
        const response = await fetch(fileUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)"
          }
        });
        if (!response.ok) {
          console.log("[MediaProxy] WhatsApp download failed:", response.status);
          return res.status(403).json({ error: "M\xEDdia bloqueada pelo WhatsApp" });
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Content-Disposition", `inline; filename="${convMsg?.fileName || "media"}"`);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      } catch (downloadErr) {
        console.error("[MediaProxy] Download error:", downloadErr);
        return res.status(500).json({ error: "Erro ao baixar m\xEDdia" });
      }
    }
    let finalUrl = fileUrl;
    if (!fileUrl.startsWith("http")) {
      const r2Base = (process.env.PUBLIC_R2_URL || "https://pub-33c481f0a9e94adb8870472308f49471.r2.dev").replace(/\$/, "");
      finalUrl = `${r2Base}/${fileUrl.replace(/^\//, "")}`;
    }
    console.log("[MediaProxy] Redirecting to:", finalUrl);
    return res.redirect(302, finalUrl);
  } catch (error) {
    console.error("[MediaProxy] Error:", error);
    return res.status(500).json({ error: "Erro ao servir m\xEDdia" });
  }
});
router3.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL parameter required" });
  }
  let fileUrl;
  try {
    fileUrl = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }
  const isWhatsAppCdn = /whatsapp\.net|whatsapp\.com/.test(fileUrl);
  if (!isWhatsAppCdn) {
    return res.redirect(302, fileUrl);
  }
  console.log("[MediaProxy] WhatsApp CDN proxy request:", fileUrl.substring(0, 80));
  try {
    const response = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FarmaFrancisBot/1.0)"
      }
    });
    if (!response.ok) {
      console.log("[MediaProxy] WhatsApp download failed:", response.status);
      return res.status(403).json({ error: "M\xEDdia bloqueada pelo WhatsApp" });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return res.send(buffer);
  } catch (err) {
    console.error("[MediaProxy] Proxy error:", err);
    return res.status(500).json({ error: "Erro ao proxy m\xEDdia" });
  }
});
var routers_media_default = router3;

// server/index.ts
init_sse();

// server/webhooks.ts
var import_express4 = require("express");
init_db();
init_schema();
var import_drizzle_orm51 = require("drizzle-orm");
init_db_messages();

// server/queue/mobile-sync.ts
init_db();
init_schema();
var import_drizzle_orm49 = require("drizzle-orm");
init_phone();
init_sse();
var queue = [];
var isProcessing = false;
function enqueueMobileSyncJob(job) {
  const jobWithId = {
    ...job,
    id: `mobile-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  queue.push(jobWithId);
  if (queue.length % 10 === 0) {
    console.log("[MobileSync] Queue size:", queue.length);
  }
  if (!isProcessing) {
    setImmediate(processQueue);
  }
}
async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;
      try {
        await processMobileSyncJob(job);
        if (Math.random() < 0.1) {
          console.log("[MobileSync] Job processed:", job.id, "queue remaining:", queue.length);
        }
      } catch (error) {
        console.error("[MobileSync] Job failed:", job.id, error.message);
      }
    }
  } finally {
    isProcessing = false;
  }
}
async function processMobileSyncJob(job) {
  const db = await getDb();
  if (!db) {
    console.error("[MobileSync] DB not available for job:", job.id);
    return;
  }
  const customerPhone2 = normalizeInboundNumber(job.remoteJid);
  if (!customerPhone2) {
    console.error("[MobileSync] Failed to normalize phone from:", job.remoteJid);
    return;
  }
  const phoneVariants = generatePhoneVariants(customerPhone2);
  const phoneCondition = phoneVariants.length > 1 ? (0, import_drizzle_orm49.or)(...phoneVariants.map((v) => (0, import_drizzle_orm49.eq)(customers.phone, v))) : (0, import_drizzle_orm49.eq)(customers.phone, phoneVariants[0]);
  let customer2 = await db.select().from(customers).where(phoneCondition).limit(1);
  if (customer2.length === 0) {
    await db.insert(customers).values({
      name: `Cliente ${customerPhone2}`,
      phone: customerPhone2,
      status: "active"
    });
    customer2 = await db.select().from(customers).where(phoneCondition).limit(1);
  }
  if (customer2.length === 0) {
    console.error("[MobileSync] Failed to create/find customer:", customerPhone2);
    return;
  }
  const customerRecord = customer2[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
  const [conv] = await db.select().from(conversations).where(
    (0, import_drizzle_orm49.and)(
      (0, import_drizzle_orm49.eq)(conversations.customerId, customerRecord.id),
      (0, import_drizzle_orm49.eq)(conversations.channel, "whatsapp"),
      (0, import_drizzle_orm49.or)(
        (0, import_drizzle_orm49.eq)(conversations.status, "open"),
        (0, import_drizzle_orm49.eq)(conversations.status, "assigned"),
        (0, import_drizzle_orm49.and)(
          (0, import_drizzle_orm49.eq)(conversations.status, "closed"),
          (0, import_drizzle_orm49.gte)(conversations.closedAt, thirtyDaysAgo)
        )
      )
    )
  ).orderBy((0, import_drizzle_orm49.desc)(conversations.lastMessageAt)).limit(1);
  let conversationId2;
  if (!conv) {
    const insertResult2 = await db.insert(conversations).values({
      customerId: customerRecord.id,
      customerName: customerRecord.name,
      customerPhone: customerPhone2,
      channel: "whatsapp",
      status: "open",
      assignedTo: null,
      queueId: null,
      openedAt: /* @__PURE__ */ new Date(),
      lastMessageAt: /* @__PURE__ */ new Date(),
      unreadCount: 1
    });
    conversationId2 = insertResult2?.[0]?.insertId ?? insertResult2?.insertId;
    if (!conversationId2) {
      console.error("[MobileSync] insertId undefined ap\xF3s insert de conversa!");
      return;
    }
    console.log("[MobileSync] Created new conversation:", conversationId2, "for phone:", customerPhone2);
  } else {
    conversationId2 = conv.id;
    const isReopening = conv.status === "closed";
    await db.update(conversations).set({
      lastMessageAt: /* @__PURE__ */ new Date(),
      unreadCount: isReopening ? 1 : import_drizzle_orm49.sql`unread_count + 1`,
      ...isReopening ? {
        status: "open",
        assignedTo: null,
        queueId: null,
        closedAt: null,
        closeReason: null
      } : {}
    }).where((0, import_drizzle_orm49.eq)(conversations.id, conversationId2));
  }
  const existing = await db.select().from(conversationMessages).where(
    (0, import_drizzle_orm49.and)(
      (0, import_drizzle_orm49.eq)(conversationMessages.conversationId, conversationId2),
      (0, import_drizzle_orm49.eq)(conversationMessages.externalId, job.messageId)
    )
  ).limit(1);
  if (existing.length > 0) {
    console.log("[MobileSync] Duplicate message ignored:", job.messageId);
    return;
  }
  console.log("[MobileSync] Processing job:", job.id, "for conversation:", conversationId2);
  let content2 = job.messageText || job.caption || "";
  if (!content2 && job.messageType) {
    const typeLabels = {
      image: "[Imagem]",
      audio: "[\xC1udio]",
      video: "[V\xEDdeo]",
      document: "[Documento]",
      sticker: "[Sticker]",
      location: "[Localiza\xE7\xE3o]"
    };
    content2 = typeLabels[job.messageType] || "";
  }
  const insertResult = await db.insert(conversationMessages).values({
    conversationId: conversationId2,
    senderId: null,
    // Mensagem do agente, mas não há user_id no contexto do mobile-sync (será atualizado depois se necessário)
    senderType: "agent",
    content: content2,
    fileUrl: job.mediaUrl || null,
    fileName: job.fileName || null,
    fileType: job.mimeType || null,
    fileSize: null,
    externalId: job.messageId,
    remoteJid: job.remoteJid,
    createdAt: new Date(job.messageTimestamp * 1e3)
  });
  const messageDbId = insertResult.insertId;
  const shouldDownloadMedia = job.mediaUrl && job.messageId && (job.mediaUrl.includes("mmg.whatsapp.net") || job.mediaUrl.includes("pps.whatsapp.net") || job.mediaUrl.includes("whatsapp.net") || job.mediaUrl.includes("whatsapp.com"));
  if (shouldDownloadMedia) {
    try {
      console.log("[MobileSync][S3] Triggering Evolution download for R2 upload, messageId:", job.messageId);
      const dbForUpload = await getDb();
      if (!dbForUpload) throw new Error("DB not available for S3 upload");
      const [configRecord] = await dbForUpload.select().from(integrationSettings).where((0, import_drizzle_orm49.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
      if (configRecord?.config) {
        const configData = typeof configRecord.config === "string" ? JSON.parse(configRecord.config) : configRecord.config;
        const normalizedUrl = configData.apiUrl.replace(/\/$/, "");
        const instanceName = configData.instanceName;
        const downloadUrl = `${normalizedUrl}/message/download/${instanceName}/${job.messageId}`;
        const response = await fetch(downloadUrl, {
          headers: {
            apikey: configData.apiKey
          },
          signal: AbortSignal.timeout(3e4)
        });
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("image") || contentType.includes("audio") || contentType.includes("video") || contentType.includes("octet-stream")) {
            const buffer = await response.arrayBuffer();
            const bufferData = Buffer.from(buffer);
            if (bufferData.length > 100) {
              const mime = contentType.split(";")[0];
              const ext = mime.split("/")[1] || "bin";
              const fileName = `media-${Date.now()}.${ext}`;
              const r2Key = `evolution-api/${fileName}`;
              const { uploadToR2: uploadToR23 } = await import("./r2-client.js");
              const r2Url = await uploadToR23(bufferData, r2Key, mime);
              if (r2Url) {
                console.log("[MobileSync][S3] \u2705 Uploaded to R2:", r2Url);
                await dbForUpload.update(conversationMessages).set({ fileUrl: r2Url, fileType: mime }).where((0, import_drizzle_orm49.eq)(conversationMessages.id, messageDbId));
                console.log("[MobileSync][S3] \u2705 Message updated with R2 URL");
              }
            }
          } else {
            const data = await response.json();
            console.log("[MobileSync][S3] \u274C Unexpected JSON response:", data);
          }
        } else {
          console.log("[MobileSync][S3] \u274C Download failed:", response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error("[MobileSync][S3] Error during R2 upload:", error);
    }
  }
  const [updatedConv] = await db.select().from(conversations).where((0, import_drizzle_orm49.eq)(conversations.id, conversationId2)).limit(1);
  if (updatedConv?.assignedTo) {
    const [insertedMessage] = await db.select().from(conversationMessages).where(
      (0, import_drizzle_orm49.and)(
        (0, import_drizzle_orm49.eq)(conversationMessages.conversationId, conversationId2),
        (0, import_drizzle_orm49.eq)(conversationMessages.externalId, job.messageId)
      )
    ).orderBy(import_drizzle_orm49.sql`${conversationMessages.id} DESC`).limit(1);
    if (insertedMessage && insertedMessage.id) {
      sseManager.emitToUser(updatedConv.assignedTo, EVENTS.MESSAGE_CREATED, {
        messageId: insertedMessage.id,
        conversationId: conversationId2,
        senderId: null,
        senderType: "agent",
        content: content2,
        fileUrl: job.mediaUrl || null,
        fileType: job.messageType || null,
        createdAt: new Date(job.messageTimestamp * 1e3).toISOString()
      });
    }
  }
}
function normalizeInboundNumber(remoteJid) {
  const digits = remoteJid.replace(/\D/g, "");
  if (digits.length < 10) return null;
  let number = digits;
  if (!number.startsWith("55") && number.length === 11) {
    number = "55" + number;
  }
  return number;
}

// server/webhooks.ts
var import_crypto3 = __toESM(require("crypto"), 1);
init_phone();
process.on("unhandledRejection", (reason) => {
  console.error("\u{1F534} [UNHANDLED REJECTION]", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("\u{1F534} [UNCAUGHT EXCEPTION]", err?.message, err?.stack);
});
var debugModule = null;
try {
  debugModule = (init_debug(), __toCommonJS(debug_exports));
} catch (e) {
  console.error("[Webhooks] Debug module not loaded");
}
var profilePicCache = /* @__PURE__ */ new Map();
var PROFILE_PIC_TTL_MS = 6 * 60 * 60 * 1e3;
function isReachableMediaUrl(url) {
  if (!url) return false;
  if (url.startsWith("data:")) return true;
  if (url.includes(".r2.dev") || url.includes("r2.cloudflarestorage.com")) return true;
  if (url.startsWith("/") || url.includes("farmafrancis")) return true;
  if (url.includes("whatsapp.net") || url.includes("whatsapp.com")) return false;
  if (url.startsWith("http")) return true;
  return false;
}
async function resolveProfilePic(provider, fromNumber) {
  const key = `${provider}:${fromNumber}`;
  const cached = profilePicCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_PIC_TTL_MS) {
    return cached.url;
  }
  let url = null;
  try {
    if (provider === "whatsapp") {
      const { fetchEvolutionProfile: fetchEvolutionProfile2 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
      const prof = await fetchEvolutionProfile2(fromNumber);
      const raw = prof?.profilePicture || null;
      url = isReachableMediaUrl(raw) ? raw : null;
    } else {
      const { fetchInstagramProfile: fetchInstagramProfile3 } = await Promise.resolve().then(() => (init_messaging(), messaging_exports));
      const prof = await fetchInstagramProfile3(fromNumber);
      const raw = prof?.profilePicture || null;
      url = isReachableMediaUrl(raw) ? raw : null;
    }
  } catch (e) {
    console.warn(`[ProfilePic] Failed to fetch for ${key}:`, e.message);
  }
  profilePicCache.set(key, { url, fetchedAt: Date.now() });
  return url;
}
var router4 = (0, import_express4.Router)();
var isProduction = process.env.NODE_ENV === "production";
var addDebugLog = debugModule?.addLog || ((level, category, message2, data) => {
  console.log(`[${level.toUpperCase()}] [${category}]`, message2, data);
});
var addDebugLogWebhook = debugModule?.webhookLogger || ((req, res, next) => {
  console.log(`[WEBHOOK] ${req.method} ${req.url}`);
  next();
});
async function fetchMessageFromEvolution(messageId) {
  try {
    const EVO_URL = process.env.EVOLUTION_API_URL || "https://evolution-api-production-ffea.up.railway.app";
    const EVO_KEY = process.env.EVOLUTION_API_KEY || "7296ECE8D5DB-401B-8C39-2147777EA59B";
    const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || "Meu";
    const response = await fetch(`${EVO_URL}/chat/findMessages/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
      body: JSON.stringify({ where: { key: { id: messageId } }, limit: 1 })
    });
    if (!response.ok) {
      console.log("[Evolution Webhook] fetchMessageFromEvolution failed:", response.status);
      return null;
    }
    const data = await response.json();
    const records = data?.messages?.records || data?.records || [];
    if (records.length === 0) {
      console.log("[Evolution Webhook] fetchMessageFromEvolution: no records found for", messageId);
      return null;
    }
    console.log("[Evolution Webhook] fetchMessageFromEvolution: found message, type:", records[0].messageType);
    return records[0];
  } catch (err) {
    console.error("[Evolution Webhook] fetchMessageFromEvolution error:", err);
    return null;
  }
}
function cleanR2Url(url) {
  console.log("[cleanR2Url] Input URL:", url?.substring(0, 120));
  if (!url) return null;
  const isR2 = url.includes(".r2.") || url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev");
  if (!isR2) {
    console.log("[Webhooks] Non-R2 URL, skipping:", url.substring(0, 80));
    return null;
  }
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      console.log("[Webhooks] R2 URL has no bucket+path:", url);
      return null;
    }
    const relativePath = parts.slice(1).join("/");
    console.log("[Webhooks] Cleaned R2 path:", relativePath);
    return relativePath;
  } catch (e) {
    console.error("[Webhooks] Failed to parse R2 URL:", url, e);
    return null;
  }
}
function extractEvolutionRemoteJid(body2) {
  if (!body2) return null;
  const data = body2?.data || body2?.payload || body2;
  const msg0 = data?.messages?.[0] || data?.message || body2?.message || body2?.messages?.[0] || body2?.data?.messages?.[0];
  const key = data?.key || data?.data?.key || data?.message?.key || msg0?.key || msg0?.message?.key;
  const sender = data?.sender || body2?.sender;
  const destination = data?.destination || body2?.destination;
  const senderStr = typeof sender === "string" ? sender : null;
  const destinationStr = typeof destination === "string" ? destination : null;
  const candidates = [
    body2?.remoteJid,
    body2?.data?.remoteJid,
    data?.remoteJid,
    key?.remoteJid,
    msg0?.key?.remoteJid,
    msg0?.remoteJid,
    data?.from,
    data?.chatId,
    senderStr,
    sender?.remoteJid,
    sender?.jid,
    sender?.id,
    sender?.phone,
    sender?.number,
    destinationStr,
    destination?.remoteJid,
    destination?.jid,
    destination?.id,
    destination?.phone,
    destination?.number
  ].filter(Boolean);
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    if (c.startsWith("http://") || c.startsWith("https://")) continue;
    return c;
  }
  return null;
}
function normalizeInboundNumber2(value) {
  if (!value) return null;
  const stripped = value.split("@")[0];
  if (!stripped) return null;
  const normalized = formatPhoneBR(stripped);
  return normalized;
}
function logWebhookSummary(provider, payload) {
  if (!isProduction) {
    console.log(
      `[${provider} Webhook] Received payload:`,
      JSON.stringify(payload, null, 2)
    );
    return;
  }
  const body2 = payload;
  const entryCount = Array.isArray(body2?.entry) ? body2.entry.length : 0;
  console.log(
    `[${provider} Webhook] Received payload with ${entryCount} entries`
  );
}
router4.get("/whatsapp", async (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    console.log("[WhatsApp Webhook] Verification request:", {
      mode,
      token: token ? "***" : void 0
    });
    if (mode === "subscribe") {
      const db = await getDb();
      if (!db) {
        return res.status(500).send("Database not available");
      }
      const config = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "whatsapp_business")).limit(1);
      if (config.length === 0) {
        console.log("[WhatsApp Webhook] No configuration found");
        return res.status(403).send("No configuration found");
      }
      const configData = typeof config[0].config === "string" ? JSON.parse(config[0].config) : config[0].config;
      const storedToken = configData.webhookVerifyToken;
      console.log("[WhatsApp Webhook] Verify token present:", Boolean(token));
      console.log(
        "[WhatsApp Webhook] Stored token present:",
        Boolean(storedToken)
      );
      if (token === storedToken) {
        console.log("[WhatsApp Webhook] Verification successful");
        return res.status(200).send(challenge);
      } else {
        console.log("[WhatsApp Webhook] Token mismatch");
        return res.status(403).send("Verification token mismatch");
      }
    }
    res.status(400).send("Invalid verification request");
  } catch (error) {
    console.error("[WhatsApp Webhook] Verification error:", error);
    res.status(500).send("Internal server error");
  }
});
router4.get("/whatsapp", async (req, res) => {
  try {
    const body2 = req.body;
    logWebhookSummary("WhatsApp", body2);
    const signature = req.headers["x-hub-signature-256"];
    if (!signature && isProduction) {
      console.error("[WhatsApp Webhook] Missing signature in production");
      return res.status(403).send("Missing signature");
    }
    if (signature) {
      const isValid = await validateWhatsAppSignature(
        req.rawBody,
        signature
      );
      if (!isValid) {
        console.error("[WhatsApp Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[WhatsApp Webhook] Signature validated successfully");
    }
    res.status(200).send("EVENT_RECEIVED");
    console.log("[WhatsApp Webhook] \u26D4 Handler antigo desativado \u2014 usando /evolution");
  } catch (error) {
    console.error("[WhatsApp Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});
router4.get("/instagram", async (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    console.log("[Instagram Webhook] Verification request:", {
      mode,
      token: token ? "***" : void 0
    });
    if (mode === "subscribe") {
      const db = await getDb();
      if (!db) {
        return res.status(500).send("Database not available");
      }
      const config = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "instagram_graph")).limit(1);
      if (config.length === 0) {
        console.log("[Instagram Webhook] No configuration found");
        return res.status(403).send("No configuration found");
      }
      const configData = typeof config[0].config === "string" ? JSON.parse(config[0].config) : config[0].config;
      const storedToken = configData.webhookVerifyToken;
      if (token === storedToken) {
        console.log("[Instagram Webhook] Verification successful");
        return res.status(200).send(challenge);
      } else {
        console.log("[Instagram Webhook] Token mismatch");
        return res.status(403).send("Verification token mismatch");
      }
    }
    res.status(400).send("Invalid verification request");
  } catch (error) {
    console.error("[Instagram Webhook] Verification error:", error);
    res.status(500).send("Internal server error");
  }
});
router4.get("/instagram", async (req, res) => {
  try {
    logWebhookSummary("Instagram", body);
    const signature = req.headers["x-hub-signature-256"];
    if (!signature && isProduction) {
      console.error("[Instagram Webhook] Missing signature in production");
      return res.status(403).send("Missing signature");
    }
    if (signature) {
      const isValid = await validateInstagramSignature(
        req.rawBody,
        signature
      );
      if (!isValid) {
        console.error("[Instagram Webhook] Invalid signature");
        return res.status(403).send("Invalid signature");
      }
      console.log("[Instagram Webhook] Signature validated successfully");
    }
    res.status(200).send("EVENT_RECEIVED");
    processInstagramWebhook(body).catch((error) => {
      console.error("[Instagram Webhook] Processing error:", error);
    });
  } catch (error) {
    console.error("[Instagram Webhook] Handler error:", error);
    res.status(500).send("Internal server error");
  }
});
router4.post("/evolution", async (req, res) => {
  return handleEvolutionWebhook(req, res);
});
router4.get("/whatsapp", async (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    console.log("[WhatsApp Webhook] Verification request:", {
      mode,
      token: token ? "***" : void 0
    });
    if (mode === "subscribe") {
      const db = await getDb();
      if (!db) {
        return res.status(500).send("Database not available");
      }
      const config = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "whatsapp_business")).limit(1);
      if (config.length === 0) {
        console.log("[WhatsApp Webhook] No configuration found");
        return res.status(403).send("No configuration found");
      }
      const configData = typeof config[0].config === "string" ? JSON.parse(config[0].config) : config[0].config;
      const storedToken = configData.webhookVerifyToken;
      if (token === storedToken) {
        console.log("[WhatsApp Webhook] Verification successful");
        return res.status(200).send(challenge);
      } else {
        console.log("[WhatsApp Webhook] Token mismatch");
        return res.status(403).send("Verification token mismatch");
      }
    }
    res.status(400).send("Invalid verification request");
  } catch (error) {
    console.error("[WhatsApp Webhook] Verification error:", error);
    res.status(500).send("Internal server error");
  }
});
async function handleEvolutionWebhook(req, res) {
  try {
    const apikey = req.query.apikey || "";
    console.log("\u{1F535} [Evolution Handler] ENTRY method:", req.method, "path:", req.path, "apikey:", String(apikey).substring(0, 30));
    res.status(200).send("EVENT_RECEIVED");
    setImmediate(() => {
      processEvolutionWebhookAsync(req).catch((err) => {
        const body2 = req.body;
        console.error("\u{1F534} [Evolution Webhook] Background CRASH:", err?.message || String(err));
        if (err?.stack) console.error("\u{1F534} [Evolution Webhook] STACK:", err.stack);
      });
    });
  } catch (error) {
    console.error("\u{1F534} [Evolution Webhook] Handler CRASH:", error?.message || String(error));
    try {
      res.status(200).send("EVENT_RECEIVED");
    } catch (_) {
    }
  }
}
async function processEvolutionWebhookAsync(req) {
  const body2 = req.body;
  try {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    console.log("\u{1F4E5} [Webhook] event:", body2?.event, "| hasData:", !!body2?.data, "| dataKeys:", body2?.data ? Object.keys(body2.data).join(",") : "none");
    console.log("\u{1F4E5} [Webhook] hasContextInfo:", !!body2?.data?.contextInfo, "| hasMessage:", !!body2?.data?.message);
    if (body2?.data?.contextInfo) {
      const ctx = body2.data.contextInfo;
      console.log("\u{1F4E5} [Webhook] ctx.remoteJid:", ctx.remoteJid, "| ctx.participant:", ctx.participant, "| stanzaId:", ctx.stanzaId);
      console.log("\u{1F4E5} [Webhook] has quotedMessage:", !!ctx.quotedMessage, "| has imageMessage:", !!ctx.quotedMessage?.imageMessage);
      if (ctx.quotedMessage?.imageMessage) {
        const img = ctx.quotedMessage.imageMessage;
        console.log("\u{1F4E5} [Webhook] img keys:", Object.keys(img).join(","));
        console.log("\u{1F4E5} [Webhook] img has url:", !!img.url, "| mediaKey:", !!img.mediaKey, "| jpegThumbnail:", !!img.jpegThumbnail, "| directPath:", !!img.directPath);
      }
    }
    if (!body2 || Object.keys(body2).length === 0) {
      console.log("[Evolution Webhook] Empty body, skipping");
      return;
    }
    let eventName = body2?.event || body2?.data?.event;
    const queryApikeyRaw = req.query["apikey"] || "";
    const apikeyParts = queryApikeyRaw.split("/").filter(Boolean);
    const eventFromQuery = apikeyParts.length > 1 ? apikeyParts.slice(1).join("/") : "";
    if (!eventName && eventFromQuery) {
      eventName = eventFromQuery;
    }
    if (!eventName) {
      const urlParts = fullUrl.split("/evolution")[1] || "";
      const m = urlParts.match(/\/([a-z0-9_-]+)$/i);
      if (m?.[1]) {
        eventName = m[1];
      }
    }
    if (!eventName) {
      console.log("[Evolution Webhook] Event name not detected, ignoring");
      return;
    }
    console.log("[Evolution Webhook] \u{1F4E5} Received event:", {
      event: eventName,
      hasData: !!body2?.data,
      bodyKeys: Object.keys(body2)
    });
    console.log("2. [Evolution Webhook] \u2705 Evento detectado:", eventName);
    const remoteJid = body2?.data?.key?.remoteJid || body2?.data?.remoteJid || body2?.destination || body2?.data?.message?.key?.remoteJid || "";
    if (remoteJid.includes("@g.us")) {
      console.log(`\u{1F6AB} [Grupos] Mensagem de grupo ignorada: ${remoteJid}`);
      return;
    }
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");
    const allowedEvents = ["messages_upsert", "messages_update", "send_message"];
    if (!allowedEvents.includes(normalizedEvent)) {
      console.log(`[Evolution Webhook] \u23ED\uFE0F Ignoring event type: ${eventName} (normalized: ${normalizedEvent})`);
      return;
    }
    console.log("[Evolution Webhook] \u2705 Event approved for processing");
    console.log("3. [Evolution Webhook] \u2705 Passou no filtro de eventos permitidos");
    const db = await getDb();
    if (!db) {
      console.error("[Evolution Webhook] \u274C Database not available");
      return;
    }
    const [configRow] = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    if (configRow) {
      const configData = typeof configRow.config === "string" ? JSON.parse(configRow.config) : configRow.config;
      const expectedApiKey = configData.apiKey || configData.accessToken;
      const cleanApikey = queryApikeyRaw.split("/")[0].split("@")[0] || "";
      const cleanExpected = expectedApiKey?.split("@")[0] || "";
      if (expectedApiKey && cleanApikey && cleanExpected && cleanApikey !== cleanExpected) {
        console.log("[Evolution Webhook] \u26A0\uFE0F API key mismatch (continuing anyway):");
        console.log("  Expected:", cleanExpected.substring(0, 5) + "...");
        console.log("  Received:", cleanApikey.substring(0, 5) + "...");
      }
    } else {
      console.warn("[Evolution Webhook] \u26A0\uFE0F No Evolution API config found in database");
    }
    console.log("[Evolution Webhook] \u{1F680} Starting message processing...");
    await processEvolutionWebhook({ ...body2, event: eventName });
    console.log("[Evolution Webhook] \u2705 Message processing completed");
  } catch (error) {
    console.error("[Evolution Webhook] \u{1F4A5} Unhandled error:", error);
    throw error;
  }
}
async function processInstagramWebhook(body2) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    if (!body2.entry || !Array.isArray(body2.entry)) {
      console.log("[Instagram] No entries in payload");
      return;
    }
    for (const entry of body2.entry) {
      const messaging = entry.messaging;
      if (!messaging || !Array.isArray(messaging)) continue;
      for (const event of messaging) {
        const sender = event.sender?.id;
        const recipient = event.recipient?.id;
        const timestamp4 = event.timestamp;
        const message2 = event.message;
        if (!message2 || !sender) continue;
        const messageId = message2.mid;
        let text4 = message2.text || null;
        let mediaUrl = null;
        let mediaId = null;
        let mimeType = null;
        let messageType2 = "text";
        if (message2.attachments && Array.isArray(message2.attachments)) {
          const attachment = message2.attachments[0];
          const type = attachment.type;
          const payload = attachment.payload;
          messageType2 = type === "image" ? "image" : type === "video" ? "video" : type === "audio" ? "audio" : type === "file" ? "document" : type === "story" ? "image" : type === "story_template" ? "image" : type === "fallback" ? "image" : "unknown";
          let rawMediaUrl = payload?.url || null;
          if (rawMediaUrl && !cleanR2Url(rawMediaUrl)) {
            try {
              const { downloadWithValidation: downloadWithValidation2 } = await Promise.resolve().then(() => (init_media_validator(), media_validator_exports));
              const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
              const validated = await downloadWithValidation2(rawMediaUrl, {
                expectedMimeType: attachment.mime_type || void 0,
                maxRetries: 3
              });
              const fileName = rawMediaUrl.split("/").pop() || "instagram-media";
              const uploadResult = await uploadToR23(validated.buffer, fileName, validated.mimeType);
              rawMediaUrl = uploadResult.url;
              console.log("[Instagram] \u2705 M\xEDdia validada e upada para R2:", {
                url: rawMediaUrl,
                etag: uploadResult.etag,
                size: uploadResult.size,
                mime: validated.mimeType
              });
            } catch (downloadErr) {
              console.error("[Instagram] \u274C Falha ao baixar/validar/upload m\xEDdia:", downloadErr);
            }
          }
          mediaUrl = cleanR2Url(rawMediaUrl) || rawMediaUrl;
          const storyCaption = attachment.caption || attachment.story_caption || null;
          if (storyCaption) {
            text4 = text4 || storyCaption;
          }
        }
        if (!mediaUrl && message2.reply_to && message2.reply_to.story) {
          const storyUrl = message2.reply_to.story.url || message2.reply_to.story.cdn_url || message2.reply_to.story.link || null;
          if (storyUrl) {
            let rawStoryUrl = storyUrl;
            if (!cleanR2Url(rawStoryUrl)) {
              try {
                const { downloadWithValidation: downloadWithValidation2 } = await Promise.resolve().then(() => (init_media_validator(), media_validator_exports));
                const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
                const validated = await downloadWithValidation2(rawStoryUrl, {
                  maxRetries: 3
                });
                const fileName = `story-${messageId || Date.now()}.${validated.extension}`;
                const uploadResult = await uploadToR23(validated.buffer, fileName, validated.mimeType);
                rawStoryUrl = uploadResult.url;
                console.log("[Instagram] \u2705 Story image validada e upada para R2:", {
                  url: rawStoryUrl,
                  etag: uploadResult.etag,
                  size: uploadResult.size,
                  mime: validated.mimeType
                });
              } catch (storyErr) {
                console.error("[Instagram] \u274C Falha ao baixar/validar/upload story image:", storyErr);
              }
            }
            mediaUrl = cleanR2Url(rawStoryUrl) || rawStoryUrl;
            messageType2 = "image";
            console.log("[Instagram] Story reply detected \u2014 attaching story image + reply text");
          }
        }
        let profilePic = null;
        try {
          profilePic = await resolveProfilePic("instagram", sender);
        } catch (picErr) {
          console.warn("[Instagram] Could not resolve profile pic:", picErr.message);
        }
        if (messageType2 === "reaction" && reactionTargetId && reactionEmoji) {
          try {
            const target = await db.query.conversationMessages.findFirst({
              where: (cm, { eq: eq50 }) => eq50(cm.externalId, reactionTargetId)
            });
            if (target) {
              await db.update(conversationMessages).set({ reaction: reactionEmoji }).where((0, import_drizzle_orm51.eq)(conversationMessages.id, target.id));
              console.log("[Webhook] \u2705 Rea\xE7\xE3o " + reactionEmoji + " aplicada \xE0 mensagem " + reactionTargetId);
            } else {
              console.log("[Webhook] \u26A0\uFE0F Mensagem original " + reactionTargetId + " n\xE3o encontrada para rea\xE7\xE3o");
            }
          } catch (reactionErr) {
            console.error("[Webhook] Erro ao aplicar rea\xE7\xE3o:", reactionErr);
          }
          continue;
        }
        const existing = await getReceivedMessageByExternalId(
          messageId,
          "instagram"
        );
        if (existing) {
          console.log(`[Instagram] Duplicate message ${messageId} ignored`);
          continue;
        }
        try {
          await db.insert(receivedMessages).values({
            provider: "instagram",
            externalId: messageId,
            fromNumber: sender,
            fromName: null,
            // Instagram doesn't provide name in webhook
            fromProfilePic: profilePic,
            messageType: messageType2,
            messageText: text4,
            mediaUrl,
            mediaId,
            mimeType,
            caption: null,
            latitude: null,
            longitude: null,
            timestamp: timestamp4,
            rawPayload: JSON.stringify(event),
            processed: 0
          });
        } catch (e) {
          if (!e.message.includes("Duplicate entry") && !e.message.includes("already exists")) {
            throw e;
          }
          console.log(`[Instagram] Duplicate message ${messageId} ignored (onConflict)`);
        }
        const isPossibleSurveyResponse = messageType2 === "text" && text4 && /^\s*[1-5]\s*$/.test(text4.trim());
        if (!isPossibleSurveyResponse) {
          await ingestInboundConversationMessage({
            provider: "instagram",
            fromNumber: sender,
            fromName: null,
            messageType: messageType2,
            messageText: text4,
            caption: null,
            mediaUrl,
            mediaId: null,
            mimeType,
            externalId: messageId,
            // Add this to trigger S3 download
            createdAt: /* @__PURE__ */ new Date()
          });
          console.log(
            `[Instagram] Saved message ${messageId} from ${sender} to conversation`
          );
        } else {
          console.log(
            `[Instagram] Message ${messageId} from ${sender} appears to be a survey response, not inserting into conversation`
          );
        }
      }
    }
  } catch (error) {
    console.error("[Instagram] Processing error:", error);
    throw error;
  }
}
function parseEvolutionMessageContent(message2, rawMessageType, contextInfoFromData) {
  if (!message2)
    return {
      type: "unknown",
      text: null,
      caption: null,
      mediaUrl: null,
      mimeType: null,
      fileName: null,
      fileSize: null
    };
  const actualMessage = message2.viewOnceMessage?.message || message2.viewOnceMessageV2?.message || message2.viewOnceMessageV2Extension?.message || message2.documentWithCaptionMessage?.message || message2;
  let text4 = null;
  if (message2.conversation) {
    text4 = message2.conversation;
  } else if (message2.extendedTextMessage?.text) {
    text4 = message2.extendedTextMessage.text;
  }
  let typeToSave = "text";
  if (rawMessageType) {
    if (rawMessageType === "imageMessage") typeToSave = "image";
    else if (rawMessageType === "audioMessage") typeToSave = "audio";
    else if (rawMessageType === "videoMessage") typeToSave = "video";
    else if (rawMessageType === "documentMessage") typeToSave = "document";
    else if (rawMessageType === "conversation") typeToSave = "text";
    else if (rawMessageType === "extendedTextMessage") typeToSave = "text";
    else if (rawMessageType === "stickerMessage") typeToSave = "sticker";
    else if (rawMessageType === "locationMessage") typeToSave = "location";
    else if (rawMessageType === "contactMessage") typeToSave = "contact";
    else if (rawMessageType === "reactionMessage") typeToSave = "reaction";
  }
  let mimeType = null;
  if (typeToSave === "image" && actualMessage.imageMessage?.mimetype) {
    mimeType = actualMessage.imageMessage.mimetype || actualMessage.imageMessage.mimeType || null;
  } else if (typeToSave === "video" && actualMessage.videoMessage?.mimetype) {
    mimeType = actualMessage.videoMessage.mimetype || actualMessage.videoMessage.mimeType || null;
  } else if (typeToSave === "audio" && actualMessage.audioMessage?.mimetype) {
    mimeType = actualMessage.audioMessage.mimetype || actualMessage.audioMessage.mimeType || null;
  } else if (typeToSave === "document" && actualMessage.documentMessage?.mimetype) {
    mimeType = actualMessage.documentMessage.mimetype || actualMessage.documentMessage.mimeType || null;
  } else if (typeToSave === "sticker" && actualMessage.stickerMessage?.mimetype) {
    mimeType = actualMessage.stickerMessage.mimetype || actualMessage.stickerMessage.mimeType || null;
  }
  if (!mimeType) {
    mimeType = message2.mimetype || message2.mimeType || message2.fileMimeType || null;
  }
  let fileName = null;
  if (typeToSave === "image" && actualMessage.imageMessage?.fileName) {
    fileName = actualMessage.imageMessage.fileName;
  } else if (typeToSave === "video" && actualMessage.videoMessage?.fileName) {
    fileName = actualMessage.videoMessage.fileName;
  } else if (typeToSave === "audio" && actualMessage.audioMessage?.fileName) {
    fileName = actualMessage.audioMessage.fileName;
  } else if (typeToSave === "document" && actualMessage.documentMessage) {
    fileName = actualMessage.documentMessage.fileName || actualMessage.documentMessage.title || null;
  } else if (typeToSave === "sticker" && actualMessage.stickerMessage?.fileName) {
    fileName = actualMessage.stickerMessage.fileName;
  }
  if (!fileName) {
    fileName = message2.fileName || null;
  }
  if (!fileName) {
    const typeNames = {
      image: "imagem",
      video: "video",
      audio: "audio",
      document: "documento",
      sticker: "sticker",
      location: "localizacao",
      contact: "contato",
      reaction: "reacao"
    };
    fileName = `${typeNames[typeToSave] || "arquivo"}_${Date.now()}`;
  }
  if (!mimeType && fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };
    mimeType = mimeMap[ext || ""] || null;
  }
  const docWrapper = message2.documentWithCaptionMessage;
  if (docWrapper?.message?.documentMessage) {
    const realDoc = docWrapper.actualMessage.documentMessage;
    if (realDoc.fileName) fileName = realDoc.fileName;
    else if (realDoc.title) fileName = realDoc.title;
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = realDoc.mimetype || realDoc.mimeType || null;
    }
    console.log("[Blindagem] documentWithCaptionMessage detectado. fileName extra\xEDdo:", fileName, "mimeType:", mimeType);
  }
  let rawUrl2 = null;
  if (message2.mediaUrl) {
    rawUrl2 = message2.mediaUrl;
  } else if (typeToSave === "image" && actualMessage.imageMessage) {
    rawUrl2 = actualMessage.imageMessage.url || actualMessage.imageMessage.mediaUrl || null;
  } else if (typeToSave === "video" && actualMessage.videoMessage) {
    rawUrl2 = actualMessage.videoMessage.url || actualMessage.videoMessage.mediaUrl || null;
  } else if (typeToSave === "audio" && actualMessage.audioMessage) {
    rawUrl2 = actualMessage.audioMessage.url || actualMessage.audioMessage.mediaUrl || null;
  } else if (typeToSave === "document" && actualMessage.documentMessage) {
    rawUrl2 = actualMessage.documentMessage.url || actualMessage.documentMessage.mediaUrl || null;
  } else if (typeToSave === "sticker" && actualMessage.stickerMessage) {
    rawUrl2 = actualMessage.stickerMessage.url || actualMessage.stickerMessage.mediaUrl || null;
  }
  if (!rawUrl2 && contextInfoFromData?.quotedMessage?.imageMessage?.url) {
    rawUrl2 = contextInfoFromData.quotedMessage.imageMessage.url;
    typeToSave = "image";
  } else if (!rawUrl2 && contextInfoFromData?.quotedMessage?.videoMessage?.url) {
    rawUrl2 = contextInfoFromData.quotedMessage.videoMessage.url;
    typeToSave = "video";
  }
  let mediaUrl = rawUrl2 ? cleanR2Url(rawUrl2) : null;
  let needsDownload = rawUrl2 && !mediaUrl;
  let caption = null;
  let fileSize = message2.fileSize || actualMessage.imageMessage?.fileSize || actualMessage.videoMessage?.fileSize || actualMessage.documentMessage?.fileSize || actualMessage.audioMessage?.fileSize || null;
  const quotedMessage2 = message2.extendedTextMessage?.contextInfo?.quotedMessage || contextInfoFromData?.quotedMessage;
  if (typeToSave === "text" || typeToSave === "unknown") {
    if (quotedMessage2) {
      console.log("[Parse] Detected quotedMessage in extendedTextMessage (story reply)");
      if (quotedMessage2.imageMessage) {
        typeToSave = "image";
        rawUrl2 = quotedMessage2.imageMessage.url || quotedMessage2.imageMessage.mediaUrl || null;
        const quotedMediaKey = quotedMessage2.imageMessage.mediaKey || quotedMessage2.imageMessage.directPath || null;
        mimeType = quotedMessage2.imageMessage.mimetype || quotedMessage2.imageMessage.mimeType || null;
        fileName = quotedMessage2.imageMessage.fileName || null;
        fileSize = quotedMessage2.imageMessage.fileSize || null;
        caption = quotedMessage2.imageMessage.caption || null;
        console.log("[Parse] Story reply with imageMessage detected. mediaKey available:", !!quotedMediaKey);
      } else if (quotedMessage2.videoMessage) {
        typeToSave = "video";
        rawUrl2 = quotedMessage2.videoMessage.url || quotedMessage2.videoMessage.mediaUrl || null;
        mimeType = quotedMessage2.videoMessage.mimetype || quotedMessage2.videoMessage.mimeType || null;
        fileName = quotedMessage2.videoMessage.fileName || null;
        fileSize = quotedMessage2.videoMessage.fileSize || null;
        caption = quotedMessage2.videoMessage.caption || null;
        console.log("[Parse] Story reply with videoMessage detected");
      } else if (quotedMessage2.stickerMessage) {
        typeToSave = "sticker";
        rawUrl2 = quotedMessage2.stickerMessage.url || quotedMessage2.stickerMessage.mediaUrl || null;
        mimeType = quotedMessage2.stickerMessage.mimetype || quotedMessage2.stickerMessage.mimeType || null;
        fileName = quotedMessage2.stickerMessage.fileName || null;
        fileSize = quotedMessage2.stickerMessage.fileSize || null;
        console.log("[Parse] Story reply with stickerMessage detected");
      } else if (quotedMessage2.audioMessage) {
        typeToSave = "audio";
        rawUrl2 = quotedMessage2.audioMessage.url || quotedMessage2.audioMessage.mediaUrl || null;
        mimeType = quotedMessage2.audioMessage.mimetype || quotedMessage2.audioMessage.mimeType || null;
        fileName = quotedMessage2.audioMessage.fileName || null;
        fileSize = quotedMessage2.audioMessage.fileSize || null;
        caption = quotedMessage2.audioMessage.caption || null;
        console.log("[Parse] Story reply with audioMessage detected");
      } else if (quotedMessage2.documentMessage) {
        typeToSave = "document";
        rawUrl2 = quotedMessage2.documentMessage.url || quotedMessage2.documentMessage.mediaUrl || null;
        mimeType = quotedMessage2.documentMessage.mimetype || quotedMessage2.documentMessage.mimeType || null;
        fileName = quotedMessage2.documentMessage.fileName || quotedMessage2.documentMessage.title || null;
        fileSize = quotedMessage2.documentMessage.fileSize || null;
        caption = quotedMessage2.documentMessage.caption || null;
        console.log("[Parse] Story reply with documentMessage detected");
      }
    }
    if (rawUrl2 && !mediaUrl) {
      mediaUrl = cleanR2Url(rawUrl2);
      needsDownload = rawUrl2 && !mediaUrl;
      console.log("[Parse] Recalculated mediaUrl after story reply:", mediaUrl ? "FOUND" : "needs download");
    }
  } else {
    caption = message2.caption || actualMessage.imageMessage?.caption || actualMessage.videoMessage?.caption || actualMessage.documentMessage?.caption || null;
  }
  const locationMsg = actualMessage?.locationMessage || actualMessage?.liveLocationMessage;
  if (locationMsg) {
    const lat = locationMsg.degreesLatitude || locationMsg.latitude;
    const lng = locationMsg.degreesLongitude || locationMsg.longitude;
    if (lat && lng) {
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      let locationText = `\u{1F4CD} *Localiza\xE7\xE3o Recebida:*
${mapsUrl}`;
      if (locationMsg.name) locationText += `
Local: ${locationMsg.name}`;
      if (locationMsg.address) locationText += `
Endere\xE7o: ${locationMsg.address}`;
      text4 = locationText;
    }
  }
  const base64 = typeToSave === "image" ? actualMessage.imageMessage?.base64 || null : null;
  const mediaKey = typeToSave === "image" && actualMessage.imageMessage?.mediaKey || typeToSave === "video" && actualMessage.videoMessage?.mediaKey || typeToSave === "audio" && actualMessage.audioMessage?.mediaKey || typeToSave === "document" && actualMessage.documentMessage?.mediaKey || typeToSave === "image" && quotedMessage2?.imageMessage?.mediaKey || typeToSave === "video" && quotedMessage2?.videoMessage?.mediaKey || typeToSave === "audio" && quotedMessage2?.audioMessage?.mediaKey || typeToSave === "document" && quotedMessage2?.documentMessage?.mediaKey || null;
  const directPath = typeToSave === "image" && actualMessage.imageMessage?.directPath || typeToSave === "video" && actualMessage.videoMessage?.directPath || typeToSave === "audio" && actualMessage.audioMessage?.directPath || typeToSave === "document" && actualMessage.documentMessage?.directPath || typeToSave === "image" && quotedMessage2?.imageMessage?.directPath || typeToSave === "video" && quotedMessage2?.videoMessage?.directPath || typeToSave === "audio" && quotedMessage2?.audioMessage?.directPath || typeToSave === "document" && quotedMessage2?.documentMessage?.directPath || null;
  const quotedRawUrl = typeToSave === "image" && quotedMessage2?.imageMessage?.url || typeToSave === "video" && quotedMessage2?.videoMessage?.url || typeToSave === "audio" && quotedMessage2?.audioMessage?.url || typeToSave === "document" && quotedMessage2?.documentMessage?.url || null;
  return {
    type: typeToSave,
    text: text4,
    caption,
    mediaUrl,
    rawUrl: rawUrl2,
    quotedRawUrl,
    needsDownload,
    mimeType,
    fileName,
    fileSize,
    isStoryReply: !!quotedMessage2,
    // Extract reaction data if present (Evolution API sends reactionMessage with key.id + emoji)
    reactionTargetId: message2?.reactionMessage?.key?.id || message2?.reaction?.key?.id || null,
    reactionEmoji: message2?.reactionMessage?.text || message2?.reaction?.emoji || null,
    reactionEmoji: message2 && typeof message2 === "object" && "reaction" in message2 ? message2.reaction?.emoji || null : null,
    // Campos extras que podem ser úteis
    ...base64 && { base64 },
    ...mediaKey && { mediaKey },
    ...directPath && { directPath }
  };
}
async function processEvolutionWebhook(body2) {
  try {
    console.log("4. [Evolution] \u{1F680} Iniciando processEvolutionWebhook");
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    let eventName = body2?.event || body2?.data?.event || "";
    if (!eventName && body2?.key) eventName = "messages.upsert";
    else if (!eventName && body2?.remoteJid) eventName = "messages.upsert";
    if (!eventName) return;
    const normalizedEvent = eventName.toLowerCase().replace(/[-.]/g, "_");
    if (normalizedEvent.includes("contact") || normalizedEvent === "contacts_update") {
      let remoteJid = body2?.data?.remoteJid || body2?.remoteJid || extractEvolutionRemoteJid(body2);
      if (!remoteJid && Array.isArray(body2)) remoteJid = body2[0]?.remoteJid;
      const fromNumber = normalizeInboundNumber2(remoteJid);
      if (!fromNumber) return;
      const pushName = body2?.data?.profileName || body2?.profileName || body2?.data?.name || body2?.name || null;
      await findOrCreateCustomerByPhone(fromNumber, pushName);
      return;
    }
    if (normalizedEvent === "messages_upsert" || normalizedEvent === "messages.upsert" || normalizedEvent === "send_message" || normalizedEvent === "send.message") {
      try {
        const data = body2?.data || body2;
        const messageData = data?.message || data?.messages?.[0] || body2 || {};
        const key = data?.key || messageData?.key || {};
        const messageContent = messageData?.message || messageData;
        let messageId = key?.id || data?.id || messageData?.id;
        if (!messageId) {
          messageId = `evo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.warn("[Evolution Webhook] \u26A0\uFE0F Message ID missing, using generated fallback:", messageId);
        }
        const remoteJid = key?.remoteJid || data?.remoteJid || messageData?.remoteJid || body2?.remoteJid || extractEvolutionRemoteJid(body2);
        const pushName = data?.pushName || data?.senderName || messageData?.pushName || body2?.pushName || body2?.sender?.name || body2?.sender?.pushName || body2?.data?.sender?.name;
        const fromMe = normalizedEvent === "send_message" || normalizedEvent === "send.message" ? true : key?.fromMe ?? data?.fromMe ?? messageData?.fromMe ?? body2?.fromMe;
        const messageTimestamp = data?.messageTimestamp || messageData?.timestamp || messageContent?.timestamp || Math.floor(Date.now() / 1e3);
        const rawMessageType = data?.messageType || null;
        if (!remoteJid) {
          console.log("[Evolution Webhook] Missing remoteJid, skipping");
          return;
        }
        const fromNumber = normalizeInboundNumber2(remoteJid);
        if (!fromNumber) return;
        const contextInfoForParse = data?.message?.contextInfo || data?.contextInfo || null;
        const parsed = parseEvolutionMessageContent(messageContent, rawMessageType, contextInfoForParse);
        let messageType2 = parsed.type;
        let reactionTargetId2 = parsed.reactionTargetId || null;
        let reactionEmoji2 = parsed.reactionEmoji || null;
        let messageText = parsed.text;
        const caption = parsed.caption;
        let mediaUrl = parsed.mediaUrl;
        let storyOverrideType = null;
        let storyOverrideMime = null;
        let storyOverrideUrl = null;
        const isSentByMe = fromMe === true || fromMe === "true" || fromMe === 1;
        console.log("5. [Evolution] fromMe check:", { isSentByMe, fromMe, fromNumber, messageType: messageType2 });
        if (!isSentByMe) {
          console.log("[Evolution Webhook] Received inbound message from:", fromNumber, "type:", messageType2);
        }
        const contextInfo = data?.contextInfo || data?.message?.contextInfo || {};
        const isStoryReply = contextInfo.remoteJid === "status@broadcast" && (contextInfo.quotedMessage?.imageMessage || contextInfo.quotedMessage?.videoMessage);
        console.log(
          "[STORY_RAW][UPSERT] event:",
          eventName,
          "| messageType:",
          messageType2,
          "| ctxRemoteJid:",
          contextInfo?.remoteJid,
          "| hasQuoted:",
          !!contextInfo?.quotedMessage,
          "| hasQuotedImg:",
          !!contextInfo?.quotedMessage?.imageMessage,
          "| hasQuotedVid:",
          !!contextInfo?.quotedMessage?.videoMessage,
          "| stanzaId:",
          contextInfo?.stanzaId,
          "| isStoryReply:",
          isStoryReply
        );
        console.log("[STORY_RAW][UPSERT] bodyPreview:", JSON.stringify(body2).slice(0, 800));
        if (isStoryReply) {
          console.log("[Evolution Webhook] \u{1F4D6} Story reply detected:", { messageId, stanzaId: contextInfo.stanzaId });
          try {
            const { downloadStoryMedia: downloadStoryMedia2 } = await Promise.resolve().then(() => (init_evolution_download(), evolution_download_exports));
            const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
            const quotedImage = contextInfo.quotedMessage?.imageMessage;
            const storyContext = {
              stanzaId: contextInfo.stanzaId || messageId,
              participant: contextInfo.participant || data?.key?.participant || data?.participant || "",
              mediaKey: quotedImage?.mediaKey || contextInfo.quotedMessage?.videoMessage?.mediaKey || null,
              directPath: quotedImage?.directPath || contextInfo.quotedMessage?.videoMessage?.directPath || null,
              quotedMessage: contextInfo.quotedMessage || null
            };
            const originalStoryId = storyContext.stanzaId;
            const isImage = !!quotedImage;
            storyOverrideMime = isImage ? "image/jpeg" : "video/mp4";
            const ext = isImage ? "jpg" : "mp4";
            const mediaBuffer = await downloadStoryMedia2(storyContext, messageId, data.instance || "Meu");
            if (mediaBuffer) {
              const fileName = `story-${originalStoryId}-${Date.now()}.${ext}`;
              const uploadResult = await uploadToR23(mediaBuffer.buffer, fileName, mediaBuffer.mimetype);
              storyOverrideUrl = uploadResult.url;
              storyOverrideType = isImage ? "image" : "video";
              console.log("[Evolution Webhook] \u2705 Story media uploaded:", {
                url: mediaUrl?.substring(0, 80),
                size: mediaBuffer.buffer.length,
                mime: mediaBuffer.mimetype,
                isThumbnail: mediaBuffer.isThumbnail
              });
              try {
                await db.insert(storyCache).values({
                  storyId: originalStoryId,
                  remoteJid: remoteJid || "",
                  fromNumber,
                  mediaUrl: storyOverrideUrl,
                  rawUrl: storyOverrideUrl,
                  mediaType: messageType2,
                  caption: messageText || null,
                  messageTimestamp: Math.floor(messageTimestamp)
                });
                console.log("[Evolution Webhook] \u2705 Story cached for future replies:", originalStoryId);
              } catch (cacheErr) {
                console.error("[Evolution Webhook] \u274C Failed to cache story:", cacheErr);
              }
            } else {
              console.log("[Evolution Webhook] \u26A0\uFE0F Story download failed, checking cache...");
              const storyCacheWindowStart = Math.floor(messageTimestamp) - 300;
              const cachedStory = await db.select().from(storyCache).where(
                (0, import_drizzle_orm51.and)(
                  (0, import_drizzle_orm51.eq)(storyCache.remoteJid, remoteJid || ""),
                  import_drizzle_orm51.sql`${storyCache.messageTimestamp} >= ${storyCacheWindowStart}`
                )
              ).orderBy((0, import_drizzle_orm51.desc)(storyCache.messageTimestamp)).limit(1);
              if (cachedStory?.[0]) {
                console.log("[Evolution Webhook] \u2705 Story resolved from cache:", cachedStory[0].storyId);
                storyOverrideUrl = cachedStory[0].mediaUrl;
                storyOverrideType = cachedStory[0].mediaType;
                if (messageType2 === "text" || messageType2 === "unknown") {
                  messageType2 = "image";
                }
                if (messageText) {
                  messageText = `\u{1F4F8} Respondeu ao seu story:
${messageText}`;
                }
              } else {
                console.log("[Evolution Webhook] \u26A0\uFE0F No cached story found, saving text only");
                messageType2 = "text";
                if (messageText) {
                  messageText = `\u{1F4F8} Respondeu ao seu story:
${messageText}`;
                }
              }
            }
          } catch (storyErr) {
            console.error("[Evolution Webhook] \u274C Story processing error:", storyErr);
          }
        }
        const mimeType = parsed.mimeType;
        if (parsed.needsDownload && parsed.rawUrl && !mediaUrl) {
          try {
            const { downloadWhatsAppMediaFromEvolution: downloadWhatsAppMediaFromEvolution2, downloadGenericMedia: downloadGenericMedia2, isWhatsAppCdnUrl: isWhatsAppCdnUrl3 } = await Promise.resolve().then(() => (init_evolution_download(), evolution_download_exports));
            const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
            const isWhatsAppCdn = isWhatsAppCdnUrl3(parsed.rawUrl);
            let mediaBuffer = null;
            let detectedMime = parsed.mimeType || "image/jpeg";
            if (isWhatsAppCdn) {
              mediaBuffer = await downloadWhatsAppMediaFromEvolution2({
                url: parsed.rawUrl,
                messageKey: { id: messageId, remoteJid, fromMe: false }
              });
            } else {
              const { downloadWithValidation: downloadWithValidation2 } = await Promise.resolve().then(() => (init_media_validator(), media_validator_exports));
              const validated = await downloadWithValidation2(parsed.rawUrl, {
                expectedMimeType: parsed.mimeType || void 0,
                maxRetries: 3
              });
              mediaBuffer = validated.buffer;
              detectedMime = validated.mimeType;
            }
            if (mediaBuffer) {
              const fileName = parsed.fileName || parsed.rawUrl.split("/").pop() || "whatsapp-media";
              const uploadResult = await uploadToR23(mediaBuffer, fileName, detectedMime);
              mediaUrl = cleanR2Url(uploadResult.url);
              console.log("[Evolution] \u2705 M\xEDdia validada e upada para R2:", { url: mediaUrl, etag: uploadResult.etag, size: uploadResult.size });
            }
          } catch (downloadErr) {
            console.error("[Evolution] \u274C Falha no download/upload validado:", downloadErr);
          }
        }
        const mediaKey = parsed.mediaKey;
        const directPath = parsed.directPath;
        const imageBase64 = parsed.base64;
        if (isSentByMe) {
          console.log("[Evolution Webhook] Detected fromMe message, enqueuing:", messageId, "to:", fromNumber);
          let fromMeMediaUrl = mediaUrl || null;
          let isThumbnail = false;
          if (!fromMeMediaUrl && (messageType2 === "image" || messageType2 === "video" || messageType2 === "audio" || messageType2 === "document") && (mediaKey || directPath || rawUrl || quotedMessage)) {
            try {
              console.log("[Evolution Webhook] fromMe media missing URL, attempting download via multiple strategies");
              const { downloadWhatsAppMediaFromEvolution: downloadWhatsAppMediaFromEvolution2 } = await Promise.resolve().then(() => (init_evolution_download(), evolution_download_exports));
              const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
              let mediaBuffer = null;
              let detectedMime = parsed.mimeType || "application/octet-stream";
              mediaBuffer = await downloadWhatsAppMediaFromEvolution2({
                url: rawUrl || "",
                messageKey: { id: messageId, remoteJid, fromMe: true },
                ...mediaKey && { mediaKey: String(mediaKey) },
                ...directPath && { directPath: String(directPath) }
              });
              if (!mediaBuffer && quotedMessage) {
                console.log("[Evolution Webhook] \u{1F504} Tentando downloadStoryMedia para fromMe");
                const { downloadStoryMedia: downloadStoryMedia2 } = await Promise.resolve().then(() => (init_evolution_download(), evolution_download_exports));
                const contextInfo2 = data?.contextInfo || data?.message?.contextInfo || {};
                const result = await downloadStoryMedia2({
                  stanzaId: contextInfo2.stanzaId || messageId,
                  participant: contextInfo2.participant || data?.key?.participant || "",
                  quotedMessage
                }, messageId, data.instance || "Meu");
                if (result) {
                  mediaBuffer = result.buffer;
                  detectedMime = result.mimetype;
                  isThumbnail = result.isThumbnail || false;
                }
              }
              if (!mediaBuffer && quotedMessage) {
                const quotedAny = quotedMessage;
                const thumbnail = quotedAny?.imageMessage?.jpegThumbnail || quotedAny?.videoMessage?.jpegThumbnail;
                if (thumbnail) {
                  mediaBuffer = Buffer.from(thumbnail, "base64");
                  detectedMime = "image/jpeg";
                  isThumbnail = true;
                  console.log("[Evolution Webhook] \u{1F4CE} Usando thumbnail fallback para fromMe");
                }
              }
              if (mediaBuffer && mediaBuffer.length > 0) {
                const extMap = {
                  image: "jpg",
                  video: "mp4",
                  audio: "ogg",
                  document: "pdf"
                };
                const ext = parsed.fileName?.split(".").pop() || extMap[messageType2] || "bin";
                const fromMeFileName = parsed.fileName || `sent-${messageId}.${ext}`;
                const fromMeMime = detectedMime;
                const uploadResult = await uploadToR23(mediaBuffer, fromMeFileName, fromMeMime);
                fromMeMediaUrl = cleanR2Url(uploadResult.url);
                console.log("[Evolution Webhook] \u2705 fromMe media uploaded to R2:", {
                  url: fromMeMediaUrl,
                  etag: uploadResult.etag,
                  size: uploadResult.size,
                  isThumbnail
                });
              } else {
                console.log("[Evolution Webhook] \u26A0\uFE0F fromMe download returned empty buffer");
              }
            } catch (err) {
              console.error("[Evolution Webhook] \u274C fromMe media download failed:", err.message);
            }
          }
          const isMediaType = messageType2 === "image" || messageType2 === "video";
          const isStoryCandidate = isMediaType && fromMeMediaUrl && fromMeMediaUrl.length > 0;
          if (isStoryCandidate) {
            try {
              await db.insert(storyCache).values({
                storyId: messageId,
                remoteJid: remoteJid || "",
                fromNumber,
                mediaUrl: fromMeMediaUrl,
                rawUrl: fromMeMediaUrl,
                mediaType: messageType2 === "video" ? "video" : "image",
                caption: caption || messageText || null,
                messageTimestamp: Math.floor(messageTimestamp)
              });
              console.log("[Evolution] \u2705 Story cached on send for future replies:", messageId);
            } catch (cacheErr) {
              console.error("[Evolution] \u274C Failed to cache story on send:", cacheErr);
            }
          }
          try {
            enqueueMobileSyncJob({
              remoteJid,
              messageId,
              messageText,
              caption,
              messageType: messageType2,
              mediaUrl: fromMeMediaUrl,
              mimeType,
              messageTimestamp,
              fileName: parsed.fileName || null
            });
          } catch (e) {
          }
          try {
            const existingOutbound = await db.query.conversationMessages.findFirst({
              where: (cm, { eq: eq50 }) => eq50(cm.externalId, messageId)
            });
            if (existingOutbound) {
              console.log("[Evolution Webhook] \u2705 Outbound already exists in conversation_messages, skipping:", messageId);
            } else {
              await ingestOutboundConversationMessage({
                provider: "whatsapp",
                toNumber: fromNumber,
                fromUserId: 1,
                messageType: messageType2,
                messageText: messageText || null,
                caption: caption || null,
                mediaUrl: fromMeMediaUrl || mediaUrl || null,
                mediaId: parsed.mediaId || null,
                mimeType: mimeType || null,
                fileName: parsed.fileName || null,
                fileSize: parsed.fileSize || null,
                externalId: messageId,
                createdAt: new Date(messageTimestamp * 1e3)
              });
              console.log("[Evolution Webhook] \u2705 Outbound message ingested:", messageId);
            }
          } catch (outboundErr) {
            console.error("[Evolution Webhook] \u274C Failed to ingest outbound:", outboundErr);
          }
          return;
        }
        const messageContext = data?.messageContext || data?.context || {};
        const messageStatus = messageContext?.status || data?.status || "notify";
        console.log("[Evolution Webhook] \u{1F4CA} Message status check:", {
          messageStatus,
          messageType: messageType2,
          fromNumber,
          fromMe: isSentByMe
        });
        console.log("6. [Evolution] \u{1F4CA} Message status check:", { messageStatus, messageType: messageType2, fromNumber });
        console.log("[Evolution Webhook] \u2705 Message approved, proceeding to ingest");
        console.log("7. [Evolution] \u2705 Processando mensagem (sem filtro de status)");
        if (messageType2 === "reaction" && reactionTargetId2 && reactionEmoji2) {
          try {
            const target = await db.query.conversationMessages.findFirst({
              where: (cm, { eq: eq50 }) => eq50(cm.externalId, reactionTargetId2)
            });
            if (target) {
              await db.update(conversationMessages).set({ reaction: reactionEmoji2 }).where((0, import_drizzle_orm51.eq)(conversationMessages.id, target.id));
              console.log("[Webhook] \u2705 Rea\xE7\xE3o " + reactionEmoji2 + " aplicada \xE0 mensagem " + reactionTargetId2);
            } else {
              console.log("[Webhook] \u26A0\uFE0F Mensagem original " + reactionTargetId2 + " n\xE3o encontrada para rea\xE7\xE3o");
            }
          } catch (reactionErr) {
            console.error("[Webhook] Erro ao aplicar rea\xE7\xE3o:", reactionErr);
          }
          return;
        }
        const existing = await getReceivedMessageByExternalId(messageId, "whatsapp");
        let profilePic = null;
        try {
          profilePic = await resolveProfilePic("whatsapp", fromNumber);
        } catch (picErr) {
          console.warn("[Evolution Webhook] Could not resolve profile pic:", picErr.message);
        }
        const messageValues = {
          provider: "whatsapp",
          externalId: messageId,
          fromNumber,
          fromName: pushName || null,
          fromProfilePic: profilePic,
          messageType: messageType2,
          messageText,
          mediaUrl: mediaUrl || null,
          mimeType: mimeType || null,
          caption,
          latitude: null,
          longitude: null,
          timestamp: messageTimestamp,
          rawPayload: JSON.stringify({ ...body2, mediaDownloaded: !!mediaUrl }),
          processed: 0,
          customerId: existing?.customerId || null
          // Manter customerId se já existir
        };
        if (existing) {
          await db.update(receivedMessages).set({
            fromName: pushName || null,
            fromProfilePic: profilePic || existing.fromProfilePic,
            messageText: messageText || existing.messageText,
            mediaUrl: mediaUrl || existing.mediaUrl,
            mimeType: storyOverrideMime || mimeType || existing.mimeType,
            caption: caption || existing.caption
          }).where((0, import_drizzle_orm51.eq)(receivedMessages.id, existing.id));
          console.log(`[Evolution Webhook] Updated existing message ${messageId}`);
        } else {
          await db.insert(receivedMessages).values(messageValues);
          console.log(`[Evolution Webhook] Inserted new message ${messageId}`);
        }
        const isPossibleSurveyResponse = messageType2 === "text" && messageText && /^\s*[1-5]\s*$/.test(messageText.trim());
        if (!isPossibleSurveyResponse) {
          console.log("8. [Evolution] \u{1F3AF} Chamando ingestInboundConversationMessage para", { fromNumber, messageType: messageType2 });
          await ingestInboundConversationMessage({
            provider: "whatsapp",
            fromNumber,
            fromName: pushName || null,
            messageType: storyOverrideType || messageType2,
            messageText,
            caption,
            mediaUrl: storyOverrideUrl || mediaUrl || null,
            mediaId: parsed.mediaId || null,
            mimeType: storyOverrideMime || mimeType,
            fileName: parsed.fileName,
            fileSize: parsed.fileSize,
            externalId: messageId
          });
          console.log("9. [Evolution] \u2705 ingestInboundConversationMessage conclu\xEDdo");
        } else {
          console.log("[Evolution] Pulando ingest (survey response)");
        }
      } catch (msgError) {
        console.error("[Evolution Webhook] \u274C Error in message processing:", msgError);
        console.error("[Evolution Webhook] Stack:", msgError instanceof Error ? msgError.stack : "N/A");
      }
      return;
    }
    if (normalizedEvent.includes("presence") || normalizedEvent === "status_update") {
      console.log(
        "[Evolution Webhook] Presence event ignored:",
        normalizedEvent
      );
      return;
    }
    if (normalizedEvent === "messages_update" || normalizedEvent === "messages.update") {
      const msgUpdateCtx = body2?.data?.contextInfo || body2?.contextInfo || {};
      const isStoryReplyUpdate = msgUpdateCtx.remoteJid === "status@broadcast" && (msgUpdateCtx.quotedMessage?.imageMessage || msgUpdateCtx.quotedMessage?.videoMessage);
      console.log(
        "[STORY_RAW][UPDATE] event:",
        eventName,
        "| dataKeys:",
        body2?.data ? Object.keys(body2.data).join(",") : "none",
        "| ctxKeys:",
        msgUpdateCtx ? Object.keys(msgUpdateCtx).join(",") : "none",
        "| ctxRemoteJid:",
        msgUpdateCtx?.remoteJid,
        "| hasQuoted:",
        !!msgUpdateCtx?.quotedMessage,
        "| isStoryReplyUpdate:",
        isStoryReplyUpdate
      );
      console.log("[STORY_RAW][UPDATE] bodyPreview:", JSON.stringify(body2).slice(0, 800));
      if (isStoryReplyUpdate) {
        console.log("[Evolution Webhook] \u{1F4D6} Story reply detected in messages.update");
      } else {
        const updateFromMe = body2?.data?.fromMe === true || body2?.data?.fromMe === "true" || body2?.data?.fromMe === 1;
        const updateStatus = body2?.data?.status || body2?.status;
        const updateKeyId = body2?.data?.keyId || body2?.data?.key?.id;
        if (updateFromMe && updateKeyId && (updateStatus === "DELIVERY_ACK" || updateStatus === 3 || updateStatus === "READ" || updateStatus === 4)) {
          console.log("[Evolution Webhook] \u{1F4E4} fromMe message detected in messages.update, key:", updateKeyId, "status:", updateStatus);
          const existingConv = await db.query.conversationMessages.findFirst({
            where: (cm, { eq: eq50 }) => eq50(cm.externalId, updateKeyId)
          });
          if (existingConv) {
            console.log("[Evolution Webhook] Message already in conversation_messages, skipping:", updateKeyId);
            return;
          }
          const existingUpdate = await getReceivedMessageByExternalId(updateKeyId, "whatsapp");
          if (existingUpdate) {
            console.log("[Evolution Webhook] Message already exists in DB:", updateKeyId);
            return;
          }
          let fullMsg = null;
          await new Promise((r) => setTimeout(r, 500));
          for (let attempt = 0; attempt < 3; attempt++) {
            fullMsg = await fetchMessageFromEvolution(updateKeyId);
            if (fullMsg) {
              if (attempt > 0) console.log("[Evolution Webhook] \u2705 Message fetched on retry:", attempt + 1);
              break;
            }
            console.log("[Evolution Webhook] \u23F3 Media not ready, retry in 500ms (attempt " + (attempt + 1) + "/3)");
            await new Promise((r) => setTimeout(r, 500));
          }
          if (!fullMsg) {
            console.log("[Evolution Webhook] Could not fetch full message from API, skipping");
            return;
          }
          const msgKey = fullMsg.key || {};
          const jidToUse = fullMsg.key?.remoteJidAlt || msgKey.remoteJidAlt || msgKey.remoteJid || body2?.data?.remoteJid || "";
          const toNumber = normalizeInboundNumber2(jidToUse);
          if (!toNumber) {
            console.log("[Evolution Webhook] Could not normalize number:", jidToUse);
            return;
          }
          const msgType = fullMsg.messageType || "conversation";
          const msgContent = fullMsg.message || {};
          let msgText = null;
          let caption = null;
          let mediaUrl = null;
          let mimeType = null;
          let fileName = null;
          if (msgContent.conversation) {
            msgText = msgContent.conversation;
          } else if (msgContent.extendedTextMessage?.text) {
            msgText = msgContent.extendedTextMessage.text;
          } else if (msgContent.imageMessage) {
            caption = msgContent.imageMessage.caption || null;
            mimeType = msgContent.imageMessage.mimetype || "image/jpeg";
          } else if (msgContent.videoMessage) {
            caption = msgContent.videoMessage.caption || null;
            mimeType = msgContent.videoMessage.mimetype || "video/mp4";
          } else if (msgContent.audioMessage) {
            mimeType = msgContent.audioMessage.mimetype || "audio/ogg";
          } else if (msgContent.documentMessage) {
            caption = msgContent.documentMessage.caption || null;
            mimeType = msgContent.documentMessage.mimetype || "application/octet-stream";
            fileName = msgContent.documentMessage.fileName || null;
          }
          try {
            const isMediaMsg = msgType === "imageMessage" || msgType === "videoMessage" || msgType === "audioMessage" || msgType === "documentMessage";
            if (isMediaMsg) {
              try {
                const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
                const EVO_URL2 = process.env.EVOLUTION_API_URL || "https://evolution-api-production-ffea.up.railway.app";
                const EVO_KEY2 = process.env.EVOLUTION_API_KEY || "7296ECE8D5DB-401B-8C39-2147777EA59B";
                const EVO_INSTANCE2 = process.env.EVOLUTION_INSTANCE_NAME || "Meu";
                console.log("[Evolution Webhook] Downloading outbound media via getBase64:", msgType, "key:", updateKeyId);
                const mediaResponse = await fetch(`${EVO_URL2}/chat/getBase64FromMediaMessage/${EVO_INSTANCE2}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "apikey": EVO_KEY2 },
                  body: JSON.stringify({
                    message: { key: fullMsg.key, message: fullMsg.message, messageTimestamp: fullMsg.messageTimestamp },
                    key: fullMsg.key
                  })
                });
                if (mediaResponse.ok) {
                  const mediaData = await mediaResponse.json();
                  if (mediaData.base64) {
                    const mediaBuffer = Buffer.from(mediaData.base64, "base64");
                    console.log("[Evolution Webhook] Media downloaded:", mediaBuffer.length, "bytes");
                    const extMap = { imageMessage: "jpg", videoMessage: "mp4", audioMessage: "ogg", documentMessage: "pdf" };
                    const ext = fileName ? fileName.split(".").pop() || extMap[msgType] : extMap[msgType] || "bin";
                    const mediaFileName = fileName || `sent-${updateKeyId}.${ext}`;
                    const uploadResult = await uploadToR23(mediaBuffer, mediaFileName, mediaData.mimetype || mimeType || "application/octet-stream");
                    mediaUrl = cleanR2Url(uploadResult.url);
                    console.log("[Evolution Webhook] \u2705 Outbound media uploaded to R2:", mediaUrl);
                  } else {
                    console.log("[Evolution Webhook] \u26A0\uFE0F No base64 in response");
                  }
                } else {
                  console.log("[Evolution Webhook] \u26A0\uFE0F getBase64 failed:", mediaResponse.status);
                }
              } catch (mediaErr) {
                console.error("[Evolution Webhook] \u274C Outbound media download failed:", mediaErr);
              }
            }
            await ingestOutboundConversationMessage({
              provider: "whatsapp",
              toNumber,
              fromUserId: 1,
              messageType: msgType,
              messageText: msgText,
              caption,
              mediaUrl,
              mediaId: fullMsg.id || null,
              mimeType,
              fileName,
              fileSize: null,
              externalId: updateKeyId,
              createdAt: fullMsg.messageTimestamp ? new Date(fullMsg.messageTimestamp * 1e3) : /* @__PURE__ */ new Date()
            });
            console.log("[Evolution Webhook] \u2705 Outbound message ingested from messages.update:", updateKeyId, "to:", toNumber);
          } catch (outboundErr) {
            console.error("[Evolution Webhook] \u274C Failed to ingest outbound from update:", outboundErr);
          }
          return;
        } else {
          console.log("[Evolution Webhook] Message status update ignored:", updateStatus, "fromMe:", updateFromMe);
          return;
        }
      }
    }
    if (normalizedEvent === "chats_update") {
      console.log("[Evolution Webhook] Chats update event received");
      return;
    }
    if (normalizedEvent === "connection_update") {
      console.log("[Evolution Webhook] Connection update event received");
      const payload = body2?.data || body2;
      const profileName = payload?.profileName || payload?.profile?.name || null;
      const profilePicture = payload?.profilePictureUrl || payload?.profile?.picture || null;
      console.log("[Evolution Webhook] Connection established:", {
        profileName,
        profilePicture
      });
      return;
    }
    console.log("[Evolution Webhook] Unhandled event type:", eventName);
  } catch (error) {
    console.error("[Evolution Webhook] Error processing webhook:", error);
    console.error(
      "[Evolution Webhook] Stack:",
      error instanceof Error ? error.stack : ""
    );
    throw error;
  }
}
async function validateWhatsAppSignature(rawBody, signature) {
  try {
    const db = await getDb();
    if (!db) return false;
    const config = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "whatsapp_business")).limit(1);
    if (config.length === 0) {
      console.log(
        "[WhatsApp Webhook] No configuration found, skipping signature validation"
      );
      return true;
    }
    const configData = typeof config[0].config === "string" ? JSON.parse(config[0].config) : config[0].config;
    const appSecret = configData.appSecret;
    if (!appSecret) {
      if (isProduction) {
        console.log(
          "[WhatsApp Webhook] No app secret configured in production"
        );
        return false;
      }
      console.log(
        "[WhatsApp Webhook] No app secret configured, skipping signature validation"
      );
      return true;
    }
    if (!rawBody) {
      console.log(
        "[WhatsApp Webhook] Missing raw body for signature validation"
      );
      return false;
    }
    const payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature = "sha256=" + import_crypto3.default.createHmac("sha256", appSecret).update(payloadBuffer).digest("hex");
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    return import_crypto3.default.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[WhatsApp Webhook] Signature validation error:", error);
    return false;
  }
}
async function validateInstagramSignature(rawBody, signature) {
  try {
    const db = await getDb();
    if (!db) return false;
    const config = await db.select().from(integrationSettings).where((0, import_drizzle_orm51.eq)(integrationSettings.integrationType, "instagram_graph")).limit(1);
    if (config.length === 0) {
      console.log(
        "[Instagram Webhook] No configuration found, skipping signature validation"
      );
      return true;
    }
    const configData = typeof config[0].config === "string" ? JSON.parse(config[0].config) : config[0].config;
    const appSecret = configData.appSecret;
    if (!appSecret) {
      if (isProduction) {
        console.log(
          "[Instagram Webhook] No app secret configured in production"
        );
        return false;
      }
      console.log(
        "[Instagram Webhook] No app secret configured, skipping signature validation"
      );
      return true;
    }
    if (!rawBody) {
      console.log(
        "[Instagram Webhook] Missing raw body for signature validation"
      );
      return false;
    }
    const payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const expectedSignature = "sha256=" + import_crypto3.default.createHmac("sha256", appSecret).update(payloadBuffer).digest("hex");
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    return import_crypto3.default.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[Instagram Webhook] Signature validation error:", error);
    return false;
  }
}
var webhooks_default = router4;

// server/routers-rest.ts
var import_express5 = require("express");
init_db();
init_schema();
var import_drizzle_orm52 = require("drizzle-orm");
init_messaging();
init_phone();
var restRouter = (0, import_express5.Router)();
restRouter.get("/contatos", async (req, res) => {
  try {
    const { telefone } = req.query;
    if (!telefone || typeof telefone !== "string") {
      return res.status(400).json({ error: "telefone query parameter required" });
    }
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const normalizedPhone = formatPhoneBR(telefone);
    const [customer2] = await db.select().from(customers).where((0, import_drizzle_orm52.eq)(customers.phone, normalizedPhone)).limit(1);
    if (customer2?.length === 0) {
      return res.json({ found: false });
    }
    return res.json({
      found: true,
      id: customer2[0].id,
      nome: customer2[0].name,
      telefone: customer2[0].phone,
      email: customer2[0].email
    });
  } catch (err) {
    console.error("[REST] /contatos error:", err);
    res.status(500).json({ error: err.message });
  }
});
restRouter.post("/contatos", async (req, res) => {
  try {
    const { nome, telefone, origem, email } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const normalizedPhone = telefone ? formatPhoneBR(telefone) : null;
    const result = await db.insert(customers).values({
      name: nome || "Cliente",
      phone: normalizedPhone || null,
      email: email || null,
      status: "active",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    const insertId = result[0]?.insertId || result.insertId;
    return res.json({ id: insertId, success: true });
  } catch (err) {
    console.error("[REST] POST /contatos error:", err);
    res.status(500).json({ error: err.message });
  }
});
restRouter.post("/mensagens/enviar", async (req, res) => {
  try {
    const { telefone, mensagem, nome } = req.body;
    if (!telefone || !mensagem) {
      return res.status(400).json({ error: "telefone and mensagem required" });
    }
    const normalizedPhone = formatPhoneBR(telefone);
    const result = await sendWhatsAppMessage({
      to: normalizedPhone,
      message: mensagem,
      customerName: nome
    });
    return res.json({
      success: true,
      externalId: result?.externalId || null,
      status: result?.status || "sent"
    });
  } catch (err) {
    console.error("[REST] /mensagens/enviar error:", err);
    res.status(500).json({ error: err.message });
  }
});
restRouter.post("/tarefas", async (req, res) => {
  try {
    const { titulo, descricao, contato_id, telefone, origem, timestamp: timestamp4, status = "open" } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const result = await db.insert(crmTasks).values({
      title: titulo || "Tarefa",
      description: descricao || null,
      status,
      assignedTo: null,
      // Será atribuído depois
      createdBy: null,
      relatedEntityType: "contact",
      relatedEntityId: contato_id || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    const taskId = result[0]?.insertId || result.insertId;
    return res.json({ id: taskId, success: true });
  } catch (err) {
    console.error("[REST] /tarefas error:", err);
    res.status(500).json({ error: err.message });
  }
});
restRouter.put("/atendimentos/atribuir", async (req, res) => {
  try {
    const { telefone, mensagem, agentId } = req.body;
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const normalizedPhone = formatPhoneBR(telefone);
    const [conv] = await db.select().from(conversations).where((0, import_drizzle_orm52.eq)(conversations.customerPhone, normalizedPhone)).limit(1);
    if (!conv?.length) {
      return res.status(404).json({ error: "Conversa n\xE3o encontrada" });
    }
    if (agentId) {
      await db.update(conversations).set({ assignedTo: agentId, status: "assigned" }).where((0, import_drizzle_orm52.eq)(conversations.id, conv[0].id));
    }
    return res.json({ success: true, conversationId: conv[0].id });
  } catch (err) {
    console.error("[REST] /atendimentos/atribuir error:", err);
    res.status(500).json({ error: err.message });
  }
});
restRouter.get("/feriados", async (req, res) => {
  try {
    const { ibge } = req.query;
    const nationalHolidays = [
      { date: "2026-01-01", name: "Confraterniza\xE7\xE3o Universal", type: "national" },
      { date: "2026-02-17", name: "Carnaval", type: "national" },
      { date: "2026-04-03", name: "Paix\xE3o de Cristo", type: "national" },
      { date: "2026-04-21", name: "Tiradentes", type: "national" },
      { date: "2026-05-01", name: "Dia do Trabalho", type: "national" },
      { date: "2026-09-07", name: "Independ\xEAncia do Brasil", type: "national" },
      { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" },
      { date: "2026-11-02", name: "Finados", type: "national" },
      { date: "2026-11-15", name: "Proclama\xE7\xE3o da Rep\xFAblica", type: "national" },
      { date: "2026-11-20", name: "Dia da Consci\xEAncia Negra", type: "national" },
      { date: "2026-12-25", name: "Natal", type: "national" }
    ];
    const spStateHolidays = ibge && String(ibge).startsWith("35") ? [
      { date: "2026-07-09", name: "Revolu\xE7\xE3o Constitucionalista", type: "state" },
      { date: "2026-12-30", name: "Corpus Christi", type: "state" }
    ] : [];
    const saoPauloHolidays = ibge === "3550308" ? [
      { date: "2026-01-25", name: "Ano Novo Paulista", type: "municipal" },
      { date: "2026-07-13", name: "Emancipa\xE7\xE3o de SP", type: "municipal" }
    ] : [];
    return res.json({
      ibge: ibge || null,
      holidays: [...nationalHolidays, ...spStateHolidays, ...saoPauloHolidays],
      count: nationalHolidays.length + spStateHolidays.length + saoPauloHolidays.length
    });
  } catch (err) {
    console.error("[REST] /feriados error:", err);
    res.status(500).json({ error: err.message });
  }
});

// server/whatsapp-pairing.ts
var import_express6 = require("express");
init_db();
init_schema();
var import_drizzle_orm53 = require("drizzle-orm");
var router5 = (0, import_express6.Router)();
router5.post("/pairing/code", async (req, res) => {
  try {
    const { instanceName, phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        error: "Phone number is required",
        example: { phoneNumber: "5511999999999" }
      });
    }
    const normalizedPhone = phoneNumber.replace(/\D/g, "").replace(/^55/, "");
    const fullPhone = normalizedPhone.length === 10 ? `55${normalizedPhone}` : normalizedPhone;
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm53.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    if (!config || !config.isActive) {
      return res.status(404).json({ error: "Evolution API not configured" });
    }
    const configData = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
    const apiUrl = configData.apiUrl?.replace(/\/$/, "");
    const apiKey = configData.apiKey || configData.accessToken;
    const instName = instanceName || configData.instanceName;
    if (!apiUrl || !apiKey || !instName) {
      return res.status(400).json({
        error: "Missing Evolution API configuration"
      });
    }
    const pairingUrl = `${apiUrl}/instance/connect/${instName}?number=${fullPhone}`;
    console.log("[Pairing] Calling Evolution API:", pairingUrl);
    const response = await fetch(pairingUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Pairing] Failed to generate code:", response.status, errorText);
      return res.status(response.status).json({
        error: "Failed to generate pairing code",
        details: errorText
      });
    }
    const data = await response.json();
    const pairingCode = data?.pairingCode || data?.code;
    if (!pairingCode) {
      console.error("[Pairing] No pairing code in response:", data);
      return res.status(500).json({
        error: "Invalid response from Evolution API",
        hint: "Make sure instance was created with the same phone number",
        data
      });
    }
    console.log(`[Pairing] Generated code for ${fullPhone}: ${pairingCode}`);
    res.json({
      success: true,
      pairingCode,
      instanceName: instName,
      phoneNumber: fullPhone,
      expiresIn: 300,
      // 5 minutes
      message: "Enter this code in WhatsApp: Linked Devices \u2192 Link with phone number"
    });
  } catch (error) {
    console.error("[Pairing] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
});
router5.post("/pairing/qr", async (req, res) => {
  try {
    const { instanceName } = req.body;
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm53.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    const configData = typeof config?.config === "string" ? JSON.parse(config.config) : config?.config;
    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;
    const instName = instanceName || configData?.instanceName;
    if (!apiUrl || !apiKey || !instName) {
      return res.status(400).json({ error: "Missing Evolution API configuration" });
    }
    const qrUrl = `${apiUrl}/instance/connect/${instName}`;
    const response = await fetch(qrUrl, {
      method: "GET",
      headers: {
        "apikey": apiKey
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to get QR code" });
    }
    const data = await response.json();
    res.json({
      success: true,
      qr: data?.base64 || data?.qrcode || data?.code,
      instanceName: instName
    });
  } catch (error) {
    console.error("[Pairing] QR error:", error);
    res.status(500).json({ error: "QR code fetch failed" });
  }
});
router5.get("/pairing/status/:instanceName", async (req, res) => {
  try {
    const { instanceName } = req.params;
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm53.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    const configData = typeof config?.config === "string" ? JSON.parse(config.config) : config?.config;
    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;
    const response = await fetch(
      `${apiUrl}/instance/connectionStatus/${instanceName || configData?.instanceName}`,
      {
        method: "GET",
        headers: {
          "apikey": apiKey
        }
      }
    );
    if (!response.ok) {
      return res.status(404).json({ error: "Instance not found" });
    }
    const data = await response.json();
    res.json({
      success: true,
      instanceName,
      connected: data?.state === "open" || data?.connected === true,
      state: data?.state || "unknown"
    });
  } catch (error) {
    console.error("[Pairing] Status check error:", error);
    res.status(500).json({ error: "Status check failed" });
  }
});
router5.delete("/pairing/logout/:instanceName", async (req, res) => {
  try {
    const { instanceName } = req.params;
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [config] = await db.select().from(integrationSettings).where((0, import_drizzle_orm53.eq)(integrationSettings.integrationType, "evolution_api")).limit(1);
    const configData = typeof config?.config === "string" ? JSON.parse(config.config) : config?.config;
    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;
    const response = await fetch(
      `${apiUrl}/instance/logout/${instanceName || configData?.instanceName}`,
      {
        method: "DELETE",
        headers: {
          "apikey": apiKey
        }
      }
    );
    res.json({
      success: true,
      message: "Instance logged out. You can pair again."
    });
  } catch (error) {
    console.error("[Pairing] Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});
var whatsapp_pairing_default = router5;

// server/index.ts
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_cors = __toESM(require("cors"), 1);
async function startServer() {
  console.log("[Server] Starting... (PID:", process.pid, ")");
  try {
    console.log("[DB] Connecting...");
    const db = await getDb();
    console.log("[DB] Connected successfully");
    console.log("[Migrations] Applying...");
    await applySqlMigrations();
    console.log("[Migrations] Applied successfully");
    try {
      const { sql: sql37 } = await import("drizzle-orm");
      await db.execute(sql37`CREATE TABLE IF NOT EXISTS internal_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        content TEXT NOT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      await db.execute(sql37`CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON internal_messages(conversation_id)`);
      await db.execute(sql37`CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient ON internal_messages(recipient_id, read_at)`);
      console.log("[DB] \u2705 internal_messages table ensured");
    } catch (tableErr) {
      console.warn("[DB] \u26A0\uFE0F Could not create internal_messages:", tableErr.message);
    }
    try {
      const [colRows] = await db.execute(import_drizzle_orm56.sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'source'`);
      if (!Array.isArray(colRows) || colRows.length === 0) {
        await db.execute(import_drizzle_orm56.sql`ALTER TABLE customers ADD COLUMN source VARCHAR(64) DEFAULT 'manual' AFTER status`);
        console.log("[DB] \u2705 customers.source column added");
      }
    } catch (colErr) {
      console.warn("[DB] \u26A0\uFE0F Could not add customers.source:", colErr.message);
    }
    try {
      const [picCols] = await db.execute(import_drizzle_orm56.sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'received_messages' AND column_name = 'from_profile_pic'`);
      if (!Array.isArray(picCols) || picCols.length === 0) {
        await db.execute(import_drizzle_orm56.sql`ALTER TABLE received_messages ADD COLUMN from_profile_pic LONGTEXT NULL AFTER from_name`);
        console.log("[DB] \u2705 received_messages.from_profile_pic column added");
      }
    } catch (picErr) {
      console.warn("[DB] \u26A0\uFE0F Could not add received_messages.from_profile_pic:", picErr.message);
    }
  } catch (error) {
    console.error("[Startup Error]", error);
    throw error;
  }
  const app = (0, import_express8.default)();
  app.use((0, import_helmet.default)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://farmafrancis.up.railway.app"],
        frameSrc: ["'self'", "https://*"],
        mediaSrc: ["'self'", "https://*"]
      }
    },
    frameguard: { action: "sameorigin" },
    hsts: process.env.NODE_ENV === "production",
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false
  }));
  const allowedOrigins = [
    process.env.PUBLIC_BASE_URL,
    // URL do frontend (Railway)
    "https://farmafrancis.up.railway.app",
    // Railway URL
    "http://localhost:5173",
    // Dev local
    "http://localhost:3000"
    // Dev local alt
  ].filter(Boolean);
  app.use((0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith(".up.railway.app")) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
    // Necessário pra cookies/auth do tRPC
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }));
  app.use((req, res, next) => {
    console.log("\u{1F7E1} [RAW]", req.method, req.url, "| headers:", JSON.stringify({
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      "user-agent": req.headers["user-agent"]?.substring(0, 50)
    }));
    next();
  });
  app.use(import_express8.default.json({ limit: "50mb" }));
  app.use((req, res, next) => {
    console.log("[BODY]", req.method, req.url, "| Body:", JSON.stringify(req.body).substring(0, 200));
    next();
  });
  app.use(import_express8.default.urlencoded({ limit: "50mb", extended: true }));
  app.use((0, import_cookie_parser.default)());
  const possiblePublicPaths = [
    import_path.default.resolve(process.cwd(), "dist/public"),
    import_path.default.resolve(process.cwd(), "client/dist"),
    import_path.default.resolve(__dirname, "../dist/public"),
    import_path.default.resolve(__dirname, "public"),
    "/app/dist/public",
    "/app/client/dist"
  ];
  let publicPath = null;
  for (const p of possiblePublicPaths) {
    const exists = require("fs").existsSync(p);
    console.log(`[Static] Checking: ${p} - ${exists ? "\u2705 EXISTS" : "\u274C NOT FOUND"}`);
    if (exists) {
      publicPath = p;
      break;
    }
  }
  if (publicPath) {
    console.log("[Static] \u2705 Serving from:", publicPath);
    app.use(import_express8.default.static(publicPath));
  } else {
    console.error("[Static] \u274C No static files found! Checked:", possiblePublicPaths);
    console.log("[Static] CWD:", process.cwd());
    console.log("[Static] __dirname:", __dirname);
  }
  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api/health/detail", health_default);
  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
  });
  app.get("/api/debug/headers", (req, res) => {
    res.json({
      headers: req.headers,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/debug/env", (req, res) => {
    res.json({
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      nodeEnv: process.env.NODE_ENV
    });
  });
  app.use("/api/trpc", (req, res, next) => {
    console.log("[tRPC]", req.method, req.url);
    next();
  });
  app.use(
    "/api/trpc",
    (0, import_express9.createExpressMiddleware)({
      router: appRouter,
      createContext
    })
  );
  app.use("/api/events", createSSERouter());
  app.use("/api/webhooks", webhooks_default);
  app.use("/api/media", routers_media_default);
  app.use("/api", whatsapp_pairing_default);
  app.use("/api", restRouter);
  const systemRestRouter = (init_system(), __toCommonJS(system_exports)).default;
  app.use("/api/system", systemRestRouter);
  app.get("/api/debug/db-tables", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const [result] = await db.execute(sql37`SHOW TABLES`);
      const tables = result.map((row) => Object.values(row)[0]);
      res.json({ tables: tables.sort(), count: tables.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/debug/db-columns/:table", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const tableName = req.params.table.replace(/[^a-z_]/gi, "");
      const [result] = await db.execute(sql37.raw(`DESCRIBE ${tableName}`));
      res.json({ table: tableName, columns: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/debug/visual-flows", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const [result] = await db.execute(sql37`SELECT id, name, is_active, template_type, created_at, LENGTH(flow_data) as flow_size FROM visual_flows WHERE is_active = 1 ORDER BY id DESC LIMIT 20`);
      res.json({ flows: result, count: result.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/debug/close-all-conversations", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const result = await db.execute(sql37`UPDATE conversations SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE status IN ('open', 'assigned')`);
      res.json({ success: true, closed: result.affectedRows || 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/debug/conversations-status", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const [statusCounts] = await db.execute(sql37`
        SELECT status, COUNT(*) as count, 
               SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned,
               SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned
        FROM conversations 
        GROUP BY status
      `);
      const [recentConvs] = await db.execute(sql37`
        SELECT id, customer_name, customer_phone, status, assigned_to, 
               last_message_at, unread_count, channel
        FROM conversations 
        WHERE status IN ('open', 'assigned')
        ORDER BY last_message_at DESC LIMIT 5
      `);
      const [recentMsgs] = await db.execute(sql37`
        SELECT cm.id, cm.conversation_id, cm.sender_type, cm.content, cm.created_at,
               cm.external_id
        FROM conversation_messages cm
        ORDER BY cm.created_at DESC LIMIT 5
      `);
      const sseUsers = sseManager.getConnectedUsers();
      res.json({
        statusCounts,
        recentConversations: recentConvs,
        recentMessages: recentMsgs,
        sseConnectedUsers: sseUsers,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
  app.get("/api/debug/users-and-fix", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const allUsers = await db.select().from(users);
      const [orphanRows] = await db.execute(sql37`SELECT COUNT(*) as cnt FROM conversations WHERE status = ${"open"} AND assigned_to IS NULL`);
      res.json({
        activeUsers: allUsers.map((u) => ({ id: u.id, name: u.displayName || u.name, role: u.role })),
        orphanedCount: orphanRows,
        sseConnectedUsers: sseManager.getConnectedUsers()
      });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
  app.post("/api/debug/fix-orphans", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql: sql37 } = await import("drizzle-orm");
      const allUsers = await db.select().from(users);
      const sseUsers = sseManager.getConnectedUsers();
      const connectedAdmin = sseUsers.length > 0 ? allUsers.find((u) => String(u.id) === sseUsers[0]) : null;
      const admin = connectedAdmin || allUsers.find((u) => u.role === "admin") || allUsers[0];
      if (!admin) {
        return res.json({ error: "No active agent found" });
      }
      const [result] = await db.execute(sql37`UPDATE conversations SET assigned_to = ${admin.id}, status = ${"assigned"} WHERE status = ${"open"} AND assigned_to IS NULL`);
      res.json({
        assignedTo: { id: admin.id, name: admin.displayName || admin.name, role: admin.role },
        result
      });
      app.get("/api/debug/webhook-token", (_2, res2) => {
        const token = process.env.WHATSAPP_VERIFY_TOKEN;
        if (!token) {
          return res2.json({ present: false });
        }
        return res2.json({ present: true, length: token.length, first: token[0], last: token[token.length - 1] });
      });
    } catch (err) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
  app.post("/api/conversations/:id/mark-read", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "DB unavailable" });
        return;
      }
      const conversationId2 = parseInt(req.params.id, 10);
      if (isNaN(conversationId2)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }
      await db.update(conversationMessages).set({ readAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm56.and)(
        (0, import_drizzle_orm56.eq)(conversationMessages.conversationId, conversationId2),
        (0, import_drizzle_orm56.eq)(conversationMessages.senderType, "customer"),
        import_drizzle_orm56.sql`${conversationMessages.readAt} IS NULL`
      ));
      await db.update(conversations).set({ unreadCount: 0 }).where((0, import_drizzle_orm56.eq)(conversations.id, conversationId2));
      res.json({ success: true });
    } catch (err) {
      console.error("[mark-read] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/broadcast/upload-temp-file", async (req, res) => {
    try {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        const rawBody = Buffer.concat(chunks);
        const contentType = req.headers["content-type"] || "";
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) {
          res.status(400).json({ error: "No boundary in multipart" });
          return;
        }
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = 0;
        while (true) {
          const idx = rawBody.indexOf(boundaryBuf, start);
          if (idx === -1) break;
          if (start > 0) {
            const partData = rawBody.slice(start, idx - 2);
            const headerEnd = partData.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              parts.push({
                headers: partData.slice(0, headerEnd).toString(),
                body: partData.slice(headerEnd + 4)
              });
            }
          }
          start = idx + boundaryBuf.length + 2;
        }
        let filePart = parts.find((p) => p.headers.includes("filename="));
        if (!filePart) {
          res.status(400).json({ error: "No file found in upload" });
          return;
        }
        const filenameMatch = filePart.headers.match(/filename="([^"]+)"/);
        const originalName = filenameMatch?.[1] || "file";
        const ctMatch = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i);
        const mimetype = ctMatch?.[1] || "application/octet-stream";
        let fileBuffer = filePart.body;
        if (fileBuffer.length >= 2 && fileBuffer[fileBuffer.length - 2] === 13 && fileBuffer[fileBuffer.length - 1] === 10) {
          fileBuffer = fileBuffer.slice(0, -2);
        }
        const { uploadToR2: uploadToR23 } = await Promise.resolve().then(() => (init_r2_client(), r2_client_exports));
        const result = await uploadToR23(fileBuffer, originalName, mimetype);
        res.json({
          fileUrl: result.url,
          fileName: originalName,
          fileType: mimetype,
          fileSize: fileBuffer.length
        });
      });
    } catch (err) {
      console.error("[broadcast/upload] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.use((req, res, next) => {
    console.log("[Request]", req.method, req.originalUrl || req.url);
    next();
  });
  app.get("*", (req, res) => {
    console.log("[SPA] Hit", req.method, req.originalUrl || req.url, req.path);
    if (!req.path.startsWith("/api")) {
      const possibleIndexPaths = [
        import_path.default.resolve(process.cwd(), "dist/public/index.html"),
        import_path.default.resolve(process.cwd(), "client/dist/index.html"),
        import_path.default.resolve(__dirname, "../dist/public/index.html"),
        import_path.default.resolve(__dirname, "public/index.html")
      ];
      let indexPath = null;
      for (const p of possibleIndexPaths) {
        if (require("fs").existsSync(p)) {
          indexPath = p;
          console.log("[SPA] Using index.html:", p);
          break;
        }
      }
      if (!indexPath) {
        console.error("[SPA] ERROR: index.html not found in:", possibleIndexPaths);
        return res.status(404).json({ error: "Frontend not found" });
      }
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("[SPA Fallback] File not found:", indexPath);
          res.status(404).json({ error: "Frontend not found" });
        }
      });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });
  const PORT = process.env.PORT || 3e3;
  console.log(`[Server] Attempting to listen on port ${PORT}...`);
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("[Server] \u2705 Successfully listening on port", PORT);
    console.log("[Server] Environment:", process.env.NODE_ENV || "development");
    console.log("[Server] Health check endpoint: /api/health");
    Promise.resolve().then(() => (init_broadcast_recovery(), broadcast_recovery_exports)).then(({ startBroadcastRecoveryWorker: startBroadcastRecoveryWorker2 }) => {
      startBroadcastRecoveryWorker2();
    }).catch((err) => {
      console.warn("[Server] \u26A0\uFE0F Failed to start broadcast recovery worker:", err.message);
    });
  });
  server.on("error", (error) => {
    console.error("[Server] \u274C Failed to start server:", error);
  });
}
startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
