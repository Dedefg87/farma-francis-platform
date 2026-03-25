-- Hotfix: Ensure lastSignedIn column exists in users table
-- Run: psql $DATABASE_URL -f this-file

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lastSignedIn` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- If column already exists, this is a no-op
COMMIT;
