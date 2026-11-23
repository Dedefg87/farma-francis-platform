# Variáveis de Ambiente para Railway

## 🔴 Evolution API Service (evolution-api-production-ffea.up.railway.app)

Configure estas variáveis no painel do Railway > Evolution API Service > Variables:

```bash
# Banco de dados
DATABASE_URL=mysql://usuario:senha@host:3306/farma_francis

# Redis (se usado)
REDIS_URL=redis://usuario:senha@host:6379

# Evolution API Config
SERVER_URL=https://evolution-api-production-ffea.up.railway.app
SERVER_PORT=8080
SERVER_TYPE=development

# Autenticação
AUTHENTICATION_API_KEY=sua-chave-api-aqui
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Database - CRÍTICO para Story Reply
DATABASE_ENABLED=true
DATABASE_CONNECTION_URI=mysql://usuario:senha@host:3306/farma_francis
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_MESSAGES=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_LABELS=true

# Webhooks
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=https://farmafrancis.up.railway.app/api/webhooks/evolution
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true
WEBHOOK_EVENTS_APPLICATION_STARTUP=true
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_MESSAGES_DELETE=true
WEBHOOK_EVENTS_SEND_MESSAGE=true
WEBHOOK_EVENTS_CHATS_UPSERT=true
WEBHOOK_EVENTS_CHATS_UPDATE=true
WEBHOOK_EVENTS_CHATS_DELETE=true
WEBHOOK_EVENTS_CONTACTS_UPSERT=true
WEBHOOK_EVENTS_CONTACTS_UPDATE=true
WEBHOOK_EVENTS_PRESENCE_UPSERT=true
WEBHOOK_EVENTS_CALL=true
WEBHOOK_EVENTS_TYPEBOT_START=true
WEBHOOK_EVENTS_TYPEBOT_CHANGE_STATUS=true

# Chat - CRÍTICO para Story Reply
CHAT_WHATSAPP_VIEW_STATUS=true
CHAT_WHATSAPP_VERSION=2.3000.1012202403

# S3/R2 Storage (para Evolution salvar mídia)
S3_ENABLED=true
S3_ACCESS_KEY_ID=debc3a713faeb6d442dab499221ba42f
S3_SECRET_ACCESS_KEY=c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c
S3_REGION=auto
S3_ENDPOINT=https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com
S3_BUCKET=farmafranciswhatsappmedia
S3_PUBLIC_URL=https://pub-33c481f0a9e94adb8870472308f49471.r2.dev

# RabbitMQ (se usado)
RABBITMQ_ENABLED=false
```

---

## 🔵 Farma Francis Main App (farmafrancis.up.railway.app)

Configure estas variáveis no painel do Railway > Farma Francis Service > Variables:

```bash
# App
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://farmafrancis.up.railway.app

# JWT
JWT_SECRET=6c13be42-b501-4de5-92b4-774594f6c839

# Database
DATABASE_URL=mysql://usuario:senha@host:3306/farma_francis

# Evolution API Integration
EVOLUTION_API_URL=https://evolution-api-production-ffea.up.railway.app
EVOLUTION_API_KEY=sua-chave-api-aqui
EVOLUTION_INSTANCE_NAME=Meu

# S3/R2 Client (para download/upload de mídia)
S3_ACCESS_KEY_ID=debc3a713faeb6d442dab499221ba42f
S3_SECRET_ACCESS_KEY=c82abdafb97bf0d1a39e66644c86cacbe373cb6aa2b852ea5786726070a0513c
S3_REGION=auto
S3_ENDPOINT=https://816a5ff9c45a435c3a40b4fc262c914c.r2.cloudflarestorage.com
S3_BUCKET=farmafranciswhatsappmedia

# R2 Public URL (frontend)
PUBLIC_R2_URL=https://pub-33c481f0a9e94adb8870472308f49471.r2.dev

# Webhook Evolution
WEBHOOK_EVOLUTION_URL=https://farmafrancis.up.railway.app/api/webhooks/evolution
WEBHOOK_VERIFY_TOKEN=seu-token-webhook-aqui

# Redis (se usado)
REDIS_URL=redis://usuario:senha@host:6379
```

---

## 🟡 Cloudflare R2 Bucket CORS Configuration

No Cloudflare Dashboard > R2 > farmafranciswhatsappmedia > Settings > CORS Policy:

```json
[
  {
    "AllowedOrigins": [
      "https://farmafrancis.up.railway.app",
      "https://www.farmafrancis.com.br",
      "https://farmafrancis.com.br",
      "https://app.farmafrancis.com.br"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## ✅ Checklist de Deploy

- [ ] Atualizar variáveis no **Evolution API Service** no Railway
- [ ] Atualizar variáveis no **Farma Francis Service** no Railway
- [ ] Configurar **CORS no bucket R2** no Cloudflare
- [ ] **Reiniciar Evolution API** após alterar variáveis (botão Restart no Railway)
- [ ] **Reiniciar Farma Francis** após deploy
- [ ] No Evolution Manager > Instância > Configurações > Chat:
  - [ ] ✅ **Visualizar Status** (CHAT_WHATSAPP_VIEW_STATUS)
  - [ ] ✅ **STATUS_UPSERT** (WEBHOOK_EVENTS_STATUS_UPSERT)
  - [ ] ✅ **STATUS_UPDATE** (WEBHOOK_EVENTS_STATUS_UPDATE)
- [ ] Testar:
  - [ ] Encaminhar imagem (Problema 1)
  - [ ] Responder story (Problema 2)
  - [ ] Enviar foto do celular (Problema 3)
  - [ ] Enviar documento

---

## 🔐 Segurança - Rotacionar Credenciais S3

Após confirmar funcionamento:

1. Cloudflare Dashboard > R2 > Manage R2 API Tokens > Create API Token
2. Permissões: `Object Read & Write` no bucket `farmafranciswhatsappmedia`
3. Atualizar `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` em **ambos** serviços no Railway
4. **Revogar token antigo** (obrigatório)