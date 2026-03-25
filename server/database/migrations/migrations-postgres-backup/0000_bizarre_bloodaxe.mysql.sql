CREATE TABLE "agent_pauses` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`agentId` INT NOT NULL,
	`reason` varchar(255),
	`status` varchar(16) DEFAULT 'active' NOT NULL,
	`startedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`endedAt` timestamp
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `agent_status` (
	`userId` INT PRIMARY KEY NOT NULL,
	`status` varchar(16) DEFAULT 'offline' NOT NULL,
	`lastSeen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`currentConversationId` INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `baby_shower_events` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` TEXT,
	`eventDate` timestamp NOT NULL,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `baby_shower_products` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`eventId` INT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` TEXT,
	`imageUrl` TEXT,
	`price` numeric(10, 2) NOT NULL,
	`stock` INT DEFAULT 0 NOT NULL,
	`sold` INT DEFAULT 0 NOT NULL,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `baby_shower_purchases` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`eventId` INT NOT NULL,
	`productId` INT NOT NULL,
	`customerId` INT,
	`customerName` varchar(255),
	`customerPhone` varchar(32),
	`quantity` INT DEFAULT 1 NOT NULL,
	`totalAmount` numeric(10, 2) NOT NULL,
	`message` TEXT,
	`whatsappNumber` varchar(32),
	`status` varchar(16) DEFAULT 'pending' NOT NULL,
	`paidAt` timestamp,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `broadcast_list_members` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`listId` INT NOT NULL,
	`customerId` INT NOT NULL,
	`addedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `broadcast_lists` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` TEXT,
	`createdBy` INT NOT NULL,
	`lastSentAt` timestamp,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `broadcast_members_sent` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`messageId` INT NOT NULL,
	`customerId` INT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`status` varchar(16) DEFAULT 'pending' NOT NULL,
	`error` TEXT,
	`sentAt` timestamp
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `broadcast_messages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`listId` INT NOT NULL,
	`content` TEXT NOT NULL,
	`fileUrl` TEXT,
	`fileName` TEXT,
	`fileType` TEXT,
	`fileSize` INT,
	`sentBy` INT NOT NULL,
	`sentAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `conversation_messages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`conversationId` INT NOT NULL,
	`senderId` INT,
	`senderType` varchar(16) NOT NULL,
	`messageType` varchar(32) NOT NULL,
	`content` TEXT,
	`fileUrl` TEXT,
	`fileName` TEXT,
	`fileSize` INT,
	`mimeType` TEXT,
	`latitude` TEXT,
	`longitude` TEXT,
	`externalId` varchar(255),
	`provider` varchar(16),
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `conversations` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`customerId` INT NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`channel` varchar(16) NOT NULL,
	`status` varchar(16) DEFAULT 'open' NOT NULL,
	`assignedTo` INT,
	`queueId` INT,
	`lastActivityAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closedAt` timestamp,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `customers` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` TEXT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(255),
	`photoUrl` TEXT,
	`status` varchar(32) DEFAULT 'active' NOT NULL,
	`notes` TEXT,
	`source` varchar(64),
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `integration_settings` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`integrationType` varchar(64) NOT NULL,
	`isActive` TINYINT(1) DEFAULT true NOT NULL,
	`config` JSON NOT NULL,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `queues` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` TEXT,
	`channel` varchar(16) NOT NULL,
	`priority` INT DEFAULT 0 NOT NULL,
	`status` varchar(16) DEFAULT 'active' NOT NULL,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `received_messages` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`provider` varchar(16) NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`fromNumber` TEXT NOT NULL,
	`fromName` TEXT,
	`customerId` INT,
	`messageType` varchar(32),
	`messageText` TEXT,
	`caption` TEXT,
	`latitude` TEXT,
	`longitude` TEXT,
	`mediaUrl` TEXT,
	`mediaId` TEXT,
	`mimeType` TEXT,
	`fileName` TEXT,
	`fileSize` INT,
	`rawPayload` JSON,
	`processed` INT DEFAULT 0,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `users` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` TEXT,
	`email` varchar(320),
	`passwordHash` varchar(255),
	`loginMethod` varchar(64),
	`role` varchar(16) DEFAULT 'user' NOT NULL,
	`createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lastSignedIn` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE `agent_pauses` ADD CONSTRAINT `agent_pauses_agentId_users_id_fk` FOREIGN KEY (`agentId") REFERENCES users`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_userId_users_id_fk` FOREIGN KEY (`userId") REFERENCES users`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `agent_status` ADD CONSTRAINT `agent_status_currentConversationId_conversations_id_fk` FOREIGN KEY (`currentConversationId") REFERENCES conversations`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `baby_shower_products` ADD CONSTRAINT `baby_shower_products_eventId_baby_shower_events_id_fk` FOREIGN KEY (`eventId") REFERENCES baby_shower_events`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_eventId_baby_shower_events_id_fk` FOREIGN KEY (`eventId") REFERENCES baby_shower_events`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_productId_baby_shower_products_id_fk` FOREIGN KEY (`productId") REFERENCES baby_shower_products`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `baby_shower_purchases` ADD CONSTRAINT `baby_shower_purchases_customerId_customers_id_fk` FOREIGN KEY (`customerId") REFERENCES customers`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_listId_broadcast_lists_id_fk` FOREIGN KEY (`listId") REFERENCES broadcast_lists`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `broadcast_list_members` ADD CONSTRAINT `broadcast_list_members_customerId_customers_id_fk` FOREIGN KEY (`customerId") REFERENCES customers`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `broadcast_lists` ADD CONSTRAINT `broadcast_lists_createdBy_users_id_fk` FOREIGN KEY (`createdBy") REFERENCES users`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `broadcast_members_sent` ADD CONSTRAINT `broadcast_members_sent_messageId_broadcast_messages_id_fk` FOREIGN KEY (`messageId") REFERENCES broadcast_messages`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `broadcast_members_sent` ADD CONSTRAINT `broadcast_members_sent_customerId_customers_id_fk` FOREIGN KEY (`customerId") REFERENCES customers`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_listId_broadcast_lists_id_fk` FOREIGN KEY (`listId") REFERENCES broadcast_lists`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `broadcast_messages` ADD CONSTRAINT `broadcast_messages_sentBy_users_id_fk` FOREIGN KEY (`sentBy") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId") REFERENCES conversations`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_senderId_users_id_fk` FOREIGN KEY (`senderId") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `conversations` ADD CONSTRAINT `conversations_customerId_customers_id_fk` FOREIGN KEY (`customerId") REFERENCES customers`(`id`) ON DELETE cascade ON UPDATE no action;ALTER TABLE `conversations` ADD CONSTRAINT `conversations_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo") REFERENCES users`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `conversations` ADD CONSTRAINT `conversations_queueId_queues_id_fk` FOREIGN KEY (`queueId") REFERENCES queues`(`id`) ON DELETE no action ON UPDATE no action;ALTER TABLE `received_messages` ADD CONSTRAINT `received_messages_customerId_customers_id_fk` FOREIGN KEY (`customerId") REFERENCES customers`(`id") ON DELETE cascade ON UPDATE no action;