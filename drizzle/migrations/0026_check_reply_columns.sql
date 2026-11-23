-- ✅ Script de verificação de schema
-- Aplicar via endpoint /api/trpc/system.migrate

SELECT COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'conversation_messages'
  AND COLUMN_NAME LIKE '%reply%'
  AND COLUMN_NAME LIKE '%extern%'
  OR COLUMN_NAME LIKE '%reply%message%';
