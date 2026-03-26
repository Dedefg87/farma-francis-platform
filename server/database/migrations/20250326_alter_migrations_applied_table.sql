-- Migration: 20250326_alter_migrations_applied_table
-- Data: 2025-03-26
-- Propósito: Garantir que a tabela de controle de migrations suporte nomes longos
-- e evitar falhas ao registrar migrations aplicadas.

-- 1. Garante que a tabela exista (caso seja um ambiente novo)
CREATE TABLE IF NOT EXISTS `_migrations_applied` (
  `migration_name` VARCHAR(255) NOT NULL,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`migration_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ajusta o tamanho da coluna para suportar nomes longos
ALTER TABLE `_migrations_applied`
  MODIFY COLUMN `migration_name` VARCHAR(255) NOT NULL;

-- 3. Garante charset e collation consistentes
ALTER TABLE `_migrations_applied`
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
