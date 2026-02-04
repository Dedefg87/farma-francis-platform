ALTER TABLE `conversation_messages` ADD `file_url` varchar(500);--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `file_type` varchar(100);--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `file_size` int;--> statement-breakpoint
ALTER TABLE `conversation_messages` DROP COLUMN `attachment_url`;