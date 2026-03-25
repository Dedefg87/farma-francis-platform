-- Migration: 20250325_add_broadcast_lists_last_sent_at
-- Purpose: Add last_sent_at column to broadcast_lists

ALTER TABLE `broadcast_lists`
  ADD COLUMN `last_sent_at` TIMESTAMP NULL;
