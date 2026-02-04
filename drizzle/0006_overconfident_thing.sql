CREATE TABLE `execution_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`execution_id` int NOT NULL,
	`node_id` varchar(255) NOT NULL,
	`node_name` varchar(255) NOT NULL,
	`node_type` varchar(100) NOT NULL,
	`status` enum('success','error','skipped') NOT NULL,
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp,
	`execution_time` int,
	`input_data` text,
	`output_data` text,
	`error` text,
	`retry_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `execution_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`data` text NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`status` enum('running','success','error','waiting','canceled') NOT NULL,
	`mode` enum('manual','trigger','webhook','schedule') NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`finished_at` timestamp,
	`execution_time` int,
	`error` text,
	`triggered_by` int,
	`trigger_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`cron_expression` varchar(255) NOT NULL,
	`timezone` varchar(100) NOT NULL DEFAULT 'America/Sao_Paulo',
	`is_active` int NOT NULL DEFAULT 1,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`run_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`webhook_id` varchar(255) NOT NULL,
	`path` varchar(255) NOT NULL,
	`method` enum('GET','POST','PUT','DELETE','PATCH') NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`last_triggered_at` timestamp,
	`trigger_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_webhooks_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflow_webhooks_webhook_id_unique` UNIQUE(`webhook_id`)
);
--> statement-breakpoint
ALTER TABLE `execution_data` ADD CONSTRAINT `execution_data_execution_id_workflow_executions_id_fk` FOREIGN KEY (`execution_id`) REFERENCES `workflow_executions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_credentials` ADD CONSTRAINT `workflow_credentials_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_triggered_by_users_id_fk` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_schedules` ADD CONSTRAINT `workflow_schedules_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_webhooks` ADD CONSTRAINT `workflow_webhooks_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;