-- Migration: 0007_add_approvals_table.sql
-- Tabela para sistema de aprovação humana (farmacêuticos, etc.)

CREATE TABLE IF NOT EXISTS `approvals` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `entity_type` varchar(64) NOT NULL, -- e.g., 'broadcast', 'prescription', 'flow'
  `entity_id` int NOT NULL,
  `requested_by` int NOT NULL REFERENCES `users`(`id`),
  `approved_by` int REFERENCES `users`(`id`),
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
  `reason` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Índices para performance
CREATE INDEX `idx_approvals_status` ON `approvals`(`status`);
CREATE INDEX `idx_approvals_entity` ON `approvals`(`entity_type`, `entity_id`);
