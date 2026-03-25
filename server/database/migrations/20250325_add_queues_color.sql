-- Migration: 20250325_add_queues_color
-- Purpose: Add color column to queues

ALTER TABLE `queues`
  ADD COLUMN `color` varchar(7) DEFAULT '#D32F2F' NOT NULL;
