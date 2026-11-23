-- Migration: add photo to users table
-- Created: 2026-07-26 18:00
-- Reason: Add photo column to users table for profile pictures

ALTER TABLE `users` ADD COLUMN `photo` text NULL;