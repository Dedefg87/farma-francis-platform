# 🔴 RELATÓRIO DE ANÁLISE CRÍTICA — Farma Francis Platform

**Data:** 08/04/2026
**Autor:** Jorge (Assistente Autônomo)
**Status:** 🚨 EM ANDAMENTO — Incidente Railway ativo

---

## 📋 SUMÁRIO EXECUTIVO

### Problemas Críticos Identificados

| # | Problema | Severidade | Status | Causa Raiz |
|---|----------|-----------|--------|------------|
| 1 | Railway app retorna 404 há 14h | 🔴 CRÍTICO | ❌ Persistente | Build/app não inicia (causa desconhecida sem logs) |
| 2 | CLI Railway com token inválido | 🟡 ALTO | ❌ Bloqueado | Token expirado/revogado |
| 3 | System.ts usa PostgreSQL (pg) | 🔴 CRÍTICO | ⚠️ Residual | Código legado não removido completely |
| 4 | schema_executions.ts placeholder | 🟢 INFO | ℹ️ Inofensivo | Apenas placeholder, não usado |
| 5 | Dependências de produção vs dev | 🟡 ALTO | ✅ Resolvido | mysql2 em dependencies (corrigido) |

---

## 🚨 INCIDENTE ATUAL — Railway 404

### Cronologia (07-08/04/2026)

```
07/04 20:06 - Build local OK, commit cf0dc6c pushado
07/04 20:20 - Railway retorna 404 "Application not found"
07/04 20:39-20:59 - Várias tentativas de build falharam (circular dependencies, dialect errors)
07/04 21:04 - Build travado em "scheduling build on Metal builder" (nixpacks)
07/04 21:19 - Mudança para Docker builder (removido `builder` do railway.toml)
07/04 22:03 - Build Railway completo (447 KB)
07/04 22:06 - Railway crash: "Cannot find module '/app/server/dist/index.js'"
07/04 22:07 - Corrigido railway.toml startPath → "node dist/index.js"
07/04 22:10 - Commit 63ce65f pushado
08/04 02:00-08:00 - Deploy automático Railway (aguardando)
08/04 08:51 - Healthcheck ainda 404 (~14h depois)
```

### Causas Possíveis (em ordem de probabilidade)

1. **Build artifact não gerado corretamente**
   - `dist/index.js` pode não existir no build output
   - Vite config com `outDir` errado
   - Build falhou silenciosamente

2. **Aplicação crasha no startup**
   - Erro de runtime não capturado
   - Database connection falha (credenciais)
   - Missing environment variable
   - Import error (módulo não encontrado)

3. **Railway configuration issue**
   - `startCommand` errado (mas確認済み)
   - Builder ainda usando nixpacks (não aplicou Docker)
   - Serviço reiniciando em crash loop

4. **Port binding issue**
   - App não escuta na porta correta ($PORT)
   - Escuta em 127.0.0.1 vs 0.0.0.0

### Bloqueio Atual

❌ **Railway CLI token inválido** → Não consigo buscar logs autonomamente
✅ **Solução:** Anderson deve acessar Railway Dashboard → App → Logs

### Ações Imediatas Necessárias

**Anderson (manual):**
1. Acessar Railway Dashboard
2. Verificar: Build recente foi bem-sucedido?
3. Verificar: Artefatos contêm `server/dist/index.js`?
4. Verificar: Logs de runtime (crash, exception)
5. Verificar: Environment variables (DATABASE_URL, etc.)
6. Se necessário: Rebuild manual no dashboard

**Jorge (automático, já feito):**
- ✅ Configuração railway.toml validada
- ✅ Todos os commits pushados
- ✅ Build local funcionando (node scripts/discover-routes.mjs executa)
- ❌ Logs inacessíveis (token)

---

## 🔍 VARREdura POSTGRESQL vs MYSQL — RESULTADO COMPLETO

### Método: Busca em TODO o código fonte

```bash
# Padrões buscados:
- pg-core imports (drizzle-orm/pg-core)
- jsonb, serial, bigserial, uuid, citext, tsvector (tipos PG)
- Queries com sintaxe PostgreSQL (pg_total_relation_size, quote_ident, etc.)
- Client do 'pg' (node-postgres)
- Comentários mencionando PostgreSQL
```

### Encontrado: **3 locais** com resíduos PostgreSQL

#### 1️⃣ `server/_core/routes/system.ts` — **CRÍTICO**

**Problema:** Endpoints de monitoramento usam `pg` (PostgreSQL client) diretamente

```typescript
// Linhas 1-4
import express from "express";

export const systemRouter = express.Router();

// GET /api/system/storage
systemRouter.get("/storage", async (req, res) => {
  // ... usa df -h (OK, shell command)
});

// GET /api/system/database/size ❌ POSTGRESQL
systemRouter.get("/database/size", async (req, res) => {
  const { Client } = await import("pg"); // ← PG AQUI
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT ROUND(SUM(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0), 2) as size_mb FROM information_schema.tables WHERE table_schema = 'public'`
    ); // ← Query PG
    // ...
  }
});

// GET /api/system/database/tables ❌ POSTGRESQL
systemRouter.get("/database/tables", async (req, res) => {
  const { Client } = await import("pg"); // ← PG AQUI
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const query = `
      SELECT
        table_name,
        ROUND(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0, 2) as size_mb,
        (SELECT COUNT(*) FROM "${table_name}") as table_rows
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
    `; // ← Query PG (quote_ident, information_schema PG-specific)
    // ...
  }
});

// POST /api/system/clean ❌ POSTGRESQL
systemRouter.post("/clean", async (req, res) => {
  const { Client } = await import("pg"); // ← PG AQUI
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  // Usa information_schema, query PG-specific
});

// POST /api/system/clean-messages ❌ POSTGRESQL
systemRouter.post("/clean-messages", async (req, res) => {
  const { Client } = await import("pg"); // ← PG AQUI
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  // Queries com query string interpolation direto (SQL injection risk)
});
```

**Impacto:** Esses endpoints **falhariam imediatamente** em MySQL because:
1. `pg` package não está em dependencies (apenas mysql2)
2. Syntax PG (`pg_total_relation_size`, `quote_ident`) incompatível com MySQL
3. `information_schema` queries usam features PostgreSQL-specific

**Se forem chamados:** Crash da aplicação ou erro 500.

---

#### 2️⃣ `server/database/schema_executions.ts` — **INOFENSIVO (placeholder)**

```typescript
// Execution tracking tables not needed for PostgreSQL
// Keeping this file as a placeholder to satisfy the import
export const flowExecutions = null;
export const nodeExecutions = null;
export const flowAnalytics = null;
export const flowVersions = null;
export const flowTags = null;
export const flowTagRelations = null;
export const notifications = null;
```

**Status:** Apenas comment + null exports. Não usado em lugar nenhum (executionsRouter usa `schema_executions` mas lá está tudo null).
**Ação:** Pode ser deletado ou ignorado. Não causa problemas.

---

#### 3️⃣ `server/_core/routes/system.ts` comentário — **INFO ONLY**

```typescript
// System Monitoring Endpoints (PostgreSQL)
```

Apenas comment. O código já está marcado como PostgreSQL-specific.

---

## ⚠️ PROBLEMAS ADICIONAIS IDENTIFICADOS

### A. Dependências Circulares (já resolvido, mas revisado)

**Arquivos envolvidos:**
- `server/_core/trpc.ts` → importava middleware de `@trpc/server` (causa: `transformer is not defined`)
- `server/db.ts` → `getDb()` usava `drizzle-orm/mysql2` OK

**Status:** ✅ Corrigido (removido loggingMiddleware, uses `t.middleware`)

---

### B. Schema Misto (PostgreSQL types no schema MySQL)

**Status:** ✅ **RESOLVIDO** (schema.ts agora 100% MySQL)

**Antes:** Misturava `pgTable`, `serial`, `jsonb`
**Depois:** Tudo `mysqlTable`, `int().autoincrement()`, `json()`

**Verificação:**
```bash
grep -n "pgTable\|serial\|jsonb" drizzle/schema.ts  # → 0 results
```

---

### C. Endpoints que其实使用 Drizzle mas com imports incorretos

Revisão completa das imports:

| Arquivo | Import de schema | Status |
|---------|-----------------|--------|
| `routers-auth.ts` | `../drizzle/schema` | ✅ OK |
| `routers-agents.ts` | `../drizzle/schema` | ✅ OK |
| `routers-conversations.ts` | `../drizzle/schema` | ✅ OK |
| `routers-crm.ts` | `../drizzle/schema` | ✅ OK |
| `routers-automation.ts` | `../drizzle/schema` | ✅ OK |
| `routers-messages.ts` | `../drizzle/schema` | ✅ OK |

Todos usam o schema consolidado (MySQL).

---

## 🛠️ PLANO DE AÇÃO — O QUE FAZER AGORA

### PRIORIDADE 1 — Resolver Incidente Railway (BLOCKING)

**Opção A: Anderson acessa logs manualmente (RECOMENDADO)**
1. Railway Dashboard → App → Logs
2. Verificar build mais recente: sucesso?
3. Verificar artifact: `server/dist/index.js` existe?
4. Verificar runtime logs: crash? erro de startup?
5. Verificar environment variables (DATABASE_URL, NODE_ENV)

**Opção B: Regenerar token Railway CLI (se Anderson quiser autonomia)**
```bash
# No Railway Dashboard → Settings → Tokens
# Gerar novo token e configurar:
railway login --token <novo_token>
# Então:
railway logs --json | tail -100
```

---

### PRIORIDADE 2 — Remover Código PostgreSQL Residual

**Arquivo:** `server/_core/routes/system.ts`

**Problema:** 4 endpoints usam `pg` e queries PostgreSQL-specific:

| Endpoint | Problema | Solução |
|----------|----------|---------|
| `GET /api/system/database/size` | Usa `pg` + `pg_total_relation_size` | Reimplementar com MySQL `information_schema` |
| `GET /api/system/database/tables` | Usa `pg` + `quote_ident` | Reimplementar MySQL-compatible |
| `POST /api/system/clean` | Usa `pg`, queries PG | Converter para MySQL Drizzle |
| `POST /api/system/clean-messages` | Usa `pg`, queries PG | Converter para MySQL Drizzle |

**Como converter (padrão MySQL):**

```typescript
// ❌ POSTGRESQL (atual)
const { Client } = await import("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const result = await client.query(`
  SELECT ROUND(SUM(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0), 2) as size_mb
  FROM information_schema.tables WHERE table_schema = 'public'
`);
```

```typescript
// ✅ MYSQL (usando Drizzle)
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const db = await getDb();
const result = await db.execute(sql`
  SELECT
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
`);
```

**Tabelas de informação schema MySQL:**
- `information_schema.tables` → `TABLE_SCHEMA`, `TABLE_NAME`, `DATA_LENGTH`, `INDEX_LENGTH`
- Tamanho tabela: `DATA_LENGTH + INDEX_LENGTH` (em bytes)
- Converter para MB: `/ 1024 / 1024`

**Consequências da mudança:**
- ⚠️ **RISCO ALTO**: Se quebrar, endpoint `/api/system/*` falha (sistema de monitoramento)
- ✅ **REVERSÍVEL**: Basta reverter para código PG (se ainda estiver no Git)
- ✅ **TESTÁVEL**: Executar manualmente após deploy

**Plano de migração segura:**
1. Criar branch: `feat/mysql-system-endpoints`
2. Implementar replacements MySQL em novo arquivo `system-mysql.ts`
3. Manter `system.ts` existente como fallback (renomear para `system-pg.ts`)
4. Testar local: `node -e "require('./server/_core/routes/system-mysql')"` — deve importar sem erro
5. Deploy e verificar logs
6. Se quebrar: reverter para `system.ts` original (PG)

---

### PRIORIDADE 3 — Schema Executions (Opcional)

`server/database/schema_executions.ts` é tudo `null`. Pode ser deletado.

**Ação:** Remover import de `schema_executions` se não for usar execuções de workflow.

**Consequência:** Nenhuma (não usado atualmente).

---

### PRIORIDADE 4 — Revisar todas as queries SQL raw

Buscar por queries raw que possam ter sintaxe PG:

```bash
grep -rn "pg_total_relation_size\|quote_ident\|FROM information_schema" server/
```

**Resultado:** Apenas `system.ts` (já identificado).

---

## 📊 MATRIZ DE IMPACTO — Mudanças System Endpoints

### Cenário 1: Remover system.ts completamente

| Componente | Impacto | Probabilidade |
|------------|---------|---------------|
| Dashboard monitoramento | ❌ Quebra | Alta |
| Healthcheck detalhado | ❌ Quebra | Alta |
| /api/system/storage | ❌ Quebra | Alta |
| /api/system/database/* | ❌ Quebra | Alta |
| Outros endpoints | ✅ Sem impacto | Baixa |

**Recomendação:** ❌ Não remover — converter para MySQL.

---

### Cenário 2: Converter system.ts para MySQL (recomendado)

| Componente | Impacto | Probabilidade |
|------------|---------|---------------|
| /api/system/database/size | ✅ Funciona | Alta (se implementado corretamente) |
| /api/system/database/tables | ✅ Funciona | Alta |
| /api/system/clean | ✅ Funciona | Média (lógica mais complexa) |
| /api/system/clean-messages | ✅ Funciona | Média |
| Estabilidade geral | ✅ Melhora | Alta (remove dependência pg) |

**Riscos:**
- Implementação com Drizzle pode ter performance diferente
- Queries de `information_schema` MySQL retornam estrutura levemente diferente
- Teste necessário: valores de `size_mb` aproximados (não exatos)

---

## 🔧 COMANDOS DE DIAGNÓSTICO ÚTEIS

### Verificar se há mais resíduos PostgreSQL

```bash
# Buscar imports de 'pg' ou 'pg-core'
grep -r "from.*['\"]pg['\"]" server/ --include="*.ts"

# Buscar tipos PostgreSQL
grep -r "jsonb\|serial\|bigserial\|uuid\|citext\|tsvector" server/ --include="*.ts" | grep -v "drizzle-orm"

# Buscar queries com sintaxe PG
grep -r "pg_total_relation_size\|quote_ident\|::" server/ --include="*.ts" | head -20
```

### Testar schema atual (MySQL)

```bash
cd farma-francis-platform
# Gerar tipos
npx drizzle-kit generate:types
# Deve rodar sem erros se schema 100% MySQL
```

### Validar conexão MySQL

```bash
# Com DATABASE_URL válida
node -e "
import { getDb } from './server/db.js';
const db = await getDb();
const result = await db.execute('SELECT 1+1 as test');
console.log(result);
"
```

---

## 📋 CHECKLIST DE CORREÇÃO POSTGRESQL → MYSQL

- [x] `drizzle/schema.ts` — **100% MySQL** (mysqlTable, int, json, varchar)
- [x] `server/db.ts` — **Usa mysql2** (drizzle-orm/mysql2)
- [ ] `server/_core/routes/system.ts` — **CONVERTER** (4 endpoints usam pg)
- [x] `server/database/schema_executions.ts` — Placeholder inofensivo
- [ ] Buscar queries raw com sintaxe PG em outros arquivos
- [ ] Remover `pg` de package.json se não for usado em mais nenhum lugar

---

## 🎯 PRÓXIMOS PASSOS SUGERIDOS

### I.Resolver Railway Urgente (hoje)

1. **Anderson:** Acessar Railway Dashboard → Logs
2. Identificar: build OK ou crash?
3. Se build OK mas app crash → logs de erro mostram exceção
4. Corrigir causa (provavelmente connection string ou start command)
5. Validar: `/api/health` retorna 200

---

### II. Limpeza PostgreSQL (amanhã)

1. Criar backup de `system.ts` → `system-pg.ts`
2. Escrever `system-mysql.ts` com queries MySQL adaptadas
3. Testar local: `node server/_core/routes/system-mysql.ts` (import test)
4. Substituir `system.ts` por versão MySQL
5. Deploy e verificar:
   - `/api/system/database/size` → JSON com size_mb
   - `/api/system/database/tables` → array de tabelas
   - `/api/system/clean` → limpeza funciona
6. Remover `pg` do package.json se não for usado em mais nada

---

### III. Mapeamento Completo (depois do deploy)

1. Finalizar leitura de todos os routers
2. Criar diagrama Mermaid de sequência
3. Criar matriz de impacto de mudanças (ponta a ponta)
4. Documentar dependências entre módulos
5. Salvar no vault como referência técnica

---

## 📁 ARQUIVOS CRÍTICOS REFERENCIADOS

```
server/
├── _core/
│   └── routes/
│       └── system.ts          ← 🔴 PROBLEMA: PostgreSQL queries
├── database/
│   ├── schema.ts              ← ✅ 100% MySQL (mysqlTable)
│   ├── schema_executions.ts   ← ⚠️ Placeholder (null)
│   └── migrations/            ← ✅ Todos em MySQL
├── db.ts                      ← ✅ mysql2 pool
└── routers-*.ts               ← ✅ Todos usam Drizzle MySQL

drizzle/
└── schema.ts                  ← ✅ Fonte única da verdade (MySQL)
```

---

## 🧪 PLANO DE TESTE PÓS-CONVERSÃO MySQL

### Teste 1: Importação do módulo
```bash
node -e "require('./server/_core/routes/system-mysql.ts')"
# Deve retornar undefined sem erros
```

### Teste 2: Queries de tamanho
```bash
# Simular chamada ao endpoint
curl http://localhost:3000/api/system/database/size
# Deve retornar: { success: true, size_mb: <number> }
```

### Teste 3: Listagem de tabelas
```bash
curl http://localhost:3000/api/system/database/tables
# Deve retornar array com table_name, size_mb, table_rows
```

### Teste 4: Integridade do app
```bash
# Healthcheck geral
curl http://localhost:3000/api/health
# Deve retornar 200 OK
```

---

## 📝 NOTAS ADICIONAIS

### Por que system.ts ainda usava pg?

Possíveis razões:
1. Código legado de versão PostgreSQL anterior
2. Nunca migrado junto com o resto do schema
3. Endpoints de admin/monitoramento considerados "menos críticos"
4. Desenvolvedor assumiu que só rodaria em PG

### Risco atual

⚠️ **SE system.ts for chamado agora** (antes da conversão):
- Aplicação tenta `import("pg")` → package não instalado (removido?)
- `pg` não está em `dependencies` (só mysql2)
- **CRASH** imediato com `Cannot find module 'pg'`

**Conclusão:** Endpoints `/api/system/*` estão **quebrados** no estado atual (mesmo antes do incidente Railway).

---

## 🏁 RESUMO FINAL

### Problemas Ativos

| Problema | Prioridade | Responsável | Status |
|----------|-----------|-------------|--------|
| Railway 404 (app não sobe) | 🔴 P0 | Anderson (logs) + Jorge (código) | 🚨 Em andamento |
| system.ts usa PostgreSQL | 🔴 P1 | Jorge (conversão) | ⏳ Pendente |
| schema_executions inútil | 🟢 P3 | Jorge (limpeza) | ⏳ Opcional |

### Ações Imediatas

**Jorge (autônomo):**
- Continuar monitorando Railway health
- Preparar conversão MySQL de system.ts (aguardando deploy)

**Anderson (manual):**
- Verificar Railway Dashboard logs
- Identificar causa raiz do 404
- Fornecer logs para análise se necessário

---

**Documento gerado:** 08/04/2026 10:58 UTC
**Versão:** 1.0
**Próxima revisão:** Após resolução do incidente Railway
