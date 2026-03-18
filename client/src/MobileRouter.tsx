import { useIsMobile } from "@/hooks/useMobile";
import { AppRoutes } from "./AppRoutes";
import { MobileNavigation } from "./components/MobileNavigation";
import AgentTopBar from "./components/AgentTopBar";

export function MobileRouter() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <AgentTopBar compact />
        <main className="flex-1 overflow-y-auto pb-16">
          <AppRoutes />
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return <AppRoutes />;
}
