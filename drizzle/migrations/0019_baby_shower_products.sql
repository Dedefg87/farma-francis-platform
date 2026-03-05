-- Adicionar suporte para produtos do catálogo do Chá de Bebê
-- Tabela de produtos selecionados por evento (vinculados ao catalogo pharma_products)

CREATE TABLE IF NOT EXISTS baby_shower_event_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  product_ean VARCHAR(32) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  status ENUM('available', 'purchased', 'reserved') DEFAULT 'available',
  purchased_by VARCHAR(255),
  purchased_at TIMESTAMP NULL,
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
  INDEX idx_event_id (event_id),
  INDEX idx_status (status),
  INDEX idx_product_ean (product_ean)
);

-- Alterar tabela baby_shower_events para adicionar coluna slug (se não existir)
ALTER TABLE baby_shower_events
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE AFTER event_code;

-- Criar índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_slug ON baby_shower_events(slug);

-- Adicionar coluna para notificação de produto comprado
ALTER TABLE baby_shower_event_products
ADD COLUMN IF NOT EXISTS notification_sent INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL;
