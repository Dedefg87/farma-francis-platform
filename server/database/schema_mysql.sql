SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT,
  `open_id` VARCHAR (64) NOT NULL,
  `name` TEXT,
  `email` VARCHAR (320),
  `password_hash` VARCHAR (255),
  `login_method` VARCHAR (64),
  `role` VARCHAR (16) NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_signed_in` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `phone` VARCHAR (32) NOT NULL,
  `email` VARCHAR (255),
  `photo_url` TEXT,
  `status` VARCHAR (32) NOT NULL DEFAULT 'active',
  `notes` TEXT,
  `source` VARCHAR (64),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `received_messages` (
  `id` INT AUTO_INCREMENT,
  `provider` VARCHAR (16) NOT NULL,
  `external_id` VARCHAR (255) NOT NULL,
  `from_number` TEXT NOT NULL,
  `from_name` TEXT,
  `customerId` INT,
  `message_type` VARCHAR (32),
  `message_text` TEXT,
  `caption` TEXT,
  `latitude` TEXT,
  `longitude` TEXT,
  `media_url` TEXT,
  `media_id` TEXT,
  `mime_type` TEXT,
  `file_name` TEXT,
  `fileSize` INT,
  `raw_payload` JSON,
  `processed` INT DEFAULT 0,
  `processed_at` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `customer_phone` VARCHAR (32) NOT NULL,
  `customer_name` VARCHAR (255),
  `channel` VARCHAR (16) NOT NULL,
  `status` VARCHAR (16) NOT NULL DEFAULT 'open',
  `assignedTo` INT,
  `queueId` INT,
  `opened_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_message_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unreadCount` INT NOT NULL DEFAULT 0,
  `closed_at` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversation_messages` (
  `id` INT AUTO_INCREMENT,
  `conversationId` INT NOT NULL,
  `senderId` INT,
  `sender_type` VARCHAR (16) NOT NULL,
  `message_type` VARCHAR (32) NOT NULL,
  `content` TEXT,
  `file_url` TEXT,
  `file_name` TEXT,
  `fileSize` INT,
  `file_type` VARCHAR (100),
  `latitude` TEXT,
  `longitude` TEXT,
  `external_id` VARCHAR (255),
  `provider` VARCHAR (16),
  `read_at` TIMESTAMP,
  `remote_jid` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agent_status` (
  `userId` INT,
  `status` VARCHAR (16) NOT NULL DEFAULT "offline",
  `last_seen` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `currentConversationId` INT,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agent_pauses` (
  `id` INT AUTO_INCREMENT,
  `agentId` INT NOT NULL,
  `reason` VARCHAR (255),
  `status` VARCHAR (16) NOT NULL DEFAULT 'active',
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queues` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (100) NOT NULL,
  `description` TEXT,
  `channel` VARCHAR (16) NOT NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `status` VARCHAR (16) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `broadcast_lists` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `createdBy` INT NOT NULL,
  `last_sent_at` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `broadcast_list_members` (
  `id` INT AUTO_INCREMENT,
  `listId` INT NOT NULL,
  `customerId` INT NOT NULL,
  `added_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `broadcast_messages` (
  `id` INT AUTO_INCREMENT,
  `listId` INT NOT NULL,
  `content` TEXT NOT NULL,
  `file_url` TEXT,
  `file_name` TEXT,
  `file_type` TEXT,
  `fileSize` INT,
  `sentBy` INT NOT NULL,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `totalRecipients` INT DEFAULT 0,
  `successfulSends` INT DEFAULT 0,
  `failedSends` INT DEFAULT 0,
  `status` VARCHAR (50) DEFAULT "pending",
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `broadcast_members_sent` (
  `id` INT AUTO_INCREMENT,
  `messageId` INT NOT NULL,
  `customerId` INT NOT NULL,
  `phone` VARCHAR (32) NOT NULL,
  `status` VARCHAR (16) NOT NULL DEFAULT "pending",
  `error` TEXT,
  `sent_at` TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `integration_settings` (
  `id` INT AUTO_INCREMENT,
  `integration_type` VARCHAR (64) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `config` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baby_shower_events` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `event_date` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baby_shower_products` (
  `id` INT AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `image_url` TEXT,
  `price` DECIMAL (10, 2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `sold` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baby_shower_purchases` (
  `id` INT AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `productId` INT NOT NULL,
  `customerId` INT,
  `customer_name` VARCHAR (255),
  `customer_phone` VARCHAR (32),
  `quantity` INT NOT NULL DEFAULT 1,
  `total_amount` DECIMAL (10, 2) NOT NULL,
  `message` TEXT,
  `whatsapp_number` VARCHAR (32),
  `status` VARCHAR (16) NOT NULL DEFAULT "pending",
  `paid_at` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baby_shower_withdrawals` (
  `id` INT AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `relatedTaskId` INT,
  `withdrawal_type` VARCHAR (50) NOT NULL,
  `diaper_size` VARCHAR (50),
  `quantity` INT NOT NULL,
  `delivery_method` VARCHAR (50),
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leads` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT,
  `name` VARCHAR (255) NOT NULL,
  `email` VARCHAR (320),
  `phone` VARCHAR (20),
  `source` VARCHAR (100),
  `stage` VARCHAR (32) NOT NULL DEFAULT "prospect",
  `value` INT,
  `assignedTo` INT,
  `follow_up_date` TIMESTAMP,
  `notes` TEXT,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tickets` (
  `id` INT AUTO_INCREMENT,
  `ticket_number` VARCHAR (50) NOT NULL,
  `customerId` INT,
  `subject` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `status` VARCHAR (32) NOT NULL DEFAULT 'open',
  `priority` VARCHAR (16) NOT NULL DEFAULT "medium",
  `category` VARCHAR (100),
  `channel` VARCHAR (16),
  `assignedTo` INT,
  `sla_deadline` TIMESTAMP,
  `resolved_at` TIMESTAMP,
  `closed_at` TIMESTAMP,
  `timeSpentMinutes` INT DEFAULT 0,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT,
  `ticketId` INT,
  `channel` VARCHAR (16) NOT NULL,
  `direction` VARCHAR (16) NOT NULL,
  `content` TEXT NOT NULL,
  `message_id` VARCHAR (255),
  `status` VARCHAR (32),
  `metadata` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `automation_flows` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `channel` VARCHAR (16) NOT NULL,
  `trigger` TEXT NOT NULL,
  `response` TEXT NOT NULL,
  `isActive` INT NOT NULL DEFAULT 1,
  `responseCount` INT NOT NULL DEFAULT 0,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visual_flows` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `flow_data` TEXT NOT NULL,
  `template_type` VARCHAR (50),
  `tags` JSON,
  `isActive` INT NOT NULL DEFAULT 0,
  `isTestMode` INT NOT NULL DEFAULT 0,
  `executionCount` INT NOT NULL DEFAULT 0,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ura_menus` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `welcome_message` TEXT NOT NULL,
  `menu_data` TEXT NOT NULL,
  `working_hours` TEXT,
  `off_hours_message` TEXT,
  `isActive` INT NOT NULL DEFAULT 1,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workflow_executions` (
  `id` INT AUTO_INCREMENT,
  `workflowId` INT NOT NULL,
  `status` VARCHAR (16) NOT NULL,
  `mode` VARCHAR (16) NOT NULL,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` TIMESTAMP,
  `executionTime` INT,
  `error` TEXT,
  `triggeredBy` INT,
  `trigger_data` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `flow_executions` (
  `id` INT AUTO_INCREMENT,
  `flowId` INT NOT NULL,
  `status` VARCHAR (16) NOT NULL,
  `trigger` JSON NOT NULL,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` TIMESTAMP,
  `input` JSON,
  `error` TEXT,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `execution_data` (
  `id` INT AUTO_INCREMENT,
  `executionId` INT NOT NULL,
  `node_id` VARCHAR (255) NOT NULL,
  `node_name` VARCHAR (255) NOT NULL,
  `node_type` VARCHAR (100) NOT NULL,
  `status` VARCHAR (16) NOT NULL,
  `started_at` TIMESTAMP NOT NULL,
  `finished_at` TIMESTAMP,
  `executionTime` INT,
  `input_data` TEXT,
  `output_data` TEXT,
  `error` TEXT,
  `retryCount` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `survey_responses` (
  `id` INT AUTO_INCREMENT,
  `conversationId` INT,
  `customerId` INT NOT NULL,
  `rating` INT NOT NULL,
  `feedback` TEXT,
  `close_reason` VARCHAR (50) NOT NULL,
  `agentId` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quick_replies` (
  `id` INT AUTO_INCREMENT,
  `title` VARCHAR (255) NOT NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR (100),
  `createdBy` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_audit_logs` (
  `id` INT AUTO_INCREMENT,
  `action` VARCHAR (255) NOT NULL,
  `entity_type` VARCHAR (100) NOT NULL,
  `entityId` INT,
  `old_value` TEXT,
  `new_value` TEXT,
  `userId` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_activities` (
  `id` INT AUTO_INCREMENT,
  `subject` VARCHAR (255) NOT NULL,
  `type` VARCHAR (50) NOT NULL,
  `description` TEXT,
  `due_date` TIMESTAMP,
  `status` VARCHAR (16) NOT NULL DEFAULT "pending",
  `assignedTo` INT,
  `customerId` INT,
  `related_entity` JSON,
  `reminder_sent_at` TIMESTAMP,
  `completed_at` TIMESTAMP,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_tags` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `tagId` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_scripts` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `script` TEXT NOT NULL,
  `isActive` INT NOT NULL DEFAULT 1,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `custom_field_definitions` (
  `id` INT AUTO_INCREMENT,
  `entity_type` VARCHAR (40) NOT NULL,
  `field_name` VARCHAR (100) NOT NULL,
  `field_type` VARCHAR (20) NOT NULL,
  `label` VARCHAR (255) NOT NULL,
  `isActive` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `custom_field_values` (
  `id` INT AUTO_INCREMENT,
  `entity_type` VARCHAR (40) NOT NULL,
  `entityId` INT NOT NULL,
  `fieldDefinitionId` INT NOT NULL,
  `value_text` TEXT,
  `updatedBy` INT,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pharma_products` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL (10, 2),
  `stock` INT DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pharma_purchases` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT,
  `productId` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL (10, 2) NOT NULL,
  `total_price` DECIMAL (10, 2) NOT NULL,
  `purchase_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pharma_purchase_items` (
  `id` INT AUTO_INCREMENT,
  `purchaseId` INT NOT NULL,
  `productId` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL (10, 2) NOT NULL,
  `total_price` DECIMAL (10, 2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `accounts` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `email` VARCHAR (255),
  `phone` VARCHAR (32),
  `address` TEXT,
  `industry` VARCHAR (100),
  `ownerId` INT,
  `account_number` VARCHAR (50),
  `isActive` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `account_contacts` (
  `id` INT AUTO_INCREMENT,
  `accountId` INT NOT NULL,
  `contactId` INT NOT NULL,
  `role` VARCHAR (100),
  `isPrimary` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deal_pipelines` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `isActive` INT NOT NULL DEFAULT 1,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deal_stages` (
  `id` INT AUTO_INCREMENT,
  `pipelineId` INT NOT NULL,
  `name` VARCHAR (255) NOT NULL,
  `orderIndex` INT NOT NULL,
  `description` TEXT,
  `probability` INT,
  `color` VARCHAR (7),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deals` (
  `id` INT AUTO_INCREMENT,
  `title` VARCHAR (255) NOT NULL,
  `accountId` INT,
  `stageId` INT,
  `value` DECIMAL (10, 2),
  `close_date` TIMESTAMP,
  `description` TEXT,
  `ownerId` INT,
  `status` VARCHAR (16) NOT NULL DEFAULT 'open',
  `priority` VARCHAR (16) DEFAULT "medium",
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `api_configurations` (
  `id` INT AUTO_INCREMENT,
  `provider` VARCHAR (16) NOT NULL,
  `token` TEXT NOT NULL,
  `phone_number_id` VARCHAR (255),
  `page_id` VARCHAR (255),
  `webhook_url` VARCHAR (512),
  `webhook_verify_token` VARCHAR (255),
  `app_secret` VARCHAR (255),
  `isActive` INT NOT NULL DEFAULT 1,
  `last_tested_at` TIMESTAMP,
  `test_status` VARCHAR (16) DEFAULT "not_tested",
  `test_message` TEXT,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baby_shower_gift_packages` (
  `id` INT AUTO_INCREMENT,
  `eventId` INT NOT NULL,
  `name` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `product_ids` JSON NOT NULL,
  `price` DECIMAL (10, 2) NOT NULL,
  `discount_percent` DECIMAL (5, 2) DEFAULT "0",
  `isActive` INT NOT NULL DEFAULT 1,
  `createdBy` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversation_tags` (
  `id` INT AUTO_INCREMENT,
  `conversationId` INT NOT NULL,
  `tag` VARCHAR (64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_outbox_events` (
  `id` INT AUTO_INCREMENT,
  `event_type` VARCHAR (64) NOT NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR (16) NOT NULL DEFAULT "pending",
  `attempts` INT NOT NULL DEFAULT 0,
  `last_error` TEXT,
  `scheduled_at` TIMESTAMP NOT NULL,
  `processed_at` TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_tasks` (
  `id` INT AUTO_INCREMENT,
  `title` VARCHAR (255) NOT NULL,
  `description` TEXT,
  `customerId` INT,
  `assignedTo` INT,
  `due_date` TIMESTAMP,
  `priority` VARCHAR (16) DEFAULT "medium",
  `status` VARCHAR (16) NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_treatments` (
  `id` INT AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `treatment_type` VARCHAR (100) NOT NULL,
  `description` TEXT,
  `medication` TEXT,
  `start_date` TIMESTAMP,
  `end_date` TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `id` INT AUTO_INCREMENT,
  `userId` INT,
  `department` VARCHAR (100),
  `position` VARCHAR (100),
  `hire_date` TIMESTAMP,
  `salary` DECIMAL (10, 2),
  `status` VARCHAR (16) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `frontend_telemetry_events` (
  `id` INT AUTO_INCREMENT,
  `event_name` VARCHAR (255) NOT NULL,
  `properties` JSON,
  `userId` INT,
  `session_id` VARCHAR (255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `queue_agents` (
  `id` INT AUTO_INCREMENT,
  `queueId` INT NOT NULL,
  `agentId` INT NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tags` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR (100) NOT NULL,
  `color` VARCHAR (7),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ticket_tags` (
  `id` INT AUTO_INCREMENT,
  `ticketId` INT NOT NULL,
  `tagId` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Foreign Keys
ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_current_conversation_id_fk` FOREIGN KEY (`current_conversation_id`) REFERENCES `conversations`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `agent_pauses` ADD CONSTRAINT `agent_pauses_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_products` ADD CONSTRAINT `baby_shower_products_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `baby_shower_products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `broadcast_lists` ADD CONSTRAINT `broadcast_lists_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `broadcast_members_sent` ADD CONSTRAINT `broadcast_members_sent_message_id_fk` FOREIGN KEY (`message_id`) REFERENCES `broadcast_messages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `broadcast_members_sent` ADD CONSTRAINT `broadcast_members_sent_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_sent_by_fk` FOREIGN KEY (`sent_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_sender_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_queue_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_withdrawals` ADD CONSTRAINT `baby_shower_withdrawals_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_withdrawals` ADD CONSTRAINT `baby_shower_withdrawals_related_task_id_fk` FOREIGN KEY (`related_task_id`) REFERENCES `crm_tasks`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `leads` ADD CONSTRAINT `leads_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `leads` ADD CONSTRAINT `leads_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `messages` ADD CONSTRAINT `messages_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `messages` ADD CONSTRAINT `messages_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `automation_flows` ADD CONSTRAINT `automation_flows_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `visual_flows` ADD CONSTRAINT `visual_flows_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `ura_menus` ADD CONSTRAINT `ura_menus_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_workflow_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_triggered_by_fk` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `execution_data` ADD CONSTRAINT `execution_data_execution_id_fk` FOREIGN KEY (`execution_id`) REFERENCES `workflow_executions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `crm_audit_logs` ADD CONSTRAINT `crm_audit_logs_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_tag_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `crm_scripts` ADD CONSTRAINT `crm_scripts_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `custom_field_values` ADD CONSTRAINT `custom_field_values_field_definition_id_fk` FOREIGN KEY (`field_definition_id`) REFERENCES `custom_field_definitions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `pharma_purchases` ADD CONSTRAINT `pharma_purchases_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pharma_purchases` ADD CONSTRAINT `pharma_purchases_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `pharma_products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_purchase_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `pharma_purchases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `pharma_products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_owner_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_contact_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `deal_pipelines` ADD CONSTRAINT `deal_pipelines_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `deal_stages` ADD CONSTRAINT `deal_stages_pipeline_id_fk` FOREIGN KEY (`pipeline_id`) REFERENCES `deal_pipelines`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `deals` ADD CONSTRAINT `deals_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `deals` ADD CONSTRAINT `deals_stage_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `deal_stages`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `deals` ADD CONSTRAINT `deals_owner_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `baby_shower_gift_packages` ADD CONSTRAINT `baby_shower_gift_packages_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `customer_treatments` ADD CONSTRAINT `customer_treatments_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_queue_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_tag_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
