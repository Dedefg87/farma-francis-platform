-- Migration: 20250325_add_queues_created_by
-- Purpose: Add created_by foreign key to queues

ALTER TABLE `queues`
  ADD COLUMN `created_by` INT NULL,
  ADD CONSTRAINT `queues_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;
