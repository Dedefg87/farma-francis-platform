/**
 * Redis Namespaces
 *
 * Proporciona isolamento de dados entre serviços (Evolution API, Farma Francis, etc.)
 * no mesmo Redis compartilhado, evitando colisões de chaves.
 */

import { getRedis as getGlobalRedis } from './redis.js';

// Namespaces para separar dados por serviço
export const REDIS_NAMESPACES = {
  EVOLUTION: 'evolution:',      // Dados da Evolution API (configs, tokens, webhook state)
  FARMA: 'farma:',             // Dados específicos do Farma Francis (sessões, cache app)
  BROADCAST: 'broadcast:',     // Fila de broadcast (BullMQ keys)
  RATELIMIT: 'ratelimit:',     // Rate limiting (por IP, usuário, endpoint)
  CACHE: 'cache:',             // Cache genérico da aplicação
  SESSION: 'session:',         // Sessões de usuário (se usar Redis-store)
  QUEUE: 'queue:',             // Filas (Bull, BullMQ)
} as const;

/**
 * Cria um wrapper de namespace para operações Redis
 * Adiciona automaticamente o prefixo do namespace às chaves
 */
export function createNamespacedClient(namespace: keyof typeof REDIS_NAMESPACES) {
  const prefix = REDIS_NAMESPACES[namespace];

  return {
    /**
     * Retorna cliente ioredis subjacente (para operações avançadas como pipeline, zadd, etc)
     */
    async getRedis() {
      return await getGlobalRedis();
    },

    /**
     * Get com namespace
     */
    async get(key: string): Promise<string | null> {
      const client = await redisClient.getRedis();
      return await client.get(`${prefix}${key}`);
    },

    /**
     * Get e parse JSON automaticamente
     */
    async getJSON<T = any>(key: string): Promise<T | null> {
      const value = await this.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        console.error(`[Redis-Namespace] JSON parse error for key ${prefix}${key}:`, e);
        return null;
      }
    },

    /**
     * Set com namespace
     */
    async set(key: string, value: string | object, ttlSeconds?: number): Promise<'OK' | null> {
      const client = await redisClient.getRedis();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        return await client.setex(`${prefix}${key}`, ttlSeconds, serialized);
      } else {
        return await client.set(`${prefix}${key}`, serialized);
      }
    },

    /**
     * Set com TTL e returando booleano
     */
    async setnx(key: string, value: string | object, ttlSeconds?: number): Promise<boolean> {
      const client = await redisClient.getRedis();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        const result = await client.set(`${prefix}${key}`, serialized, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } else {
        const result = await client.set(`${prefix}${key}`, serialized, 'NX');
        return result === 'OK';
      }
    },

    /**
     * Delete com namespace
     */
    async del(key: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.del(`${prefix}${key}`);
    },

    /**
     * Verifica se chave existe
     */
    async exists(key: string): Promise<boolean> {
      const client = await redisClient.getRedis();
      const result = await client.exists(`${prefix}${key}`);
      return result === 1;
    },

    /**
     * Lista chaves por padrão (usando namespace)
     */
    async keys(pattern: string = '*'): Promise<string[]> {
      const client = await redisClient.getRedis();
      const keys = await client.keys(`${prefix}${pattern}`);
      // Remove o prefixo do retorno para manter compatibilidade
      return keys.map(k => k.substring(prefix.length));
    },

    /**
     * Incrementa counter
     */
    async incr(key: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.incr(`${prefix}${key}`);
    },

    /**
     * Decrementa counter
     */
    async decr(key: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.decr(`${prefix}${key}`);
    },

    /**
     * Define TTL para uma chave existente
     */
    async expire(key: string, ttlSeconds: number): Promise<boolean> {
      const client = await redisClient.getRedis();
      return await client.expire(`${prefix}${key}`, ttlSeconds);
    },

    /**
     * Obtém TTL restante
     */
    async ttl(key: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.ttl(`${prefix}${key}`);
    },

    /**
     * Hash get
     */
    async hget(hashKey: string, field: string): Promise<string | null> {
      const client = await redisClient.getRedis();
      return await client.hget(`${prefix}${hashKey}`, field);
    },

    /**
     * Hash set
     */
    async hset(hashKey: string, field: string, value: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.hset(`${prefix}${hashKey}`, field, value);
    },

    /**
     * Hash get all
     */
    async hgetall(hashKey: string): Promise<Record<string, string>> {
      const client = await redisClient.getRedis();
      return await client.hgetall(`${prefix}${hashKey}`);
    },

    /**
     * Hash delete field
     */
    async hdel(hashKey: string, field: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.hdel(`${prefix}${hashKey}`, field);
    },

    /**
     * SADD (set add)
     */
    async sadd(setKey: string, member: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.sadd(`${prefix}${setKey}`, member);
    },

    /**
     * SMEMBERS (set members)
     */
    async smembers(setKey: string): Promise<string[]> {
      const client = await redisClient.getRedis();
      return await client.smembers(`${prefix}${setKey}`);
    },

    /**
     * SREM (set remove)
     */
    async srem(setKey: string, member: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.srem(`${prefix}${setKey}`, member);
    },

    /**
     * Publishes mensagem em um canal (pub/sub)
     */
    async publish(channel: string, message: string): Promise<number> {
      const client = await redisClient.getRedis();
      return await client.publish(`${prefix}${channel}`, message);
    },
  };
}

// Clientes namespaced pré-criados (singletons)
let evolutionClient: ReturnType<typeof createNamespacedClient> | null = null;
let farmaClient: ReturnType<typeof createNamespacedClient> | null = null;
let broadcastClient: ReturnType<typeof createNamespacedClient> | null = null;
let rateLimitClient: ReturnType<typeof createNamespacedClient> | null = null;
let cacheClient: ReturnType<typeof createNamespacedClient> | null = null;
let sessionClient: ReturnType<typeof createNamespacedClient> | null = null;
let queueClient: ReturnType<typeof createNamespacedClient> | null = null;

/**
 * Retorna cliente Redis para Evolution API (com namespace 'evolution:')
 */
export function getEvolutionRedis(): ReturnType<typeof createNamespacedClient> {
  if (!evolutionClient) {
    evolutionClient = createNamespacedClient('EVOLUTION');
  }
  return evolutionClient;
}

/**
 * Retorna cliente Redis para Farma Francis (com namespace 'farma:')
 */
export function getFarmaRedis(): ReturnType<typeof createNamespacedClient> {
  if (!farmaClient) {
    farmaClient = createNamespacedClient('FARMA');
  }
  return farmaClient;
}

/**
 * Retorna cliente Redis para Broadcast (com namespace 'broadcast:')
 */
export function getBroadcastRedis(): ReturnType<typeof createNamespacedClient> {
  if (!broadcastClient) {
    broadcastClient = createNamespacedClient('BROADCAST');
  }
  return broadcastClient;
}

/**
 * Retorna cliente Redis para Rate Limiting (com namespace 'ratelimit:')
 */
export function getRateLimitRedis(): ReturnType<typeof createNamespacedClient> {
  if (!rateLimitClient) {
    rateLimitClient = createNamespacedClient('RATELIMIT');
  }
  return rateLimitClient;
}

/**
 * Retorna cliente Redis para Cache genérico (com namespace 'cache:')
 */
export function getCacheRedis(): ReturnType<typeof createNamespacedClient> {
  if (!cacheClient) {
    cacheClient = createNamespacedClient('CACHE');
  }
  return cacheClient;
}

/**
 * Retorna cliente Redis para Sessões (com namespace 'session:')
 */
export function getSessionRedis(): ReturnType<typeof createNamespacedClient> {
  if (!sessionClient) {
    sessionClient = createNamespacedClient('SESSION');
  }
  return sessionClient;
}

/**
 * Retorna cliente Redis para Filas (com namespace 'queue:')
 */
export function getQueueRedis(): ReturnType<typeof createNamespacedClient> {
  if (!queueClient) {
    queueClient = createNamespacedClient('QUEUE');
  }
  return queueClient;
}

/**
 * Helper para debugging: lista todas as chaves de um namespace
 */
export async function listNamespaceKeys(namespace: keyof typeof REDIS_NAMESPACES, pattern: string = '*'): Promise<string[]> {
  const client = createNamespacedClient(namespace);
  return await client.keys(pattern);
}

/**
 * Helper para debugging: limpa todas as chaves de um namespace
 */
export async function clearNamespace(namespace: keyof typeof REDIS_NAMESPACES, pattern: string = '*'): Promise<number> {
  const client = createNamespacedClient(namespace);
  const keys = await client.keys(pattern);
  if (keys.length === 0) return 0;

  const fullKeys = keys.map(k => `${REDIS_NAMESPACES[namespace]}${k}`);
  const redis = await redisClient.getRedis();
  return await redis.del(...fullKeys);
}
