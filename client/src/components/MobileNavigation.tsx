import { useLocation } from "wouter";
import { Home, MessageSquare, Users, Settings, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const tabs: TabItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "messages", label: "Mensagens", icon: MessageSquare, path: "/messages" },
  { id: "contacts", label: "Contatos", icon: Users, path: "/crm" },
  {
    id: "broadcast",
    label: "Transmissão",
    icon: Megaphone,
    path: "/broadcast",
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings,
    path: "/settings/api",
  },
];

export function MobileNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = location === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => setLocation(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors duration-200",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <tab.icon className={cn("w-6 h-6 mb-1", isActive && "stroke-2")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
