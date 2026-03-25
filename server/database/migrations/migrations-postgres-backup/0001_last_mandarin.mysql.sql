CREATE TABLE "automation_flows` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` TEXT,
	`channel` varchar(16) NOT NULL,
	`trigger` TEXT NOT NULL,
	`response` TEXT NOT NULL,
	`is_active` INT DEFAULT 1 NOT NULL,
	`response_count` INT DEFAULT 0 NOT NULL,
	`created_by` INT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
	`notes` TEXT,
	`created_by` INT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `messages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT,
	`ticket_id` INT,
	`channel` varchar(16) NOT NULL,
	`direction` varchar(16) NOT NULL,
	`content` TEXT NOT NULL,
	`message_id` varchar(255),
	`status` varchar(32),
	`metadata` TEXT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `tickets` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`ticket_number` varchar(50) NOT NULL,
	`customer_id` INT,
	`subject` varchar(255) NOT NULL,
	`description` TEXT,
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
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `tickets_ticket_number_unique` UNIQUE(`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `ura_menus` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`welcome_message` TEXT NOT NULL,
	`menu_data` TEXT NOT NULL,
	`working_hours` TEXT,
	`off_hours_message` TEXT,
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_by` INT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `visual_flows` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` TEXT,
	`flow_data` TEXT NOT NULL,
	`is_active` INT DEFAULT 0 NOT NULL,
	`is_test_mode` INT DEFAULT 0 NOT NULL,
	`execution_count` INT DEFAULT 0 NOT NULL,
	`created_by` INT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE `automation_flows` ADD CONSTRAINT `automation_flows_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `leads` ADD CONSTRAINT `leads_customer_id_customers_id_fk` FOREIGN KEY (`customer_id") REFERENCES customers`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `leads` ADD CONSTRAINT `leads_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `messages` ADD CONSTRAINT `messages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id") REFERENCES customers`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `messages` ADD CONSTRAINT `messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id") REFERENCES tickets`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_customers_id_fk` FOREIGN KEY (`customer_id") REFERENCES customers`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `ura_menus` ADD CONSTRAINT `ura_menus_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `visual_flows` ADD CONSTRAINT `visual_flows_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id") ON DELETE no action ON UPDATE no action;