-- Migration: 20250325_add_broadcast_messages_file_columns
-- Purpose: Add file metadata columns to broadcast_messages

ALTER TABLE `broadcast_messages`
  ADD COLUMN `file_url` TEXT NULL,
  ADD COLUMN `file_name` TEXT NULL,
  ADD COLUMN `file_type` TEXT NULL,
  ADD COLUMN `file_size` INT NULL;
