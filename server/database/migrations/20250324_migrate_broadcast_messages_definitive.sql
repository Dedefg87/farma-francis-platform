ALTER TABLE broadcast_messages ADD COLUMN sender_id INT NOT NULL DEFAULT 1;
ALTER TABLE broadcast_messages ADD COLUMN caption TEXT NULL;
ALTER TABLE broadcast_messages ADD COLUMN sender_type VARCHAR(50) NOT NULL DEFAULT 'agent';
ALTER TABLE broadcast_messages ADD COLUMN error_message TEXT NULL;
