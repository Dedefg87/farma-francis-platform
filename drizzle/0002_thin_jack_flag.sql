ALTER TABLE `automation_flows` MODIFY COLUMN `trigger` text NOT NULL;--> statement-breakpoint
ALTER TABLE `automation_flows` ADD `response` text NOT NULL;--> statement-breakpoint
ALTER TABLE `automation_flows` ADD `response_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `automation_flows` DROP COLUMN `flow_config`;