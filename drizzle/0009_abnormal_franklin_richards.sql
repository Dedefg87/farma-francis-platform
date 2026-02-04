CREATE TABLE `agent_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`status` enum('online','paused','offline') NOT NULL DEFAULT 'offline',
	`last_activity` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`status` enum('open','assigned','closed') NOT NULL DEFAULT 'open',
	`assigned_to` int,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`close_reason` enum('venda','orcamento','conversa_anterior','engano'),
	`last_message_at` timestamp NOT NULL DEFAULT (now()),
	`unread_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queue_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`max_wait_minutes` int NOT NULL DEFAULT 15,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queue_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;