#!/usr/bin/env node
/**
 * Sistema de Mapeamento Completo de Rotas e Features
 * Escaneia o código fonte e extrai:
 * - Todos os routers e endpoints
 * - Dependências entre módulos
 * - Fluxos de dados ponta-a-ponta
 * - Matriz de impacto de mudanças
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Patterns para extração de endpoints
const patterns = {
  tRPCProcedure: /(?:publicProcedure|protectedProcedure|adminProcedure)\s*\.\s*(?:input|mutation|query)\s*\(\s*\(?\s*\{?\s*input\s*\}\)?\s*=>/g,
  expressRouter: /router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g,
  trpcExport: /export\s+const\s+(\w+Router)\s*=\s*router\s*\(/g,
};

const discovered = {
  routers: [],
  endpoints: [],
  dependencies: new Set(),
  features: new Map(),
};

// Mapeamento de features conhecidas
const featureKeywords = {
  'auth': ['login', 'logout', 'me', 'auth'],
  'agents': ['agent', 'agents', 'performance'],
  'employees': ['employees', 'employee', 'funcionario'],
  'ai': ['ai', 'whisper', 'transcribe', 'suggestion', 'sentiment'],
  'automation': ['automation', 'flow', 'visualFlows', 'template'],
  'baby-shower': ['baby', 'shower', 'gift', 'package', 'purchase'],
  'broadcast': ['broadcast', 'blaster', 'campaign'],
  'conversations': ['conversation', 'conversations'],
  'crm': ['crm', 'lead', 'contact'],
  'customers': ['customer', 'customers'],
  'dashboard': ['dashboard', 'stats', 'metrics'],
  'employees': ['employees', 'employee'],
  'executions': ['execution', 'executions'],
  'inbox': ['inbox'],
  'leads': ['lead', 'leads'],
  'logs': ['log', 'logs'],
  'messages': ['message', 'messages'],
  'migration': ['migration', 'migrate'],
  'pauses': ['pause', 'pauses'],
  'queues': ['queue', 'queues'],
  'quick-replies': ['quick', 'reply', 'replies'],
  'survey': ['survey'],
  'system': ['system', 'health', 'clean'],
  'tags': ['tag', 'tags'],
  'telemetry': ['telemetry'],
};

function categorizeFeature(endpointName: string, filePath: string): string {
  const combined = `${endpointName} ${filePath}`.toLowerCase();

  for (const [feature, keywords] of Object.entries(featureKeywords)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        return feature;
      }
    }
  }

  // Detectar pelo caminho do arquivo
  if (filePath.includes('routers-')) {
    const match = filePath.match(/routers-([^.]+)/);
    if (match) return match[1];
  }

  return 'uncategorized';
}

function extractEndpointsFromFile(filePath: string, content: string) {
  const relativePath = path.relative(rootDir, filePath);
  const routerMatches = content.matchAll(patterns.trpcExport);

  for (const match of routerMatches) {
    const routerName = match[1];
    discovered.routers.push({ name: routerName, file: relativePath });
    discovered.features.set(routerName, categorizeFeature(routerName, relativePath));
  }

  // Extrair endpoints tRPC
  const procedureMatches = content.matchAll(
    /(\w+)\s*:\s*(?:public|protected|admin)Procedure\s*\.\s*(?:query|mutation)\s*\(/g
  );
  for (const match of procedureMatches) {
    const procedureName = match[1];
    const feature = discovered.features.get(procedureName) || categorizeFeature(procedureName, relativePath);
    discovered.endpoints.push({
      name: procedureName,
      router: routerNameFromPath(relativePath),
      file: relativePath,
      type: 'tRPC',
      feature,
    });
    discovered.dependencies.add(feature);
  }

  // Extrair endpoints Express
  const expressMatches = content.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g);
  for (const match of expressMatches) {
    const method = match[1];
    const route = match[2];
    discovered.endpoints.push({
      name: `${method.toUpperCase()} ${route}`,
      router: routerNameFromPath(relativePath),
      file: relativePath,
      type: 'Express',
      feature: categorizeFeature(route, relativePath),
    });
  }
}

function routerNameFromPath(filePath: string): string {
  const basename = path.basename(filePath);
  if (basename.startsWith('routers-') && basename.endsWith('.ts')) {
    return basename.replace('.ts', '').replace('routers-', '');
  }
  if (basename === 'index.ts' && filePath.includes('routers/')) {
    return 'aggregator';
  }
  return basename.replace('.ts', '');
}

// Scan all TypeScript files in server directory
const serverDir = path.join(rootDir, 'server');

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Skip node_modules and generated files
      if (fullPath.includes('node_modules') || fullPath.includes('.gen')) continue;

      extractEndpointsFromFile(fullPath, content);
    }
  }
}

console.log('🔍 Scanning server directory for routes...\n');
scanDirectory(serverDir);

// Build feature map
const featuresMap = new Map();
for (const [router, feature] of discovered.features) {
  if (!featuresMap.has(feature)) {
    featuresMap.set(feature, { routers: [], endpoints: [] });
  }
  featuresMap.get(feature).routers.push(router);

  const routerEndpoints = discovered.endpoints.filter(e => e.router === router || e.file.includes(router));
  featuresMap.get(feature).endpoints.push(...routerEndpoints);
}

// Output JSON report
const report = {
  summary: {
    totalRouters: discovered.routers.length,
    totalEndpoints: discovered.endpoints.length,
    features: Array.from(featuresMap.keys()),
  },
  routers: discovered.routers,
  endpoints: discovered.endpoints,
  features: Object.fromEntries(featuresMap),
  dependencies: Array.from(discovered.dependencies),
};

fs.writeFileSync(
  path.join(rootDir, 'system-map.json'),
  JSON.stringify(report, null, 2)
);

console.log('✅ System map generated at farma-francis-platform/system-map.json');
console.log(`📊 Found ${discovered.routers.length} routers, ${discovered.endpoints.length} endpoints`);
console.log(`🎯 Features: ${Array.from(featuresMap.keys()).join(', ')}`);
