-- Add missing source column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source VARCHAR(64) DEFAULT 'manual' AFTER status;
