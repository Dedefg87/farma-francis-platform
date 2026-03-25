-- Migration: 0006_add_lastSignedIn
-- Data: 2025-03-17 (original) / 2025-03-25 (MySQL conversion)
-- Propósito: Garantir que a coluna lastSignedIn existe na tabela users

-- Adicionar coluna se não existir
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lastSignedIn` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Nota: IF NOT EXISTS é suportado no MySQL 8.0+. Se usar MySQL <8, remover IF NOT EXISTS e deixar erro ignorar.
