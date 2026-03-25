# [TECH DEBT] Revisar e sincronizar mapeamentos Drizzle x MySQL das tabelas broadcast_*

**Status:** Backlog
**Prioridade:** Média
**Labels:** tech-debt, database, broadcast, drizzle
**Assignee:** Engenheiro Sênior (DB/ORM)

---

## Contexto

Durante a correção do sistema de broadcast (Fase 3, commits 2330452 → 5b32709), identificamos que a tabela `broadcast_messages` possuía estrutura real diferente do que o código Drizzle esperava, causando a necessidade de um hotfix com raw SQL.

O schema Drizzle foi corrigido para alinhar os defaults:
- `successfulSends` / `failedSends`: default string `"0"` → número `0`
- `status`: default `"pending"` → `"sending"`
- `sentAt`: nullable → `notNull()`

No entanto, verificou-se que a coluna `sentAt` (sent_at DATETIME NOT NULL) existe no MySQL mas não estava definida no schema Drizzle.

## Objetivo

Revisar **TODAS** as tabelas `broadcast_*` para garantir que o schema Drizzle (`drizzle/schema.ts`) esteja 100% alinhado com a estrutura MySQL real, evitando futuros erros de INSERT/UPDATE e permitindo uso 100% Drizzle (sem raw SQL).

## Tabelas a Revisar

1. `broadcastMessages` → tabela `broadcast_messages`
2. `broadcastMembersSent` → tabela `broadcast_members_sent`
3. `broadcastLists` → tabela `broadcast_lists`
4. `broadcastListMembers` → tabela `broadcast_list_members`

## Tarefas Detalhadas

### 1. Extrair estrutura real do MySQL
Para cada tabela, executar no Railway (ou ambiente correspondente):
```sql
SHOW CREATE TABLE <nome_da_tabela>;
```
Copiar o DDL completo.

### 2. Comparar com schema Drizzle
Comparar o DDL real com a definição em `drizzle/schema.ts`. Identificar:
- Colunas ausentes no schema Drizzle
- Colunas no schema que não existem no banco
- Tipos de dados incompatíveis (ex: INT vs VARCHAR, NULL vs NOT NULL)
- Defaults incorretos (ex: string `"0"` vs número `0`, `"pending"` vs `"sending"`)
- Constraints faltando (PRIMARY KEY, FOREIGN KEY, UNIQUE, INDEX)
- Ordem das colunas (não afeta funcionalidade mas é bom manter)

### 3. Ajustar schema Drizzle
Corrigir as discrepâncias no arquivo `drizzle/schema.ts`.

### 4. Gerar migration
```bash
npx drizzle-kit generate
```
Verificar se a migration gerada contém apenas ALTERs necessários.

### 5. Testar em desenvolvimento
- Executar `npm run build`
- Rodar `npm run dev` com banco local (ou Docker)
- Testar operações CRUD nas tabelas broadcast_* via API
- Verificar logs para erros de tipo ou constraint

### 6. Aplicar em produção (se houver alterações)
- Commit + push
- Railway auto-deploy
- Validar health endpoint
- Testar broadcast no frontend

## Critério de Aceitação

- ✅ Todas as 4 tabelas validadas contra MySQL real (DDL anexado)
- ✅ Schema Drizzle reflete exatamente a estrutura do banco (nomes, tipos, defaults, constraints)
- ✅ Migration gerada (se houver mudanças) e aplicada
- ✅ Testes de CRUD (create, read, update, delete) passando em dev
- ✅ Código usa apenas Drizzle (zero raw SQL para broadcast)

## Estimativa

- Investigação (SHOW CREATE + comparação): 1 hora
- Correções no schema + geração de migration: 1-2 horas
- Testes locais e validação: 30 minutos

Total: ~2.5-3.5 horas

## Riscos

- Baixo: Tabelas já funcionam, mudanças são apenas de alinhamento
- Médio: Migration pode exigir downtime se alterar colunas existentes (mas são apenas defaults e constraints, geralmente seguros)

## Observações

Esta revisão deve ser estendida a todas as tabelas principais do sistema (conversation_messages, received_messages, customers, users) como parte de hygiene técnica contínua.

---

**Criado em:** 2026-03-25 (Fase 3 pós-hotfix)
**Relacionado:** Commit 5b32709, Estrutura broadcast_messages verificada
