# 🚀 CONFIGURAÇÃO DO REDIS NO RAILWAY

**Data:** 25/03/2026 09:28 UTC

Você forneceu a URL do Redis:
```
redis://default:AMwVkElQrLjJHfkyGrUAsJOQPxddkjZP@redis.railway.internal:6379
```

Precisamos configurar essa string como variável de ambiente `REDIS_URL` no Railway para ativar a conexão.

---

## 📋 PASSO A PASSO (via Dashboard)

1. Acesse o **Railway Dashboard**: https://railway.app/dashboard
2. Selecione seu projeto `farma-francis-platform`
3. Clique na aba **"Variables"** (ou "Environment Variables")
4. Clique no botão **"+ Add Variable"** (ou "New Variable")
5. Preencha:
   - **Key:** `REDIS_URL`
   - **Value:** `redis://default:AMwVkElQrLjJHfkyGrUAsJOQPxddkjZP@redis.railway.internal:6379`
6. Clique em **"Save Changes"** (ou "Save")

O Railway fará um **redeploy automático** em alguns segundos.

---

## 🔄 Alternativa (via CLI Railway)

Se preferir linha de comando e tiver `railway` CLI instalado e autenticado:

```bash
# Navegue até a pasta do projeto
cd /data/.openclaw/workspace/farma-francis-platform

# Defina a variável
railway variable set REDIS_URL="redis://default:AMwVkElQrLjJHfkyGrUAsJOQPxddkjZP@redis.railway.internal:6379"

# Aguarde o deploy automático
railway logs --tail
```

---

## ✅ VALIDAÇÃO PÓS-DEPLOY

Após o deploy concluir (2-3 minutos), verifique os logs:

```bash
railway logs --tail
```

**Procurar estas linhas:**
```
[STARTUP] JWT_SECRET length: 64
[Redis] ✅ Conectado com namespaces:
 - Evolution: evolution:
 - Farma: farma:
 - Broadcast: broadcast:
 - RateLimit: ratelimit:
 - Cache: cache:
 - Session: session:
 - Queue: queue:
[CacheEvolution] 💾 Cache SET (TTL 300s, namespace:evolution:)
[BroadcastQueue] 🚀 Processor iniciado (concurrency=2, namespace:queue:)
[Server] 🚀 Server listening on port 8080
```

Se vir `[Redis] ✅ Conectado com namespaces:`, significa que a conexão foi bem-sucedida.

---

## 🧪 TESTE FUNCIONAL

1. **Login** — acesse a plataforma e faça login normalmente
2. **Cache Evolution** — envie uma mensagem no WhatsApp e verifique se aparece no sistema (cache deve ser usado)
3. **Broadcast** — crie uma lista de transmissão e envie um broadcast (deve enfileirar job no Redis)
4. **Rate Limiting** — faça várias requisições rapidamente para testar limites

---

## 📊 O QUE ESPERAR

Com o Redis configurado:

✅ **Broadcast Queue** funcionará com Bull + Redis (persistente)  
✅ **Rate Limiting** Distributed funcionará corretamente  
✅ **Cache da Evolution** será armazenado no Redis com namespace `evolution:`  
✅ **Isolamento total** entre serviços (Evolution vs Farma)  
✅ **Sistema escalável** e robusto

---

## ⚠️ SE HOUVER ERROS

Caso apareça erro de conexão Redis nos logs:

1. Verifique se a URL está correta (copie exatamente como fornecido)
2. Verifique se o Redis está rodando no Railway (Add-on ativo)
3. Teste a conexão manualmente (se tiver acesso ao container):
   ```bash
   redis-cli -u "$REDIS_URL" ping
   # Deve retornar: PONG
   ```

---

**Pronto!** Após configurar `REDIS_URL`, o sistema estará 100% operacional com namespaces.
