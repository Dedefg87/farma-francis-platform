-- Migration: Módulo Chá de Bebê Farma Francis
-- Adiciona suporte para eventos virtuais de arrecadação de fraldas

-- ========================================
-- 1. Expansão do CRM: Data prevista do parto
-- ========================================
ALTER TABLE customers 
ADD COLUMN expected_due_date DATE NULL COMMENT 'Data prevista do parto (uso no módulo Chá de Bebê)';

-- ========================================
-- 2. Tabela: Eventos Chá de Bebê
-- ========================================
CREATE TABLE baby_shower_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mother_customer_id INT NOT NULL,
    event_code VARCHAR(20) NOT NULL UNIQUE,
    event_name VARCHAR(255) NOT NULL,
    expected_due_date DATE,
    event_date DATE,
    status ENUM('active', 'closed', 'cancelled') DEFAULT 'active' NOT NULL,
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_diapers_count INT DEFAULT 0,
    available_diapers_count INT DEFAULT 0,
    target_amount DECIMAL(12, 2),
    total_guests INT DEFAULT 0,
    public_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (mother_customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_baby_shower_events_mother ON baby_shower_events(mother_customer_id);
CREATE INDEX idx_baby_shower_events_status ON baby_shower_events(status);
CREATE INDEX idx_baby_shower_events_code ON baby_shower_events(event_code);

-- ========================================
-- 3. Tabela: Pacotes de Presentes (Cotas)
-- ========================================
CREATE TABLE baby_shower_gift_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    package_name VARCHAR(120) NOT NULL,
    description TEXT,
    gift_type ENUM('diapers', 'wipes', 'money', 'product') DEFAULT 'diapers',
    quantity_represented INT DEFAULT 1,
    size_label VARCHAR(20),
    price DECIMAL(10, 2) NOT NULL,
    stock_limit INT,
    sold_count INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_gift_packages_event ON baby_shower_gift_packages(event_id);
CREATE INDEX idx_gift_packages_active ON baby_shower_gift_packages(is_active);

-- ========================================
-- 4. Tabela: Compras dos Convidados
-- ========================================
CREATE TABLE baby_shower_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    package_id INT NOT NULL,
    guest_customer_id INT,
    guest_name VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(20),
    guest_email VARCHAR(320),
    message_to_parents TEXT,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP,
    notification_sent INT DEFAULT 0,
    notification_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES baby_shower_gift_packages(id),
    FOREIGN KEY (guest_customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_purchases_event ON baby_shower_purchases(event_id);
CREATE INDEX idx_purchases_status ON baby_shower_purchases(payment_status);
CREATE INDEX idx_purchases_guest ON baby_shower_purchases(guest_customer_id);
CREATE INDEX idx_purchases_created ON baby_shower_purchases(created_at);

-- ========================================
-- 5. Tabela: Retiradas de Estoque Virtual
-- ========================================
CREATE TABLE baby_shower_withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    related_task_id INT,
    withdrawal_type ENUM('diapers', 'wipes', 'money') DEFAULT 'diapers',
    diaper_size VARCHAR(20),
    quantity INT NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fulfilled_at TIMESTAMP,
    status ENUM('requested', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'requested',
    fulfilled_by INT,
    delivery_method ENUM('pickup', 'delivery') DEFAULT 'pickup',
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (fulfilled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_withdrawals_event ON baby_shower_withdrawals(event_id);
CREATE INDEX idx_withdrawals_status ON baby_shower_withdrawals(status);
CREATE INDEX idx_withdrawals_task ON baby_shower_withdrawals(related_task_id);

-- ========================================
-- 6. Comentários das tabelas
-- ========================================
ALTER TABLE baby_shower_events COMMENT = 'Eventos Chá de Bebê - Carteira virtual para arrecadação';
ALTER TABLE baby_shower_gift_packages COMMENT = 'Pacotes de presentes disponíveis para os convidados';
ALTER TABLE baby_shower_purchases COMMENT = 'Compras realizadas pelos convidados';
ALTER TABLE baby_shower_withdrawals COMMENT = 'Solicitações de retirada do estoque virtual';
