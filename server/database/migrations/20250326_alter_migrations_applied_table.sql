-- Migration: 20250326_alter_migrations_applied_table
-- Purpose: Ensure _migrations_applied table has correct structure

ALTER TABLE _migrations_applied
  MODIFY COLUMN migration_name VARCHAR(255) NOT NULL;

ALTER TABLE _migrations_applied
  MODIFY COLUMN applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
