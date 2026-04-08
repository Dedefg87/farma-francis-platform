# 🚨 Railway Startup Crash Checklist

**Commit:** `08d6e11` — railway.toml (Docker builder)
**Healthcheck:** `GET /api/health` → 404 "Application not found"

---

## 🔍 Possíveis Causas de Crash

### 1. Port Binding (comum Railway)
- ✅ server/index.ts: `app.listen(PORT, "0.0.0.0")` — já está correto
- ⚠️ Verificar se `PORT` env var está definida (Railway fornece automaticamente)
- **Sintoma:** App inicia mas healthcheck não responde (404 do Railway proxy)

### 2. Database Connection Failure
- ⚠️ `server/db.ts` — `mysql2` connection pode falhar se:
  - `MYSQL_URL` não configurada no Railway
  - SSL mode incompatível (Railway MySQL pode exigir SSL)
  - Timeout muito baixo
- **Sintoma:** App crash no startup (uncaught exception)
- **Log esperado:** `[DB] Connected` ou stack trace

### 3. Migrations na Inicialização
- ⚠️ `server/index.ts` linha ~22: `await applySqlMigrations()`
- Se migration falhar (schema divergente), app pode crash
- **Log esperado:** `[Migrations] Applied` ou erro

### 4. Build Artifact Ausente
- ⚠️ `dist/index.js` não gerado (build falhou no Railway)
- **Verificar:** Railway build logs — deve mostrar `built in Xs` e `dist/index.js`

### 5. Dependências faltantes (Nixpacks vs Docker)
- ⚠️ Se usar Nixpacks: apenas instala `dependencies` (não devDependencies)
- `mysql2` está em `dependencies` ✅
- `@types/express`, `typescript` em `devDependencies` (ok — não rodam em produção)

### 6. StartCommand errado
- ✅ `railway.toml`: `startCommand = "node dist/index.js"` — correto
- ⚠️ Se `dist/index.js` não existir no container → crash

---

## 📋 O que Anderson deve verificar nos Logs Railway

1. **Acesse** Railway Dashboard → farma-francis-platform → **Logs**
2. **Filtre** por:
   - `START` — inínio do container
   - `ERROR` — exceções não tratadas
   - `Build` — se o build completou
3. **Procure por linhas:**
   ```
   [Server] Starting...
   [DB] Connected
   [Migrations] Applied
   [Server] Listening on port ...
   ```
4. **Se houver erro:**
   - Copie o stack trace completo
   - Identifique a linha do código (arquivo:linha)
   - Busque por `Caused by:` ou `Error:`

---

## 🔧 Correções Imediatas (segundo diagnóstico)

| Sintoma | Correção |
|---------|----------|
| Port not listening | Garantir `app.listen(process.env.PORT || 3000, "0.0.0.0")` |
| DB connection error | Adicionar `ssl: 'auto'` ou `ssl: false` no connection string |
| Migration error | Rodar `drizzle-kit migrate` local e commitar novo migration |
| Build failed | Verificar `package.json` scripts e dependências |
| Module not found | Commitar `dist/` ou garantir build no Railway |

---

## 🚀 Ação Rápida (se app crash no startup)

1. **Adicionar try/catch no startServer()** (se não houver):
   ```ts
   startServer().catch((err) => {
     console.error("[FATAL]", err);
     process.exit(1);
   });
   ```

2. **Log antecipado** — adicione no topo de `index.ts`:
   ```ts
   console.log("[DEBUG] PORT:", process.env.PORT);
   console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV);
   console.log("[DEBUG] MYSQL_URL:", process.env.MYSQL_URL ? "SET" : "MISSING");
   ```

3. **Commit & push** — Railway auto-redeploy

---

## 📊 Verificação via Railway CLI (se token funcionar)

```bash
railway logs --project farma-francis-platform --lines 100
railway run --project farma-francis-platform -- curl $PORT/api/health
```

---

**Status atual (09:30 UTC):** Ainda aguardando deploy completar. Se 09:45 ainda 404 → **acionar Anderson para logs**.
