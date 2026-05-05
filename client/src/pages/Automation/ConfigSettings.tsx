import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, Key, Globe, Webhook, FileText, TestTube, 
  Bell, Shield, Database, Link2 
} from "lucide-react";

interface ConfigSettingsProps {
  darkMode: boolean;
}

export function ConfigSettings({ darkMode }: ConfigSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Configurações Avançadas
        </h3>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule" className="text-xs">Horários</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Regras</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API/Webhooks</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Atendimento Automático Ativo</Label>
                <Switch defaultChecked />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Abertura</Label>
                  <Input type="time" defaultValue="08:00" className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Fechamento</Label>
                  <Input type="time" defaultValue="22:00" className="h-8 text-xs mt-1" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Atendimento 24/7 (Feriados)</Label>
                <Switch />
              </div>
              <Badge variant="outline" className="text-xs">
                Fuso: America/Sao_Paulo (GMT-3)
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                Regras de Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Palavras-chave Personalizadas</Label>
                <Input 
                  placeholder="Ex: urgente, dor, emergência, febre" 
                  className="h-8 text-xs mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separe por vírgulas. Mensagens com estas palavras terão prioridade.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Priorizar Clientes VIP</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Direcionar Receitas para Farmacêutico</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Integração com API Externa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">URL da API</Label>
                <Input 
                  placeholder="https://api.exemplo.com" 
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Token de Autenticação</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-8 text-xs mt-1"
                />
              </div>
              <Button size="sm" variant="outline" className="w-full">
                <Link2 className="w-3 h-3 mr-2" />
                Testar Conexão
              </Button>
            </CardContent>
          </Card>

          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">URL do Webhook (Pedidos)</Label>
                <Input 
                  placeholder="https://seu-sistema.com/webhook" 
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Notificar novo pedido</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Notificar estoque baixo</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Logs Detalhados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ativar Logs de Debug</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Salvar Histórico de Conversas</Label>
                <Switch defaultChecked />
              </div>
              <Button size="sm" variant="outline" className="w-full">
                <TestTube className="w-3 h-3 mr-2" />
                Teste de Fluxo em Tempo Real
              </Button>
              <div className={`p-3 rounded text-xs font-mono ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className="text-green-600">✓ Webhook conectado</p>
                <p className="text-blue-600">→ Fluxo "Atendimento Inicial" executado</p>
                <p className="text-gray-500">→ Cliente: 55119...</p>
                <p className="text-green-600">✓ Resposta enviada em 1.2s</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
