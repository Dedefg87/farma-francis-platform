CREATE TABLE `automation_flows` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`channel` varchar(16) NOT NULL,
	`trigger` text NOT NULL,
	`response` text NOT NULL,
	`is_active` INT DEFAULT 1 NOT NULL,
	`response_count` INT DEFAULT 0 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`source` varchar(100),
	`stage` varchar(32) DEFAULT 'prospect' NOT NULL,
	`value` INT,
	`assigned_to` INT,
	`follow_up_date` timestamp,
	`notes` text,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT,
	`ticket_id` INT,
	`channel` varchar(16) NOT NULL,
	`direction` varchar(16) NOT NULL,
	`content` text NOT NULL,
	`message_id` varchar(255),
	`status` varchar(32),
	`metadata` text,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`ticket_number` varchar(50) NOT NULL,
	`customer_id` INT,
	`subject` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(32) DEFAULT 'open' NOT NULL,
	`priority` varchar(16) DEFAULT 'medium' NOT NULL,
	`category` varchar(100),
	`channel` varchar(16),
	`assigned_to` INT,
	`sla_deadline` timestamp,
	`resolved_at` timestamp,
	`closed_at` timestamp,
	`time_spent_minutes` INT DEFAULT 0,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL,
	CONSTRAINT `tickets_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `ura_menus` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`welcome_message` text NOT NULL,
	`menu_data` text NOT NULL,
	`working_hours` text,
	`off_hours_message` text,
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visual_flows` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`flow_data` text NOT NULL,
	`is_active` INT DEFAULT 0 NOT NULL,
	`is_test_mode` INT DEFAULT 0 NOT NULL,
	`execution_count` INT DEFAULT 0 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE `automation_flows` ADD CONSTRAINT `automation_flows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ura_menus` ADD CONSTRAINT `ura_menus_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visual_flows` ADD CONSTRAINT `visual_flows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;