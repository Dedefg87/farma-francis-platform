-- Migration: 20250325_add_broadcast_members_sent_extra_columns
-- Purpose: Add missing columns error_message, delivered_at, read_at to broadcast_members_sent

ALTER TABLE `broadcast_members_sent`
  ADD COLUMN `error_message` TEXT NULL,
  ADD COLUMN `delivered_at` TIMESTAMP NULL,
  ADD COLUMN `read_at` TIMESTAMP NULL;
