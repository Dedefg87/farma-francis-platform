import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  Zap,
  Menu as MenuIcon,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Instagram,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FlowCardProProps {
  flow: {
    id: number;
    name: string;
    description?: string;
    isActive?: boolean;
    flowData?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type?: "visual" | "simple" | "ura";
  trigger?: string;
  channel?: string;
  executions?: {
    total: number;
    success: number;
    failed: number;
    lastRun?: string;
  };
  onClick: () => void;
  onToggle?: (isActive: boolean) => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isDuplicating?: boolean;
}

const typeConfig = {
  visual: {
    icon: Workflow,
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-50 to-indigo-50",
    label: "Fluxo Visual",
  },
  simple: {
    icon: Zap,
    gradient: "from-amber-500 to-orange-600",
    bgGradient: "from-amber-50 to-orange-50",
    label: "Automação",
  },
  ura: {
    icon: MenuIcon,
    gradient: "from-purple-500 to-violet-600",
    bgGradient: "from-purple-50 to-violet-50",
    label: "URA",
  },
};

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  universal: Zap,
  scheduled: Calendar,
};

export function FlowCardPro({
  flow,
  type = "visual",
  trigger,
  channel,
  executions,
  onClick,
  onToggle,
  onDuplicate,
  onExport,
  onDelete,
  isDuplicating,
}: FlowCardProProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const ChannelIcon = channel ? channelIcons[channel] || MessageSquare : MessageSquare;

  const successRate = executions?.total
    ? Math.round((executions.success / executions.total) * 100)
    : null;

  const lastRunText = executions?.lastRun
    ? getTimeAgo(executions.lastRun)
    : "Nunca executado";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer border-0",
        `bg-gradient-to-br ${config.bgGradient}`
      )}
      onClick={onClick}
    >
      {/* Gradient top bar */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", config.gradient)} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon with gradient background */}
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
                `bg-gradient-to-br ${config.gradient}`
              )}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {flow.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={flow.isActive ? "default" : "secondary"}
                  className={cn(
                    "text-xs font-medium",
                    flow.isActive
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {flow.isActive ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                      Ativo
                    </>
                  ) : (
                    "Inativo"
                  )}
                </Badge>
                {channel && (
                  <Badge variant="outline" className="text-xs">
                    <ChannelIcon className="h-3 w-3 mr-1" />
                    {channel}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onToggle && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onToggle(!flow.isActive);
                }}>
                  {flow.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Ativar
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }} disabled={isDuplicating}>
                  <Copy className="h-4 w-4 mr-2" />
                  {isDuplicating ? "Duplicando..." : "Duplicar"}
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onExport();
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {flow.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {flow.description}
          </p>
        )}

        {/* Stats */}
        {executions && executions.total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/60 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-gray-900">{executions.total}</div>
              <div className="text-xs text-gray-500">Execuções</div>
            </div>
            <div className="bg-white/60 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {executions.success}
              </div>
              <div className="text-xs text-gray-500">Sucesso</div>
            </div>
            <div className="bg-white/60 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-red-500 flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" />
                {executions.failed}
              </div>
              <div className="text-xs text-gray-500">Falhas</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200/50">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {lastRunText}
          </div>
          {successRate !== null && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    successRate >= 90
                      ? "bg-green-500"
                      : successRate >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${successRate}%` }}
                />
              </div>
              <span className="font-medium">{successRate}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR");
}
