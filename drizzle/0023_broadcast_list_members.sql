CREATE TABLE IF NOT EXISTS `broadcast_list_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `list_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_list_customer` (`list_id`, `customer_id`),
  KEY `idx_list_id` (`list_id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `broadcast_list_members_ibfk_1` FOREIGN KEY (`list_id`) REFERENCES `broadcast_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `broadcast_list_members_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
