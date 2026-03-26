ALTER TABLE users ADD COLUMN lastSignedIn timestamp DEFAULT now() NOT NULL;
