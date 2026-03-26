CREATE INDEX idx_conversation_messages_external_id ON conversation_messages (external_id);
CREATE INDEX idx_conversation_messages_remote_jid ON conversation_messages (remote_jid);
CREATE UNIQUE INDEX uq_conversation_messages_provider_external ON conversation_messages (provider, external_id);
