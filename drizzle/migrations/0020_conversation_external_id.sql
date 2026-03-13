-- +goose Up
-- Adiciona coluna external_id para idempotência (Evolution API message ID)
ALTER TABLE conversation_messages ADD COLUMN external_id VARCHAR(255) NULL AFTER file_size;

-- Cria índice único para prevenir duplicatas na mesma conversa
CREATE UNIQUE INDEX uniq_conversation_external ON conversation_messages(conversation_id, external_id);

-- +goose Down
-- Remove índice
DROP INDEX IF EXISTS uniq_conversation_external ON conversation_messages;
-- Remove coluna
ALTER TABLE conversation_messages DROP COLUMN external_id;
