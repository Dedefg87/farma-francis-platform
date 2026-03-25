-- Migration: 20250325_add_processed_webhook_messages_fixed
-- Data: 2025-03-25
-- Propósito: Tabela para deduplicação de webhooks (Evolution API) - schema ajustado

CREATE TABLE IF NOT EXISTS `processed_webhook_messages` (
  `id` VARCHAR(255) NOT NULL,
  `processed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `provider` VARCHAR(16) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_processed_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
