-- Tabela de controle de migrations aplicadas
-- Permite rastrear quais arquivos .sql já foram executados com sucesso

CREATE TABLE IF NOT EXISTS _migrations_applied (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_migration_name (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
