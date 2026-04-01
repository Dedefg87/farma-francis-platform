import { router } from "../_core/trpc";
import { authRouter } from "../routers-auth";
import { agentsRouter } from "../routers-agents";
import { aiRouter } from "../routers-ai";
import { apiConfigRouter } from "../routers-api-config";
import { automationRouter } from "../routers-automation";
import { babyShowerRouter } from "../routers-baby-shower";
import { broadcastRouter } from "../routers-broadcast";
import { contactFetchRouter } from "../routers-contact-fetch";
import { conversationsRouter } from "../routers-conversations";
import { crmRouter } from "../routers-crm";
import { dashboardDrilldownRouter } from "../routers-dashboard-drilldown";
import { dashboardStatsRouter } from "../routers-dashboard-stats";
import { dashboardRouter } from "../routers-dashboard";
import { executionsRouter } from "../routers-executions";
import { inboxRouter } from "../routers-inbox";
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

export const appRouter = router({
  auth: authRouter,
  agents: agentsRouter,
  employees: agentsRouter,
  ai: aiRouter,
  apiConfig: apiConfigRouter,
  automation: automationRouter,
  babyShower: babyShowerRouter,
  broadcast: broadcastRouter,
  contactFetch: contactFetchRouter,
  conversations: conversationsRouter,
  crm: crmRouter,
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
});

export type AppRouter = typeof appRouter;
