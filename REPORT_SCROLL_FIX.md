# RELATÓRIO: Scroll de Mensagens nas Conversas

## 📋 Problemática

**Sintoma:** Ao abrir uma conversa, a barra de rolagem inicia no topo (mostrando as mensagens mais antigas), em vez de no final (mostrando as mensagens mais recentes).

**Esperado:** O scroll deve posicionar automaticamente no FINAL da conversa, exibindo as mensagens mais recentes imediatamente ao abrir.

**Impacto:** Usuário precisa rolar manualmente toda vez que abre uma conversa para ver as mensagens novas.

---

## 🔍 Análise Técnica

### Componente Principal: `AgentMessages.tsx`

**Local:** `/client/src/pages/AgentMessages.tsx`

### Problema Identificado

Há um bug no gerenciamento do scroll que afeta o comportamento:

```tsx
// Linha ~249 - Scroll inicial quando carrega conversa
useEffect(() => {
  if (!hasInitiallyScrolledRef.current && messages && messages.length > 0) {
    scrollToBottom(true);
    hasInitiallyScrolledRef.current = true;  // ← PROBLEMA: NUNCA é resetado
  }
}, [messages, scrollToBottom]);
```

**O problema:** `hasInitiallyScrolledRef` é uma referência que NUNCA é reiniciada quando o usuário muda de conversa. Isso significa que:

1. ✅ Primeira conversa aberta: scroll funciona (rola para o final)
2. ❌ Segunda conversa aberta: scroll NÃO funciona (mostra do topo)
3. ❌ Terceira conversa aberta: scroll NÃO funciona (mostra do topo)

### Código Atual do Scroll

```tsx
const scrollToBottom = useCallback((force = false) => {
  if (!messagesContainerRef.current) return;
  const container = messagesContainerRef.current;
  const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
  if (force || isAtBottom) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, []);
```

### Container de Mensagens

```tsx
<div 
  ref={messagesContainerRef}
  onScroll={handleScroll}
  className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
>
```

---

## 🛠️ Solução Proposta

### Mudança 1: Resetar `hasInitiallyScrolledRef` ao mudar de conversa

```tsx
// ADICIONAR: Resetar o flag quando mudar de conversa
useEffect(() => {
  hasInitiallyScrolledRef.current = false;
}, [selectedConversationId]);
```

### Mudança 2: Usar ScrollArea do Radix UI (opcional, mas recomendado)

Substituir o scroll nativo por componente otimizado:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

// No lugar de:
<div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto ...">

// Usar:
<ScrollArea 
  ref={messagesContainerRef} 
  className="flex-1"
  viewportRef={messagesViewportRef}
>
```

E então chamar `scrollToBottom()` no efeito de mudança de conversa.

---

## 📝 Implementação

### Arquivo a ser modificado:
- `client/src/pages/AgentMessages.tsx`

### Mudanças necessárias:

1. **Resetar `hasInitiallyScrolledRef` quando `selectedConversationId` mudar**
2. **Garantir scroll automático ao carregar mensagens de nova conversa**
3. **Manter scroll inteligente (não rolar se usuário estiver lendo mensagens antigas)**

---

## ✅ Status Atual

| Item | Status |
|------|--------|
| Scroll quando digita nova mensagem | ✅ Funciona |
| Scroll ao receber mensagem nova | ✅ Funciona (com scroll inteligente) |
| Scroll ao mudar de conversa | ❌ **QUEBRADO** - não rola para o final |
| Scroll na primeira carga | ✅ Funciona |

---

## 🔧 Correção Pronta

Veja o arquivo de correção em: `patch-scroll-to-bottom.cjs`

Executar após deploy:
\`\`\`bash
node patch-scroll-to-bottom.cjs
\`\`\`

---

**Assinado:** Madalena 👩‍💻  
**Data:** 18/06/2026 10:45 BRT