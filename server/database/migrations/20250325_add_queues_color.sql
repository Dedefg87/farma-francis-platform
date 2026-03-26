-- Migration: 20250325_add_queues_color
-- Purpose: Add color column to queues

ALTER TABLE queues 
  ADD COLUMN color VARCHAR(50) NULL;
