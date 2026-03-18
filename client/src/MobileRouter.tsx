import { useIsMobile } from "@/hooks/useMobile";
import { AppRoutes } from "./AppRoutes";
import { MobileNavigation } from "./components/MobileNavigation";

export function MobileRouter() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="mobile-container min-h-screen flex flex-col">
        <main className="flex-1 overflow-y-auto pb-16">
          <AppRoutes />
        </main>
        <MobileNavigation />
      </div>
    );
  }

  return <AppRoutes />;
}
