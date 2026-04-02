-- Adiciona coluna display_name na tabela users
-- Padrão: se NULL, usa o próprio name
ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL AFTER name;
