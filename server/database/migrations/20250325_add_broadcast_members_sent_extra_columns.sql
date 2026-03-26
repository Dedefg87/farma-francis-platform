ALTER TABLE broadcast_members_sent ADD COLUMN error_message TEXT NULL;
ALTER TABLE broadcast_members_sent ADD COLUMN delivered_at TIMESTAMP NULL;
ALTER TABLE broadcast_members_sent ADD COLUMN read_at TIMESTAMP NULL;
