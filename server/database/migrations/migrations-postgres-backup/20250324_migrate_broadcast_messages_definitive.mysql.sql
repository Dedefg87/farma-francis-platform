-- SQL Migration Script for broadcast_messages table
-- Date: 24 de março de 2026
--
-- OBJETIVO: Alinhar a estrutura da tabela 'broadcast_messages' com o schema esperado pelo código.
-- - Renomear 'content' para 'message_text'
-- - Renomear 'sentBy' para 'sender_id'
-- - Adicionar 'caption'
-- - Adicionar 'sender_type'
-- - Adicionar 'error_message'

START TRANSACTION;

-- PASSO 1: RENOMEAR COLUNAS EXISTENTES

-- Renomear 'content' para 'message_text' e definir como TEXT NULL
ALTER TABLE broadcast_messages
CHANGE COLUMN `content` `message_text` TEXT NULL;

-- Renomear 'sentBy' para 'sender_id' e definir como INT NOT NULL
ALTER TABLE broadcast_messages
CHANGE COLUMN `sentBy` `sender_id` INT NOT NULL;

-- PASSO 2: ADICIONAR COLUNAS FALTANTES

-- Adicionar 'caption' (TEXT NULL) após 'message_text'
ALTER TABLE broadcast_messages
ADD COLUMN `caption` TEXT NULL AFTER `message_text`;

-- Adicionar 'sender_type' (VARCHAR(50) NOT NULL DEFAULT 'agent') após 'sender_id'
ALTER TABLE broadcast_messages
ADD COLUMN `sender_type` VARCHAR(50) NOT NULL DEFAULT 'agent' AFTER `sender_id`;

-- Adicionar 'error_message' (TEXT NULL) após 'sent_at'
ALTER TABLE broadcast_messages
ADD COLUMN `error_message` TEXT NULL AFTER `sent_at`;

COMMIT;

-- Verificação pós-migração
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM
  INFORMATION_SCHEMA.COLUMNS
WHERE
  TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'broadcast_messages'
ORDER BY
  ORDINAL_POSITION;
