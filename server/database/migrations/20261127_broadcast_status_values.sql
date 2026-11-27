ALTER TABLE `broadcast_members_sent` MODIFY `status` VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE `broadcast_messages` MODIFY `status` VARCHAR(16) NOT NULL DEFAULT 'sending';
