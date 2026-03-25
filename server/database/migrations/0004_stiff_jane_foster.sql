CREATE TABLE `crm_activities` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`subject` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` text,
	`due_date` timestamp,
	`status` varchar(16) DEFAULT 'pending' NOT NULL,
	`assigned_to` INT,
	`customer_id` INT,
	`related_entity` jsonb,
	`reminder_sent_at` timestamp,
	`completed_at` timestamp,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_audit_logs` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`action` varchar(255) NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` INT,
	`old_value` text,
	`new_value` text,
	`user_id` INT,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm_scripts` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`script` text NOT NULL,
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT NOT NULL,
	`tag_id` INT NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pharma_products` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` numeric(10, 2),
	`stock` INT DEFAULT 0,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pharma_purchases` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customer_id` INT,
	`product_id` INT NOT NULL,
	`quantity` INT DEFAULT 1 NOT NULL,
	`unit_price` numeric(10, 2) NOT NULL,
	`total_price` numeric(10, 2) NOT NULL,
	`purchase_date` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_audit_logs` ADD CONSTRAINT `crm_audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_scripts` ADD CONSTRAINT `crm_scripts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchases` ADD CONSTRAINT `pharma_purchases_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchases` ADD CONSTRAINT `pharma_purchases_product_id_pharma_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `pharma_products`(`id`) ON DELETE no action ON UPDATE no action;