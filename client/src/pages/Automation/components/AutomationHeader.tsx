import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Workflow,
  Sparkles,
  Upload,
  Zap,
  ChevronDown,
  Download,
} from "lucide-react";

interface AutomationHeaderProps {
  onSearch: (query: string) => void;
  onCreateFlow: () => void;
  onCreateSimple?: () => void;
  onImport?: () => void;
  onUseTemplate?: () => void;
  onExport?: () => void;
  totalFlows: number;
  activeFlows: number;
}

export function AutomationHeader({
  onSearch,
  onCreateFlow,
  onCreateSimple,
  onImport,
  onUseTemplate,
  onExport,
  totalFlows,
  activeFlows,
}: AutomationHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="p-6">
        {/* Title and Stats */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Workflow className="h-5 w-5 text-white" />
              </div>
              Automações
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie fluxos visuais, chatbots e URA em um só lugar
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalFlows}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeFlows}</div>
              <div className="text-xs text-gray-500">Ativos</div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar fluxos por nome, descrição ou trigger..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Create Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Criar Automação
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onCreateFlow} className="py-3">
                <Workflow className="h-5 w-5 mr-3 text-blue-600" />
                <div>
                  <div className="font-medium">Fluxo Visual</div>
                  <div className="text-xs text-gray-500">Arrastar e soltar</div>
                </div>
              </DropdownMenuItem>
              {onUseTemplate && (
                <DropdownMenuItem onClick={onUseTemplate} className="py-3">
                  <Sparkles className="h-5 w-5 mr-3 text-amber-600" />
                  <div>
                    <div className="font-medium">Usar Template</div>
                    <div className="text-xs text-gray-500">Começar com modelo pronto</div>
                  </div>
                </DropdownMenuItem>
              )}
              {onImport && (
                <DropdownMenuItem onClick={onImport} className="py-3">
                  <Upload className="h-5 w-5 mr-3 text-green-600" />
                  <div>
                    <div className="font-medium">Importar N8N/JSON</div>
                    <div className="text-xs text-gray-500">De outro sistema</div>
                  </div>
                </DropdownMenuItem>
              )}
              {onCreateSimple && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCreateSimple} className="py-3">
                    <Zap className="h-5 w-5 mr-3 text-orange-600" />
                    <div>
                      <div className="font-medium">Automação Simples</div>
                      <div className="text-xs text-gray-500">Trigger → Ação</div>
                    </div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
