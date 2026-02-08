import { Request, Response } from "express";
import { getDb } from "./db";
import { receivedMessages, customers, automationFlows, visualFlows } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// @ts-ignore - Ignorando erros de tipos Drizzle ORM temporariamente

/**
 * Teste de Fluxos - Sistema completo para verificar se fluxos funcionam
 */

/**
 * GET /api/test/status - Status geral do sistema
 */
export async function getSystemStatus(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Contar fluxos
    const allAutomationFlows = await db.select().from(automationFlows);
    const allVisualFlows = await db.select().from(visualFlows);

    const activeAutomationFlows = await db
      .select()
      .from(automationFlows)
      .where(eq(automationFlows.isActive, 1));

    const activeVisualFlows = await db
      .select()
      .from(visualFlows)
      .where(eq(visualFlows.isActive, 1));

    // Contar mensagens
    const recentMessages = await db
      .select()
      .from(receivedMessages)
      .orderBy(desc(receivedMessages.createdAt))
      .limit(10);

    const pendingMessages = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.processed, 0))
      .limit(10);

    return res.json({
      success: true,
      system: {
        flows: {
          automation: {
            total: allAutomationFlows.length,
            active: activeAutomationFlows.length,
            inactive: allAutomationFlows.length - activeAutomationFlows.length
          },
          visual: {
            total: allVisualFlows.length,
            active: activeVisualFlows.length,
            inactive: allVisualFlows.length - activeVisualFlows.length
          }
        },
        messages: {
          total: recentMessages.length,
          pending: pendingMessages.length,
          lastReceived: recentMessages[0]?.createdAt || null
        }
      }
    });
  } catch (error) {
    console.error("[Test] Error getting system status:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/test/flows - Listar todos os fluxos com detalhes
 */
export async function listAllFlows(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const [automationFlows, visualFlows] = await Promise.all([
      db.select().from(automationFlows).orderBy(desc(automationFlows.createdAt)),
      db.select().from(visualFlows).orderBy(desc(visualFlows.createdAt))
    ]);

    return res.json({
      success: true,
      flows: {
        automation: automationFlows.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          trigger: f.trigger,
          response: f.response,
          isActive: f.isActive === 1,
          channel: f.channel,
          createdAt: f.createdAt
        })),
        visual: visualFlows.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          isActive: f.isActive === 1,
          nodesCount: f.flowData ? JSON.parse(f.flowData).nodes?.length || 0 : 0,
          edgesCount: f.flowData ? JSON.parse(f.flowData).edges?.length || 0 : 0,
          createdAt: f.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("[Test] Error listing flows:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/test/activate/:id - Ativar um fluxo específico
 */
export async function activateFlow(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const flowId = parseInt(id);

    if (isNaN(flowId)) {
      return res.status(400).json({ success: false, error: "Invalid flow ID" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Tentar ativar em automationFlows
    let automationUpdated = false;
    const [automationFlow] = await db
      .select()
      .from(automationFlows)
      .where(eq(automationFlows.id, flowId))
      .limit(1);

    if (automationFlow && automationFlow.length > 0) {
      await db.update(automationFlows)
        .set({ isActive: 1, updatedAt: new Date() })
        .where(eq(automationFlows.id, flowId));
      automationUpdated = true;
    }

    // Tentar ativar em visualFlows
    let visualUpdated = false;
    const [visualFlow] = await db
      .select()
      .from(visualFlows)
      .where(eq(visualFlows.id, flowId))
      .limit(1);

    if (visualFlow && visualFlow.length > 0) {
      await db.update(visualFlows)
        .set({ isActive: 1, updatedAt: new Date() })
        .where(eq(visualFlows.id, flowId));
      visualUpdated = true;
    }

    if (!automationUpdated && !visualUpdated) {
      return res.status(404).json({ success: false, error: "Flow not found" });
    }

    return res.json({
      success: true,
      message: "Flow activated successfully",
      flowId,
      type: automationUpdated ? "automation" : "visual"
    });
  } catch (error) {
    console.error("[Test] Error activating flow:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/test/simulate-message - Simular uma mensagem recebida
 */
export async function simulateMessage(req: Request, res: Response) {
  try {
    const { phoneNumber, message, provider = "whatsapp" } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, error: "phoneNumber and message are required" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Criar mensagem simulada no banco
    const messageId = `test-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const insertResult = await db.insert(receivedMessages).values({
      provider: "whatsapp",
      externalId: messageId,
      fromNumber: phoneNumber,
      fromName: "Test User",
      messageType: "text",
      messageText: message,
      mediaUrl: null,
      mimeType: null,
      caption: null,
      timestamp,
      rawPayload: JSON.stringify({ test: true, simulatedAt: new Date() }),
      processed: 0,
      createdAt: new Date()
    });

    const insertedId = insertResult[0]?.insertId || insertResult.insertId || insertResult[0]?.id || Date.now();
    console.log(`[Test] Simulated message created: ID ${insertedId}`);

    // Processar mensagem imediatamente
    const { processMessage } = await import("./flow-engine");

    // Buscar resultado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const [processedMessages] = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.externalId, messageId))
      .limit(1);

    const processedMessage = processedMessages[0];

    return res.json({
      success: true,
      messageId: insertedId,
      processed: processedMessage?.processed === 1,
      automationFlowId: processedMessage?.automationFlowId || null,
      result: processedMessage ? "Message processed" : "Message pending"
    });
  } catch (error) {
    console.error("[Test] Error simulating message:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/test/trigger-flow - Disparar manualmente um fluxo
 */
export async function triggerFlowManually(req: Request, res: Response) {
  try {
    const { flowId, phoneNumber = "5511999999999", message, provider = "whatsapp" } = req.body;

    if (!flowId) {
      return res.status(400).json({ success: false, error: "flowId is required" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Verificar se fluxo existe e está ativo
    const [visualFlow] = await db
      .select()
      .from(visualFlows)
      .where(eq(visualFlows.id, flowId))
      .limit(1);

    if (!visualFlow || visualFlow.length === 0) {
      return res.status(404).json({ success: false, error: "Flow not found" });
    }

    if (visualFlow[0].isActive !== 1) {
      return res.json({ success: false, error: "Flow is not active. Please activate it first." });
    }

    // Criar ou buscar cliente
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phoneNumber))
      .limit(1);

    if (!customer || customer.length === 0) {
      return res.status(404).json({ success: false, error: "Customer not found. Please create a customer first." });
    }

    // Criar mensagem simulada
    const messageId = `manual-${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const insertResult = await db.insert(receivedMessages).values({
      provider: "whatsapp",
      externalId: messageId,
      fromNumber: phoneNumber,
      fromName: customer[0].name || "Manual Trigger",
      messageType: "text",
      messageText: message || "Manual flow trigger",
      mediaUrl: null,
      mimeType: null,
      caption: null,
      timestamp,
      rawPayload: JSON.stringify({ manualTrigger: true, flowId }),
      processed: 0,
      customerId: customer[0].id,
      createdAt: new Date()
    });

    const insertedId = insertResult[0]?.insertId || insertResult.insertId || insertResult[0]?.id || Date.now();
    console.log(`[Test] Manual trigger message created: ID ${insertedId}`);

    // Processar mensagem
    const { processMessage } = await import("./flow-engine");

    // Buscar resultado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const [processedMessages] = await db
      .select()
      .from(receivedMessages)
      .where(eq(receivedMessages.externalId, messageId))
      .limit(1);

    const processedMessage = processedMessages[0];

    return res.json({
      success: true,
      flowId,
      messageId: insertedId,
      processed: processedMessage?.processed === 1,
      automationFlowId: processedMessage?.automationFlowId || null,
      flowTriggered: processedMessage?.automationFlowId === flowId,
      customer: {
        id: customer[0].id,
        name: customer[0].name,
        phone: customer[0].phone
      }
    });
  } catch (error) {
    console.error("[Test] Error triggering flow:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/test/messages - Listar mensagens recebidas recentes
 */
export async function listRecentMessages(req: Request, res: Response) {
  try {
    const { limit = 20, unprocessedOnly = false } = req.query;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    let query = db.select().from(receivedMessages);

    if (unprocessedOnly === "true") {
      query = query.where(eq(receivedMessages.processed, 0));
    }

    const messages = await query
      .orderBy(desc(receivedMessages.createdAt))
      .limit(Number(limit));

    return res.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        provider: m.provider,
        fromNumber: m.fromNumber,
        fromName: m.fromName,
        messageType: m.messageType,
        messageText: m.messageText,
        processed: m.processed === 1,
        automationFlowId: m.automationFlowId,
        createdAt: m.createdAt,
        processedAt: m.processedAt
      }))
    });
  } catch (error) {
    console.error("[Test] Error listing messages:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/test/health - Health check do sistema
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const db = await getDb();
    const isDbConnected = db !== null;

    return res.json({
      success: true,
      health: {
        status: "healthy",
        database: isDbConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      },
      endpoints: {
        status: "GET /api/test/status",
        flows: "GET /api/test/flows",
        activate: "POST /api/test/activate/:id",
        simulate: "POST /api/test/simulate-message",
        trigger: "POST /api/test/trigger-flow",
        messages: "GET /api/test/messages",
        health: "GET /api/test/health"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * POST /api/test/clear-messages - Limpar mensagens de teste
 */
export async function clearTestMessages(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.delete(receivedMessages)
      .where(and(
        eq(receivedMessages.provider, "whatsapp"),
        eq(receivedMessages.fromNumber, "5511999999999")
      ));

    return res.json({
      success: true,
      deleted: result.rowCount || 0,
      message: "Test messages cleared"
    });
  } catch (error) {
    console.error("[Test] Error clearing messages:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

/**
 * GET /api/test/logs - Get debug logs
 */
export async function getDebugLogs(req: Request, res: Response) {
  try {
    let debugModule: any = null;
    try {
      debugModule = require("./debug");
    } catch (e) {
      return res.json({
        success: true,
        logs: [],
        message: "Debug module not available"
      });
    }

    const logs = debugModule?.getLogs?.() || [];
    const clear = debugModule?.clearLogs || (() => {});

    const { action } = req.query;
    if (action === "clear") {
      clear();
      return res.json({
        success: true,
        logs: [],
        message: "Logs cleared"
      });
    }

    return res.json({
      success: true,
      logs: logs.slice(-50),
      count: logs.length
    });
  } catch (error) {
    console.error("[Test] Error getting logs:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

export default {
  getSystemStatus,
  listAllFlows,
  activateFlow,
  simulateMessage,
  triggerFlowManually,
  listRecentMessages,
  healthCheck,
  clearTestMessages,
  getDebugLogs
};
