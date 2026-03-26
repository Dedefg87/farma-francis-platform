-- Migration: 20250325_add_conversation_messages_indexes
-- Purpose: Add indexes to conversation_messages for performance and uniqueness

-- Índice para external_id
CREATE INDEX idx_conversation_messages_external_id 
  ON conversation_messages (external_id);

-- Índice para remote_jid
CREATE INDEX idx_conversation_messages_remote_jid 
  ON conversation_messages (remote_jid);

-- Índice único para evitar duplicação (provider + external_id)
CREATE UNIQUE INDEX uq_conversation_messages_provider_external 
  ON conversation_messages (provider, external_id);
