# Fluxo de Mídia - Farma Francis Platform

## 📋 Arquitetura de Envio e Recebimento de Mídia

### Quando o CLIENTE envia arquivos (via WhatsApp/Instagram):

```
Cliente → WhatsApp/Instagram → Evolution API Webhook → Sistema
```

**Passo a passo:**

1. **Recepção**: Webhook (`/api/webhooks/evolution`) recebe mensagem com `mediaUrl` do WhatsApp CDN

2. **Detecção de mídia**: Código em `webhooks.ts:591-599` detecta se precisa de upload para R2:
   ```typescript
   const needsR2Upload =
     message.provider === "whatsapp" &&
     message.externalId &&
     (fileUrlToSave?.includes("mmg.whatsapp.net") || 
      fileUrlToSave?.includes("pps.whatsapp.net"));
   ```

3. **Upload para R2**: Código em `db-messages.ts:601-647`:
   - Baixa do WhatsApp CDN via `/message/download`
   - Faz upload para R2 com verificação de integridade (MD5)
   - Atualiza mensagem com URL do R2

4. **Salvamento**: Mensagem salva em `conversation_messages` com URL do R2

### Quando a LOJA envia arquivos (via interface):

```
Frontend → trpc.messages.send → Evolution API → WhatsApp → Cliente
```

**Passo a passo:**

1. **Frontend**: Converte arquivo para base64 (data URL)

2. **Upload para R2** (opcional): Se o arquivo for grande, pode ser feito upload antes do envio

3. **Envio**: `messaging.ts` chama Evolution API para enviar a mensagem

4. **Salvamento**: Deve salvar em `conversation_messages` (correção aplicada)

## 🔧 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `server/r2-client.ts` | Upload para Cloudflare R2 com verificação MD5 |
| `server/db-messages.ts` | Lógica de recepção e upload para R2 |
| `server/routers-messages.ts` | Endpoint de envio de mensagens |
| `server/messaging.ts` | Funções de envio via Evolution API |
| `server/webhooks.ts` | Processamento de webhooks |

## 📊 URLs de Armazenamento

- **R2 Bucket**: `farmafranciswhatsappmedia`
- **URL Pública**: `https://pub-33c481f0a9e94adb8870472308f49471.r2.dev`
- **API R2**: `https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com`

## ✅ Status Atual

- [x] Recepção de mídia do cliente → Upload para R2 → Sistema
- [x] Envio de mídia pela loja → Sistema (corrigido)
- [x] URLs do R2 funcionando para ambos os casos