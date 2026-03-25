# 🚨 AÇÕES MANUAIS CRÍTICAS — PÓS-DEPLOY

Data: 25/03/2026 01:00
Commit: `fcd8f43`

## 📌 Resumo

Foram aplicadas correções automáticas no código. Agora são necessárias **2 ações manuais** no Railway para o sistema funcionar 100%:

1. **Atualizar JWT_SECRET** (chave forte fornecida)
2. **Configurar Redis** (adicionar addon ou variável REDIS_URL)

---

## 1️⃣ JWT_SECRET — ATUALIZAR

**Motivo:** A JWT_SECRET atual tem apenas 11 caracteres (insegura). O código valida mínimo de 16, mas recomenda-se 32+.

**Nova chave (64 hex chars):**
```
7632b8716f4a8a64a322aeb20ee804ab38f57a4261d0204f20ddf4f223606a45
```

**Como atualizar no Railway:**

1. Acesse: https://railway.app/dashboard
2. Selecione o projeto `farma-francis-platform`
3. Vá em **Variables** (ou Settings → Environment Variables)
4. Edite ou crie a variável `JWT_SECRET` com o valor acima
5. Clique em **Save**
6. **Redeploy** (trigger automático ou manual via "Deploy" button)

**Validação pós-redeploy:**
```bash
curl -s https://innovative-enjoyment-production-ed8f.up.railway.app/ | grep JWT_SECRET
# Nos logs Railway, procurar: [STARTUP] ✅ JWT_SECRET tem comprimento adequado
```

---

## 2️⃣ REDIS — CONFIGURAR

**Motivo:** O sistema agora usa Redis para cache, fila Bull e rate limiting. Sem Redis, essas funcionalidades não funcionam (o sistema ainda roda, mas sem cache distribuído e fila persistente).

### Opção A: Redis Addon no Railway (Recomendado)

1. No dashboard do Railway, no mesmo projeto
2. Vá em **Plugins** ou **Add-ons**
3. Busque por **Redis** (ou **Upstash Redis**)
4. Adicione ao projeto (plano free ou pago)
5. Railway criará automaticamente a variável `REDIS_URL` (ou `UPSTASH_REDIS_REST_URL`)
6. **Redeploy** se necessário

### Opção B: Upstash (fora do Railway)

1. Crie conta em https://upstash.com
2. Crie um banco Redis (free tier)
3. Copie a `REST URL` (formato: `rediss://...`)
4. No Railway Variables, defina:
   ```
   REDIS_URL=rediss://username:password@your-db.upstash.io:6379
   ```
5. **Redeploy**

### Opção C: Redis externo (outro VPS)

Se você já tem um Redis rodando em outro lugar:
```
REDIS_URL=redis://password@host:port
```

**Validação pós-redeploy:**
- Logs Railway: `[Redis] ✅ Conexão estabelecida`
- Logs: `[BroadcastQueue] 🚀 Processor iniciado`
- Testar broadcast: deve aparecer `[BroadcastQueue] 📩 Job enfileirado`

---

## 3️⃣ VALIDAR MIGRATIONS APLICADAS

O sistema agora aplica automaticamente as migrations SQL no startup (pasta `server/database/migrations`).

**Verifique nos logs Railway:**

```
[Migrations] Encontradas X migrations
[Migrations] ✅ Aplicada: 0000_bizarre_bloodaxe.sql
[Migrations] ✅ Aplicada: 0001_last_mandarin.sql
...
[Migrations] ✅ Concluído
```

Se houver erros, aparecerá:
```
[Migrations] ❌ Erro em <arquivo.sql>: <mensagem>
```

**Migration crítica pendente:** `20250324_migrate_broadcast_messages_definitive.sql`
- Renomeia colunas `content`→`message_text`, `sentBy`→`sender_id`
- Adiciona `caption`, `sender_type`, `error_message`
- **Essa migration deve ser aplicada** para o broadcast funcionar corretamente.

Se não for aplicada automaticamente (já está na pasta migrations), você pode aplicar manualmente via Railway DB Editor.

---

## 📋 Checklist Pós-Ação

Após executar as 2 ações manuais (JWT_SECRET + Redis) e aguardar redeploy:

- [ ] Logs mostram `[STARTUP] ✅ JWT_SECRET tem comprimento adequado`
- [ ] Logs mostram `[Redis] ✅ Conexão estabelecida`
- [ ] Logs mostram `[BroadcastQueue] 🚀 Processor iniciado (concurrency=2)`
- [ ] Logs mostram `[Migrations] ✅ Concluído`
- [ ] API retorna HTTP 200
- [ ] Teste de login funciona
- [ ] Teste de broadcast com imagem + caption funciona
- [ ] Não há erros `Connection is closed` ou `JWT_SECRET está muito curta`

---

## 🆘 Se algo der errado

**Redis não conecta:**
- Verifique se a variável `REDIS_URL` está correta
- Teste com: `redis-cli -u $REDIS_URL ping` (deve retornar PONG)
- Se usar Upstash, certifique-se de que o banco está ativo

**JWT_SECRET ainda com erro:**
- Certifique-se de que a variável foi salva e **reimplantada**
- Verifique se há variáveis `JWT_SECRET` duplicadas (uma vazia sobrescrevendo)

**Migrations falhando:**
- Verifique se o banco MySQL está conectado
- Verifique se o usuário tem permissão CREATE/ALTER
- Aplique manualmente via Railway DB Editor se necessário

---

**Commit de referência:** `fcd8f43` (feat(migrations): aplica migrations SQL automaticamente no startup)
