CREATE TABLE `ura_menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`welcome_message` text NOT NULL,
	`menu_data` text NOT NULL,
	`working_hours` text,
	`off_hours_message` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ura_menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visual_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`flow_data` text NOT NULL,
	`is_active` int NOT NULL DEFAULT 0,
	`execution_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visual_flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ura_menus` ADD CONSTRAINT `ura_menus_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visual_flows` ADD CONSTRAINT `visual_flows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;