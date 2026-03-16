-- Migration: create broadcast_members_sent table
-- Created: 2026-03-16 09:40

CREATE TABLE IF NOT EXISTS `broadcast_members_sent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `phone` varchar(20) NOT NULL,
  `status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `error` text,
  `sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`message_id`) REFERENCES `broadcast_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `broadcast_members_sent_message_id_phone_unique` (`message_id`,`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
