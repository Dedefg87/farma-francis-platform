// Simple debug logging module
const logs: any[] = [];
const MAX_LOGS = 100;

export function addLog(level: string, category: string, message: string, data?: any) {
  const log = {
    timestamp: new Date(),
    level,
    category,
    message,
    data
  };
  
  logs.push(log);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  console.log(`[${level.toUpperCase()}] [${category}]`, message, data || '');
}

export function getLogs() {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
}

export function webhookLogger(req: any, res: any, next: any) {
  console.log(`[WEBHOOK] ${req.method} ${req.url}`);
  next();
}

export default {
  addLog,
  getLogs,
  clearLogs,
  webhookLogger
};
