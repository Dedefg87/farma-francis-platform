# 🚀 Deploy da Correção - Mensagens Enviadas pelo Agente

## 📋 Resumo da Correção

### Problema
Quando o agente enviava fotos, áudios ou documentos pelo WhatsApp, essas mensagens não apareciam no sistema.

### Solução Implementada
1. Criada função `ingestOutboundConversationMessage` em `server/db-messages-outbound.ts`
2. Modificadas funções de envio em `server/messaging.ts` para salvarem corretamente na tabela `conversation_messages`

### Arquivos Modificados/Criados
- ✅ `server/db-messages-outbound.ts` (NOVO)
- ✅ `server/messaging.ts` (MODIFICADO)
- ✅ `deploy.sh` (NOVO - script de deploy)

---

## 🚀 Instruções de Deploy

### Opção 1: Deploy Automático via GitHub (Recomendado)

O projeto está configurado para deploy automático no Railway via webhook do GitHub.

```bash
# Nos arquivos do projeto
cd /workspace/farma-francis-platform

# Commitar as mudanças
git add server/messaging.ts
git add server/db-messages-outbound.ts
git commit -m "Fix: Persist outbound media messages in chat"

# Push para GitHub (dispara deploy Railway)
git push origin main
```

### Opção 2: Deploy Manual via Railway CLI

```bash
# Instalar Railway CLI (se não tiver)
npm install -g railway

# Login (se necessário)
railway login

# Deploy
railway up
```

### Opção 3: Usar o script de deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🧪 Testes Pós-Deploy

Após o deploy, testar:

1. **Envio de imagem**
   - Tocar em "Enviar mídia" no frontend
   - Selecionar imagem
   - Verificar se aparece na conversa

2. **Envio de documento**
   - Selecionar documento (PDF, DOC, etc.)
   - Verificar se aparece na conversa

3. **Envio de áudio**
   - Enviar áudio
   - Verificar se aparece na conversa

4. **Verificar banco de dados**
   ```sql
   SELECT * FROM conversation_messages 
   WHERE sender_type = 'agent' 
   AND file_url IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 📊 Verificação de Saúde

### Health Check
```bash
curl https://farmafrancis.up.railway.app/api/health
```

### Logs
```bash
# Via Railway CLI
railway logs

# Ou via Dashboard Railway
# Acesse: https://railway.app
```

### Verificar variáveis de ambiente
```bash
# Via Railway CLI
railway variables

# Ou via Dashboard
# Variables → DATABASE_URL, JWT_SECRET, NODE_ENV=production
```

---

## 🐛 Troubleshooting

### Mensagem não aparece após envio
1. Verificar logs: `railway logs`
2. Procurar por `[ingestOutbound]` nos logs
3. Verificar se há erros de database connection

### Erro de build no Railway
1. Verificar se TypeScript está compilando:
   ```bash
   npx tsc --noEmit
   ```
2. Verificar se há imports quebrados

### Erro de deduplicação
- Mensagens duplicadas são ignoradas pelo `externalId`
- Verificar se o `messageId` retornado pela Evolution API está correto

---

## 📝 Notas Técnicas

- O `fromUserId` está hardcoded como `1` nos patches
- Em produção, deve ser passado dinamicamente do contexto de autenticação
- A correção funciona para ambas as APIs: Evolution API e WhatsApp Business API

---

## ✅ Checklist Pós-Deploy

- [ ] Build concluído com sucesso
- [ ] Container rodando (Railway Dashboard)
- [ ] Health check passando
- [ ] Teste de envio de imagem funcional
- [ ] Teste de envio de documento funcional
- [ ] Mensagens aparecem no histórico da conversa
- [ ] Links de mídia funcionando

---

## 📞 Suporte

- GitHub Issues: https://github.com/Dedefg87/farma-francis-platform/issues
- Telegram: @OsFrancis
- Documentação: `/workspace/farma-francis-platform/API_DOCUMENTATION.md`