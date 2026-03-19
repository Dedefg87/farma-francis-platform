import { useIsMobile } from "@/hooks/useMobile";
import { AppRoutes } from "./AppRoutes";
import AgentTopBar from "./components/AgentTopBar";

export function MobileRouter() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <AgentTopBar compact />
        <main className="flex-1 overflow-y-auto">
          <AppRoutes />
        </main>
      </div>
    );
  }

  return <AppRoutes />;
}
