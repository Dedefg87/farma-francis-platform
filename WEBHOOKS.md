# Documentação de Webhooks - Farma Francis Platform

## Visão Geral

A plataforma Farma Francis implementa webhooks completos para receber mensagens em tempo real do **WhatsApp Business API** e **Instagram Graph API**.

## Endpoints Disponíveis

### WhatsApp Business API

#### Verificação do Webhook (GET)
```
GET /api/webhooks/whatsapp
```

**Parâmetros de Query:**
- `hub.mode`: "subscribe"
- `hub.verify_token`: Token de verificação configurado
- `hub.challenge`: String de desafio fornecida pelo Meta

**Resposta de Sucesso:**
- Status: 200
- Body: Retorna o valor de `hub.challenge`

**Resposta de Erro:**
- Status: 403 - Token inválido ou configuração não encontrada
- Status: 400 - Requisição inválida

#### Recebimento de Mensagens (POST)
```
POST /api/webhooks/whatsapp
```

**Payload Esperado:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "NAME"
                },
                "wa_id": "WHATSAPP_ID"
              }
            ],
            "messages": [
              {
                "from": "SENDER_PHONE_NUMBER",
                "id": "MESSAGE_ID",
                "timestamp": "TIMESTAMP",
                "type": "text",
                "text": {
                  "body": "MESSAGE_CONTENT"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Tipos de Mensagem Suportados:**
- `text`: Mensagens de texto simples
- `image`: Imagens com caption opcional
- `audio`: Mensagens de áudio/voz
- `video`: Vídeos com caption opcional
- `document`: Documentos/arquivos
- `location`: Localização geográfica
- `contact`: Contatos compartilhados
- `sticker`: Figurinhas
- `reaction`: Reações a mensagens

**Resposta:**
- Status: 200
- Body: "EVENT_RECEIVED"

---

### Instagram Graph API

#### Verificação do Webhook (GET)
```
GET /api/webhooks/instagram
```

**Parâmetros de Query:**
- `hub.mode`: "subscribe"
- `hub.verify_token`: Token de verificação configurado
- `hub.challenge`: String de desafio fornecida pelo Meta

**Resposta de Sucesso:**
- Status: 200
- Body: Retorna o valor de `hub.challenge`

**Resposta de Erro:**
- Status: 403 - Token inválido ou configuração não encontrada
- Status: 400 - Requisição inválida

#### Recebimento de Mensagens (POST)
```
POST /api/webhooks/instagram
```

**Payload Esperado:**
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1234567890,
      "messaging": [
        {
          "sender": {
            "id": "SENDER_ID"
          },
          "recipient": {
            "id": "PAGE_ID"
          },
          "timestamp": 1234567890,
          "message": {
            "mid": "MESSAGE_ID",
            "text": "MESSAGE_CONTENT"
          }
        }
      ]
    }
  ]
}
```

**Tipos de Mensagem Suportados:**
- `text`: Mensagens de texto
- `image`: Imagens compartilhadas
- `video`: Vídeos compartilhados
- `audio`: Mensagens de áudio
- `file`: Arquivos/documentos

**Resposta:**
- Status: 200
- Body: "EVENT_RECEIVED"

---

## Configuração

### 1. Configurar Credenciais

Acesse a página **Configurações API** (`/settings/api`) e preencha:

**WhatsApp Business API:**
- Access Token
- Phone Number ID
- Webhook URL: `https://sua-plataforma.com/api/webhooks/whatsapp`
- Webhook Verify Token (escolha um token secreto)

**Instagram Graph API:**
- Access Token
- Page ID
- Webhook URL: `https://sua-plataforma.com/api/webhooks/instagram`
- Webhook Verify Token (escolha um token secreto)

### 2. Configurar no Meta Developer Portal

#### WhatsApp:
1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Selecione seu app WhatsApp Business
3. Vá em **WhatsApp > Configuration**
4. Em "Webhook", clique em "Edit"
5. Cole a URL do webhook: `https://sua-plataforma.com/api/webhooks/whatsapp`
6. Cole o Verify Token configurado na plataforma
7. Clique em "Verify and Save"
8. Inscreva-se nos eventos: `messages`

#### Instagram:
1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Selecione seu app Instagram
3. Vá em **Messenger > Settings**
4. Em "Webhooks", clique em "Add Callback URL"
5. Cole a URL do webhook: `https://sua-plataforma.com/api/webhooks/instagram`
6. Cole o Verify Token configurado na plataforma
7. Clique em "Verify and Save"
8. Inscreva-se nos eventos: `messages`, `messaging_postbacks`

---

## Armazenamento de Mensagens

Todas as mensagens recebidas são salvas na tabela `received_messages` com os seguintes campos:

- `id`: ID único da mensagem
- `provider`: "whatsapp" ou "instagram"
- `externalId`: ID da mensagem fornecido pelo provedor
- `fromNumber`: Número de telefone ou ID do usuário
- `fromName`: Nome do remetente (quando disponível)
- `messageType`: Tipo da mensagem (text, image, audio, etc.)
- `messageText`: Conteúdo de texto
- `mediaUrl`: URL do arquivo de mídia
- `mediaId`: ID da mídia no provedor
- `mimeType`: Tipo MIME da mídia
- `caption`: Legenda da mídia
- `latitude`: Latitude (para mensagens de localização)
- `longitude`: Longitude (para mensagens de localização)
- `timestamp`: Timestamp Unix da mensagem
- `rawPayload`: Payload JSON completo (para debug)
- `processed`: 0 = pendente, 1 = processado
- `processedAt`: Data/hora do processamento
- `customerId`: ID do cliente vinculado
- `ticketId`: ID do ticket criado
- `automationFlowId`: ID do fluxo de automação que processou
- `createdAt`: Data/hora de criação no banco

---

## Processamento de Mensagens

### Fluxo de Processamento

1. **Recebimento**: Webhook recebe payload do Meta
2. **Validação**: Verifica estrutura do payload
3. **Parsing**: Extrai dados da mensagem (texto, mídia, remetente)
4. **Salvamento**: Armazena mensagem no banco de dados
5. **Processamento Assíncrono**: Identifica cliente, aplica automações
6. **Resposta**: Envia resposta automática ou transfere para agente

### Funções Auxiliares

```typescript
// Buscar mensagens recebidas
getReceivedMessages({ 
  provider: "whatsapp", 
  processed: false, 
  limit: 50 
})

// Buscar histórico de conversa
getConversationHistory("+5511999999999", "whatsapp", 50)

// Marcar como processada
markMessageAsProcessed(messageId, {
  customerId: 123,
  ticketId: 456,
  automationFlowId: 789
})

// Encontrar ou criar cliente
findOrCreateCustomerByPhone("+5511999999999", "Nome do Cliente")

// Estatísticas de mensagens
getMessageStatistics({ provider: "whatsapp" })
```

---

## Segurança

- ✅ Validação de verify token em todas as requisições GET
- ✅ Validação de assinatura HMAC SHA256 em requisições POST
- ✅ Tokens armazenados no banco de dados
- ✅ Processamento assíncrono para não bloquear resposta
- ✅ Logs detalhados de todas as operações
- ✅ Payload completo salvo para auditoria

### Validação de Assinatura HMAC SHA256

A plataforma implementa validação de assinatura HMAC SHA256 para garantir que as requisições realmente vêm da Meta (Facebook/Instagram) e não de fontes maliciosas.

**Como funciona:**

1. A Meta envia um header `x-hub-signature-256` com cada requisição POST
2. O header contém um hash HMAC SHA256 do payload usando o **App Secret** como chave
3. O servidor recalcula o hash e compara com o recebido usando `crypto.timingSafeEqual()`
4. Se não coincidirem, a requisição é rejeitada com status `403 Forbidden`

**Configuração:**

1. Acesse a página **Configurações de API** (`/api-settings`)
2. Configure o **App Secret** do seu aplicativo Meta
3. O campo `app_secret` será salvo na tabela `api_configurations`
4. A validação será aplicada automaticamente em todas as requisições

**Importante:** Se o `app_secret` não estiver configurado, a validação é **ignorada** para permitir testes iniciais. Em produção, **sempre configure o App Secret**.

**Exemplo de código:**

```typescript
const signature = req.headers["x-hub-signature-256"] as string;
if (signature) {
  const isValid = await validateWhatsAppSignature(req.body, signature);
  if (!isValid) {
    return res.status(403).send("Invalid signature");
  }
}
```

---

## Logs e Debugging

Os webhooks geram logs detalhados no console:

```
[WhatsApp Webhook] Verification request: { mode: 'subscribe', token: '***' }
[WhatsApp Webhook] Verification successful
[WhatsApp Webhook] Received payload: {...}
[WhatsApp] Saved message wamid.xxx from +5511999999999
```

Para debug, consulte:
- Console do servidor
- Tabela `received_messages` (campo `rawPayload`)
- Logs do Meta Developer Portal

---

## Testes

Execute os testes unitários:

```bash
pnpm test webhooks.test.ts
```

**Cobertura de Testes:**
- ✅ Salvamento de mensagens WhatsApp
- ✅ Salvamento de mensagens Instagram
- ✅ Busca por ID externo
- ✅ Marcação como processada
- ✅ Histórico de conversas
- ✅ Criação automática de clientes
- ✅ Estatísticas de mensagens
- ✅ Filtros por provedor e status

---

## Próximos Passos

- [ ] Implementar engine de execução de fluxos de automação
- [ ] Adicionar sistema de variáveis de contexto
- [ ] Criar respostas automáticas baseadas em palavras-chave
- [ ] Implementar transferência para agentes humanos
- [ ] Adicionar suporte a templates de mensagem do WhatsApp
- [ ] Integrar com IA para respostas humanizadas

---

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte a documentação oficial do Meta
3. Teste a conexão na página de Configurações API
4. Revise os payloads salvos na tabela `received_messages`
