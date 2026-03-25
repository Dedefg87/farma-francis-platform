-- Migration: 20250326_drop_and_recreate_processed_webhook_messages
-- Data: 2025-03-25
-- Propósito: Recriar tabela processed_webhook_messages com schema correto (processed_at)
-- IMPORTANTE: Esta migration assume que a tabela anterior foi criada com estrutura incorreta.
-- Se houver dados importantes, faça backup antes.

DROP TABLE IF EXISTS `processed_webhook_messages`;

CREATE TABLE `processed_webhook_messages` (
  `id` VARCHAR(255) NOT NULL,
  `processed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `provider` VARCHAR(16) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_processed_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
