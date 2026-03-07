# Performance Rules - Farma Francis Platform

## ⚠️ REGRAS CRÍTICAS - NUNCA VIOLAR

### 1. Webhooks DEVEM responder 200 OK imediatamente

```typescript
// ✅ CORRETO
async function handleWebhook(req, res) {
  res.status(200).send("OK"); // Resposta IMEDIATA
  setImmediate(() => {
    processWebhookAsync(req).catch(console.error);
  });
}

// ❌ ERRADO - Nunca fazer isso
async function handleWebhook(req, res) {
  await processWebhook(req); // Bloqueia a resposta!
  res.status(200).send("OK");
}
```

**Por que:** O Evolution/API expira se não receber 200 em poucos segundos. Mensagens se acumulam e causam delay de 40+ minutos.

---

### 2. NUNCA adicionar logs de debug em produção

```typescript
// ❌ PROIBIDO em webhooks e processamento de mensagens
console.log("[Debug] Step 1:", data);
console.log("[Debug] Step 2:", moreData);
console.log("[Debug] Processing...", JSON.stringify(payload));

// ✅ PERMITIDO apenas erros críticos
console.error("[Error] Failed to process:", error);
```

**Por que:** Cada `console.log` adiciona ~5-10ms de I/O. Com 100+ logs por mensagem, isso vira segundos de delay.

---

### 3. Cache de agent assignment é OBRIGATÓRIO

```typescript
// Cache implementado em server/db-messages.ts
const agentAssignmentCache = new Map<string, { agentId: number | null; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos
```

**Por que:** A query de `pickLeastLoadedOnlineAgent` faz JOIN na tabela `conversations` (307.000+ registros). Sem cache, cada mensagem faz essa query pesada.

---

### 4. Fotos de perfil em background

```typescript
// ✅ CORRETO - Não bloqueia
setImmediate(async () => {
  const profile = await fetchEvolutionProfile(phone);
  // Atualiza customer...
});

// ❌ ERRADO - Bloqueia processamento
const profile = await fetchEvolutionProfile(phone); // Espera API externa!
```

---

### 5. Timeout de mídia: máximo 5 segundos

```typescript
// ✅ CORRETO
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000),
});

// ❌ ERRADO
const response = await fetch(url, {
  signal: AbortSignal.timeout(15000), // Muito longo!
});
```

---

## Checklist de Code Review

Antes de aprovar qualquer PR que toque em:

- [ ] `server/webhooks.ts`
- [ ] `server/db-messages.ts`
- [ ] Qualquer arquivo de processamento de mensagens

Verificar:

1. [ ] Não há `console.log` de debug (só `console.error`)
2. [ ] Webhook responde 200 antes de processar
3. [ ] Não há `await` bloqueando operações não críticas
4. [ ] Timeouts de fetch são ≤ 5 segundos
5. [ ] Cache de agent assignment está sendo usado

---

## Histórico de Problemas

| Data | Problema | Causa | Solução |
|------|----------|-------|---------|
| 07/03/2026 | Delay 40+ min | Logs de debug + query pesada | Cache + remover logs |
| 07/03/2026 | Mensagens não apareciam | Filtro de role muito restritivo | Ajustar where clause |

---

## Contatos

- **Anderson (Dono):** Usa o sistema diariamente
- **Jorge (Assistente):** Mantém esta documentação

---

*Última atualização: 07/03/2026*
