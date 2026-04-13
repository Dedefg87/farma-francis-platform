/**
 * Redis Namespaces
 *
 * Proporciona isolamento de dados entre serviços (Evolution API, Farma Francis, etc.)
 * no mesmo Redis compartilhado, evitando colisões de chaves.
 *
 * FALLBACK: Se Redis não estiver disponível, usa cache em memória.
 */

import { getRedis as getGlobalRedis } from './redis.js';

// Namespaces para separar dados por serviço
export const REDIS_NAMESPACES = {
  EVOLUTION: 'evolution:',
  FARMA: 'farma:',
  BROADCAST: 'broadcast:',
  RATELIMIT: 'ratelimit:',
  CACHE: 'cache:',
  SESSION: 'session:',
  QUEUE: 'queue:',
} as const;

// In-memory fallback cache (used when Redis is unavailable)
const memoryCache = new Map<string, { value: string; expiresAt: number | null }>();

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds?: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

/**
 * Cria um wrapper de namespace para operações Redis
 * Com fallback para cache em memória se Redis não estiver disponível.
 */
export function createNamespacedClient(namespace: keyof typeof REDIS_NAMESPACES) {
  const prefix = REDIS_NAMESPACES[namespace];

  return {
    async _getClient() {
      try {
        return await getGlobalRedis();
      } catch {
        return null; // Redis unavailable
      }
    },

    async get(key: string): Promise<string | null> {
      const client = await this._getClient();
      if (!client) return memoryGet(`${prefix}${key}`);
      try {
        return await client.get(`${prefix}${key}`);
      } catch {
        return memoryGet(`${prefix}${key}`);
      }
    },

    async getJSON<T = any>(key: string): Promise<T | null> {
      const value = await this.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    },

    async set(key: string, value: string | object, ttlSeconds?: number): Promise<'OK' | null> {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const fullKey = `${prefix}${key}`;

      // Always set in memory cache as fallback
      memorySet(fullKey, serialized, ttlSeconds);

      const client = await this._getClient();
      if (!client) return 'OK'; // Stored in memory

      try {
        if (ttlSeconds) {
          return await client.setex(fullKey, ttlSeconds, serialized);
        } else {
          return await client.set(fullKey, serialized);
        }
      } catch {
        return 'OK'; // Already stored in memory
      }
    },

    async setnx(key: string, value: string | object, ttlSeconds?: number): Promise<boolean> {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const fullKey = `${prefix}${key}`;
      const client = await this._getClient();
      if (!client) {
        // Memory fallback
        if (memoryGet(fullKey)) return false;
        memorySet(fullKey, serialized, ttlSeconds);
        return true;
      }
      try {
        if (ttlSeconds) {
          const result = await client.set(fullKey, serialized, 'EX', ttlSeconds, 'NX');
          return result === 'OK';
        } else {
          const result = await client.set(fullKey, serialized, 'NX');
          return result === 'OK';
        }
      } catch {
        if (memoryGet(fullKey)) return false;
        memorySet(fullKey, serialized, ttlSeconds);
        return true;
      }
    },

    async del(key: string): Promise<number> {
      const fullKey = `${prefix}${key}`;
      memoryCache.delete(fullKey);
      const client = await this._getClient();
      if (!client) return 1;
      try {
        return await client.del(fullKey);
      } catch {
        return 1;
      }
    },

    async exists(key: string): Promise<boolean> {
      const fullKey = `${prefix}${key}`;
      if (memoryCache.has(fullKey)) return true;
      const client = await this._getClient();
      if (!client) return false;
      try {
        const result = await client.exists(fullKey);
        return result === 1;
      } catch {
        return false;
      }
    },

    async keys(pattern: string = '*'): Promise<string[]> {
      const client = await this._getClient();
      if (!client) return [];
      try {
        const keys = await client.keys(`${prefix}${pattern}`);
        return keys.map(k => k.substring(prefix.length));
      } catch {
        return [];
      }
    },

    async incr(key: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.incr(`${prefix}${key}`);
      } catch {
        return 0;
      }
    },

    async decr(key: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.decr(`${prefix}${key}`);
      } catch {
        return 0;
      }
    },

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
      const client = await this._getClient();
      if (!client) return false;
      try {
        return await client.expire(`${prefix}${key}`, ttlSeconds);
      } catch {
        return false;
      }
    },

    async ttl(key: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return -1;
      try {
        return await client.ttl(`${prefix}${key}`);
      } catch {
        return -1;
      }
    },

    async hget(hashKey: string, field: string): Promise<string | null> {
      const client = await this._getClient();
      if (!client) return null;
      try {
        return await client.hget(`${prefix}${hashKey}`, field);
      } catch {
        return null;
      }
    },

    async hset(hashKey: string, field: string, value: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.hset(`${prefix}${hashKey}`, field, value);
      } catch {
        return 0;
      }
    },

    async hgetall(hashKey: string): Promise<Record<string, string>> {
      const client = await this._getClient();
      if (!client) return {};
      try {
        return await client.hgetall(`${prefix}${hashKey}`);
      } catch {
        return {};
      }
    },

    async hdel(hashKey: string, field: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.hdel(`${prefix}${hashKey}`, field);
      } catch {
        return 0;
      }
    },

    async sadd(setKey: string, member: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.sadd(`${prefix}${setKey}`, member);
      } catch {
        return 0;
      }
    },

    async smembers(setKey: string): Promise<string[]> {
      const client = await this._getClient();
      if (!client) return [];
      try {
        return await client.smembers(`${prefix}${setKey}`);
      } catch {
        return [];
      }
    },

    async srem(setKey: string, member: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.srem(`${prefix}${setKey}`, member);
      } catch {
        return 0;
      }
    },

    async publish(channel: string, message: string): Promise<number> {
      const client = await this._getClient();
      if (!client) return 0;
      try {
        return await client.publish(`${prefix}${channel}`, message);
      } catch {
        return 0;
      }
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

export function getEvolutionRedis(): ReturnType<typeof createNamespacedClient> {
  if (!evolutionClient) {
    evolutionClient = createNamespacedClient('EVOLUTION');
  }
  return evolutionClient;
}

export function getFarmaRedis(): ReturnType<typeof createNamespacedClient> {
  if (!farmaClient) {
    farmaClient = createNamespacedClient('FARMA');
  }
  return farmaClient;
}

export function getBroadcastRedis(): ReturnType<typeof createNamespacedClient> {
  if (!broadcastClient) {
    broadcastClient = createNamespacedClient('BROADCAST');
  }
  return broadcastClient;
}

export function getRateLimitRedis(): ReturnType<typeof createNamespacedClient> {
  if (!rateLimitClient) {
    rateLimitClient = createNamespacedClient('RATELIMIT');
  }
  return rateLimitClient;
}

export function getCacheRedis(): ReturnType<typeof createNamespacedClient> {
  if (!cacheClient) {
    cacheClient = createNamespacedClient('CACHE');
  }
  return cacheClient;
}

export function getSessionRedis(): ReturnType<typeof createNamespacedClient> {
  if (!sessionClient) {
    sessionClient = createNamespacedClient('SESSION');
  }
  return sessionClient;
}

export function getQueueRedis(): ReturnType<typeof createNamespacedClient> {
  if (!queueClient) {
    queueClient = createNamespacedClient('QUEUE');
  }
  return queueClient;
}

export async function listNamespaceKeys(namespace: keyof typeof REDIS_NAMESPACES, pattern: string = '*'): Promise<string[]> {
  const client = createNamespacedClient(namespace);
  return await client.keys(pattern);
}

export async function clearNamespace(namespace: keyof typeof REDIS_NAMESPACES, pattern: string = '*'): Promise<number> {
  const client = createNamespacedClient(namespace);
  const keys = await client.keys(pattern);
  if (keys.length === 0) return 0;

  const fullKeys = keys.map(k => `${REDIS_NAMESPACES[namespace]}${k}`);
  const redis = await getGlobalRedis().catch(() => null);
  if (!redis) return 0;
  return await redis.del(...fullKeys);
}
