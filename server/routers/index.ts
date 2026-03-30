import { router } from "../_core/trpc";

// Importar todos os routers antigos (arquivos routers-*.ts)
import { agentRouter as agents } from "../routers-agents";
import { authRouter as auth } from "../routers-automation"; // Ajustar conforme necessário
import { automationRouter as automation } from "../routers-automation";
import { broadcastRouter as broadcast } from "../routers-broadcast";
import { conversationsRouter as conversations } from "../routers-conversations";
import { crmRouter as crm } from "../routers-crm";
import { dashboardRouter as dashboard } from "../routers-dashboard";
import { systemRouter as system } from "../routers-system";

export const appRouter = router({
  agents,
  auth,
  automation,
  broadcast,
  conversations,
  crm,
  dashboard,
  system,
});

export type AppRouter = typeof appRouter;
