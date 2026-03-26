CREATE TABLE `account_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`role` varchar(120),
	`is_primary` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`legal_name` varchar(255),
	`cnpj` varchar(18),
	`industry` varchar(120),
	`website` varchar(255),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zip_code` varchar(10),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`owner_user_id` int,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_pauses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`reason` text,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	CONSTRAINT `agent_pauses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_status` (
	`user_id` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'offline',
	`last_seen` timestamp NOT NULL DEFAULT (now()),
	`current_conversation_id` int,
	CONSTRAINT `agent_status_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`ticket_id` int,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('whatsapp','instagram') NOT NULL,
	`token` text NOT NULL,
	`phone_number_id` varchar(255),
	`page_id` varchar(255),
	`webhook_url` varchar(512),
	`webhook_verify_token` varchar(255),
	`app_secret` varchar(255),
	`is_active` int NOT NULL DEFAULT 1,
	`last_tested_at` timestamp,
	`test_status` enum('success','failed','not_tested') DEFAULT 'not_tested',
	`test_message` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int,
	`customer_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_key` varchar(500) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`mime_type` varchar(100),
	`file_size` int,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(100),
	`entity_id` int,
	`changes` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`channel` enum('whatsapp','instagram','both') NOT NULL,
	`trigger` text NOT NULL,
	`response` text NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`response_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `baby_shower_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mother_customer_id` int NOT NULL,
	`event_code` varchar(20) NOT NULL,
	`event_name` varchar(255) NOT NULL,
	`baby_name` varchar(255),
	`expected_due_date` date,
	`event_date` date,
	`status` enum('active','closed','cancelled') NOT NULL DEFAULT 'active',
	`whatsapp_number` varchar(20),
	`wallet_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total_diapers_count` int DEFAULT 0,
	`available_diapers_count` int DEFAULT 0,
	`target_amount` decimal(12,2),
	`total_guests` int DEFAULT 0,
	`public_link` varchar(500),
	`welcome_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closed_at` timestamp,
	CONSTRAINT `baby_shower_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `baby_shower_events_event_code_unique` UNIQUE(`event_code`)
);
--> statement-breakpoint
CREATE TABLE `baby_shower_gift_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`package_name` varchar(120) NOT NULL,
	`description` text,
	`image_url` text,
	`gift_type` enum('diapers','wipes','money','product') NOT NULL DEFAULT 'diapers',
	`quantity_represented` int DEFAULT 1,
	`size_label` varchar(20),
	`price` decimal(10,2) NOT NULL,
	`stock_limit` int,
	`sold_count` int DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`display_order` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `baby_shower_gift_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `baby_shower_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`package_id` int NOT NULL,
	`guest_customer_id` int,
	`guest_name` varchar(255) NOT NULL,
	`guest_phone` varchar(20),
	`guest_email` varchar(320),
	`message_to_parents` text,
	`payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`amount_paid` decimal(10,2) NOT NULL,
	`payment_method` varchar(50),
	`payment_reference` varchar(255),
	`paid_at` timestamp,
	`notification_sent` int DEFAULT 0,
	`notification_sent_at` timestamp,
	`confirmation_token` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `baby_shower_purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `baby_shower_purchases_confirmation_token_unique` UNIQUE(`confirmation_token`)
);
--> statement-breakpoint
CREATE TABLE `baby_shower_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`related_task_id` int,
	`withdrawal_type` enum('diapers','wipes','money') NOT NULL DEFAULT 'diapers',
	`diaper_size` varchar(20),
	`quantity` int NOT NULL,
	`requested_at` timestamp NOT NULL DEFAULT (now()),
	`fulfilled_at` timestamp,
	`status` enum('requested','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'requested',
	`fulfilled_by` int,
	`delivery_method` enum('pickup','delivery') NOT NULL DEFAULT 'pickup',
	`notes` text,
	CONSTRAINT `baby_shower_withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_list_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`list_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcast_list_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdBy` int NOT NULL,
	`status` enum('active','paused','deleted') NOT NULL DEFAULT 'active',
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broadcast_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_members_sent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`error_message` text,
	`sent_at` timestamp,
	`delivered_at` timestamp,
	`read_at` timestamp,
	CONSTRAINT `broadcast_members_sent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcast_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`list_id` int NOT NULL,
	`content` text NOT NULL,
	`caption` text,
	`file_url` text,
	`file_name` text,
	`file_type` text,
	`file_size` int,
	`sender_id` int NOT NULL,
	`sender_type` varchar(50) NOT NULL DEFAULT 'agent',
	`total_recipients` int NOT NULL,
	`successful_sends` int DEFAULT 0,
	`failed_sends` int DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'sending',
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`error_message` text,
	CONSTRAINT `broadcast_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`external_id` varchar(255),
	`remote_jid` varchar(255),
	`provider` enum('whatsapp','instagram') DEFAULT 'whatsapp',
	`sender_id` int,
	`sender_type` enum('agent','customer') NOT NULL,
	`content` text NOT NULL,
	`file_url` longtext,
	`file_name` varchar(255),
	`file_type` varchar(100),
	`file_size` int,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` varchar(200) NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int,
	`customer_name` varchar(255),
	`customer_phone` varchar(50),
	`queue_id` int,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`status` enum('open','assigned','closed') NOT NULL DEFAULT 'open',
	`assigned_to` int,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`close_reason` enum('venda','orcamento','conversa_anterior','engano'),
	`last_message_at` timestamp NOT NULL DEFAULT (now()),
	`unread_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` int NOT NULL,
	`activity_type` varchar(40) NOT NULL,
	`title` varchar(255),
	`body` text,
	`metadata_json` text,
	`actor_user_id` int,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` int,
	`actor_user_id` int,
	`before_json` text,
	`after_json` text,
	`request_id` varchar(80),
	`ip` varchar(80),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_outbox_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_name` varchar(120) NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` int,
	`actor_user_id` int,
	`payload_json` text,
	`idempotency_key` varchar(120),
	`status` enum('pending','processed','failed') NOT NULL DEFAULT 'pending',
	`error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`processed_at` timestamp,
	CONSTRAINT `crm_outbox_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_scripts` (
	`code` varchar(50) NOT NULL,
	`name` varchar(120) NOT NULL,
	`template` text NOT NULL,
	`variables_json` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_scripts_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`due_at` timestamp,
	`status` enum('open','done','cancelled') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`related_entity_type` varchar(40),
	`related_entity_id` int,
	`assigned_to` int,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`key` varchar(80) NOT NULL,
	`label` varchar(120) NOT NULL,
	`field_type` enum('text','number','date','boolean','select') NOT NULL,
	`options_json` text,
	`is_required` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_field_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` int NOT NULL,
	`field_definition_id` int NOT NULL,
	`value_text` text,
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_field_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`tag_id` int NOT NULL,
	`added_by` int,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_treatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`nome_medicamento` varchar(255) NOT NULL,
	`posologia_diaria` int NOT NULL,
	`qtd_caixa` int NOT NULL,
	`data_ultima_compra` timestamp,
	`data_fim_previsto` timestamp,
	`observacoes` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_treatments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(255),
	`photoUrl` text,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`notes` text,
	`source` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deal_pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_pipelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deal_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipeline_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`probability` int NOT NULL DEFAULT 0,
	`is_won` int NOT NULL DEFAULT 0,
	`is_lost` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deal_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int,
	`customer_id` int,
	`pipeline_id` int NOT NULL,
	`stage_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`amount_cents` int,
	`currency` varchar(3) DEFAULT 'BRL',
	`close_date` timestamp,
	`status` enum('open','won','lost') NOT NULL DEFAULT 'open',
	`owner_user_id` int,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`position` varchar(100),
	`department` varchar(100),
	`hire_date` timestamp,
	`status` enum('active','inactive','vacation') NOT NULL DEFAULT 'active',
	`skills` text,
	`photo_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `employees_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
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
CREATE TABLE `frontend_telemetry_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`page` varchar(160),
	`event_name` varchar(120) NOT NULL,
	`payload_json` text,
	`occurred_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `frontend_telemetry_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integration_type` enum('whatsapp_business','instagram_graph','evolution_api','telegram','email') NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`config` json NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_tested_at` timestamp,
	`test_status` enum('success','failed','pending') DEFAULT 'pending',
	`test_message` text,
	CONSTRAINT `integration_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`ticket_id` int,
	`lead_id` int,
	`type` enum('call','email','whatsapp','instagram','meeting','note') NOT NULL,
	`subject` varchar(255),
	`content` text,
	`user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `internal_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`sender_id` int NOT NULL,
	`recipient_id` int NOT NULL,
	`content` text NOT NULL,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `internal_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`source` varchar(100),
	`stage` enum('prospect','qualified','proposal','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'prospect',
	`value` int,
	`assigned_to` int,
	`follow_up_date` timestamp,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int,
	`ticket_id` int,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`content` text NOT NULL,
	`message_id` varchar(255),
	`status` enum('sent','delivered','read','failed'),
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`type` enum('ticket','lead','system','goal') NOT NULL,
	`is_read` int NOT NULL DEFAULT 0,
	`related_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharma_products` (
	`ean` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('medicamento','perfumaria','outros') DEFAULT 'outros',
	`substance` varchar(255),
	`days_duration` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharma_products_ean` PRIMARY KEY(`ean`)
);
--> statement-breakpoint
CREATE TABLE `pharma_purchase_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`product_ean` varchar(32),
	`product_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(12,2) DEFAULT '0',
	CONSTRAINT `pharma_purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharma_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`external_id` varchar(80),
	`purchase_date` timestamp NOT NULL DEFAULT (now()),
	`total_value` decimal(12,2) DEFAULT '0',
	`channel` enum('loja','delivery','whatsapp','outros') DEFAULT 'outros',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharma_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processed_webhook_messages` (
	`id` varchar(255) NOT NULL,
	`processed_at` timestamp NOT NULL DEFAULT (now()),
	`provider` varchar(16),
	CONSTRAINT `processed_webhook_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queue_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queue_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queue_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queue_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`channel` enum('whatsapp','instagram') NOT NULL,
	`max_wait_minutes` int NOT NULL DEFAULT 15,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queue_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`channel` varchar(16) NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `received_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('whatsapp','instagram') NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`from_number` varchar(100) NOT NULL,
	`from_name` varchar(255),
	`message_type` enum('text','image','audio','video','document','location','contact','sticker','reaction','unknown') NOT NULL,
	`message_text` text,
	`media_url` longtext,
	`media_id` varchar(255),
	`mime_type` varchar(100),
	`caption` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`timestamp` text NOT NULL,
	`raw_payload` longtext,
	`processed` int NOT NULL DEFAULT 0,
	`processed_at` timestamp,
	`customer_id` int,
	`ticket_id` int,
	`automation_flow_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `received_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int,
	`customer_id` int NOT NULL,
	`rating` int NOT NULL,
	`feedback` text,
	`close_reason` varchar(50) NOT NULL,
	`agent_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`icon` varchar(50),
	`description` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`user_id` int,
	`content` text NOT NULL,
	`is_internal` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_number` varchar(50) NOT NULL,
	`customer_id` int,
	`subject` varchar(255) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','pending','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`category` varchar(100),
	`channel` enum('whatsapp','instagram','email','phone','web'),
	`assigned_to` int,
	`sla_deadline` timestamp,
	`resolved_at` timestamp,
	`closed_at` timestamp,
	`time_spent_minutes` int DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
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
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`open_id` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`password_hash` varchar(255),
	`login_method` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_signed_in` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_open_id_unique` UNIQUE(`open_id`)
);
--> statement-breakpoint
CREATE TABLE `visual_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`flow_data` text NOT NULL,
	`is_active` int NOT NULL DEFAULT 0,
	`is_test_mode` int NOT NULL DEFAULT 0,
	`execution_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visual_flows_id` PRIMARY KEY(`id`)
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
CREATE TABLE `flow_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flow_id` int NOT NULL,
	`status` varchar(16) NOT NULL,
	`trigger_type` varchar(32),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`finished_at` timestamp,
	`input` text,
	`error` text,
	CONSTRAINT `flow_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_contacts` ADD CONSTRAINT `account_contacts_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_pauses` ADD CONSTRAINT `agent_pauses_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_chats` ADD CONSTRAINT `ai_chats_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_chats` ADD CONSTRAINT `ai_chats_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_configurations` ADD CONSTRAINT `api_configurations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_flows` ADD CONSTRAINT `automation_flows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_events` ADD CONSTRAINT `baby_shower_events_mother_customer_id_customers_id_fk` FOREIGN KEY (`mother_customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_gift_packages` ADD CONSTRAINT `baby_shower_gift_packages_event_id_baby_shower_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_event_id_baby_shower_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_package_id_baby_shower_gift_packages_id_fk` FOREIGN KEY (`package_id`) REFERENCES `baby_shower_gift_packages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_guest_customer_id_customers_id_fk` FOREIGN KEY (`guest_customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_withdrawals` ADD CONSTRAINT `baby_shower_withdrawals_event_id_baby_shower_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `baby_shower_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_withdrawals` ADD CONSTRAINT `baby_shower_withdrawals_related_task_id_crm_tasks_id_fk` FOREIGN KEY (`related_task_id`) REFERENCES `crm_tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `baby_shower_withdrawals` ADD CONSTRAINT `baby_shower_withdrawals_fulfilled_by_users_id_fk` FOREIGN KEY (`fulfilled_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_list_id_broadcast_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_lists` ADD CONSTRAINT `broadcast_lists_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_list_id_broadcast_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_tags` ADD CONSTRAINT `conversation_tags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_queue_id_queues_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_audit_logs` ADD CONSTRAINT `crm_audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_outbox_events` ADD CONSTRAINT `crm_outbox_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_scripts` ADD CONSTRAINT `crm_scripts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_field_definitions` ADD CONSTRAINT `custom_field_definitions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_field_values` ADD CONSTRAINT `custom_field_values_field_definition_id_custom_field_definitions_id_fk` FOREIGN KEY (`field_definition_id`) REFERENCES `custom_field_definitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_field_values` ADD CONSTRAINT `custom_field_values_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_tags` ADD CONSTRAINT `customer_tags_added_by_users_id_fk` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_treatments` ADD CONSTRAINT `customer_treatments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deal_pipelines` ADD CONSTRAINT `deal_pipelines_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deal_stages` ADD CONSTRAINT `deal_stages_pipeline_id_deal_pipelines_id_fk` FOREIGN KEY (`pipeline_id`) REFERENCES `deal_pipelines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_pipeline_id_deal_pipelines_id_fk` FOREIGN KEY (`pipeline_id`) REFERENCES `deal_pipelines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_stage_id_deal_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `deal_stages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `execution_data` ADD CONSTRAINT `execution_data_execution_id_workflow_executions_id_fk` FOREIGN KEY (`execution_id`) REFERENCES `workflow_executions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `frontend_telemetry_events` ADD CONSTRAINT `frontend_telemetry_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integration_settings` ADD CONSTRAINT `integration_settings_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_messages` ADD CONSTRAINT `internal_messages_recipient_id_users_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_purchase_id_pharma_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `pharma_purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchase_items` ADD CONSTRAINT `pharma_purchase_items_product_ean_pharma_products_ean_fk` FOREIGN KEY (`product_ean`) REFERENCES `pharma_products`(`ean`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharma_purchases` ADD CONSTRAINT `pharma_purchases_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_queue_id_queues_id_fk` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_agents` ADD CONSTRAINT `queue_agents_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_automation_flow_id_automation_flows_id_fk` FOREIGN KEY (`automation_flow_id`) REFERENCES `automation_flows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `tags_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_tags` ADD CONSTRAINT `ticket_tags_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ura_menus` ADD CONSTRAINT `ura_menus_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visual_flows` ADD CONSTRAINT `visual_flows_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_credentials` ADD CONSTRAINT `workflow_credentials_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_executions` ADD CONSTRAINT `workflow_executions_triggered_by_users_id_fk` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_schedules` ADD CONSTRAINT `workflow_schedules_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_webhooks` ADD CONSTRAINT `workflow_webhooks_workflow_id_visual_flows_id_fk` FOREIGN KEY (`workflow_id`) REFERENCES `visual_flows`(`id`) ON DELETE no action ON UPDATE no action;