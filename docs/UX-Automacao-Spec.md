# UX-Automacao-Spec.md — Especificação de Melhorias UX

**Data:** 12/05/2026
**Versão:** 1.0
**Status:** Em preparação (Fase 0)

---

## Objetivo

Melhorar a experiência do editor visual de automação do Farma Francis PRO, eliminando conflitos de espaço entre canvas e painéis, reduzindo fricção cognitiva e aumentando velocidade de criação de fluxos.

---

## Regras de Ouro

1. Nunca misturar tarefas de fases diferentes no mesmo commit
2. Nunca abrir o painel lateral antes das funções básicas ficarem estáveis
3. Nunca mexer no canvas enquanto o painel ainda está instável
4. Toda feature deve ter feature flag com data de validade
5. Toda entrega precisa de vídeo de 10-20s para validação
6. Código mergeado por feature flag, nunca direto na interface

---

## Feature Flags

Cada melhoria é controlada por uma flag. Após 1 semana estável, a flag é removida e a feature vira permanente.

| Flag | Feature | Fase | Status | Data Limite |
|------|---------|------|--------|-------------|
| `VITE_FEATURE_INLINE_EDIT` | Edição inline de nós | 1 | ⏳ Pendente | - |
| `VITE_FEATURE_FLOATING_PANEL` | Mini painel flutuante | 1 | ⏳ Pendente | - |
| `VITE_FEATURE_ERROR_INDICATOR` | Indicação visual de erros | 1 | ⏳ Pendente | - |
| `VITE_FEATURE_PERSISTENT_STATE` | Estado persistente da UI | 1 | ⏳ Pendente | - |
| `VITE_FEATURE_HOVER_PREVIEW` | Preview em hover | 2 | ⏳ Pendente | - |
| `VITE_FEATURE_AUTOSCROLL` | Autoscroll inteligente | 2 | ⏳ Pendente | - |
| `VITE_FEATURE_MINIMAP_ENHANCED` | Minimap melhorado | 2 | ⏳ Pendente | - |
| `VITE_FEATURE_FULL_CANVAS` | Full canvas view | 2 | ⏳ Pendente | - |
| `VITE_FEATURE_ANALYZE_MODE` | Modo analisar fluxo | 3 | ⏳ Pendente | - |
| `VITE_FEATURE_NODE_GROUPS` | Grupos visuais (frames) | 3 | ⏳ Pendente | - |

---

## Fases

### Fase 0 — Preparação (este documento)
- [x] Criar spec
- [ ] Criar feature flags
- [ ] Criar handler centralizado
- [ ] Documentar estado atual

### Fase 1 — Alto Impacto, Baixo Risco
**Objetivo:** Reduzir atrito imediato sem mexer no layout profundo.

| # | Feature | Flag | Dependências | Risco |
|---|---------|------|--------------|-------|
| 1 | Estado persistente | `PERSISTENT_STATE` | Nenhuma | 🟡 Médio |
| 2 | Indicação de erros | `ERROR_INDICATOR` | Nenhuma | 🟡 Médio |
| 3 | Mini painel flutuante | `FLOATING_PANEL` | Handler centralizado | 🟢 Baixo |
| 4 | Edição inline | `INLINE_EDIT` | Floating panel | 🟢 Baixo |

**Critérios de aceite:**
- Renomear nó sem abrir painel
- Hover mostra ícone de ações
- Erro aparece visualmente no nó
- Trocar de nó → painel mantém estado
- Painel não abre sozinho sem motivo
- Nada quebra no mobile
- Canvas permanece fluido

### Fase 2 — Navegação e Ergonomia
**Objetivo:** Deixar o fluxo visual claro e confortável.

| # | Feature | Flag | Dependências | Risco |
|---|---------|------|--------------|-------|
| 5 | Hover preview | `HOVER_PREVIEW` | Handler centralizado | 🟢 Baixo |
| 6 | Autoscroll | `AUTOSCROLL` | Estado persistente | 🟡 Médio |
| 7 | Minimap melhorado | `MINIMAP_ENHANCED` | Nenhuma | 🟢 Baixo |
| 8 | Full canvas view | `FULL_CANVAS` | Autoscroll | 🟡 Médio |

**Critérios de aceite:**
- Selecionar nó fora do viewport → canvas move suavemente
- Minimap mostra nó ativo
- Hover preview NÃO atrapalha drag
- Botão "Tela Cheia" entra e sai sem glitch
- Nenhum scroll lateral indesejado
- Zoom não se perde

### Fase 3 — Organização Avançada
**Objetivo:** Melhorar fluxos grandes e depurações complexas.

| # | Feature | Flag | Dependências | Risco |
|---|---------|------|--------------|-------|
| 9 | Modo analisar fluxo | `ANALYZE_MODE` | Canvas estável | 🟡 Médio |
| 10 | Grupos visuais | `NODE_GROUPS` | Canvas estável + tipos | 🔴 Alto |

**Critérios de aceite:**
- Modo "analisar" congela o fluxo sem esconder nada
- Grupos podem ser criados, recolhidos e movidos
- Frames não quebram posicionamento
- Frames não interferem no fitView

### Fase 4 — Ajustes de Produção
- Refinamentos
- Ajuste fino de animações
- Correção de bugs residuais

---

## Handler Centralizado de Interações

Para evitar conflito entre click, hover, duplo clique e drag, todas as interações com nós passam por um hook centralizado:

```
useNodeInteractionHandler({
  onSingleClick: (node) => abrirFloatingPanel(node),
  onDoubleClick: (node) => abrirPainelCompleto(node),
  onHover: (node) => mostrarPreview(node),
  onDragStart: (node) => iniciarDrag(node),
})
```

Este hook é criado na Fase 0 e usado por todas as features subsequentes.

---

## Critérios de Validação (Todas as Fases)

- [ ] Feature flag funcional (liga/desliga sem redeploy)
- [ ] Vídeo de 10-20s mostrando comportamento
- [ ] Teste com 50+ nós simultâneos (performance)
- [ ] Sem regressão visual
- [ ] Canvas 100% utilizável
- [ ] Edição nunca obstrui visão do fluxo
- [ ] Aprovação do Anderson

---

## Arquivos que NÃO devem ser alterados

- `server/` (backend)
- `client/src/_core/` (autenticação/core)
- `client/src/pages/` (outras páginas)
- `Dockerfile` / `railway.toml` (infra)

---

## Referências

- Análise de impacto: `Analise_Impacto_Melhorias_UX.md`
- Spec Madalena Consultora: `Spec_Madalena_Consultora_UI.md`
