import { Button } from "@/components/ui/button";
import { 
  Info, ExternalLink, Shield, FileText, 
  Github, MessageCircle 
} from "lucide-react";

interface FooterProps {
  darkMode: boolean;
  version: string;
  lastUpdate: string;
}

export function Footer({ darkMode, version, lastUpdate }: FooterProps) {
  return (
    <footer className={`border-t py-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left - Version & Update */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Versão: <strong>{version}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>Atualizado: {lastUpdate}</span>
          </div>
        </div>

        {/* Center - Links */}
        <div className="flex items-center gap-3">
          <Button variant="link" size="sm" className="text-xs h-auto p-0">
            <MessageCircle className="w-3 h-3 mr-1" />
            Suporte
            <ExternalLink className="w-2 h-2 ml-1" />
          </Button>
          <Button variant="link" size="sm" className="text-xs h-auto p-0">
            <Shield className="w-3 h-3 mr-1" />
            Privacidade
          </Button>
          <Button variant="link" size="sm" className="text-xs h-auto p-0">
            <Github className="w-3 h-3 mr-1" />
            GitHub
          </Button>
        </div>

        {/* Right - Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Sistema Online</span>
        </div>
      </div>
    </footer>
  );
}
