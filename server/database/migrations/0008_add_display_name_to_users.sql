-- Migration: Adicionar coluna 'display_name' à tabela users
-- Data: 2026-04-09
-- Motivo: routers-auth.ts seleciona display_name mas coluna pode não existir
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) NULL AFTER `name`;
