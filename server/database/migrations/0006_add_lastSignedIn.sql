-- Hotfix: Ensure last_signed_in column exists in users table
-- Run: mysql $DATABASE_URL -f this-file
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `last_signed_in` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
-- If column already exists, this is a no-op
COMMIT;
