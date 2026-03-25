/**
 * Rate Limiting Middleware (Redis-backed)
 *
 * Protege endpoints críticos contra abuso usando Redis com namespaces.
 * Mais eficiente que o rate-limit em memória padrão.
 *
 * Namespace: ratelimit:
 */

import { Request, Response, NextFunction } from 'express';
import { getRateLimitRedis, REDIS_NAMESPACES } from '../_core/redis-namespaces.js';

export interface RateLimitConfig {
  windowMs: number;          // janela em ms (ex: 60 * 1000 = 1 minuto)
  max: number;               // max requests por janela
  keyGenerator?: (req: Request) => string;  // gera chave única (IP, user, etc)
  onLimitReached?: (req: Request) => void; // callback
  skip?: (req: Request) => boolean;         // pular rate limit (ex: health checks)
}

/**
 * Cria middleware de rate limiting
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || 'anonymous',
    skip = () => false,
    onLimitReached,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip se configurado (ex: health checks)
    if (skip(req)) {
      return next();
    }

    const cache = getRateLimitRedis();
    const key = keyGenerator(req); // sem prefixo, o namespace já adiciona

    try {
      // Usar sliding window com Redis sorted set
      const now = Date.now();
      const client = await cache.getRedis(); // cliente ioredis subjacente
      const fullKey = `${REDIS_NAMESPACES.RATELIMIT}${key}`;

      // Pipeline para eficiência
      const pipeline = client.pipeline();

      // 1. Remover entradas antigas (fora da janela)
      pipeline.zremrangebyscore(fullKey, 0, now - windowMs);

      // 2. Contar requisições na janela atual
      pipeline.zcard(fullKey);

      // 3. Adicionar requisição atual (score = timestamp)
      pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);

      // 4. Expirar chave após windowMs (limpeza automática)
      pipeline.expire(fullKey, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results?.[1]?.[1] as number || 0;

      // Definir headers de rate limit
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentCount).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());

      if (currentCount >= max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
        if (onLimitReached) {
          onLimitReached(req);
        }
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('[RateLimit] Erro:', error);
      // Em caso de erro no Redis, não bloquear a requisição
      next();
    }
  };
}

/**
 * Factory para rate limits comuns
 */
export const rateLimiters = {
  /**
   * Geral: 100 req/min por IP
   */
  general: (max = 100, windowMs = 60 * 1000) =>
    createRateLimiter({ windowMs, max }),

  /**
   * API auth: 10 req/min por IP
   */
  auth: (max = 10, windowMs = 60 * 1000) =>
    createRateLimiter({ windowMs, max, keyGenerator: (req) => `${req.ip}:auth` }),

  /**
   * Webhooks: 60 req/min por endpoint
   */
  webhook: (max = 60, windowMs = 60 * 1000) =>
    createRateLimiter({
      windowMs,
      max,
      keyGenerator: (req) => `${req.path}:${req.ip}`,
    }),

  /**
   * Upload: 30 req/5min por IP (evita spam de arquivos)
   */
  upload: (max = 30, windowMs = 5 * 60 * 1000) =>
    createRateLimiter({ windowMs, max, keyGenerator: (req) => req.ip }),
};
