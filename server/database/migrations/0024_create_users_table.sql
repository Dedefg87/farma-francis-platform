-- Migration: 0024_create_users_table
-- Data: 2025-03-25
-- Propósito: Criar tabela users (ausente no banco)

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `open_id` VARCHAR(64) NOT NULL UNIQUE,
  `name` TEXT NULL,
  `email` VARCHAR(320) NULL,
  `password_hash` VARCHAR(255) NULL,
  `login_method` VARCHAR(64) NULL,
  `role` VARCHAR(16) NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `last_signed_in` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
