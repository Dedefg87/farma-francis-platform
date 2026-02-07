import { Request, Response } from "express";

/**
 * Sistema de Logs em Tempo Real para Debug
 */

// Armazena logs na memória para consulta via API
const logs = new Array<{
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}>();

const MAX_LOGS = 200;

/**
 * Adicionar log
 */
function addLog(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, data?: any) {
  const log = {
    timestamp: new Date(),
    level,
    category,
    message,
    data: data ? JSON.stringify(data, null, 2) : undefined
  };

  logs.push(log);
  
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Também logar no console
  const prefix = `[${level.toUpperCase()}] [${category}]`;
  const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
  console[level === 'error' ? 'error' : level](prefix, message, dataStr);
}

/**
 * Middleware para interceptar webhooks e adicionar logs
 */
export function webhookLogger(req: Request, res: Response, next: Function) {
  const startTime = Date.now();
  const originalJson = res.json;

  // Sobrescrever res.json para capturar respostas
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    addLog('debug', 'webhook_response', {
      status: res.statusCode,
      duration,
      url: req.url
    }, body);
    
    originalJson.call(res, body);
  };

  // Logar requisição de webhook
  addLog('info', 'webhook_received', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'x-api-key': req.headers['x-api-key'] ? 'present' : 'absent',
      'user-agent': req.headers['user-agent']
    },
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  }, req.body);

  next();
}

/**
 * GET /api/debug/logs - Retornar logs recentes
 */
export async function getLogs(req: Request, res: Response) {
  const { level, category, limit = 50 } = req.query;

  let filteredLogs = [...logs];

  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }

  if (category) {
    filteredLogs = filteredLogs.filter(log => log.category.includes(category.toLowerCase()));
  }

  const limitedLogs = filteredLogs.slice(-Number(limit)).reverse();

  return res.json({
    success: true,
    logs: limitedLogs,
    total: filteredLogs.length
  });
}

/**
 * GET /api/debug/clear - Limpar logs
 */
export async function clearLogs(req: Request, res: Response) {
  logs.length = 0;
  
  return res.json({
    success: true,
    message: "Logs cleared",
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/debug/stats - Estatísticas dos logs
 */
export async function getLogStats(req: Request, res: Response) {
  const now = Date.now();
  const last24h = logs.filter(log => 
    (now - log.timestamp.getTime()) < (24 * 60 * 60 * 1000)
  );
  
  const levelCounts = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
  };

  const categoryCounts = new Map<string, number>();

  last24h.forEach(log => {
    levelCounts[log.level]++;
    const count = categoryCounts.get(log.category) || 0;
    categoryCounts.set(log.category, count + 1);
  });

  return res.json({
    success: true,
    period: "last 24 hours",
    total: last24h.length,
    byLevel: levelCounts,
    byCategory: Object.fromEntries(categoryCounts),
    categories: Array.from(categoryCounts.keys())
  });
}

/**
 * POST /api/debug/test - Adicionar log manual para teste
 */
export async function addManualLog(req: Request, res: Response) {
  const { level, category, message, data } = req.body;

  if (!level || !category || !message) {
    return res.status(400).json({ success: false, error: "level, category, and message are required" });
  }

  addLog(level, category, message, data);

  return res.json({
    success: true,
    message: "Log added"
  });
}

/**
 * GET /api/debug/system - Status detalhado do sistema
 */
export async function getSystemStatus(req: Request, res: Response) {
  const { getDb } = await import("./db");
  const { receivedMessages, automationFlows, visualFlows } = await import("../drizzle/schema");
  const { eq, isNull } = await import("drizzle-orm");

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    // Estatísticas de mensagens nas últimas 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [messageStats] = await db
      .select({
        total: { count: () => 1 },
        processed: { count: (table) => eq(table.processed, 1) },
        pending: { count: (table) => isNull(table.processedAt) },
        fromEvolution: { count: (table) => eq(table.provider, "whatsapp") }
      })
      .from(receivedMessages)
      .where(isNull(receivedMessages.processedAt));

    const [lastMessages] = await db
      .select()
      .from(receivedMessages)
      .orderBy((receivedMessages) => { desc: receivedMessages.createdAt })
      .limit(10);

    // Estatísticas de fluxos
    const [activeFlows] = await Promise.all([
      db.select().from(automationFlows).where(eq(automationFlows.isActive, 1)),
      db.select().from(visualFlows).where(eq(visualFlows.isActive, 1))
    ]);

    // Configuração Evolution API
    const [integrationSettings] = await import("../drizzle/schema");
    const [evolutionConfig] = await db
      .select()
      .from(integrationSettings.integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    let evolutionConfigured = false;
    let evolutionSettings: any = null;

    if (evolutionConfig && evolutionConfig.length > 0) {
      evolutionConfigured = true;
      try {
        evolutionSettings = typeof evolutionConfig[0].config === 'string'
          ? JSON.parse(evolutionConfig[0].config)
          : evolutionConfig[0].config;
      } catch (e) {
        evolutionSettings = { error: "Invalid config" };
      }
    }

    // Webhook URL
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/evolution`;

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime ? Math.floor(process.uptime()) : 0,
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        status: db ? "connected" : "disconnected",
        messageStats: {
          total: messageStats.total[0]?.count || 0,
          processed: messageStats.processed[0]?.count || 0,
          pending: messageStats.pending[0]?.count || 0,
          fromEvolution: messageStats.fromEvolution[0]?.count || 0
        },
        lastMessages: lastMessages.map(m => ({
          id: m.id,
          provider: m.provider,
          fromNumber: m.fromNumber,
          messageType: m.messageType,
          messageText: m.messageText,
          processed: m.processed === 1,
          createdAt: m.createdAt,
          processedAt: m.processedAt,
          timeAgo: Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 1000)
        }))
      },
      flows: {
        activeAutomation: activeFlows[0].length,
        activeVisual: activeFlows[1].length,
        activeTotal: activeFlows[0].length + activeFlows[1].length
      },
      evolutionApi: {
        configured: evolutionConfigured,
        hasApiUrl: !!(evolutionSettings?.apiUrl),
        hasApiKey: !!(evolutionSettings?.apiKey),
        hasInstanceName: !!(evolutionSettings?.instanceName),
        isActive: evolutionConfigured && evolutionSettings?.isActive !== false,
        settings: evolutionSettings
      },
      webhook: {
        url: webhookUrl,
        expectingCalls: last24h && messageStats.fromEvolution[0]?.count > 0
      },
      issues: [
        !db ? { type: 'critical', message: 'Database is disconnected' } : null,
        !evolutionConfigured ? { type: 'warning', message: 'Evolution API not configured' } : null,
        evolutionConfigured && !evolutionSettings?.apiUrl ? { type: 'error', message: 'Evolution API URL is missing' } : null,
        evolutionConfigured && !evolutionSettings?.apiKey ? { type: 'error', message: 'Evolution API Key is missing' } : null,
        evolutionConfigured && !evolutionSettings?.instanceName ? { type: 'error', message: 'Evolution API Instance Name is missing' } : null,
        activeFlows[0].length + activeFlows[1].length === 0 ? { type: 'warning', message: 'No active flows' } : null,
        messageStats.pending[0]?.count > 10 ? { type: 'warning', message: `${messageStats.pending[0].count} messages pending processing` } : null,
        messageStats.total[0]?.count === 0 && messageStats.pending[0]?.count === 0 ? { type: 'warning', message: 'No messages received in last 24h' } : null
      ].filter(Boolean)
    });
  } catch (error) {
    addLog('error', 'system_status', 'Error getting system status', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
}

export default {
  webhookLogger,
  getLogs,
  clearLogs,
  getLogStats,
  addManualLog,
  getSystemStatus
};
