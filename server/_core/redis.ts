import Redis from "ioredis";

/**
 * Estado interno para circuit breaker
 */
let redisClient: Redis | null = null;
let redisDown = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Métricas do Redis
 */
const metrics = {
  operations: 0,
  errors: 0,
  reconnects: 0,
  lastHealthCheck: new Date(),
};

/**
 * Inicialização segura do Redis
 */
function createRedisClient() {
  if (!process.env.REDIS_URL) {
    console.warn("[Redis] ❌ REDIS_URL não definida — Redis desativado");
    return null;
  }

  try {
    const isRailway = process.env.REDIS_URL.includes("proxy.rlwy.net");

    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),

      tls: isRailway
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    });

    client.on("connect", () => {
      redisDown = false;
      reconnectAttempts = 0;
      metrics.reconnects++;
      console.log("[Redis] ✅ Conectado com sucesso");
    });

    client.on("error", (err) => {
      redisDown = true;
      reconnectAttempts++;
      metrics.errors++;

      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error(
          "[Redis] ❌ Máximo de tentativas atingido — desativando"
        );
        redisClient = null;
      } else {
        console.error("[Redis] ❌ Erro de conexão:", err.message);
      }
    });

    client.on("end", () => {
      redisDown = true;
      console.warn("[Redis] ⚠️ Conexão encerrada — fallback ativado");
    });

    return client;
  } catch (err) {
    console.error("[Redis] ❌ Falha ao inicializar:", err);
    return null;
  }
}

redisClient = createRedisClient();

/**
 * Retorna o cliente Redis ou null (fallback)
 */
export function getRedis() {
  if (redisDown) return null;
  return redisClient;
}

/**
 * Health check seguro
 */
export async function checkRedisHealth() {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.ping();
    metrics.lastHealthCheck = new Date();
    return true;
  } catch (err) {
    console.error("[Redis] ❌ Health check falhou:", err);
    return false;
  }
}

/**
 * Valida chaves para evitar injeção
 */
function validateKey(key: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Namespaces com TTL padrão
 */
const DEFAULT_TTL = 60 * 60;

export function getRedisNamespace(namespace: string) {
  const redis = getRedis();
  if (!redis) return null;

  if (!validateKey(namespace)) {
    throw new Error(`[Redis] Namespace inválido: ${namespace}`);
  }

  return {
    get: (key: string) => {
      if (!validateKey(key)) {
        throw new Error(`[Redis] Chave inválida: ${key}`);
      }
      metrics.operations++;
      return redis.get(`${namespace}:${key}`);
    },

    set: (key: string, value: string, ttl = DEFAULT_TTL) => {
      if (!validateKey(key)) {
        throw new Error(`[Redis] Chave inválida: ${key}`);
      }
      metrics.operations++;
      return redis.setex(`${namespace}:${key}`, ttl, value);
    },

    del: (key: string) => {
      if (!validateKey(key)) {
        throw new Error(`[Redis] Chave inválida: ${key}`);
      }
      metrics.operations++;
      return redis.del(`${namespace}:${key}`);
    },

    exists: (key: string) => {
      if (!validateKey(key)) {
        throw new Error(`[Redis] Chave inválida: ${key}`);
      }
      return redis.exists(`${namespace}:${key}`);
    },
  };
}

/**
 * Métricas do Redis
 */
export async function getRedisMetrics() {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const info = await redis.info("stats");
    return {
      connected: !redisDown,
      operations: metrics.operations,
      errors: metrics.errors,
      reconnects: metrics.reconnects,
      lastHealthCheck: metrics.lastHealthCheck,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Encerramento seguro do Redis
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log("[Redis] ✅ Desconectado com segurança");
    } catch (err) {
      console.error("[Redis] ❌ Erro ao desconectar:", err);
      redisClient.disconnect();
    }
  }
}

/**
 * Graceful shutdown
 */
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM recebido — encerrando...");
  await closeRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Server] SIGINT recebido — encerrando...");
  await closeRedis();
  process.exit(0);
});
