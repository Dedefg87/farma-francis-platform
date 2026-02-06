import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const createChildLogger = (module: string) => {
  return logger.child({ module });
};

export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info({
    type: "http_request",
    method,
    url,
    statusCode,
    durationMs: duration,
  });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error({
    type: "error",
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logWebhook = (provider: string, eventType: string, success: boolean) => {
  logger.info({
    type: "webhook",
    provider,
    eventType,
    success,
  });
};
