# 📊 RELATÓRIO DO SCHEMA DO SISTEMA - FARMA FRANCIS PLATFORM

**Data:** 25/03/2026
**Fonte:** `drizzle/schema.ts` (MySQL)
**Total de tabelas:** 41

---

## 🏗️ ESTRUTURA GERAL

### Core Messaging (5 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `received_messages` | Mensagens recebidas da Evolution API | ✅ OK |
| `conversation_messages` | Mensagens das conversas (agente ↔ cliente) | ✅ OK |
| `broadcast_messages` | Mensagens de transmissão (listas) | ✅ OK |
| `broadcast_members_sent` | Membros que receberam broadcast + status | ✅ OK |
| `crm_outbox_events` | Fila de eventos assíncronos | ✅ OK |

### Reference Tables (9 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `users` | Usuários do sistema (agentes, admins) | ✅ OK |
| `customers` | Clientes/contatos | ✅ OK |
| `conversations` | Conversas abertas | ✅ OK |
| `leads` | Leads/oportunidades | ✅ OK |
| `tickets` | Tickets de suporte | ✅ OK |
| `visual_flows` | Fluxos visuais | ✅ OK |
| `automation_flows` | Fluxos de automação | ✅ OK |
| `ura_menus` | Menus URA (IVR) | ✅ OK |
| `queues` | Filas de atendimento | ✅ OK |

### Operational Tables (23 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `agent_status` | Status online/offline dos agentes | ✅ OK |
| `agent_pauses` | Pausas de agentes | ✅ OK |
| `broadcast_lists` | Listas de transmissão | ✅ OK |
| `broadcast_list_members` | Membros das listas | ✅ OK |
| `api_configurations` | Configurações API (WhatsApp, Instagram, etc.) | ✅ OK |
| `integration_settings` | Configurações de integrações (Evolution, etc.) | ✅ OK |
| `baby_shower_events` | Eventos de chá de bebê | ✅ OK |
| `baby_shower_products` | Produtos do catálogo | ✅ OK |
| `baby_shower_purchases` | Compras/contribuições | ✅ OK |
| `baby_shower_gift_packages` | Pacotes de presente | ✅ OK |
| `baby_shower_withdrawals` | Resgates de produtos | ✅ OK |
| `crm_tasks` | Tarefas CRM | ✅ OK |
| `pharma_products` | Catálogo de produtos farmácia | ✅ OK |
| `pharma_purchases` | Compras farmácia | ✅ OK |
| `pharma_purchase_items` | Itens de compra | ✅ OK |
| `accounts` | Contas (empresas) | ✅ OK |
| `account_contacts` | Contatos vinculados a contas | ✅ OK |
| `deal_pipelines` | Pipelines de negócio | ✅ OK |
| `deal_stages` | Etapas do pipeline | ✅ OK |
| `deals` | Negócios/deals | ✅ OK |
| `tags` | Tags genéricas | ✅ OK |
| `customer_tags` | Vinculação tags ↔ clientes | ✅ OK |
| `crm_audit_logs` | Logs de auditoria | ✅ OK |

### Additional Feature Tables (4 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `crm_activities` | Atividades CRM | ✅ OK |
| `crm_scripts` | Scripts de atendimento | ✅ OK |
| `custom_field_definitions` | Definições campos customizados | ✅ OK |
| `custom_field_values` | Valores campos customizados | ✅ OK |

### Workflow & Telemetry (3 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `workflow_executions` | Execuções de fluxos | ✅ OK |
| `execution_data` | Dados de execução por nó | ✅ OK |
| `frontend_telemetry_events` | Eventos de telemetria frontend | ✅ OK |

### Surveys & Quick Replies (3 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `survey_responses` | Respostas de pesquisa NPS/CSAT | ✅ OK |
| `quick_replies` | Respostas rápidas pré-definidas | ✅ OK |
| `messages` | Mensagens genéricas (legado?) | ⚠️ Possibly legacy |

### Extension Tables (2 tabelas)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `queue_agents` | Agentes vinculados a filas | ✅ OK |
| `ticket_tags` | Tags de tickets | ✅ OK |
| `conversation_tags` | Tags de conversas | ✅ OK |

### Medical/Pharma Specific (1 tabela)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `customer_treatments` | Tratamentos/medicamentos cliente | ✅ OK |

### Webhook Deduplication (1 tabela)
| Tabela | Descrição | Status |
|--------|-----------|--------|
| `processed_webhook_messages` | Deduplicação de webhooks (external_id) | ✅ OK |

---

## 🔍 ANÁLISE DETALHADA POR GRUPO

### 1. BROADCAST (4 tabelas)
✅ **broadcast_messages**
```sql
id PK
list_id FK → broadcast_lists.id
message_text TEXT
caption TEXT
file_url VARCHAR(1000)
file_name VARCHAR(255)
file_type VARCHAR(100)
file_size INT
sender_id INT NOT NULL
sender_type VARCHAR(50) NOT NULL DEFAULT 'agent'
total_recipients INT NOT NULL
successful_sends INT DEFAULT 0
failed_sends INT DEFAULT 0
status VARCHAR(50) NOT NULL DEFAULT 'sending'
sent_at TIMESTAMP NOT NULL
error_message TEXT
created_at TIMESTAMP DEFAULT NOW()
```
**Observações:** Estrutura completa. `file_url` 1000 chars bom para URLs R2.

✅ **broadcast_members_sent**
```sql
id PK
broadcast_message_id FK → broadcast_messages.id (NOT NULL)
customer_id FK → customers.id (NOT NULL)
phone VARCHAR(32) NOT NULL
status ENUM('pending','sent','failed') DEFAULT 'pending'
sent_at TIMESTAMP
delivered_at TIMESTAMP
read_at TIMESTAMP
error_message TEXT
created_at TIMESTAMP DEFAULT NOW()
```
**Observações:** Chave composta sugerida: `(broadcast_message_id, customer_id)` única.

✅ **broadcast_lists**
```sql
id PK
name VARCHAR(255) NOT NULL
description TEXT
created_by INT NOT NULL
last_sent_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

✅ **broadcast_list_members**
```sql
id PK
list_id FK → broadcast_lists.id NOT NULL
customer_id FK → customers.id NOT NULL
added_at TIMESTAMP DEFAULT NOW()
```
**Observações:** Índice único sugerido: `(list_id, customer_id)`.

---

### 2. WHATSAPP/EVOLUTION (2 tabelas principais)
✅ **received_messages**
```sql
id PK
provider ENUM('whatsapp','instagram')
external_id VARCHAR(255) UNIQUEÍVEL
from_number VARCHAR(100)
from_name VARCHAR(255)
customer_id INT
ticket_id INT
automation_flow_id INT
message_type ENUM('text','image','audio','video','document','location','contact','sticker','reaction','unknown')
message_text TEXT
caption TEXT
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
timestamp BIGINT (número)
media_url TEXT
media_id VARCHAR(255)
mime_type VARCHAR(100)
file_name VARCHAR(255)
file_size INT
raw_payload JSON
processed INT DEFAULT 0
processed_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
```
**Observações:**
- `external_id` deve ter UNIQUE constraint (evita duplicatas)
- `timestamp` como BIGINT para ms de epoch
- `raw_payload` JSON guarda payload completo da Evolution

✅ **conversation_messages**
```sql
id PK
external_id VARCHAR(255) — deve ser único (idempotência)
remote_jid VARCHAR(255)
provider ENUM('whatsapp','instagram') DEFAULT 'whatsapp'
conversation_id INT NOT NULL
sender_id INT NOT NULL
sender_type ENUM('agent','customer')
content TEXT
read_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
file_url TEXT
file_name VARCHAR(255)
file_type VARCHAR(100)
file_size INT
```
**Observações:**
- `external_id` deve ter UNIQUE constraint (idempotência)
- Índice composto sugerido: `(conversation_id, created_at)`

---

### 3. CORE CRM (10 tabelas)
✅ **users** (IDs OpenID único)
✅ **customers** (phone unique)
✅ **conversations** (relacionamento com customers)
✅ **leads**
✅ **tickets**
✅ **accounts** + **account_contacts** (N-N)
✅ **deals** + **deal_pipelines** + **deal_stages**
✅ **tags** + **customer_tags** (N-N)

---

### 4. BABY SHOWER (6 tabelas) — evento específico
✅ **baby_shower_events**
✅ **baby_shower_products** (produtos catálogo)
✅ **baby_shower_purchases** (contribuições/compra)
✅ **baby_shower_gift_packages** (pacotes de produtos)
✅ **baby_shower_withdrawals** (resgates)
✅ **baby_shower_withdrawals** (? possibly typo, tem duas?)

---

### 5. AUTOMAÇÃO & FLUXOS (4 tabelas)
✅ **visual_flows** — fluxos visuais低-code
✅ **automation_flows** — automações baseadas em triggers
✅ **workflow_executions** — execuções de workflows
✅ **execution_data** — dados detalhados por nó

---

### 6.ATENDIMENTO & SUPORTE (6 tabelas)
✅ **queues** — filas de atendimento
✅ **queue_agents** — N-N filas ↔ agentes
✅ **agent_status** — status online/offline
✅ **agent_pauses** — pausas (almoco, banheiro, etc.)
✅ **tickets** — tickets de suporte
✅ **ticket_tags** — N-N tags ↔ tickets

---

### 7. PESQUISAS & TELEMETRIA (3 tabelas)
✅ **survey_responses** — NPS/CSAT
✅ **quick_replies** — respostas rápidas
✅ **frontend_telemetry_events** — eventos frontend (analytics)

---

## ⚠️ INDICES E CONSTRAINTS FALTANTES (SUGERIDOS)

### 1. UNIQUE Constraints
```sql
-- received_messages
ALTER TABLE received_messages ADD UNIQUE (provider, external_id);

-- conversation_messages
ALTER TABLE conversation_messages ADD UNIQUE (external_id);

-- broadcast_lists + members (composite unique)
ALTER TABLE broadcast_list_members ADD UNIQUE (list_id, customer_id);

-- broadcast_members_sent (composite unique para evitar duplicatas)
ALTER TABLE broadcast_members_sent ADD UNIQUE (broadcast_message_id, customer_id);
```

### 2.Índices de Performance
```sql
-- received_messages
CREATE INDEX idx_received_messages_created ON received_messages(created_at);
CREATE INDEX idx_received_messages_customer ON received_messages(customer_id);
CREATE INDEX idx_received_messages_provider_external ON received_messages(provider, external_id);

-- broadcast_messages
CREATE INDEX idx_broadcast_messages_status ON broadcast_messages(status);
CREATE INDEX idx_broadcast_messages_sent_at ON broadcast_messages(sent_at DESC);

-- broadcast_members_sent
CREATE INDEX idx_broadcast_members_sent_message ON broadcast_members_sent(broadcast_message_id);
CREATE INDEX idx_broadcast_members_sent_status ON broadcast_members_sent(status);

-- conversations
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_status_assigned ON conversations(status, assigned_to);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);

-- crm_outbox_events
CREATE INDEX idx_crm_outbox_events_status_created ON crm_outbox_events(status, created_at);
```

---

## 🔐 CAMPOS SENSÍVEIS E SEGURANÇA

| Tabela | Campo Sensível | Criptografia? | Comentário |
|--------|----------------|---------------|------------|
| `users` | `passwordHash` | ✅ Hash (bcrypt/argon2) | OK |
| `integration_settings` | `config` (JSON) | ⚠️ Pode conter tokens | OK (JSON) |
| `api_configurations` | `token`, `appSecret` | ⚠️ Texto plano | Considerar criptografia |
| `received_messages` | `raw_payload` | ⚠️ Pode conter mídia | OK (JSON) |

**Recomendação:** Para `api_configurations.token` e `appSecret`, considerar criptografia no banco ou usar vault externo.

---

## 🧩 CONSISTÊNCIA ENTRE SCHEMA E CÓDIGO

### Verificações realizadas:

| Ponto | Schema | Código | Status |
|-------|--------|--------|--------|
| `broadcast_members_sent.broadcast_message_id` | ✅ Aponta para `broadcast_messages.id` | ✅ Usado em `WHERE broadcastMessageId = ?` | OK |
| `broadcast_messages.sender_id` | ✅ INT | ✅ Referencia `users.id` | OK |
| `broadcast_messages.sender_type` | ✅ VARCHAR(50) | ✅ 'agent' ou 'system' | OK |
| `received_messages.customer_id` | ✅ INT FK | ✅ Usado em joins | OK |
| `conversation_messages.external_id` | ✅ VARCHAR(255) | ✅ Unique | ✅ (precisa constraint) |
| `processed_webhook_messages.id` | ✅ VARCHAR(64) PK | ✅ externalId da Evolution | OK |

---

## 🚀 MIGRAÇÕES PENDENTES (CHECKLIST)

Baseado no HEARTBEAT.md, há uma migration pendente:

**MIGRAÇÃO:** `20250324_migrate_broadcast_messages_definitive.sql`

**Objetivo:** Ajustar estrutura da tabela `broadcast_messages` para alinhar com schema atual.

**Prováveis alterações:**
- Renomear `sent_by` → `sender_id`
- Adicionar `caption`
- Adicionar `sender_type`
- Adicionar `error_message`

**Status:** ⚠️ **PENDENTE** ( conforme HEARTBEAT.md )

---

## 📈 RESUMO ESTATÍSTICO

- **Total de tabelas:** 41
- **Tabelas core (mensageria):** 5
- **Tabelas CRM:** ~15
- **Tabelas específicas (Baby Shower/Farmácia):** 7
- **Tabelas de suporte (tags, filas, agentes):** 8
- **Tabelas de workflow/telemetria:** 4
- **Unique constraints explícitas no schema:** 2 (users.openId, tags.name)
- **Unique constraints sugeridas:** 6

---

## ✅ CONCLUÕES

1. **Schema está bem estruturado** — separação clara entre domínios (messaging, CRM, broadcast, baby shower, etc.)
2. **Tipos MySQL corretos** — uso de `int`, `varchar`, `text`, `json`, `timestamp`, `decimal`
3. **Broadcast schema completo** — cobre envio, rastreamento, status, arquivos
4. **Faltam índices** — performance pode degrade em alta carga
5. **Faltam unique constraints** — risco de duplicação (já tratada em código, mas deve estar no DB)
6. **Migration pendente** —需 aplicar ajustes de estrutura do broadcast
7. **Campos sensíveis** — `api_configurations` precisam de atenção à criptografia

---

**Próximos passos sugeridos:**
1. ✅ Aplicar migration pendente no Railway
2. ✅ Criar unique constraints (provider+external_id, external_id, composite unicos)
3. ✅ Criar índices de performance
4. ✅ Revisar criptografia de tokens/senhas
5. ✅ Testar broadcast com imagem em produção

---

*Relatório gerado em 25/03/2026 — baseado em `drizzle/schema.ts`*
