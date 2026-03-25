# 🚀 APLICAÇÃO IMEDIATA DA MIGRATION

## 📋 O que falta

A migration SQL que corrige a tabela `broadcast_messages` precisa ser aplicada no banco da Railway.

## ✅ Como aplicar (3 opções)

### OPÇÃO 1: Cole no console da Railway (MAIS FÁCIL - 2 minutos)

1. Acesse: https://railway.app/dashboard
2. Vá no seu projeto → **Database**
3. Clique em **"Open Editor"** ou **"Console"**
4. Cole TODO este script abaixo:
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

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
ORDER BY ORDINAL_POSITION;
```
5. Clique em **Run / Execute**
6. Verifique se retorna as colunas corretas (message_text, caption, sender_id, sender_type, error_message)

### OPÇÃO 2: Execute script Node.js via Railway CLI

```bash
# No Railway dashboard, vá em Settings → CLI
# Lá você pode executar comandos no contexto do seu projeto

# Execute:
node apply-migration.cjs
```

### OPÇÃO 3: Via Railway Run Command

No Railway dashboard:
1. Vá em seu projeto → **"Run Command"**
2. Execute: `node apply-migration.cjs`
3. Observe os logs

---

## 🧪 Validação pós-migration

Depois de aplicar:

1. Execute no console SQL:
```sql
DESCRIBE broadcast_messages;
```

2. Confirme que existem as colunas:
   - ✅ `message_text` (TEXT NULL)
   - ✅ `caption` (TEXT NULL)
   - ✅ `sender_id` (INT NOT NULL)
   - ✅ `sender_type` (VARCHAR 50 NOT NULL DEFAULT 'agent')
   - ✅ `error_message` (TEXT NULL)

3. Teste a aplicação:
   - Criar nova lista de transmissão
   - Enviar mensagem (com e sem texto, com e sem imagem)
   - Verificar logs Railway: `[BroadcastInsert] Normalized values:` deve mostrar `null` para campos vazios

---

## ⚠️ ROLLBACK (se algo der errado)

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

## 📊 Status Final Esperado

- ✅ Código aplicado (commits c60975a + 816e375)
- ✅ Migration SQL aplicada no banco
- ✅ INSERTs funcionando sem erros `params: 38,,,URL...`
- ✅ Sistema 100% estável

**Preciso que você execute a migration (Opção 1 recomendada). Depois me avise que aplicou para eu verificar os logs!**
