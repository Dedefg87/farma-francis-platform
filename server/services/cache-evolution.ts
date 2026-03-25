/**
 * Evolution API Cache Service
 *
 * Cache inteligente para configurações da Evolution API
 * reduzindo queries ao banco e melhorando performance.
 *
 * TTL padrão: 5 minutos (300s)
 * Namespace: evolution:
 */

import { getEvolutionRedis } from "../_core/redis-namespaces.js";
import { getDb } from "../db.js";
import {
  integrationSettings,
} from "../../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

// Cache keys (sem prefixo, o namespace adiciona automaticamente)
const EVOLUTION_CONFIG_KEY = 'config:evolution';
const EVOLUTION_TTL = 300; // 5 minutos

/**
 * Busca configuração da Evolution API do cache ou banco
 */
export async function getEvolutionConfigWithCache() {
  const cache = getEvolutionRedis();

  try {
    // 1. Tentar cache
    const cached = await cache.getJSON(EVOLUTION_CONFIG_KEY);
    if (cached) {
      console.log('[CacheEvolution] ✅ Cache HIT (namespace:evolution:)');
      return cached;
    }

    console.log('[CacheEvolution] ⏳ Cache MISS — buscando no banco');

    // 2. Buscar do banco
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

    // 3. Salvar no cache
    const toCache = {
      apiUrl: configData.apiUrl,
      instanceName: configData.instanceName,
      // não cachear apiKey por segurança (buscar do banco quando necessário)
    };

    await cache.set(EVOLUTION_CONFIG_KEY, toCache, EVOLUTION_TTL);
    console.log('[CacheEvolution] 💾 Cache SET (TTL 300s, namespace:evolution:)');

    return configData;
  } catch (error) {
    console.error('[CacheEvolution] ❌ Erro:', error.message);
    throw error;
  }
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
 * Invalida cache da Evolution (útil quando config é atualizada)
 */
export async function invalidateEvolutionCache(): Promise<void> {
  const cache = getEvolutionRedis();
  await cache.del(EVOLUTION_CONFIG_KEY);
  console.log('[CacheEvolution] 🗑️ Cache invalidado (namespace:evolution:)');
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
