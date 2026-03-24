# 🚀 MIGRAÇÃO DEFINITIVA: broadcast_messages

## 📍 Contexto de Emergência

**Problema:** Schema do banco (`broadcast_messages`) desincronizado com o código, causando:
- Erros `params: 38,,,URL...` (strings vazias sendo enviadas para colunas NOT NULL)
- Colunas com nomes errados (`content` vs `message_text`, `sentBy` vs `sender_id`)
- Colunas faltando (`caption`, `sender_type`, `error_message`)

**Solução:** Aplicar migration SQL que:
1. Renomeia `content` → `message_text`
2. Renomeia `sentBy` → `sender_id`
3. Adiciona `caption`, `sender_type`, `error_message`

---

## 🛠️ Script SQL Definitivo

Arquivo: `server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql`

```sql
START TRANSACTION;

ALTER TABLE broadcast_messages
CHANGE COLUMN `content` `message_text` TEXT NULL;

ALTER TABLE broadcast_messages
CHANGE COLUMN `sentBy` `sender_id` INT NOT NULL;

ALTER TABLE broadcast_messages
ADD COLUMN `caption` TEXT NULL AFTER `message_text`;

ALTER TABLE broadcast_messages
ADD COLUMN `sender_type` VARCHAR(50) NOT NULL DEFAULT 'agent' AFTER `sender_id`;

ALTER TABLE broadcast_messages
ADD COLUMN `error_message` TEXT NULL AFTER `sent_at`;

COMMIT;
```

---

## 📋 Instruções de Aplicação

### Opção A: Via Railway Console (Mais Rápido)

1. Acesse o painel da Railway
2. Vá em seu projeto → Database
3. Clique em "Open Editor" ou "Connect with MySQL CLI"
4. Cole e execute o script SQL completo acima
5. Verifique com: `DESCRIBE broadcast_messages;`

### Opção B: Via Script Node.js (Se preferir automatizado)

```bash
# 1. Certifique-se de que as variáveis de ambiente DATABASE_URL estão configuradas
# 2. Execute:
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const sql = fs.readFileSync('./server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql', 'utf8');
  await conn.query(sql);
  console.log('✅ Migração aplicada com sucesso!');
  await conn.end();
}
run().catch(console.error);
"
```

### Opção C: Via Drizzle Migrate (Se o drizzle-kit estiver configurado)

```bash
# Primeiro, certifique-se de que o schema Drizzle está atualizado
# O arquivo server/database/schema.mysql.ts já foi atualizado no commit c60975a

# Gerar migração (irá detectar diferenças):
npx drizzle-kit generate

# A migração gerada deve conter as ALTER TABLE. Compare com o script definitivo.
# Se faltar alguma renomeação, adicione manualmente ao arquivo gerado.

# Aplicar:
npx drizzle-kit migrate
```

---

## ✅ Validação Pós-Migração

Execute no banco:

```sql
DESCRIBE broadcast_messages;
```

Esperado:

| Campo | Tipo | Nulo | Padrão |
|-------|------|------|--------|
| id | int | NÃO | auto_increment |
| list_id | int | NÃO | |
| message_text | text | SIM | NULL |
| caption | text | SIM | NULL |
| file_url | varchar(255) | SIM | NULL |
| file_name | varchar(255) | SIM | NULL |
| file_type | varchar(50) | SIM | NULL |
| file_size | int | SIM | NULL |
| sender_id | int | NÃO | |
| sender_type | varchar(50) | NÃO | 'agent' |
| status | varchar(50) | NÃO | 'pending' |
| sent_at | datetime | SIM | NULL |
| error_message | text | SIM | NULL |
| created_at | datetime | NÃO | CURRENT_TIMESTAMP |
| updated_at | datetime | NÃO | CURRENT_TIMESTAMP |

---

## 🧪 Teste Após Migração

1. Reinicie a aplicação (Railway deploy ou restart)
2. Acesse a interface → Mensagens → Lista de Transmissão
3. Crie uma nova lista
4. Envie uma mensagem com:
   - Apenas texto
   - Apenas imagem (sem caption)
   - Texto + imagem + caption
5. Verifique logs Railway:
   - `[BroadcastInsert] Normalized values:` deve showing `null` para campos vazios
   - Nenhum erro `Failed query` deve aparecer

---

## ⚠️ Rollback (Se Necessário)

Se algo der errado, execute o script de rollback:

```sql
START TRANSACTION;

ALTER TABLE broadcast_messages DROP COLUMN IF EXISTS error_message;
ALTER TABLE broadcast_messages DROP COLUMN IF EXISTS sender_type;
ALTER TABLE broadcast_messages DROP COLUMN IF EXISTS caption;

ALTER TABLE broadcast_messages
CHANGE COLUMN `sender_id` `sentBy` INT NOT NULL;

ALTER TABLE broadcast_messages
CHANGE COLUMN `message_text` `content` TEXT NOT NULL;

COMMIT;
```

---

## 📦 Commit Info

**Commit:** `c60975a`  
**Branch:** main  
**Arquivos alterados:**
- `server/database/schema.mysql.ts` (schema Drizzle atualizado)
- `server/database/migrations/20250324_migrate_broadcast_messages_definitive.sql` (script SQL)

**Status do Deploy:** Aguardando aplicação da migration no Railway.

Após aplicar a migration, o sistema estará 100% sincronizado e os erros de INSERT devem cessar.
