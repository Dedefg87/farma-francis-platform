/**
 * Sistema de Monitoramento Proativo
 * Verifica a saúde do sistema periodicamente e registra alertas
 */

import fs from "fs";
import path from "path";

interface HealthCheckResult {
  timestamp: string;
  service: string;
  status: "ok" | "warning" | "error";
  message: string;
  responseTime?: number;
}

interface SystemHealth {
  lastCheck: string;
  checks: HealthCheckResult[];
  alerts: string[];
}

const HEALTH_FILE = "/data/.openclaw/workspace/.system-health.json";
const API_BASE = "https://innovative-enjoyment-production-ed8f.up.railway.app";

/**
 * Carrega o estado de saúde do sistema
 */
function loadHealth(): SystemHealth {
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      const data = fs.readFileSync(HEALTH_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    // Ignorar erro
  }
  return {
    lastCheck: new Date().toISOString(),
    checks: [],
    alerts: [],
  };
}

/**
 * Salva o estado de saúde do sistema
 */
function saveHealth(health: SystemHealth): void {
  try {
    health.lastCheck = new Date().toISOString();
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2));
  } catch (error) {
    console.error("[HealthMonitor] Error saving health:", error);
  }
}

/**
 * Adiciona um alerta ao sistema
 */
function addAlert(health: SystemHealth, alert: string): void {
  const timestamp = new Date().toISOString();
  health.alerts.unshift(`[${timestamp}] ${alert}`);
  // Manter apenas os últimos 50 alertas
  if (health.alerts.length > 50) {
    health.alerts = health.alerts.slice(0, 50);
  }
}

/**
 * Verifica a saúde da API
 */
async function checkAPI(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });
    const responseTime = Date.now() - start;

    if (response.ok) {
      return {
        timestamp: new Date().toISOString(),
        service: "API",
        status: responseTime < 1000 ? "ok" : "warning",
        message: `API responding in ${responseTime}ms`,
        responseTime,
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        service: "API",
        status: "error",
        message: `API returned status ${response.status}`,
        responseTime,
      };
    }
  } catch (error: unknown) {
    return {
      timestamp: new Date().toISOString(),
      service: "API",
      status: "error",
      message: `API check failed: ${error.message}`,
    };
  }
}

/**
 * Verifica conexão com banco de dados via API
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`${API_BASE}/api/dashboard/stats?period=hoje`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return {
        timestamp: new Date().toISOString(),
        service: "Database",
        status: "ok",
        message: "Database connection OK",
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        service: "Database",
        status: "error",
        message: `Database query failed: ${response.status}`,
      };
    }
  } catch (error: unknown) {
    return {
      timestamp: new Date().toISOString(),
      service: "Database",
      status: "error",
      message: `Database check failed: ${error.message}`,
    };
  }
}

/**
 * Verifica webhook de mensagens (status recente)
 */
async function checkWebhooks(): Promise<HealthCheckResult> {
  try {
    // Verificar se há mensagens recentes no banco
    const response = await fetch(`${API_BASE}/api/conversations?limit=1`, {
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return {
        timestamp: new Date().toISOString(),
        service: "Webhooks",
        status: "ok",
        message: "Webhook system operational",
      };
    } else {
      return {
        timestamp: new Date().toISOString(),
        service: "Webhooks",
        status: "warning",
        message: "Could not verify webhook status",
      };
    }
  } catch (error: unknown) {
    return {
      timestamp: new Date().toISOString(),
      service: "Webhooks",
      status: "warning",
      message: `Webhook check failed: ${error.message}`,
    };
  }
}

/**
 * Executa todos os checks de saúde
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const health = loadHealth();
  const checks: HealthCheckResult[] = [];

  // Executar todos os checks
  checks.push(await checkAPI());
  checks.push(await checkDatabase());
  checks.push(await checkWebhooks());

  // Atualizar saúde
  health.checks = checks;

  // Verificar se há problemas
  for (const check of checks) {
    if (check.status === "error") {
      addAlert(health, `ERROR: ${check.service} - ${check.message}`);
    } else if (check.status === "warning") {
      addAlert(health, `WARNING: ${check.service} - ${check.message}`);
    }
  }

  saveHealth(health);
  return health;
}

/**
 * Obtém o status atual do sistema
 */
export function getSystemStatus(): SystemHealth {
  return loadHealth();
}

/**
 * Verifica se há alertas pendentes
 */
export function hasPendingAlerts(): boolean {
  const health = loadHealth();
  const lastHour = Date.now() - 60 * 60 * 1000;
  
  // Verificar se há erros na última hora
  const recentErrors = health.checks.filter(
    (c) => c.status === "error" && new Date(c.timestamp).getTime() > lastHour
  );
  
  return recentErrors.length > 0;
}

/**
 * Limpa alertas antigos
 */
export function clearOldAlerts(): void {
  const health = loadHealth();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  health.alerts = health.alerts.filter((alert) => {
    const match = alert.match(/\[(.*?)\]/);
    if (match) {
      const alertDate = new Date(match[1]).getTime();
      return alertDate > oneDayAgo;
    }
    return true;
  });
  
  saveHealth(health);
}
