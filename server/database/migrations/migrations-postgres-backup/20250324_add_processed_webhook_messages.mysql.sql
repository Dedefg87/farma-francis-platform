-- +goose Up
CREATE TABLE IF NOT EXISTS `processed_webhook_messages` (
  `id` varchar(64) NOT NULL,
  `processed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS `processed_webhook_messages`;
