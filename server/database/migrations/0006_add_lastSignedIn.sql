-- Hotfix: Ensure lastSignedIn column exists in users table
ALTER TABLE users ADD COLUMN lastSignedIn timestamp DEFAULT now() NOT NULL;
