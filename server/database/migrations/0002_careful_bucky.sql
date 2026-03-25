CREATE TABLE `api_configurations` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`provider` varchar(16) NOT NULL,
	`token` text NOT NULL,
	`phone_number_id` varchar(255),
	`page_id` varchar(255),
	`webhook_url` varchar(512),
	`webhook_verify_token` varchar(255),
	`app_secret` varchar(255),
	`is_active` INT DEFAULT 1 NOT NULL,
	`last_tested_at` timestamp,
	`test_status` varchar(16) DEFAULT 'not_tested',
	`test_message` text,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `baby_shower_gift_packages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`event_id` INT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`product_ids` jsonb NOT NULL,
	`price` numeric(10, 2) NOT NULL,
	`discount_percent` numeric(5, 2) DEFAULT '0',
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation_tags` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`conversation_id` INT NOT NULL,
	`tag` varchar(64) NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_outbox_events` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`payload` jsonb NOT NULL,
	`status` varchar(16) DEFAULT 'pending' NOT NULL,
	`attempts` INT DEFAULT 0 NOT NULL,
	`last_error` text,
	`scheduled_at` timestamp NOT NULL,
	`processed_at` timestamp,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`customer_id` INT,
	`assigned_to` INT,
	`due_date` timestamp,
	`priority` varchar(16) DEFAULT 'medium',
	`status` varchar(16) DEFAULT 'open' NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_treatments` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT NOT NULL,
	`treatment_type` varchar(100) NOT NULL,
	`description` text,
	`medication` text,
	`start_date` timestamp,
	`end_date` timestamp,
	`notes` text,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`user_id` INT,
	`department` varchar(100),
	`position` varchar(100),
	`hire_date` timestamp,
	`salary` numeric(10, 2),
	`status` varchar(16) DEFAULT 'active' NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL,
	CONSTRAINT `employees_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `frontend_telemetry_events` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`event_name` varchar(255) NOT NULL,
	`properties` jsonb,
	`user_id` INT,
	`session_id` varchar(255),
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queue_agents` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`queue_id` INT NOT NULL,
	`agent_id` INT NOT NULL,
	`assigned_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7),
	`created_at` timestamp DEFAULT now() NOT NULL,
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`ticket_id` INT NOT NULL,
	`tag_id` INT NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE `api_configurations` ADD CONSTRAINT `api_configurations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_gift_packages` ADD CONSTRAINT `baby_shower_gift_packages_event_id_baby_shower_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_gift_packages` ADD CONSTRAINT `baby_shower_gift_packages_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_tags` ADD CONSTRAINT `conversation_tags_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_treatments` ADD CONSTRAINT `customer_treatments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `frontend_telemetry_events` ADD CONSTRAINT `frontend_telemetry_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_queue_id_queues_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;