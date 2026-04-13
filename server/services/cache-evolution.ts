/**
 * Evolution API Cache Service
 *
 * Cache inteligente para configurações da Evolution API
 * reduzindo queries ao banco e melhorando performance.
 *
 * Funciona COM ou SEM Redis. Se Redis estiver indisponível,
 * usa cache em memória (fallback do redis-namespaces).
 *
 * TTL padrão: 5 minutos (300s)
 */

import { getEvolutionRedis } from "../_core/redis-namespaces.js";
import { getDb } from "../db.js";
import {
  integrationSettings,
} from "../../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

const EVOLUTION_CONFIG_KEY = 'config:evolution';
const EVOLUTION_TTL = 300; // 5 minutos

// In-memory fallback for when Redis is completely unavailable
let memoryConfig: { data: any; expiresAt: number } | null = null;

/**
 * Busca configuração da Evolution API do cache ou banco
 */
export async function getEvolutionConfigWithCache() {
  // 1. Try memory cache first (fastest)
  if (memoryConfig && Date.now() < memoryConfig.expiresAt) {
    return memoryConfig.data;
  }

  // 2. Try Redis cache
  try {
    const cache = getEvolutionRedis();
    const cached = await cache.getJSON(EVOLUTION_CONFIG_KEY);
    if (cached) {
      memoryConfig = { data: cached, expiresAt: Date.now() + EVOLUTION_TTL * 1000 };
      return cached;
    }
  } catch {
    // Redis unavailable, continue to DB
  }

  // 3. Fetch from database
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(sql`integration_type = ${"evolution_api"}`)
    .limit(1);

  if (!config || !config.isActive) {
    throw new Error("Evolution API not configured");
  }

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;

  // 4. Save to caches
  const toCache = {
    apiUrl: configData.apiUrl,
    instanceName: configData.instanceName,
  };

  // Memory cache
  memoryConfig = { data: toCache, expiresAt: Date.now() + EVOLUTION_TTL * 1000 };

  // Redis cache (best effort)
  try {
    const cache = getEvolutionRedis();
    await cache.set(EVOLUTION_CONFIG_KEY, toCache, EVOLUTION_TTL);
  } catch {
    // Redis unavailable, already in memory cache
  }

  return toCache;
}

/**
 * Busca apenas a API Key (sempre do banco, nunca cache)
 */
export async function getEvolutionApiKey(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [config] = await db
    .select()
    .from(integrationSettings)
    .where(sql`integration_type = ${"evolution_api"}`)
    .limit(1);

  if (!config || !config.isActive) {
    throw new Error("Evolution API not configured");
  }

  const configData =
    typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;

  return (configData.apiKey as string) || (configData.accessToken as string);
}

/**
 * Invalida cache da Evolution
 */
export async function invalidateEvolutionCache(): Promise<void> {
  memoryConfig = null;
  try {
    const cache = getEvolutionRedis();
    await cache.del(EVOLUTION_CONFIG_KEY);
  } catch {
    // Redis unavailable
  }
}

/**
 * Obtém configuração completa (cache + apiKey separada)
 */
export async function getFullEvolutionConfig() {
  const [cached, apiKey] = await Promise.all([
    getEvolutionConfigWithCache(),
    getEvolutionApiKey().catch(() => null),
  ]);

  return {
    ...cached,
    apiKey,
  };
}
