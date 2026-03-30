import { router } from "../_core/trpc";
import { agentsRouter } from "../routers-agents";
import { automationRouter } from "../routers-automation";
import { broadcastRouter } from "../routers-broadcast";
import { conversationsRouter } from "../routers-conversations";
import { crmRouter } from "../routers-crm";
import { dashboardRouter } from "../routers-dashboard";
import { systemRouter } from "../routers-system";

export const appRouter = router({
  agents: agentsRouter,
  automation: automationRouter,
  broadcast: broadcastRouter,
  conversations: conversationsRouter,
  crm: crmRouter,
  dashboard: dashboardRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
