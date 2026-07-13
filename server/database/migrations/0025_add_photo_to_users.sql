-- Migration: 0025_add_photo_to_users
-- Data: $(date +%Y-%m-%d)
-- Propósito: Adicionar coluna photo na tabela users para armazenar URL da foto do perfil

ALTER TABLE `users` ADD COLUMN `photo` VARCHAR(512) NULL AFTER `email`;
