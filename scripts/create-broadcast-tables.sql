-- Criação das tabelas broadcast (MySQL compatível)
-- Executar no banco do Railway

CREATE TABLE IF NOT EXISTS `broadcast_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_by` int NOT NULL,
  `last_sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broadcast_list_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `list_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `broadcast_list_members_list_customer_unique` (`list_id`,`customer_id`),
  CONSTRAINT `fk_broadcast_list_members_list` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_broadcast_list_members_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Validação
SHOW TABLES LIKE 'broadcast_%';
DESCRIBE broadcast_lists;
DESCRIBE broadcast_list_members;
