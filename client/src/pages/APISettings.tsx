import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, X, Phone, Instagram, Zap, QrCode, Send } from "lucide-react";
import FarmaDashboardLayout from "@/components/FarmaDashboardLayout";
import QrCodeModal from "@/components/QrCodeModal";
import QuickRepliesSettingsTab from "@/components/QuickRepliesSettingsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function APISettings() {
  // WhatsApp Business API
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappWebhook, setWhatsappWebhook] = useState("");
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState("");
  const [whatsappAppSecret, setWhatsappAppSecret] = useState("");

  // Instagram Graph API
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [instagramWebhook, setInstagramWebhook] = useState("");
  const [instagramVerifyToken, setInstagramVerifyToken] = useState("");
  const [instagramAppSecret, setInstagramAppSecret] = useState("");

  // Evolution API
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionInstanceName, setEvolutionInstanceName] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  // Telegram Bot
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramWebhook, setTelegramWebhook] = useState("");

  const utils = trpc.useUtils();

  // Queries - Carregar configurações existentes
  const { data: whatsappConfig, isLoading: loadingWhatsapp } =
    trpc.apiConfig.get.useQuery({
      integrationType: "whatsapp_business",
    });

  const { data: instagramConfig, isLoading: loadingInstagram } =
    trpc.apiConfig.get.useQuery({
      integrationType: "instagram_graph",
    });

  const { data: evolutionConfig, isLoading: loadingEvolution } =
    trpc.apiConfig.get.useQuery({
      integrationType: "evolution_api",
    });

  const { data: telegramConfig, isLoading: loadingTelegram } =
    trpc.apiConfig.get.useQuery({
      integrationType: "telegram",
    });

  // Mutations - Salvar configurações
  const saveWhatsapp = trpc.apiConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração do WhatsApp salva com sucesso!");
      utils.apiConfig.get.invalidate({ integrationType: "whatsapp_business" });
    },
    onError: error => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const saveInstagram = trpc.apiConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração do Instagram salva com sucesso!");
      utils.apiConfig.get.invalidate({ integrationType: "instagram_graph" });
    },
    onError: error => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const saveEvolution = trpc.apiConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração da Evolution API salva com sucesso!");
      utils.apiConfig.get.invalidate({ integrationType: "evolution_api" });
    },
    onError: error => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const saveTelegram = trpc.apiConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração do Telegram salva com sucesso!");
      utils.apiConfig.get.invalidate({ integrationType: "telegram" });
    },
    onError: error => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Mutations - Testar conexão
  const testWhatsapp = trpc.apiConfig.test.useMutation({
    onSuccess: data => {
      toast.success(data.message, {
        description: data.data
          ? `Número: ${data.data.phoneNumber}\nNome: ${data.data.verifiedName}`
          : undefined,
      });
    },
    onError: error => {
      toast.error(`Erro ao testar: ${error.message}`);
    },
  });

  const testInstagram = trpc.apiConfig.test.useMutation({
    onSuccess: data => {
      toast.success(data.message, {
        description: data.data
          ? `@${data.data.username} (${data.data.name})`
          : undefined,
      });
    },
    onError: error => {
      toast.error(`Erro ao testar: ${error.message}`);
    },
  });

  const testEvolution = trpc.apiConfig.test.useMutation({
    onSuccess: data => {
      toast.success(data.message, {
        description: data.data
          ? `${data.data.instances} instância(s) encontrada(s)`
          : undefined,
      });
    },
    onError: error => {
      toast.error(`Erro ao testar: ${error.message}`);
    },
  });

  const testTelegram = trpc.apiConfig.test.useMutation({
    onSuccess: data => {
      toast.success(data.message, {
        description: data.data
          ? `@${data.data.botUsername} (${data.data.botName})`
          : undefined,
      });
    },
    onError: error => {
      toast.error(`Erro ao testar: ${error.message}`);
    },
  });

  // Carregar dados existentes nos inputs
  useEffect(() => {
    if (whatsappConfig?.config) {
      const config = whatsappConfig.config as any;
      setWhatsappToken(config.accessToken || "");
      setWhatsappPhoneId(config.phoneNumberId || "");
      setWhatsappWebhook(config.webhookUrl || "");
      setWhatsappVerifyToken(config.webhookVerifyToken || "");
      setWhatsappAppSecret(config.appSecret || "");
    }
  }, [whatsappConfig]);

  useEffect(() => {
    if (instagramConfig?.config) {
      const config = instagramConfig.config as any;
      setInstagramToken(config.accessToken || "");
      setInstagramAccountId(config.businessAccountId || "");
      setInstagramWebhook(config.webhookUrl || "");
      setInstagramVerifyToken(config.webhookVerifyToken || "");
      setInstagramAppSecret(config.appSecret || "");
    }
  }, [instagramConfig]);

  useEffect(() => {
    if (evolutionConfig?.config) {
      const config = evolutionConfig.config as any;
      setEvolutionApiUrl(config.apiUrl || "");
      setEvolutionApiKey(config.apiKey || "");
      setEvolutionInstanceName(config.instanceName || "");
    }
  }, [evolutionConfig]);

  useEffect(() => {
    if (telegramConfig?.config) {
      const config = telegramConfig.config as any;
      setTelegramBotToken(config.botToken || config.accessToken || "");
      setTelegramWebhook(config.webhookUrl || "");
    }
  }, [telegramConfig]);

  // Handlers
  const handleSaveWhatsapp = () => {
    if (!whatsappToken || !whatsappPhoneId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    saveWhatsapp.mutate({
      integrationType: "whatsapp_business",
      name: "WhatsApp Business API",
      accessToken: whatsappToken,
      phoneNumberId: whatsappPhoneId,
      webhookUrl: whatsappWebhook,
      webhookVerifyToken: whatsappVerifyToken,
      appSecret: whatsappAppSecret,
      isActive: true,
    });
  };

  const handleTestWhatsapp = () => {
    if (!whatsappToken || !whatsappPhoneId) {
      toast.error("Preencha o token e Phone Number ID primeiro");
      return;
    }

    testWhatsapp.mutate({
      integrationType: "whatsapp_business",
      accessToken: whatsappToken,
      phoneNumberId: whatsappPhoneId,
    });
  };

  const handleSaveInstagram = () => {
    if (!instagramToken || !instagramAccountId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    saveInstagram.mutate({
      integrationType: "instagram_graph",
      name: "Instagram Graph API",
      accessToken: instagramToken,
      businessAccountId: instagramAccountId,
      webhookUrl: instagramWebhook,
      webhookVerifyToken: instagramVerifyToken,
      appSecret: instagramAppSecret,
      isActive: true,
    });
  };

  const handleTestInstagram = () => {
    if (!instagramToken || !instagramAccountId) {
      toast.error("Preencha o token e Business Account ID primeiro");
      return;
    }

    testInstagram.mutate({
      integrationType: "instagram_graph",
      accessToken: instagramToken,
      businessAccountId: instagramAccountId,
    });
  };

  const handleSaveEvolution = () => {
    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    saveEvolution.mutate({
      integrationType: "evolution_api",
      name: "Evolution API",
      apiUrl: evolutionApiUrl,
      apiKey: evolutionApiKey,
      instanceName: evolutionInstanceName,
      isActive: true,
    });
  };

  const handleTestEvolution = () => {
    if (!evolutionApiUrl || !evolutionApiKey) {
      toast.error("Preencha a URL e API Key primeiro");
      return;
    }

    testEvolution.mutate({
      integrationType: "evolution_api",
      accessToken: evolutionApiKey,
      apiUrl: evolutionApiUrl,
    });
  };

  const handleOpenQrModal = () => {
    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      toast.error("Preencha a URL, API Key e Instance Name primeiro");
      return;
    }
    setShowQrModal(true);
  };

  const handleSaveTelegram = () => {
    if (!telegramBotToken) {
      toast.error("Preencha o Bot Token");
      return;
    }

    saveTelegram.mutate({
      integrationType: "telegram",
      name: "Telegram Bot",
      botToken: telegramBotToken,
      webhookUrl: telegramWebhook,
      isActive: true,
    });
  };

  const handleTestTelegram = () => {
    if (!telegramBotToken) {
      toast.error("Preencha o Bot Token primeiro");
      return;
    }

    testTelegram.mutate({
      integrationType: "telegram",
      accessToken: telegramBotToken,
    });
  };

  return (
    <FarmaDashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações de API</h1>
          <p className="text-muted-foreground mt-2">
            Configure as credenciais para integração com WhatsApp Business API e
            Instagram Graph API
          </p>
        </div>

        <Tabs defaultValue="integracoes" className="w-full">
          <TabsList>
            <TabsTrigger value="integracoes">Integracoes</TabsTrigger>
            <TabsTrigger value="mensagens_rapidas">
              Mensagens Rapidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integracoes" className="space-y-6">
            {/* WhatsApp Business API */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>WhatsApp Business API</CardTitle>
                    <CardDescription>
                      Configure o token e credenciais do WhatsApp Business API
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingWhatsapp ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-token">Access Token *</Label>
                      <Input
                        id="whatsapp-token"
                        type="password"
                        placeholder="EAAxxxxxxxxxx"
                        value={whatsappToken}
                        onChange={e => setWhatsappToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token de acesso da API do WhatsApp Business
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-phone-id">
                        Phone Number ID *
                      </Label>
                      <Input
                        id="whatsapp-phone-id"
                        placeholder="123456789012345"
                        value={whatsappPhoneId}
                        onChange={e => setWhatsappPhoneId(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        ID do número de telefone configurado no WhatsApp
                        Business
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-webhook">Webhook URL</Label>
                      <Input
                        id="whatsapp-webhook"
                        placeholder="https://sua-plataforma.com/api/webhooks/whatsapp"
                        value={whatsappWebhook}
                        onChange={e => setWhatsappWebhook(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        URL para receber notificações de mensagens
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-verify-token">
                        Webhook Verify Token *
                      </Label>
                      <Input
                        id="whatsapp-verify-token"
                        type="password"
                        placeholder="seu_token_secreto_123"
                        value={whatsappVerifyToken}
                        onChange={e => setWhatsappVerifyToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token secreto para verificação do webhook no Meta
                        Developer Portal
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-app-secret">
                        App Secret (opcional)
                      </Label>
                      <Input
                        id="whatsapp-app-secret"
                        type="password"
                        placeholder="App Secret do Meta Developer"
                        value={whatsappAppSecret}
                        onChange={e => setWhatsappAppSecret(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Para validação de assinatura HMAC SHA256 (recomendado
                        para produção)
                      </p>
                    </div>

                    {whatsappConfig && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        {whatsappConfig.testStatus === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : whatsappConfig.testStatus === "failed" ? (
                          <X className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className="text-sm">
                          {whatsappConfig.testMessage ||
                            "Configuração não testada"}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveWhatsapp}
                        disabled={saveWhatsapp.isPending}
                      >
                        {saveWhatsapp.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Configuração
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTestWhatsapp}
                        disabled={testWhatsapp.isPending}
                      >
                        {testWhatsapp.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Testar Conexão
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Instagram Graph API */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                    <Instagram className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <CardTitle>Instagram Graph API</CardTitle>
                    <CardDescription>
                      Configure o token e credenciais do Instagram Graph API
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingInstagram ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="instagram-token">Access Token *</Label>
                      <Input
                        id="instagram-token"
                        type="password"
                        placeholder="EAAxxxxxxxxxx"
                        value={instagramToken}
                        onChange={e => setInstagramToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token de acesso da API do Instagram Graph
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram-account-id">
                        Business Account ID *
                      </Label>
                      <Input
                        id="instagram-account-id"
                        placeholder="17841400000000000"
                        value={instagramAccountId}
                        onChange={e => setInstagramAccountId(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        ID da conta comercial do Instagram
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram-webhook">Webhook URL</Label>
                      <Input
                        id="instagram-webhook"
                        placeholder="https://sua-plataforma.com/api/webhooks/instagram"
                        value={instagramWebhook}
                        onChange={e => setInstagramWebhook(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        URL para receber notificações de mensagens do Instagram
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram-verify-token">
                        Webhook Verify Token *
                      </Label>
                      <Input
                        id="instagram-verify-token"
                        type="password"
                        placeholder="seu_token_secreto_123"
                        value={instagramVerifyToken}
                        onChange={e => setInstagramVerifyToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token secreto para verificação do webhook no Meta
                        Developer Portal
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram-app-secret">
                        App Secret (opcional)
                      </Label>
                      <Input
                        id="instagram-app-secret"
                        type="password"
                        placeholder="App Secret do Meta Developer"
                        value={instagramAppSecret}
                        onChange={e => setInstagramAppSecret(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Para validação de assinatura HMAC SHA256 (recomendado
                        para produção)
                      </p>
                    </div>

                    {instagramConfig && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        {instagramConfig.testStatus === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : instagramConfig.testStatus === "failed" ? (
                          <X className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className="text-sm">
                          {instagramConfig.testMessage ||
                            "Configuração não testada"}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveInstagram}
                        disabled={saveInstagram.isPending}
                      >
                        {saveInstagram.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Configuração
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTestInstagram}
                        disabled={testInstagram.isPending}
                      >
                        {testInstagram.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Testar Conexão
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Evolution API */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Evolution API</CardTitle>
                    <CardDescription>
                      Configure a URL e API Key da Evolution API para WhatsApp
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingEvolution ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="evolution-url">API URL *</Label>
                      <Input
                        id="evolution-url"
                        placeholder="https://api.evolution.com.br"
                        value={evolutionApiUrl}
                        onChange={e => setEvolutionApiUrl(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        URL base da Evolution API
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evolution-key">API Key *</Label>
                      <Input
                        id="evolution-key"
                        type="password"
                        placeholder="sua-api-key-aqui"
                        value={evolutionApiKey}
                        onChange={e => setEvolutionApiKey(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Chave de API para autenticação
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evolution-instance">
                        Instance Name *
                      </Label>
                      <Input
                        id="evolution-instance"
                        placeholder="main"
                        value={evolutionInstanceName}
                        onChange={e => setEvolutionInstanceName(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Nome da instância criada no Evolution Manager
                      </p>
                    </div>

                    {evolutionConfig && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        {evolutionConfig.testStatus === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : evolutionConfig.testStatus === "failed" ? (
                          <X className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className="text-sm">
                          {evolutionConfig.testMessage ||
                            "Configuração não testada"}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEvolution}
                        disabled={saveEvolution.isPending}
                      >
                        {saveEvolution.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Configuração
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTestEvolution}
                        disabled={testEvolution.isPending}
                      >
                        {testEvolution.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Testar Conexão
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleOpenQrModal}
                        disabled={
                          !evolutionApiUrl ||
                          !evolutionApiKey ||
                          !evolutionInstanceName
                        }
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Gerar QR Code
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Telegram Bot */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/20 rounded-lg">
                    <Send className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <CardTitle>Telegram Bot</CardTitle>
                    <CardDescription>
                      Configure seu bot do Telegram para enviar e receber mensagens
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTelegram ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="telegram-token">Bot Token *</Label>
                      <Input
                        id="telegram-token"
                        type="password"
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        value={telegramBotToken}
                        onChange={e => setTelegramBotToken(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Token do bot obtido via @BotFather no Telegram
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telegram-webhook">Webhook URL (opcional)</Label>
                      <Input
                        id="telegram-webhook"
                        placeholder="https://sua-plataforma.com/api/webhooks/telegram"
                        value={telegramWebhook}
                        onChange={e => setTelegramWebhook(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        URL para receber atualizações do Telegram
                      </p>
                    </div>

                    {telegramConfig && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        {telegramConfig.testStatus === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : telegramConfig.testStatus === "failed" ? (
                          <X className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className="text-sm">
                          {telegramConfig.testMessage ||
                            "Configuração não testada"}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveTelegram}
                        disabled={saveTelegram.isPending}
                      >
                        {saveTelegram.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Configuração
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTestTelegram}
                        disabled={testTelegram.isPending}
                      >
                        {testTelegram.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Testar Conexão
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mensagens_rapidas" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Mensagens Rapidas</h2>
              <p className="text-muted-foreground mt-1">
                Crie e edite mensagens prontas para usar nas conversas.
              </p>
            </div>
            <QuickRepliesSettingsTab />
          </TabsContent>
        </Tabs>
      </div>

      <QrCodeModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        apiUrl={evolutionApiUrl}
        apiKey={evolutionApiKey}
        instanceName={evolutionInstanceName}
      />
    </FarmaDashboardLayout>
  );
}
