import { useAuth } from "@/_core/hooks/useAuth";
import { LayoutDashboard, Users, MessageSquare, UsersRound, FileText, Mail, Zap, LogOut, Award, Gift, HardDrive, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useLayoutEffect } from "react";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "CRM", path: "/crm" },
  { icon: MessageSquare, label: "Atendimentos", path: "/tickets" },
  { icon: UsersRound, label: "Funcionários", path: "/employees" },
  { icon: FileText, label: "Relatórios", path: "/reports" },
  { icon: Mail, label: "Mensagens", path: "/messages" },
  { icon: Zap, label: "Automação", path: "/automation" },
  { icon: Gift, label: "Chá de Bebê", path: "/baby-shower" },
  { icon: Award, label: "Performance", path: "/agent-performance" },
  { icon: HardDrive, label: "Monitor do Sistema", path: "/settings/system" },
];

export function TopBar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (topBarRef.current) {
      const height = topBarRef.current.offsetHeight;
      document.documentElement.style.setProperty('--topbar-height', `${height}px`);
    }
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/login";
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div ref={topBarRef} className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <img src="/logo-farma-francis.jpg?v=2" alt="Farma Francis" className="h-8 md:h-12" />
        
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10 rounded-full"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                className={`relative h-10 w-10 rounded-full transition-all ${
                  isActive
                    ? "bg-[#3FA9D4] text-white hover:bg-[#3FA9D4]/90"
                    : "text-gray-600 hover:text-white hover:bg-[#D32F2F]"
                }`}
                onClick={() => setLocation(item.path)}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
              </Button>
            );
          })}
        </div>

        {/* Mobile menu dropdown (simulated) */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-md md:hidden">
            <div className="flex flex-col p-2 gap-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className={`justify-start gap-2 ${isActive ? "bg-[#3FA9D4] text-white" : "text-gray-600"}`}
                    onClick={() => { setLocation(item.path); setMobileMenuOpen(false); }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-gray-100">
                <Avatar className="h-10 w-10">
                  {user?.photo ? (
                    <AvatarImage src={user.photo} />
                  ) : (
                    <AvatarFallback className="bg-[#3FA9D4] text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}