-- Adiciona coluna external_id para armazenar o ID da mensagem na Evolution API
-- Isso permite buscar mídia mesmo após a URL temporária expirar
ALTER TABLE conversation_messages ADD COLUMN external_id VARCHAR(255) NULL COMMENT 'ID da mensagem na Evolution API (messageKey.id)' AFTER id;

-- Adiciona coluna remote_jid para armazenar o JID completo do remetente/destinatário
-- Necessário para buscar mídia via getBase64FromMediaMessage
ALTER TABLE conversation_messages ADD COLUMN remote_jid VARCHAR(255) NULL COMMENT 'JID do remetente (ex: 5511999999999@s.whatsapp.net)' AFTER external_id;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_conversation_messages_external_id ON conversation_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_remote_jid ON conversation_messages(remote_jid);
