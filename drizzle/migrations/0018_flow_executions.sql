-- Migration: Tabela flow_executions para módulo de automação
CREATE TABLE IF NOT EXISTS flow_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flow_id INT NOT NULL,
    user_id INT,
    status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    duration INT,
    input_context TEXT,
    output_context TEXT,
    error TEXT,
    error_stack TEXT,
    total_nodes INT DEFAULT 0,
    executed_nodes INT DEFAULT 0,
    triggered_by INT,
    INDEX idx_flow_id (flow_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job queue para execução de flows
CREATE TABLE IF NOT EXISTS flow_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flow_id INT NOT NULL,
    execution_id INT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    payload TEXT,
    priority INT DEFAULT 0,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
