CREATE TABLE `account_contacts` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`account_id` INT NOT NULL,
	`contact_id` INT NOT NULL,
	`role` varchar(100),
	`is_primary` INT DEFAULT 0 NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(32),
	`address` text,
	`industry` varchar(100),
	`owner_id` INT,
	`account_number` varchar(50),
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deal_pipelines` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_active` INT DEFAULT 1 NOT NULL,
	`created_by` INT,
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deal_stages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`pipeline_id` INT NOT NULL,
	`name` varchar(255) NOT NULL,
	`order_index` INT NOT NULL,
	`description` text,
	`probability` INT,
	`color` varchar(7),
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`title` varchar(255) NOT NULL,
	`account_id` INT,
	`stage_id` INT,
	`value` numeric(10, 2),
	`close_date` timestamp,
	`description` text,
	`owner_id` INT,
	`status` varchar(16) DEFAULT 'open' NOT NULL,
	`priority` varchar(16) DEFAULT 'medium',
	`created_at` timestamp DEFAULT now() NOT NULL,
	`updated_at` timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pharma_purchase_items` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`purchase_id` INT NOT NULL,
	`product_id` INT NOT NULL,
	`quantity` INT DEFAULT 1 NOT NULL,
	`unit_price` numeric(10, 2) NOT NULL,
	`total_price` numeric(10, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_contact_id_customers_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deal_pipelines` ADD CONSTRAINT `deal_pipelines_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deal_stages` ADD CONSTRAINT `deal_stages_pipeline_id_deal_pipelines_id_fk` FOREIGN KEY (`pipeline_id`) REFERENCES `deal_pipelines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_stage_id_deal_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `deal_stages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_purchase_id_pharma_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `pharma_purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_product_id_pharma_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `pharma_products`(`id`) ON DELETE no action ON UPDATE no action;