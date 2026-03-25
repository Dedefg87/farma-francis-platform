-- Migration: 20250324_migrate_broadcast_messages_definitive
-- Data: 2025-03-24
-- Propósito: Alterar tabela broadcast_messages para ter colunas corretas (sender_id, caption, sender_type, error_message)
-- Nota: Assume que broadcast_messages já existe. Apenas adiciona colunas faltantes.

-- Adicionar sender_id (INT) se não existir
ALTER TABLE `broadcast_messages` ADD COLUMN IF NOT EXISTS `sender_id` INT NOT NULL AFTER `sentBy`;

-- Adicionar caption (TEXT) se não existir
ALTER TABLE `broadcast_messages` ADD COLUMN IF NOT EXISTS `caption` TEXT NULL AFTER `content`;

-- Adicionar sender_type (VARCHAR 50) se não existir
ALTER TABLE `broadcast_messages` ADD COLUMN IF NOT EXISTS `sender_type` VARCHAR(50) NOT NULL DEFAULT 'agent' AFTER `sender_id`;

-- Adicionar error_message (TEXT) se não existir
ALTER TABLE `broadcast_messages` ADD COLUMN IF NOT EXISTS `error_message` TEXT NULL AFTER `status`;

-- Nota: Em produção, pode ser necessário renomear 'sentBy' para 'sender_id' se ainda não foi feito.
-- Se 'sentBy' ainda existe e 'sender_id' não, faça manualmente:
-- ALTER TABLE `broadcast_messages` CHANGE COLUMN `sentBy` `sender_id` INT NOT NULL;
