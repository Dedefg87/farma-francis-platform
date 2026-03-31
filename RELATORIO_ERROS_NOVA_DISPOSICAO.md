# 📋 RELATÓRIO DE ERROS - Nova Disposição de Arquivos
**Data:** 30/03/2026
**Status:** Build falha, múltiplos erros de tipagem e estrutura

---

## 🚨 RESUMO EXECUTIVO

**Total de erros TypeScript:** ~400+ erros
**Estado do build:** ❌ NÃO COMPILA
**Status da aplicação:** Sistema em estado instável após reorganização

### 🔴 Problemas Críticos (Impedem execução)
1. **Schema Drizzle MySQL** - Tipos incompatíveis com MySQL driver
2. **Importações quebradas** - Módulos não encontrados (.js extensions)
3. **tRPC Routers des sincronizados** - Frontend chama procedures que não existem
4. **Estrutura de módulos CommonJS vs ESM** - Mistura de .js/.ts em imports

---

## 📁 ESTRUTURA ATUAL DE PASTAS (após reorganização)

```
farmafrancis-platform/
├── server/
│   ├── _core/              # Core do servidor (index.ts, trpc.ts, context.ts)
│   ├── routers/            # ALL routers tRPC em raiz
│   │   ├── routers.ts      # Router principal (appRouter)
│   │   ├── routers-broadcast.ts
│   │   ├── routers-conversations.ts
│   │   ├── routers-messages.ts
│   │   ├── routers-dashboard.ts
│   │   ├── routers-automation.ts
│   │   └── ... (20+ routers)
│   ├── database/
│   │   ├── schema.mysql.ts # Schema MySQL Drizzle
│   │   ├── schema.ts       # Schema PostgreSQL (inativo)
│   │   └── migrations/
│   ├── admin/              # Rotas administrativas
│   ├── services/           # Broadcast queue, cacheevolution, etc
│   ├── queue/              # mobile-sync.ts
│   ├── workers/            # broadcast-sender.ts
│   ├── utils/              # normalize.ts, phone.ts
│   └── scripts/            # apply-migrations.js
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── lib/
│       └── hooks/
└── drizzle/
    ├── schema.ts           # ← APONTA PARA ./server/database/schema.mysql.ts
    └── migrations/         # Migrations Drizzle
```

---

## 🔍 CATEGORIAS DE ERROS

### 1️⃣ ERROS DE SCHEMA DRIZZLE (CRÍTICO)

#### a) Módulos Drizzle não encontrados
```
drizzle/schema.mysql.ts(2,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'autoIncrement'.
drizzle/schema.mysql.ts(3,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'bigint'.
drizzle/schema.mysql.ts(4,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'boolean'.
drizzle/schema.mysql.ts(5,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'date'.
drizzle/schema.mysql.ts(6,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'decimal'.
drizzle/schema.mysql.ts(7,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'int'.
drizzle/schema.mysql.ts(8,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'json'.
drizzle/schema.mysql.ts(9,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'primaryKey'.
drizzle/schema.mysql.ts(10,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'text'.
drizzle/schema.mysql.ts(11,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'timestamp'.
drizzle/schema.mysql.ts(12,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'varchar'.
drizzle/schema.mysql.ts(13,3): error TS2305: Module '"drizzle-orm/mysql2"' has no exported member 'mysqlTable'.
```

**Causa:** O package `drizzle-orm/mysql2` não exporta esses tipos diretamente. Deve-se usar:
```typescript
import { mysqlTable, int, varchar, text, json, boolean, timestamp, primaryKey } from 'drizzle-orm/mysql2';
```

**Solução:** Corrigir imports em `server/database/schema.mysql.ts`.

#### b) Uso de `datetime` e `sql` não definidos
```
drizzle/schema.mysql.ts(227,11): error TS2304: Cannot find name 'datetime'.
drizzle/schema.mysql.ts(229,14): error TS2304: Cannot find name 'sql'.
```

**Causa:** Esquecimento de imports de helpers Drizzle.

---

### 2️⃣ ERROS DE IMPORTAÇÃO/EXPORTAÇÃO (CRÍTICO)

#### a) Extensões .js vs .ts em imports relativos
```
server/_core/index.ts(28,40): error TS2307: Cannot find module '../routes/baby-shower-public.js'
server/_core/index.ts(62,29): error TS2307: Cannot find module '../routes/test.ts'
server/_core/routes/admin.ts(2,23): error TS2307: Cannot find module '../db'
server/_core/routes/baby-shower-public.ts(2,23): error TS2307: Cannot find module '../db.js'
```

**Causa:** TypeScript não resolve extensões automaticamente. Ou adicionar extensões nos imports ou configurar `moduleResolution: "node16"` no tsconfig.

#### b) Módulos mínimos não exportam o esperado
```
server/_core/redis-namespaces.ts(62,28): error TS2304: Cannot find name 'redisClient'.
```

**Causa:** Variável `redisClient` não está definida/exportada no módulo.

---

### 3️⃣ ERROS DE ROTES TRPC (CRÍTICO)

Frontend chama procedures que não existem no router:

```
BroadcastListManager.tsx:
  Property 'getById' does not exist on type '...'
  Property 'listMembers' does not exist on type '...'
  Property 'searchCustomers' does not exist on type '...'
  Property 'deleteMany' does not exist on type '...'
  Property 'create' does not exist on type '...'
  Property 'addMember' does not exist on type '...'
  Property 'removeMember' does not exist on type '...'
  Property 'delete' does not exist on type '...'
  Property 'sendMessage' does not exist on type '...'
```

**Causa:** O router `broadcastRouter` em `server/routers-broadcast.ts` pode não estar registrado corretamente em `appRouter` ou os nomes das procedures estão diferentes.

**Verificar:**
- `server/routers-broadcast.ts` deve exportar `broadcastRouter`
- `server/routers.ts` deve fazer `broadcast: broadcastRouter`
- Frontend usa `api.broadcast.{procedure}` (com 'broadcast' minúsculo?)

---

### 4️⃣ ERROS DE TIPAGEM "IMPLICITLY ANY" (AVANÇADOS)

**Exemplos (muitos):**
```
AgentMessages.tsx(571,61): error TS7006: Parameter 'c' implicitly has an 'any' type.
AgentMessages.tsx(578,8): error TS7006: Parameter 'sum' implicitly has an 'any' type.
BroadcastListManager.tsx(85,17): error TS7006: Parameter 'data' implicitly has an 'any' type.
CRM.tsx(183,5): error TS7006: Parameter 'c' implicitly has an 'any' type.
...
```

**Causa:** Funções de callback sem tipo explícito. TypeScript não consegue inferir.

**Solução:** Adicionar tipos explícitos ou garantir que arrays/variáveis tenham tipos definidos.

---

### 5️⃣ ERROS DE PROPRIEDADE INEXISTENTE (CRÍTICO)

```
DashboardLayout.tsx: Property 'loading' does not exist on type '{ user: ...; isLoading: boolean; ... }'
AgentSettingsPanel.tsx: Property 'aiAgents' does not exist on type 'CreateTRPCReactBase<...>'. Did you mean 'agents'?
Automation/index.tsx: Property 'visualFlows' does not exist on type 'CreateTRPCReactBase<...>'.
QueueManagement.tsx: Property 'agent' does not exist... Did you meant 'agents'?
```

**Causa 1:** Frontend esperando propriedades que o Context/Provider não fornece.
**Causa 2:** Nomes de routers diferentes (ex: `aiAgents` vs `agents`).

**Verificar:**
- `AuthContext` deve fornecer `loading` ou `isLoading`consistentemente
- `useContext(TRPC)` deve ter todos os routers registrados

---

### 6️⃣ ERROS DE DUPLICATA DE IDENTIFICADOR (FRONTEND)

```
AgentMessages.tsx(17,3): error TS2300: Duplicate identifier 'Dialog'.
AgentMessages.tsx(18,3): error TS2300: Duplicate identifier 'DialogContent'.
Messages.tsx(12,10): error TS2300: Duplicate identifier 'trpc'.
```

**Causa:** Imports duplicados ou re-declaração de variáveis/componentes no mesmo escopo.

---

### 7️⃣ ERROS DE DRIVER MYSQL / DRIZZLE (CRÍTICO)

```typescript
server/_core/index.ts(443,37): error TS2339: Property 'getUserByOpenId' does not exist on type 'MySql2Database<...>'.
server/_core/index.ts(1777,22): error TS2339: Property 'raw' does not exist on type 'MySql2Database<...>'.
server/db-messages.ts(265,73): error TS2339: Property 'insertId' does not exist on type 'never'.
server/admin/broadcast-check-router.ts(11,29): error TS2339: Property 'raw' does not exist on type 'MySql2Database<...>'.
```

**Causa:** Métodos do driver mysql2 não são reconhecidos pelo tipo `MySql2Database` do Drizzle.

**Solução:** Usar o Drizzle API corretamente:
```typescript
// ERRADO:
db.raw('SELECT ...')

// CORRETO:
db.execute(sql`SELECT ...`)
```

---

### 8️⃣ ERROS DE INTERFACE/OBJETO (FRONTEND)

```typescript
AgentMessages.tsx(689,11): error TS2561: Object literal may only specify known properties, but 'fileUrl' does not exist in type '{ conversation_id: number; content: string; file_url?: string | undefined; ... }'. Did you mean to write 'file_url'?
NewConversationModal.tsx(46,36): error TS2339: Property 'customers' does not exist on type 'CreateTRPCReactBase<...>'.
```

**Causa:** Propriedades com nome diferente (camelCase vs snake_case). Schema tRPC espera `file_url` mas frontend envia `fileUrl`.

---

### 9️⃣ ERROS DE MÓDULO NÃO ENCONTRADO

```
client/src/components/AIChatBox.tsx(7,28): error TS2307: Cannot find module 'streamdown'
client/src/hooks/index.ts(3,55): error TS2724: '"./usePdfViewer"' has no exported member named 'UsePdfViewerReturn'.
server/_core/system.ts(30,37): error TS7016: Could not find a declaration file for module 'pg'.
```

**Causa:**
- `streamdown` não instalado
- Exportações nomeadas incorretas em hooks
- PostgreSQL module `pg` sem tipos

---

### 🔟 ERROS NULL/NOT NULL (SERVER)

```typescript
server/_core/context.ts(38,27): error TS2352: Conversion of type 'string | JwtPayload' to type '{ sub: number; email: string; role: string; }' may be a mistake.
server/_core/index.ts(443,34): error TS18047: 'db' is possibly 'null'.
server/middleware/rate-limit.ts(49,24): error TS18047: 'client' is possibly 'null'.
```

**Causa:** Valores podem ser `null` e TypeScript reclama. Usar non-null assertion (`!`) ou verificação explícita.

---

## 🗺️ ROTAS E ENDPOINTS ATUAIS

### Backend API (tRPC)
- `GET /api/trpc/auth.login`
- `GET /api/trpc/users.me`
- `GET /api/trpc/conversations.list`
- `GET /api/trpc/messages.list`
- `POST /api/trpc/broadcast.sendMessage`
- `GET /api/trpc/broadcast.list`
- `GET /api/trpc/dashboard.stats`
- `POST /api/trpc/admin.limpezaBruta`
- ... (ver `server/routers.ts` para lista completa)

### Rotas REST (em `server/_core/routes/`)
- `GET /api/health`
- `GET /api/system/status`
- `POST /api/webhooks/whatsapp`
- `POST /api/webhooks/instagram`
- `POST /api/broadcast/upload-temp-file`
- `GET /api/media/:messageId`

---

## 📊 SCHEMAS DE BANCO (DRIZZLE)

### Arquivos de schema
1. `server/database/schema.mysql.ts` - Schema MySQL (ativo)
2. `server/database/schema.ts` - Schema PostgreSQL (inativo)
3. `drizzle/schema.ts` - Aponta para `./server/database/schema.mysql.ts`

### Problemas identificados:
- **Schema.ts** (PostgreSQL) deve ser removido ou incompatibilidade está causando imports errados
- **Tabelas:** broadcast_messages, broadcast_lists, broadcast_members_sent, conversations, conversation_messages, received_messages, users, customers, etc.
- **Colunas:** Algumas vezes snake_case (`file_url`), outras camelCase (`fileUrl`) — inconsistência!

---

## 🎯 PRIORIDADES DE CORREÇÃO

### 🔴 Nível 1 - IMPEDE BUILD (Corrigir primeiro)
1. **Drizzle MySQL types** - Corrigir imports em `schema.mysql.ts`
2. **Module resolution** - Adicionar extensões .js ou ajustar tsconfig
3. **Broadcast router registration** - Garantir que procedures existem no appRouter
4. **Schema property names** - Alinhar snake_case/camelCase em todo código

### 🟡 Nível 2 - FUNCIONALIDADES QUEBRADAS
5. **Context/Provider** - Adicionar propriedades faltantes (`loading`, `aiAgents`, `visualFlows`, etc.)
6. **Worker broadcast** - Métodos `.raw()` do Drizzle
7. **Upload file** -Endpoint `/upload-temp-file` e tipos

### 🟢 Nível 3 - LIMPEZA DE CÓDIGO
8. **Remover parâmetros implicitly any** - Adicionar tipos explícitos
9. **Remover imports duplicados**
10. **Alinhar tipos de retorno de funções**

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] `drizzle/schema.mysql.ts` usa imports corretos do `drizzle-orm/mysql2`
- [ ] Todos os imports relativos usam extensões corretas (.js ou sem extensão)
- [ ] `server/routers.ts` exporta `broadcastRouter` com a assinatura esperada
- [ ] Frontend usa `api.broadcast.{procedure}` (verificar nomes exatos)
- [ ] `AuthContext` fornece `isLoading` e `user`tipados corretamente
- [ ] `useAuth` retorna `{ user, isLoading, login, logout }`
- [ ] Remover `schema.ts` (PostgreSQL) ou garantir que não é importado
- [ ] Adicionar tipos explícitos em callbacks com `any`
- [ ] Corrigir `fileUrl` vs `file_url` em objetos de mensagem
- [ ] Instalar módulo `streamdown` se necessário
- [ ] Corrigir `db.execute()` vs `db.raw()` em todos os arquivos

---

## 🔧 COMANDOS ÚTEIS PARA DEBUG

```bash
# Ver estrutura de pastas
tree server -L 2

# Ver routers registrados
grep -r "broadcastRouter" server/

# Ver schema de tabelas
cat server/database/schema.mysql.ts | grep -A 5 "export const broadcast"

# Ver imports quebrados
npx tsc --noEmit 2>&1 | grep "Cannot find module"

# Contar erros
npx tsc --noEmit 2>&1 | wc -l
```

---

## 📌 NOTAS IMPORTANTES

1. **Build anterior funcionava** → A reorganização quebrou imports e tipos
2. **PostgreSQL vs MySQL** — Há mistura de schemas. O sistema deve usar apenas MySQL
3. **tRPC** - Frontend e backend devem estar perfeitamente alinhados (mesmos nomes de procedures)
4. **Drizzle v0.x** - A API mudou de `.raw()` para `.execute()`, e `.returning()` foi substituído por `$returningId`

---

**Recomendação:** Reverter para o commit anterior estável (`git log` para encontrar) e fazer alterações incrementais, testando após cada mudança.
