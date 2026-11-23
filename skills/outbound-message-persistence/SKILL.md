---
name: outbound-message-persistence
category: bug-fix
description: |
  Solução para persistir mensagens de saída (agente envia arquivos) na tabela conversation_messages.
  Problema: Mensagens enviadas pelo agente não apareciam no sistema.
tags:
  - whatsapp
  - evolution-api
  - messaging
  - bug-fix
  - database
---

# Outbound Message Persistence - Farma Francis

## 🎯 Problema

Quando o agente enviava fotos, áudios ou documentos pelo WhatsApp, essas mensagens **não apareciam no sistema**. O sistema reconhecia apenas mensagens recebidas do cliente.

## 🔍 Causa Raiz

Funções de envio em `server/messaging.ts` (`sendWhatsAppImage`, `sendWhatsAppDocument`, `sendWhatsAppMedia`, `sendWhatsAppViewOnceMedia`):
- Salvavam apenas na tabela `messages` (logs)
- **Não salvavam** na tabela `conversation_messages` (usada pela interface)

## ✅ Solução

### 1. Criar função de ingestão de mensagens de saída

**Arquivo**: `server/db-messages-outbound.ts`

```typescript
export async function ingestOutboundConversationMessage(message: {
  provider: "whatsapp" | "instagram";
  toNumber: string;
  fromUserId: number;
  messageType: string;
  messageText?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalId?: string | null;
  createdAt?: Date;
}) {
  // Encontra ou cria cliente
  // Encontra ou cria conversa
  // Insere na conversation_messages
  // Atualiza timestamp da conversa
}
```

### 2. Modificar routers-inbox.ts

**Arquivo**: `server/routers-inbox.ts` (linhas 202-219)

```typescript
// ANTES (errado):
const { ingestInboundConversationMessage } = await import('./db-messages');

// DEPOIS (correto):
const { ingestOutboundConversationMessage } = await import('./db-messages-outbound');
await ingestOutboundConversationMessage({
  provider: "whatsapp",
  toNumber: input.to,
  fromUserId: ctx.user?.id || 1,
  messageType: input.fileUrl ? 'image' : 'text',
  messageText: input.message,
  mediaUrl: input.fileUrl,
  fileName: input.fileName,
  mimeType: input.fileType,
  externalId: result?.messageId || result?.messages?.[0]?.id,
  createdAt: new Date(),
});
```

### 3. Patchar messaging.ts

Adicionar chamadas para `ingestOutboundConversationMessage` após sucesso de envio em:
- `sendWhatsAppImage` (Evolution e Business API)
- `sendWhatsAppDocument` (Evolution e Business API)
- `sendWhatsAppMedia` (Evolution e Business API)
- `sendWhatsAppViewOnceMedia` (Evolution e Business API)

## 📋 Checklist de Implementação

- [x] Criar função `ingestOutboundConversationMessage`
- [x] Modificar `routers-inbox.ts` para usar função correta
- [x] Patchar `messaging.ts` com chamadas de ingestão
- [x] Verificar importações corretas
- [x] Commitar alterações
- [x] Push para GitHub (dispara deploy Railway)

## 🧪 Testes Pós-Deploy

1. Enviar imagem do celular da loja
2. Verificar se aparece na conversa
3. Verificar logs: `[ingestOutbound]`
4. Verificar banco: `SELECT * FROM conversation_messages WHERE sender_type = 'agent'`

## 🚀 Deploy

```bash
git add server/db-messages-outbound.ts server/messaging.ts server/routers-inbox.ts
git commit -m "Fix: Persist outbound media messages in chat"
git push origin main
```

## 📊 Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `server/db-messages-outbound.ts` | NOVO |
| `server/messaging.ts` | MODIFICADO |
| `server/routers-inbox.ts` | MODIFICADO |

## 🔗 Links Úteis

- [Deploy Instructions](./DEPLOY_CORRECAO.md)
- [API Documentation](../Projetos/Farma_Francis/Farma_Francis_API.md)
- [Railway Dashboard](https://railway.app/dashboard/project/62e113a5-4f51-402a-b7d3-a623c69f2e1f)