-- Fix broadcast_messages table schema to match current code
-- Execute these in your MySQL database

-- 1. Rename message_text to content (if exists)
ALTER TABLE broadcast_messages CHANGE COLUMN message_text content TEXT;

-- 2. Add missing columns
ALTER TABLE broadcast_messages ADD COLUMN total_recipients INT NOT NULL DEFAULT 0;
ALTER TABLE broadcast_messages ADD COLUMN successful_sends INT DEFAULT 0;
ALTER TABLE broadcast_messages ADD COLUMN failed_sends INT DEFAULT 0;

-- 3. Update status default if needed
ALTER TABLE broadcast_messages MODIFY COLUMN status VARCHAR(16) NOT NULL DEFAULT 'sending';

-- 4. Ensure sent_at is NOT NULL
ALTER TABLE broadcast_messages MODIFY COLUMN sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;