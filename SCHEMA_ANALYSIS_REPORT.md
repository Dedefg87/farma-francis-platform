# Relatório de Análise do Schema do Banco de Dados

**Data:** 2026-04-07  
**Projeto:** farma-francis-platform  
**Motor:** Drizzle ORM com MySQL (drizzle-orm/mysql2)

---

## 1. Visão Geral dos Schemas Encontrados

### Arquivos de schema identificados:

| Arquivo | Localização | Tipo de ORM | Status |
|---------|-------------|-------------|--------|
| `drizzle/schema.ts` | Principal | `mysqlTable` | ✅ Ativo (referenciado no drizzle.config.ts) |
| `drizzle/schema_executions.ts` | Execuções de fluxos | `mysqlTable` | ✅ Ativo (importado por schema.ts) |
| `drizzle/schema_logs.ts` | Logs de execução | `pgTable` | ❌ Ativo mas incorreto (PostgreSQL) |
| `drizzle/schema.mysql.ts` | Schema MySQL alternativo | `mysqlTable` | ⚠️ Inativo (não importado) |
| `server/database/schema.ts` | Schema PostgreSQL | `pgTable` | ⚠️ Inativo (não importado) |
| `server/database/schema.mysql.ts` | Schema MySQL alternativo | `mysqlTable` | ⚠️ Inativo (não importado) |
| `server/database/schema_executions.ts` | Execuções (alternativo) | `mysqlTable` | ⚠️ Inativo (não importado) |

---

## 2. Lista de Tabelas Encontradas

### 2.1 Tabelas em `drizzle/schema.ts` (MySQL - Ativo)

**Core:**
- users
- customers
- receivedMessages
- conversations
- conversationMessages
- agentStatus
- agentPauses
- queues
- queueAgents
- broadcastLists
- broadcastListMembers
- broadcastMessages
- broadcastMembersSent
- integrationSettings

**CRM:**
- leads
- tickets
- ticketComments
- ticketTags
- tags
- customerTags
- crmTasks
- crmActivities
- crmAuditLogs
- crmOutboxEvents
- crmScripts
- customFieldDefinitions
- customFieldValues
- customerTreatments

**Vendas:**
- accounts
- accountContacts
- dealPipelines
- dealStages
- deals

**Comércio:**
- pharmaProducts
- pharmaPurchases
- pharmaPurchaseItems

**Baby Shower:**
- babyShowerEvents
- babyShowerProducts
- babyShowerPurchases
- babyShowerGiftPackages
- babyShowerWithdrawals

**Automação:**
- automationFlows
- visualFlows
- workflowExecutions
- workflowCredentials
- workflowSchedules
- workflowWebhooks
- executionData
- flowExecutions (via schema_executions.ts)

**Outros:**
- quickReplies
- messages
- surveyResponses
- employees
- frontendTelemetryEvents
- apiConfigurations
- uraMenus
- interactions
- internalMessages
- notifications
- queueSettings
- processedWebhookMessages
- attachments
- auditLogs
- aiChats

### 2.2 Tabelas em `drizzle/schema_executions.ts` (MySQL - Ativo)

- flowExecutions

### 2.3 Tabelas em `drizzle/schema_logs.ts` (PostgreSQL - Ativo Remoto)

- flowExecutionLogs ❌ (usa pgTable, mas DB é MySQL)

---

## 3. Conformidade com MySQL

### ✅ Arquivos que usam `mysqlTable` corretamente:
- `drizzle/schema.ts`
- `drizzle/schema_executions.ts`
- `drizzle/schema.mysql.ts` (inativo)
- `server/database/schema.mysql.ts` (inativo)

### ❌ Arquivos que usam `pgTable` erroneamente:
- `drizzle/schema_logs.ts` **(CRÍTICO)** - Está sendo importado por:
  - `server/routers-logs.ts`
  - `server/routers/logs/index.ts`
  
  Isso causará erros de compatibilidade pois o Drizzle tentará usar tipos PostgreSQL em um banco MySQL.

---

## 4. Análise da Tabela `queues`

### 4.1 Definição no schema ativo (`drizzle/schema.ts`):

```typescript
export const queues = mysqlTable("queues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 16 }).notNull(),
  priority: int("priority").default(0).notNull(),
  status: varchar("status", { length: 16 }).default("active").notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

**Colunas presentes:** ✅ Todas as 10 colunas requisitadas:
1. `id` ✅
2. `name` ✅
3. `description` ✅
4. `channel` ✅
5. `priority` ✅
6. `status` ✅
7. `color` ✅ (padrão="#3b82f6")
8. `created_by` (via `createdBy`) ✅
9. `created_at` ✅
10. `updated_at` ✅

### 4.2 Migração SQL (`drizzle/migrations/0000_living_dorian_gray.sql`):

```sql
CREATE TABLE `queues` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `channel` varchar(16) NOT NULL,
  `priority` int NOT NULL DEFAULT 0,
  `status` varchar(16) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `queues_id` PRIMARY KEY(`id`)
);
```

**Divergências:**
- ❌ Falta coluna `color` (VARCHAR(7))
- ❌ Falta coluna `created_by` (INT, FK para users)

**Conclusão:** A migração está **desatualizada** em relação ao schema atual.

---

## 5. Verificação de Imports Conflitantes

### 5.1 Configuração principal do Drizzle

`drizzle/config.ts`:
```typescript
schema: "./drizzle/schema.ts",
dialect: "mysql",
```

✅ Configurado corretamente para MySQL.

### 5.2 Conexão com o banco (`server/db.ts`)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';  // ⚠️ Nome enganoso!
import { Pool } from 'pg';                           // ❌ PostgreSQL client
import * as schema from './drizzle/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

⚠️ **INCONSISTÊNCIA GRAVE:**
- Usa `pg` (PostgreSQL client) mas importa schema MySQL (`mysqlTable`)
- Isso causará erro de compatibilidade em tempo de execução!
- Deve usar `drizzle-orm/mysql2` e `mysql2/promise` conforme `server/db.ts` mais recente (lido anteriormente mostrava mysql2).

Nota: O arquivo `server/db.ts` que lemos anteriormente (comcreatePool mysql2) parece ser uma versão corrigida. Verificar se há múltiplas definições de `getDb()`.

### 5.3 Imports de routers

**Uso correto (MySQL):**
- Rotas importam de `../drizzle/schema` ✅

**Uso incorreto (PostgreSQL):**
- `server/routers-logs.ts` e `server/routers/logs/index.ts` importam `flowExecutionLogs` de `../drizzle/schema_logs` ❌

Nenhum arquivo importa `server/database/schema.*` diretamente, então esses arquivos duplicados estão ociosos, mas podem causar confusão.

---

## 6. Alinhamento entre Migrações e Schema

### 6.1 Problemas identificados:

| Tabela | Schema | Migração | Status |
|--------|--------|----------|--------|
| queues | ✅ 10 colunas (com color, created_by) | ❌ 8 colunas (sem color, created_by) | **Desalinhada** |
| flow_execution_logs | ❌ Não existe em schema MySQL | ❌ Não existe | **Ausente** |
| flow_execution_logs | ✅ pgTable em schema_logs.ts | ❌ incompatível | **Tipo errado** |

### 6.2 Tabelas adicionais no schema não migradas:

Muitas tabelas de analytics, workflows, credenciais, etc., podem não ter migrações associadas. A migração principal `0000_living_dorian_gray.sql` contém a maioria das tabelas core, mas pode faltar:
- `flow_execution_logs` (necessária pelos logs)
- `workflowCredentials`, `workflowSchedules`, `workflowWebhooks`, `queueSettings`, `notifications`, `interactions`, `internalMessages`, `attachments`, `auditLogs`, `aiChats` (podem ser adicionadas posteriormente)

---

## 7. Problemas Críticos Identificados

### 🔴 **P1 - ORM Misturado: schema_logs.ts usa pgTable**

**Impacto:** Erro de runtime ao executar queries com Drizzle + MySQL.  
**Causa:** Tabela `flowExecutionLogs` definida com `pgTable` PostgreSQL mas o banco é MySQL.  
**Solução:** Converter `flowExecutionLogs` para `mysqlTable` e ajustar tipos (serial → int, integer → int, etc).

### 🔴 **P2 - Conexão PostgreSQL no server/db.ts**

**Impacto:** Se o arquivo ativo for o que usa `pg` (PostgreSQL client), não funcionará com MySQL.  
**Causa:** Confusão entre duas versões de `server/db.ts`.  
**Solução:** Garantir que a versão correta (mysql2) é a única usada.

### 🟡 **P3 - Migração da tabela queues desatualizada**

**Impacto:** Colunas `color` e `created_by` ausentes no banco → erros de coluna inexistente.  
**Causa:** Schema alterado sem criar nova migração.  
**Solução:** Criar migração para adicionar as colunas faltantes.

### 🟡 **P4 - Arquivos de schema duplicados/inativos**

**Impacto:** Confusão manutenção,风险 de editar arquivos errados.  
**Causa:** Desenvolvimento paralelo sem limpeza.  
**Solução:** Remover ou documentar claramente os arquivos não usados (`server/database/*`, `drizzle/schema.mysql.ts`).

---

## 8. Sugestões de Correção

### ✅ **Correção Imediata (P1 & P2)**

1. **Converter `drizzle/schema_logs.ts` para MySQL:**

```typescript
// Antes (PostgreSQL)
import { serial, integer, ... pgTable } from "drizzle-orm/pg-core";

export const flowExecutionLogs = pgTable("flow_execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull(),
  // ...
});

// Depois (MySQL)
import { int, varchar, text, timestamp, mysqlTable } from "drizzle-orm/mysql-core";

export const flowExecutionLogs = mysqlTable("flow_execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("execution_id").notNull(),
  nodeId: varchar("node_id", { length: 255 }),
  nodeName: varchar("node_name", { length: 255 }),
  nodeType: varchar("node_type", { length: 100 }),
  status: varchar("status", { length: 16 }),
  input: text("input"),
  output: text("output"),
  error: text("error"),
  duration: int("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

2. **Garantir que `server/db.ts` usa `mysql2`** e remover qualquer import de `pg`.

### ✅ **Correção de Migração (P3)**

Criar novo arquivo de migração:

`drizzle/migrations/0024_add_queues_columns.sql`

```sql
ALTER TABLE `queues`
  ADD COLUMN `color` VARCHAR(7) DEFAULT '#3b82f6' NOT NULL,
  ADD COLUMN `created_by` INT,
  ADD CONSTRAINT `queues_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`);
```

### ✅ **Limpeza de Arquivos (P4)**

- [ ] Avaliar se `drizzle/schema.mysql.ts` ainda é necessário. Caso contrário, deletar.
- [ ] Deletar `server/database/schema.ts` e `schema.mysql.ts` (não são usados).
- [ ] Manter apenas `drizzle/schema.ts` + arquivos auxiliares (`schema_executions.ts`, `schema_logs.ts` convertido).

### ✅ **Validação Completa**

- [ ] Executar `drizzle-kit generate` para verificar se o schema gera sem erros.
- [ ] Aplicar migrações faltantes no banco de desenvolvimento.
- [ ] Rodar testes de integração para endpoints que usam `queues` e `flowExecutionLogs`.

---

## 9. Recomendações de Longo Prazo

1. **Consolidar todos os exports em um único arquivo de entrada** definido no `drizzle.config.ts`.
2. **Manter apenas um dialect** em todo o projeto (MySQL).
3. **Nunca misturar pgTable e mysqlTable** no mesmo projeto.
4. **Sempre criar migração** ao alterar tabelas no schema.
5. **Usar nomes de colunas snake_case** consistentes (o Drizzle converte camelCase para snake_case automaticamente ao gerar SQL, mas é bom manter consistência).
6. **Documentar a arquitetura do schema** em um README na pasta `drizzle/`.

---

## 10. Resumo Executivo

| Item | Status | Ação |
|------|--------|------|
| Todas as tabelas usam mysqlTable? | ❌ **Não** | 1 tabela usa pgTable |
| Múltiplos schemas inconsistentes? | ✅ **Sim** | 6 arquivos, muitos inativos |
| Tabela `queues` correta? | ⚠️ **Schema sim, migração não** | Migração desatualizada |
| Imports conflitantes? | ⚠️ **Sim** | schema_logs.ts com pgTable |
| Migrações alinhadas? | ❌ **Não** | Faltam colunas e tabelas |

**Prioridade de correção:**
1. Converter `flowExecutionLogs` para `mysqlTable` (crítico)
2. Corrigir `server/db.ts` para usar `mysql2` (crítico)
3. Criar migração para `queues` (alto)
4. Limpar arquivos de schema duplicados (médio)

---

**Fim do relatório.**
