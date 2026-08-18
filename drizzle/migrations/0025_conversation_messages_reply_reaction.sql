-- ✅ Migration: Adicionar colunas reply + reaction a conversation_messages
-- Aplicar manualmente no Railway (via endpoint ou CLI)

-- Verificar se colunas existem
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'conversation_messages'
  AND COLUMN_NAME IN ('reply_to_external_id', 'reaction');

-- Se não existirem, aplicar:
-- ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_to_external_id VARCHAR(255) NULL AFTER file_size;
-- ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reaction VARCHAR(10) NULL AFTER reply_to_external_id;

-- ✅ Garantir que a coluna sender_name e sender_position também existem
-- (precisam para messages.list não quebrar)
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'conversation_messages'
  AND COLUMN_NAME IN ('sender_name', 'sender_position');

-- ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) NULL;
-- ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_position VARCHAR(255) NULL;
