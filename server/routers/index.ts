import { router } from "../_core/trpc";
import { authRouter } from "../routers-auth";
import { agentsRouter } from "../routers-agents";
import { customersRouter } from "../routers-crm";
import { aiRouter } from "../routers-ai";
import { apiConfigRouter } from "../routers-api-config";
import { automationRouter } from "../routers-automation";
import { babyShowerRouter } from "../routers-baby-shower";
import { broadcastRouter } from "../routers-broadcast";
import { contactFetchRouter } from "../routers-contact-fetch";
import { conversationsRouter } from "../routers-conversations";
import { clientsRouter } from "../routers-clients";
import { dashboardDrilldownRouter } from "../routers-dashboard-drilldown";
import { dashboardStatsRouter } from "../routers-dashboard-stats";
import { dashboardRouter } from "../routers-dashboard";
import { executionsRouter } from "../routers-executions";
import { employeesRouter } from "../routers-employees";
import { inboxRouter } from "../routers-inbox";
import { leadsRouter } from "../routers-leads";
import { logsRouter } from "../routers-logs";
import { messagesRouter } from "../routers-messages";
import { migrationRouter } from "../routers-migration";
import { pausesRouter } from "../routers-pauses";
import { queuesRouter } from "../routers-queues";
import { quickRepliesRouter } from "../routers-quick-replies";
import { surveyRouter } from "../routers-survey";
import { systemRouter } from "../routers-system";
import { tagsRouter } from "../routers-tags";
import { telemetryRouter } from "../routers-telemetry";
import { testRouter } from "../routers-test";
import { approvalsRouter } from "../routers-approvals";
import { internalMessagesRouter } from "../routers-internal-messages";
import { ticketsRouter } from "../routers-tickets";
import { businessHoursRouter } from "../routers-business-hours";

export const appRouter = router({
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
  survey: surveyRouter,
  system: systemRouter,
  tags: tagsRouter,
  telemetry: telemetryRouter,
  test: testRouter,
  approvals: approvalsRouter,
  internalMessages: internalMessagesRouter,
  tickets: ticketsRouter,
  businessHours: businessHoursRouter,
});

export type AppRouter = typeof appRouter;
