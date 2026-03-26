-- Migration: 20250326_drop_and_recreate_processed_webhook_messages
-- Purpose: Recreate processed_webhook_messages table with correct structure

DROP TABLE IF EXISTS processed_webhook_messages;

CREATE TABLE processed_webhook_messages (
  id INT NOT NULL AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_processed_webhook_messages_provider_external (provider, external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
