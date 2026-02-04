CREATE TABLE `api_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('whatsapp','instagram') NOT NULL,
	`token` text NOT NULL,
	`phone_number_id` varchar(255),
	`page_id` varchar(255),
	`webhook_url` varchar(512),
	`webhook_verify_token` varchar(255),
	`is_active` int NOT NULL DEFAULT 1,
	`last_tested_at` timestamp,
	`test_status` enum('success','failed','not_tested') DEFAULT 'not_tested',
	`test_message` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_configurations` ADD CONSTRAINT `api_configurations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;