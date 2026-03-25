# 📋 RELATÓRIO DE DIAGNÓSTICO - PROBLEMAS CRÍTICOS
**Data:** 25/03/2026 07:25 UTC
**Sistema:** Farma Francis Platform (Railway)
**URL:** https://innovative-enjoyment-production-ed8f.up.railway.app/

---

## 🔴 PROBLEMA 1: JWT_SECRET MUITO CURTA

### Status
❌ **CRÍTICO** - JWT_SECRET tem apenas 11 caracteres (mínimo: 32)

### Evidência
Logs de startup mostram:
```
[STARTUP] JWT_SECRET length: 11
[STARTUP] ⚠️ JWT_SECRET está muito curta ou não definida!
```

### Impacto
- Autenticação pode falhar
- Tokens JWT vulneráveis a ataques de força bruta
- Erros de assinatura em requests

### Solução

#### Opção A: Via Railway Dashboard (RECOMENDADO)
1. Acesse: https://railway.app/dashboard
2. Selecione o projeto `farma-francis-platform`
3. Vá em **Variables** (ou "Environment Variables")
4. Encontre `JWT_SECRET` e substitua o valor por:

```
68bb9c796cc3abbeb2da44c100f7a87376c77d26df63ea2c45d775cf9ac7d268
```

5. Clique em **Save Changes**
6. Railway faráredeploy automático

#### Opção B: Via CLI Railway
```bash
railway variables:set JWT_SECRET=68bb9c796cc3abbeb2da44c100f7a87376c77d26df63ea2c45d775cf9ac7d268
```

### Validação pós-redeploy
Nos logs do Railway, procure:
```
[STARTUP] ✅ JWT_SECRET tem comprimento adequado
```

---

## 🔴 PROBLEMA 2: REDIS NÃO CONECTA

### Status
❌ **CRÍTICO** - Redis não está acessível

### Evidência
Logs de startup:
```
[Redis] ❌ Falha ao conectar: Connection closed
[Redis] Erro de conexão, tentando reconectar...
```

### Diagnóstico
- `REDIS_URL` não está configurada no ambiente
- Redis não está rodando localmente (`redis-cli: not found`)
- Railway não tem addon Redis ativo

### Impacto
- Broadcast queue (Bull) não funciona → transmissões não são enviadas
- Rate limiting distribuído falha → possible abuse
- Cache de configuração Evolution inoperante

### Solução

#### Opção A: Addon Railway Redis (RECOMENDADO)
1. No Railway Dashboard, vá para o seu projeto
2. Clique em **"Add-ons"** → **"Redis"**
3. Escolha o plano (gratuito ou pago)
4. Clique em **"Create"**
5. Railway adiciona automaticamente `REDIS_URL` nas variáveis de ambiente
6. Redeploy automático ou manual

#### Opção B: Upstash Redis (externo)
1. Crie conta em https://upstash.com
2. Crie novo banco Redis
3. Copie a connection string (formato: `rediss://default:xxx@xxx.upstash.io:6379`)
4. No Railway: Variables → adicione `REDIS_URL` com essa string
5. Redeploy

#### Opção C: Redis local (apenas desenvolvimento)
```bash
docker run -d --name farma-redis -p 6379:6379 redis:alpine
```
Em seguida, no Railway (ou .env local):
```
REDIS_URL=redis://localhost:6379
```

### Validação pós-redeploy
Nos logs Railway, procure:
```
[Redis] ✅ Conexão estabelecida
[Redis] ✅ Pronto para uso
```

---

## 🔴 PROBLEMA 3: ÍNDICES DE BANCO DE DADOS FALHANDO

### Status
⚠️ **ATENÇÃO** - Possíveis índices ausentes em `conversation_messages`

### Evidência
Logs de startup/migration podem conter:
```
[Migration] Created index ... (ou erros de "duplicate key" / "index already exists")
```

### Índices Esperados
Segundo o código e migrações, a tabela `conversation_messages` deve ter:

| Nome do Índice | Colunas | Tipo | Propósito |
|----------------|---------|------|-----------|
| `idx_conversation_messages_external_id` | `external_id` | Normal | Busca rápida por external_id da Evolution |
| `idx_conversation_messages_remote_jid` | `remote_jid` | Normal | Busca por número de telefone (remote_jid) |
| `uq_conversation_messages_provider_external` | `provider, external_id` | Unique | Evita duplicação de mensagens (provider + external_id) |

### Verificação Manual
Conecte ao MySQL e execute:

```sql
-- Conectar (substituir credenciais)
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DB

-- Listar índices da tabela
SHOW INDEX FROM conversation_messages;

-- Verificar índices específicos
SELECT COUNT(*) AS cnt FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'conversation_messages'
  AND index_name IN (
    'idx_conversation_messages_external_id',
    'idx_conversation_messages_remote_jid',
    'uq_conversation_messages_provider_external'
  );
```

### Correção Manual (se faltarem)
Se algum índice estiver faltando, execute:

```sql
-- idx_conversation_messages_external_id
CREATE INDEX IF NOT EXISTS idx_conversation_messages_external_id
ON conversation_messages(external_id);

-- idx_conversation_messages_remote_jid
CREATE INDEX IF NOT EXISTS idx_conversation_messages_remote_jid
ON conversation_messages(remote_jid);

-- índice unique (provider, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_provider_external
ON conversation_messages(provider, external_id);
```

### Nota sobre Auto-Migração
O código em `server/_core/index.ts` contém `runMediaColumnsMigration()` que adiciona colunas, mas **não cria índices**. A criação de índices deve ser feita manualmente ou via migration SQL separada.

Recomendo criar arquivo `server/database/migrations/20250325_add_conversation_messages_indexes.sql`:

```sql
-- Índices para conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_external_id
ON conversation_messages(external_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_remote_jid
ON conversation_messages(remote_jid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_provider_external
ON conversation_messages(provider, external_id);
```

O startup (`server/_core/index.ts`) já executa `applySqlMigrations()` que roda todos os `.sql` na pasta `migrations`.

---

## 🔴 PROBLEMA 4: MIGRATIONS COM ERROS

### Status
⚠️ **ATENÇÃO** - Precisa validar se todas as migrations aplicaram

### Migrations Presentes
```
server/database/migrations/
├── 0000_bizarre_bloodaxe.sql
├── 0001_last_mandarin.sql
├── 0002_careful_bucky.sql
├── 0003_lumpy_white_queen.sql
├── 0004_stiff_jane_foster.sql
├── 0005_nasty_retro_girl.sql
├── 0006_add_lastSignedIn.sql
├── 20250324_add_processed_webhook_messages.sql
├── 20250324_migrate_broadcast_messages_definitive.sql
└── 20250324_migrate_broadcast_messages_definitive_FIXED.sql
```

### Verificação Automática
O sistema possui `applySqlMigrations()` que executa todos os `.sql` na ordem alfabética no startup.

Nos logs Railway, procure:
```
[Migration] Applying: <nome-do-arquivo.sql>
[Migration] ✅ Applied: <nome-do-arquivo.sql>
```

Se houver erro, aparecerá:
```
[Migration] ❌ Error applying <arquivo>: <mensagem>
```

### Verificação Manual via Banco
```sql
-- Listar todas as colunas das tabelas principais para confirmar migrações
DESCRIBE conversation_messages;
DESCRIBE broadcast_messages;
DESCRIBE processed_webhook_messages;

-- Verificar se colunas esperadas existem:
-- conversation_messages: external_id, remote_jid, provider
-- broadcast_messages: sender_id, caption, sender_type, error_message
-- processed_webhook_messages: external_id (unique)
```

### Se Houver Erro de Migration
1. Identifique a migration que falhou (pelo nome do arquivo)
2. Corrija o SQL do arquivo se necessário
3. Commit + push
3. Railway redeploy automaticamente aplica novamente

**IMPORTANTE:** Migrations com `IF NOT EXISTS` ou `IF EXISTS` são seguras para reexecução.

---

## 📊 RESUMO DAS AÇÕES URGENTES

### **Imediato (1-2 horas)**

1. **Atualizar JWT_SECRET** no Railway (novo valor fornecido acima)
2. **Adicionar Redis** via Railway Add-ons
3. **Verificar índices** ausentes e aplicar SQL se necessário
4. **Redeploy** e acompanhar logs

### **Pós-Redeploy Checklist**

- [ ] `[STARTUP] ✅ JWT_SECRET tem comprimento adequado`
- [ ] `[Redis] ✅ Conexão estabelecida`
- [ ] `[Migrations] ✅ Todas as migrations aplicadas`
- [ ] `[BroadcastQueue] 🚀 Processor iniciado (concurrency=2)`
- [ ] API retorna HTTP 200 em `/health`
- [ ] Login funciona sem erros
- [ ] Testar envio de mensagem WhatsApp (mensagem aparece no sistema)
- [ ] Testar broadcast (enviar para lista pequena)

---

## 🔧 COMANDOS ÚTEIS

### Ver logs do Railway em tempo real
```bash
railway logs --tail
```

### Testar health endpoint
```bash
curl -s https://innovative-enjoyment-production-ed8f.up.railway.app/health | jq
```

### Testar Redis (após configurado)
```bash
redis-cli -u $REDIS_URL ping
# Deve retornar: PONG
```

### Verificar índices no MySQL
```bash
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DB -e "
SHOW INDEX FROM conversation_messages;
SELECT index_name, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'conversation_messages';
"
```

---

## 📞 Contato & Suporte

- Railway Dashboard: https://railway.app/dashboard
- Railway Logs: `railway logs`
- Documentação do projeto: `/data/.openclaw/workspace/farma-francis-platform/`
- Este relatório: `/data/.openclaw/workspace/HEARTBEAT.md` (ver seção "🔧 Correções Críticas")

---

**Fim do relatório.**
