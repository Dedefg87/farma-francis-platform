-- Migration: 20250324_add_processed_webhook_messages
-- Data: 2025-03-24
-- Propósito: Tabela para deduplicação de webhooks (Evolution API)

CREATE TABLE IF NOT EXISTS `processed_webhook_messages` (
  `id` VARCHAR(64) NOT NULL,
  `externalId` VARCHAR(255) NOT NULL,
  `receivedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `provider` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_external` (`provider`, `externalId`),
  INDEX `idx_receivedAt` (`receivedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
