ALTER TABLE integration_settings ADD COLUMN created_by INT NULL;
ALTER TABLE integration_settings ADD CONSTRAINT integration_settings_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
