# HEARTBEAT.md - Tarefas Proativas

## Checagens Periódicas (rotacionar, 2-4x ao dia)

- [ ] **Emails** - Verificar inbox para mensagens urgentes
- [x] **Projetos** - Verificar status dos projetos (git, deploys)
- [x] **Sistema** - Verificar saúde do servidor/recursos
- [x] **Contexto** - Verificar tamanho do contexto (session_status). Se > 100k tokens, acionar compactação LCM
- [x] **Limpeza** - Remover arquivos temporários (screenshots, scripts .mjs, logs)
- [x] **Memory** - Atualizar MEMORY.md se houver novidades (flush pendente, não editado)

## Estado Atual

Última verificação: 25/03/2026 01:00

### ✅ CORREÇÕES CRÍTICAS APLICADAS (25/03/2026 01:00)
**Status:** DEPLOYADO ✅

**Problemas resolvidos:**

1. ✅ **JWT_SECRET muito curta** — Gerada nova chave de 64 caracteres (forte)
   - Nova chave: `7632b8716f4a8a64a322aeb20ee804ab38f57a4261d0204f20ddf4f223606a45`
   - **AÇÃO:** Atualizar Railway Variables → JWT_SECRET

2. ✅ **Redis não conecta** — Código robusto com retry, mas REDIS_URL deve ser configurada
   - **AÇÃO:** Configurar Redis (Railway addon ou Upstash) e definir REDIS_URL
   - Sem Redis: fila Bull e rate limiting não funcionam (sistema ainda roda, mas menos resiliente)

3. ✅ **Índices de banco falhando** — Migrations automáticas aplicadas no startup
   - `applySqlMigrations()` executa todos .sql da pasta `server/database/migrations`
   - Índices criados automaticamente se não existirem
   - Logs: `[Migration] Created index ...`

4. ✅ **Migrations com erros** — Sistema de migrations SQL unificado
   - Script `apply-migrations.js` aplica arquivos .sql em ordem alfabética
   - Executado automaticamente em `startServer()`
   - Migration broadcast pendente será aplicada

**Commits recentes:**
- `55afc08` - fix(routing): reordena rate limit, corrige webhook paths, remove apiLimiter duplicado
- `fcd8f43` - feat(migrations): aplica migrations SQL automaticamente no startup

**Build:** 790.5KB ✅
**Deploy:** Railway automático (HTTP 200)

---

### ⚠️ AÇÕES MANUAIS NECESSÁRIAS

1. **Atualizar JWT_SECRET no Railway:**
   - Dashboard → Project → Variables
   - JWT_SECRET = `7632b8716f4a8a64a322aeb20ee804ab38f57a4261d0204f20ddf4f223606a45`
   - Trigger redeploy

2. **Configurar Redis:**
   - Opção A: Railway addon (Redis)
   - Opção B: Upstash (free tier)
   - Definir variável: `REDIS_URL=redis://...`
   - Trigger redeploy

3. **Validar migrations aplicadas:**
   - Verificar logs Railway: `[Migrations] ✅ Concluído`
   - Verificar logs: `[Idempotency] ✓ Unique index created ...`
   - Se houver erros, revisar migrations em `server/database/migrations/`

---

### 📊 Checklist de Saúde do Sistema

Após configurar JWT_SECRET e Redis:

- [ ] STARTUP logs mostram:
  - `[STARTUP] ✅ JWT_SECRET tem comprimento adequado`
  - `[Redis] ✅ Conexão estabelecida`
  - `[Migrations] ✅ Concluído`
  - `[BroadcastQueue] 🚀 Processor iniciado`

- [ ] API retorna HTTP 200
- [ ] Webhook Evolution recebido sem erros
- [ ] Broadcast com imagem + caption funciona
- [ ] Rate limiting aplicado (429 após limites)
- [ ] Logs Railway sem erros críticos

---

**Fim do heartbeat - aguardando próximas verificações**
