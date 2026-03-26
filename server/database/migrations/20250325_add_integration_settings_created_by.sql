-- Migration: 20250325_add_integration_settings_created_by
-- Purpose: Add created_by column to integration_settings

ALTER TABLE integration_settings ADD COLUMN created_by INT NULL;
ALTER TABLE integration_settings ADD CONSTRAINT integration_settings_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
