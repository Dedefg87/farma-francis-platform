CREATE TABLE "execution_data` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`execution_id` INT NOT NULL,
	`node_id` varchar(255) NOT NULL,
	`node_name` varchar(255) NOT NULL,
	`node_type` varchar(100) NOT NULL,
	`status` varchar(16) NOT NULL,
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp,
	`execution_time` INT,
	`input_data` TEXT,
	`output_data` TEXT,
	`error` TEXT,
	`retry_count` INT DEFAULT 0 NOT NULL,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `flow_execution_logs` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`execution_id` INT NOT NULL,
	`level` varchar(16) NOT NULL,
	`message` TEXT NOT NULL,
	`node_id` varchar(255),
	`timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `quick_replies` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` TEXT NOT NULL,
	`category` varchar(100),
	`created_by` INT NOT NULL,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `survey_responses` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`conversation_id` INT,
	`customer_id` INT NOT NULL,
	`rating` INT NOT NULL,
	`feedback` TEXT,
	`close_reason` varchar(50) NOT NULL,
	`agent_id` INT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `workflow_executions` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`workflow_id` INT NOT NULL,
	`status` varchar(16) NOT NULL,
	`mode` varchar(16) NOT NULL,
	`started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` timestamp,
	`execution_time` INT,
	`error` TEXT,
	`triggered_by` INT,
	`trigger_data` TEXT,
	`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE `execution_data` ADD CONSTRAINT `execution_data_execution_id_workflow_executions_id_fk` FOREIGN KEY (`execution_id") REFERENCES workflow_executions`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `flow_execution_logs` ADD CONSTRAINT `flow_execution_logs_execution_id_workflow_executions_id_fk` FOREIGN KEY (`execution_id") REFERENCES workflow_executions`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_created_by_users_id_fk` FOREIGN KEY (`created_by") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id") REFERENCES conversations`(`id`) ON DELETE set null ON UPDATE no action;ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id") REFERENCES customers`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_agent_id_users_id_fk` FOREIGN KEY (`agent_id") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id") REFERENCES visual_flows`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_triggered_by_users_id_fk` FOREIGN KEY (`triggered_by") REFERENCES users`(`id") ON DELETE no action ON UPDATE no action;