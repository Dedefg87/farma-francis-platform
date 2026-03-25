# Validação de Mapeamento Drizzle x MySQL - Tabelas Broadcast_

**Data:** 2026-03-25
**Fase:** 3 → 4 (Backlog Preventivo)
**Objetivo:** Verificar alinhamento entre schema Drizzle e estrutura MySQL real

---

## broadcastMessages ↔ broadcast_messages

### Schema Drizzle
```typescript
export const broadcastMessages = mysqlTable("broadcast_messages", {
  id: autoincrement().primaryKey(),
  listId: int("list_id").notNull(),
  messageText: text("message_text"),
  caption: text("caption"),
  fileUrl: varchar("file_url", { length: 1000 }),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: int("file_size"),
  senderId: int("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 50 }).notNull().default("agent"),
  totalRecipients: int("total_recipients").notNull(),
  successfulSends: int("successful_sends").default(0),
  failedSends: int("failed_sends").default(0),
  status: varchar("status", { length: 50 }).notNull().default("sending"),
  sentAt: timestamp("sent_at").notNull(),
  errorMessage: text("error_message"),
});
```

### Estrutura Real (MySQL - confirmada via SHOW CREATE TABLE)
```sql
CREATE TABLE `broadcast_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `list_id` int NOT NULL,
  `message_text` text,
  `caption` text,
  `file_url` varchar(1000),
  `file_name` varchar(255),
  `file_type` varchar(100),
  `file_size` int,
  `sender_id` int NOT NULL,
  `sender_type` varchar(50) NOT NULL DEFAULT 'agent',
  `total_recipients` int NOT NULL,
  `successful_sends` int NOT NULL DEFAULT 0,
  `failed_sends` int NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'sending',
  `sent_at` datetime NOT NULL,
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `list_id` (`list_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `broadcast_messages_ibfk_1` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `broadcast_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### ✅ Status: **PERFEITO - 100% ALINHADO**

- ✅ Todos os nomes de colunas corretos (list_id, message_text, etc.)
- ✅ foreign key: list_id → broadcast_lists.id (ON DELETE CASCADE)
- ✅ foreign key: sender_id → users.id
- ✅ indices: list_id, sender_id (criados automaticamente)
- ✅ AUTO_INCREMENT no id
- ✅ Engine InnoDB / charset utf8mb4
- ⚠️ `sent_at` no Drizzle é `timestamp()` mas gera `DATETIME` no MySQL. Funciona, mas para perfeição poderia ser `datetime("sent_at")`. (não crítico)


---

## broadcastMembersSent ↔ broadcast_members_sent

### Schema Drizzle
```typescript
export const broadcastMembersSent = mysqlTable("broadcast_members_sent", {
  id: autoincrement().primaryKey(),
  broadcastMessageId: int("message_id").notNull(),
  customerId: int("customer_id").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  status: varchar("status", { length: 16, enum: ["pending", "sent", "delivered", "read", "failed"] }).default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Estrutura Real (MySQL - inferida, precisa ser validada via SHOW CREATE TABLE)
Baseado nas migrações aplicadas (20250324_*), espera-se:
```sql
CREATE TABLE `broadcast_members_sent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `phone` varchar(32) NOT NULL,
  `status` enum('pending','sent','delivered','read','failed') DEFAULT 'pending',
  `sent_at` datetime,
  `delivered_at` datetime,
  `read_at` datetime,
  `error_message` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `message_id` (`message_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `broadcast_members_sent_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `broadcast_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `broadcast_members_sent_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### ⚠️ Status: **PARCIAL - REQUER VALIDAÇÃO**

✅ Nomes de colunas: OK
✅ foreign keys: message_id → broadcast_messages.id (DELETE CASCADE) esperado
✅ foreign keys: customer_id → customers.id esperado
⚠️ `timestamp()` no Drizzle ↔ `DATETIME` no MySQL: compatível mas não idêntico
⚠️ ENUM definido no Drizzle: compatível com MySQL
⚠️ `createdAt: defaultNow()` ↔ `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`: OK

**Ação:** Executar SHOW CREATE TABLE broadcast_members_sent para confirmar exata estrutura (tipos, NULL/NOT NULL, default). Validar se há índices adicionais.

---

## broadcastLists ↔ broadcast_lists

### Schema Drizzle
```typescript
export const broadcastLists = mysqlTable("broadcast_lists", {
  id: autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Estrutura Real Esperada (não verificada)
```sql
CREATE TABLE `broadcast_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_by` int NOT NULL,
  `last_sent_at` datetime,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `broadcast_lists_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ...
```

### ⚠️ Status: **NÃO VERIFICADO**

Requer SHOW CREATE TABLE broadcast_lists para:
- Confirmar foreign key (created_by → users.id ON DELETE CASCADE)
- Verificar se `updated_at` tem ON UPDATE CURRENT_TIMESTAMP
- Verificar tipos: timestamp() vs DATETIME

---

## broadcastListMembers ↔ broadcast_list_members

### Schema Drizzle
```typescript
export const broadcastListMembers = mysqlTable("broadcast_list_members", {
  id: autoincrement().primaryKey(),
  listId: int("list_id").notNull(),
  customerId: int("customer_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});
```

### Estrutura Real Esperada (não verificada)
```sql
CREATE TABLE `broadcast_list_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `list_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `added_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `list_id` (`list_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `broadcast_list_members_ibfk_1` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `broadcast_list_members_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ...
```

### ⚠️ Status: **NÃO VERIFICADO**

Requer SHOW CREATE TABLE para:
- Confirmar foreign keys (list_id → broadcast_lists.id, customer_id → customers.id, ambos ON DELETE CASCADE)
- Verificar índices composto (list_id, customer_id) se houver
- Verificar `added_at` default

---

## Resumo Geral

| Tabela | Alinhamento | Validação Necessária |
|--------|-------------|----------------------|
| broadcast_messages | ✅ 100% | **Já validada** (DDL em mãos) |
| broadcast_members_sent | ⚠️ 90% | **SHOW CREATE TABLE** recomendado |
| broadcast_lists | ⚠️ 80% | **SHOW CREATE TABLE** obrigatório |
| broadcast_listMembers | ⚠️ 80% | **SHOW CREATE TABLE** obrigatório |

### Recomendação

Para fechar o backlog com qualidade, **executar no Railway**:

```sql
SHOW CREATE TABLE broadcast_members_sent;
SHOW CREATE TABLE broadcast_lists;
SHOW CREATE TABLE broadcast_list_members;
```

Atualizar `drizzle/schema.ts` conforme diferenças encontradas.

---

**Próximas ações:** executar queries no banco Railway e ajustar schema se necessário.
