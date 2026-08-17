# 🔧 Troubleshooting - Mensagens Não Aparecem

## 🚨 Problema
Imagens enviadas pela loja não aparecem no sistema, mesmo após correções.

## 🔍 Diagnóstico Rápido

### 1. Verificar Deploy no Railway
- Acesse: https://railway.app/dashboard/project/62e113a5-4f51-402a-b7d3-a623c69f2e1f
- Verifique: "Latest Deployment" → Status: "Succeeded"
- Se falhou, veja os logs do build

### 2. Verificar Logs do Servidor
```bash
# Via Railway CLI
railway logs

# Ou via Dashboard
# Project → Logs
```

Procure por:
- `[Ingest] Starting` - Mensagem sendo processada
- `[ingestOutbound]` - Função de ingestão sendo chamada
- `ERROR` ou `❌` - Erros

### 3. Verificar Cache do Navegador
**MUITO IMPORTANTE!** O frontend usa bundle JavaScript que pode estar em cache.

**Soluções:**
- Hard refresh: `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)
- Limpar cache: `F12` → Network → "Disable cache" → Recarregar
- Abrir em modo anônimo/incógnito

### 4. Verificar via API Diretamente
```bash
# Verificar mensagens na conversa 1477
curl "https://farmafrancis.up.railway.app/api/trpc/messages.list?batch=1&input=%7B%220%22%3A%7B%22conversation_id%22%3A1477%7D%7D"
```

### 5. Verificar Banco de Dados
Se tiver acesso ao MySQL, execute:
```sql
SELECT * FROM conversation_messages 
WHERE conversation_id = 1477 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📋 Checklist de Verificação

- [ ] Deploy aplicado com sucesso no Railway
- [ ] Hard refresh no navegador feito
- [ ] Mensagem enviada após deploy
- [ ] Logs mostram processamento da mensagem
- [ ] Banco de dados atualizado

## 🆘 Se Nada Funcionar

1. **Forçar rebuild no Railway:**
   - Dashboard → Project → Deploy → "Clear Build Cache"
   - Em seguida: "Redeploy"

2. **Verificar variáveis de ambiente:**
   - DATABASE_URL
   - JWT_SECRET
   - NODE_ENV=production

3. **Testar com outro navegador/dispositivo**

## 📞 Suporte Rápido

- Telegram: @OsFrancis
- GitHub Issues: https://github.com/Dedefg87/farma-francis-platform/issues