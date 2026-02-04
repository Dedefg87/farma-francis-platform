CREATE TABLE `agent_pauses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`pause_type` enum('lunch','snack','bathroom','other') NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	`duration_minutes` int,
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	CONSTRAINT `agent_pauses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_pauses` ADD CONSTRAINT `agent_pauses_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;