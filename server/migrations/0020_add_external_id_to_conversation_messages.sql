-- Adiciona coluna external_id para armazenar o ID da mensagem na Evolution API
-- Isso permite buscar mídia mesmo após a URL temporária expirar
ALTER TABLE conversation_messages ADD COLUMN external_id VARCHAR(255) NULL COMMENT 'ID da mensagem na Evolution API (messageKey.id)' AFTER id;

-- Índice para busca rápida
CREATE INDEX idx_conversation_messages_external_id ON conversation_messages(external_id);
