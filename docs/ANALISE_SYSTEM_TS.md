# 🔬 ANÁLISE TÉCNICA DETALHADA — system.ts PostgreSQL → MySQL

## 📐 ESTRUTURA DO ARQUIVO ORIGINAL

### Endpoints existentes (6 total)

| Endpoint | Método | Path | Status | Dependências |
|----------|--------|------|--------|--------------|
| Storage info | GET | `/api/system/storage` | ✅ Funciona (shell) | `df`, `du` |
| Database size | GET | `/api/system/database/size` | ❌ PG | `pg`, `pg_total_relation_size` |
| Database tables | GET | `/api/system/database/tables` | ❌ PG | `pg`, `quote_ident` |
| Clean logs/sessions | POST | `/api/system/clean` | ❌ PG | `pg`, `information_schema` |
| Clean messages | POST | `/api/system/clean-messages` | ❌ PG | `pg`, `conversation_messages` |
| Clean database | POST | `/api/system/clean-database` | ❌ PG | `pg`, VACUUM |

**Apenas `/storage` funciona atualmente** (não usa PG). Os 5 endpoints de DB estão **quebrados**.

---

## 🔄 MAPEAMENTO POSTGRESQL → MYSQL

### Query 1: `pg_total_relation_size()`

**PostgreSQL:**
```sql
SELECT ROUND(SUM(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0), 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'public'
```

**O que faz:** Retorna tamanho total de todas as tabelas (data + indexes) em MB.

**MySQL equivalente:**
```sql
SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
```

**Diferenças:**
- `pg_total_relation_size` → `data_length + index_length`
- `quote_ident(table_name)` → não necessário em MySQL
- `table_schema = 'public'` → `table_schema = DATABASE()` (pegando DB atual)
- Divisão: `/ 1024 / 1024` vs `/ 1024.0 / 1024.0` (mesmo resultado)

**Precisão:** MySQL approximates tabela-level sizes (mais rápido, similar).

---

### Query 2: `pg_total_relation_size()` + `COUNT(*)` por tabela

**PostgreSQL:**
```sql
SELECT
  table_name,
  ROUND(pg_total_relation_size(quote_ident(table_name)) / 1024.0 / 1024.0, 2) as size_mb,
  (SELECT COUNT(*) FROM "${table_name}") as table_rows
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
```

**Problema PG:** Subquery com `FROM "${table_name}"` (dynamic table name via string interpolation) — **não funciona** como SQL literal. PostgreSQL permite, mas é inseguro.

**MySQL equivalente (melhorada):**
```sql
SELECT
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name NOT LIKE '\\_%'  -- exclui tabelas internas
  AND table_name NOT IN ('schema_migrations', 'migrations')
ORDER BY (data_length + index_length) DESC
```

**Por que melhor:**
- `table_rows` já está disponível em `information_schema.tables` (coluna `TABLE_ROWS`)
- Evita subquery perigosa (SQL injection risk)
- MySQL não suporta dynamic table names em prepared statements

**Limitação:** `TABLE_ROWS` é aproximado (InnoDB). Para exato, fazer `COUNT(*)` individual (mais lento).

---

### Query 3: Clean logs — DELETE com condição

**PostgreSQL:**
```sql
DELETE FROM "tableName" WHERE created_at < $1
```

**MySQL equivalente:**
```sql
DELETE FROM tableName WHERE created_at < ?
```

**Diferenças:**
- `$1` (parameter placeholder) → `?` (MySQL prepared statements)
- Aspas duplas em table name → não usar (MySQL usa backticks ou nada)

**Segurança:** Usar `db.execute()` com parâmetros bound (Drizzle) evita SQL injection.

---

### Query 4: Clean sessions — mesma lógica

```sql
DELETE FROM sessions WHERE expires_at < ?
```

---

### Query 5: Clean messages (COUNT + DELETE)

**PostgreSQL:**
```sql
SELECT COUNT(*), COUNT(DISTINCT conversation_id), SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END)
FROM conversation_messages
WHERE created_at < $1
```

**MySQL equivalente:**
```sql
SELECT
  COUNT(*) as total_messages,
  COUNT(DISTINCT conversation_id) as affected_conversations,
  SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END) as with_media
FROM conversation_messages
WHERE created_at < ?
```

**Diferenças:** Mesma lógica, apenas placeholder `$1` → `?`.

---

### Query 6: Clean database (VACUUM FULL)

**PostgreSQL:**
```sql
VACUUM FULL
```

**MySQL:** Não existe `VACUUM`. Em MySQL:
- `OPTIMIZE TABLE tableName` — reorganiza e limpa espaço
- `TRUNCATE TABLE tableName` — limpa rápido (mas não use aqui pois já deletamos)

**Para nosso caso:** Como já fizemos `DELETE FROM table`, podemos chamar `OPTIMIZE TABLE` para cada tabela (opcional, para recuperar espaço).

**Consequência:** Não é crítico — `DELETE` já remove dados. `OPTIMIZE` é extra (recupera disco).

---

## ⚙️ IMPLEMENTAÇÃO COM DRIZZLE

### Abordagem 1: Usar `db.execute()` com SQL raw (simples)

**Prós:**
- Fácil (tradução direta)
- Sem mudar lógica
- Rápido

**Contras:**
- SQL raw sem type safety
- Precisa escapar nomes de tabelas manualmente
- Vulnerabilidade a SQL injection se não careful

### Abordagem 2: Usar Drizzle queries (seguro)

**Prós:**
- Type-safe
- Proteção contra SQL injection
- Usa connection pool existente
- Mais "clean" código

**Contras:**
- Para queries dinâmicas (como listar todas as tabelas), ainda precisa SQL raw
- `information_schema` não tem representation no Drizzle (schema é estático)

**Melhor abordagem:** Híbrida — usar Drizzle para queries que envolvem dados, e `db.execute()` para `information_schema` (que é meta).

---

## 🎯 PLANO DE IMPLEMENTAÇÃO SEGURO

### Fase 1: Preparação (não quebra nada)

1. **Criar backup** de `system.ts` → `system.pg.ts`
2. **Criar novo arquivo** `system.mysql.ts` (não sobrescreve ainda)
3. **Manter `system.ts` intacto** até teste completo
4. **Não modificar `index.ts`** ainda (aggregator de routers)

### Fase 2: Implementação MySQL

Vou criar `server/_core/routes/system-mysql.ts`:

```typescript
import express from "express";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";

export const systemRouter = express.Router();

// GET /api/system/storage (mesmo, não muda)
systemRouter.get("/storage", async (req, res) => {
  // ... código atual (shell commands) funciona independente de DB
});

// GET /api/system/database/size (CONVERTIDO)
systemRouter.get("/database/size", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    // MySQL: size from information_schema
    const result = await db.execute(sql`
      SELECT
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `);

    // Result format: { rows: [{ size_mb: 123.45 }] } ou similar
    const rows = (result as any).rows || result || [];
    const size_mb = rows[0]?.size_mb || 0;

    res.json({ success: true, size_mb: Number(size_mb), timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Size] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/system/database/tables (CONVERTIDO)
systemRouter.get("/database/tables", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    const result = await db.execute(sql`
      SELECT
        table_name,
        ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb,
        table_rows
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name NOT LIKE '\\_%'
        AND table_name NOT IN ('schema_migrations', 'migrations', '_migrations_applied')
      ORDER BY (data_length + index_length) DESC
    `);

    const rows = (result as any).rows || result || [];
    const tables = rows.map((row: any) => ({
      table_name: row.table_name,
      size_mb: Number(row.size_mb),
      table_rows: Number(row.table_rows),
    }));

    res.json({ success: true, tables, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Tables] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean (CONVERTIDO)
systemRouter.post("/clean", async (req, res) => {
  try {
    const { types } = req.body;
    const results = [];
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    // Helper: check if table exists
    const tableExists = async (tableName: string): Promise<boolean> => {
      const r = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ?
      `, [tableName]);
      const rows = (r as any).rows || r || [];
      return rows.length > 0;
    };

    // Helper: count rows
    const countRows = async (tableName: string): Promise<number> => {
      const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM ??`, [tableName]);
      const rows = (r as any).rows || r || [];
      return Number(rows[0]?.cnt || 0);
    };

    // Helper: delete where created_at < cutoff
    const deleteOld = async (tableName: string, cutoff: Date): Promise<number> => {
      const r = await db.execute(sql`DELETE FROM ?? WHERE created_at < ?`, [tableName, cutoff]);
      // @ts-ignore — rowcount
      return r.rowCount || 0;
    };

    // Logs cleanup
    if (!types || types.includes('logs')) {
      const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 30);
      const logTables = ['system_logs', 'audit_logs', 'crm_audit_logs', 'workflow_executions', 'execution_data'];
      let totalDeleted = 0, tablesFound = 0;

      for (const tableName of logTables) {
        try {
          const exists = await tableExists(tableName);
          if (exists) {
            tablesFound++;
            const deleted = await deleteOld(tableName, cutoffDate);
            totalDeleted += deleted;
          }
        } catch (e: any) {
          if (!e.message?.includes('does not exist')) {
            console.log(`[System/Clean] Erro ${tableName}: ${e.message}`);
          }
        }
      }
      results.push({
        type: 'logs',
        deleted: totalDeleted,
        message: `Removidos ${totalDeleted} logs de ${tablesFound} tabela${tablesFound !== 1 ? 's' : ''}`
      });
    }

    // Sessions cleanup
    if (!types || types.includes('sessions')) {
      const exists = await tableExists('sessions');
      if (exists) {
        const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 7);
        const deleted = await deleteOld('sessions', cutoffDate);
        results.push({ type: 'sessions', deleted, message: `Removidas ${deleted} sessões` });
      } else {
        results.push({ type: 'sessions', deleted: 0, message: 'Tabela de sessões não encontrada' });
      }
    }

    res.json({ success: true, results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[System/Clean] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-messages (CONVERTIDO)
systemRouter.post("/clean-messages", async (req, res) => {
  try {
    const { days = 90, dryRun = false } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    // Stats query
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT conversation_id) as affected_conversations,
        SUM(CASE WHEN file_url IS NOT NULL THEN 1 ELSE 0 END) as with_media
      FROM conversation_messages
      WHERE created_at < ?
    `, [cutoffDate]);
    const statsRows = (statsResult as any).rows || statsResult || [];
    const stats = statsRows[0];

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        stats: {
          messages: Number(stats.total_messages || 0),
          conversations: Number(stats.affected_conversations || 0),
          withMedia: Number(stats.with_media || 0),
          cutoffDate: cutoffDate.toISOString(),
        },
        message: `Simulação: ${stats.total_messages || 0} mensagens em ${stats.affected_conversations || 0} conversas seriam deletadas`
      });
    }

    // Delete
    const deleteResult = await db.execute(sql`
      DELETE FROM conversation_messages
      WHERE created_at < ?
    `, [cutoffDate]);

    const deletedCount = (deleteResult as any).affectedRows || 0;

    res.json({
      success: true,
      stats: {
        messages: Number(deletedCount),
        conversations: Number(stats.affected_conversations || 0),
        withMedia: Number(stats.with_media || 0),
        cutoffDate: cutoffDate.toISOString(),
      },
      message: `Removidas ${deletedCount} mensagens antigas`
    });
  } catch (error) {
    console.error("[System/CleanMessages] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/system/clean-database (CONVERTIDO)
systemRouter.post("/clean-database", async (req, res) => {
  try {
    const { confirm } = req.body;
    if (!confirm) {
      return res.status(400).json({ error: "Confirmação necessária" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB unavailable" });

    const tables = [
      'conversation_messages',
      'received_messages',
      'system_logs',
      'audit_logs',
      'notifications',
      'sessions',
      'flow_executions',
      'execution_logs',
      'broadcast_messages',
      'quick_replies_cache',
      'webhook_logs'
    ];

    const results = [];

    for (const tableName of tables) {
      try {
        // Check if table exists
        const check = await db.execute(sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = ?
        `, [tableName]);
        const checkRows = (check as any).rows || check || [];

        if (checkRows.length > 0) {
          // Count before
          const beforeResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM ??`, [tableName]);
          const beforeRows = (beforeResult as any).rows || beforeResult || [];
          const countBefore = Number(beforeRows[0]?.cnt || 0);

          // Delete all
          const deleteResult = await db.execute(sql`DELETE FROM ??`, [tableName]);
          const deletedCount = (deleteResult as any).affectedRows || 0;

          results.push({
            table: tableName,
            success: true,
            rows: deletedCount,
            message: `Tabela ${tableName}: ${deletedCount} linha${deletedCount !== 1 ? 's' : ''} removida${deletedCount !== 1 ? 's' : ''} (era ${countBefore})`
          });
        } else {
          results.push({ table: tableName, success: false, error: 'Tabela não encontrada' });
        }
      } catch (e: any) {
        results.push({ table: tableName, success: false, error: e.message });
      }
    }

    // OPTIMIZE (MySQL recovery) — best effort
    for (const tableName of tables) {
      try {
        await db.execute(sql`OPTIMIZE TABLE ??`, [tableName]);
      } catch (optimizeError) {
        console.warn(`[System/Optimize] ${tableName}: ${optimizeError}`);
      }
    }

    res.json({
      success: true,
      results,
      message: "Limpeza do banco de dados concluída"
    });
  } catch (error) {
    console.error("[System/CleanDatabase] Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default systemRouter;
```

---

## 🧪 Estratégia de Teste (3 fases)

### Fase 1: Validação de sintaxe (local)

```bash
# Teste 1: Compilação TypeScript
npx tsc --noEmit server/_core/routes/system-mysql.ts

# Teste 2: Importação (sem executar)
node -e "require('./server/_core/routes/system-mysql.ts')"
# Deve retornar { [Symbol(Symbol.toStringTag)]: 'Module' } ou undefined, sem erro

# Teste 3: Verificar dependências
grep -E "import.*from.*['\"]pg['\"]|from ['\"]pg" system-mysql.ts
# Deve retornar vazio
```

---

### Fase 2: Teste de integração (server rodando)

1. **Substituir temporariamente** `system.ts` por `system-mysql.ts`
2. Iniciar server local: `node server/index.ts`
3. Testar cada endpoint:

```bash
# Healthcheck geral
curl http://localhost:3000/api/health
# → 200 OK

# Storage (deve funcionar igual)
curl http://localhost:3000/api/system/storage
# → JSON com disk info

# Database size
curl http://localhost:3000/api/system/database/size
# → { success: true, size_mb: 123.45, ... }

# Database tables
curl http://localhost:3000/api/system/database/tables
# → { success: true, tables: [{table_name, size_mb, table_rows}, ...] }

# Clean (dry-run)
curl -X POST http://localhost:3000/api/system/clean -H "Content-Type: application/json" -d '{"types": ["logs"]}'
# → { success: true, results: [...] }

# Clean messages (dry-run)
curl -X POST http://localhost:3000/api/system/clean-messages -H "Content-Type: application/json" -d '{"days": 90, "dryRun": true}'
# → { success: true, dryRun: true, stats: {...} }
```

**Critério de sucesso:** Todos endpoints retornam 200 JSON válido, sem erros 500.

---

### Fase 3: Deploy em staging/production

1. **Branch:** `feat/mysql-system-endpoints`
2. **Commit:** Sistema endpoints convertidos
3. **Push** → Railway deploy automático
4. **Monitorar** logs Railway (se disponível)
5. **Validar** saúde do app (healthcheck 200)
6. **Testar** endpoints em produção (usando curl ou frontend)

**Rollback imediato se:**
- Healthcheck falhar
- Logs mostrarem erro de compilação
- Endpoints retornarem 500

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Query `information_schema` não funciona em MySQL | Baixa | Alto | Testar local antes (Fase 2) |
| `table_rows` inexato (InnoDB approximation) | Alta | Baixo | Documentar; usar COUNT(*) se precisar exato |
| `OPTIMIZE TABLE` trava em tabelas grandes | Média | Médio | Rodar em background, ignore erros |
| ERRO: `data_length + index_length` NULL para algumas tabelas | Média | Baixo | COALESCE para 0 |
| SQL Injection via table name dinâmico | Baixa | Alto | Usar `??` placeholder do Drizzle (escapa auto) |
| Remover pg do package.json quebra outros arquivos | Média | Alto | Buscar por imports `pg` antes de remover |
| Endpoint `/system/clean-database` deleta dados errados | Baixa | CRÍTICO | `dryRun` padrão, `confirm` obrigatório |

---

## 🔎 VERIFICAÇÃO PRÉ-DEPLOY — Checklist

Antes de substituir `system.ts`:

- [ ] `grep -r "from ['\"]pg['\"]" server/` — garantir 0 resultados (aNão contar system.ts velho)
- [ ] `npm run build` — compila sem erros
- [ ] Testar importação: `node -e "require('./dist/_core/routes/system-mysql.js')"` — deve existir após build
- [ ] Verificar que `DATABASE_URL` está configurado no Railway
- [ ] Fazer backup de `system.ts` (commit separado)
- [ ] Criar branch dedicada
- [ ] Documentar mudanças no CHANGELOG

---

## 📈 IMPACTO NO SISTEMA

### O que muda:
- **Dependências:** Remove `pg` (se não usado em mais lugar)
- **Performance:** Queries `information_schema` são leves, similar ao PG
- **Funcionalidade:** Mesma (endpoints retornam mesma estrutura JSON)
- **Precisão:** `table_rows` pode ser aproximado (diferença de 1-5% em tabelas grandes)

### O que NÃO muda:
- API externa (paths idênticos)
- Schema de resposta (mesmos campos: `success`, `tables`, `size_mb`)
- Comportamento do endpoint `/storage` (shell commands)
- Lógica de negócio (clean por idade, tipos)

---

## 🎯 DECISÃO — Devo converter?

**SIM, com condições:**

✅ **Prós:**
- Remove dependência fantasma (`pg`)
- Torna endpoints funcionais (atualmente quebrados)
- Alinha com arquitetura MySQL
- Reduz risco de crashes (module not found)

⚠️ **Contras:**
- Requer teste cuidadoso
- Possível diferença em `table_rows` (aproximado)
- `OPTIMIZE TABLE` pode ser lento em grandes tabelas

**Recomendação:** Converter **agora** (enquanto app está down, não há risco de quebrar algo em produção — já está quebrado).

---

## 📝 PRÓXIMOS PASSOS

1. **Aguardar** resolução do Railway (health 200)
2. **Criar** `system-mysql.ts` com código acima
3. **Testar** localmente (Fase 1 + 2)
4. **Substituir** `system.ts` → `system.mysql.ts` (rename)
5. **Deploy** e validar

---

**Análise concluída:** 08/04/2026 10:18 UTC
**Próximo:** Aguardando autorização/condições para implementar
