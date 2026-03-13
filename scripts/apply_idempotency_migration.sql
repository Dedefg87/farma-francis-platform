-- Migration: Add external_id columns and unique indexes for idempotency
-- Applies to: MySQL/PostgreSQL (compatible syntax)

-- 1. Add external_id to received_messages if not exists
ALTER TABLE received_messages ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) NULL AFTER externalId;

-- 2. Add unique index on received_messages (provider, external_id) if not exists
-- MySQL:
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_external ON received_messages(provider, external_id);
-- PostgreSQL (compatibility):
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_external ON received_messages(provider, external_id);

-- 3. Add external_id to conversation_messages if not exists
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) NULL AFTER file_size;

-- 4. Add unique index on conversation_messages (conversation_id, external_id) if not exists
-- MySQL (partial index for non-null):
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversation_external ON conversation_messages(conversation_id, external_id);
-- If MySQL complains about NULLs in unique index, use:
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversation_external_notnull ON conversation_messages(conversation_id, external_id) WHERE external_id IS NOT NULL;

-- 5. Verify
SELECT 
  'received_messages external_id' as check1,
  COUNT(*) as rows 
FROM information_schema.columns 
WHERE table_name = 'received_messages' AND column_name = 'external_id'
UNION ALL
SELECT 
  'conversation_messages external_id' as check1,
  COUNT(*) as rows 
FROM information_schema.columns 
WHERE table_name = 'conversation_messages' AND column_name = 'external_id';
