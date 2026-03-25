/**
 * Redis Connection Manager
 *
 * Gerencia conexão única com Redis para toda a aplicação.
 * Suporta Redis standalone e cluster (via ioredis).
 */

import Redis from 'ioredis';
import { logger } from './logger';

// Configuração a partir de variáveis de ambiente
// Railway usa REDIS_PUBLIC_URL (URL completa com credenciais)
const REDIS_URL = process.env.REDIS_PUBLIC_URL ||
                  process.env.REDIS_URL ||
                  process.env.REDISCLOUD_URL ||
                  'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || process.env.REDISCLOUD_PASSWORD;

// Log de debug (mascara senha)
const maskedUrl = REDIS_URL.replace(/:([^@]+)@/, ':***@');
console.log(`[Redis] Configurado com URL: ${maskedUrl}`);
console.log(`[Redis] Password definida: ${!!REDIS_PASSWORD}`);

// Opções de conexão
const redisOptions: Redis.RedisOptions = {
  host: undefined as any, // será preenchido se não for URL
  port: undefined as any,
  family: 4, // 4 = IPv4, 6 = IPv6
  password: REDIS_PASSWORD,
  retryStrategy: (times) => {
    // Reconectar após 100ms, 200ms, 400ms... até 10s
    const delay = Math.min(times * 100, 10000);
    logger.warn(`[Redis] Reconectando (tentativa ${times}, delay ${delay}ms)`);
    return delay;
  },
  maxRetriesPerRequest: 3, // tentativas por comando
  enableReadyCheck: true,
  lazyConnect: true, // conectar apenas no primeiro acesso
  // Automático reconnect em caso de erro de rede
  reconnectOnError: (err) => {
    const targetError = 'ECONNRESET';
    if (err.message.includes(targetError)) {
      logger.warn(`[Redis] Erro de conexão, tentando reconectar: ${err.message}`);
      return true;
    }
    return false;
  },
};

// Se for URL, usar connect
let redisInstance: Redis.Redis | null = null;
let isConnecting = false;
let connectPromise: Promise<Redis.Redis> | null = null;

/**
 * Obtém instância única de Redis (singleton)
 */
export async function getRedis(): Promise<Redis.Redis> {
  // Se já temos uma instância conectada, retorna
  if (redisInstance && redisInstance.status === 'ready') {
    return redisInstance;
  }

  // Se já está conectando, aguarda a mesma promise
  if (connectPromise) {
    return connectPromise;
  }

  // Evita race condition múltipla conexão simultânea
  if (isConnecting) {
    logger.debug('[Redis] Aguardando conexão em progresso...');
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return redisInstance!;
  }

  isConnecting = true;
  connectPromise = (async () => {
    try {
      logger.info(`[Redis] Conectando a ${REDIS_URL}...`);

      // Se for URL no formato redis://host:port
      if (REDIS_URL.startsWith('redis://') || REDIS_URL.startsWith('rediss://')) {
        const url = new URL(REDIS_URL);
        redisOptions.host = url.hostname;
        redisOptions.port = parseInt(url.port) || 6379;
        if (url.password) {
          redisOptions.password = url.password;
        }
      }

      redisInstance = new Redis(redisOptions);

      // Eventos de log
      redisInstance.on('connect', () => {
        logger.info('[Redis] ✅ Conexão estabelecida');
      });

      redisInstance.on('ready', () => {
        logger.info('[Redis] ✅ Pronto para uso');
      });

      redisInstance.on('error', (err) => {
        logger.error('[Redis] ❌ Erro:', err.message);
      });

      redisInstance.on('close', () => {
        logger.warn('[Redis] ⚠️ Conexão fechada');
      });

      redisInstance.on('end', () => {
        logger.info('[Redis] 🔌 Conexão encerrada');
      });

      // Wait for connection establishment
      await redisInstance.connect();

      // Teste ping
      const pong = await redisInstance.ping();
      if (pong !== 'PONG') {
        throw new Error(`Redis respondeu inesperadamente: ${pong}`);
      }

      logger.info('[Redis] ✅ Handshake completo');
      return redisInstance;
    } catch (error) {
      logger.error('[Redis] ❌ Falha ao conectar:', error);
      connectPromise = null;
      isConnecting = false;
      throw error;
    } finally {
      isConnecting = false;
    }
  })();

  return connectPromise;
}

/**
 * Fecha a conexão Redis (útil para shutdown graceful)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('[Redis] Conexão encerrada');
  }
}

/**
 * Verifica se Redis está disponível
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedis();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Wrapper para operações Redis com retry automático
 */
export async function redisCommand<T>(
  fn: (client: Redis.Redis) => Promise<T>,
  retries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const client = await getRedis();
      return await fn(client);
    } catch (error: any) {
      lastError = error;

      // Se for erro de conexão, tenta reconectar
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection closed')) {
        logger.warn(`[Redis] Comando falhou (tentativa ${i + 1}/${retries}), reconectando...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
        continue;
      }

      // Outros erros propagam imediatamente
      throw error;
    }
  }

  throw lastError;
}
