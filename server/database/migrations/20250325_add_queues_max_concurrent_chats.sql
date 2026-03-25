-- Migration: 20250325_add_queues_max_concurrent_chats
-- Purpose: Add max_concurrent_chats column to queues

ALTER TABLE `queues`
  ADD COLUMN `max_concurrent_chats` INT DEFAULT 3 NOT NULL;
