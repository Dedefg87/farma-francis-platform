# 📋 Plano de Testes Pós-Deploy — system-mysql.ts

**Objetivo:** Validar que todas as rotas de sistema convertidas para MySQL funcionam corretamente após deploy no Railway.

**Commit:** `3aca235` — `server/_core/routes/system.ts` (MySQL version)

---

## 🧪 Casos de Teste

### 1. Health Check
- **[ ]** `GET /api/health` → `{status: "ok"}`
- **Critério:** 200 OK, JSON válido

### 2. Database Size
- **[ ]** `GET /api/system/database/size`
- **Critério:** Retorna `{success: true, size_mb: number}`
- **Nota:** Usa `information_schema.tables`, deve funcionar no MySQL

### 3. Database Tables List
- **[ ]** `GET /api/system/database/tables`
- **Critério:** Lista todas as tabelas com `table_name`, `size_mb`, `table_rows`
- **Ordenação:** Decrescente por tamanho

### 4. Clean Logs (POST)
- **[ ]** `POST /api/system/clean` (logs only)
- **Body:** `{ "types": ["logs"] }`
- **Critério:** Remove logs com `created_at < 30 dias` das tabelas:
  - `system_logs`
  - `audit_logs`
  - `crm_audit_logs`
  - `workflow_executions`
  - `execution_data`
- **Verificar:** Resposta com `deleted: number` e `tablesFound`

### 5. Clean Sessions (POST)
- **[ ]** `POST /api/system/clean` (sessions only)
- **Body:** `{ "types": ["sessions"] }`
- **Critério:** Remove sessões com `created_at < 7 dias` (fallback para `expires_at`)
- **Verificar:** Resposta com `deleted: number`

### 6. Clean Messages (DRY RUN)
- **[ ]** `POST /api/system/clean-messages`
- **Body:** `{ "days": 90, "dryRun": true }`
- **Critério:** Retorna estatísticas sem deletar:
  - `total_messages`
  - `affected_conversations`
  - `withMedia`
  - `cutoffDate`

### 7. Clean Messages (REAL)
- **[ ]** `POST /api/system/clean-messages`
- **Body:** `{ "days": 90, "dryRun": false }`
- **Critério:** Deleta mensagens com `created_at < cutoff`
- **Verificar:** Resposta com `deleted: number`

### 8. Clean Database (TRUNCATE)
- **[ ]** `POST /api/system/clean-database`
- **Body:** `{ "confirm": true }`
- **Critério:** TRUNCATE nas tabelas não-críticas:
  - `conversation_messages`
  - `received_messages`
  - `system_logs`
  - `audit_logs`
  - `notifications`
  - `sessions`
  - `flow_executions`
  - `execution_logs`
  - `broadcast_messages`
  - `quick_replies_cache`
  - `webhook_logs`
- **Fallback:** Usa DELETE se TRUNCATE falhar (FK constraints)
- **OPTIMIZE:** Tenta otimizar cada tabela (best-effort)

---

## ⚠️ Pontos de Atenção

1. **Parâmetros inline:** Todas as queries usam `${value}` dentro de `sql` template. NÃO há array de parâmetros.
2. **Table names como variáveis:** Usadas diretamente no SQL (sem `??` placeholder). Funciona apenas para identifiers, não para valores.
3. **Date objects:** `${cutoffDate}` é convertido para string pelo Drizzle → MySQL aceita como `'2026-04-08T00:00:00.000Z'`. Funciona, mas pode exigir `DATE()` ou `CAST()` se houver mismatch.
4. **Error handling:** `tableExists` e `countRows` retornam `0`/`false` se tabela não existe (não falha).
5. **TRUNCATE foreign keys:** Se houver constraints, cai para DELETE.

---

## 🔄 Rollback

Se algo falhar, reverter:

```bash
git revert 3aca235
git push origin main
# Railway自动回滚
```

**Arquivo original backupado:** `server/_core/routes/system.ts.bak` (removido antes do commit, mas disponível no commit anterior `f694838`).

---

## 📊 Verificação Automatizada (opcional)

```bash
# Test all endpoints
BASE=https://farma-francis-platform-production.up.railway.app

# 1. Health
curl $BASE/api/health

# 2. DB size
curl $BASE/api/system/database/size

# 3. Tables
curl $BASE/api/system/database/tables

# 4. Clean logs (dry)
curl -X POST $BASE/api/system/clean \
  -H "Content-Type: application/json" \
  -d '{"types":["logs"]}'

# 5. Clean messages (dry)
curl -X POST $BASE/api/system/clean-messages \
  -H "Content-Type: application/json" \
  -d '{"days": 90, "dryRun": true}'
```

---

**Última atualização:** 08/04/2026 — commit 3aca235
