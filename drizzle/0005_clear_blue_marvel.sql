CREATE TABLE `received_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('whatsapp','instagram') NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`from_number` varchar(100) NOT NULL,
	`from_name` varchar(255),
	`message_type` enum('text','image','audio','video','document','location','contact','sticker','reaction','unknown') NOT NULL,
	`message_text` text,
	`media_url` varchar(512),
	`media_id` varchar(255),
	`mime_type` varchar(100),
	`caption` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`timestamp` bigint NOT NULL,
	`raw_payload` text,
	`processed` int NOT NULL DEFAULT 0,
	`processed_at` timestamp,
	`customer_id` int,
	`ticket_id` int,
	`automation_flow_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `received_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_automation_flow_id_automation_flows_id_fk` FOREIGN KEY (`automation_flow_id`) REFERENCES `automation_flows`(`id`) ON DELETE no action ON UPDATE no action;