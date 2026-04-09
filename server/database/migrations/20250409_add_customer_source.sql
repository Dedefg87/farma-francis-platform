-- Add missing source column to customers table
-- The applySqlMigrations function wraps this safely
ALTER TABLE customers ADD COLUMN source VARCHAR(64) DEFAULT 'manual' AFTER status;
