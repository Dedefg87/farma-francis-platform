-- +goose Up
-- +goose StatementBegin

-- Adicionar colunas de arquivo à tabela broadcast_messages
ALTER TABLE `broadcast_messages`
  ADD COLUMN `file_url` VARCHAR(500) NULL COMMENT 'URL do arquivo no R2/Cloudflare' AFTER `content`,
  ADD COLUMN `file_name` VARCHAR(255) NULL COMMENT 'Nome original do arquivo' AFTER `file_url`,
  ADD COLUMN `file_type` VARCHAR(100) NULL COMMENT 'MIME type do arquivo (image/jpeg, application/pdf)' AFTER `file_name`,
  ADD COLUMN `file_size` INT NULL COMMENT 'Tamanho do arquivo em bytes' AFTER `file_type`;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remover colunas de arquivo (cuidado: perde dados!)
ALTER TABLE `broadcast_messages`
  DROP COLUMN `file_url`,
  DROP COLUMN `file_name`,
  DROP COLUMN `file_type`,
  DROP COLUMN `file_size`;

-- +goose StatementEnd
