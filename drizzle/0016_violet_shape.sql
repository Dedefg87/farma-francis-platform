CREATE TABLE `integration_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integration_type` enum('whatsapp_business','instagram_graph','evolution_api','telegram','email') NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`config` json NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_tested_at` timestamp,
	`test_status` enum('success','failed','pending') DEFAULT 'pending',
	`test_message` text,
	CONSTRAINT `integration_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `integration_settings` ADD CONSTRAINT `integration_settings_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;