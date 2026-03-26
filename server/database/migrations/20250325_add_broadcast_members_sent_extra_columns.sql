-- Migration: 20250325_add_broadcast_members_sent_extra_columns
-- Purpose: Add missing columns to broadcast_members_sent

ALTER TABLE broadcast_members_sent 
  ADD COLUMN error_message TEXT NULL;

ALTER TABLE broadcast_members_sent 
  ADD COLUMN delivered_at TIMESTAMP NULL;

ALTER TABLE broadcast_members_sent 
  ADD COLUMN read_at TIMESTAMP NULL;
