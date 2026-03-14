-- +goose Up
-- +goose StatementBegin

-- Tabela para rastrear status de envio de broadcast por destinatário
CREATE TABLE IF NOT EXISTS `broadcast_members_sent` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `status` ENUM('pending', 'sent', 'failed') DEFAULT 'pending' NOT NULL,
  `error` TEXT,
  `sent_at` TIMESTAMP NULL,
  FOREIGN KEY (`message_id`) REFERENCES `broadcast_messages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX IF NOT EXISTS `idx_broadcast_members_sent_message_id` ON `broadcast_members_sent`(`message_id`);
CREATE INDEX IF NOT EXISTS `idx_broadcast_members_sent_status` ON `broadcast_members_sent`(`status`);
CREATE INDEX IF NOT EXISTS `idx_broadcast_members_sent_customer_id` ON `broadcast_members_sent`(`customer_id`);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS `broadcast_members_sent`;

-- +goose StatementEnd
