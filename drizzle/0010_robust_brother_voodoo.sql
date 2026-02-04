CREATE TABLE `queue_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queue_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queue_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`max_concurrent_chats` int NOT NULL DEFAULT 3,
	`priority` int NOT NULL DEFAULT 0,
	`color` varchar(7) DEFAULT '#D32F2F',
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_queue_id_queues_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queues` ADD CONSTRAINT `queues_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;