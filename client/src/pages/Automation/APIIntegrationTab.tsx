import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, X, Phone, Instagram, Zap, QrCode, Send } from "lucide-react";
import QrCodeModal from "@/components/QrCodeModal";
import QuickRepliesSettingsTab from "@/components/QuickRepliesSettingsTab";

interface APIIntegrationTabProps {
  darkMode?: boolean;
}

export function APIIntegrationTab({ darkMode }: APIIntegrationTabProps) {
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappWebhook, setWhatsappWebhook] = useState("");
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState("");
  const [whatsappAppSecret, setWhatsappAppSecret] = useState("");

  const [instagramToken, setInstagramToken] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [instagramWebhook, setInstagramWebhook] = useState("");
  const [instagramVerifyToken, setInstagramVerifyToken] = useState("");
  const [instagramAppSecret, setInstagramAppSecret] = useState("");

  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionInstanceName, setEvolutionInstanceName] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramWebhook, setTelegramWebhook] = useState("");

  const utils = trpc.useUtils();

  const { data: whatsappConfig, isLoading: loadingWhatsapp } = trpc.apiConfig.get.useQuery({ integrationType: "whatsapp_business" });
  const { data: instagramConfig, isLoading: loadingInstagram } = trpc.apiConfig.get.useQuery({ integrationType: "instagram_graph" });
  const { data: evolutionConfig, isLoading: loadingEvolution } = trpc.apiConfig.get.useQuery({ integrationType: "evolution_api" });
  const { data: telegramConfig, isLoading: loadingTelegram } = trpc.apiConfig.get.useQuery({ integrationType: "telegram" });

  const saveWhatsapp = trpc.apiConfig.save.useMutation({
    onSuccess: () => { toast.success("WhatsApp salvo!"); utils.apiConfig.get.invalidate({ integrationType: "whatsapp_business" }); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const saveInstagram = trpc.apiConfig.save.useMutation({
    onSuccess: () => { toast.success("Instagram salvo!"); utils.apiConfig.get.invalidate({ integrationType: "instagram_graph" }); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const saveEvolution = trpc.apiConfig.save.useMutation({
    onSuccess: () => { toast.success("Evolution salvo!"); utils.apiConfig.get.invalidate({ integrationType: "evolution_api" }); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const saveTelegram = trpc.apiConfig.save.useMutation({
    onSuccess: () => { toast.success("Telegram salvo!"); utils.apiConfig.get.invalidate({ integrationType: "telegram" }); },
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const testWhatsapp = trpc.apiConfig.test.useMutation({
    onSuccess: d => toast.success(d.message, { description: d.data ? `Número: ${d.data.phoneNumber}` : undefined }),
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const testInstagram = trpc.apiConfig.test.useMutation({
    onSuccess: d => toast.success(d.message, { description: d.data ? `@${d.data.username}` : undefined }),
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const testEvolution = trpc.apiConfig.test.useMutation({
    onSuccess: d => toast.success(d.message, { description: d.data ? `${d.data.instances} instância(s)` : undefined }),
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  const testTelegram = trpc.apiConfig.test.useMutation({
    onSuccess: d => toast.success(d.message, { description: d.data ? `@${d.data.botUsername}` : undefined }),
    onError: e => toast.error(`Erro: ${e.message}`),
  });

  useEffect(() => {
    if (whatsappConfig?.config) {
      const c = whatsappConfig.config as any;
      setWhatsappToken(c.accessToken || "");
      setWhatsappPhoneId(c.phoneNumberId || "");
      setWhatsappWebhook(c.webhookUrl || "");
      setWhatsappVerifyToken(c.webhookVerifyToken || "");
      setWhatsappAppSecret(c.appSecret || "");
    }
  }, [whatsappConfig]);

  useEffect(() => {
    if (instagramConfig?.config) {
      const c = instagramConfig.config as any;
      setInstagramToken(c.accessToken || "");
      setInstagramAccountId(c.businessAccountId || "");
      setInstagramWebhook(c.webhookUrl || "");
      setInstagramVerifyToken(c.webhookVerifyToken || "");
      setInstagramAppSecret(c.appSecret || "");
    }
  }, [instagramConfig]);

  useEffect(() => {
    if (evolutionConfig?.config) {
      const c = evolutionConfig.config as any;
      setEvolutionApiUrl(c.apiUrl || "");
      setEvolutionApiKey(c.apiKey || "");
      setEvolutionInstanceName(c.instanceName || "");
    }
  }, [evolutionConfig]);

  useEffect(() => {
    if (telegramConfig?.config) {
      const c = telegramConfig.config as any;
      setTelegramBotToken(c.botToken || c.accessToken || "");
      setTelegramWebhook(c.webhookUrl || "");
    }
  }, [telegramConfig]);

  const handleSaveWhatsapp = () => {
    if (!whatsappToken || !whatsappPhoneId) return toast.error("Preencha token e Phone ID");
    saveWhatsapp.mutate({ integrationType: "whatsapp_business", name: "WhatsApp Business API", accessToken: whatsappToken, phoneNumberId: whatsappPhoneId, webhookUrl: whatsappWebhook, webhookVerifyToken: whatsappVerifyToken, appSecret: whatsappAppSecret, isActive: true });
  };

  const handleTestWhatsapp = () => {
    if (!whatsappToken || !whatsappPhoneId) return toast.error("Preencha token e Phone ID");
    testWhatsapp.mutate({ integrationType: "whatsapp_business", accessToken: whatsappToken, phoneNumberId: whatsappPhoneId });
  };

  const handleSaveInstagram = () => {
    if (!instagramToken || !instagramAccountId) return toast.error("Preencha token e Account ID");
    saveInstagram.mutate({ integrationType: "instagram_graph", name: "Instagram Graph API", accessToken: instagramToken, businessAccountId: instagramAccountId, webhookUrl: instagramWebhook, webhookVerifyToken: instagramVerifyToken, appSecret: instagramAppSecret, isActive: true });
  };

  const handleTestInstagram = () => {
    if (!instagramToken || !instagramAccountId) return toast.error("Preencha token e Account ID");
    testInstagram.mutate({ integrationType: "instagram_graph", accessToken: instagramToken, businessAccountId: instagramAccountId });
  };

  const handleSaveEvolution = () => {
    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) return toast.error("Preencha todos campos");
    saveEvolution.mutate({ integrationType: "evolution_api", name: "Evolution API", apiUrl: evolutionApiUrl, apiKey: evolutionApiKey, instanceName: evolutionInstanceName, isActive: true });
  };

  const handleTestEvolution = () => {
    if (!evolutionApiUrl || !evolutionApiKey) return toast.error("Preencha URL e API Key");
    testEvolution.mutate({ integrationType: "evolution_api", accessToken: evolutionApiKey, apiUrl: evolutionApiUrl });
  };

  const handleOpenQrModal = () => {
    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) return toast.error("Preencha todos campos");
    setShowQrModal(true);
  };

  const handleSaveTelegram = () => {
    if (!telegramBotToken) return toast.error("Preencha Bot Token");
    saveTelegram.mutate({ integrationType: "telegram", name: "Telegram Bot", botToken: telegramBotToken, webhookUrl: telegramWebhook, isActive: true });
  };

  const handleTestTelegram = () => {
    if (!telegramBotToken) return toast.error("Preencha Bot Token");
    testTelegram.mutate({ integrationType: "telegram", accessToken: telegramBotToken });
  };

  const inputClass = `h-8 text-xs mt-1 ${darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : ""}`;
  const labelClass = `text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`;

  return (
    <>
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Integrações de API
        </h3>

        {/* WhatsApp */}
        <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-sm">WhatsApp Business API</CardTitle>
                <CardDescription className="text-xs">Configure token e credenciais WhatsApp</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingWhatsapp ? <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <>
                <div className="space-y-1">
                  <Label className={labelClass}>Access Token *</Label>
                  <Input type="password" placeholder="EAAxxxxxxxxxx" value={whatsappToken} onChange={e => setWhatsappToken(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Phone Number ID *</Label>
                  <Input placeholder="123456789012345" value={whatsappPhoneId} onChange={e => setWhatsappPhoneId(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Webhook URL</Label>
                  <Input placeholder="/api/webhooks/whatsapp" value={whatsappWebhook} onChange={e => setWhatsappWebhook(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSaveWhatsapp} disabled={saveWhatsapp.isPending} className="h-7 text-xs">
                    {saveWhatsapp.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTestWhatsapp} disabled={testWhatsapp.isPending} className="h-7 text-xs">
                    Testar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instagram */}
        <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                <Instagram className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Instagram Graph API</CardTitle>
                <CardDescription className="text-xs">Configure token e credenciais Instagram</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingInstagram ? <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <>
                <div className="space-y-1">
                  <Label className={labelClass}>Access Token *</Label>
                  <Input type="password" placeholder="EAAxxxxxxxxxx" value={instagramToken} onChange={e => setInstagramToken(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Business Account ID *</Label>
                  <Input placeholder="17841400000000000" value={instagramAccountId} onChange={e => setInstagramAccountId(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Webhook URL</Label>
                  <Input placeholder="/api/webhooks/instagram" value={instagramWebhook} onChange={e => setInstagramWebhook(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSaveInstagram} disabled={saveInstagram.isPending} className="h-7 text-xs">
                    {saveInstagram.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTestInstagram} disabled={testInstagram.isPending} className="h-7 text-xs">
                    Testar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Evolution API */}
        <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Evolution API</CardTitle>
                <CardDescription className="text-xs">Configure URL e API Key para WhatsApp</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingEvolution ? <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <>
                <div className="space-y-1">
                  <Label className={labelClass}>API URL *</Label>
                  <Input placeholder="https://api.evolution.com.br" value={evolutionApiUrl} onChange={e => setEvolutionApiUrl(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>API Key *</Label>
                  <Input type="password" placeholder="sua-api-key" value={evolutionApiKey} onChange={e => setEvolutionApiKey(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Instance Name *</Label>
                  <Input placeholder="main" value={evolutionInstanceName} onChange={e => setEvolutionInstanceName(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSaveEvolution} disabled={saveEvolution.isPending} className="h-7 text-xs">
                    {saveEvolution.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTestEvolution} disabled={testEvolution.isPending} className="h-7 text-xs">
                    Testar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleOpenQrModal} disabled={!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName} className="h-7 text-xs">
                    <QrCode className="w-3 h-3 mr-1" /> QR
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/20 rounded-lg">
                <Send className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Telegram Bot</CardTitle>
                <CardDescription className="text-xs">Configure token do bot Telegram</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingTelegram ? <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <>
                <div className="space-y-1">
                  <Label className={labelClass}>Bot Token *</Label>
                  <Input type="password" placeholder="123456789:ABCdef..." value={telegramBotToken} onChange={e => setTelegramBotToken(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className={labelClass}>Webhook URL (opcional)</Label>
                  <Input placeholder="/api/webhooks/telegram" value={telegramWebhook} onChange={e => setTelegramWebhook(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSaveTelegram} disabled={saveTelegram.isPending} className="h-7 text-xs">
                    {saveTelegram.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleTestTelegram} disabled={testTelegram.isPending} className="h-7 text-xs">
                    Testar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <QrCodeModal open={showQrModal} onOpenChange={setShowQrModal} apiUrl={evolutionApiUrl} apiKey={evolutionApiKey} instanceName={evolutionInstanceName} />
      </div>
    </>
  );
}