import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, MessageSquare, Clock, TrendingUp, Smartphone, Globe, 
  Instagram, MessageCircle, Zap, Download, Upload, Send
} from "lucide-react";

interface DashboardCardsProps {
  darkMode: boolean;
}

export function DashboardCards({ darkMode }: DashboardCardsProps) {
  const cards = [
    {
      title: "Status da Automação",
      value: "Ativa",
      icon: <Activity className="w-5 h-5 text-green-600" />,
      badge: "Online",
      badgeColor: "bg-green-100 text-green-800",
      subtext: "Última atividade: há 2 min"
    },
    {
      title: "Atendimentos Automatizados Hoje",
      value: "127",
      icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
      badge: "+23%",
      badgeColor: "bg-blue-100 text-blue-800",
      subtext: "Média: 5.3/min"
    },
    {
      title: "Tempo Médio de Resposta",
      value: "1.2s",
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      badge: "-0.3s",
      badgeColor: "bg-purple-100 text-purple-800",
      subtext: "Meta: < 2.0s"
    },
    {
      title: "Conversões (Pedidos)",
      value: "43",
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      badge: "33.8%",
      badgeColor: "bg-emerald-100 text-emerald-800",
      subtext: "Conversão sobre atendimentos"
    }
  ];

  const channels = [
    { name: "WhatsApp", icon: <MessageSquare className="w-4 h-4" />, status: "Conectado", color: "text-green-600" },
    { name: "Instagram", icon: <Instagram className="w-4 h-4" />, status: "Conectado", color: "text-pink-600" },
    { name: "Site", icon: <Globe className="w-4 h-4" />, status: "Conectado", color: "text-blue-600" },
    { name: "App", icon: <Smartphone className="w-4 h-4" />, status: "Conectado", color: "text-gray-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{card.value}</span>
                <Badge className={card.badgeColor}>{card.badge}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">{card.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channels */}
      <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
        <CardHeader>
          <CardTitle className="text-base">Canais Conectados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {channels.map((ch, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <div className={ch.color}>{ch.icon}</div>
                <div>
                  <p className="font-medium text-sm">{ch.name}</p>
                  <p className="text-xs text-green-600">{ch.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
