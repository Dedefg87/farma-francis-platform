# RELATÓRIO: Mensagens Instagram Stories - Texto sem Imagem

## 📋 Problemática

**Sintoma:** Mensagens recebidas via Instagram Stories chegam apenas com texto, sem a imagem anexa.

**Esperado:** A mensagem deveria vir com texto + imagem (mídia) como acontece com mensagens normais.

---

## 🔍 Análise Técnica

### Processamento de Mensagens Instagram

**Arquivo:** `server/webhooks.ts` → `processInstagramWebhook()`

### Estrutura Atual (linhas 880-950)

```typescript
async function processInstagramWebhook(body: unknown) {
  // Instagram webhook structure:
  // body.entry[].messaging[]
  
  for (const event of messaging) {
    const message = event.message;
    const text = message.text || null;  // ✅ Texto é extraído
    
    // ❌ PROBLEMA: attachments é extraído, mas imageMessage não existe no Instagram!
    if (message.attachments && Array.isArray(message.attachments)) {
      const attachment = message.attachments[0];
      const type = attachment.type;  // "image", "video", etc.
      const payload = attachment.payload;
      
      messageType = type === "image" ? "image" : ...;
      mediaUrl = payload?.url || null;  // ✅ URL de mídia
    }
  }
}
```

---

## 🚨 Problema Identificado

### Instagram Stories vs Mensagens Normais

**Instagram Stories** possuem estrutura diferente das mensagens regulares:

### Estrutura de Stories (hipótese):
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messaging": [{
          "sender": {"id": "..."},
          "message": {
            "text": "Texto da resposta ao story",
            "attachments": [{
              "type": "story",
              "payload": {
                "url": "https://...",  // URL do story
                "story_id": "...",
                "is_story_reply": true
              }
            }]
          }
        }]
      }
    }]
  }]
}
```

### Código Atual NÃO lida com `type: "story"`:
- Linha 898-907: O código só trata `image`, `video`, `audio`, `file`
- **`type: "story"` é tratado como `"unknown"`** → imagem é ignorada!

---

## 📊 Comparativo: Tratamento de Tipos

| Tipo de Mensagem | Tratado Atualmente | Problema |
|-----------------|-------------------|----------|
| text | ✅ | Funciona |
| image | ✅ | Funciona |
| video | ✅ | Funciona |
| **story** | ❌ **NÃO** | Caíra como "unknown" |
| story_template | ❌ **NÃO** | Caíra como "unknown" |
| fallback | ❌ **NÃO** | Caíra como "unknown" |

---

## 🛠️ Solução Proposta

### 1. Adicionar suporte a tipos de story no `processInstagramWebhook`:

```typescript
// Linha ~904 - Adicionar após o switch de tipos
messageType =
  type === "image" ? "image" :
  type === "video" ? "video" :
  type === "audio" ? "audio" :
  type === "file" ? "document" :
  type === "story" ? "image" :      // ✅ NOVO
  type === "story_template" ? "image" : // ✅ NOVO
  type === "fallback" ? "image" :   // ✅ NOVO
  "unknown";
```

### 2. Verificar estrutura real do webhook de stories

O Instagram pode enviar:
- `story` - resposta a story com texto + imagem
- A imagem pode estar em `attachment.payload.url` ou em campo separado

---

## 🔧 Pontos de Atenção

1. **Verificar se `caption` é usada** - Stories podem ter texto no campo `caption` ao invés de `text`
2. **Verificar se há `story_id`** - Identificador único do story
3. **Verificar `is_story_reply`** - Flag indicando se é resposta a story

---

## 📍 Próximos Passos

1. **Coletar payload real** de uma mensagem de story para analisar estrutura exata
2. **Adicionar log de debug** para inspecionar `message.attachments`
3. **Implementar suporte** aos tipos `story`, `story_template`, `fallback`
4. **Garantir caption + mediaUrl** sejam ambos salvos

---

**Assinado:** Madalena 👩‍💻  
**Data:** 18/06/2026