import { Request, Response } from "express";
import { getDb } from "./db";
import { integrationSettings, receivedMessages, customers, automationFlows, visualFlows } from "../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

/**
 * Ferramenta de Diagnóstico para Webhooks e Fluxos
 */

/**
 * GET /api/diagnostic/overview - Visão geral do sistema
 */
export async function getDiagnosticOverview(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Verificar configuração do Evolution API
    const [evolutionConfig] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const evolutionConfigured = evolutionConfig && evolutionConfig.length > 0;
    let evolutionSettings: any = null;
    
    if (evolutionConfigured) {
      try {
        evolutionSettings = typeof evolutionConfig[0].config === 'string' 
          ? JSON.parse(evolutionConfig[0].config)
          : evolutionConfig[0].config;
      } catch (e) {
        evolutionSettings = { error: "Invalid config" };
      }
    }

    // Verificar fluxos ativos
    const activeAutomationFlows = await db
      .select()
      .from(automationFlows)
      .where(eq(automationFlows.isActive, 1));

    const activeVisualFlows = await db
      .select()
      .from(visualFlows)
      .where(eq(visualFlows.isActive, 1));

    // Verificar mensagens recentes
    const recentMessages = await db
      .select()
      .from(receivedMessages)
      .orderBy(desc(receivedMessages.createdAt))
      .limit(20);

    const lastMessage = recentMessages[0];
    const messagesLast24h = recentMessages.filter(m => {
      const msgTime = new Date(m.createdAt || Date.now()).getTime();
      const hoursAgo = (Date.now() - msgTime) / (1000 * 60 * 60);
      return hoursAgo < 24;
    });

    const pendingMessages = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.processed, 0))
      .limit(10);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      evolutionApi: {
        configured: evolutionConfigured,
        settings: evolutionSettings,
        hasApiKey: !!(evolutionSettings?.apiKey || evolutionSettings?.accessToken),
        hasApiUrl: !!(evolutionSettings?.apiUrl),
        hasInstanceName: !!(evolutionSettings?.instanceName),
        isActive: evolutionConfigured && evolutionSettings?.isActive !== false
      },
      flows: {
        automation: {
          active: activeAutomationFlows.length,
          total: activeAutomationFlows.length
        },
        visual: {
          active: activeVisualFlows.length,
          total: activeVisualFlows.length,
          details: activeVisualFlows.map(f => ({
            id: f.id,
            name: f.name,
            isActive: f.isActive === 1,
            nodesCount: f.flowData ? JSON.parse(f.flowData).nodes?.length || 0 : 0,
            hasTrigger: f.flowData ? JSON.parse(f.flowData).nodes?.some((n: any) => n.type === 'trigger') : false
          }))
        }
      },
      messages: {
        totalRecent: recentMessages.length,
        last24h: messagesLast24h.length,
        pending: pendingMessages.length,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          fromNumber: lastMessage.fromNumber,
          messageType: lastMessage.messageType,
          processed: lastMessage.processed === 1,
          createdAt: lastMessage.createdAt,
          processedAt: lastMessage.processedAt
        } : null,
        timeSinceLastMessage: lastMessage ? 
          Math.floor((Date.now() - new Date(lastMessage.createdAt).getTime()) / 1000 / 60) : null // em minutos
      },
      status: {
        webhooksReceiving: messagesLast24h.length > 0,
        flowsActive: (activeAutomationFlows.length + activeVisualFlows.length) > 0,
        engineRunning: messagesLast24h.some(m => m.processed === 1),
        overall: messagesLast24h.length > 0 && 
                  (activeAutomationFlows.length + activeVisualFlows.length) > 0
          ? "healthy"
          : "needs_configuration"
      }
    });
  } catch (error) {
    console.error("[Diagnostic] Error getting overview:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/diagnostic/messages - Listar mensagens recentes com detalhes
 */
export async function getDiagnosticMessages(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const { limit = 50, provider } = req.query;
    
    let query = db.select().from(receivedMessages);
    
    if (provider) {
      query = query.where(eq(receivedMessages.provider, provider as string));
    }
    
    const messages = await query
      .orderBy(desc(receivedMessages.createdAt))
      .limit(Number(limit));

    return res.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        provider: m.provider,
        externalId: m.externalId,
        fromNumber: m.fromNumber,
        fromName: m.fromName,
        messageType: m.messageType,
        messageText: m.messageText,
        processed: m.processed === 1,
        automationFlowId: m.automationFlowId,
        createdAt: m.createdAt,
        processedAt: m.processedAt,
        timeToProcess: m.processedAt ? 
          new Date(m.processedAt).getTime() - new Date(m.createdAt).getTime() : null,
        rawData: m.rawPayload
      }))
    });
  } catch (error) {
    console.error("[Diagnostic] Error listing messages:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/diagnostic/webhook - Verificar configuração do webhook
 */
export async function getWebhookStatus(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const [evolutionConfig] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const config = evolutionConfig && evolutionConfig.length > 0 ? 
      (typeof evolutionConfig[0].config === 'string' ? JSON.parse(evolutionConfig[0].config) : evolutionConfig[0].config)
      : null;

    return res.json({
      success: true,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/evolution`,
      expectedConfig: {
        apiUrl: "URL da sua instância Evolution API",
        apiKey: "API Key da sua instância",
        instanceName: "Nome da instância no Evolution API",
        isActive: "Se a integração está ativa"
      },
      currentConfig: config || {
        status: "not_configured",
        message: "Evolution API não está configurado"
      },
      instructions: {
        step1: "No painel Evolution API, vá em Settings > Webhooks",
        step2: "Adicione este URL: " + `${req.protocol}://${req.get('host')}/api/webhooks/evolution`,
        step3: "Configure a API Key no painel Evolution API",
        step4: "Configure a mesma API Key aqui na plataforma (Configurações > Integrações)"
      }
    });
  } catch (error) {
    console.error("[Diagnostic] Error checking webhook status:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/diagnostic/test-webhook - Testar recebimento de webhook
 */
export async function testWebhookReception(req: Request, res: Response) {
  try {
    const { testMessage = "Teste webhook " + new Date().toISOString(), phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "phoneNumber is required" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Criar mensagem de teste
    const messageId = `webhook-test-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const [insertedMessage] = await db.insert(receivedMessages).values({
      provider: "whatsapp",
      externalId: messageId,
      fromNumber: phoneNumber,
      fromName: "Webhook Test",
      messageType: "text",
      messageText: testMessage,
      mediaUrl: null,
      mimeType: null,
      caption: null,
      timestamp,
      rawPayload: JSON.stringify({ 
        test: true, 
        testType: "webhook-reception",
        timestamp: new Date().toISOString() 
      }),
      processed: 0,
      createdAt: new Date()
    });

    console.log(`[Diagnostic] Webhook test message created: ID ${insertedMessage.insertId}`);

    // Processar a mensagem pelo flow-engine
    const { processMessage } = await import("./flow-engine");
    try {
      await processMessage(insertedMessage);
      
      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se foi processado
      const [processedMessage] = await db
        .select()
        .from(receivedMessages)
        .where(eq(receivedMessages.id, insertedMessage.insertId))
        .limit(1);

      return res.json({
        success: true,
        test: {
          messageId: insertedMessage.insertId,
          processed: processedMessage?.[0]?.processed === 1,
          automationFlowId: processedMessage?.[0]?.automationFlowId,
          result: processedMessage?.[0]?.processed === 1 ? "Sucesso! Mensagem processada" : "Falha! Mensagem não foi processada",
          issues: processedMessage?.[0]?.processed === 0 ? ["Mensagem não foi processada pelo flow-engine"] : []
        }
      });
    } catch (error) {
      console.error("[Diagnostic] Error processing test message:", error);
      return res.json({
        success: false,
        test: {
          messageId: insertedMessage.insertId,
          processed: false,
          error: String(error),
          issues: ["Erro ao processar mensagem pelo flow-engine"]
        }
      });
    }
  } catch (error) {
    console.error("[Diagnostic] Error testing webhook reception:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/diagnostic/flows - Verificar status dos fluxos
 */
export async function getFlowStatus(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const [automationFlows, visualFlows] = await Promise.all([
      db.select().from(automationFlows),
      db.select().from(visualFlows)
    ]);

    return res.json({
      success: true,
      flows: {
        automation: automationFlows.map(f => {
          const last24hMessages = []; // TODO: buscar mensagens nas últimas 24h para este fluxo
          return {
            id: f.id,
            name: f.name,
            description: f.description,
            trigger: f.trigger,
            channel: f.channel,
            isActive: f.isActive === 1,
            createdAt: f.createdAt,
            lastUsed: last24hMessages.length > 0 ? last24hMessages[0].createdAt : null,
            messagesProcessed: last24hMessages.length
          };
        }),
        visual: visualFlows.map(f => {
          let flowData: any = {};
          try {
            flowData = JSON.parse(f.flowData || "{}");
          } catch (e) {
            console.error("[Diagnostic] Error parsing flow data:", e);
          }
          
          return {
            id: f.id,
            name: f.name,
            description: f.description,
            isActive: f.isActive === 1,
            nodesCount: flowData.nodes?.length || 0,
            edgesCount: flowData.edges?.length || 0,
            hasTrigger: flowData.nodes?.some((n: any) => n.type === 'trigger'),
            triggerNodes: flowData.nodes?.filter((n: any) => n.type === 'trigger').map((n: any) => ({
              id: n.id,
              label: n.data?.label,
              type: n.data?.config?.type,
              keywords: n.data?.config?.keywords
            })),
            createdAt: f.createdAt
          };
        })
      },
      issues: {
        automationInactive: automationFlows.filter(f => f.isActive === 0),
        visualInactive: visualFlows.filter(f => f.isActive === 0),
        visualNoTrigger: visualFlows.filter(f => {
          try {
            const flowData = JSON.parse(f.flowData || "{}");
            return !flowData.nodes?.some((n: any) => n.type === 'trigger');
          } catch {
            return false;
          }
        }),
        total: automationFlows.filter(f => f.isActive === 0).length + 
                visualFlows.filter(f => f.isActive === 0).length +
                visualFlows.filter(f => {
                  try {
                    const flowData = JSON.parse(f.flowData || "{}");
                    return !flowData.nodes?.some((n: any) => n.type === 'trigger');
                  } catch {
                    return false;
                  }
                }).length
      }
    });
  } catch (error) {
    console.error("[Diagnostic] Error getting flow status:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/diagnostic/configure-evolution - Configurar Evolution API (temporário para teste)
 */
export async function configureEvolutionAPI(req: Request, res: Response) {
  try {
    const { apiUrl, apiKey, instanceName } = req.body;

    if (!apiUrl || !apiKey || !instanceName) {
      return res.status(400).json({ success: false, error: "apiUrl, apiKey and instanceName are required" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const config = {
      apiUrl,
      apiKey,
      instanceName,
      isActive: true,
      configuredAt: new Date().toISOString()
    };

    if (existing && existing.length > 0) {
      // Atualizar
      await db.update(integrationSettings)
        .set({ config: JSON.stringify(config), updatedAt: new Date() })
        .where(eq(integrationSettings.integrationType, "evolution_api"));
    } else {
      // Criar
      await db.insert(integrationSettings).values({
        integrationType: "evolution_api",
        name: "Evolution API",
        config: JSON.stringify(config),
        isActive: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`[Diagnostic] Evolution API configured: ${apiUrl} - ${instanceName}`);

    return res.json({
      success: true,
      message: "Evolution API configured successfully",
      config,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/evolution`
    });
  } catch (error) {
    console.error("[Diagnostic] Error configuring Evolution API:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

export default {
  getDiagnosticOverview,
  getDiagnosticMessages,
  getWebhookStatus,
  testWebhookReception,
  getFlowStatus,
  configureEvolutionAPI
};
