-- Migration: Índices para conversation_messages
-- Data: 2025-03-25
-- Propósito: Garantir performance em buscas por external_id e remote_jid,
--            e evitar duplicação de mensagens (provider + external_id)

-- idx_conversation_messages_external_id
CREATE INDEX IF NOT EXISTS idx_conversation_messages_external_id
ON conversation_messages(external_id) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- idx_conversation_messages_remote_jid
CREATE INDEX IF NOT EXISTS idx_conversation_messages_remote_jid
ON conversation_messages(remote_jid) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Índice unique para evitar duplicatas (provider, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_provider_external
ON conversation_messages(provider, external_id) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;