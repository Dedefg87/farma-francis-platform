# Documento do Sistema — Automação e Fluxos

Documento que descreve como o sistema de automação/fluxos (página `/automation`)
funciona no Farma Francis: client, backend, banco de dados e integrações.

---

## 1. Visão geral

A página `/automation` é gerenciada por um editor visual (estilo N8N) que cria
fluxos reutilizáveis. Um fluxo é um registro em `visual_flows` com `name`,
`description`, `templateType`, `flowData` (JSON com `nodes`/`edges`), `isActive`
e `tags`.

---

## 2. Abas do painel `/automation`

| Aba | Componente client | Função |
|-----|------------------|--------|
| Dashboard | `Automation/DashboardCards` + lista de fluxos | Estatísticas de execução, lista de fluxos cadastrados |
| Editor Visual | `Automation/N8NEditor` | Editor visual de fluxos (ReactFlow) |
| Templates | `Automation/TemplatesSection` | Lista de templates prontos (`templates.ts`) |
| Configurações | `Automation/ConfigSettings` + `APIIntegrationTab` | Horário de funcionamento, feriados, integrações (API/Webhook) |
| Documentação | `Automation/DocumentationSection` | Documentação desta página |

Botões do cabeçalho: **Criar Fluxo** (`automation.create`), **Publicar**
(ativa todos os inativos via `automation.update`), **Exportar** (client-side),
**Importar** (fluxo novo), **Limpar Todos/Obsoletos** (`automation.cleanup`).

---

## 3. Backend (tRPC) — procedures em `server/routers-automation.ts`

Todas as procedures (`create`, `list`, `get`, `update`, `delete`, `testById`,
`execute`, `testFlow`, `stats`, `executions`, `executeFlowById`, `cleanup`)
exisuem e são implementadas (verificação feita via cliente + server).

A paleta de nós (`client/src/pages/Automation/node-types.ts`) apoia categorias
como triggers, logic, messages, ai, actions, wait, integrations, pharmacy, etc.

---

## 4. Editor Visual (`N8NEditor`)

- Funciona: arrastar nós, conectar, configurar nós (via `NodeConfigPanel`),
  duplicar, excluir, desfazer/refazer, drag para mover.
- **Salvar** (botão Save) → `automation.update` (fluxo existente) ou
  `automation.create` (fluxo novo/template) — persiste no banco.
- **Importar/Exportar** — JSON local (`handleImport`/`handleExport`).
- **Simular** (botão no canvas) abre o `SimulationModal` (validação de campos,
  conexões, estrutura e execução mockada por etapas).

---

## 5. Dashboard — o que está funcional

- `automation.list` e `automation.stats` (tabela `flowExecutions`).
- Status da Automação (Ativa/Inativa) e badge Online/Offline.
- Cartões: Execuções Hoje, Tempo Médio de Resposta, Conversões.
- **Canais Conectados** — agora usa `apiConfig.get` (status real via configs).

## 6. Diferenças client/server a corrigir (histórico)

- `DashboardCards`: `stats.data.totalExecutions` etc. (servidor retorna
  `successResponse` — wrapper `data`), campo `avgDuration`.

## 7. Integrações (`automation.businessHours` + `apiConfig`)

- `businessHours`: getAll, update, checkNow, getHolidays, upsertHoliday,
  deleteHoliday.
- `apiConfig` (admin): get, save, test, delete, generateQrCode, disconnectInstance.

---

## 8. Observações / arquivos que parecem mortos

- `Automation/components/AutomationStats.tsx`, `AutomationAnalytics.tsx`,
  `AutomationEmptyState.tsx`, `AutomationHeader.tsx` — não importados
  (comparecem como código não utilizado).
- `Automation/templates-modern.ts` — não importado (`templates.ts` é o usado).

---

## 9. Como testar/manter

```bash
npm run build   # client + server
npm test        # suite de testes (pre-existing failures não relacionadas)
```

Verificar no Railway:
1. `/automation` → Dashboard mostra Execuções Hoje ≠ 0 quando houver execuções.
2. Editor → Save → aparece na lista de fluxos.
3. Configurações → integrações mostram "Conectado/Desconectado" real.
